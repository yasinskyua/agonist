// The Quiz tests run on the real content, like the atlas tests: the content is
// the product, and a bad question is most likely a content problem. Randomness
// comes in from outside, so every Round here is reproducible from its seed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas, ROLES } from './atlas.mjs';
import { createQuiz, MODES, ROUND_SIZE } from './quiz.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const atlas = createAtlas({
  muscles: read('content/muscles.json').muscles,
  groups: read('content/muscle-groups.json').groups,
  exercises: read('content/exercises.json').exercises,
  atlasMuscles: read('assets/atlas/muscle-ids.json').muscles,
});

/** mulberry32: a small seeded generator returning numbers in [0, 1) like Math.random. */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const quizWith = (seed) => createQuiz({ atlas, random: seeded(seed) });
const SEEDS = Array.from({ length: 150 }, (_, i) => i);
const rounds = (mode) => SEEDS.map((seed) => quizWith(seed).round(mode));

/** The pairs the review queue flags as unsure: the Quiz must never lean on them. */
const flagged = new Set(atlas.reviewQueue().map(({ exercise, muscle }) => `${exercise.id}|${muscle.id}`));
const roleIn = (exercise, muscle) =>
  atlas.exerciseMuscles(exercise).find((x) => x.muscle.id === muscle)?.role ?? null;
const agonistOf = (exercise) => atlas.exerciseMuscles(exercise)[0].muscle.id;

// ── Modes ────────────────────────────────────────────────────────────────

test('all five Modes are listed, and only Who is the Agonist? is ready yet', () => {
  assert.deepEqual(MODES.map((m) => m.id), ['find', 'name', 'agonist', 'role', 'where']);
  assert.deepEqual(MODES.filter((m) => m.ready).map((m) => m.id), ['agonist']);
});

test('a Mode that is not ready cannot be played, and an unknown one fails loudly', () => {
  assert.throws(() => quizWith(1).round('find'), /find/);
  assert.throws(() => quizWith(1).round('quiz'), /quiz/);
});

// ── A Round of Who is the Agonist? ───────────────────────────────────────

test('a Round is exactly ten different Exercises', () => {
  for (const round of rounds('agonist')) {
    assert.equal(round.questions.length, ROUND_SIZE);
    const exercises = round.questions.map((q) => q.exercise);
    assert.equal(new Set(exercises).size, ROUND_SIZE, `repeat in ${exercises}`);
  }
});

test('every question has four different options and exactly one right answer', () => {
  for (const { questions } of rounds('agonist')) {
    for (const q of questions) {
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options).size, 4, `duplicate option in ${q.exercise}`);
      assert.equal(q.answer, agonistOf(q.exercise));
      // The answer is the one Agonist; nobody else in the options has that Role.
      const agonists = q.options.filter((m) => roleIn(q.exercise, m) === 'agonist');
      assert.deepEqual(agonists, [q.answer]);
    }
  }
});

test('an Exercise whose Agonist is flagged unsure is never asked', () => {
  const doubtful = atlas
    .exercises()
    .map((e) => e.id)
    .filter((id) => flagged.has(`${id}|${agonistOf(id)}`));
  assert.ok(doubtful.length > 0, 'the real content should have some, or this test proves nothing');

  for (const { questions } of rounds('agonist')) {
    for (const q of questions) assert.ok(!doubtful.includes(q.exercise), q.exercise);
  }
});

test('an unsure pair is never an option, but the rest of that Exercise stays in', () => {
  let asked = 0;
  for (const { questions } of rounds('agonist')) {
    for (const q of questions) {
      asked++;
      for (const m of q.options) assert.ok(!flagged.has(`${q.exercise}|${m}`), `${q.exercise} + ${m}`);
    }
  }
  // An Exercise with an unsure Synergist is still asked: the flag removes the pair, not the Exercise.
  const withFlaggedSynergist = new Set(
    [...flagged].map((pair) => pair.split('|')).filter(([e, m]) => roleIn(e, m) !== 'agonist').map(([e]) => e),
  );
  const seen = new Set(rounds('agonist').flatMap((r) => r.questions.map((q) => q.exercise)));
  assert.ok([...withFlaggedSynergist].some((e) => seen.has(e)), 'no Exercise with an unsure Synergist was ever asked');
  assert.ok(asked > 0);
});

test("the wrong options come first from the Exercise itself, then from the Agonist's Group", () => {
  for (const { questions } of rounds('agonist')) {
    for (const q of questions) {
      const own = atlas
        .exerciseMuscles(q.exercise)
        .filter(({ role, muscle }) => role !== 'agonist' && !flagged.has(`${q.exercise}|${muscle.id}`))
        .map(({ muscle }) => muscle.id);
      const wrong = q.options.filter((m) => m !== q.answer);
      const fromOwn = wrong.filter((m) => own.includes(m));

      assert.equal(fromOwn.length, Math.min(3, own.length), `${q.exercise}: own Muscles come first`);

      // What is left comes from the Agonist's Groups while there are any there.
      const groups = atlas.muscle(q.answer).groups;
      const kin = atlas
        .muscles()
        .filter(
          (m) =>
            m.id !== q.answer &&
            !own.includes(m.id) &&
            !flagged.has(`${q.exercise}|${m.id}`) &&
            atlas.muscleExercises(m.id).length > 0 &&
            m.groups.some((g) => groups.includes(g)),
        )
        .map((m) => m.id);
      const fromKin = wrong.filter((m) => !own.includes(m) && kin.includes(m));
      assert.equal(fromKin.length, Math.min(3 - fromOwn.length, kin.length), `${q.exercise}: kin next`);
    }
  }
});

