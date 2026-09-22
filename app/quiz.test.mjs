// The Quiz tests run on the real content, like the atlas tests: the content is
// the product, and a bad Card is most likely a content problem. Randomness
// comes in from outside, so every Round here is reproducible from its seed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas } from './atlas.mjs';
import { createQuiz, ROUND_SIZE } from './quiz.mjs';

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
const rounds = () => SEEDS.map((seed) => quizWith(seed).round());

const agonistOf = (exercise) => atlas.exerciseMuscles(exercise)[0].muscle.id;

/** Play a Round grading each Card right or wrong as told: 'K' (знав) or 'U' (не знав). */
function play(pattern, seed = 5) {
  const round = quizWith(seed).round();
  for (const c of pattern) {
    round.reveal();
    round.grade(c === 'K');
  }
  return round;
}

// ── A Round of ten Cards ─────────────────────────────────────────────────

test('a Round is exactly ten different Exercises', () => {
  for (const round of rounds()) {
    assert.equal(round.total, ROUND_SIZE);
    const exercises = round.cards.map((c) => c.exercise);
    assert.equal(new Set(exercises).size, ROUND_SIZE, `repeat in ${exercises}`);
  }
});

test('every Card names its Exercise and its Agonist', () => {
  for (const { cards } of rounds()) {
    for (const card of cards) assert.equal(card.answer, agonistOf(card.exercise));
  }
});

test('the same seed gives the same Round, another seed another one', () => {
  const ids = (round) => round.cards.map((c) => c.exercise);
  assert.deepEqual(ids(quizWith(7).round()), ids(quizWith(7).round()));
  assert.notDeepEqual(ids(quizWith(7).round()), ids(quizWith(8).round()));
});

// ── Revealing and grading ────────────────────────────────────────────────

test('a Round opens on the first Card, unrevealed', () => {
  const round = quizWith(1).round();
  assert.equal(round.index, 0);
  assert.equal(round.revealed, false);
  assert.equal(round.finished, false);
});

test('a Card cannot be graded before it is revealed', () => {
  const round = quizWith(1).round();
  assert.throws(() => round.grade(true), /reveal/);
});

test('a Card cannot be revealed twice', () => {
  const round = quizWith(1).round();
  round.reveal();
  assert.throws(() => round.reveal(), /already revealed/);
});

test('grading moves to the next Card, unrevealed again', () => {
  const round = quizWith(1).round();
  const first = round.current;
  round.reveal();
  round.grade(true);

  assert.equal(round.index, 1);
  assert.notDeepEqual(round.current, first);
  assert.equal(round.revealed, false);
});

test('the score counts «Знав», not «Не знав»', () => {
  const round = play('KKU');
  assert.equal(round.score, 2);
});

test('the Round finishes after the tenth grade, and nothing can be revealed or graded after', () => {
  const round = quizWith(3).round();
  for (let i = 0; i < ROUND_SIZE; i++) {
    assert.equal(round.finished, false);
    round.reveal();
    round.grade(i % 2 === 0);
  }
  assert.equal(round.finished, true);
  assert.throws(() => round.reveal(), /over/);
  assert.throws(() => round.grade(true), /over/);
});

// ── Summary ───────────────────────────────────────────────────────────────

test('a summary before the Round is finished is a bug', () => {
  assert.throws(() => quizWith(4).round().summary(), /finish/);
});

test('the summary gives the score and every «Не знав» Card once, each naming its Agonist', () => {
  const round = play('KKKUKKUKKK');
  const summary = round.summary();

  assert.equal(summary.score, 8);
  assert.equal(summary.total, ROUND_SIZE);
  assert.equal(summary.mistakes.length, 2);
  for (const m of summary.mistakes) assert.equal(m.answer, agonistOf(m.exercise));
});

test('a perfect Round has no mistakes', () => {
  const summary = play('KKKKKKKKKK').summary();
  assert.deepEqual([summary.score, summary.mistakes], [10, []]);
});
