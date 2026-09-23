import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadWeak, saveAnswer } from './memory.mjs';

const memory = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

test('with nothing saved, no Question is weak', () => {
  assert.deepEqual(loadWeak(() => memory()), new Set());
});

test('a Question graded «Не знав» is remembered as weak after a restart', () => {
  const store = memory();
  saveAnswer(() => store, '17', false);
  assert.deepEqual(loadWeak(() => store), new Set(['17']));
});

test('a correct answer removes the Question from the weak set', () => {
  const store = memory();
  saveAnswer(() => store, '17', false);
  saveAnswer(() => store, '17', true);
  assert.deepEqual(loadWeak(() => store), new Set());
});

test('several Questions are tracked independently', () => {
  const store = memory();
  saveAnswer(() => store, '1', false);
  saveAnswer(() => store, '2', false);
  saveAnswer(() => store, '1', true);
  assert.deepEqual(loadWeak(() => store), new Set(['2']));
});

test('junk in storage is treated as no weak Questions', () => {
  const store = memory();
  store.setItem('weak-questions', 'not json');
  assert.deepEqual(loadWeak(() => store), new Set());
});

test('blocked storage does not break reading or writing', () => {
  const blocked = () => {
    throw new Error('SecurityError');
  };
  assert.deepEqual(loadWeak(blocked), new Set());
  assert.doesNotThrow(() => saveAnswer(blocked, '17', false));
});
