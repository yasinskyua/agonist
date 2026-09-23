// The Quiz tests run on the real content, like the atlas tests: the content is
// the product, and a bad Task or Card is most likely a content problem. Randomness
// comes in from outside, so every Round here is reproducible from its seed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas, ROLES } from './atlas.mjs';
import { createExam } from './exam.mjs';
import { createQuiz, createExamQuiz, createExamTestQuiz, createRound, judge, KINDS, DONT_KNOW, ROUND_SIZE } from './quiz.mjs';

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
/** The first Task of `kind` in a seeded Round. */
const taskOf = (kind, seed = 1) => quizWith(seed).round().cards.find((c) => c.kind === kind);

/** What answers a Task right: the Muscle to tap, or for «Яка Роль» the Role. */
const rightAnswer = (task) => (task.kind === 'role' ? task.role : task.muscle);

/** Play a Round answering each Task right or wrong as told: 'K' (right) or 'U' («Не знаю»). */
function play(pattern, seed = 5) {
  const round = quizWith(seed).round();
  for (const c of pattern) {
    round.choose(c === 'K' ? rightAnswer(round.current) : DONT_KNOW);
    round.grade(judge(atlas, round.current, round.choice).correct);
  }
  return round;
}

// ── A Round of ten Tasks ─────────────────────────────────────────────────

test('a Round is exactly ten Tasks, no Exercise or Muscle twice', () => {
  for (const round of rounds()) {
    assert.equal(round.total, ROUND_SIZE);
    const exercises = round.cards.filter((c) => c.exercise).map((c) => c.exercise);
    const muscles = round.cards.map((c) => c.muscle);
    assert.equal(new Set(exercises).size, exercises.length, `repeat in ${exercises}`);
    assert.equal(new Set(muscles).size, ROUND_SIZE, `repeat in ${muscles}`);
  }
});

test('a Round mixes the three kinds about equally — at least three of each — and not in blocks', () => {
  const orders = new Set();
  for (const { cards } of rounds()) {
    const count = (kind) => cards.filter((c) => c.kind === kind).length;
    assert.ok(['agonist', 'find', 'role'].every((kind) => count(kind) >= 3), cards.map((c) => c.kind).join());
    orders.add(cards.map((c) => c.kind[0]).join(''));
  }
  assert.ok(orders.size > 50, 'the order of kinds is shuffled');
});

test("a «Хто Агоніст» Task names its Exercise, and its answer is that Exercise's Agonist in the atlas", () => {
  for (const { cards } of rounds()) {
    for (const task of cards.filter((c) => c.kind === 'agonist')) assert.equal(task.muscle, agonistOf(task.exercise));
  }
});

test('«Знайди М\'яз» asks only about Muscles that work in some Exercise', () => {
  const asked = new Set();
  for (const { cards } of rounds()) {
    for (const task of cards.filter((c) => c.kind === 'find')) {
      assert.equal(task.exercise, undefined, 'the subject is the Muscle, not an Exercise');
      assert.ok(atlas.muscleExercises(task.muscle).length > 0, task.muscle);
      asked.add(task.muscle);
    }
  }
  assert.ok(asked.size > 20, 'a wide spread of Muscles, not a few');
});

test('the same seed gives the same Round, another seed another one', () => {
  const ids = (round) => round.cards.map((c) => c.exercise);
  assert.deepEqual(ids(quizWith(7).round()), ids(quizWith(7).round()));
  assert.notDeepEqual(ids(quizWith(7).round()), ids(quizWith(8).round()));
});

// ── Judging an answer ────────────────────────────────────────────────────

test('tapping the Agonist is right, and the Role it reports is the Agonist', () => {
  for (const { cards } of rounds()) {
    for (const task of cards.filter((c) => c.kind === 'agonist')) {
      assert.deepEqual(judge(atlas, task, task.muscle), { correct: true, tapped: task.muscle, role: 'agonist' });
    }
  }
});

test('another Muscle of the Exercise is a miss that carries the Role it has there', () => {
  const task = taskOf('agonist');
  for (const { muscle, role } of atlas.exerciseMuscles(task.exercise)) {
    if (muscle.id === task.muscle) continue;
    assert.deepEqual(judge(atlas, task, muscle.id), { correct: false, tapped: muscle.id, role });
  }
});

test('a Muscle the Exercise does not use is a miss with no Role: it does not work there', () => {
  const task = taskOf('agonist');
  const used = new Set(atlas.exerciseMuscles(task.exercise).map((x) => x.muscle.id));
  const idle = atlas.muscles().find((m) => !used.has(m.id));
  assert.deepEqual(judge(atlas, task, idle.id), { correct: false, tapped: idle.id, role: null });
});

