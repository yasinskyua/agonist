// What each screen says, checked on the real content through the markup it
// produces. The parts a finger cannot check: which Muscles the index lists, that
// the search finds both languages and Latin, that a row carries its Role.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAtlas, ROLES } from './atlas.mjs';
import { createExam } from './exam.mjs';
import { translator } from './i18n.mjs';
import { createQuiz, createExamQuiz, createExamTestQuiz } from './quiz.mjs';
import {
  welcomeHtml,
  indexHtml,
  searchHtml,
  pageTopHtml,
  screenName,
  navStart,
  pageListHtml,
  paintRules,
  litRules,
  pageLights,
  openingSide,
  cardTopHtml,
  cardListHtml,
  cardAnnounce,
  roundTally,
  summaryHtml,
  examDigestHtml,
  examCardsPickerHtml,
  examCardTopHtml,
  examCardListHtml,
  examCardAnnounce,
  examSummaryHtml,
  examTestPickerHtml,
  examTestTopHtml,
  examDigestTopHtml,
  examTestAnnounce,
} from './screens.mjs';

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

// ── Welcome ──────────────────────────────────────────────────────────────

test('the welcome names the app, says what it is, and offers three doors to the right address, in order', () => {
  const html = welcomeHtml(t);
  assert.ok(html.includes(`>${t('app.title')}<`));
  assert.ok(html.includes(t('welcome.about')));
  // In document order: Довідник, Гра, Іспит, then «Почати» — each door's own
  // href, not just that the three addresses appear somewhere in the markup.
  assert.deepEqual(hrefs(html), ['#/', '#/game', '#/exam', '#/']);
  for (const tab of ['reference', 'game', 'exam']) {
    assert.ok(html.includes(t(`tabs.${tab}`)), tab);
    assert.ok(html.includes(t(`welcome.${tab}`)), tab);
  }
  assert.ok(html.includes(`>${t('welcome.start')}<`));
});

test('the welcome is drawn in whichever language it is asked for', () => {
  const html = welcomeHtml(tEn);
  assert.ok(html.includes(tEn('welcome.about')));
  assert.ok(html.includes(tEn('tabs.game')));
  assert.ok(!html.includes(t('welcome.about')));
});

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

