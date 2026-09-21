// The glue between the atlas and the screen: it inlines the two SVGs, frames
// them on what is chosen, and draws the sheet for a Muscle or an Exercise.
// There is deliberately no logic here — every answer comes from `atlas.mjs`.
//
// The module does not touch `document` on import; everything starts at
// `start()`. That is what lets the tap-zone geometry be checked in Node
// without emulating a DOM.

import { createAtlas, ROLES } from './atlas.mjs';
import { LANGS, translator, otherLang } from './i18n.mjs';

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
  const paint = el('paint');
  const results = el('results');
  const query = el('q');

  /** The finger minimum. One source: the CSS that sizes the buttons too. */
  const minTapPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tap'));

  /** Whether the pointer is a finger. A mouse is hurt by help it did not need. */
  const coarsePointer = matchMedia('(pointer: coarse)');

  // Only the language is state. The screen lives in the address, so a link to
  // a Muscle survives being sent to another Trainer, and GitHub Pages needs no
  // server configuration to serve it.
  const state = { lang: LANGS[0], folded: false, browsing: false };

  // ── Routes ──────────────────────────────────────────────────────────────

  /** The screen the address bar asks for. Anything unknown falls back to the map. */
  function route() {
    const [first, second] = location.hash.replace(/^#\/?/, '').split('/');
    // An id out of a URL is untrusted: a stale link must show the map, not throw.
    if (first === 'muscle' && atlas.muscle(second)) return { screen: 'muscle', id: second };
    if (first === 'exercise' && atlas.exercise(second)) return { screen: 'exercise', id: second };
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
    history.replaceState({ ...history.state, scroll: sheet.scrollTop, query: query.value }, '');
    history.pushState({ depth: (history.state?.depth ?? 0) + 1 }, '', hash);
    render();
  }

  /** The sides a screen shows: a Muscle on every side that draws it. */
  function sidesFor(here) {
    if (here.screen === 'map') return [here.view];
    if (here.screen === 'muscle') return VIEWS.filter((v) => atlas.muscle(here.id).views.includes(v));
    const drawn = atlas.exerciseMuscles(here.id).flatMap(({ muscle }) => muscle.views);
    return VIEWS.filter((v) => drawn.includes(v));
  }

  /** The Muscles a screen frames the figure on. */
  function focusOf(here) {
    if (here.screen === 'muscle') return [here.id];
    if (here.screen === 'exercise') return atlas.exerciseMuscles(here.id).map(({ muscle }) => muscle.id);
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
    // A path whose Muscles all lack Exercises invites no tap: not by colour,
    // not by reacting. Decided per path, because on the neck one path is two
    // Muscles and only one of them may be live.
    for (const path of svg.querySelectorAll('[data-muscle]')) {
      path.classList.toggle('live', musclesOf(path).some((id) => withExercises.has(id)));
    }
    svg.addEventListener('click', (event) => {
      if (performance.now() < quietUntil) return; // the end of a drag, not a tap
      const path = event.target.closest?.('[data-muscle]');
      const id = path && musclesOf(path).find((m) => withExercises.has(m));
      if (id) go(`#/muscle/${id}`);
    });
    zoomable(svg);
    figures[view] = svg;
  });

  /** Where a set of Muscles sits on one figure, in viewBox units. */
  function boxOn(svg, ids) {
    const paths = ids.flatMap((id) => [...svg.querySelectorAll(`path[data-muscle~="${id}"][fill]`)]);
    return paths.length ? union(paths.map((p) => p.getBBox())) : null;
  }

  /**
   * Frame the figure on what is chosen, with room around it and the host's
   * aspect — so a 7 px Muscle becomes big enough to read and to tap beside.
   */
  function frame(svg, ids, host, room, least) {
    const box = ids.length && boxOn(svg, ids);
    if (!box) {
      svg.setAttribute('viewBox', svg.dataset.whole);
      return;
    }
    const aspect = host.clientWidth / host.clientHeight || 1;
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
    for (const host of sides.children) {
      const svg = host.querySelector('svg');
      if (here.screen === 'exercise') frame(svg, ids, host, 1.25, 420);
      else frame(svg, ids, host, two ? 2.6 : 3.2, two ? 380 : 320);
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

  function settle() {
    reframe();
    rezone();
  }

  new ResizeObserver(settle).observe(el('stage'));

  /**
   * Colour rules, one selector per Muscle: `~=` because a neck path belongs to
   * two Muscles, `[fill]` to skip the outline twins (filling a detail stroke
   * would smear it) and the tap zones. `#sides` outranks the resting colours.
   * An Exercise's Roles go stabilizer first, agonist last, so where two Roles
   * share a path the heavier one shows.
   */
  function paintFor(here) {
    const rule = (id, colour) => `#sides [data-muscle~="${id}"][fill] { fill: var(--${colour}); }`;
    if (here.screen === 'muscle') return rule(here.id, 'agonist');
    if (here.screen !== 'exercise') return '';
    const byRole = atlas.exerciseMuscles(here.id);
    return [...ROLES]
      .reverse()
      .flatMap((role) => byRole.filter((x) => x.role === role).map((x) => rule(x.muscle.id, role)))
      .join('\n');
  }

  // ── Words ───────────────────────────────────────────────────────────────

  const exerciseRow = (e, small = '') =>
    `<li><button class="row" type="button" data-exercise="${e.id}">${e[state.lang]}${small ? `<small>${small}</small>` : ''}</button></li>`;
  const muscleRow = (m) =>
    `<li><button class="row" type="button" data-muscle-id="${m.id}">${m.uk}${m.la ? `<small class="la">${m.la}</small>` : ''}</button></li>`;

  function sheetTop(t) {
    const back = (history.state?.depth ?? 0) > 0
      ? `<button class="back" type="button" data-act="back">‹ ${t('back')}</button>`
      : '';
    const fold = state.folded ? t('sheet.expand') : t('sheet.collapse');
    return `
      <button class="grip" type="button" data-act="fold" aria-expanded="${!state.folded}" aria-label="${fold}" title="${fold}"></button>
      <div class="sheet-top">${back}<button class="pill" type="button" data-act="whole">${t('whole')}</button></div>`;
  }

  function muscleSheet(t, id) {
    const m = atlas.muscle(id);
    const byRole = new Map(ROLES.map((r) => [r, []]));
    for (const { exercise, role } of atlas.muscleExercises(id)) byRole.get(role).push(exercise);
    const any = withExercises.has(id);

    return `
      ${sheetTop(t)}
      <h2 class="name">${m.uk}</h2>
      ${m.la ? `<p class="latin">${m.la}</p>` : ''}
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
              <ul>${byRole.get(r).map((e) => exerciseRow(e)).join('')}</ul>
            </section>`).join('')}
        </div>` : `<p class="note">${t('muscle.none')}</p>`}`;
  }

  function exerciseSheet(t, id) {
    const e = atlas.exercise(id);
    const byRole = new Map(ROLES.map((r) => [r, []]));
    for (const { muscle, role } of atlas.exerciseMuscles(id)) byRole.get(role).push(muscle);
    const present = ROLES.filter((r) => byRole.get(r).length);
    const heading = (r) => (r === 'agonist' || byRole.get(r).length === 1 ? t(`role.${r}`) : t(`roles.${r}`));
    const related = atlas.relatedExercises(id);

    return `
      ${sheetTop(t)}
      <h2 class="name">${e[state.lang]}</h2>
      <p class="latin">${e[otherLang(state.lang)]}</p>
      <ul class="legend" aria-label="${t('exercise.legend')}">
        ${present.map((r) => `<li data-role="${r}">${t(`role.${r}`)}</li>`).join('')}
      </ul>
      <div class="roles">
        ${present.map((r) => `
          <section class="role" data-role="${r}">
            <h3>${heading(r)}</h3>
            <p>${t(`role.${r}.does`)}</p>
            <ul>${byRole.get(r).map(muscleRow).join('')}</ul>
          </section>`).join('')}
      </div>
      ${related.length ? `
        <section class="related">
          <h3>${t('related.heading')}</h3>
          <p>${t('related.says')}</p>
          <ul>${related.map((x) => exerciseRow(x)).join('')}</ul>
        </section>` : ''}`;
  }

  /** What an empty search offers: every Muscle by group, then every Exercise. */
  function index(t) {
    const agonistOf = (e) => atlas.exerciseMuscles(e.id)[0].muscle.uk;
    const named = atlas.groups()
      .map((g) => ({ ...g, muscles: atlas.groupMuscles(g.id) }))
      .filter((g) => g.muscles.length);
    return `
      <h2>${t('search.groups')}</h2>${named.map((g) => `
        <div class="group"><div class="group-name">${g[state.lang]}</div>
          <ul>${g.muscles.map(muscleRow).join('')}</ul></div>`).join('')}
      <h2>${t('search.exercises')}</h2><ul>${atlas.exercises()
        .map((e) => exerciseRow(e, `${t('search.agonist')}: ${agonistOf(e)}`)).join('')}</ul>`;
  }

  /** The list above the search field: the index while empty, results once typed. */
  function list(t) {
    if (!state.browsing) return '';
    return query.value.trim() ? found(t, query.value) : index(t);
  }

  function found(t, text) {
    const r = atlas.search(text);
    if (!text.trim()) return '';
    if (!r.groups.length && !r.muscles.length && !r.exercises.length) return `<p>${t('search.empty')}</p>`;
    const agonistOf = (e) => atlas.exerciseMuscles(e.id)[0].muscle.uk;
    return `
      ${r.groups.length ? `<h2>${t('search.groups')}</h2>${r.groups.map((g) => `
        <div class="group"><div class="group-name">${g[state.lang]}</div>
          <ul>${g.muscles.map(muscleRow).join('')}</ul></div>`).join('')}` : ''}
      ${r.muscles.length ? `<h2>${t('search.muscles')}</h2><ul>${r.muscles.map(muscleRow).join('')}</ul>` : ''}
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
    const signature = `${location.hash}|${state.lang}|${depth}`;
    if (signature === drawn) return;
    drawn = signature;

    const t = translator(state.lang);
    const here = route();
    const open = here.screen !== 'map';

    document.documentElement.lang = state.lang;
    el('title').textContent = t('app.title');
    el('lang').textContent = t('lang.other');
    el('lang').setAttribute('aria-label', t('lang.switch'));
    el('stage').setAttribute('aria-label', t('map.label'));
    el('hint-tap').textContent = t('map.hint');
    el('hint-legend').textContent = t('map.legend');
    query.placeholder = t('search.placeholder');
    query.setAttribute('aria-label', t('search.label'));
    if (!open) el('flip').textContent = t(`view.${VIEWS.find((v) => v !== here.view)}`);
    document.body.classList.toggle('open', open);
    document.body.classList.toggle('folded', open && state.folded);
    if (location.hash !== zoomedAt) {
      zoomed = false;
      zoomedAt = location.hash;
      document.body.classList.remove('zoomed');
    }
    el('fit').textContent = t('zoom.reset');
    document.body.dataset.screen = here.screen;

    const views = sidesFor(here);
    sides.replaceChildren(
      ...views.map((view) => {
        const host = document.createElement('div');
        host.className = 'side';
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

    // A new Muscle or Exercise starts its sheet where this step was left — the
    // top for a fresh one, the bookmark on the way back; a language switch
    // on the same one keeps the reader where they were.
    const key = open ? `${here.screen}/${here.id}` : '';
    if (here.screen === 'muscle') sheet.innerHTML = muscleSheet(t, here.id);
    if (here.screen === 'exercise') sheet.innerHTML = exerciseSheet(t, here.id);
    if (key !== shown) sheet.scrollTop = history.state?.scroll ?? 0;
    shown = key;

    // The map shows the search this step was left with: empty for a fresh one.
    if (!open && document.activeElement !== query) {
      query.value = history.state?.query ?? '';
      state.browsing = Boolean(query.value); // back to the results this step was left with
    }
    results.innerHTML = open ? '' : list(t);
    requestAnimationFrame(settle);
  }

  // ── Events ──────────────────────────────────────────────────────────────

  el('lang').addEventListener('click', () => {
    state.lang = otherLang(state.lang);
    render();
  });

  // Turning the figure is not a step to go back to: it replaces the address.
  el('flip').addEventListener('click', () => {
    const here = route();
    history.replaceState(history.state, '', `#/${VIEWS.find((v) => v !== here.view)}`);
    render();
  });

  // Only the list redraws while typing: redrawing the page would drop the
  // caret out of the field on every letter.
  const showList = () => {
    state.browsing = true;
    results.innerHTML = list(translator(state.lang));
  };
  query.addEventListener('input', showList);
  // A tap on the empty field is already a starting point: the whole index.
  query.addEventListener('focus', showList);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.browsing) {
      state.browsing = false;
      results.innerHTML = '';
      query.blur();
    }
  });

  function fold(folded) {
    state.folded = folded;
    drawn = ''; // same screen, new shape: draw it again
    render();
  }

  // A sheet is moved by the finger, the way every phone sheet is: down from
  // its top folds it, up unfolds it. Lower in a scrolled list a downward
  // swipe is reading, so it scrolls instead.
  let pull = null;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      const fromTop = e.target.closest('.grip, .sheet-top') || sheet.scrollTop <= 0 || state.folded;
      pull = e.touches.length === 1 && fromTop ? { y: e.touches[0].clientY, dy: 0, active: false } : null;
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
        const folding = dy > 0 && !state.folded;
        const unfolding = dy < 0 && state.folded;
        if (!folding && !unfolding) return (pull = null); // the list scrolling
        pull.active = true;
        sheet.classList.add('dragging');
      }
      e.preventDefault();
      pull.dy = dy;
      // Unfolded, the sheet follows the finger down; folded, it is too short to follow.
      if (!state.folded) sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    },
    { passive: false },
  );
  const release = () => {
    const done = pull?.active ? pull.dy : 0;
    pull = null;
    sheet.classList.remove('dragging');
    sheet.style.transform = '';
    if (!state.folded && done > 60) fold(true);
    else if (state.folded && done < -30) fold(false);
  };
  sheet.addEventListener('touchend', release);
  sheet.addEventListener('touchcancel', release);

  // A folded sheet is a handle as a whole: a tap anywhere on it but its
  // buttons opens it again.
  sheet.addEventListener('click', (e) => {
    if (state.folded && !e.target.closest('button')) fold(false);
  });

  // One listener for every row and button in the sheet and the results.
  document.addEventListener('click', (event) => {
    // A tap anywhere outside the search puts its list away.
    if (state.browsing && !event.target.closest?.('#find')) {
      state.browsing = false;
      results.innerHTML = '';
    }
    const target = event.target.closest?.('[data-muscle-id], [data-exercise], [data-act]');
    if (!target) return;
    if (target.dataset.act === 'back') return history.back();
    if (target.dataset.act === 'fold') return fold(!state.folded);
    if (target.dataset.act === 'fit') {
      zoomed = false;
      document.body.classList.remove('zoomed');
      return settle();
    }
    if (target.dataset.act === 'whole') {
      const side = sides.firstElementChild?.querySelector('svg')?.dataset.view ?? VIEWS[0];
      return go(`#/${side}`);
    }
    // Leaving the search for a result: let the keyboard go. The query stays in
    // the step we leave, so Back returns to the same results.
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
  render();
}