test('«Не знаю» is a miss with nothing tapped', () => {
  assert.deepEqual(judge(atlas, taskOf('agonist'), DONT_KNOW), { correct: false, tapped: null, role: null });
  assert.deepEqual(judge(atlas, taskOf('find'), DONT_KNOW), { correct: false, tapped: null });
});

test('«Знайди М\'яз»: tapping the Muscle is right, any other is a miss that says which was tapped', () => {
  const task = taskOf('find');
  const other = atlas.muscles().find((m) => m.id !== task.muscle).id;
  assert.deepEqual(judge(atlas, task, task.muscle), { correct: true, tapped: task.muscle });
  assert.deepEqual(judge(atlas, task, other), { correct: false, tapped: other });
});

// «Яка Роль»

const KIND_ROLE = KINDS.find((k) => k.id === 'role');
const roleTasks = () => rounds().flatMap(({ cards }) => cards.filter((c) => c.kind === 'role'));

test("a «Яка Роль» Task names an Exercise and one of its Muscles, and its Role is the one the content gives that Muscle", () => {
  for (const task of roleTasks()) {
    const pair = atlas.exerciseMuscles(task.exercise).find((x) => x.muscle.id === task.muscle);
    assert.ok(pair, `${task.muscle} works in ${task.exercise}`);
    assert.equal(task.role, pair.role);
  }
});

test('every one of the atlas\'s five Roles turns up as the right answer, the Agonist too — not only the Agonist', () => {
  const seen = new Set(roleTasks().map((task) => task.role));
  assert.deepEqual([...seen].sort(), [...ROLES].sort());
});

test('the right Role is right, any other Role or «Не знаю» is a miss that says which Role was picked', () => {
  const task = roleTasks()[0];
  assert.deepEqual(judge(atlas, task, task.role), { correct: true, chosen: task.role, role: task.role });
  const other = ROLES.find((r) => r !== task.role);
  assert.deepEqual(judge(atlas, task, other), { correct: false, chosen: other, role: task.role });
  assert.equal(judge(atlas, task, DONT_KNOW).correct, false);
});

test('the Exercise is chosen first, evenly: one with a single Muscle is asked as often as one with twenty', () => {
  const muscles = (n) => Array.from({ length: n }, (_, i) => ({ muscle: { id: `m${n}-${i}` }, role: 'stabilizer' }));
  const skewed = {
    exercises: () => [{ id: 'small' }, { id: 'big' }],
    exerciseMuscles: (id) => muscles(id === 'small' ? 1 : 20),
  };
  const asked = { small: 0, big: 0 };
  for (let seed = 1; seed <= 2000; seed++) {
    const quiz = createQuiz({ atlas: skewed, random: seeded(seed), kinds: [KIND_ROLE] });
    asked[quiz.round(1).current.exercise]++;
  }
  assert.ok(Math.abs(asked.small - 1000) < 100, `small ×${asked.small}, big ×${asked.big}`);
});

// ── Answering and moving on ──────────────────────────────────────────────

test('a Round opens on the first Task, unanswered', () => {
  const round = quizWith(1).round();
  assert.equal(round.index, 0);
  assert.equal(round.revealed, false);
  assert.equal(round.finished, false);
});

test('a Task cannot be graded before it is answered', () => {
  const round = quizWith(1).round();
  assert.throws(() => round.grade(true), /reveal/);
});

test('a Task is answered once: the first answer stays, a second is refused', () => {
  const round = quizWith(1).round();
  round.choose('deltoid_anterior');
  assert.equal(round.choice, 'deltoid_anterior');
  assert.throws(() => round.choose(round.current.muscle), /already revealed/);
});

test('grading moves to the next Task, unanswered again', () => {
  const round = quizWith(1).round();
  const first = round.current;
  round.choose(DONT_KNOW);
  round.grade(false);

  assert.equal(round.index, 1);
  assert.notDeepEqual(round.current, first);
  assert.equal(round.revealed, false);
  assert.equal(round.choice, null);
});

test('the score counts right answers, not misses or «Не знаю»', () => {
  assert.equal(play('KKU').score, 2);
});

test('the Round finishes after the tenth grade, and nothing can be answered or graded after', () => {
  const round = quizWith(3).round();
  for (let i = 0; i < ROUND_SIZE; i++) {
    assert.equal(round.finished, false);
    round.choose(DONT_KNOW);
    round.grade(false);
  }
  assert.equal(round.finished, true);
  assert.throws(() => round.choose(DONT_KNOW), /over/);
  assert.throws(() => round.grade(true), /over/);
});

// ── Summary ───────────────────────────────────────────────────────────────

test('a summary before the Round is finished is a bug', () => {
  assert.throws(() => quizWith(4).round().summary(), /finish/);
});

