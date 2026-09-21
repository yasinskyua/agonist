// The atlas tests run on the real content, not on fixtures: here the content
// is not input data but the product itself, and most bugs will be in it.
// Fixtures appear only where the content has to be broken on purpose.

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

/** A copy of the content with one thing broken. */
const broken = (patch) => ({ ...content, ...patch });

/** The error building the atlas threw. The test fails if there is none. */
function contentError(patch) {
  try {
    createAtlas(broken(patch));
  } catch (error) {
    assert.ok(error instanceof ContentError, `expected a ContentError, got ${error}`);
    return error;
  }
  assert.fail('the content is broken and there is no error');
}

// ── Content integrity ────────────────────────────────────────────────────

test('the real content passes every invariant', () => {
  assert.ok(atlas.muscles().length > 0);
  assert.ok(atlas.exercises().length > 0);
});

test('a typo in a Muscle id breaks the check, not the highlighting', () => {
  const { pectoralis_major, ...rest } = content.muscles;
  const error = contentError({ muscles: { ...rest, pectoralis_majr: pectoralis_major } });

  assert.match(error.message, /pectoralis_majr/);
  assert.match(error.message, /не намальований в атласі/);
});

test('an Exercise with no Agonist and one with two are both errors', () => {
  const none = { ...content.exercises['pull-up'], muscles: { biceps_brachii: 'synergist' } };
  const two = {
    ...content.exercises['pull-up'],
    muscles: { latissimus_dorsi_teres_major: 'agonist', biceps_brachii: 'agonist' },
  };

  assert.throws(() => createAtlas(broken({ exercises: { x: none } })), /Агоністів 0/);
  assert.throws(() => createAtlas(broken({ exercises: { x: two } })), /Агоністів 2/);
});

test('an Exercise with no Muscles is an error', () => {
  assert.throws(
    () => createAtlas(broken({ exercises: { x: { en: 'Nothing', muscles: {} } } })),
    /не має жодного М'яза/,
  );
});

