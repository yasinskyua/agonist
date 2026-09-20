// Фікстури тут — не порушення правила «тести працюють на справжньому
// контенті»: це перевірка інструменту, а не атласу. Атлас (єдиний шов
// продукту) тестується на справжньому контенті, як вимагає спека.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { collectMuscles } from './atlas-ids.mjs';

const dir = mkdtempSync(join(tmpdir(), 'atlas-'));

/** Записує пару фікстур і повертає views для collectMuscles(). */
function views(frontBody, backBody = '<path data-muscle="soleus"/>') {
  const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const front = join(dir, `${Math.random()}-front.svg`);
  const back = join(dir, `${Math.random()}-back.svg`);
  writeFileSync(front, wrap(frontBody));
  writeFileSync(back, wrap(backBody));
  return { front, back };
}

test('М\'яз із кількох шляхів — один запис', () => {
  const { muscles, count } = collectMuscles(
    views('<path data-muscle="quadriceps"/><path data-muscle="quadriceps"/>'),
  );

  assert.deepEqual(muscles.quadriceps, { views: ['front'], paths: 2 });
  assert.equal(count, 2); // quadriceps + soleus із заднього виду
});

test('вид записаний на кожен М\'яз окремо', () => {
  const { muscles } = collectMuscles(
    views('<path data-muscle="trapezius_upper"/><path data-muscle="pectoralis_major"/>',
          '<path data-muscle="trapezius_upper"/>'),
  );

  assert.deepEqual(muscles.trapezius_upper.views, ['front', 'back']);
  assert.deepEqual(muscles.pectoralis_major.views, ['front']);
});

test('шлях, поділений двома М\'язами, зараховується обом', () => {
  const { muscles } = collectMuscles(
    views('<path data-muscle="sternocleidomastoid levator_scapulae"/>'),
  );

  assert.deepEqual(muscles.sternocleidomastoid, { views: ['front'], paths: 1 });
  assert.deepEqual(muscles.levator_scapulae, { views: ['front'], paths: 1 });
});

test('текст, растр і шрифт у SVG — це помилка, не попередження', () => {
  for (const body of [
    '<text>Pectoralis</text>',
    '<image href="data:image/png;base64,AA"/>',
    '<path style="font-family:Inter"/>',
  ]) {
    assert.throws(() => collectMuscles(views(body)), /текст|растр|шрифт/);
  }
});

test('SVG без data-muscle — це не атлас', () => {
  assert.throws(() => collectMuscles(views('<path id="Vector"/>')), /data-muscle/);
});

test('відсутній SVG відсилає до кроків збирання', () => {
  assert.throws(() => collectMuscles({ front: join(dir, 'nope.svg') }), /README/);
});