test('the summary gives the score and every missed Task once, each still naming its answer', () => {
  const summary = play('KKKUKKUKKK').summary();

  assert.equal(summary.score, 8);
  assert.equal(summary.total, ROUND_SIZE);
  assert.equal(summary.mistakes.length, 2);
  for (const m of summary.mistakes) {
    if (m.kind === 'agonist') assert.equal(m.muscle, agonistOf(m.exercise));
    if (m.kind === 'role') assert.ok(ROLES.includes(m.role));
  }
});

test('a perfect Round has no mistakes', () => {
  const summary = play('KKKKKKKKKK').summary();
  assert.deepEqual([summary.score, summary.mistakes], [10, []]);
});

// ── Composing a Round from the kinds of Task ─────────────────────────────

/** A stand-in kind: `n` Tasks that name a Muscle and, unless `exercise` is off, an Exercise — the shape tickets 02 and 03 add. */
const fakeKind = (id, n, { exercise = true } = {}) => ({
  id,
  tasks: () => Array.from({ length: n }, (_, i) => ({ kind: id, muscle: `${id}-${i}`, ...(exercise && { exercise: `${id}-x${i}` }) })),
  judge: () => ({ correct: true }),
});

const composed = (kinds, seed = 1) => createQuiz({ atlas, random: seeded(seed), kinds }).round();

test('a new kind joins the Round by being in the list — the kinds share it about equally, mixed', () => {
  const kinds = [fakeKind('a', 30), fakeKind('b', 30), fakeKind('c', 30)];
  const sequences = new Set();
  for (const seed of SEEDS) {
    const round = composed(kinds, seed);
    const count = (id) => round.cards.filter((c) => c.kind === id).length;
    assert.equal(round.total, ROUND_SIZE);
    for (const id of ['a', 'b', 'c']) assert.ok([3, 4].includes(count(id)), `${id} ×${count(id)}`);
    sequences.add(round.cards.map((c) => c.kind).join(''));
  }
  assert.ok(sequences.size > 20, 'the order of kinds is shuffled, not in turns');
});

test('no Muscle is the subject of two Tasks, even across kinds', () => {
  const shared = (id) => ({ id, tasks: () => ['m1', 'm2', 'm3'].map((muscle) => ({ kind: id, muscle })), judge: () => ({}) });
  const round = composed([shared('a'), shared('b')], 3);
  assert.equal(round.total, 3, 'six Tasks over three Muscles leave three');
  assert.equal(new Set(round.cards.map((c) => c.muscle)).size, 3);
});

test('a kind with no Exercise does not block its own siblings', () => {
  const round = composed([fakeKind('find', 20, { exercise: false })]);
  assert.equal(round.total, ROUND_SIZE);
});

test('when the kinds run dry the Round is short, not endless', () => {
  assert.equal(composed([fakeKind('a', 2), fakeKind('b', 3)]).total, 5);
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

// «Повторити слабкі» (ticket 08): a caller-picked set of ids, cutting across Topics.

test('a weak-set Round holds exactly those ids, and only those', () => {
  const want = exam.questions().slice(0, 3).map((q) => q.id);
  const round = examQuizWith(1).round({ ids: new Set(want) });
  assert.deepEqual(new Set(round.cards.map((q) => q.id)), new Set(want));
});

test('an empty weak set gives an empty, not a broken, Round', () => {
  const round = examQuizWith(1).round({ ids: new Set() });
  assert.equal(round.total, 0);
  assert.equal(round.finished, true);
});

test('a weak set combines with `topic`: only the ids that are also in it play', () => {
  const topic = exam.topics()[0].id;
  const inTopic = exam.questions({ topic })[0].id;
  const outsideTopic = exam.questions().find((q) => q.topic !== topic).id;
  const round = examQuizWith(1).round({ ids: new Set([inTopic, outsideTopic]), topic });
  assert.deepEqual(new Set(round.cards.map((q) => q.id)), new Set([inTopic]));
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

// «Повторити слабкі» (ticket 08), over the testable Questions.

test('a weak-set Test Round holds exactly those ids among the testable Questions', () => {
  const want = exam.testable().slice(0, 2).map((q) => q.id);
  const round = examTestQuizWith(1).round({ ids: new Set(want) });
  assert.deepEqual(new Set(round.cards.map((q) => q.id)), new Set(want));
});

test('a weak id without a Test block is not offered — only testable Questions play', () => {
  const { id: _id1, test: _test, ...nonTestable } = exam.question(exam.testable()[0].id);
  const { id: _id2, ...testable } = exam.question(exam.testable()[1].id);
  const fromExam = createExam({ questions: { nonTestable, testable }, atlas });
  const round = createExamTestQuiz({ exam: fromExam, random: () => 0 }).round({ ids: new Set(['nonTestable', 'testable']) });
  assert.deepEqual(new Set(round.cards.map((q) => q.id)), new Set(['testable']));
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
