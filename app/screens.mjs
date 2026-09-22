// What each screen says, as markup: the top of a page (its name and what it
// is), the list under the map, and the colours the map takes. Pure functions
// from the atlas and the address — no DOM, no state — so they can be checked
// in Node on the real content and `ui.mjs` stays about events.
//
// Muscles are named in Ukrainian everywhere; Exercises in `lang`.

import { ROLES } from './atlas.mjs';
import { otherLang, exerciseCount } from './i18n.mjs';
import { icon } from './icons.mjs';
import { muscleHref, exerciseHref } from './route.mjs';

const latin = (m) => (m.la ? `<small class="sub" translate="no">${m.la}</small>` : '');

/**
 * One row of any list: a link to a page. The Role, where the row has one, is
 * on the link itself (`data-role`), so its colour comes from CSS. So is what the
 * row lights on the map while it is read (`lights`: `data-muscle` or
 * `data-exercise`; see `litRules`). The Note that explains the Role sits beside
 * the link, not in it: read as the link's name it would be a paragraph.
 */
function row({ href, lights, name, sub = '', aside = '', role = '', note = '' }) {
  return `<li><a class="row" href="${href}" ${lights}${role ? ` data-role="${role}"` : ''}>
    <span class="row-name"><b>${name}</b>${sub}</span>${aside ? `<small class="aside">${role ? '<i></i>' : ''}${aside}</small>` : ''}</a>${note ? `<p class="why">${note}</p>` : ''}</li>`;
}

const muscleRow = (t, lang, atlas, m, { sub = '', role = '', note = '' } = {}) => {
  const n = atlas.muscleExercises(m.id).length;
  return row({
    href: muscleHref(m.id),
    lights: `data-muscle="${m.id}"`,
    name: m.uk,
    sub,
    aside: role ? t(`role.${role}`) : n ? exerciseCount(lang, n) : '',
    role,
    note,
  });
};

const exerciseRow = (t, lang, e, { sub = '', aside = '', role = '' } = {}) =>
  row({ href: exerciseHref(e.id), lights: `data-exercise="${e.id}"`, name: e[lang], sub, aside: role ? t(`role.${role}`) : aside, role });

const section = (title, body) => `<section><h2 class="h">${title}</h2>${body}</section>`;
const list = (rows) => `<ul class="list">${rows.join('')}</ul>`;

// ── Home ─────────────────────────────────────────────────────────────────

/** Every Muscle that has Exercises, by Muscle Group, with how many. */
export function indexHtml(t, lang, atlas) {
  const caption = `<p class="caption">${t('map.hint')}. ${t('map.legend')}</p>`;
  return caption + atlas
    .groups()
    .map((g) => {
      const muscles = atlas.groupMuscles(g.id).filter((m) => atlas.muscleExercises(m.id).length);
      return muscles.length ? section(g[lang], list(muscles.map((m) => muscleRow(t, lang, atlas, m)))) : '';
    })
    .join('');
}

/** Groups, Muscles and Exercises matching what was typed; a row shows what matched. */
export function searchHtml(t, lang, atlas, query) {
  const found = atlas.search(query);
  if (!found.groups.length && !found.muscles.length && !found.exercises.length) {
    return `<p class="none">${t('search.empty')}</p>`;
  }
  const agonist = (e) => atlas.exerciseMuscles(e.id)[0].muscle.uk;
  const groups = found.groups.map(
    (g) => `<h3 class="group-name">${g[lang]}</h3>${list(g.muscles.map((m) => muscleRow(t, lang, atlas, m)))}`,
  );

  return [
    groups.length && section(t('search.groups'), groups.join('')),
    found.muscles.length &&
      section(t('search.muscles'), list(found.muscles.map((m) => muscleRow(t, lang, atlas, m, { sub: latin(m) })))),
    found.exercises.length &&
      section(
        t('search.exercises'),
        list(
          found.exercises.map((e) =>
            exerciseRow(t, lang, e, {
              sub: `<small class="sub" lang="${otherLang(lang)}">${e[otherLang(lang)]}</small>`,
              aside: agonist(e),
            }),
          ),
        ),
      ),
  ]
    .filter(Boolean)
    .join('');
}

