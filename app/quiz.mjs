// The Quiz: what to ask, what to offer, what counts, how a Round scores. It asks
// the atlas and knows nothing about the screen, so a Round can be played and
// checked in Node on the real content.
//
// Randomness comes from the caller (`random` returns [0, 1) like
// `Math.random`), so a test can replay any Round from a seed.
//
//   const quiz = createQuiz({ atlas, random: Math.random });
//   const round = quiz.round('agonist');
//   round.current;              // { mode, exercise, answer, options } — Muscle and Exercise ids
//   round.answer(muscleId);     // { right, answer, given, givenRole, roles }
//   round.next();               // …ten times, then
//   round.summary();            // { score, total, bestStreak, mistakes }

export const ROUND_SIZE = 10;

/** The five Modes in the order the picker shows them. Only the ready ones can be played. */
export const MODES = [
  { id: 'find', ready: false },
  { id: 'name', ready: false },
  { id: 'agonist', ready: true },
  { id: 'role', ready: false },
  { id: 'where', ready: false },
];

const OPTIONS = 4;

export function createQuiz({ atlas, random = Math.random }) {
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  // A Role decision the author is unsure of is not something to memorise. The
  // pair "Exercise + Muscle" is excluded, not the whole Exercise: 29 Exercises
  // carry one doubt each and would otherwise vanish from the Quiz.
  const unsure = new Set(atlas.reviewQueue().map(({ exercise, muscle }) => `${exercise.id}|${muscle.id}`));
  const isUnsure = (exercise, muscle) => unsure.has(`${exercise}|${muscle}`);

  // A Muscle with no Exercises has nothing to ask about, so it is not offered either.
  const live = atlas.muscles().filter((m) => atlas.muscleExercises(m.id).length > 0);

  // The one door to an Exercise's Roles: the Quiz shows only what the author
  // is sure of — in a question, in the options and in the picture after the
  // answer. An unsure pair is not asked about, and not painted as fact either.
  const rolesOf = (exercise) =>
    atlas
      .exerciseMuscles(exercise)
      .filter(({ muscle }) => !isUnsure(exercise, muscle.id))
      .map(({ muscle, role }) => ({ muscle: muscle.id, role }));

  // ── Who is the Agonist? ──────────────────────────────────────────────

  function agonistQuestion(exercise) {
    const roles = rolesOf(exercise);
    const answer = roles[0].muscle; // the atlas lists the Agonist first
    const groups = atlas.muscle(answer).groups;

    // The wrong options, most instructive first: what else works in this very
    // Exercise (so the Trainer learns to tell an Agonist from the helpers),
    // then the Agonist's own Group, then anything. An unsure pair never
    // qualifies, and a Muscle is never offered twice.
    const own = shuffle(roles.slice(1).map((x) => x.muscle)); // sure pairs only: see rolesOf
    const kin = shuffle(live.filter((m) => m.groups.some((g) => groups.includes(g))).map((m) => m.id));
    const rest = shuffle(live.map((m) => m.id));

    const wrong = [];
    for (const muscle of [...own, ...kin, ...rest]) {
      if (wrong.length === OPTIONS - 1) break;
      if (muscle === answer || wrong.includes(muscle) || isUnsure(exercise, muscle)) continue;
      wrong.push(muscle);
    }
    return { mode: 'agonist', exercise, answer, options: shuffle([answer, ...wrong]) };
  }

  /** Per Mode: the questions a Round can draw from, and how to build one. */
  const MODE_POOLS = {
    agonist: () =>
      atlas
        .exercises()
        .map((e) => e.id)
        .filter((id) => !isUnsure(id, atlas.exerciseMuscles(id)[0].muscle.id))
        .map((id) => () => agonistQuestion(id)),
  };

  /** What the screen shows once an answer is in, as data: the words are the screen's. */
  function agonistResult(question, given) {
    return {
      right: given === question.answer,
      answer: question.answer,
      given,
      // null: the Muscle does not work in this Exercise at all.
      givenRole: rolesOf(question.exercise).find((x) => x.muscle === given)?.role ?? null,
      roles: rolesOf(question.exercise),
    };
  }

  const RESULTS = { agonist: agonistResult };
  /** What a mistake is about: the same Exercise missed twice is one mistake. */
  const subject = (question) => question.exercise;

  function createRound(mode, questions) {
    const results = questions.map(() => null); // 'right' | 'wrong' | null: what the progress bar shows
    const given = [];
    let index = 0;
    let streak = 0;
    let bestStreak = 0;

    const finished = () => results.every(Boolean);

    return {
      mode,
      questions,
      total: questions.length,
      results,
      get index() {
        return index;
      },
      get current() {
        return questions[index];
      },
      /** The result of the current question, once it is answered. */
      get result() {
        return given[index] ?? null;
      },
      get finished() {
        return finished();
      },
      get streak() {
        return streak;
      },
      get bestStreak() {
        return bestStreak;
      },
      get score() {
        return results.filter((r) => r === 'right').length;
      },

      answer(choice) {
        const question = questions[index];
        if (given[index]) throw new Error('the question is already answered');
        if (!question.options.includes(choice)) throw new Error(`"${choice}" is not one of the question's options`);

        const result = RESULTS[mode](question, choice);
        given[index] = result;
        results[index] = result.right ? 'right' : 'wrong';
        streak = result.right ? streak + 1 : 0;
        bestStreak = Math.max(bestStreak, streak);
        return result;
      },

      next() {
        if (!given[index]) throw new Error('answer the question first');
        if (index === questions.length - 1) throw new Error('the Round is over');
        index++;
      },

      summary() {
        if (!finished()) throw new Error('finish the Round first');
        const mistakes = new Map();
        questions.forEach((question, i) => {
          if (results[i] === 'wrong') mistakes.set(subject(question), question);
        });
        return {
          score: this.score,
          total: questions.length,
          bestStreak,
          mistakes: [...mistakes.values()],
        };
      },
    };
  }

  return {
    round(mode) {
      const pool = MODE_POOLS[mode];
      if (!pool || !MODES.find((m) => m.id === mode)?.ready) throw new Error(`Mode "${mode}" is not ready`);
      return createRound(mode, shuffle(pool()).slice(0, ROUND_SIZE).map((build) => build()));
    },
  };
}
