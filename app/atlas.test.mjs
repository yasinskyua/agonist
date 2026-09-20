// Тести атласу працюють на справжньому контенті, не на фікстурах: контент тут
// не вхідні дані, а сам продукт, і більшість помилок буде саме в ньому.
// Фікстури з'являються лише там, де треба зламати контент навмисно.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas, ContentError, ROLES } from './atlas.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const content = {
  muscles: read('content/muscles.json').muscles,
  groups: read('content/muscle-groups.json').groups,
  exercises: read('content/exercises.json').exercises,
  atlasMuscles: read('assets/atlas/muscle-ids.json').muscles,
};

const atlas = createAtlas(content);

/** Копія контенту з однією зламаною річчю. */
const broken = (patch) => ({ ...content, ...patch });

/** Помилка, яку кинув збір атласу. Тест мовчки не пройде, якщо її не буде. */
function contentError(patch) {
  try {
    createAtlas(broken(patch));
  } catch (error) {
    assert.ok(error instanceof ContentError, `очікували ContentError, дістали ${error}`);
    return error;
  }
  assert.fail('контент зламаний, а помилки немає');
}

// ── Цілісність контенту ──────────────────────────────────────────────────

test('справжній контент проходить усі інваріанти', () => {
  assert.ok(atlas.muscles().length > 0);
  assert.ok(atlas.exercises().length > 0);
});

test("одруківка в ідентифікаторі М'яза ламає перевірку, а не підсвічування", () => {
  const { pectoralis_major, ...rest } = content.muscles;
  const error = contentError({ muscles: { ...rest, pectoralis_majr: pectoralis_major } });

  assert.match(error.message, /pectoralis_majr/);
  assert.match(error.message, /не намальований в атласі/);
});

test('Вправа без Агоніста і Вправа з двома — обидві помилка', () => {
  const none = { ...content.exercises['pull-up'], muscles: { biceps_brachii: 'synergist' } };
  const two = {
    ...content.exercises['pull-up'],
    muscles: { latissimus_dorsi_teres_major: 'agonist', biceps_brachii: 'agonist' },
  };

  assert.throws(() => createAtlas(broken({ exercises: { x: none } })), /Агоністів 0/);
  assert.throws(() => createAtlas(broken({ exercises: { x: two } })), /Агоністів 2/);
});

test("Вправа без М'язів — помилка", () => {
  assert.throws(
    () => createAtlas(broken({ exercises: { x: { en: 'Nothing', muscles: {} } } })),
    /не має жодного М'яза/,
  );
});