// ── Pages ────────────────────────────────────────────────────────────────

function searchField(t) {
  return `
    <h1 class="sr" tabindex="-1">${t('app.title')}</h1>
    <div class="find">
      <input id="q" name="q" type="search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search"
        placeholder="${t('search.placeholder')}" aria-label="${t('search.label')}" />
      <button class="clear" type="button" data-act="clear" aria-label="${t('search.clear')}" hidden>${icon('close')}</button>
    </div>`;
}

/** The Roles an Exercise's Muscles play, most central first, each once. */
const rolesOf = (atlas, id) => {
  const used = new Set(atlas.exerciseMuscles(id).map((x) => x.role));
  return ROLES.filter((r) => used.has(r));
};

/** The page's own words above the map: its name and what it is. */
export function pageTopHtml(t, lang, atlas, here) {
  if (here.screen === 'muscle') {
    const m = atlas.muscle(here.id);
    return `<h1 tabindex="-1">${m.uk}</h1>${m.la ? `<p class="sub" translate="no">${m.la}</p>` : ''}<p class="lead">${m.action}</p>`;
  }
  if (here.screen === 'exercise') {
    const e = atlas.exercise(here.id);
    return `<h1 tabindex="-1">${e[lang]}</h1><p class="sub" lang="${otherLang(lang)}">${e[otherLang(lang)]}</p>
      <ul class="legend" aria-label="${t('exercise.legend')}">${rolesOf(atlas, here.id)
        .map((r) => `<li data-role="${r}"><i></i>${t(`role.${r}`)}</li>`)
        .join('')}</ul>`;
  }
  return searchField(t);
}

/** The list under the map. On home: the index, or what the search found. */
export function pageListHtml(t, lang, atlas, here, query = '') {
  if (here.screen === 'muscle') {
    const exercises = atlas.muscleExercises(here.id);
    return exercises.length
      ? list(exercises.map(({ exercise, role }) => exerciseRow(t, lang, exercise, { role })))
      : `<p class="none">${t('muscle.none')}</p>`;
  }
  if (here.screen === 'exercise') {
    const notes = atlas.exercise(here.id).notes ?? {};
    const related = atlas.relatedExercises(here.id);
    return (
      list(
        atlas
          .exerciseMuscles(here.id)
          .map(({ muscle, role }) => muscleRow(t, lang, atlas, muscle, { role, note: notes[muscle.id] })),
      ) +
      (related.length
        ? `<section class="related"><h2 class="h">${t('related.heading')}</h2><p class="says">${t('related.says')}</p>${list(
            related.map((e) => exerciseRow(t, lang, e)),
          )}</section>`
        : '')
    );
  }
  return query.trim() ? searchHtml(t, lang, atlas, query) : indexHtml(t, lang, atlas);
}

// ── The Game: a Round of Cards (ADR-0007) ───────────────────────────────

/**
 * A Card: the Exercise's name, and then either the way to reveal its Agonist
 * or, once revealed, the two grades. The Agonist's name is shown as words as
 * well as colour — the map is not the only way to read it.
 */
export function cardTopHtml(t, lang, atlas, round) {
  const { exercise, answer } = round.current;
  const action = round.revealed
    ? `<p class="lead"><b>${t('role.agonist')}:</b> ${atlas.muscle(answer).uk}</p>
       <div class="card-go">
         <button class="ghost" type="button" data-act="grade" data-knew="0">${t('card.no')}</button>
         <button class="main" type="button" data-act="grade" data-knew="1">${t('card.yes')}</button>
       </div>`
    : `<p class="lead">${t('card.hint')}</p>
       <button class="main" type="button" data-act="reveal">${t('card.reveal')}</button>`;
  return `<h1 tabindex="-1">${atlas.exercise(exercise)[lang]}</h1>${action}`;
}

