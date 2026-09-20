// З UI тестується рівно одне — геометрія зон тапу. Решта (DOM, підсвічування,
// перемикання виду) перевіряється очима за хвилину, як вирішено в spec.md.
//
// Ця частина очима не перевіряється: тікет 02 заміряв, що 30 М'язів із 40
// вужчі за палець, і чи справді зона виросла до 44 px — на екрані не видно.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { expand, union } from './ui.mjs';

test('вузький М\'яз розширюється до мінімуму, лишаючись на місці', () => {
  const box = expand({ x: 100, y: 50, width: 7, height: 60 }, 44);

  assert.equal(box.width, 44);
  assert.equal(box.height, 60, 'бік, який і так більший за мінімум, не чіпаємо');
  assert.equal(box.x + box.width / 2, 103.5, 'центр М\'яза не зсунувся');
  assert.equal(box.y, 50);
});

test('М\'яз, у який палець і так влучає, лишається як є', () => {
  const box = { x: 0, y: 0, width: 62, height: 90 };

  assert.deepEqual(expand(box, 44), box);
});

test('рамка М\'яза — об\'єднання рамок усіх його шляхів', () => {
  const box = union([
    { x: 10, y: 10, width: 10, height: 10 },
    { x: 30, y: 5, width: 10, height: 10 },
  ]);

  assert.deepEqual(box, { x: 10, y: 5, width: 30, height: 15 });
});
