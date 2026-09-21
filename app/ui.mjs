// The glue between the atlas and the screen: it inlines the two SVGs, frames
// them on what is chosen, and draws the sheet for a Muscle or an Exercise.
// There is deliberately no logic here — every answer comes from `atlas.mjs`.
//
// The module does not touch `document` on import; everything starts at
// `start()`. That is what lets the tap-zone geometry be checked in Node
// without emulating a DOM.

import { createAtlas, ROLES } from './atlas.mjs';
import { LANGS, translator, otherLang, loadLang, saveLang } from './i18n.mjs';
import { createQuiz } from './quiz.mjs';
import { pickerHtml, roundHtml, moreHtml, summaryHtml, announce } from './quiz-view.mjs';

const VIEWS = ['front', 'back'];
const SVG_NS = 'http://www.w3.org/2000/svg';

/** The box covering all the given ones. A Muscle is several paths. */
export function union(boxes) {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  };
}

/**
 * The box stretched to `min` on each side, around its own centre. Ticket 02
 * measured that 30 Muscles out of 40 are narrower than a finger, so the tap
 * zone is separate from — and coarser than — the path that lights up.
 */
export function expand(box, min) {
  const width = Math.max(box.width, min);
  const height = Math.max(box.height, min);
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
}

/** The Muscles an atlas path belongs to. On the neck one path carries two. */
const musclesOf = (element) => element.getAttribute('data-muscle').split(' ');

const json = (path) => fetch(path).then((r) => r.json());
const text = (path) => fetch(path).then((r) => r.text());

