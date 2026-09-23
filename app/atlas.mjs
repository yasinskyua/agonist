// The atlas is the product's single seam. It takes the content, checks it and
// answers every query. The rest of the code (DOM, SVG highlighting, routing)
// is thin glue around it.
//
// The module reads nothing from disk and never touches the network: the caller
// passes the content in — `fetch` in the browser, `readFileSync` in Node. That
// is why it can be tested without a DOM emulation.
//
//   import { createAtlas } from './atlas.mjs';
//   const atlas = createAtlas({ muscles, groups, exercises, atlasMuscles });

/**
 * The Roles a Muscle plays in an Exercise, most important first — the order they
 * are shown in. The five are ExRx's categories (ADR-0006).
 */
export const ROLES = ['agonist', 'synergist', 'dynamic_stabilizer', 'stabilizer', 'antagonist_stabilizer'];

/**
 * A content error. A class of its own because the reader is the content
 * author, not the user: the message must name the id that has the typo.
 */
export class ContentError extends Error {
  constructor(problems) {
    super(problems.join('\n'));
    this.name = 'ContentError';
    this.problems = problems;
  }
}

/**
 * The content invariants. Everything is checked and thrown as one list: the
 * author fixes ten typos in one pass instead of ten.
 */
function check({ muscles, groups, exercises, atlasMuscles }) {
  const problems = [];
  const atlasGroups = new Set(Object.values(atlasMuscles).flatMap((m) => m.groups));

  for (const id of Object.keys(muscles)) {
    if (!atlasMuscles[id]) problems.push(`М'яз "${id}" не намальований в атласі`);
  }

  for (const id of Object.keys(groups)) {
    if (!atlasGroups.has(id)) problems.push(`М'язова група "${id}" не намальована в атласі`);
  }

  // And the other way round: a group the atlas puts our Muscle in must have a
  // name. Otherwise it reaches the screen silently as an empty string — the
  // same class of error as a typo in an id, one level up.
  for (const [id, muscle] of Object.entries(muscles)) {
    if (!atlasMuscles[id]) continue; // already reported above
    for (const group of atlasMuscles[id].groups) {
      if (!groups[group]) {
        problems.push(`М'яз "${id}" належить до М'язової групи "${group}", якої немає в контенті`);
      }
    }
  }

  for (const [id, exercise] of Object.entries(exercises)) {
    const pairs = Object.entries(exercise.muscles ?? {});

    if (pairs.length === 0) {
      problems.push(`Вправа "${id}" не має жодного М'яза`);
    }

    // Each interface language names the exercise its own way, so a missing
    // name is a blank line on one of the two screens.
    if (!exercise.uk?.trim()) problems.push(`Вправа "${id}" не має української назви`);
    if (!exercise.en?.trim()) problems.push(`Вправа "${id}" не має англійської назви`);

    const agonists = pairs.filter(([, role]) => role === 'agonist');
    if (agonists.length !== 1) {
      problems.push(
        `Вправа "${id}": Агоністів ${agonists.length}, а має бути рівно один` +
          (agonists.length > 1 ? ` (${agonists.map(([m]) => m).join(', ')})` : ''),
      );
    }

    for (const [muscle, role] of pairs) {
      if (!muscles[muscle]) problems.push(`Вправа "${id}" згадує невідомий М'яз "${muscle}"`);
      if (!ROLES.includes(role)) problems.push(`Вправа "${id}", М'яз "${muscle}": невідома Роль "${role}"`);
    }

    // A note explains one Muscle's Role in this Exercise and is shown under
    // that Muscle. A note on a Muscle the Exercise does not list never reaches
    // the screen; an empty one shows as a blank line.
    for (const [muscle, note] of Object.entries(exercise.notes ?? {})) {
      if (!exercise.muscles?.[muscle]) {
        problems.push(`Вправа "${id}": пояснення до М'яза "${muscle}", якого в ній немає`);
      }
      if (!note?.trim()) problems.push(`Вправа "${id}", М'яз "${muscle}": порожнє пояснення`);
    }
  }

  if (problems.length) throw new ContentError(problems);
}

/**
 * The atlas over the content.
 *
 * The single source of truth is the edge "Exercise → Muscle + Role". A
 * Muscle's Exercises, a Muscle Group's Exercises and Related Exercises are
 * **derived** from it, not stored: two tables holding one fact drift apart.
 */
/** The record or a loud error: a quietly empty answer hides a typo. */
function known(table, id, what) {
  if (!Object.hasOwn(table, id)) throw new Error(`${what} "${id}" не існує`);
  return table[id];
}

const byUk = (a, b) => a.uk.localeCompare(b.uk, 'uk');

/**
 * Fold away what a phone keyboard varies between two spellings of one word:
 * case, the apostrophe's shape or its absence («м'яз», «м’яз», «мяз»), and
 * marks it drops (ї typed as і, й as и, ґ as г).
 */