test('an empty search suggests the first letters of what was typed (ticket 06)', () => {
  const html = searchHtml(t, 'uk', atlas, 'Фіолетовий слон');

  assert.ok(html.includes('Спробуйте коротше: «Фіол»'));
  assert.ok(!searchHtml(t, 'uk', atlas, '<b>zzzzqqq').includes('<b>'), 'typed markup is escaped');
  assert.ok(!searchHtml(t, 'uk', atlas, 'zzz').includes(t('search.shorter').slice(0, 8)), 'a short word has nothing to shorten');
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

test('a Muscle page has a legend of the Roles it actually plays, each with its own sentence', () => {
  const top = pageTopHtml(t, 'uk', atlas, { screen: 'muscle', id: 'pectoralis_major' });
  const roles = new Set(atlas.muscleExercises('pectoralis_major').map((x) => x.role));

  for (const role of ROLES) {
    assert.equal(top.includes(`<li data-role="${role}">`), roles.has(role), role);
    assert.equal(top.includes(t(`role.${role}.sentence`)), roles.has(role), role);
  }
});

test('a Muscle with no Exercises has no legend at all', () => {
  const top = pageTopHtml(t, 'uk', atlas, { screen: 'muscle', id: 'supinators' });

  assert.ok(!top.includes('class="legend"'));
});

test('a Muscle without a Latin name has no empty line for it', () => {
  const bare = atlas.muscles().find((m) => !m.la);
  const top = pageTopHtml(t, 'uk', atlas, { screen: 'muscle', id: bare.id });

  assert.ok(!top.includes('class="sub"'));
});

// ── The top bar's «‹ <name>» (ADR-0009, ticket 02) ─────────────────────────

test('screenName names a Muscle in Ukrainian and an Exercise in the interface language', () => {
  assert.equal(screenName(t, 'uk', atlas, { screen: 'muscle', id: 'pectoralis_major' }), atlas.muscle('pectoralis_major').uk);
  assert.equal(screenName(t, 'uk', atlas, ROLL), atlas.exercise(ROLL.id).uk);
  assert.equal(screenName(tEn, 'en', atlas, ROLL), atlas.exercise(ROLL.id).en);
});

test('screenName names the Digest, the Game and the Exam Formats by their own tab or picker word', () => {
  assert.equal(screenName(t, 'uk', atlas, { screen: 'exam' }), t('tabs.exam'));
  assert.equal(screenName(t, 'uk', atlas, { screen: 'game' }), t('tabs.game'));
  assert.equal(screenName(t, 'uk', atlas, { screen: 'examCards' }), t('exam.cards'));
  assert.equal(screenName(t, 'uk', atlas, { screen: 'examTest' }), t('exam.test'));
});

test('screenName names home «Agonist», the same in both languages', () => {
  assert.equal(screenName(t, 'uk', atlas, { screen: 'home' }), 'Agonist');
  assert.equal(screenName(tEn, 'en', atlas, { screen: 'home' }), 'Agonist');
});

test('navStart on home: the app\'s own name, no back', () => {
  const nav = navStart(t, 'uk', atlas, { screen: 'home' }, undefined);
  assert.equal(nav.text, 'Agonist');
  assert.equal(nav.act, 'home');
  assert.ok(!nav.hidden && !nav.html);
});

test('navStart on the Digest: hidden — no Back, no brand', () => {
  assert.equal(navStart(t, 'uk', atlas, { screen: 'exam' }, undefined).hidden, true);
});

test('navStart in a Партія (Game, Cards, Test): «Закрити», not Back', () => {
  for (const screen of ['game', 'examCards', 'examTest']) {
    const nav = navStart(t, 'uk', atlas, { screen }, { screen: 'home' });
    assert.equal(nav.text, t('close'));
    assert.equal(nav.act, 'home');
  }
});

test('navStart on a Muscle or Exercise page: «‹ <name we came from>», read together for a screen reader', () => {
  const from = { screen: 'muscle', id: 'pectoralis_major' };
  const nav = navStart(t, 'uk', atlas, { screen: 'exercise', id: 'ab-wheel-rollout' }, from);
  const name = atlas.muscle('pectoralis_major').uk;

  assert.ok(nav.html.includes(name));
  assert.equal(nav.ariaLabel, `${t('back')}: ${name}`);
  assert.equal(nav.act, 'back');
});

test('navStart with no screen to come from (a link opened cold): «Довідник», to home', () => {
  const nav = navStart(t, 'uk', atlas, { screen: 'muscle', id: 'pectoralis_major' }, undefined);

  assert.ok(nav.html.includes(t('tabs.reference')));
  assert.equal(nav.act, 'back');
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

test('each Role in the legend is a native disclosure holding its own sentence, and only the shown Roles appear', () => {
  const top = pageTopHtml(t, 'uk', atlas, ROLL);
  const roles = new Set(atlas.exerciseMuscles(ROLL.id).map((x) => x.role));

  for (const role of ROLES) {
    const shown = top.includes(`<li data-role="${role}"><details><summary>`);
    assert.equal(shown, roles.has(role), role);
    assert.equal(top.includes(t(`role.${role}.sentence`)), roles.has(role), role);
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

// ── Chevrons: a row that opens a page says so (ticket 09) ────────────────

test('a row that opens a Muscle or Exercise page ends in a chevron the screen reader skips; rows that open none do not', () => {
  const pages = [
    indexHtml(t, 'uk', atlas),
    searchHtml(t, 'uk', atlas, 'жим'),
    pageListHtml(t, 'uk', atlas, { screen: 'muscle', id: 'pectoralis_major' }),
    pageListHtml(t, 'uk', atlas, ROLL),
  ];
  const linkRows = pages.flatMap((html) => html.match(/<a class="row"[^>]*href="#\/(?:muscle|exercise)\/[^]*?<\/a>/g) ?? []);
  assert.ok(linkRows.length > 20);
  for (const r of linkRows) assert.match(r, /<svg class="i chev" [^>]*aria-hidden="true"[^>]*>[^]*<\/svg><\/a>$/);

  const notPages = [welcomeHtml(t), examDigestHtml(t, 'uk', atlas, exam), examCardsPickerHtml(t, exam), examTestPickerHtml(t, exam)];
  for (const html of notPages) assert.doesNotMatch(html, /class="i chev"/);
});

// ── What a row lights while it is being read ─────────────────────────────

test('every row says what it lights: a Muscle row its Muscle, an Exercise row its Exercise', () => {
  const index = pageListHtml(t, 'uk', atlas, { screen: 'home' });
  const onMuscle = pageListHtml(t, 'uk', atlas, { screen: 'muscle', id: 'pectoralis_major' });

  assert.match(index, /<a class="row" href="#\/muscle\/rhomboids" data-muscle="rhomboids"/);
  for (const { exercise } of atlas.muscleExercises('pectoralis_major')) {
    assert.match(onMuscle, new RegExp(`href="#/exercise/${exercise.id}"[^>]* data-exercise="${exercise.id}"`));
  }
});

test('a row of an Exercise page lights its Muscle in the Role it plays there', () => {
  const list = pageListHtml(t, 'uk', atlas, ROLL);

  for (const { muscle, role } of atlas.exerciseMuscles(ROLL.id)) {
    assert.match(list, new RegExp(`data-muscle="${muscle.id}" data-role="${role}"`));
  }
});

test('the rest of the map goes grey, and a Muscle row lights its Muscle over it', () => {
  const rules = litRules(atlas, { muscle: 'rhomboids' }).split('\n');

  assert.match(rules[0], /data-muscle\]\[fill\]/);
  assert.match(rules[0], /var\(--c-rest\)/);
  assert.equal(rules.length, 2, 'the grey, then the one Muscle');
  assert.match(rules[1], /data-muscle~="rhomboids"/);
  assert.match(rules[1], /var\(--r-agonist\)/, 'no Role given: the Muscle is what the page is about');
});

test('a Muscle row with a Role lights in the colour of that Role', () => {
  assert.match(litRules(atlas, { muscle: 'rhomboids', role: 'synergist' }), /var\(--r-synergist\)/);
});

test("an Exercise row lights its whole Role Distribution, as its own page would", () => {
  const rules = litRules(atlas, { exercise: ROLL.id }).split('\n');

  assert.match(rules[0], /var\(--c-rest\)/);
  assert.deepEqual(rules.slice(1), paintRules(atlas, ROLL).split('\n'));
});

// ── The full-screen map opens on the side that has something lit ────────

test('a Muscle opens the map on the side it is drawn on', () => {
  assert.equal(openingSide(atlas, { muscle: 'rhomboids' }), 'back');
  assert.equal(openingSide(atlas, { muscle: 'pectoralis_major' }), 'front');
});

test('a Muscle drawn on both sides opens on the first of them', () => {
  assert.deepEqual(atlas.muscle('soleus').views, ['front', 'back']);
  assert.equal(openingSide(atlas, { muscle: 'soleus' }), 'front');
});

test("an Exercise opens the map on its Agonist's side", () => {
  assert.equal(openingSide(atlas, { exercise: 'cable-glute-kickback' }), 'back');
  for (const { id } of atlas.exercises()) {
    const [agonist] = atlas.exerciseMuscles(id);
    assert.equal(openingSide(atlas, { exercise: id }), agonist.muscle.views[0], id);
  }
});

test('a page lights what it is about, and home and the Game light nothing', () => {
  assert.deepEqual(pageLights({ screen: 'muscle', id: 'rhomboids' }), { muscle: 'rhomboids' });
  assert.deepEqual(pageLights(ROLL), { exercise: ROLL.id });
  assert.equal(pageLights({ screen: 'home' }), null);
  assert.equal(pageLights({ screen: 'game' }), null);
});

// ── The Game: a Round of Cards ──────────────────────────────────────────

const quiz = () => createQuiz({ atlas });

test('a Card before reveal shows the Exercise and the way to reveal it, and nothing more', () => {
  const round = quiz().round();
  const top = cardTopHtml(t, 'uk', atlas, round);
  const e = atlas.exercise(round.current.exercise);

  assert.ok(top.includes(e.uk));
  assert.ok(top.includes(t('card.reveal')));
  assert.ok(!top.includes(t('card.yes')) && !top.includes(t('card.no')));
  assert.equal(cardListHtml(t, 'uk', atlas, round), '');
});

test('a Card before reveal offers «Хто такий Агоніст?» as a native disclosure holding the Agonist\'s sentence', () => {
  const round = quiz().round();
  const top = cardTopHtml(t, 'uk', atlas, round);

  assert.ok(top.includes('<details class="who"><summary>' + t('card.agonist.question')));
  assert.ok(top.includes(t('role.agonist.sentence')));
});

test('revealing a Card shows the Agonist, both grades, and the whole Role Distribution', () => {
  const round = quiz().round();
  round.reveal();

  const top = cardTopHtml(t, 'uk', atlas, round);
  assert.ok(top.includes(atlas.muscle(round.current.answer).uk));
  assert.ok(top.includes(t('card.yes')) && top.includes(t('card.no')));

  const list = cardListHtml(t, 'uk', atlas, round);
  for (const { muscle, role } of atlas.exerciseMuscles(round.current.exercise)) {
    assert.ok(list.includes(muscle.uk));
    assert.ok(list.includes(`data-role="${role}"`));
  }
});

test('a revealed Card has a legend of its own Role Distribution, each Role a tap away from its sentence', () => {
  const round = quiz().round();
  round.reveal();
  const top = cardTopHtml(t, 'uk', atlas, round);
  const roles = new Set(atlas.exerciseMuscles(round.current.exercise).map((x) => x.role));

  for (const role of ROLES) {
    assert.equal(top.includes(`<li data-role="${role}">`), roles.has(role), role);
    assert.equal(top.includes(t(`role.${role}.sentence`)), roles.has(role), role);
  }
});

test('a revealed Card is announced by its Agonist, for a screen reader', () => {
  const round = quiz().round();
  round.reveal();
  assert.ok(cardAnnounce(t, atlas, round).includes(atlas.muscle(round.current.answer).uk));
});

test('the tally names the Card in play, out of ten, and the score so far — spelled out in words', () => {
  const round = quiz().round();
  assert.ok(roundTally(t, round).startsWith('1 з 10'));

  round.reveal();
  round.grade(true);
  const tally = roundTally(t, round);
  assert.ok(tally.startsWith('2 з 10'));
  assert.ok(tally.endsWith('1'));
});

test('the summary gives the score and links every «Не знав» Card to its Exercise', () => {
  const round = quiz().round();
  for (let i = 0; i < 10; i++) {
    round.reveal();
    round.grade(i % 3 !== 0);
  }
  const { score, total, mistakes } = round.summary();
  const html = summaryHtml(t, 'uk', atlas, round);

  assert.ok(html.includes(`>${score}</b>`));
  assert.ok(html.includes(`/${total}`));
  for (const m of mistakes) {
    assert.ok(hrefs(html).includes(`#/exercise/${m.exercise}`));
    assert.ok(html.includes(atlas.muscle(m.answer).uk));
  }
});

test('a perfect Round is praised, and has nothing to review', () => {
  const round = quiz().round();
  for (let i = 0; i < 10; i++) {
    round.reveal();
    round.grade(true);
  }
  const html = summaryHtml(t, 'uk', atlas, round);

  assert.ok(html.includes(t('round.perfect')));
  assert.ok(!html.includes(t('round.review')));
});

// ── The Exam: the Digest ──────────────────────────────────────────────────

const exam = createExam({ questions: read('content/exam.json').questions, atlas });

test('the Digest shows every Question with its answer already open — this is the costliest mistake it could make', () => {
  const html = examDigestHtml(t, 'uk', atlas, exam);

  for (const q of exam.questions()) {
    assert.ok(html.includes(q.question), q.id);
    assert.ok(html.includes(q.answer), q.id);
    assert.ok(html.includes(q.explanation), q.id);
  }
});

test('the Digest groups Questions under their Topic, in the set order', () => {
  const html = examDigestHtml(t, 'uk', atlas, exam);
  const topics = exam.topics();

  for (const topic of topics) assert.ok(html.includes(`>${topic.uk}</h2>`));
  const positions = topics.map((topic) => html.indexOf(`>${topic.uk}</h2>`));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test('the «не з матеріалів клубу» badge appears only for a Question sourced outside the club', () => {
  const outside = { ...exam.question('17'), source: 'outside' };
  const club = { ...exam.question('18'), source: 'club' };
  const fromContent = createExam({ questions: { outside, club }, atlas });
  const html = examDigestHtml(t, 'uk', atlas, fromContent);

  const [outsideHtml, clubHtml] = html.split(club.question);
  assert.ok(outsideHtml.includes(t('exam.outside')));
  assert.ok(!clubHtml.includes(t('exam.outside')));
});

test('a divergence note shows only where the content carries one', () => {
  const noted = { ...exam.question('17'), caveat: 'Клуб каже одне, підручник — інше.' };
  const bare = { ...exam.question('18') };
  const fromContent = createExam({ questions: { noted, bare }, atlas });
  const html = examDigestHtml(t, 'uk', atlas, fromContent);

  assert.ok(html.includes(noted.caveat));
  const [notedHtml, bareHtml] = html.split(bare.question);
  assert.ok(!bareHtml.includes('exam-caveat'));
  assert.ok(notedHtml.includes('exam-caveat'));
});

test('a Question linked to an Exercise opens it, named in the interface language', () => {
  const exerciseId = atlas.exercises()[0].id;
  const linked = { ...exam.question('17'), exercise: exerciseId };
  const fromContent = createExam({ questions: { linked }, atlas });

  const uk = examDigestHtml(t, 'uk', atlas, fromContent);
  assert.ok(hrefs(uk).includes(`#/exercise/${exerciseId}`));
  assert.ok(uk.includes(atlas.exercise(exerciseId).uk));

  const en = examDigestHtml(tEn, 'en', atlas, fromContent);
  assert.ok(en.includes(atlas.exercise(exerciseId).en));
});

test('every Question in the Digest is a target a summary link can scroll to', () => {
  const html = examDigestHtml(t, 'uk', atlas, exam);
  for (const q of exam.questions()) assert.ok(html.includes(`id="q-${q.id}"`), q.id);
});

test('the Digest nav (ticket 09) lists every Topic with its Question count, before any Topic section', () => {
  const html = examDigestHtml(t, 'uk', atlas, exam);
  const topics = exam.topics();
  const firstSection = html.indexOf('<section');

  for (const topic of topics) {
    assert.ok(html.includes(`data-act="exam-goto" data-topic="${topic.id}"`), topic.id);
    assert.ok(html.includes(`>${exam.questions({ topic: topic.id }).length}<`), topic.id);
    const navPosition = html.indexOf(`data-topic="${topic.id}"`);
    assert.ok(navPosition < firstSection, topic.id);
  }
});

test('the Digest nav (ticket 09): each Topic button scrolls to that Topic\'s own section', () => {
  const html = examDigestHtml(t, 'uk', atlas, exam);
  for (const topic of exam.topics()) {
    assert.ok(html.includes(`data-topic="${topic.id}"`), topic.id);
    assert.ok(html.includes(`id="topic-${topic.id}"`), topic.id);
  }
});

// ── The Exam: Cards (ADR-0008) ────────────────────────────────────────────

const examQuiz = () => createExamQuiz({ exam });

test('the length picker offers ten, every Topic, and all of them — the count never hardcoded', () => {
  const html = examCardsPickerHtml(t, exam);
  assert.ok(html.includes(t('exam.cards.ten')));
  assert.ok(html.includes(String(exam.questions().length)));
  for (const topic of exam.topics()) {
    assert.ok(html.includes(topic.uk));
    assert.ok(html.includes(`>${exam.questions({ topic: topic.id }).length}<`), topic.id);
  }
});

test('«Повторити слабкі» (ticket 08): with none weak, the picker says there is nothing to repeat', () => {
  const html = examCardsPickerHtml(t, exam, 0);
  assert.ok(html.includes(t('exam.weak.empty')));
  assert.ok(!html.includes('data-weak'));
});

test('«Повторити слабкі»: with some weak, the button names the count and starts a weak Round', () => {
  const html = examCardsPickerHtml(t, exam, 4);
  assert.ok(html.includes(t('exam.weak.repeat').replace('{n}', 4)));
  assert.ok(html.includes('data-act="exam-round"') && html.includes('data-weak="1"'));
});

test('a Card before reveal shows the Question and the way to reveal it, and nothing more — the costliest mistake this Format could make', () => {
  const round = examQuiz().round({ length: 10 });
  const top = examCardTopHtml(t, round);

  assert.ok(top.includes(round.current.question));
  assert.ok(top.includes(t('card.reveal')));
  assert.ok(!top.includes(round.current.answer));
  assert.ok(!top.includes(round.current.explanation));
  assert.ok(!top.includes(t('card.yes')) && !top.includes(t('card.no')));
  assert.equal(examCardListHtml(t, 'uk', atlas, round), '');
});

test('revealing a Card shows the answer, the explanation and both grades', () => {
  const round = examQuiz().round({ length: 10 });
  round.reveal();
  const top = examCardTopHtml(t, round);

  assert.ok(top.includes(round.current.answer));
  assert.ok(top.includes(round.current.explanation));
  assert.ok(top.includes(t('card.yes')) && top.includes(t('card.no')));
});

test('the «не з матеріалів клубу» badge appears on a revealed Card only when the Question is sourced outside the club', () => {
  const outside = { ...exam.question('17'), source: 'outside' };
  const club = { ...exam.question('18'), source: 'club' };
  const fromExam = createExam({ questions: { outside, club }, atlas });
  const round = createExamQuiz({ exam: fromExam, random: () => 0 }).round();

  round.reveal();
  const top = examCardTopHtml(t, round);
  assert.equal(top.includes(t('exam.outside')), round.current.source === 'outside');
});

test('a revealed Card is announced by its answer, for a screen reader', () => {
  const round = examQuiz().round({ length: 10 });
  round.reveal();
  assert.ok(examCardAnnounce(t, round).includes(round.current.answer));
});

test('a Card that names an Exercise links to it, once revealed', () => {
  const exerciseId = atlas.exercises()[0].id;
  const linked = { ...exam.question('17'), exercise: exerciseId };
  const round = createExamQuiz({ exam: createExam({ questions: { linked }, atlas }), random: () => 0 }).round();

  assert.equal(examCardListHtml(t, 'uk', atlas, round), '');
  round.reveal();
  assert.ok(hrefs(examCardListHtml(t, 'uk', atlas, round)).includes(`#/exercise/${exerciseId}`));
});

test('the summary gives the score and links every «Не знав» Question into the Digest', () => {
  const round = examQuiz().round({ length: 10 });
  for (let i = 0; i < 10; i++) {
    round.reveal();
    round.grade(i % 3 !== 0);
  }
  const { score, total, mistakes } = round.summary();
  const html = examSummaryHtml(t, round);

  assert.ok(html.includes(`>${score}</b>`));
  assert.ok(html.includes(`/${total}`));
  assert.ok(hrefs(html).includes('#/exam'));
  for (const m of mistakes) {
    assert.ok(hrefs(html).includes(`#/exam/q/${m.id}`));
    assert.ok(html.includes(m.question));
  }
});

test('a perfect Exam Round is praised, and has nothing to review', () => {
  const round = examQuiz().round({ length: 10 });
  for (let i = 0; i < 10; i++) {
    round.reveal();
    round.grade(true);
  }
  const html = examSummaryHtml(t, round);

  assert.ok(html.includes(t('round.perfect')));
  assert.ok(!html.includes(t('round.review')));
});

// ── The Exam: Test (ADR-0008, ticket 07) ─────────────────────────────────

const examTestQuiz = () => createExamTestQuiz({ exam });

test('the Test length picker offers ten, every Topic, and all of them — over the testable Questions, the count never hardcoded', () => {
  const html = examTestPickerHtml(t, exam);
  assert.ok(html.includes(t('exam.cards.ten')));
  assert.ok(html.includes(String(exam.testable().length)));
  for (const topic of exam.topics()) {
    assert.ok(html.includes(topic.uk));
    assert.ok(html.includes(`>${exam.testable().filter((q) => q.topic === topic.id).length}<`), topic.id);
  }
});

test('«Повторити слабкі» on the Test picker: same rule as Cards — a count, or nothing to repeat', () => {
  assert.ok(examTestPickerHtml(t, exam, 0).includes(t('exam.weak.empty')));
  const html = examTestPickerHtml(t, exam, 3);
  assert.ok(html.includes(t('exam.weak.repeat').replace('{n}', 3)));
  assert.ok(html.includes('data-act="exam-test-round"') && html.includes('data-weak="1"'));
});

test('a Question before a choice shows the four options and nothing more — no answer marked, no explanation, no Далі', () => {
  const round = examTestQuiz().round({ length: 10 });
  const top = examTestTopHtml(t, round);

  assert.ok(top.includes(round.current.question));
  for (const option of round.current.options) assert.ok(top.includes(option));
  assert.ok(!top.includes(round.current.explanation));
  assert.ok(!top.includes(t('exam.test.next')));
  assert.ok(!top.includes(t('exam.test.correct')) && !top.includes(t('exam.test.wrong')));
  assert.ok(!top.includes(t('card.yes')) && !top.includes(t('card.no')), 'the Test Format has no self-grade');
});

test('choosing the correct option shows it marked correct, the explanation and Далі — never self-grade buttons', () => {
  const round = examTestQuiz().round({ length: 10 });
  round.choose(round.current.options.indexOf(round.current.answer));
  const top = examTestTopHtml(t, round);

  assert.ok(top.includes(round.current.explanation));
  assert.ok(top.includes(t('exam.test.next')));
  assert.ok(top.includes(t('exam.test.correct')));
  assert.ok(!top.includes(t('card.yes')) && !top.includes(t('card.no')));
});

test('a wrong pick is marked wrong, alongside the correct one marked correct', () => {
  const round = examTestQuiz().round({ length: 10 });
  const wrongIndex = round.current.options.findIndex((o) => o !== round.current.answer);
  round.choose(wrongIndex);
  const top = examTestTopHtml(t, round);

  assert.ok(top.includes(t('exam.test.correct')));
  assert.ok(top.includes(t('exam.test.wrong')));
});

test('the «не з матеріалів клубу» badge appears on a revealed Question only when it is sourced outside the club', () => {
  const outside = { ...exam.question('17'), source: 'outside' };
  const club = { ...exam.question('18'), source: 'club' };
  const fromExam = createExam({ questions: { outside, club }, atlas });
  const round = createExamTestQuiz({ exam: fromExam, random: () => 0 }).round();

  round.choose(0);
  const top = examTestTopHtml(t, round);
  assert.equal(top.includes(t('exam.outside')), round.current.source === 'outside');
});

test('a choice is announced by whether it was correct, and the answer, for a screen reader', () => {
  const round = examTestQuiz().round({ length: 10 });
  round.choose(round.current.options.indexOf(round.current.answer));
  assert.ok(examTestAnnounce(t, round).includes(t('exam.test.correct')));
  assert.ok(examTestAnnounce(t, round).includes(round.current.answer));
});

test('a wrong choice is announced as wrong', () => {
  const round = examTestQuiz().round({ length: 10 });
  const wrongIndex = round.current.options.findIndex((o) => o !== round.current.answer);
  round.choose(wrongIndex);
  assert.ok(examTestAnnounce(t, round).includes(t('exam.test.wrong')));
});

test('the summary reused from Cards works the same over a Test Round, and links the mistakes into the Digest', () => {
  const round = examTestQuiz().round({ length: 10 });
  for (let i = 0; i < 10; i++) {
    round.choose(i % 4);
    round.grade(round.current.options[round.choice] === round.current.answer);
  }
  const { score, total, mistakes } = round.summary();
  const html = examSummaryHtml(t, round);

  assert.ok(html.includes(`>${score}</b>`));
  assert.ok(html.includes(`/${total}`));
  for (const m of mistakes) assert.ok(hrefs(html).includes(`#/exam/q/${m.id}`));
});

// ── Ticket 10: the Exam's tap targets look like buttons ──────────────────

test('every Test option is a bordered button before a choice (ticket 10)', () => {
  const round = examTestQuiz().round({ length: 10 });
  const top = examTestTopHtml(t, round);
  const buttons = top.match(/<button class="row option"[^>]*data-act="exam-test-choose"/g) ?? [];
  assert.equal(buttons.length, round.current.options.length);
});

test('after a choice the options are no longer buttons, but keep their correct/wrong marks (ticket 10)', () => {
  const round = examTestQuiz().round({ length: 10 });
  round.choose(round.current.options.findIndex((o) => o !== round.current.answer));
  const top = examTestTopHtml(t, round);
  assert.ok(!top.includes('exam-test-choose'));
  assert.ok(top.includes('data-state="correct"') && top.includes('data-state="wrong"'));
});

test('the Digest header offers Cards and Test as buttons, each with a line saying what it does (ticket 10)', () => {
  for (const [lang, tr] of [['uk', t], ['en', translator('en')]]) {
    const top = examDigestTopHtml(tr);
    assert.ok(top.includes(`class="main" href="#/exam/cards"`) && top.includes(tr('exam.cards')));
    assert.ok(top.includes(`class="main" href="#/exam/test"`) && top.includes(tr('exam.test')));
    assert.ok(top.includes(tr('exam.cards.does')) && top.includes(tr('exam.test.does')));
    assert.notEqual(tr('exam.cards.does'), 'exam.cards.does', `${lang}: label exists`);
  }
});