/** Once revealed: the Exercise's whole Role Distribution, as the Exercise page lists it — without Related Exercises, so nothing invites leaving the Round. */
export function cardListHtml(t, lang, atlas, round) {
  if (!round.revealed) return '';
  const { exercise } = round.current;
  const notes = atlas.exercise(exercise).notes ?? {};
  return list(
    atlas
      .exerciseMuscles(exercise)
      .map(({ muscle, role }) => muscleRow(t, lang, atlas, muscle, { role, note: notes[muscle.id] })),
  );
}

/** What a screen reader is told once a Card is revealed: heard, not only seen in colour. */
export function cardAnnounce(t, atlas, round) {
  return `${t('role.agonist')}: ${atlas.muscle(round.current.answer).uk}.`;
}

/** The header's «N/10 · знав K», read off the Round in play. */
export function roundTally(t, round) {
  return `${round.index + 1}/${round.total} · ${t('round.known')} ${round.score}`;
}

/** The Round's end: the score, and the Exercises graded «Не знав», linked for a review. */
export function summaryHtml(t, lang, atlas, round) {
  const { score, total, mistakes } = round.summary();
  return `
    <h1 tabindex="-1">${t('round.done')}</h1>
    <p class="score"><span class="sr">${t('round.score')}: </span><b>${score}</b>/${total}</p>
    ${score === total ? `<p class="lead">${t('round.perfect')}</p>` : ''}
    <div class="card-go">
      <button class="ghost" type="button" data-act="home">${t('round.map')}</button>
      <button class="main" type="button" data-act="again">${t('round.again')}</button>
    </div>
    ${
      mistakes.length
        ? `<h2 class="h">${t('round.review')}</h2>${list(
            mistakes.map((m) =>
              exerciseRow(t, lang, atlas.exercise(m.exercise), {
                aside: `${t('search.agonist')}: ${atlas.muscle(m.answer).uk}`,
              }),
            ),
          )}`
        : ''
    }`;
}

// ── The map's colours ────────────────────────────────────────────────────

/**
 * Colour rule, one selector per Muscle: `~=` because a neck path belongs to
 * two Muscles, `[fill]` to skip the outline twins (filling a detail stroke would
 * smear it) and the tap zones.
 */
const rule = (id, role) => `#map [data-muscle~="${id}"][fill] { fill: var(--r-${role}); }`;

/**
 * An Exercise's Roles go lightest first, the Agonist last, so where two Roles
 * share a path the heavier one shows.
 */
const distribution = (atlas, id) => {
  const byRole = atlas.exerciseMuscles(id);
  return [...ROLES]
    .reverse()
    .flatMap((role) => byRole.filter((x) => x.role === role).map((x) => rule(x.muscle.id, role)))
    .join('\n');
};

/** What the map shows for the page itself. */
export function paintRules(atlas, here) {
  if (here.screen === 'muscle') return rule(here.id, 'agonist');
  return here.screen === 'exercise' ? distribution(atlas, here.id) : '';
}

/**
 * What the map shows while a row is being read: everything grey, then what the
 * row is about — a Muscle (in its Role, if the row has one, else as the
 * Agonist) or an Exercise's whole Role Distribution. Written after the page's
 * own rules with the same weight, so it wins over them.
 */
export function litRules(atlas, { muscle, role = 'agonist', exercise }) {
  const rest = '#map [data-muscle][fill] { fill: var(--c-rest); }';
  return `${rest}\n${exercise ? distribution(atlas, exercise) : rule(muscle, role)}`;
}

/** What the page itself is about, in the shape `litRules` and `openingSide` take. */
export function pageLights(here) {
  if (here.screen === 'muscle') return { muscle: here.id };
  return here.screen === 'exercise' ? { exercise: here.id } : null;
}

/**
 * The side of the body the full-screen map opens on: where what it lights is
 * drawn — a Muscle's own side, an Exercise's Agonist's (the first Muscle).
 */
export function openingSide(atlas, { muscle, exercise }) {
  const id = exercise ? atlas.exerciseMuscles(exercise)[0].muscle.id : muscle;
  return atlas.muscle(id).views[0];
}
