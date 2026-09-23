import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadInstallHintClosed, saveInstallHintClosed, installHintWanted } from './install.mjs';

const memory = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const FIREFOX_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15';
const SAFARI_IPAD =
  'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

const ready = { userAgent: SAFARI_IPHONE, standalone: false, welcomeSeen: true, closed: false };

test('the hint shows in Safari on iPhone, in the browser, after the welcome, until closed', () => {
  assert.equal(installHintWanted(ready), true);
});

test('other browsers and devices do not get it', () => {
  for (const userAgent of [CHROME_IPHONE, FIREFOX_IPHONE, SAFARI_IPAD, CHROME_ANDROID, SAFARI_MAC]) {
    assert.equal(installHintWanted({ ...ready, userAgent }), false, userAgent);
  }
});

test('an installed app does not offer to be installed', () => {
  assert.equal(installHintWanted({ ...ready, standalone: true }), false);
});

test('it waits for the welcome, so two hints never stand together', () => {
  assert.equal(installHintWanted({ ...ready, welcomeSeen: false }), false);
});

test('a closed hint stays closed', () => {
  assert.equal(installHintWanted({ ...ready, closed: true }), false);
});

test('with nothing saved, the hint has not been closed', () => {
  assert.equal(loadInstallHintClosed(() => memory()), false);
});

test('once closed, it stays closed after a restart', () => {
  const store = memory();
  saveInstallHintClosed(() => store);
  assert.equal(loadInstallHintClosed(() => store), true);
});

test('junk in storage counts as not closed', () => {
  const store = memory();
  store.setItem('install-hint-closed', 'yes');
  assert.equal(loadInstallHintClosed(() => store), false);
});

test('storage that throws on touch does not break reading or writing', () => {
  const blocked = () => {
    throw new Error('SecurityError');
  };
  assert.equal(loadInstallHintClosed(blocked), false);
  assert.doesNotThrow(() => saveInstallHintClosed(blocked));
});

test('storage whose reads and writes throw does not break them either', () => {
  const hostile = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(loadInstallHintClosed(() => hostile), false);
  assert.doesNotThrow(() => saveInstallHintClosed(() => hostile));
});
