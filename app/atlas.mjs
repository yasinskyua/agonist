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

  for (const [id, exercise] of Object.entries(exercises)) {
    const pairs = Object.entries(exercise.muscles ?? {});

    if (pairs.length === 0) {
      problems.push(`Вправа "${id}" не має жодного М'яза`);
    }

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
export function createAtlas({ muscles, groups, exercises, atlasMuscles }) {
  check({ muscles, groups, exercises, atlasMuscles });

  const byRole = (role) => ROLES.indexOf(role);

  /** Ребро, обернене: М'яз → [{ exercise, role }]. Будується один раз. */
  const exercisesByMuscle = new Map();
  for (const id of Object.keys(exercises)) {
    for (const [muscle, role] of Object.entries(exercises[id].muscles)) {
      if (!exercisesByMuscle.has(muscle)) exercisesByMuscle.set(muscle, []);
      exercisesByMuscle.get(muscle).push({ exercise: id, role });
    }
  }

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
    muscles: () =>
      Object.keys(muscles)
        .map(muscleView)
        .sort((a, b) => a.uk.localeCompare(b.uk, 'uk')),

    /** Усі М'язові групи, за українською назвою. */
    groups: () =>
      Object.entries(groups)
        .map(([id, group]) => ({ id, ...group }))
        .sort((a, b) => a.uk.localeCompare(b.uk, 'uk')),

    /** Усі Вправи, за англійською назвою. */
    exercises: () =>
      Object.keys(exercises)
        .map(exerciseView)
        .sort((a, b) => a.en.localeCompare(b.en, 'en')),

    muscle: (id) => (muscles[id] ? muscleView(id) : undefined),
    exercise: (id) => (exercises[id] ? exerciseView(id) : undefined),

    /** М'язи Вправи з Ролями: Агоніст перший, далі Синергісти, Стабілізатори. */
    exerciseMuscles: (id) =>
      Object.entries(exercises[id]?.muscles ?? {})
        .map(([muscle, role]) => ({ muscle: muscleView(muscle), role }))
        .sort((a, b) => byRole(a.role) - byRole(b.role) || a.muscle.uk.localeCompare(b.muscle.uk, 'uk')),

    /** Вправи М'яза з Роллю, яку він у них має. Обернене ребро. */
    muscleExercises: (id) =>
      (exercisesByMuscle.get(id) ?? [])
        .map(({ exercise, role }) => ({ exercise: exerciseView(exercise), role }))
        .sort((a, b) => byRole(a.role) - byRole(b.role) || a.exercise.en.localeCompare(b.exercise.en, 'en')),

    /** М'язи М'язової групи. Належність бере атлас. */
    groupMuscles: (id) =>
      Object.keys(muscles)
        .filter((muscle) => atlasMuscles[muscle].groups.includes(id))
        .map(muscleView)
        .sort((a, b) => a.uk.localeCompare(b.uk, 'uk')),

    /** Вправи М'язової групи — об'єднання по її М'язах, без повторів. */
    groupExercises(id) {
      const seen = new Set(
        Object.keys(muscles)
          .filter((muscle) => atlasMuscles[muscle].groups.includes(id))
          .flatMap((muscle) => (exercisesByMuscle.get(muscle) ?? []).map((e) => e.exercise)),
      );
      return [...seen].map(exerciseView).sort((a, b) => a.en.localeCompare(b.en, 'en'));
    },

    /** Пов'язані вправи — ті, що поділяють Агоніста. Сама Вправа не рахується. */
    relatedExercises(id) {
      if (!exercises[id]) return [];
      const agonist = agonistOf(id);
      return Object.keys(exercises)
        .filter((other) => other !== id && agonistOf(other) === agonist)
        .map(exerciseView)
        .sort((a, b) => a.en.localeCompare(b.en, 'en'));
    },
  };
}
