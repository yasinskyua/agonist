// The Exam content tests run on the real content, like the atlas tests: the
// content is the product, and a bad Question is most likely a content problem.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas } from './atlas.mjs';
import { createExam, ContentError, TOPICS } from './exam.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const atlas = createAtlas({
  muscles: read('content/muscles.json').muscles,
  groups: read('content/muscle-groups.json').groups,
  exercises: read('content/exercises.json').exercises,
  atlasMuscles: read('assets/atlas/muscle-ids.json').muscles,
});

const content = { questions: read('content/exam.json').questions, atlas };
const exam = createExam(content);

/** A copy of the content with one Question replaced or added. */
const broken = (patch) => ({ ...content, questions: { ...content.questions, ...patch } });

/** The error building the exam threw. The test fails if there is none. */
function contentError(patch) {
  try {
    createExam(broken(patch));
  } catch (error) {
    assert.ok(error instanceof ContentError, `expected a ContentError, got ${error}`);
    return error;
  }
  assert.fail('the content is broken and there is no error');
}

const valid = {
  topic: 'biomechanics',
  question: 'Питання?',
  answer: 'Відповідь',
  explanation: 'Пояснення.',
  source: 'club',
};

// ── Content integrity ────────────────────────────────────────────────────

test('the real content passes every invariant', () => {
  assert.ok(exam.questions().length > 0);
});

test('a Topic outside the list is an error, named by the Question id', () => {
  const error = contentError({ x: { ...valid, topic: 'unicorn' } });
  assert.match(error.message, /"x": Тема "unicorn" не з переліку/);
});

test('a blank question, answer or explanation is an error', () => {
  assert.throws(() => createExam(broken({ x: { ...valid, question: ' ' } })), /"x" не має тексту/);
  assert.throws(() => createExam(broken({ x: { ...valid, answer: '' } })), /"x" не має відповіді/);
  assert.throws(() => createExam(broken({ x: { ...valid, explanation: ' ' } })), /"x" не має пояснення/);
});

test('an unknown source is an error', () => {
  assert.throws(() => createExam(broken({ x: { ...valid, source: 'made-up' } })), /невідоме джерело "made-up"/);
});

test('an empty caveat is an error, not a blank note on screen', () => {
  assert.throws(() => createExam(broken({ x: { ...valid, caveat: '  ' } })), /порожня примітка/);
});

test('a link to an Exercise outside the atlas is an error', () => {
  const error = contentError({ x: { ...valid, exercise: 'no-such-exercise' } });
  assert.match(error.message, /"x" посилається на неіснуючу Вправу "no-such-exercise"/);
});

test('a Test block without exactly three wrong variants is an error', () => {
  assert.throws(
    () => createExam(broken({ x: { ...valid, test: { wrong: ['a', 'b'] } } })),
    /"x": блок Тесту має мати рівно три неправильні варіанти/,
  );
  assert.throws(
    () => createExam(broken({ x: { ...valid, test: { wrong: 'a,b,c' } } })),
    /рівно три неправильні варіанти/,
  );
});

test('a wrong variant equal to the correct answer is an error — two right answers', () => {
  const error = contentError({ x: { ...valid, test: { wrong: ['a', valid.answer, 'c'] } } });
  assert.match(error.message, /"x": неправильний варіант Тесту збігається з правильною відповіддю/);
});

test("a Test's own answer, not the Card's, is what a wrong variant is checked against", () => {
  // The override changes the correct answer; a wrong variant equal to the old
  // Card answer is fine, one equal to the Test's own answer is not.
  assert.doesNotThrow(() =>
    createExam(broken({ x: { ...valid, test: { question: 'Що зайве?', answer: 'Інша', wrong: [valid.answer, 'b', 'c'] } } })),
  );
  assert.throws(
    () => createExam(broken({ x: { ...valid, test: { answer: 'Інша', wrong: ['Інша', 'b', 'c'] } } })),
    /збігається з правильною відповіддю/,
  );
});

test('all problems are reported in one pass, not one at a time', () => {
  const error = contentError({ a: { ...valid, answer: '' }, b: { ...valid, answer: '' } });
  assert.match(error.message, /"a"/);
  assert.match(error.message, /"b"/);
});

// ── Queries ──────────────────────────────────────────────────────────────

test('Topics come back in the set order, only those with a Question', () => {
  const ids = exam.topics().map((t) => t.id);
  const order = TOPICS.map((t) => t.id);
  assert.deepEqual(
    ids,
    ids.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)),
  );
  for (const id of ids) assert.ok(exam.questions({ topic: id }).length > 0);
});

test("questions({ topic }) does not lose a single Question, and the Topics' sum is the whole list", () => {
  const total = exam.questions().length;
  const sum = exam.topics().reduce((n, t) => n + exam.questions({ topic: t.id }).length, 0);
  assert.equal(sum, total);
});

test('a Question by id carries its id and the rest of its content', () => {
  const q = exam.question('17');
  assert.equal(q.id, '17');
  assert.equal(q.topic, 'biomechanics');
  assert.match(q.answer, /\S/);
});

test('an unknown Question id is undefined, not a throw — an id from the URL is untrusted', () => {
  assert.equal(exam.question('no-such-question'), undefined);
});

test('testable() holds only Questions with a Test block', () => {
  for (const q of exam.testable()) assert.ok(q.test);
  assert.ok(exam.testable().length <= exam.questions().length);
});
