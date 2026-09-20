// Перевіряє шов, на якому імена М'язів перестрибують з виноски на атлас.
// Фікстури, а не справжній атлас: справжні експорти важать 112 МБ і в
// репозиторії їх немає. Сам атлас перевіряє tools/atlas-ids.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { figureBoxes, matchingPaths } from './build-atlas.mjs';

const path = (x, y, w, h) => `<path d="M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}Z"/>`;

test('рамки зсунуті до нуля, тож полотно не має значення', () => {
  const here = figureBoxes([path(100, 100, 10, 20), path(150, 300, 5, 5)]);
  const there = figureBoxes([path(9100, 27100, 10, 20), path(9150, 27300, 5, 5)]);

  assert.deepEqual(here, there);
  assert.deepEqual(here[0], [0, 0, 10, 20]);
});

test('порядок шляхів не той самий — зіставляє геометрія, не індекс', () => {
  // Саме цей випадок ламав атлас: литка стояла в атласі 73-ю, у виносці 79-ю.
  const figure = figureBoxes([path(0, 0, 40, 40), path(0, 500, 20, 90), path(0, 200, 30, 60)]);
  const callout = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60), path(0, 500, 20, 90)]);

  assert.deepEqual(matchingPaths(figure, callout[2]), [1]); // литка, а не третій шлях
  assert.deepEqual(matchingPaths(figure, callout[1]), [2]);
});

test('розходження в соті частки одиниці — той самий шлях', () => {
  const figure = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30.02, 60.05)]);
  const callout = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60)]);

  assert.deepEqual(matchingPaths(figure, callout[1]), [1]);
});

test('шляху немає у фігурі — порожньо, а не найближчий-абищо', () => {
  const figure = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60)]);
  const callout = figureBoxes([path(0, 0, 40, 40), path(0, 800, 30, 60)]);

  assert.deepEqual(matchingPaths(figure, callout[1]), []);
});

test('шляхи один на одному дістають ім\'я обидва', () => {
  const figure = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60), path(0, 200, 30, 60)]);
  const callout = figureBoxes([path(0, 0, 40, 40), path(0, 200, 30, 60)]);

  assert.deepEqual(matchingPaths(figure, callout[1]), [1, 2]);
});
