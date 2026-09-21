// What each screen says, checked on the real content through the markup it
// produces. The parts a finger cannot check: which Muscles the index lists, that
// the search finds both languages and Latin, that a row carries its Role.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas, ROLES } from './atlas.mjs';
import { translator } from './i18n.mjs';
import { indexHtml, searchHtml, pageTopHtml, pageListHtml, paintRules } from './screens.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const atlas = createAtlas({
  muscles: read('content/muscles.json').muscles,
  groups: read('content/muscle-groups.json').groups,
  exercises: read('content/exercises.json').exercises,
  atlasMuscles: read('assets/atlas/muscle-ids.json').muscles,
});

const t = translator('uk');
const tEn = translator('en');
const hrefs = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
const withExercises = (id) => atlas.muscleExercises(id).length > 0;

// ── Home ─────────────────────────────────────────────────────────────────

test('the index lists every Muscle that has Exercises, and only those', () => {
  const listed = new Set(hrefs(indexHtml(t, 'uk', atlas)));

  for (const { id } of atlas.muscles()) {
    assert.equal(listed.has(`#/muscle/${id}`), withExercises(id), id);
  }
});

test('the index groups the Muscles and counts their Exercises', () => {
  const html = indexHtml(t, 'uk', atlas);
  const group = atlas.groups().find((g) => g.uk === 'Спина');

  assert.ok(html.includes(`>${group.uk}</h2>`), 'a Muscle Group is a heading');
  assert.ok(html.includes('вправ'), 'and every row says how many Exercises');
  // The count is right for one Muscle, spelled the way Ukrainian does.
  const n = atlas.muscleExercises('rhomboids').length;
  assert.ok(html.includes(`${n} вправ`) || html.includes(`${n} вправи`) || html.includes(`${n} вправа`));
});

test('the group name follows the interface language', () => {
  const group = atlas.groups()[0];
  assert.ok(indexHtml(tEn, 'en', atlas).includes(`>${group.en}</h2>`));
  assert.ok(!indexHtml(tEn, 'en', atlas).includes(`>${group.uk}</h2>`));
});

// ── Search ───────────────────────────────────────────────────────────────

test('search finds a Muscle by its Latin name, and shows it', () => {
  const html = searchHtml(t, 'uk', atlas, 'pectoralis major');

  assert.ok(hrefs(html).includes('#/muscle/pectoralis_major'));
  assert.ok(html.includes(atlas.muscle('pectoralis_major').la), 'the Latin is on the row, so the match is visible');
});

test('search finds an Exercise in either language and names it in the interface language', () => {
  const bench = atlas.exercises().find((e) => e.en.toLowerCase().includes('bench press'));
  const html = searchHtml(t, 'uk', atlas, 'bench press');

  assert.ok(hrefs(html).includes(`#/exercise/${bench.id}`));
  assert.ok(html.includes(bench.uk));

  const ukHtml = searchHtml(tEn, 'en', atlas, bench.uk.slice(0, 5));
  assert.ok(hrefs(ukHtml).includes(`#/exercise/${bench.id}`), 'Ukrainian typed in the English interface');
  assert.ok(ukHtml.includes(bench.en));
});

test('a Muscle Group in search opens into its Muscles', () => {
  const html = searchHtml(t, 'uk', atlas, 'спина');
  const group = atlas.search('спина').groups[0];

  assert.ok(html.includes(group.uk));
  for (const m of group.muscles) assert.ok(hrefs(html).includes(`#/muscle/${m.id}`), m.id);
});

test('search that finds nothing says so', () => {
  assert.ok(searchHtml(t, 'uk', atlas, 'zzzzqqq').includes(t('search.empty')));
});

// ── Muscle page ──────────────────────────────────────────────────────────

