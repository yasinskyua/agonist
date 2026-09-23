import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadWelcomeSeen, saveWelcomeSeen } from './welcome.mjs';

const memory = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

test('with nothing saved, the welcome has not been seen', () => {
  assert.equal(loadWelcomeSeen(() => memory()), false);
});

test('once dismissed, it stays seen after a restart', () => {
  const store = memory();
  saveWelcomeSeen(() => store);
  assert.equal(loadWelcomeSeen(() => store), true);
});

test('junk in storage counts as not seen', () => {
  const store = memory();
  store.setItem('welcome-seen', 'yes');
  assert.equal(loadWelcomeSeen(() => store), false);
});

test('storage that throws on touch does not break reading or writing', () => {
  const blocked = () => {
    throw new Error('SecurityError');
  };
  assert.equal(loadWelcomeSeen(blocked), false);
  assert.doesNotThrow(() => saveWelcomeSeen(blocked));
});