test('the options are shuffled, so the answer is not always in the same place', () => {
  const places = new Set(rounds('agonist').flatMap((r) => r.questions.map((q) => q.options.indexOf(q.answer))));
  assert.deepEqual([...places].sort(), [0, 1, 2, 3]);
});

test('the same seed gives the same Round, another seed another one', () => {
  const ids = (round) => round.questions.map((q) => q.exercise);
  assert.deepEqual(ids(quizWith(7).round('agonist')), ids(quizWith(7).round('agonist')));
  assert.notDeepEqual(ids(quizWith(7).round('agonist')), ids(quizWith(8).round('agonist')));
});

// ── Answering ────────────────────────────────────────────────────────────

test('a right answer says so, and names the whole Role Distribution to paint', () => {
  const round = quizWith(3).round('agonist');
  const q = round.current;
  const result = round.answer(q.answer);

  assert.equal(result.right, true);
  assert.equal(result.answer, q.answer);
  assert.deepEqual(
    result.roles,
    atlas.exerciseMuscles(q.exercise).map(({ muscle, role }) => ({ muscle: muscle.id, role })),
  );
  assert.equal(round.results[0], 'right');
});

test('a wrong answer says which Role the picked Muscle has in this Exercise', () => {
  const round = quizWith(3).round('agonist');
  const q = round.current;
  const wrong = q.options.find((m) => m !== q.answer && roleIn(q.exercise, m));
  const result = round.answer(wrong);

  assert.equal(result.right, false);
  assert.equal(result.given, wrong);
  assert.equal(result.givenRole, roleIn(q.exercise, wrong));
  assert.ok(ROLES.includes(result.givenRole));
  assert.equal(round.results[0], 'wrong');
});

test('a wrong answer from outside the Exercise reports that the Muscle does not work in it', () => {
  // Find, over many Rounds, a wrong option that the Exercise does not use at all.
  for (const round of rounds('agonist')) {
    for (const q of round.questions) {
      const stranger = q.options.find((m) => m !== q.answer && roleIn(q.exercise, m) === null);
      if (!stranger) continue;
      // Play this Round up to that question with right answers, then miss it.
      const at = round.questions.indexOf(q);
      for (let i = 0; i < at; i++) {
        round.answer(round.current.answer);
        round.next();
      }
      assert.equal(round.answer(stranger).givenRole, null);
      return;
    }
  }
  assert.fail('no question with an option outside its Exercise: the test cannot run');
});

test('an answer that is not one of the options is a bug, and so is answering twice', () => {
  const round = quizWith(3).round('agonist');
  assert.throws(() => round.answer('not_a_muscle'), /not_a_muscle/);
  round.answer(round.current.answer);
  assert.throws(() => round.answer(round.current.answer), /already/);
});

test('the next question waits for an answer, and the Round ends after the tenth', () => {
  const round = quizWith(3).round('agonist');
  assert.throws(() => round.next(), /answer/);

  for (let i = 0; i < ROUND_SIZE; i++) {
    assert.equal(round.finished, false);
    assert.equal(round.index, i);
    round.answer(round.current.answer);
    if (i < ROUND_SIZE - 1) round.next();
  }
  assert.equal(round.finished, true);
  assert.throws(() => round.next(), /over/);
});

// ── Score, streak, summary ───────────────────────────────────────────────

/** Play a Round answering right or wrong as told: 'R' or 'W'. */
function play(pattern, seed = 5) {
  const round = quizWith(seed).round('agonist');
  [...pattern].forEach((c, i) => {
    const q = round.current;
    round.answer(c === 'R' ? q.answer : q.options.find((m) => m !== q.answer));
    if (i < ROUND_SIZE - 1) round.next();
  });
  return round;
}

test('the streak counts right answers in a row and is broken by a wrong one', () => {
  const round = quizWith(5).round('agonist');
  const streaks = [];
  for (const c of 'RRWRRR') {
    const q = round.current;
    round.answer(c === 'R' ? q.answer : q.options.find((m) => m !== q.answer));
    streaks.push(round.streak);
    round.next();
  }
  assert.deepEqual(streaks, [1, 2, 0, 1, 2, 3]);
  assert.equal(round.bestStreak, 3);
});

test('the summary gives the score, the longest streak and each mistake once', () => {
  const round = play('RRRWRRWRRR');
  const summary = round.summary();

  assert.equal(summary.score, 8);
  assert.equal(summary.total, ROUND_SIZE);
  assert.equal(summary.bestStreak, 3);
  assert.equal(summary.mistakes.length, 2);
  for (const m of summary.mistakes) {
    assert.equal(round.questions.some((q) => q.exercise === m.exercise), true);
    assert.equal(m.answer, agonistOf(m.exercise));
  }
  assert.equal(new Set(summary.mistakes.map((m) => m.exercise)).size, 2);
});

test('a perfect Round has no mistakes and a streak of ten', () => {
  const summary = play('RRRRRRRRRR').summary();
  assert.deepEqual([summary.score, summary.bestStreak, summary.mistakes], [10, 10, []]);
});

test('a summary before the last answer is a bug', () => {
  assert.throws(() => quizWith(5).round('agonist').summary(), /finish/);
});
