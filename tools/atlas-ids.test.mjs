// The fixtures here do not break the rule "tests run on the real content": this
// tests a tool, not the atlas. The atlas (the product's single seam) is tested
// on the real content, as the spec requires.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { collectMuscles } from './atlas-ids.mjs';

const dir = mkdtempSync(join(tmpdir(), 'atlas-'));

/** Writes a pair of fixtures and returns the views for collectMuscles(). */
function views(frontBody, backBody = '<path data-muscle="soleus" data-group="calves"/>') {
  const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const front = join(dir, `${Math.random()}-front.svg`);
  const back = join(dir, `${Math.random()}-back.svg`);
  writeFileSync(front, wrap(frontBody));
  writeFileSync(back, wrap(backBody));
  return { front, back };
}

test('a Muscle with several paths is one entry', () => {
  const { muscles, count } = collectMuscles(
    views('<path data-muscle="quadriceps"/><path data-muscle="quadriceps"/>'),
  );

  assert.deepEqual(muscles.quadriceps, { views: ['front'], groups: [], paths: 2 });
  assert.equal(count, 2); // quadriceps + soleus from the back view
});

test('the view is recorded on each Muscle separately', () => {
  const { muscles } = collectMuscles(
    views('<path data-muscle="trapezius_upper"/><path data-muscle="pectoralis_major"/>',
          '<path data-muscle="trapezius_upper"/>'),
  );

  assert.deepEqual(muscles.trapezius_upper.views, ['front', 'back']);
  assert.deepEqual(muscles.pectoralis_major.views, ['front']);
});

test('a path shared by two Muscles counts for both', () => {
  const { muscles } = collectMuscles(
    views('<path data-muscle="sternocleidomastoid levator_scapulae"/>'),
  );

  assert.deepEqual(muscles.sternocleidomastoid, { views: ['front'], groups: [], paths: 1 });
  assert.deepEqual(muscles.levator_scapulae, { views: ['front'], groups: [], paths: 1 });
});

test('a Muscle Group comes from the paths its Muscle shares with it', () => {
  const { muscles } = collectMuscles(
    views('<path data-group="chest" data-muscle="pectoralis_major"/>' +
          '<path data-group="chest" data-muscle="pectoralis_major"/>'),
  );

  assert.deepEqual(muscles.pectoralis_major, { views: ['front'], groups: ['chest'], paths: 2 });
  assert.deepEqual(muscles.soleus.groups, ['calves']);
});

test('text, a raster and a font in the SVG are an error, not a warning', () => {
  for (const body of [
    '<text>Pectoralis</text>',
    '<image href="data:image/png;base64,AA"/>',
    '<path style="font-family:Inter"/>',
  ]) {
    assert.throws(() => collectMuscles(views(body)), /текст|растр|шрифт/);
  }
});

test('an SVG without data-muscle is not an atlas', () => {
  assert.throws(() => collectMuscles(views('<path id="Vector"/>')), /data-muscle/);
});

test('a missing SVG points to the build steps', () => {
  assert.throws(() => collectMuscles({ front: join(dir, 'nope.svg') }), /README/);
});
