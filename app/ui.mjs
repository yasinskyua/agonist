// The glue between the atlas and the screen: it inlines the two SVGs into the
// pinned map, draws the page for the address, and keeps the way back.
// There is deliberately no logic here — every answer comes from `atlas.mjs`,
// and what a screen says comes from `screens.mjs`.
//
// The module does not touch `document` on import; everything starts at
// `start()`. That is what lets the tap-zone geometry be checked in Node
// without emulating a DOM.

import { createAtlas } from './atlas.mjs';
import { translator, otherLang, loadLang, saveLang } from './i18n.mjs';
import { icon } from './icons.mjs';
import { parseRoute, muscleHref, HOME, GAME } from './route.mjs';
import { pageTopHtml, pageListHtml, paintRules, litRules } from './screens.mjs';
import { pickRow, roomAtEnd, LINE_GAP } from './spy.mjs';

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

  // A Muscle with no Exercises has nothing to show, so it is not tappable on
  // the map. Search still opens it: its name and Function are worth it.
  const withExercises = new Set(
    atlas.muscles().map((m) => m.id).filter((id) => atlas.muscleExercises(id).length > 0),
  );

  const el = (id) => document.getElementById(id);
  const map = el('map');
  const top = el('top');
  const list = el('list');
  const all = map.querySelector('.all');

  /** The finger minimum. One source: the CSS that sizes the buttons too. */
  const minTapPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tap'));

  /** Whether the pointer is a finger. A mouse is hurt by help it did not need. */
  const coarsePointer = matchMedia('(pointer: coarse)');

  // Only the language is remembered between launches. The screen lives in the
  // address, so a link to a Muscle survives being sent to another Trainer.
  const storage = () => localStorage;
  const state = { lang: loadLang(storage), query: '' };

  // Each step keeps where it was read to; Back puts it there again. The browser
  // would do it after the fact, and after our own redraw, so it is told not to.
  history.scrollRestoration = 'manual';

  // ── The map ─────────────────────────────────────────────────────────────

  for (const view of VIEWS) {
    const fig = map.querySelector(`[data-view="${view}"]`);
    fig.innerHTML = svgSources[VIEWS.indexOf(view)];
    const svg = fig.firstElementChild;
    // Hundreds of unnamed paths say nothing to a screen reader; the figure is
    // one picture with a name. Every Muscle is reachable by name in search.
    svg.setAttribute('role', 'img');
    // A path whose Muscles all lack Exercises invites no tap: not by colour,
    // not by reacting. Decided per path, because on the neck one path is two
    // Muscles and only one of them may be live.
    for (const path of svg.querySelectorAll('[data-muscle]')) {
      path.classList.toggle('live', musclesOf(path).some((id) => withExercises.has(id)));
    }
  }

  map.addEventListener('click', (event) => {
    const path = event.target.closest?.('[data-muscle]');
    const id = path && musclesOf(path).find((m) => withExercises.has(m));
    if (id) go(muscleHref(id));
  });

  // A Muscle's box in viewBox units does not move with the layout, and the SVG
  // is fixed for the session, so each is measured once per figure.
  const boxes = new WeakMap();

  /** Where a Muscle sits on one figure, in viewBox units. */
  function boxOn(svg, id) {
    if (!boxes.has(svg)) boxes.set(svg, new Map());
    const known = boxes.get(svg);
    let box = known.get(id);
    if (box === undefined) {
      const paths = [...svg.querySelectorAll(`path[data-muscle~="${id}"][fill]`)];
      box = paths.length ? union(paths.map((p) => p.getBBox())) : null;
      // A figure that is not on screen measures 0 x 0: ask again later.
      if (!box || box.width || box.height) known.set(id, box);
    }
    return box && (box.width || box.height) ? box : null;
  }

  /**
   * Tap zones over the figure, recomputed whenever its size changes: 44 px is
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
      const box = boxOn(svg, id);
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

  /** Tap zones measure every Muscle, so they wait until the map stops resizing. */
  let zoning;
  function rezone() {
    clearTimeout(zoning);
    zoning = setTimeout(() => {
      for (const svg of map.querySelectorAll('svg')) layTapZones(svg);
    }, 150);
  }

  new ResizeObserver(rezone).observe(map);
  // Plugging in a mouse, or picking the tablet up off its keyboard, changes
  // what the tap targets should be.
  coarsePointer.addEventListener('change', rezone);

  // ── Steps ───────────────────────────────────────────────────────────────

  // Every step is a history entry that remembers how deep it is, so the phone's
  // Back and the edge swipe work as the app's own Back does.
  const depth = () => history.state?.depth ?? 0;

  /** Move to another screen, leaving a bookmark in the step we leave: how far it was read, and the search. */
  function go(hash) {
    if (hash === location.hash) return;
    history.replaceState({ ...history.state, scroll: scrollY, query: state.query }, '');
    history.pushState({ depth: depth() + 1 }, '', hash);
    render();
  }

  /**
   * Home is a fresh step, not a place in the history: it takes over the entry it
   * stands on, so Back from it leaves the app instead of walking through screens
   * that are gone.
   */
  function showHome() {
    history.replaceState({ depth: 0 }, '', HOME);
    shown = drawn = '';
    render();
  }

  let unwinding = false;
  function goHome() {
    // Home unwinds the history to the step the app began at; `popstate` then
    // makes that step home.
    if (depth() > 0) {
      unwinding = true;
      return history.go(-depth());
    }
    showHome();
  }

  /** Back one step; with none to go back to — a link opened cold — to home. */
  const goBack = () => (depth() > 0 ? history.back() : showHome());

  // ── Render ──────────────────────────────────────────────────────────────

  let shown = ''; // the screen on display: a language switch is not a new screen
  let drawn = ''; // …and what exactly was drawn, so one step is drawn once

  function render() {
    // Going back fires both popstate and hashchange; one screen, one drawing,
    // or a screen reader reads the page out twice.
    const signature = `${location.hash}|${state.lang}|${depth()}`;
    if (signature === drawn) return;
    drawn = signature;

    // The list is about to be replaced, and the row that was lit with it.
    unlight();

    const here = parseRoute(location.hash, atlas);
    const key = `${here.screen}/${here.id ?? ''}`;
    const fresh = key !== shown;
    shown = key;
    const t = translator(state.lang);

    // A step opens where it was left — the top for a new one, the bookmark on
    // the way back, with the search it had. A language switch keeps the reader
    // where they were.
    if (fresh) state.query = here.screen === 'home' ? (history.state?.query ?? '') : '';

    document.documentElement.lang = state.lang;
    el('brand').setAttribute('aria-label', `Agonist: ${t('home')}`);
    el('play').textContent = t('flash.enter');
    el('lang').textContent = t('lang.other');
    all.textContent = t('spy.all');
    // The spoken name starts with what is printed on it, so «tap EN» works.
    el('lang').setAttribute('aria-label', `${t('lang.other')}: ${t('lang.switch')}`);
    map.setAttribute('aria-label', t('map.label'));
    for (const svg of map.querySelectorAll('svg')) {
      svg.setAttribute('aria-label', `${t('map.label')}, ${t(`view.${svg.parentElement.dataset.view}`).toLowerCase()}`);
    }

    el('page').dataset.screen = here.screen;
    top.innerHTML = pageTopHtml(t, state.lang, atlas, here);
    if (el('q')) el('q').value = state.query;
    syncSearch();
    list.innerHTML = pageListHtml(t, state.lang, atlas, here, state.query);

    const paint = paintRules(atlas, here);
    el('paint').textContent = paint;
    map.classList.toggle('painted', Boolean(paint));

    // Back is always where the thumb is, except on home, which has none. Two or
    // more steps in, a shortcut home stands beside it.
    el('bottom').innerHTML =
      here.screen === 'home'
        ? ''
        : `<button class="ic" type="button" data-act="back" aria-label="${t('back')}">${icon('back')}</button>${
            depth() >= 2 ? `<button class="ic" type="button" data-act="home" aria-label="${t('home')}">${icon('home')}</button>` : ''
          }`;

    // Before the scroll below: the page has to be tall enough to reach the place
    // the step was left at.
    makeRoom();

    if (fresh) {
      scrollTo(0, history.state?.scroll ?? 0);
      settled = scrollY;
      // The row that was pressed is gone with the old page; without this the
      // keyboard's place falls back to the top of the page and a screen reader
      // says nothing. The new page's heading takes it.
      if (document.activeElement === document.body || !document.activeElement) {
        top.querySelector('h1')?.focus({ preventScroll: true });
      }
    }
  }

  // ── The row being read ──────────────────────────────────────────────────

  // Nothing is lit until the Trainer scrolls: a screen opens showing all it has.
  let lit = null; // the row on the line now
  let scrolled = false;
  let settled = null; // where our own scrollTo put the page: that scroll event is not the Trainer's
  let frame = null;

  /** Where the map's bottom edge is when it is pinned, whatever the scroll. */
  const pinnedBottom = () => (parseFloat(getComputedStyle(map).top) || 0) + map.offsetHeight;

  /** The list ends with room, so the last row can be scrolled up to the line as well. */
  function makeRoom() {
    const last = [...list.querySelectorAll('.row')].at(-1);
    if (!last || !map.offsetHeight) {
      list.style.paddingBottom = '';
      return;
    }
    // The room already there is taken out of the measure rather than removed and
    // put back: with it gone the page is shorter for a moment, and a Trainer at
    // the bottom of it would be thrown up the page by the browser.
    const had = parseFloat(list.style.paddingBottom) || 0;
    const box = last.getBoundingClientRect();
    const tail = el('page').getBoundingClientRect().bottom - (box.top + box.height / 2) - had;
    list.style.paddingBottom = `${roomAtEnd({ viewport: innerHeight, line: pinnedBottom() + LINE_GAP, tail })}px`;
  }
  addEventListener('resize', makeRoom);

  /** What a row is about: its Muscle (in its Role, if it has one) or its Exercise. */
  const lightsOf = ({ dataset: d }) => (d.exercise ? { exercise: d.exercise } : { muscle: d.muscle, role: d.role });

  function light(row) {
    if (row === lit) return;
    lit?.classList.remove('lit');
    lit = row;
    row?.classList.add('lit');
    el('lit').textContent = row ? litRules(atlas, lightsOf(row)) : '';
    all.hidden = !row;
  }

  /** The whole picture again, until the next scroll. */
  function unlight() {
    light(null);
    scrolled = false;
  }

  function read() {
    frame = null;
    const rows = [...list.querySelectorAll('.row')];
    if (!scrolled || !rows.length || !map.offsetHeight) return;
    // Back at the top of the page: the screen shows all it has again.
    if (scrollY < 8) return unlight();
    light(rows[pickRow(rows.map((r) => r.getBoundingClientRect()), map.getBoundingClientRect().bottom)] ?? null);
  }

  addEventListener(
    'scroll',
    () => {
      const ours = scrollY === settled;
      settled = null;
      if (ours) return;
      scrolled = true;
      frame ??= requestAnimationFrame(read);
    },
    { passive: true },
  );

  // ── Search ──────────────────────────────────────────────────────────────

  /** The clear button shows once there is something to clear. */
  const syncSearch = () => {
    const clear = top.querySelector('.clear');
    if (clear) clear.hidden = !state.query;
  };

  /** Only the list redraws while typing: redrawing the page would drop the caret on every letter. */
  function search(query) {
    state.query = query;
    const t = translator(state.lang);
    unlight();
    list.innerHTML = pageListHtml(t, state.lang, atlas, { screen: 'home' }, query);
    makeRoom();
    el('status').textContent = query.trim() ? `${t('search.count')}: ${list.querySelectorAll('.row').length}` : '';
    syncSearch();
  }

  top.addEventListener('input', (event) => {
    if (event.target.id === 'q') search(event.target.value);
  });

  // Enter is the keyboard's «Search»: the results are what it is for, and they
  // are under the keys until it goes.
  top.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.id === 'q') event.target.blur();
  });

  function clearSearch() {
    el('q').value = '';
    el('q').focus();
    search('');
  }

  // ── Events ──────────────────────────────────────────────────────────────

  const ACTIONS = {
    back: goBack,
    home: goHome,
    all: unlight,
    play: () => go(GAME),
    clear: clearSearch,
    lang() {
      state.lang = otherLang(state.lang);
      saveLang(storage, state.lang);
      render();
    },
  };

  // One listener for every row and button on the page.
  document.addEventListener('click', (event) => {
    const target = event.target.closest?.('a[href^="#/"], [data-act]');
    if (!target) return;
    if (!target.matches('a')) return ACTIONS[target.dataset.act]();
    // Cmd/Ctrl/Shift-click on a row is the browser's own: a new tab or window.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // Leaving the search for a result lets the keyboard go. The query stays in
    // the step we leave, so Back returns to the same results.
    event.preventDefault();
    document.activeElement?.blur?.();
    go(target.getAttribute('href'));
  });

  addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (event.target.id === 'q' && event.target.value) return clearSearch();
    if (parseRoute(location.hash, atlas).screen !== 'home') goBack();
  });

  addEventListener('popstate', () => {
    if (unwinding) {
      unwinding = false;
      return showHome();
    }
    render();
  });
  addEventListener('hashchange', () => {
    // An address typed by hand arrives without our state; count it as a step
    // so Back stays on screen.
    if (!history.state) history.replaceState({ depth: Number(drawn.split('|')[2] ?? 0) + 1 }, '');
    render();
  });

  render();
}
