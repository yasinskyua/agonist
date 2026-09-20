import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { collect } from './atlas-ids.mjs';

const dir = mkdtempSync(join(tmpdir(), 'atlas-'));

/** Записує пару фікстур і повертає views для collect(). */
function views(frontBody, backBody = '<path id="soleus_l"/>') {
  const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const front = join(dir, `${Math.random()}-front.svg`);
  const back = join(dir, `${Math.random()}-back.svg`);
  writeFileSync(front, wrap(frontBody));
  writeFileSync(back, wrap(backBody));
  return { front, back };
}

test('парні сторони збираються в один id, види накопичуються', () => {
  const { ids, count } = collect(
    views(
      '<path id="pectoralis_major_l"/><path id="pectoralis_major_r"/><g id="sternum"/>',
      '<path id="sternum"/><path id="trapezius_l"/>',
    ),
  );

  assert.equal(count, 3);
  assert.deepEqual(
    ids.find((e) => e.id === 'pectoralis_major'),
    { id: 'pectoralis_major', views: ['front'], elements: ['pectoralis_major_l', 'pectoralis_major_r'] },
  );
  assert.deepEqual(ids.find((e) => e.id === 'sternum').views, ['front', 'back']);
  assert.deepEqual(ids.find((e) => e.id === 'trapezius').elements, ['trapezius_l']);
});

test('технічні id Figma і вміст <defs> не потрапляють у перелік', () => {
  const { ids } = collect(
    views('<defs><clipPath id="hidden_muscle"/></defs><path id="clip0_1_2"/><path id="biceps_brachii_l"/>'),
  );

  assert.deepEqual(ids.map((e) => e.id), ['biceps_brachii', 'soleus']);
});

test('текст, растр і шрифт у SVG — це помилка, не попередження', () => {
  for (const body of ['<text>Pectoralis</text>', '<image href="data:image/png;base64,AA"/>', '<path style="font-family:Inter"/>']) {
    assert.throws(() => collect(views(body)), /текст|растр|шрифт/);
  }
});

test('відсутній SVG відсилає до кроків експорту', () => {
  assert.throws(() => collect({ front: join(dir, 'nope.svg') }), /README/);
});
