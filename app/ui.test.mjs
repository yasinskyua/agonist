// Exactly one thing is tested out of the UI: the tap-zone geometry. The rest
// — DOM, highlighting, switching views — is checked by eye in a minute, as
// spec.md decided.
//
// This part is not checkable by eye: ticket 02 measured that 30 Muscles out
// of 40 are narrower than a finger, and whether a zone really grew to 44 px
// does not show on screen.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { expand, union } from './ui.mjs';

test('a narrow Muscle grows to the minimum and stays put', () => {
  const box = expand({ x: 100, y: 50, width: 7, height: 60 }, 44);

  assert.equal(box.width, 44);
  assert.equal(box.height, 60, 'a side already past the minimum is left alone');
  assert.equal(box.x + box.width / 2, 103.5, "the Muscle's centre did not move");
  assert.equal(box.y, 50);
});

test('a Muscle a finger already hits is left as it is', () => {
  const box = { x: 0, y: 0, width: 62, height: 90 };

  assert.deepEqual(expand(box, 44), box);
});

test("a Muscle's box is the union of all its paths' boxes", () => {
  const box = union([
    { x: 10, y: 10, width: 10, height: 10 },
    { x: 30, y: 5, width: 10, height: 10 },
  ]);

  assert.deepEqual(box, { x: 10, y: 5, width: 30, height: 15 });
});