test('an Exercise naming a Muscle outside the vocabulary is an error', () => {
  const x = { en: 'Ghost', muscles: { unicorn_major: 'agonist' } };
  assert.throws(() => createAtlas(broken({ exercises: { x } })), /невідомий М'яз "unicorn_major"/);
});

test('an unknown Role is an error', () => {
  const x = { en: 'Odd', muscles: { quadriceps: 'agonist', hamstrings: 'помічник' } };
  assert.throws(() => createAtlas(broken({ exercises: { x } })), /невідома Роль/);
});

test('a Muscle Group outside the atlas is an error', () => {
  assert.throws(
    () => createAtlas(broken({ groups: { ...content.groups, elbows: { uk: 'Лікті', en: 'Elbows' } } })),
    /М'язова група "elbows" не намальована/,
  );
});

test('all problems are reported in one pass, not one at a time', () => {
  const error = contentError({ exercises: { a: { en: 'A', muscles: {} }, b: { en: 'B', muscles: {} } } });

  // Both broken Exercises are named, not just the first.
  assert.match(error.message, /"a"/);
  assert.match(error.message, /"b"/);
});

test('a Muscle Group with no name in the content is an error, not an empty string on screen', () => {
  const { chest, ...rest } = content.groups;
  const error = contentError({ groups: rest });

  assert.match(error.message, /pectoralis_major/);
  assert.match(error.message, /"chest", якої немає в контенті/);
});

// ── Queries ──────────────────────────────────────────────────────────────────

test("an Exercise's Muscles run Agonist → Synergists → Stabilizers", () => {
  const roles = atlas.exerciseMuscles('bench-press').map((x) => x.role);

  assert.equal(roles[0], 'agonist');
  assert.equal(roles.filter((r) => r === 'agonist').length, 1);
  // Roles come in blocks, not mixed.
  assert.deepEqual(roles, ['agonist', 'synergist', 'synergist', 'stabilizer']);
  assert.equal(atlas.exerciseMuscles('bench-press')[0].muscle.id, 'pectoralis_major');
});

test("a Muscle's Exercises are the reversed edge, with a Role in each", () => {
  const found = atlas.muscleExercises('gluteus_maximus');

  assert.equal(found.find((x) => x.exercise.id === 'deadlift').role, 'agonist');
  assert.equal(found.find((x) => x.exercise.id === 'back-squat').role, 'synergist');
  // The same edge from the other side.
  for (const { exercise, role } of found) {
    assert.equal(content.exercises[exercise.id].muscles.gluteus_maximus, role);
  }
});

test('an unknown id in a query is a loud error, not an empty answer', () => {
  // An empty list must mean exactly one thing: "there are none". Existence is
  // checked with muscle() / exercise(); an id from the URL goes there.
  assert.throws(() => atlas.exerciseMuscles('bench-pres'), /Вправа "bench-pres" не існує/);
  assert.throws(() => atlas.muscleExercises('quadricep'), /М'яз "quadricep" не існує/);
  assert.throws(() => atlas.groupMuscles('chst'), /М'язова група "chst" не існує/);
  assert.throws(() => atlas.groupExercises('chst'), /не існує/);
  assert.throws(() => atlas.relatedExercises('squat'), /не існує/);

  assert.equal(atlas.muscle('quadricep'), undefined);
  assert.equal(atlas.exercise('bench-pres'), undefined);
});

test('a Muscle with no Exercises is allowed', () => {
  assert.ok(atlas.muscle('splenius'));
  assert.deepEqual(atlas.muscleExercises('splenius'), []);
});

test('a Muscle Group expands into Muscles through the atlas, not the content', () => {
  const ids = atlas.groupMuscles('back').map((m) => m.id);

  assert.ok(ids.includes('rhomboids'));
  assert.ok(ids.includes('latissimus_dorsi_teres_major'));
  assert.ok(!ids.includes('pectoralis_major'));
  // The group is in no content file — only in the atlas.
  assert.equal(content.muscles.rhomboids.groups, undefined);
});

test("a Muscle Group's Exercises are the union over its Muscles, without repeats", () => {
  const ids = atlas.groupExercises('chest').map((e) => e.id);

  assert.deepEqual(ids, [...new Set(ids)]);
  assert.ok(ids.includes('bench-press'));
  assert.ok(ids.includes('push-up'));
  assert.ok(ids.includes('overhead-press')); // via serratus_anterior, chest too
});

test('Related Exercises share the Agonist, and never include the Exercise itself', () => {
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

test("a Muscle's view and group come from the atlas, its name from the content", () => {
  const quadriceps = atlas.muscle('quadriceps');

  assert.equal(quadriceps.uk, content.muscles.quadriceps.uk);
  assert.deepEqual(quadriceps.groups, ['thighs']);
  assert.deepEqual(quadriceps.views, ['front', 'back']);
});

test('the Latin name is empty where the Muscle is a functional group', () => {
  assert.equal(atlas.muscle('hamstrings').la, '');
  assert.equal(atlas.muscle('pectoralis_major').la, 'Pectoralis major');
});

test('every exercise carries a Ukrainian and an English name', () => {
  // The interface names an exercise in its own language: a Ukrainian trainer
  // says «Жим штанги лежачи», an English one says Barbell Bench Press.
  for (const exercise of atlas.exercises()) {
    assert.match(exercise.uk ?? '', /\S/, `${exercise.id}: no Ukrainian name`);
    assert.match(exercise.en ?? '', /\S/, `${exercise.id}: no English name`);
  }
});

test('an exercise without a Ukrainian name is an error, not a blank on screen', () => {
  const { uk, ...nameless } = content.exercises['bench-press'];
  const error = contentError({ exercises: { ...content.exercises, 'bench-press': nameless } });

  assert.match(error.message, /bench-press/);
  assert.match(error.message, /українськ/);
});

// ── Notes ────────────────────────────────────────────────────────────────

test('a note must point at a muscle of that same exercise', () => {
  const x = {
    en: 'Odd',
    muscles: { quadriceps: 'agonist' },
    notes: { hamstrings: 'а раптом' },
  };
  const error = contentError({ exercises: { x } });

  assert.match(error.message, /"x": пояснення до М'яза "hamstrings"/);
});

test('an empty note is an error, not a blank line on screen', () => {
  const x = { en: 'Odd', muscles: { quadriceps: 'agonist' }, notes: { quadriceps: ' ' } };

  assert.throws(() => createAtlas(broken({ exercises: { x } })), /порожнє пояснення/);
});

// ── Search ───────────────────────────────────────────────────────────────
// A trainer types on a phone between sets: no capitals, the apostrophe comes
// out in whatever shape the keyboard gives or not at all, «ї» comes out as «і».

const ids = (list) => list.map((x) => x.id);

test('search finds a muscle by its Ukrainian name', () => {
  assert.ok(ids(atlas.search('великий грудний').muscles).includes('pectoralis_major'));
});

test('search finds a muscle by its Latin name', () => {
  assert.ok(ids(atlas.search('latissimus').muscles).includes('latissimus_dorsi_teres_major'));
});

test('search finds an exercise by its English and by its Ukrainian name', () => {
  assert.ok(ids(atlas.search('bench press').exercises).includes('bench-press'));
  assert.ok(ids(atlas.search('жим штанги лежачи').exercises).includes('bench-press'));
});

test('a muscle group found by name opens into its muscles', () => {
  const back = atlas.search('спина').groups.find((g) => g.id === 'back');

  assert.ok(back, 'group «Спина» not found');
  assert.ok(ids(back.muscles).includes('rhomboids'));
});

test('search ignores case, apostrophe shape and a missing apostrophe', () => {
  for (const query of ['М’ЯЗИ ЗАДНЬОЇ', "м'язи задньої", 'мязи задньої']) {
    assert.ok(ids(atlas.search(query).muscles).includes('hamstrings'), query);
  }
});

test('search ignores diacritics a phone keyboard drops: ї typed as і, й as и', () => {
  assert.ok(ids(atlas.search('мязи задньоі').muscles).includes('hamstrings'));
  assert.ok(ids(atlas.search('прямии мяз живота').muscles).includes('rectus_abdominis'));
});

test('an empty query finds nothing rather than everything', () => {
  assert.deepEqual(atlas.search('   '), { groups: [], muscles: [], exercises: [] });
});

test('an id that names a built-in object property is not a muscle or an exercise', () => {
  // Ids come out of the address bar. `muscles[id]` alone would take
  // «constructor» or «__proto__» for real entries and crash the screen.
  for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.equal(atlas.muscle(id), undefined, id);
    assert.equal(atlas.exercise(id), undefined, id);
    assert.throws(() => atlas.muscleExercises(id), new RegExp(id));
  }
});