test("Вправа, що згадує М'яз поза словником — помилка", () => {
  const x = { en: 'Ghost', muscles: { unicorn_major: 'agonist' } };
  assert.throws(() => createAtlas(broken({ exercises: { x } })), /невідомий М'яз "unicorn_major"/);
});

test('невідома Роль — помилка', () => {
  const x = { en: 'Odd', muscles: { quadriceps: 'agonist', hamstrings: 'помічник' } };
  assert.throws(() => createAtlas(broken({ exercises: { x } })), /невідома Роль/);
});

test("М'язова група поза атласом — помилка", () => {
  assert.throws(
    () => createAtlas(broken({ groups: { ...content.groups, elbows: { uk: 'Лікті', en: 'Elbows' } } })),
    /М'язова група "elbows" не намальована/,
  );
});

test('усі проблеми повідомляються за один прохід, не по одній', () => {
  const error = contentError({ exercises: { a: { en: 'A', muscles: {} }, b: { en: 'B', muscles: {} } } });

  // Обидві зламані Вправи названі, а не тільки перша.
  assert.match(error.message, /"a"/);
  assert.match(error.message, /"b"/);
});

test("М'язова група без назви в контенті — помилка, а не порожній рядок на екрані", () => {
  const { chest, ...rest } = content.groups;
  const error = contentError({ groups: rest });

  assert.match(error.message, /pectoralis_major/);
  assert.match(error.message, /"chest", якої немає в контенті/);
});

// ── Запити ───────────────────────────────────────────────────────────────

test("М'язи Вправи йдуть Агоніст → Синергісти → Стабілізатори", () => {
  const roles = atlas.exerciseMuscles('bench-press').map((x) => x.role);

  assert.equal(roles[0], 'agonist');
  assert.equal(roles.filter((r) => r === 'agonist').length, 1);
  // Ролі йдуть блоками, а не впереміш.
  assert.deepEqual(roles, ['agonist', 'synergist', 'synergist', 'stabilizer', 'stabilizer']);
  assert.equal(atlas.exerciseMuscles('bench-press')[0].muscle.id, 'pectoralis_major');
});

test("Вправи М'яза — це обернене ребро, з Роллю в кожній", () => {
  const found = atlas.muscleExercises('erector_spinae');

  assert.equal(found.find((x) => x.exercise.id === 'deadlift').role, 'agonist');
  assert.equal(found.find((x) => x.exercise.id === 'back-squat').role, 'stabilizer');
  // Те саме ребро з іншого боку.
  for (const { exercise, role } of found) {
    assert.equal(content.exercises[exercise.id].muscles.erector_spinae, role);
  }
});

test('невідомий ідентифікатор у запиті — гучна помилка, а не порожня відповідь', () => {
  // Порожній список мусить означати рівно одне: «такого нема». Перевіряти
  // існування — muscle() / exercise(), саме туди йде ідентифікатор з URL.
  assert.throws(() => atlas.exerciseMuscles('bench-pres'), /Вправа "bench-pres" не існує/);
  assert.throws(() => atlas.muscleExercises('quadricep'), /М'яз "quadricep" не існує/);
  assert.throws(() => atlas.groupMuscles('chst'), /М'язова група "chst" не існує/);
  assert.throws(() => atlas.groupExercises('chst'), /не існує/);
  assert.throws(() => atlas.relatedExercises('squat'), /не існує/);

  assert.equal(atlas.muscle('quadricep'), undefined);
  assert.equal(atlas.exercise('bench-pres'), undefined);
});

test("М'яз без жодної Вправи допустимий", () => {
  assert.ok(atlas.muscle('splenius'));
  assert.deepEqual(atlas.muscleExercises('splenius'), []);
});

test("М'язова група розгортається в М'язи через атлас, не через контент", () => {
  const ids = atlas.groupMuscles('back').map((m) => m.id);

  assert.ok(ids.includes('rhomboids'));
  assert.ok(ids.includes('latissimus_dorsi_teres_major'));
  assert.ok(!ids.includes('pectoralis_major'));
  // Групи немає в жодному файлі контенту — тільки в атласі.
  assert.equal(content.muscles.rhomboids.groups, undefined);
});

test("Вправи М'язової групи — об'єднання по М'язах, без повторів", () => {
  const ids = atlas.groupExercises('chest').map((e) => e.id);

  assert.deepEqual(ids, [...new Set(ids)]);
  assert.ok(ids.includes('bench-press'));
  assert.ok(ids.includes('push-up'));
  assert.ok(ids.includes('overhead-press')); // через serratus_anterior, теж груди
});

test("Пов'язані вправи — ті, що поділяють Агоніста, крім самої Вправи", () => {
  const agonist = (id) =>
    Object.entries(content.exercises[id].muscles).find(([, role]) => role === 'agonist')[0];

  for (const id of ['bench-press', 'deadlift', 'lateral-raise']) {
    const related = atlas.relatedExercises(id).map((e) => e.id);

    assert.ok(!related.includes(id), 'an exercise is never related to itself');
    for (const other of related) assert.equal(agonist(other), agonist(id));
  }

  assert.ok(atlas.relatedExercises('bench-press').some((e) => e.id === 'push-up'));
  // The only exercise with that Agonist: an empty list, not an error.
  assert.deepEqual(atlas.relatedExercises('hip-abduction-machine'), []);
});

test("М'яз віддає вид і групу з атласу, а назву з контенту", () => {
  const quadriceps = atlas.muscle('quadriceps');

  assert.equal(quadriceps.uk, content.muscles.quadriceps.uk);
  assert.deepEqual(quadriceps.groups, ['thighs']);
  assert.deepEqual(quadriceps.views, ['front', 'back']);
});

test("латинська назва порожня там, де М'яз — функціональна група", () => {
  assert.equal(atlas.muscle('hamstrings').la, '');
  assert.equal(atlas.muscle('pectoralis_major').la, 'Pectoralis major');
});

test('two exercises with the same full Role set — an error (ADR-0005)', () => {
  const twin = { ...content.exercises['bench-press'], en: 'Bench Press Twin' };
  const error = contentError({ exercises: { ...content.exercises, twin } });

  assert.match(error.message, /однаковий набір Ролей/);
  assert.match(error.message, /bench-press/);
});

// ── Review marks ─────────────────────────────────────────────────────────

test('a review mark must point at a muscle of that same exercise', () => {
  const x = {
    en: 'Odd',
    muscles: { quadriceps: 'agonist' },
    review: { hamstrings: 'а раптом' },
  };
  const error = contentError({ exercises: { x } });

  assert.match(error.message, /"x": позначка непевності на М'яз "hamstrings"/);
});

test('a review mark without a reason is an error: the Trainer must know what is in doubt', () => {
  const x = { en: 'Odd', muscles: { quadriceps: 'agonist' }, review: { quadriceps: '' } };

  assert.throws(() => createAtlas(broken({ exercises: { x } })), /без причини/);
});

test('the review queue is a flat list with Role and reason, agonists first', () => {
  const queue = atlas.reviewQueue();

  assert.ok(queue.length > 0, 'чернетка без жодної позначки непевності — підозріло');
  assert.deepEqual(
    queue.map((x) => x.role),
    [...queue.map((x) => x.role)].sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b)),
  );

  for (const { exercise, muscle, role, note } of queue) {
    assert.equal(content.exercises[exercise.id].muscles[muscle.id], role);
    assert.equal(content.exercises[exercise.id].review[muscle.id], note);
    assert.ok(note.length > 0);
  }
});
