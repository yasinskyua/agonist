// The address is the screen, so a link sent to another Trainer and a link from
// an older version must keep opening what they meant to. The routes are tested
// on the real content: an id that exists is an id in `content/`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas } from './atlas.mjs';
import { parseRoute, muscleHref, exerciseHref, HOME, GAME } from './route.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const atlas = createAtlas({
  muscles: read('content/muscles.json').muscles,
  groups: read('content/muscle-groups.json').groups,
  exercises: read('content/exercises.json').exercises,
  atlasMuscles: read('assets/atlas/muscle-ids.json').muscles,
});

const muscle = atlas.muscles()[0].id;
const exercise = atlas.exercises()[0].id;

test('a Muscle and an Exercise open from the address they made', () => {
  assert.deepEqual(parseRoute(muscleHref(muscle), atlas), { screen: 'muscle', id: muscle });
  assert.deepEqual(parseRoute(exerciseHref(exercise), atlas), { screen: 'exercise', id: exercise });
});

test('the old links still open the screens they meant', () => {
  assert.deepEqual(parseRoute('#/muscle/' + muscle, atlas), { screen: 'muscle', id: muscle });
  assert.deepEqual(parseRoute('#/exercise/' + exercise, atlas), { screen: 'exercise', id: exercise });
  // The map used to be one side at a time; now the map is the home screen.
  assert.deepEqual(parseRoute('#/front', atlas), { screen: 'home' });
  assert.deepEqual(parseRoute('#/back', atlas), { screen: 'home' });
  // From the days of the sheet: a Muscle chosen on one side of the map.
  assert.deepEqual(parseRoute(`#/front/${muscle}`, atlas), { screen: 'muscle', id: muscle });
  assert.deepEqual(parseRoute(`#/back/${muscle}`, atlas), { screen: 'muscle', id: muscle });
});

test('no address, the home address and the game address', () => {
  assert.deepEqual(parseRoute('', atlas), { screen: 'home' });
  assert.deepEqual(parseRoute(HOME, atlas), { screen: 'home' });
  assert.deepEqual(parseRoute(GAME, atlas), { screen: 'game' });
});

test('an id that is not in the content shows home instead of throwing', () => {
  assert.deepEqual(parseRoute('#/muscle/no_such_muscle', atlas), { screen: 'home' });
  assert.deepEqual(parseRoute('#/exercise/no_such_exercise', atlas), { screen: 'home' });
  assert.deepEqual(parseRoute('#/muscle', atlas), { screen: 'home' });
  // Every object has a «constructor»; it is not a Muscle.
  assert.deepEqual(parseRoute('#/muscle/constructor', atlas), { screen: 'home' });
});
