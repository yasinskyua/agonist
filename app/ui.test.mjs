// Exactly one thing is tested out of the UI: the tap-zone geometry (the atlas's
// zones, and the Game's — ADR-0010). The rest
// — DOM, highlighting, switching views — is checked by eye in a minute, as
// spec.md decided.
//
// This part is not checkable by eye: ticket 02 measured that 30 Muscles out
// of 40 are narrower than a finger, and whether a zone really grew to 44 px
// does not show on screen.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { expand, union, resolveTap } from './ui.mjs';

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

// ── The Game's tap (ADR-0010) ────────────────────────────────────────────

// A small Muscle 7 wide and 60 high, lying between two big ones, on a figure
// where a finger is 44 units.
const small = { x: 100, y: 50, width: 7, height: 60 }; // zone: x 81.5–125.5, y as it is
const big = { x: 0, y: 0, width: 200, height: 300 };
const MIN = 44;
const tapOn = (target, box, tap, under) => resolveTap({ tap, under, target, box, min: MIN });

test('a tap in the small Muscle\'s zone counts for it, even with a neighbour drawn under the finger', () => {
  assert.equal(tapOn('small', small, { x: 90, y: 80 }, ['neighbour']), 'small');
  assert.equal(tapOn('small', small, { x: 125, y: 55 }, ['neighbour']), 'small');
});

test('the zone is a finger wide, and only that: a tap outside it is the neighbour', () => {
  assert.equal(tapOn('small', small, { x: 80, y: 80 }, ['neighbour']), 'neighbour');
  assert.equal(tapOn('small', small, { x: 103, y: 120 }, ['neighbour']), 'neighbour', 'below it: a Muscle already tall enough grows no zone in height');
});

test('a Muscle lower than a finger gets a zone above and below too', () => {
  const low = { x: 10, y: 100, width: 90, height: 6 }; // zone: y 81–125
  assert.equal(tapOn('low', low, { x: 50, y: 85 }, ['neighbour']), 'low');
  assert.equal(tapOn('low', low, { x: 50, y: 70 }, ['neighbour']), 'neighbour');
});

test('a big Muscle has no zone: a tap on its neighbour is the neighbour, however near', () => {
  assert.equal(tapOn('big', big, { x: 201, y: 150 }, ['neighbour']), 'neighbour');
  assert.equal(tapOn('big', big, { x: 199, y: 150 }, ['neighbour']), 'neighbour', 'inside its box but not drawn under the finger');
});

test('the Muscle drawn under the finger counts, small or big', () => {
  assert.equal(tapOn('big', big, { x: 50, y: 50 }, ['big']), 'big');
  assert.equal(tapOn('small', small, { x: 103, y: 80 }, ['small', 'neighbour']), 'small');
});

test('one path carrying two Muscles (the neck) counts for either', () => {
  assert.equal(tapOn('second', big, { x: 50, y: 50 }, ['first', 'second']), 'second');
  assert.equal(tapOn('first', big, { x: 50, y: 50 }, ['first', 'second']), 'first');
});

test('a tap outside the zone with another Muscle drawn there is that Muscle; on empty ground it is nothing', () => {
  assert.equal(tapOn('small', small, { x: 10, y: 10 }, ['other']), 'other');
  assert.equal(tapOn('small', small, { x: 10, y: 10 }, []), undefined);
  assert.equal(tapOn('big', big, { x: 500, y: 500 }, []), undefined);
});

test('a target not drawn on this side has no zone: only what is under the finger counts', () => {
  assert.equal(tapOn('small', null, { x: 100, y: 80 }, ['other']), 'other');
  assert.equal(tapOn('small', null, { x: 100, y: 80 }, []), undefined);
});