const fold = (text) =>
  (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’ʼ`]/g, '')
    .replace(/ґ/g, 'г')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The part of a typed word that survives its case ending: «сідниці» and
 * «сідничний» meet at «сідни». Two letters go, then a consonant that
 * alternates (ц/ч, г/ж/з, к/ч, х/ш/с) so both forms meet at the same place.
 * Words of up to four letters are not touched: a short query is a plain
 * fragment, «жим» must not drag in unrelated rows.
 *
 * ponytail: a rule tried on the real names, not a morphology; a root that
 * changes deeper inside (e.g. о/і) will not meet — add a pair when the
 * Trainer hits one.
 */
const stemOf = (word) => {
  if (word.length <= 4) return word;
  const stem = word.slice(0, Math.max(4, word.length - 2));
  return /[цчзжгкхшс]$/.test(stem) && stem.length > 4 ? stem.slice(0, -1) : stem;
};

/** Every word of the query, by its stem, is somewhere in the name. */
const sameRoots = (name, q) => q.split(' ').every((word) => name.includes(stemOf(word)));

const roleOrder = (role) => ROLES.indexOf(role);

export function createAtlas({ muscles, groups, exercises, atlasMuscles }) {
  check({ muscles, groups, exercises, atlasMuscles });

  /** The edge reversed: Muscle → [{ exercise, role }]. Built once. */
  const exercisesByMuscle = new Map();
  for (const id of Object.keys(exercises)) {
    for (const [muscle, role] of Object.entries(exercises[id].muscles)) {
      if (!exercisesByMuscle.has(muscle)) exercisesByMuscle.set(muscle, []);
      exercisesByMuscle.get(muscle).push({ exercise: id, role });
    }
  }

  /** The ids of a Muscle Group's Muscles. Membership is drawn by the atlas. */
  const groupMembers = (id) =>
    Object.keys(muscles).filter((muscle) => atlasMuscles[muscle].groups.includes(id));

  const muscleView = (id) => ({
    id,
    ...muscles[id],
    // Groups and views come from the atlas, not the content: they are already drawn there.
    groups: atlasMuscles[id].groups,
    views: atlasMuscles[id].views,
  });

  const exerciseView = (id) => ({ id, ...exercises[id] });

  const agonistOf = (id) =>
    Object.entries(exercises[id].muscles).find(([, role]) => role === 'agonist')[0];

  return {
    /** All Muscles in the content, by Ukrainian name. */
    muscles: () => Object.keys(muscles).map(muscleView).sort(byUk),

    /** All Muscle Groups, by Ukrainian name. */
    groups: () => Object.entries(groups).map(([id, group]) => ({ id, ...group })).sort(byUk),

    /** All exercises, by Ukrainian name: the Trainer's working language. */
    exercises: () => Object.keys(exercises).map(exerciseView).sort(byUk),

    // Own keys only: an id from the address bar such as «constructor» must not
    // pass for a Muscle just because every object has one.
    muscle: (id) => (Object.hasOwn(muscles, id) ? muscleView(id) : undefined),
    exercise: (id) => (Object.hasOwn(exercises, id) ? exerciseView(id) : undefined),

    // An unknown id in a query is a bug in the code, not an empty answer. An
    // empty list must mean exactly one thing — "there are none" — and that is
    // true only for a Muscle with no Exercises. Existence is checked with
    // `muscle()` / `exercise()`, which return undefined; an id from the URL
    // goes there.

    /** An Exercise's Muscles with their Roles: the Agonist first, then Synergists, Stabilizers. */
    exerciseMuscles: (id) =>
      Object.entries(known(exercises, id, 'Вправа').muscles)
        .map(([muscle, role]) => ({ muscle: muscleView(muscle), role }))
        .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || byUk(a.muscle, b.muscle)),

    /** A Muscle's Exercises with the Role it has in each. The reversed edge. */
    muscleExercises(id) {
      known(muscles, id, "М'яз");
      return (exercisesByMuscle.get(id) ?? [])
        .map(({ exercise, role }) => ({ exercise: exerciseView(exercise), role }))
        .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || byUk(a.exercise, b.exercise));
    },

    /** A Muscle Group's Muscles. Membership comes from the atlas. */
    groupMuscles(id) {
      known(groups, id, "М'язова група");
      return groupMembers(id).map(muscleView).sort(byUk);
    },

    /** A Muscle Group's Exercises — the union over its Muscles, without repeats. */
    groupExercises(id) {
      known(groups, id, "М'язова група");
      const seen = new Set(
        groupMembers(id).flatMap((muscle) =>
          (exercisesByMuscle.get(muscle) ?? []).map((e) => e.exercise),
        ),
      );
      return [...seen].map(exerciseView).sort(byUk);
    },

    /**
     * One field for everything: Muscles by Ukrainian or Latin name, Muscle
     * groups by name — each opening into its Muscles, the way a Trainer goes
     * from «back» down to the rhomboids — and Exercises in either language.
     */
    search(query) {
      const q = fold(query);
      if (!q) return { groups: [], muscles: [], exercises: [] };
      const hit = (...names) =>
        names.some((name) => fold(name).includes(q) || sameRoots(fold(name), q));

      return {
        groups: Object.entries(groups)
          .filter(([, group]) => hit(group.uk, group.en))
          .map(([id, group]) => ({ id, ...group, muscles: groupMembers(id).map(muscleView).sort(byUk) }))
          .filter((group) => group.muscles.length)
          .sort(byUk),
        muscles: Object.keys(muscles)
          .filter((id) => hit(muscles[id].uk, muscles[id].la))
          .map(muscleView)
          .sort(byUk),
        exercises: Object.keys(exercises)
          .filter((id) => hit(exercises[id].uk, exercises[id].en))
          .map(exerciseView)
          .sort(byUk),
      };
    },

    /** Related Exercises — those sharing the Agonist. The Exercise itself does not count. */
    relatedExercises(id) {
      known(exercises, id, 'Вправа');
      const agonist = agonistOf(id);
      return Object.keys(exercises)
        .filter((other) => other !== id && agonistOf(other) === agonist)
        .map(exerciseView)
        .sort(byUk);
    },
  };
}
