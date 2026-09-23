// The Quiz tests run on the real content, like the atlas tests: the content is
// the product, and a bad Card is most likely a content problem. Randomness
// comes in from outside, so every Round here is reproducible from its seed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas } from './atlas.mjs';
import { createExam } from './exam.mjs';
import { createQuiz, createExamQuiz, createExamTestQuiz, createRound, ROUND_SIZE } from './quiz.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const atlas = createAtlas({
  muscles: read('content/muscles.json').muscles,
  groups: read('content/muscle-groups.json').groups,
  exercises: read('content/exercises.json').exercises,
  atlasMuscles: read('assets/atlas/muscle-ids.json').muscles,
});

const exam = createExam({ questions: read('content/exam.json').questions, atlas });

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

// ── A Round over an arbitrary deck ───────────────────────────────────────

test('a Round is built from a deck the caller passes in, not from the atlas', () => {
  const deck = ['a', 'b', 'c'];
  const round = createRound(deck);
  assert.deepEqual(round.cards, deck);
  assert.equal(round.total, 3);
});

test('the Round length is up to the caller, ten by default', () => {
  const deck = Array.from({ length: 20 }, (_, i) => i);
  assert.equal(createRound(deck).total, ROUND_SIZE);
  assert.equal(createRound(deck, 5).total, 5);
  assert.equal(createRound(deck, 20).total, 20);
});

// ── The Exam Cards: a Round over a deck of Questions ────────────────────

const examQuizWith = (seed) => createExamQuiz({ exam, random: seeded(seed) });

test('«десять Питань» gives exactly ten, out of the whole Exam', () => {
  for (const seed of SEEDS) {
    const round = examQuizWith(seed).round({ length: 10 });
    assert.equal(round.total, 10);
    assert.equal(new Set(round.cards.map((q) => q.id)).size, 10, 'no repeats');
  }
});

test('one Topic gives every Question it has, and only its own', () => {
  for (const topic of exam.topics()) {
    const round = examQuizWith(1).round({ topic: topic.id });
    const want = exam.questions({ topic: topic.id });
    assert.equal(round.total, want.length);
    assert.deepEqual(new Set(round.cards.map((q) => q.id)), new Set(want.map((q) => q.id)));
  }
});

test('«всі 51» gives every Question the Exam has', () => {
  const round = examQuizWith(1).round();
  assert.equal(round.total, exam.questions().length);
  assert.deepEqual(new Set(round.cards.map((q) => q.id)), new Set(exam.questions().map((q) => q.id)));
});

test('the same seed gives the same Exam Round, another seed another one', () => {
  const ids = (round) => round.cards.map((q) => q.id);
  assert.deepEqual(ids(examQuizWith(7).round()), ids(examQuizWith(7).round()));
  assert.notDeepEqual(ids(examQuizWith(7).round()), ids(examQuizWith(8).round()));
});

test('an Exam Round plays the same way a Game Round does: reveal, grade, summary', () => {
  const round = examQuizWith(2).round({ length: 5 });
  for (let i = 0; i < 5; i++) {
    round.reveal();
    round.grade(i % 2 === 0);
  }
  const summary = round.summary();
  assert.equal(summary.total, 5);
  assert.equal(summary.mistakes.length, 2);
  for (const m of summary.mistakes) assert.ok(exam.question(m.id));
});

// ── The Exam Test: a Round over the testable Questions, each with 4 options ─

const examTestQuizWith = (seed) => createExamTestQuiz({ exam, random: seeded(seed) });

test('the Test deck holds only Questions with a Test block, and only those', () => {
  const round = examTestQuizWith(1).round();
  assert.equal(round.total, exam.testable().length);
  assert.deepEqual(new Set(round.cards.map((q) => q.id)), new Set(exam.testable().map((q) => q.id)));
});

test('«десять Питань» gives exactly ten, out of the testable Questions', () => {
  for (const seed of SEEDS) {
    const round = examTestQuizWith(seed).round({ length: 10 });
    assert.equal(round.total, 10);
    assert.equal(new Set(round.cards.map((q) => q.id)).size, 10, 'no repeats');
  }
});

test('one Topic gives every testable Question it has, and only its own', () => {
  for (const topic of exam.topics()) {
    const round = examTestQuizWith(1).round({ topic: topic.id });
    const want = exam.testable().filter((q) => q.topic === topic.id);
    assert.equal(round.total, want.length);
    assert.deepEqual(new Set(round.cards.map((q) => q.id)), new Set(want.map((q) => q.id)));
  }
});

test('every Card carries exactly four options, one of them the answer', () => {
  for (const q of examTestQuizWith(1).round().cards) {
    assert.equal(q.options.length, 4);
    assert.equal(q.options.filter((o) => o === q.answer).length, 1);
  }
});

test('the same seed gives the same Test Round and the same option order, another seed another one', () => {
  const shape = (round) => round.cards.map((q) => [q.id, ...q.options]);
  assert.deepEqual(shape(examTestQuizWith(7).round()), shape(examTestQuizWith(7).round()));
  assert.notDeepEqual(shape(examTestQuizWith(7).round()), shape(examTestQuizWith(8).round()));
});

test('a Test Round plays the same way a Cards Round does: choose (reveals), grade, summary', () => {
  const round = examTestQuizWith(2).round({ length: 5 });
  for (let i = 0; i < 5; i++) {
    round.choose(0);
    round.grade(round.current.options[round.choice] === round.current.answer);
  }
  const summary = round.summary();
  assert.equal(summary.total, 5);
  for (const m of summary.mistakes) assert.ok(exam.question(m.id));
});

// ── choose(): Test's auto-grade, layered on the same reveal/grade machinery ─

test('choosing an option reveals the Card and remembers which one', () => {
  const round = examTestQuizWith(1).round();
  assert.equal(round.choice, null);
  round.choose(2);
  assert.equal(round.revealed, true);
  assert.equal(round.choice, 2);
});

test('choosing twice is the same as revealing twice: not allowed', () => {
  const round = examTestQuizWith(1).round();
  round.choose(0);
  assert.throws(() => round.choose(1), /already revealed/);
});

test('grading clears the choice along with the reveal, moving to the next Card', () => {
  const round = examTestQuizWith(1).round();
  round.choose(1);
  round.grade(true);
  assert.equal(round.choice, null);
  assert.equal(round.revealed, false);
});
