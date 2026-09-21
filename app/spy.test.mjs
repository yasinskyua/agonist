// The two calculations behind «the row under the map lights its Muscles»: which
// row is being read, and how much room the list needs below it so that any row
// — the last one too — can be scrolled up to the line. Pure numbers in, numbers
// out; the DOM that measures them is `ui.mjs`'s.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LINE_GAP, pickRow, roomAtEnd } from './spy.mjs';

/** Rows 60 px high, one after another from `top`, as `getBoundingClientRect` would say. */
const rows = (top, count) => Array.from({ length: count }, (_, i) => ({ top: top + i * 60, bottom: top + i * 60 + 60 }));

// ── Which row is being read ──────────────────────────────────────────────

test('the row whose middle is nearest the line under the map is the one', () => {
  const mapBottom = 300; // the line is at 300 + LINE_GAP
  assert.equal(pickRow(rows(mapBottom + LINE_GAP - 30, 5), mapBottom), 0, 'row 0 is centred on the line');
  // Scrolled 10 px: row 0 is 10 px off, row 1 is 50 — still row 0.
  assert.equal(pickRow(rows(mapBottom + LINE_GAP - 40, 5), mapBottom), 0);
  // Scrolled past half a row: row 1 is nearer now.
  assert.equal(pickRow(rows(mapBottom + LINE_GAP - 100, 5), mapBottom), 1);
});

test('rows that have gone up behind the map do not count', () => {
  const mapBottom = 300;
  // One row up under the map, the only other far below: the far one is «being read»,
  // although the hidden one is nearer the line.
  const list = [
    { top: 200, bottom: 260 },
    { top: 700, bottom: 760 },
  ];

  assert.equal(pickRow(list, mapBottom), 1);
});

test('a row half under the map still counts', () => {
  assert.equal(pickRow([{ top: 280, bottom: 340 }], 300), 0);
});

test('nothing to read gives null', () => {
  assert.equal(pickRow([], 300), null, 'no rows');
  assert.equal(pickRow([{ top: 0, bottom: 100 }], 300), null, 'every row is behind the map');
});

test('two rows equally near: the upper one', () => {
  const line = 300 + LINE_GAP;
  const pair = [{ top: line - 60, bottom: line }, { top: line, bottom: line + 60 }]; // middles 30 px either side
  assert.equal(pickRow(pair, 300), 0);
});

// ── Room after the last row ──────────────────────────────────────────────

/** Where the last row's middle stands at the end of the page, when the page has `room` more below. */
const middleAtEnd = ({ viewport, tail }, room) => viewport - (tail + room);

test('the room lets the last row scroll up exactly to the line', () => {
  const screen = { viewport: 800, line: 340, tail: 120 };
  const room = roomAtEnd(screen);

  assert.equal(middleAtEnd(screen, room), screen.line);
});

test('a long last stretch already reaches the line: no room added', () => {
  // The page ends 600 px under the last row's middle: it gets to the line by itself.
  assert.equal(roomAtEnd({ viewport: 800, line: 340, tail: 600 }), 0);
});

test('room follows the screen: a taller one, or a taller map, needs more or less', () => {
  const base = { viewport: 800, line: 340, tail: 120 };

  assert.ok(roomAtEnd({ ...base, viewport: 900 }) > roomAtEnd(base), 'a taller screen (rotated, toolbars gone)');
  assert.ok(roomAtEnd({ ...base, line: 400 }) < roomAtEnd(base), 'a map that ends lower leaves less below the line');
});

test('room is never negative', () => {
  assert.equal(roomAtEnd({ viewport: 300, line: 340, tail: 50 }), 0, 'the line is below the screen: nothing to do');
});
