// The map's zoom is arithmetic on a view — a scale and where the map's corner
// went — so it is checked here as plain numbers. What cannot be checked in
// Node is the fingers; that is checked on a phone.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { IDENTITY, MAX_SCALE, FRAME_MAX, isZoomed, clampPan, zoomAt, pinch, panBy, frameOn } from './zoom.mjs';

const size = { width: 400, height: 300 };

/** The point of the unzoomed map that lies under `at` on the screen. */
const under = (view, at) => ({ x: (at.x - view.x) / view.s, y: (at.y - view.y) / view.s });

/** Points equal to within float noise. */
function assertSpot(actual, expected) {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9, `${JSON.stringify(actual)} is not ${JSON.stringify(expected)}`);
}

test('the point under the finger stays under it', () => {
  const at = { x: 220, y: 140 };
  const view = zoomAt(IDENTITY, 2, at, size);

  assert.equal(view.s, 2);
  assertSpot(under(view, at), under(IDENTITY, at));

  // And again, from a view that is already moved.
  const again = zoomAt(view, 1.5, { x: 190, y: 160 }, size);
  assertSpot(under(again, { x: 190, y: 160 }), under(view, { x: 190, y: 160 }));
});

test('the scale stays between 1× and the maximum', () => {
  assert.equal(zoomAt(IDENTITY, 1000, { x: 200, y: 150 }, size).s, MAX_SCALE);
  assert.deepEqual(zoomAt(IDENTITY, 0.001, { x: 200, y: 150 }, size), IDENTITY);
  assert.deepEqual(zoomAt(zoomAt(IDENTITY, 3, { x: 50, y: 50 }, size), 0.001, { x: 50, y: 50 }, size), IDENTITY, 'all the way out is the whole body again');
});

test('the body never leaves the frame', () => {
  // The corner of the map may only move up and left, and by no more than the growth.
  for (const view of [{ s: 3, x: 50, y: 50 }, { s: 3, x: -5000, y: -5000 }, { s: 3, x: -100, y: -100 }]) {
    const c = clampPan(view, size);
    assert.ok(c.x <= 0 && c.x >= size.width - size.width * 3);
    assert.ok(c.y <= 0 && c.y >= size.height - size.height * 3);
  }
  assert.deepEqual(clampPan({ s: 3, x: -100, y: -100 }, size), { s: 3, x: -100, y: -100 }, 'a view inside the frame is left alone');
});

test('zooming at a corner does not open white space beyond it', () => {
  const view = zoomAt(IDENTITY, 4, { x: 0, y: 0 }, size);

  assert.deepEqual(view, { s: 4, x: 0, y: 0 });
  assert.ok(view.x + size.width * view.s >= size.width, 'the right edge of the body is still past the frame');
});

test('dragging moves the map with the finger, up to the edge', () => {
  const view = { s: 2, x: -200, y: -150 };

  assert.deepEqual(panBy(view, 30, -20, size), { s: 2, x: -170, y: -170 });
  assert.equal(panBy(view, 9999, 0, size).x, 0, 'the left edge of the body stops at the frame');
  assert.equal(panBy(view, -9999, 0, size).x, -400, 'and so does the right');
});

test('a pinch scales by how far the fingers moved apart, around where they were', () => {
  const before = [{ x: 150, y: 150 }, { x: 250, y: 150 }];
  const after = [{ x: 100, y: 150 }, { x: 300, y: 150 }];
  const view = pinch(IDENTITY, before, after, size);

  assert.equal(view.s, 2);
  // The content that was under each finger is under it still.
  for (let i = 0; i < 2; i++) {
    assertSpot(under(view, after[i]), under(IDENTITY, before[i]));
  }
});

test('fingers moving together drag the map while they pinch', () => {
  const view = { s: 2, x: -200, y: -150 };
  const before = [{ x: 150, y: 150 }, { x: 250, y: 150 }];
  const after = [{ x: 170, y: 130 }, { x: 270, y: 130 }]; // same distance, moved by (20, -20)
  const moved = pinch(view, before, after, size);

  assert.deepEqual(moved, { s: 2, x: -180, y: -170 });
});

test('two fingers on one spot do not make a scale of infinity', () => {
  const same = [{ x: 100, y: 100 }, { x: 100, y: 100 }];

  assert.deepEqual(pinch(IDENTITY, same, [{ x: 100, y: 100 }, { x: 140, y: 100 }], size), IDENTITY);
});

test('a small Muscle is framed, up to the limit', () => {
  const tiny = { x: 100, y: 100, width: 6, height: 8 };
  const view = frameOn(tiny, size);

  assert.equal(view.s, FRAME_MAX);
  // Its centre is where the middle of the map was, as far as the edges allow.
  assertSpot(under(view, { x: size.width / 2, y: size.height / 2 }), { x: 103, y: 104 });
});

test('a small Muscle gets less than the limit when that is enough', () => {
  const view = frameOn({ x: 150, y: 100, width: 100, height: 80 }, size);

  assert.ok(view.s > 1 && view.s < FRAME_MAX, `got ${view.s}`);
});

test('a big Muscle is not zoomed at all', () => {
  const view = frameOn({ x: 20, y: 20, width: 300, height: 250 }, size);

  assert.deepEqual(view, IDENTITY);
});

test('a Muscle at the edge is framed as close as the edge allows, not off it', () => {
  const view = frameOn({ x: 0, y: 0, width: 6, height: 8 }, size);

  assert.equal(view.s, FRAME_MAX);
  assert.deepEqual(view, { s: FRAME_MAX, x: 0, y: 0 });
});

test('a view is zoomed once it is past the whole body, with float slack', () => {
  assert.equal(isZoomed(IDENTITY), false);
  assert.equal(isZoomed({ s: 1.005, x: 0, y: 0 }), false);
  assert.equal(isZoomed({ s: 1.5, x: 0, y: 0 }), true);
});
