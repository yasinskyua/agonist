// The interface is bilingual from its first line, so what we check is not one
// translated string but the dictionary's completeness: a key missing in one
// language is a blank spot on screen, and finding it by eye means switching
// language and walking every screen.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LANGS, KEYS, translator, exerciseCount, loadLang, saveLang } from './i18n.mjs';

test('every string exists in every language and is not blank', () => {
  for (const lang of LANGS) {
    const t = translator(lang);
    for (const key of KEYS) {
      assert.match(t(key), /\S/, `${lang}: blank string "${key}"`);
    }
  }
});

test('no string is left untranslated', () => {
  const [uk, en] = LANGS.map(translator);

  // A word that is genuinely the same in both languages would have to be
  // listed here on purpose. Today none is, so a match means a copy-paste.
  assert.deepEqual(
    KEYS.filter((key) => uk(key) === en(key)),
    [],
  );
});

test('an unknown key fails loudly instead of drawing a blank', () => {
  assert.throws(() => translator('uk')('no.such.key'), /no\.such\.key/);
});

test('an unknown language fails loudly', () => {
  assert.throws(() => translator('de'), /de/);
});

const memory = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

test('a saved language comes back after a restart', () => {
  const store = memory();
  saveLang(() => store, 'en');
  assert.equal(loadLang(() => store), 'en');
});

test('with nothing saved, or junk saved, the language is Ukrainian', () => {
  const store = memory();
  assert.equal(loadLang(() => store), 'uk');
  store.setItem('lang', 'de');
  assert.equal(loadLang(() => store), 'uk');
});

test('blocked storage does not break the app', () => {
  const blocked = () => {
    throw new Error('SecurityError');
  };
  assert.equal(loadLang(blocked), 'uk');
  assert.doesNotThrow(() => saveLang(blocked, 'en'));
});

test('a count of Exercises declines the way each language does', () => {
  const words = (...counts) => counts.map((n) => exerciseCount('uk', n));

  assert.deepEqual(words(1, 2, 4, 5, 11, 12, 21, 22, 25), [
    '1 вправа',
    '2 вправи',
    '4 вправи',
    '5 вправ',
    '11 вправ',
    '12 вправ',
    '21 вправа',
    '22 вправи',
    '25 вправ',
  ]);
  assert.equal(exerciseCount('en', 1), '1 exercise');
  assert.equal(exerciseCount('en', 12), '12 exercises');
});
