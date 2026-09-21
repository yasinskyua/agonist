// Checks the seam where Muscle names hop from a callout to the atlas.
// Fixtures, not the real atlas: the real exports weigh 112 MB and are not in the
// repository. The atlas itself is checked by tools/atlas-ids.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { figureBoxes, matchingPaths } from './build-atlas.mjs';

const path = (x, y, w, h) => `<path d="M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}Z"/>`;

test('boxes are shifted to zero, so the canvas position does not matter', () => {
  const here = figureBoxes([path(100, 100, 10, 20), path(150, 300, 5, 5)]);
  const there = figureBoxes([path(9100, 27100, 10, 20), path(9150, 27300, 5, 5)]);

  assert.deepEqual(here, there);
  assert.deepEqual(here[0], [0, 0, 10, 20]);
});

test('the path order differs — geometry matches, not the index', () => {
  // This very case broke the atlas: the calf was 73rd in the atlas, 79th in the callout.
  const figure = figureBoxes([path(0, 0, 40, 40), path(0, 500, 20, 90), path(0, 200, 30, 60)]);
  const callout = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60), path(0, 500, 20, 90)]);

  assert.deepEqual(matchingPaths(figure, callout[2]), [1]); // the calf, not the third path
  assert.deepEqual(matchingPaths(figure, callout[1]), [2]);
});

test('a difference of hundredths of a unit is the same path', () => {
  const figure = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30.02, 60.05)]);
  const callout = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60)]);

  assert.deepEqual(matchingPaths(figure, callout[1]), [1]);
});

test('no such path in the figure gives empty, not just any nearest one', () => {
  const figure = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60)]);
  const callout = figureBoxes([path(0, 0, 40, 40), path(0, 800, 30, 60)]);

  assert.deepEqual(matchingPaths(figure, callout[1]), []);
});

test('paths lying on top of each other both get the name', () => {
  const figure = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60), path(0, 200, 30, 60)]);
  const callout = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60)]);

  assert.deepEqual(matchingPaths(figure, callout[1]), [1, 2]);
});
