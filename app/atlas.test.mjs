// Тести атласу працюють на справжньому контенті, не на фікстурах: контент тут
// не вхідні дані, а сам продукт, і більшість помилок буде саме в ньому.
// Фікстури з'являються лише там, де треба зламати контент навмисно.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas, ContentError } from './atlas.mjs';

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

  assert.equal(error.problems.length, 4); // дві Вправи × (без М'язів + без Агоніста)
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
  assert.deepEqual(atlas.relatedExercises('bench-press').map((e) => e.id), ['push-up']);
  assert.deepEqual(atlas.relatedExercises('push-up').map((e) => e.id), ['bench-press']);
  assert.deepEqual(atlas.relatedExercises('deadlift'), []); // Агоніст тільки в неї
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
