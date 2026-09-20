// Фікстури тут — не порушення правила «тести працюють на справжньому контенті»:
// це перевірка інструменту, а не атласу. Атлас (єдиний шов продукту) тестується
// на справжньому контенті, як вимагає спека.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { collectMuscleIds } from './atlas-ids.mjs';

const dir = mkdtempSync(join(tmpdir(), 'atlas-'));

/** Записує пару фікстур і повертає views для collectMuscleIds(). */
function views(frontBody, backBody = '<path id="soleus_l"/>') {
  const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const front = join(dir, `${Math.random()}-front.svg`);
  const back = join(dir, `${Math.random()}-back.svg`);
  writeFileSync(front, wrap(frontBody));
  writeFileSync(back, wrap(backBody));
  return { front, back };
}

test('ключ — справжній id елемента, парна сторона показана через pair', () => {
  const { ids } = collectMuscleIds(
    views('<path id="pectoralis_major_l"/><path id="pectoralis_major_r"/><path id="serratus_l"/>'),
  );

  assert.deepEqual(ids.pectoralis_major_l, { views: ['front'], pair: 'pectoralis_major_r' });
  assert.deepEqual(ids.pectoralis_major_r, { views: ['front'], pair: 'pectoralis_major_l' });
  // Сторона без пари в SVG не вигадується.
  assert.deepEqual(ids.serratus_l, { views: ['front'] });
  assert.equal(ids.pectoralis_major, undefined);
});

test('вид записаний на кожен id окремо', () => {
  const { ids } = collectMuscleIds(
    views('<g id="sternum"/><path id="rectus_abdominis"/>', '<path id="sternum"/>'),
  );

  assert.deepEqual(ids.sternum.views, ['front', 'back']);
  assert.deepEqual(ids.rectus_abdominis.views, ['front']);
});

test('сміття Figma не потрапляє в словник М\'язів', () => {
  const { ids, count } = collectMuscleIds(
    views(
      '<defs><clipPath id="hidden_muscle"/></defs>' + // вміст <defs> — не анатомія
        '<path id="clip0_1_2"/><path id="paint0_linear_1_2"/><path id="mask0_d"/>' + // технічні id
        '<g id="Vector"><path id="Group 5"/></g><path id="Union"/>' + // автоімена шарів
        '<path data-id="Rectangle 12"/>' + // не id взагалі
        '<path id="biceps_brachii_l"/>',
    ),
  );

  assert.deepEqual(Object.keys(ids), ['biceps_brachii_l', 'soleus_l']);
  assert.equal(count, 2);
});

test('текст, растр і шрифт у SVG — це помилка, не попередження', () => {
  for (const body of [
    '<text>Pectoralis</text>',
    '<image href="data:image/png;base64,AA"/>',
    '<path style="font-family:Inter"/>',
  ]) {
    assert.throws(() => collectMuscleIds(views(body)), /текст|растр|шрифт/);
  }
});

test('експорт без галочки Include "id" attribute відсилає до кроків', () => {
  assert.throws(() => collectMuscleIds(views('<path d="M0 0"/>')), /Include "id" attribute/);
});

test('відсутній SVG відсилає до кроків експорту', () => {
  assert.throws(() => collectMuscleIds({ front: join(dir, 'nope.svg') }), /README/);
});