export async function start() {
  const [muscles, groups, exercises, atlasIds, ...svgSources] = await Promise.all([
    json('content/muscles.json'),
    json('content/muscle-groups.json'),
    json('content/exercises.json'),
    json('assets/atlas/muscle-ids.json'),
    ...VIEWS.map((view) => text(`assets/atlas/${view}.svg`)),
  ]);

  const atlas = createAtlas({
    muscles: muscles.muscles,
    groups: groups.groups,
    exercises: exercises.exercises,
    atlasMuscles: atlasIds.muscles,
  });

  // A Muscle with no Exercises has nothing to show on the map, so it is not
  // tappable there. Search still opens it: its name and Function are worth it.
  const withExercises = new Set(
    atlas.muscles().map((m) => m.id).filter((id) => atlas.muscleExercises(id).length > 0),
  );

  const el = (id) => document.getElementById(id);
  const sides = el('sides');
  const sheet = el('sheet');
  const card = el('card');
  const paint = el('paint');
  const results = el('results');
  const query = el('q');

  /** The finger minimum. One source: the CSS that sizes the buttons too. */
  const minTapPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tap'));

  /** Whether the pointer is a finger. A mouse is hurt by help it did not need. */
  const coarsePointer = matchMedia('(pointer: coarse)');

  // Only the language is remembered between launches. The screen lives in the
  // address, so a link to a Muscle survives being sent to another Trainer, and
  // GitHub Pages needs no server configuration to serve it.
  const storage = () => localStorage;
  const state = { lang: loadLang(storage), detent: 'low' };
  const DETENTS = ['low', 'mid', 'high'];

  // The Quiz lives in the page's memory only: a reload on its address opens the
  // Mode picker, and an interrupted Round costs nothing but the Round. `rev`
  // counts its changes, so the screen redraws when the state moved and the
  // address did not.
  const quiz = createQuiz({ atlas });
  const play = { step: 'modes', round: null, view: VIEWS[0], rev: 0, focused: '', more: false, moreClosed: false };
  const answered = () => play.step === 'round' && play.round.result;
  const resetPlay = () => Object.assign(play, { step: 'modes', round: null, view: VIEWS[0], focused: '', more: false });

  // ── Routes ──────────────────────────────────────────────────────────────

  /** The screen the address bar asks for. Anything unknown falls back to the map. */
  function route() {
    const [first, second] = location.hash.replace(/^#\/?/, '').split('/');
    // An id out of a URL is untrusted: a stale link must show the map, not throw.
    if (first === 'muscle' && atlas.muscle(second)) return { screen: 'muscle', id: second };
    if (first === 'exercise' && atlas.exercise(second)) return { screen: 'exercise', id: second };
    if (first === 'game') return { screen: 'game' };
    // Links from before the sheet: #/front/pectoralis_major.
    if (VIEWS.includes(first) && atlas.muscle(second)) return { screen: 'muscle', id: second };
    return { screen: 'map', view: VIEWS.includes(first) ? first : VIEWS[0] };
  }

  /**
   * Move to another screen and remember the way back. An installed app has no
   * browser Back button, so the depth kept here is what shows our own.
   */
  function go(hash) {
    // Leave a bookmark in the step we are leaving: how far the sheet was read
    // and what was typed in search. Back brings both back.
    history.replaceState({ ...history.state, scroll: sheet.scrollTop, query: query.value, detent: state.detent }, '');
    history.pushState({ depth: (history.state?.depth ?? 0) + 1 }, '', hash);
    render();
  }

  /** The sides a screen shows: a Muscle on every side that draws it. */
  function sidesFor(here) {
    if (here.screen === 'map') return [here.view];
    if (here.screen === 'game') return [play.view];
    if (here.screen === 'muscle') return VIEWS.filter((v) => atlas.muscle(here.id).views.includes(v));
    const drawn = atlas.exerciseMuscles(here.id).flatMap(({ muscle }) => muscle.views);
    return VIEWS.filter((v) => drawn.includes(v));
  }

  /** The Muscles a screen frames the figure on. */
  function focusOf(here) {
    if (here.screen === 'muscle') return [here.id];
    if (here.screen === 'exercise') return atlas.exerciseMuscles(here.id).map(({ muscle }) => muscle.id);
    // In the Quiz the answer zooms onto the right Muscle, as a Muscle page does.
    if (here.screen === 'game' && answered()) return [answered().answer];
    return [];
  }

  // ── Zoom: the figure, not the page ──────────────────────────────────────

  let zoomed = false; // the Trainer moved the figure away from our framing
  let zoomedAt = ''; // …on this screen; another screen starts framed again
  let quietUntil = 0; // a drag ends in a click, and that click is not a tap

  const numbers = (text) => text.split(' ').map(Number);

  /**
   * Scale the viewBox by `r` around the user-space point `u`, then pan by
   * (dx, dy) screen pixels. Keeping `u` where it was is what makes a pinch
   * zoom into the fingers rather than into a corner.
   */
  function zoomTo(svg, [x0, y0, w0, h0], r, u, dx, dy, s0) {
    const [wx, wy, ww, wh] = numbers(svg.dataset.whole);
    const w = Math.min(Math.max(w0 / r, 60), ww * 1.3);
    const k = w / w0;
    const h = h0 * k;
    const s = s0 / k;
    // Keep part of the figure on screen, however far it is flung.
    const x = Math.min(Math.max(u.x - (u.x - x0) * k - dx / s, wx - w * 0.6), wx + ww - w * 0.4);
    const y = Math.min(Math.max(u.y - (u.y - y0) * k - dy / s, wy - h * 0.6), wy + wh - h * 0.4);
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    zoomed = true;
    document.body.classList.add('zoomed');
  }

  /** One step of the buttons and keys: the same zoom as a pinch, about the middle of each figure. */
  const STEP = 1.5;
  function zoomBy(r) {
    for (const host of sides.children) {
      const svg = host.querySelector('svg');
      const [x, y, w, h] = numbers(svg.getAttribute('viewBox'));
      zoomTo(svg, [x, y, w, h], r, { x: x + w / 2, y: y + h / 2 }, 0, 0, svg.getScreenCTM().a);
    }
    rezone();
  }

  function zoomable(svg) {
    const fingers = new Map();
    let from = null;

    const userAt = (x, y) => {
      const p = svg.createSVGPoint();
      p.x = x;
      p.y = y;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    };
    const middle = () => {
      const all = [...fingers.values()];
      return {
        x: all.reduce((a, f) => a + f.x, 0) / all.length,
        y: all.reduce((a, f) => a + f.y, 0) / all.length,
        spread: all.length > 1 ? Math.hypot(all[0].x - all[1].x, all[0].y - all[1].y) : 0,
      };
    };
    // Each change in the number of fingers starts the gesture afresh from here.
    const anchor = () => {
      const m = middle();
      from = { box: numbers(svg.getAttribute('viewBox')), m, u: userAt(m.x, m.y), s: svg.getScreenCTM().a, moved: from?.moved ?? false };
    };

    svg.addEventListener('pointerdown', (e) => {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 1) from = null;
      anchor();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!fingers.has(e.pointerId)) return;
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const m = middle();
      const dx = m.x - from.m.x;
      const dy = m.y - from.m.y;
      // A tap wobbles a few pixels; only past that is it a drag.
      if (!from.moved && fingers.size < 2 && Math.hypot(dx, dy) < 6) return;
      if (!from.moved) {
        from.moved = true;
        svg.setPointerCapture(e.pointerId);
      }
      const r = fingers.size > 1 && from.m.spread ? m.spread / from.m.spread : 1;
      zoomTo(svg, from.box, r, from.u, dx, dy, from.s);
    });
    const lift = (e) => {
      if (!fingers.delete(e.pointerId)) return;
      if (from?.moved) quietUntil = performance.now() + 300;
      if (fingers.size) return anchor();
      if (from?.moved) rezone();
      from = null;
    };
    svg.addEventListener('pointerup', lift);
    svg.addEventListener('pointercancel', lift);

    // A mouse wheel or a trackpad pinch zooms into the pointer.
    svg.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const r = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
        zoomTo(svg, numbers(svg.getAttribute('viewBox')), r, userAt(e.clientX, e.clientY), 0, 0, svg.getScreenCTM().a);
        rezone();
      },
      { passive: false },
    );
  }

  // ── Figures ─────────────────────────────────────────────────────────────

  const figures = {};
  VIEWS.forEach((view, i) => {
    const holder = document.createElement('div');
    holder.innerHTML = svgSources[i];
    const svg = holder.querySelector('svg');
    svg.dataset.view = view;
    svg.dataset.whole = svg.getAttribute('viewBox');
    // Hundreds of unnamed paths say nothing to a screen reader; the figure is
    // one picture with a name. Every Muscle is reachable by name in search.
    svg.setAttribute('role', 'img');
    // A path whose Muscles all lack Exercises invites no tap: not by colour,
    // not by reacting. Decided per path, because on the neck one path is two
    // Muscles and only one of them may be live.
    for (const path of svg.querySelectorAll('[data-muscle]')) {
      path.classList.toggle('live', musclesOf(path).some((id) => withExercises.has(id)));
    }
    svg.addEventListener('click', (event) => {
      if (performance.now() < quietUntil) return; // the end of a drag, not a tap
      if (route().screen === 'game') return; // a tap in the Quiz is not a way into the reference
      const path = event.target.closest?.('[data-muscle]');
      const id = path && musclesOf(path).find((m) => withExercises.has(m));
      if (id) go(`#/muscle/${id}`);
    });
    zoomable(svg);
    figures[view] = svg;
  });

  // A Muscle's box in viewBox units does not move with the frame, and the SVG
  // is fixed for the session, so each is measured once per figure.
  const boxes = new WeakMap();

  /** Where a set of Muscles sits on one figure, in viewBox units. */
  function boxOn(svg, ids) {
    if (!boxes.has(svg)) boxes.set(svg, new Map());
    const known = boxes.get(svg);
    const found = [];
    for (const id of ids) {
      let box = known.get(id);
      if (box === undefined) {
        const paths = [...svg.querySelectorAll(`path[data-muscle~="${id}"][fill]`)];
        box = paths.length ? union(paths.map((p) => p.getBBox())) : null;
        // A figure that is not on screen measures 0 x 0: ask again later.
        if (!box || box.width || box.height) known.set(id, box);
      }
      if (box && (box.width || box.height)) found.push(box);
    }
    return found.length ? union(found) : null;
  }

  /**
   * Frame the figure on what is chosen, with room around it and the host's
   * aspect — so a 7 px Muscle becomes big enough to read and to tap beside.
   */
  function frame(svg, box, aspect, room, least) {
    if (!box) {
      svg.setAttribute('viewBox', svg.dataset.whole);
      return;
    }
    let w = Math.max(box.width * room, least);
    let h = Math.max(box.height * room, least);
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    svg.setAttribute('viewBox', `${box.x + box.width / 2 - w / 2} ${box.y + box.height / 2 - h / 2} ${w} ${h}`);
  }

  /**
   * Tap zones over the figure, recomputed whenever its scale changes: 44 px is
   * screen pixels, while a Muscle's box lives in viewBox units.
   *
   * Only for a finger. A mouse points where it points: a zone wide enough for
   * a thumb sits over the Muscles beside a thin one and takes their clicks, so
   * on a mouse the path itself is the target and a 7 px Muscle is hit exactly.
   *
   * ponytail: a zone always outranks whatever it covers, so on a touch screen
   * a big Muscle loses the patch a small neighbour's zone sits on. It stays
   * reachable everywhere else, and the alternative — no zone — makes the small
   * Muscle unreachable entirely.
   */
  function layTapZones(svg) {
    for (const zone of svg.querySelectorAll('rect.tap')) zone.remove();
    const scale = coarsePointer.matches && svg.getScreenCTM()?.a;
    if (!scale) return;

    const min = minTapPx / scale;
    const small = [];
    for (const id of withExercises) {
      const box = boxOn(svg, [id]);
      if (box && (box.width < min || box.height < min)) small.push({ id, box });
    }
    // The smallest go last, or a neighbour's zone would cover them.
    small.sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height);

    for (const { id, box } of small) {
      const zone = document.createElementNS(SVG_NS, 'rect');
      // No `fill` attribute, or the paint rules would colour the zone itself.
      zone.setAttribute('class', 'tap');
      zone.setAttribute('data-muscle', id);
      const r = expand(box, min);
      for (const k of ['x', 'y', 'width', 'height']) zone.setAttribute(k, r[k]);
      svg.append(zone);
    }
  }

  /** Frame every figure on screen on what is chosen. Cheap: runs every frame the stage moves. */
  function reframe() {
    if (zoomed) return; // the Trainer's own framing wins until they reset it
    const here = route();
    const ids = focusOf(here);
    const two = sides.children.length > 1;
    // Read every size first, then write every frame: no layout between hosts.
    const hosts = [...sides.children].map((host) => ({
      svg: host.querySelector('svg'),
      aspect: host.clientWidth / host.clientHeight || 1,
      box: ids.length ? boxOn(host.querySelector('svg'), ids) : null,
    }));
    for (const { svg, aspect, box } of hosts) {
      if (here.screen === 'exercise') frame(svg, box, aspect, 1.25, 420);
      else frame(svg, box, aspect, two ? 2.6 : 3.2, two ? 380 : 320);
    }
  }

  /**
   * Tap zones measure every Muscle, so they wait until the stage stops
   * moving: while the sheet slides, the stage resizes on every frame.
   */
  let zoning;
  function rezone() {
    clearTimeout(zoning);
    zoning = setTimeout(() => {
      for (const svg of sides.querySelectorAll('svg')) layTapZones(svg);
    }, 150);
  }

  // What the sheet keeps stuck at its top is as tall as the card's first line,
  // which wraps with the name; the browser must scroll a focused row clear of it.
  function padScroll() {
    const stuck = [...sheet.querySelectorAll('.find-row, .head')].find((e) => e.offsetHeight);
    sheet.style.setProperty('--stuck-h', `${stuck?.offsetHeight ?? 0}px`);
  }

  function settle() {
    reframe();
    rezone();
    padScroll();
  }

  new ResizeObserver(settle).observe(el('stage'));

  /**
   * Colour rules, one selector per Muscle: `~=` because a neck path belongs to
   * two Muscles, `[fill]` to skip the outline twins (filling a detail stroke
   * would smear it) and the tap zones. `#sides` outranks the resting colours.
   * An Exercise's Roles go lightest first, agonist last, so where two Roles
   * share a path the heavier one shows.
   */
  function paintFor(here) {
    const rule = (id, colour) => `#sides [data-muscle~="${id}"][fill] { fill: var(--${colour}); }`;
    if (here.screen === 'muscle') return rule(here.id, 'agonist');
    // The Quiz shows the answer the way the Exercise page does, but from the
    // Round's own list of Roles.
    const byRole =
      here.screen === 'exercise'
        ? atlas.exerciseMuscles(here.id).map(({ muscle, role }) => ({ muscle: muscle.id, role }))
        : here.screen === 'game' && answered()
          ? answered().roles
          : [];
    return [...ROLES]
      .reverse()
      .flatMap((role) => byRole.filter((x) => x.role === role).map((x) => rule(x.muscle, role)))
      .join('\n');
  }

  // ── Words ───────────────────────────────────────────────────────────────

  const exerciseRow = (e, small = '', note = '') =>
    `<li><a class="row" href="#/exercise/${e.id}" data-exercise="${e.id}">${e[state.lang]}${small ? `<small>${small}</small>` : ''}</a>${why(note)}</li>`;
  const muscleRow = (m, note = '') =>
    `<li><a class="row" href="#/muscle/${m.id}" data-muscle-id="${m.id}">${m.uk}${m.la ? `<small class="la" translate="no">${m.la}</small>` : ''}</a>${why(note)}</li>`;
  /** Why this Muscle has this Role in this Exercise — under the row, outside the link. */
  const why = (note) => (note ? `<p class="why">${note}</p>` : '');

  /** The card's first line — back, the name, close — which the low sheet shows. */
  function head(t, name) {
    const back = (history.state?.depth ?? 0) > 0
      ? `<button class="icon" type="button" data-act="back" aria-label="${t('back')}">‹</button>`
      : '';
    return `<div class="head">${back}<h2 class="name" tabindex="-1">${name}</h2>
      <button class="icon" type="button" data-act="close" aria-label="${t('close')}">✕</button></div>`;
  }

  function muscleSheet(t, id) {
    const m = atlas.muscle(id);
    const byRole = new Map(ROLES.map((r) => [r, []]));
    for (const { exercise, role } of atlas.muscleExercises(id)) byRole.get(role).push(exercise);
    const any = withExercises.has(id);

    return `
      ${head(t, m.uk)}
      <div class="card-body">
      ${m.la ? `<p class="latin" translate="no">${m.la}</p>` : ''}
      <p class="action">${m.action}</p>
      ${any ? `
        <ul class="plates" aria-label="${t('muscle.plates')}">
          ${ROLES.map((r) => `
            <li class="plate ${byRole.get(r).length ? '' : 'empty'}" data-role="${r}">
              <span class="disc">${byRole.get(r).length}</span>${t(`role.${r}`).toLowerCase()}
            </li>`).join('')}
        </ul>
        <div class="roles">
          ${ROLES.filter((r) => byRole.get(r).length).map((r) => `
            <section class="role" data-role="${r}">
              <h3>${t(`role.${r}`)}</h3>
              <p>${t(`role.${r}.does`)}</p>
              <ul>${byRole.get(r).map((e) => exerciseRow(e, '', e.notes?.[id])).join('')}</ul>
            </section>`).join('')}
        </div>` : `<p class="note">${t('muscle.none')}</p>`}
      </div>`;
  }

  function exerciseSheet(t, id) {
    const e = atlas.exercise(id);
    const byRole = new Map(ROLES.map((r) => [r, []]));
    for (const { muscle, role } of atlas.exerciseMuscles(id)) byRole.get(role).push(muscle);
    const present = ROLES.filter((r) => byRole.get(r).length);
    const heading = (r) => (r === 'agonist' || byRole.get(r).length === 1 ? t(`role.${r}`) : t(`roles.${r}`));
    const related = atlas.relatedExercises(id);

    return `
      ${head(t, e[state.lang])}
      <div class="card-body">
      <p class="latin" translate="no">${e[otherLang(state.lang)]}</p>
      <ul class="legend" aria-label="${t('exercise.legend')}">
        ${present.map((r) => `<li data-role="${r}">${t(`role.${r}`)}</li>`).join('')}
      </ul>
      <div class="roles">
        ${present.map((r) => `
          <section class="role" data-role="${r}">
            <h3>${heading(r)}</h3>
            <p>${t(`role.${r}.does`)}</p>
            <ul>${byRole.get(r).map((m) => muscleRow(m, e.notes?.[m.id])).join('')}</ul>
          </section>`).join('')}
      </div>
      ${related.length ? `
        <section class="related">
          <h3>${t('related.heading')}</h3>
          <p>${t('related.says')}</p>
          <ul>${related.map((x) => exerciseRow(x)).join('')}</ul>
        </section>` : ''}
      </div>`;
  }

  /** What an empty search offers: every Muscle by group, then every Exercise. */
  function index(t) {
    const agonistOf = (e) => atlas.exerciseMuscles(e.id)[0].muscle.uk;
    const named = atlas.groups()
      .map((g) => ({ ...g, muscles: atlas.groupMuscles(g.id) }))
      .filter((g) => g.muscles.length);
    return `
      <h2>${t('search.groups')}</h2>${named.map((g) => `
        <div class="group"><h3 class="group-name">${g[state.lang]}</h3>
          <ul>${g.muscles.map((m) => muscleRow(m)).join('')}</ul></div>`).join('')}
      <h2>${t('search.exercises')}</h2><ul>${atlas.exercises()
        .map((e) => exerciseRow(e, `${t('search.agonist')}: ${agonistOf(e)}`)).join('')}</ul>`;
  }

  /** Under the search field: the index while it is empty, results once typed. */
  const list = (t) => (query.value.trim() ? found(t, query.value) : index(t));

  function found(t, text) {
    const r = atlas.search(text);
    if (!text.trim()) return '';
    if (!r.groups.length && !r.muscles.length && !r.exercises.length) return `<p>${t('search.empty')}</p>`;
    const agonistOf = (e) => atlas.exerciseMuscles(e.id)[0].muscle.uk;
    return `
      ${r.groups.length ? `<h2>${t('search.groups')}</h2>${r.groups.map((g) => `
        <div class="group"><h3 class="group-name">${g[state.lang]}</h3>
          <ul>${g.muscles.map((m) => muscleRow(m)).join('')}</ul></div>`).join('')}` : ''}
      ${r.muscles.length ? `<h2>${t('search.muscles')}</h2><ul>${r.muscles.map((m) => muscleRow(m)).join('')}</ul>` : ''}
      ${r.exercises.length ? `<h2>${t('search.exercises')}</h2><ul>${r.exercises
        .map((e) => exerciseRow(e, `${t('search.agonist')}: ${agonistOf(e)}`)).join('')}</ul>` : ''}`;
  }

  // ── Render ──────────────────────────────────────────────────────────────

  let shown = '';
  let drawn = '';

  function render() {
    // Going back fires both popstate and hashchange; one screen, one drawing,
    // or a screen reader reads the sheet out twice.
    const depth = history.state?.depth ?? 0;
    const here = route();
    const playing = here.screen === 'game';
    const signature = `${location.hash}|${state.lang}|${depth}|${playing ? play.rev : ''}`;
    if (signature === drawn) return;
    drawn = signature;

    const t = translator(state.lang);
    const open = here.screen === 'muscle' || here.screen === 'exercise';

    document.documentElement.lang = state.lang;
    el('title').textContent = t('app.title');
    el('play').textContent = `▶ ${t('game.enter')}`;
    el('lang').textContent = t('lang.other');
    // The spoken name starts with what is printed on it, so «tap EN» works.
    el('lang').setAttribute('aria-label', `${t('lang.other')}: ${t('lang.switch')}`);
    el('stage').setAttribute('aria-label', t('map.label'));
    el('hint-tap').textContent = t('map.hint');
    el('hint-legend').textContent = t('map.legend');
    query.placeholder = t('search.placeholder');
    query.setAttribute('aria-label', t('search.label'));
    const flipTo = here.screen === 'game' ? play.view : here.view;
    if (here.screen === 'map' || playing) el('flip').textContent = t(`view.${VIEWS.find((v) => v !== flipTo)}`);
    // Each step keeps the height its sheet was left at; a fresh one opens a
    // chosen Muscle halfway, keeps the height between two chosen ones, and
    // lowers the sheet back to the search on the map.
    const key = open ? `${here.screen}/${here.id}` : '';
    if (!playing && key !== shown) {
      const wasOpen = shown !== '';
      setDetent(history.state?.detent ?? (open ? (wasOpen ? state.detent : 'mid') : 'low'));
    }
    document.body.classList.toggle('open', open);
    gripLabel();
    el('cancel').setAttribute('aria-label', t('search.cancel'));
    // Each question of the Quiz starts with the whole figure, and the answer
    // frames the right Muscle — over any zoom the Trainer made while choosing.
    const place = playing ? `${location.hash}|${play.step}|${play.round?.index}|${Boolean(answered())}` : location.hash;
    if (place !== zoomedAt) {
      zoomed = false;
      zoomedAt = place;
      document.body.classList.remove('zoomed');
    }
    el('fit').textContent = t('zoom.reset');
    el('zoom-in').setAttribute('aria-label', t('zoom.in'));
    el('zoom-out').setAttribute('aria-label', t('zoom.out'));
    document.body.dataset.screen = here.screen;
    document.body.classList.toggle('game', playing);
    document.body.classList.toggle('g-roles', playing && Boolean(answered()));
    el('game').hidden = !playing;

    const views = sidesFor(here);
    sides.replaceChildren(
      ...views.map((view) => {
        const host = document.createElement('div');
        host.className = 'side';
        figures[view].setAttribute('aria-label', `${t('map.label')}, ${t(`view.${view}`).toLowerCase()}`);
        host.append(figures[view]);
        if (views.length > 1) {
          const name = document.createElement('span');
          name.className = 'side-name';
          name.textContent = t(`view.${view}`);
          host.append(name);
        }
        return host;
      }),
    );
    paint.textContent = paintFor(here);

    if (playing) {
      drawGame(t);
      // At once, not on the next frame: a question must never show, even for
      // a frame, the previous answer's zoom — that would give the answer away.
      settle();
      return;
    }
    // Off to the atlas, the Round is over: Forward must not bring a stale one
    // back. A step into the reference keeps it, so Back lands on the summary.
    if (here.screen === 'map') resetPlay();

    // A new Muscle or Exercise starts its sheet where this step was left — the
    // top for a fresh one, the bookmark on the way back; a language switch
    // on the same one keeps the reader where they were.
    if (here.screen === 'muscle') card.innerHTML = muscleSheet(t, here.id);
    if (here.screen === 'exercise') card.innerHTML = exerciseSheet(t, here.id);
    if (!open) card.textContent = '';

    // The map shows the search this step was left with: empty for a fresh one.
    if (!open && document.activeElement !== query) query.value = history.state?.query ?? '';
    results.innerHTML = open ? '' : list(t);
    if (key !== shown) {
      // Skipped rows are only guessed at, so a bookmark deep in the index would
      // land short: lay every row out for a frame, then let the off-screen ones
      // go again, keeping the sizes they had.
      results.classList.add('whole');
      sheet.scrollTop = history.state?.scroll ?? 0;
      requestAnimationFrame(() => results.classList.remove('whole'));
      // The row that was pressed is gone with the old card; without this the
      // keyboard's place falls back to the top of the page. The new card's
      // name takes it, or the grip once the card is put away.
      if (document.activeElement === document.body || !document.activeElement) {
        (open ? card.querySelector('.name') : el('grip'))?.focus({ preventScroll: true });
      }
    }
    shown = key;
    requestAnimationFrame(settle);
  }

  // ── The Quiz ────────────────────────────────────────────────────────────

  /** Say something to a screen reader. The region is emptied between questions, or the same words twice would be silent. */
  const say = (words) => (el('g-say').textContent = words);

  function drawGame(t) {
    const { step, round } = play;
    const layer = el('game');
    layer.classList.toggle('full', step !== 'round');

    if (step === 'modes') {
      el('g-top').innerHTML = pickerHtml(t);
      el('g-under').innerHTML = '';
    } else if (step === 'round') {
      const { top, under } = roundHtml(t, state.lang, atlas, round, play.more);
      el('g-top').innerHTML = top;
      el('g-under').innerHTML = under;
    } else {
      el('g-top').innerHTML = summaryHtml(t, state.lang, atlas, round);
      el('g-under').innerHTML = '';
    }

    const more = el('g-more');
    const showMore = step === 'round' && play.more && Boolean(round.result);
    more.hidden = !showMore;
    more.innerHTML = showMore ? moreHtml(t, atlas, round) : '';
    if (showMore) more.scrollTop = 0;

    // A new question or screen starts from its heading, so a screen reader
    // reads it out and Tab goes on from there; an answer hands the focus to
    // «Next», which is what the keyboard does next.
    const place = `${step}|${round?.index}`;
    if (place !== play.focused) {
      play.focused = place;
      layer.querySelector('h2')?.focus({ preventScroll: true });
    } else if (showMore) {
      more.querySelector('h3')?.focus({ preventScroll: true });
    } else if (answered()) {
      layer.querySelector(play.moreClosed ? '[data-g="more"]' : '[data-g="next"]')?.focus({ preventScroll: true });
    }
    play.moreClosed = false;
  }

  const redrawGame = () => {
    play.rev++;
    render();
  };

  function begin(mode) {
    play.round = quiz.round(mode);
    play.step = 'round';
    play.view = VIEWS[0];
    say('');
    redrawGame();
  }

  function pick(muscle) {
    if (play.step !== 'round' || play.round.result) return;
    const result = play.round.answer(muscle);
    play.more = false;
    // The figure turns to the side where the Agonist can be seen.
    play.view = atlas.muscle(result.answer).views[0];
    say(announce(translator(state.lang), atlas, result));
    redrawGame();
  }

  function advance() {
    const { round } = play;
    if (route().screen !== 'game' || play.step !== 'round' || !round.result) return;
    play.more = false;
    if (round.finished) play.step = 'summary';
    else {
      round.next();
      play.view = VIEWS[0];
    }
    say('');
    redrawGame();
  }

  /** Open or close the long explanation over the map; closing gives the focus back to its button. */
  function toggleMore() {
    if (!answered()) return;
    play.more = !play.more;
    play.moreClosed = !play.more;
    redrawGame();
  }

  /** Leave the Quiz the way any screen is left: Back, or the map when there is no Back. */
  function leaveGame() {
    if ((history.state?.depth ?? 0) > 0) return history.back();
    history.replaceState(history.state, '', `#/${VIEWS[0]}`);
    render();
  }

  el('play').addEventListener('click', () => {
    resetPlay();
    say('');
    go('#/game');
  });

  // Rows in the summary are ordinary links: the atlas's own handler below opens them.
  el('game').addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-g]');
    if (!button) return;
    const act = button.dataset.g;
    if (act === 'close') leaveGame();
    else if (act === 'start') begin(button.dataset.mode);
    else if (act === 'again') begin(play.round.mode);
    else if (act === 'modes') {
      play.step = 'modes';
      play.focused = '';
      say('');
      redrawGame();
    } else if (act === 'more') toggleMore();
    else if (act === 'pick') pick(button.dataset.id);
    else if (act === 'next') advance();
  });

  // ── Events ──────────────────────────────────────────────────────────────

  el('lang').addEventListener('click', () => {
    state.lang = otherLang(state.lang);
    saveLang(storage, state.lang);
    render();
  });

  // Turning the figure is not a step to go back to: it replaces the address.
  el('flip').addEventListener('click', () => {
    const here = route();
    if (here.screen === 'game') {
      // In the Quiz the side lives in the Round, not in the address.
      play.view = VIEWS.find((v) => v !== play.view);
      return redrawGame();
    }
    history.replaceState(history.state, '', `#/${VIEWS.find((v) => v !== here.view)}`);
    render();
  });

  /** Put the choice away: back to the map, on the side it was seen from. */
  function close() {
    const side = sides.firstElementChild?.querySelector('svg')?.dataset.view ?? VIEWS[0];
    go(`#/${side}`);
  }

  function gripLabel() {
    const t = translator(state.lang);
    el('grip').setAttribute('aria-label', `${t('sheet.grip')}. ${t('sheet.now')}: ${t(`detent.${state.detent}`)}`);
  }

  function setDetent(detent) {
    state.detent = detent;
    document.body.dataset.detent = detent;
    gripLabel();
    // Low shows only the first line, so it shows it from the top.
    if (detent === 'low') sheet.scrollTop = 0;
  }

  // Only the list redraws while typing: redrawing the page would drop the
  // caret out of the field on every letter.
  const searching = () => document.body.classList.toggle('searching', document.activeElement === query || Boolean(query.value));
  query.addEventListener('input', () => {
    const t = translator(state.lang);
    results.innerHTML = list(t);
    el('status').textContent = query.value.trim() ? `${t('search.count')}: ${results.querySelectorAll('.row').length}` : '';
    searching();
  });
  // Typing needs room above the keyboard: the sheet goes all the way up —
  // at the touch, before the field takes focus. Raised after focus, the field
  // rises out of the view iOS has just scrolled to show it, and stays hidden
  // until the keyboard goes.
  const raiseForTyping = () => {
    if (state.detent === 'high') return;
    document.body.classList.add('instant');
    setDetent('high');
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('instant')));
  };
  // On a touch, the tap is taken over: raised during the touch, the sheet
  // would put another row under the lifting finger and the tap would open
  // that. So the tap is cancelled, the sheet raised, and the field focused
  // by hand — inside the touch, which still lets iOS open the keyboard.
  let tapAt = null;
  query.addEventListener('touchstart', (e) => {
    tapAt = document.activeElement === query ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  query.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!tapAt || Math.hypot(t.clientX - tapAt.x, t.clientY - tapAt.y) > 10) return; // a drag, not a tap
    e.preventDefault();
    raiseForTyping();
    query.focus({ preventScroll: true });
  });
  query.addEventListener('mousedown', raiseForTyping);
  query.addEventListener('focus', () => {
    raiseForTyping();
    searching();
  });

  /**
   * The app is as tall as the space it has. With the keyboard up that is the
   * visual viewport, not the window, so the tall sheet ends above the keys.
   * iOS also scrolls the page to show a focused field; the app is one screen,
   * so it is kept at the top.
   */
  const viewport = window.visualViewport;
  const fit = () => {
    const height = `${viewport.height}px`;
    if (document.documentElement.style.getPropertyValue('--app-h') !== height) {
      // The keyboard is not a gesture to animate. The sheet hangs from the
      // bottom, which the keyboard moves at once; easing its height on top of
      // that flung the sheet 300 px off the top and slid it back.
      document.body.classList.add('instant');
      document.documentElement.style.setProperty('--app-h', height);
      requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('instant')));
    }
    if (scrollY || viewport.offsetTop) scrollTo(0, 0);
  };
  if (viewport) {
    viewport.addEventListener('resize', fit);
    viewport.addEventListener('scroll', fit);
    fit();
  }
  query.addEventListener('blur', searching);

  // Pressing the button must not take focus from the field: the blur would end
  // the search and hide this very button before its click landed, and the click
  // would fall on the field, which raises the sheet again.
  el('cancel').addEventListener('mousedown', (e) => e.preventDefault());

  /** Leave the search the way iOS does: empty, keyboard gone, sheet down. */
  function cancelSearch() {
    query.value = '';
    query.blur();
    results.innerHTML = list(translator(state.lang));
    searching();
    setDetent('low');
  }
  addEventListener('keydown', (e) => {
    // "=" is the unshifted "+"; a modified key is the browser's own page zoom.
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest?.('input, textarea')) {
      if (e.key === '+' || e.key === '=') return zoomBy(STEP);
      if (e.key === '-' || e.key === '−' || e.key === '_') return zoomBy(1 / STEP);
    }
    if (e.key !== 'Escape') return;
    if (route().screen === 'game') return play.more ? toggleMore() : leaveGame();
    if (document.body.classList.contains('searching')) cancelSearch();
    else if (document.body.classList.contains('open')) close();
  });

  /**
   * The sheet is moved by the finger, the way phone sheets are: up raises it
   * a height, down lowers it one. Content scrolls only at the top height, as
   * in Apple Maps — below that an upward swipe raises the sheet instead. A
   * downward swipe inside a scrolled list is reading, so it scrolls.
   */
  let pull = null;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return (pull = null);
      pull = { y: e.touches[0].clientY, h: sheet.getBoundingClientRect().height, dy: 0, active: false,
               fromHead: Boolean(e.target.closest('.grip, .head, .find-row')) };
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (!pull) return;
      const dy = e.touches[0].clientY - pull.y;
      if (!pull.active) {
        if (Math.abs(dy) < 8) return; // a tap wobbles; not yet a swipe
        const up = dy < 0 && state.detent !== 'high';
        // Low with something chosen, a swipe down dismisses it, as a sheet
        // is dismissed on iOS; low on the map there is nowhere lower to go.
        const dismiss = dy > 0 && state.detent === 'low' && document.body.classList.contains('open');
        const down = dy > 0 && (state.detent !== 'low' || dismiss) && (pull.fromHead || sheet.scrollTop <= 0);
        if (!up && !down) return (pull = null); // the list scrolling
        pull.active = true;
        document.body.classList.add('dragging');
      }
      e.preventDefault();
      pull.dy = dy;
      // The sheet follows the finger, and the stage above it follows too.
      const h = Math.min(Math.max(pull.h - dy, 80), innerHeight * 0.92);
      document.body.style.setProperty('--sheet-h', `${h}px`);
    },
    { passive: false },
  );
  const release = () => {
    const moved = pull?.active ? pull.dy : 0;
    pull = null;
    document.body.classList.remove('dragging');
    document.body.style.removeProperty('--sheet-h');
    if (Math.abs(moved) < 40) return;
    if (moved > 0 && state.detent === 'low') return close();
    // A long fling skips a height: low straight to the top, or back.
    const steps = Math.abs(moved) > innerHeight * 0.4 ? 2 : 1;
    const at = DETENTS.indexOf(state.detent) + (moved < 0 ? steps : -steps);
    setDetent(DETENTS[Math.min(Math.max(at, 0), DETENTS.length - 1)]);
  };
  sheet.addEventListener('touchend', release);
  sheet.addEventListener('touchcancel', release);

  // Low, the whole sheet is a handle: a tap on it (not on its buttons or the
  // search field) raises it halfway.
  sheet.addEventListener('click', (e) => {
    if (state.detent === 'low' && !e.target.closest('a, button, input')) setDetent('mid');
  });

  // One listener for every row and button in the sheet and the results.
  document.addEventListener('click', (event) => {
    const target = event.target.closest?.('[data-muscle-id], [data-exercise], [data-act]');
    if (!target) return;
    // Cmd/Ctrl/Shift-click on a row is the browser's own: a new tab or window.
    if (target.matches('a') && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    if (target.dataset.act === 'back') return history.back();
    // The grip steps through the heights for a thumb that taps rather than
    // drags, and for a keyboard, which cannot drag at all.
    if (target.dataset.act === 'grip') return setDetent(DETENTS[(DETENTS.indexOf(state.detent) + 1) % DETENTS.length]);
    if (target.dataset.act === 'close') return close();
    if (target.dataset.act === 'cancel') return cancelSearch();
    if (target.dataset.act === 'zoom') return zoomBy(STEP ** Number(target.dataset.step));
    if (target.dataset.act === 'fit') {
      zoomed = false;
      document.body.classList.remove('zoomed');
      return settle();
    }
    // Leaving the search for a result: let the keyboard go. The query stays in
    // the step we leave, so Back returns to the same results.
    event.preventDefault();
    query.blur();
    go(target.dataset.muscleId ? `#/muscle/${target.dataset.muscleId}` : `#/exercise/${target.dataset.exercise}`);
  });

  addEventListener('popstate', render);
  addEventListener('hashchange', () => {
    // An address typed by hand arrives without our state; count it as a step
    // so Back stays on screen.
    if (!history.state) history.replaceState({ depth: Number(drawn.split('|')[2] ?? 0) + 1 }, '');
    render();
  });
  // Plugging in a mouse, or picking the tablet up off its keyboard, changes
  // what the tap targets should be.
  coarsePointer.addEventListener('change', settle);
  setDetent(state.detent);
  render();
}
