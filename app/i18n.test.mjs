// Інтерфейс двомовний з першого рядка, тож перевіряємо не переклад окремого
// рядка, а повноту словника: пропущений ключ в одній мові — це порожнє місце
// на екрані, і знайти його оком можна лише перемкнувши мову й обійшовши всі
// екрани.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LANGS, KEYS, translator } from './i18n.mjs';

test('кожен рядок є в кожній мові й не порожній', () => {
  for (const lang of LANGS) {
    const t = translator(lang);
    for (const key of KEYS) {
      assert.match(t(key), /\S/, `${lang}: порожній рядок "${key}"`);
    }
  }
});

test('українська й англійська не збігаються слово в слово', () => {
  const [uk, en] = LANGS.map(translator);
  const same = KEYS.filter((key) => uk(key) === en(key));

  // Збіг сам по собі не помилка (латина, цифри), але мовчазний збіг усього
  // словника означав би, що перекладу немає взагалі.
  assert.ok(same.length < KEYS.length / 2, `однакові в обох мовах: ${same.join(', ')}`);
});

test('невідомий ключ падає гучно, а не малює порожнє місце', () => {
  assert.throws(() => translator('uk')('немає.такого'), /немає\.такого/);
});

test('невідома мова падає гучно', () => {
  assert.throws(() => translator('de'), /de/);
});
