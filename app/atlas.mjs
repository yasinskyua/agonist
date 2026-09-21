// Атлас — єдиний шов продукту. Приймає контент, перевіряє його й відповідає
// на всі запити. Решта коду (DOM, підсвічування SVG, роутинг, service worker)
// — тонкий клей навколо нього.
//
// Модуль нічого не читає з диска й не ходить у мережу: контент передає
// викликач. У браузері це `fetch`, у Node — `readFileSync`. Саме тому його
// можна тестувати без емуляції DOM.
//
//   import { createAtlas } from './atlas.mjs';
//   const atlas = createAtlas({ muscles, groups, exercises, atlasMuscles });

/** Ролі М'яза у Вправі, від найголовнішої. Порядок — той, у якому показуємо. */
export const ROLES = ['agonist', 'synergist', 'stabilizer'];

/**
 * Помилка контенту. Окремий клас, бо адресат — автор контенту, а не
 * користувач: повідомлення має називати ідентифікатор, у якому одруківка.
 */
export class ContentError extends Error {
  constructor(problems) {
    super(problems.join('\n'));
    this.name = 'ContentError';
    this.problems = problems;
  }
}

/**
 * Інваріанти контенту. Перевіряємо все й кидаємо одним списком: автор
 * контенту виправить десять одруківок за один прохід, а не за десять.
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

  // І навпаки: група, у якій атлас тримає наш М'яз, мусить мати назву. Інакше
  // вона мовчки доїде до екрана порожнім рядком — це той самий клас помилки,
  // що й одруківка в ідентифікаторі, тільки на рівні групи.
  for (const [id, muscle] of Object.entries(muscles)) {
    if (!atlasMuscles[id]) continue; // про це вже сказано вище
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

    // A review mark points the Trainer at a decision the author is unsure of.
    // A mark on a muscle the exercise does not list, or one without a reason,
    // is a dead line: the review never sees it, the author thinks it is flagged.
    for (const [muscle, note] of Object.entries(exercise.review ?? {})) {
      if (!exercise.muscles?.[muscle]) {
        problems.push(`Вправа "${id}": позначка непевності на М'яз "${muscle}", якого в ній немає`);
      }
      if (!note) problems.push(`Вправа "${id}", М'яз "${muscle}": позначка непевності без причини`);
    }
  }

  // Two exercises with the same full Role set answer every query identically,
  // so one of them is padding (ADR-0005). Variations are allowed exactly
  // because Stabilizers differ — where they do not, the exercise adds nothing.
  const bySignature = new Map();
  for (const [id, exercise] of Object.entries(exercises)) {
    const signature = Object.entries(exercise.muscles ?? {})
      .map(([muscle, role]) => `${role}:${muscle}`)
      .sort()
      .join('|');
    if (!bySignature.has(signature)) bySignature.set(signature, []);
    bySignature.get(signature).push(id);
  }
  for (const ids of bySignature.values()) {
    if (ids.length > 1) {
      problems.push(`Вправи ${ids.map((id) => `"${id}"`).join(', ')} мають однаковий набір Ролей`);
    }
  }

  if (problems.length) throw new ContentError(problems);
}

/**
 * Атлас над контентом.
 *
 * Єдине джерело правди — ребро «Вправа → М'яз + Роль». Вправи М'яза, Вправи
 * М'язової групи і Пов'язані вправи з нього **виводяться**, а не зберігаються:
 * дві таблиці одного факту рано чи пізно розходяться.
 */
/** Запис або гучна помилка: тихо порожня відповідь ховає одруківку. */
function known(table, id, what) {
  const entry = table[id];
  if (!entry) throw new Error(`${what} "${id}" не існує`);
  return entry;
}

const byUk = (a, b) => a.uk.localeCompare(b.uk, 'uk');
const roleOrder = (role) => ROLES.indexOf(role);