test('a Muscle page has the name, Latin and Function, and lists its Exercises with the Role', () => {
  const top = pageTopHtml(t, 'uk', atlas, { screen: 'muscle', id: 'pectoralis_major' });
  const list = pageListHtml(t, 'uk', atlas, { screen: 'muscle', id: 'pectoralis_major' });
  const m = atlas.muscle('pectoralis_major');

  assert.ok(top.includes(m.uk) && top.includes(m.la) && top.includes(m.action));
  for (const { exercise, role } of atlas.muscleExercises('pectoralis_major')) {
    assert.ok(list.includes(`data-role="${role}"`));
    assert.ok(hrefs(list).includes(`#/exercise/${exercise.id}`));
    assert.ok(list.includes(exercise.uk));
  }
});

test('on a Muscle page the Exercises come with the most central Role first', () => {
  const list = pageListHtml(t, 'uk', atlas, { screen: 'muscle', id: 'pectoralis_major' });
  const seen = [...list.matchAll(/data-role="(\w+)"/g)].map((m) => ROLES.indexOf(m[1]));

  assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
});

test('a Muscle with no Exercises says so instead of showing an empty list', () => {
  const list = pageListHtml(t, 'uk', atlas, { screen: 'muscle', id: 'supinators' });

  assert.ok(list.includes(t('muscle.none')));
  assert.deepEqual(hrefs(list), []);
});

test('a Muscle without a Latin name has no empty line for it', () => {
  const bare = atlas.muscles().find((m) => !m.la);
  const top = pageTopHtml(t, 'uk', atlas, { screen: 'muscle', id: bare.id });

  assert.ok(!top.includes('class="sub"'));
});

// ── Exercise page ────────────────────────────────────────────────────────

const ROLL = { screen: 'exercise', id: 'ab-wheel-rollout' };

test('an Exercise page names the Exercise in both languages, and the legend has the Roles it uses', () => {
  const top = pageTopHtml(t, 'uk', atlas, ROLL);
  const e = atlas.exercise(ROLL.id);
  const roles = new Set(atlas.exerciseMuscles(ROLL.id).map((x) => x.role));

  assert.ok(top.includes(e.uk) && top.includes(e.en));
  for (const role of ROLES) {
    assert.equal(top.includes(`<li data-role="${role}">`), roles.has(role), role);
  }
});

test('an Exercise page lists every Muscle with its Role and the Note that explains it', () => {
  const list = pageListHtml(t, 'uk', atlas, ROLL);
  const e = atlas.exercise(ROLL.id);

  for (const { muscle, role } of atlas.exerciseMuscles(ROLL.id)) {
    assert.ok(hrefs(list).includes(`#/muscle/${muscle.id}`));
    assert.ok(list.includes(`data-role="${role}"`));
  }
  assert.ok(list.includes(e.notes.rectus_abdominis));
});

test('Related Exercises share the Agonist and are listed under their own heading', () => {
  const list = pageListHtml(t, 'uk', atlas, ROLL);
  const related = atlas.relatedExercises(ROLL.id);

  assert.ok(related.length > 0, 'the chosen Exercise has some');
  assert.ok(list.includes(t('related.heading')));
  for (const e of related) assert.ok(hrefs(list).includes(`#/exercise/${e.id}`));
});

// ── The map's colours ────────────────────────────────────────────────────

test('home paints nothing', () => {
  assert.equal(paintRules(atlas, { screen: 'home' }), '');
});

test('a Muscle page paints its Muscle as the Agonist', () => {
  const css = paintRules(atlas, { screen: 'muscle', id: 'rhomboids' });

  assert.match(css, /data-muscle~="rhomboids"/);
  assert.match(css, /var\(--r-agonist\)/);
});

test("an Exercise page paints its whole Role Distribution, the Agonist last so it wins", () => {
  const css = paintRules(atlas, ROLL);
  const rules = css.split('\n');

  assert.equal(rules.length, atlas.exerciseMuscles(ROLL.id).length);
  assert.match(rules.at(-1), /var\(--r-agonist\)/);
  assert.match(rules[0], /var\(--r-stabilizer\)/, 'the lightest first');
});