export function createAtlas({ muscles, groups, exercises, atlasMuscles }) {
  check({ muscles, groups, exercises, atlasMuscles });

  /** Ребро, обернене: М'яз → [{ exercise, role }]. Будується один раз. */
  const exercisesByMuscle = new Map();
  for (const id of Object.keys(exercises)) {
    for (const [muscle, role] of Object.entries(exercises[id].muscles)) {
      if (!exercisesByMuscle.has(muscle)) exercisesByMuscle.set(muscle, []);
      exercisesByMuscle.get(muscle).push({ exercise: id, role });
    }
  }

  /** Ідентифікатори М'язів М'язової групи. Належність малює атлас. */
  const groupMembers = (id) =>
    Object.keys(muscles).filter((muscle) => atlasMuscles[muscle].groups.includes(id));

  const muscleView = (id) => ({
    id,
    ...muscles[id],
    // Групу й види бере атлас, не контент: там вони вже намальовані.
    groups: atlasMuscles[id].groups,
    views: atlasMuscles[id].views,
  });

  const exerciseView = (id) => ({ id, ...exercises[id] });

  const agonistOf = (id) =>
    Object.entries(exercises[id].muscles).find(([, role]) => role === 'agonist')[0];

  return {
    /** Усі М'язи контенту, за українською назвою. */
    muscles: () => Object.keys(muscles).map(muscleView).sort(byUk),

    /** Усі М'язові групи, за українською назвою. */
    groups: () => Object.entries(groups).map(([id, group]) => ({ id, ...group })).sort(byUk),

    /** All exercises, by Ukrainian name: the Trainer's working language. */
    exercises: () => Object.keys(exercises).map(exerciseView).sort(byUk),

    muscle: (id) => (muscles[id] ? muscleView(id) : undefined),
    exercise: (id) => (exercises[id] ? exerciseView(id) : undefined),

    // Невідомий ідентифікатор у запиті — помилка коду, а не порожня відповідь.
    // Порожній список має означати рівно одне: «такого нема», і це правда
    // тільки для М'яза без Вправ. Перевіряти існування — `muscle()` /
    // `exercise()`, вони віддають undefined; саме туди йде id з URL.

    /** М'язи Вправи з Ролями: Агоніст перший, далі Синергісти, Стабілізатори. */
    exerciseMuscles: (id) =>
      Object.entries(known(exercises, id, 'Вправа').muscles)
        .map(([muscle, role]) => ({ muscle: muscleView(muscle), role }))
        .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || byUk(a.muscle, b.muscle)),

    /** Вправи М'яза з Роллю, яку він у них має. Обернене ребро. */
    muscleExercises(id) {
      known(muscles, id, "М'яз");
      return (exercisesByMuscle.get(id) ?? [])
        .map(({ exercise, role }) => ({ exercise: exerciseView(exercise), role }))
        .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || byUk(a.exercise, b.exercise));
    },

    /** М'язи М'язової групи. Належність бере атлас. */
    groupMuscles(id) {
      known(groups, id, "М'язова група");
      return groupMembers(id).map(muscleView).sort(byUk);
    },

    /** Вправи М'язової групи — об'єднання по її М'язах, без повторів. */
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
     * Review queue: every flagged decision as one flat list, agonists first —
     * a wrong Agonist costs more than a wrong Stabilizer, so that is where the
     * Trainer starts (ticket 10).
     */
    reviewQueue: () =>
      Object.keys(exercises)
        .flatMap((id) =>
          Object.entries(exercises[id].review ?? {}).map(([muscle, note]) => ({
            exercise: exerciseView(id),
            muscle: muscleView(muscle),
            role: exercises[id].muscles[muscle],
            note,
          })),
        )
        .sort(
          (a, b) =>
            roleOrder(a.role) - roleOrder(b.role) ||
            byUk(a.exercise, b.exercise) ||
            byUk(a.muscle, b.muscle),
        ),

    /** Пов'язані вправи — ті, що поділяють Агоніста. Сама Вправа не рахується. */
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
