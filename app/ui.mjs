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
import { pageTopHtml, pageListHtml, paintRules, litRules, pageLights, openingSide } from './screens.mjs';
import { pickRow, roomAtEnd, LINE_GAP } from './spy.mjs';
import { IDENTITY, isZoomed, clampPan, zoomAt, pinch, panBy, frameOn } from './zoom.mjs';

const VIEWS = ['front', 'back'];
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Two taps this close are a double tap; the first one's Muscle waits to see. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_ZOOM = 2.5;
/** What a button step zooms by. */
const STEP = 1.6;
/** A trackpad pinch's wheel ticks that make the map grow by a factor of e. */
const WHEEL_PER_E = 100;
/** A finger that moved more than this has dragged: it did not tap. */
const DRAG_SLOP = 6;

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
  const dock = el('dock'); // the map's place on the page, which the map leaves when it fills the screen
  const mapbar = el('mapbar');
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

  /**
   * The Muscle under a tap. What is drawn under the finger wins; a tap zone only
   * catches what fell beside it. Zones are a finger wide, on a figure not much
   * wider than five fingers: let them outrank the picture and the small Muscles'
   * zones swallow the middle of the big ones (measured: 33 taps in 54, on a
   * point lying on the Muscle, went to a neighbour).
   */
  function muscleAt(x, y) {
    const under = document.elementsFromPoint(x, y).filter((e) => e.matches('#map [data-muscle]'));
    const hit = under.find((e) => !e.matches('rect.tap')) ?? under[0];
    return hit && musclesOf(hit).find((m) => withExercises.has(m));
  }

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
   * Screen pixels per viewBox unit, the map's zoom included. Read off the figure's
   * box rather than `getScreenCTM`, which not every browser gives the CSS
   * transform of an ancestor to.
   */
  function pixelsPerUnit(svg) {
    const { width, height } = svg.getBoundingClientRect();
    const { baseVal: box } = svg.viewBox;
    return Math.min(width / box.width, height / box.height);
  }

  /**
   * Tap zones over the figure, recomputed whenever its size or the zoom changes:
   * 44 px is screen pixels, while a Muscle's box lives in viewBox units.
   *
   * Only for a finger. A mouse points where it points: a zone wide enough for
   * a thumb sits over the Muscles beside a thin one and takes their clicks, so
   * on a mouse the path itself is the target and a 7 px Muscle is hit exactly.
   *
   * ponytail: a zone only catches taps that land on no Muscle (see `muscleAt`),
   * so a Muscle narrower than a finger, lying between bigger ones, is hit only
   * by aiming at it. Zooming the map is what makes it easy: the zones shrink as
   * the map grows, until only the Muscles still narrower than a finger have one.
   */
  function layTapZones(svg) {
    for (const zone of svg.querySelectorAll('rect.tap')) zone.remove();
    const scale = coarsePointer.matches && pixelsPerUnit(svg);
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
      for (const svg of map.querySelectorAll('.fig svg')) layTapZones(svg);
    }, 150);
  }

  // Plugging in a mouse, or picking the tablet up off its keyboard, changes
  // what the tap targets should be.
  coarsePointer.addEventListener('change', rezone);

  // ── Zoom ────────────────────────────────────────────────────────────────

  const layer = map.querySelector('.layer');
  const fit = map.querySelector('[data-act="fit"]');
  const zoomIn = map.querySelector('[data-act="zoom-in"]');
  const zoomOut = map.querySelector('[data-act="zoom-out"]');
  const hideMap = map.querySelector('[data-act="hide-map"]');
  const fullMap = map.querySelector('[data-act="full-map"]');
  const closeMap = map.querySelector('[data-act="close-map"]');
  const sides = [...map.querySelectorAll('[data-act="side"]')];
  const pickBar = map.querySelector('.pick');
  const openPick = pickBar.querySelector('button');
  let zoom = IDENTITY;

  for (const [button, name] of [[fit, 'fit'], [zoomIn, 'plus'], [zoomOut, 'minus'], [hideMap, 'up'], [fullMap, 'full'], [closeMap, 'close']]) {
    button.innerHTML = icon(name);
  }

  const mapSize = () => ({ width: map.clientWidth, height: map.clientHeight });
  /** A point of the page in the map's own pixels. */
  function local({ x, y }) {
    const box = map.getBoundingClientRect();
    return { x: x - box.left, y: y - box.top };
  }

  /** Draw a zoom. `glide` eases the step (buttons, double tap, framing); a finger moves the map at once. */
  function show(next, glide = false) {
    zoom = next;
    layer.classList.toggle('glide', glide);
    layer.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
    fit.hidden = !isZoomed(zoom);
    map.classList.toggle('zoomed', !fit.hidden);
    // The button that was just pressed is gone; the keyboard's place goes to its neighbour.
    if (fit.hidden && document.activeElement === fit) zoomIn.focus();
    // The tap zones are measured in screen pixels, which zooming has just changed.
    rezone();
  }

  const zoomBy = (factor) => {
    const size = mapSize();
    show(zoomAt(zoom, factor, { x: size.width / 2, y: size.height / 2 }, size), true);
  };

  // A step that glides is measured again where it ends up, not on the way.
  layer.addEventListener('transitionend', rezone);

  // The map's size changes with the phone's turning: keep the body inside it.
  new ResizeObserver(() => {
    const fitted = clampPan(zoom, mapSize());
    if (fitted.x === zoom.x && fitted.y === zoom.y) return rezone();
    show(fitted);
  }).observe(map);

  /**
   * A Muscle page opens already on its Muscle, if it is small: on the side it is
   * drawn (one drawn on both would span the whole map), measured on the whole
   * body, which is how the map stands when a page opens.
   */
  function frameMuscle(id) {
    const side = atlas.muscle(id).views[0];
    const drawn = [...map.querySelectorAll(`[data-view="${side}"] path[data-muscle~="${id}"][fill]`)];
    const mine = map.getBoundingClientRect();
    if (!drawn.length || !mine.width) return;
    const box = union(drawn.map((p) => p.getBoundingClientRect()));
    show(frameOn({ ...box, x: box.x - mine.left, y: box.y - mine.top }, mapSize()), true);
  }

  /** The map as a screen opens it: the whole body, or on a Muscle's page glided onto the Muscle. */
  function restoreView(here = parseRoute(location.hash, atlas)) {
    show(IDENTITY);
    if (here.screen === 'muscle') frameMuscle(here.id);
  }

  // Fingers on the map: one drags a zoomed map, two pinch. A drag is not a tap.
  // A map that is not zoomed leaves one finger's vertical drag to the browser
  // (`touch-action: pan-y`), so the page scrolls under it as it does anywhere.
  //
  // ponytail: a pinch that starts with a slip upward is taken by the browser as a
  // scroll, and that gesture is lost; the Trainer lifts and pinches again.
  const fingers = new Map(); // pointer id → where it is on the page
  let downAt = null;
  let dragged = false;

  /** A drag is not a tap: not this gesture's own, and not one still waiting for its double. */
  function drag() {
    dragged = true;
    clearTimeout(pendingTap);
    pendingTap = null;
  }

  map.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, .pick')) return;
    fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (fingers.size === 1) {
      downAt = { x: event.clientX, y: event.clientY };
      dragged = false;
    }
  });

  addEventListener('pointermove', (event) => {
    const was = fingers.get(event.pointerId);
    if (!was) return;
    const now = { x: event.clientX, y: event.clientY };
    const pair = fingers.size === 2 ? [...fingers.values()].map(local) : null;
    fingers.set(event.pointerId, now);

    if (fingers.size > 1) {
      drag();
      if (pair) show(pinch(zoom, pair, [...fingers.values()].map(local), mapSize()));
      return;
    }
    if (Math.hypot(now.x - downAt.x, now.y - downAt.y) > DRAG_SLOP) drag();
    if (isZoomed(zoom)) show(panBy(zoom, now.x - was.x, now.y - was.y, mapSize()));
  });

  const lift = (event) => fingers.delete(event.pointerId);
  addEventListener('pointerup', lift);
  addEventListener('pointercancel', lift);

  // A trackpad pinch arrives as a wheel with the ctrl key held.
  map.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      show(zoomAt(zoom, Math.exp(-event.deltaY / WHEEL_PER_E), local({ x: event.clientX, y: event.clientY }), mapSize()));
    },
    { passive: false },
  );

  // Safari on a Mac sends it as gesture events instead. Fingers on a screen are
  // already handled above, so those are told apart by having fingers down.
  let gestured = 1;
  map.addEventListener('gesturestart', (event) => {
    event.preventDefault();
    gestured = 1;
  });
  map.addEventListener('gesturechange', (event) => {
    event.preventDefault();
    if (!fingers.size) show(zoomAt(zoom, event.scale / gestured, local({ x: event.clientX, y: event.clientY }), mapSize()));
    gestured = event.scale;
  });

  /** The first tap of a double tap, waiting to see whether a second follows. */
  let pendingTap = null;

  map.addEventListener('click', (event) => {
    // The map holds buttons of its own: what lies under them is not tapped.
    if (!event.target.closest('.fig') || dragged) return;
    if (pendingTap) {
      clearTimeout(pendingTap);
      pendingTap = null;
      return show(isZoomed(zoom) ? IDENTITY : zoomAt(zoom, DOUBLE_TAP_ZOOM, local({ x: event.clientX, y: event.clientY }), mapSize()), true);
    }
    const id = muscleAt(event.clientX, event.clientY);
    pendingTap = setTimeout(() => {
      pendingTap = null;
      // Expanded, a tap only picks — a miss costs one more tap, not a trip to the wrong page.
      if (full) return pick(id);
      if (id) go(muscleHref(id));
    }, DOUBLE_TAP_MS);
  });

  // ── Steps ───────────────────────────────────────────────────────────────

  // Every step is a history entry that remembers how deep it is, so the phone's
  // Back and the edge swipe work as the app's own Back does.
  const depth = () => history.state?.depth ?? 0;

  /**
   * Move to another screen, leaving a bookmark in the step we leave: how far it
   * was read, and the search. From the expanded map the new screen takes over the
   * map's own step (the screen it opened on already holds the bookmark), so Back
   * returns to that screen and not to a map that is gone.
   */
  function go(hash) {
    if (hash === location.hash) {
      // The page we are on: there is nothing to open, only the map to close.
      if (full) history.back();
      return;
    }
    history.replaceState({ ...history.state, scroll: scrollY, query: state.query }, '');
    if (full) history.replaceState({ depth: depth() }, '', hash);
    else history.pushState({ depth: depth() + 1 }, '', hash);
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
    // Drawing a screen ends the expanded map, however we came to it.
    if (full && !history.state?.full) setFull(false);

    // Going back fires both popstate and hashchange; one screen, one drawing,
    // or a screen reader reads the page out twice.
    // The expanded map is a step, but not a screen: it does not make one deeper.
    const steps = depth() - (history.state?.full ? 1 : 0);
    const signature = `${location.hash}|${state.lang}|${steps}`;
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
    for (const [button, key] of [[fit, 'zoom.fit'], [zoomIn, 'zoom.in'], [zoomOut, 'zoom.out'], [hideMap, 'map.hide'], [fullMap, 'map.full'], [closeMap, 'map.close']]) {
      button.setAttribute('aria-label', t(key));
    }
    mapbar.innerHTML = `${icon('down')}${t('map.show')}`;
    map.querySelector('.seg').setAttribute('aria-label', t('view.label'));
    for (const button of sides) button.textContent = t(`view.${button.dataset.side}`);
    openPick.textContent = t('pick.open');
    for (const svg of map.querySelectorAll('.fig svg')) {
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
            steps >= 2 ? `<button class="ic" type="button" data-act="home" aria-label="${t('home')}">${icon('home')}</button>` : ''
          }`;

    // Before the scroll below: the page has to be tall enough to reach the place
    // the step was left at.
    makeRoom();

    if (fresh) {
      // A step opens on the whole body — or, on a Muscle's page, glides onto the
      // Muscle. A tap still waiting for its double is for the screen we leave.
      clearTimeout(pendingTap);
      pendingTap = null;
      restoreView(here);
      scrollTo(0, history.state?.scroll ?? 0);
      settled = scrollY;
      // The row that was pressed is gone with the old page; without this the
      // keyboard's place falls back to the top of the page and a screen reader
      // says nothing. The new page's heading takes it.
      if (document.activeElement === document.body || !document.activeElement || map.contains(document.activeElement)) {
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
  const pinnedBottom = () => (parseFloat(getComputedStyle(dock).top) || 0) + dock.offsetHeight;

  /** The list ends with room, so the last row can be scrolled up to the line as well. */
  function makeRoom() {
    const last = [...list.querySelectorAll('.row')].at(-1);
    if (!last || !dock.offsetHeight) {
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
    paintLit();
    all.hidden = !row;
  }

  /** The row being read lights its Muscles; a Muscle picked on the expanded map lights over it. */
  function paintLit() {
    const lights = picked ? { muscle: picked } : lit && lightsOf(lit);
    el('lit').textContent = lights ? litRules(atlas, lights) : '';
  }

  /** The whole picture again, until the next scroll. */
  function unlight() {
    light(null);
    scrolled = false;
  }

  function read() {
    frame = null;
    const rows = [...list.querySelectorAll('.row')];
    if (full || !scrolled || !rows.length || !dock.offsetHeight) return;
    // Back at the top of the page: the screen shows all it has again.
    if (scrollY < 8) return unlight();
    light(rows[pickRow(rows.map((r) => r.getBoundingClientRect()), dock.getBoundingClientRect().bottom)] ?? null);
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

  // ── Hidden, and on the whole screen ─────────────────────────────────────

  let full = false; // the map fills the screen: a history step of its own
  let picked = null; // the Muscle a tap chose there, waiting for «Open»

  /** What the expanded map covers: nothing under it may be reached, by finger or by reader. */
  const covered = [el('bar'), mapbar, top, list];

  /** Hide the map down to its strip, or bring it back. The choice stays across screens. */
  function setHidden(hidden) {
    dock.hidden = hidden;
    mapbar.hidden = !hidden;
    // No map, nothing to light: the rows go back to being rows.
    unlight();
    makeRoom();
    // The button that was pressed is gone; the keyboard goes to the one that took its place.
    (hidden ? mapbar : hideMap).focus({ preventScroll: true });
    if (hidden) show(IDENTITY);
    else restoreView();
  }

  /** Choose a Muscle on the expanded map (or, with `null`, choose none). */
  function pick(id) {
    picked = id ?? null;
    paintLit();
    pickBar.hidden = !picked;
    if (picked) pickBar.querySelector('b').textContent = atlas.muscle(picked).uk;
    map.classList.toggle('picking', Boolean(picked));
  }

  function setSide(side) {
    map.dataset.side = side;
    for (const button of sides) button.setAttribute('aria-pressed', String(button.dataset.side === side));
    // A pick on the side that just went away would be one nobody can see.
    pick(null);
    show(IDENTITY);
  }

  /** The map on the whole screen and back; the address does not change, so nothing is drawn anew. */
  function setFull(on) {
    if (on === full) return;
    full = on;
    // A tap still waiting for its double meant the other mode: it must not
    // open a page from the map that has just closed, or pick on the page.
    clearTimeout(pendingTap);
    pendingTap = null;
    document.documentElement.classList.toggle('full-map', on);
    for (const part of covered) part.inert = on;
    if (on) {
      // It opens where the screen has something lit: the row being read, or the page's own Muscles.
      const lights = lit ? lightsOf(lit) : pageLights(parseRoute(location.hash, atlas));
      setSide(lights ? openingSide(atlas, lights) : map.dataset.side);
      closeMap.focus({ preventScroll: true });
    } else {
      pick(null);
      restoreView();
      fullMap.focus({ preventScroll: true });
    }
  }

  /** Expanding is a step of history, so Back closes the map before it leaves the screen. */
  function openFull() {
    history.replaceState({ ...history.state, scroll: scrollY, query: state.query }, '');
    history.pushState({ depth: depth() + 1, full: true }, '');
    setFull(true);
  }

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
    'hide-map': () => setHidden(true),
    'show-map': () => setHidden(false),
    'full-map': openFull,
    'close-map': () => history.back(),
    side: (button) => setSide(button.dataset.side),
    'open-pick': () => go(muscleHref(picked)),
    fit: () => show(IDENTITY, true),
    'zoom-in': () => zoomBy(STEP),
    'zoom-out': () => zoomBy(1 / STEP),
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
    if (!target.matches('a')) return ACTIONS[target.dataset.act](target);
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
    if (full) return history.back();
    if (event.target.id === 'q' && event.target.value) return clearSearch();
    if (parseRoute(location.hash, atlas).screen !== 'home') goBack();
  });

  addEventListener('popstate', () => {
    if (unwinding) {
      unwinding = false;
      return showHome();
    }
    // The expanded map is a step of its own on the same screen: entering or
    // leaving it draws nothing anew.
    const wantsFull = Boolean(history.state?.full);
    if (wantsFull !== full && drawn.split('|')[0] === location.hash) return setFull(wantsFull);
    render();
  });
  addEventListener('hashchange', () => {
    // An address typed by hand arrives without our state; count it as a step
    // so Back stays on screen.
    if (!history.state) history.replaceState({ depth: Number(drawn.split('|')[2] ?? 0) + 1 }, '');
    render();
  });

  render();
  // A reload keeps the step it was on, the expanded map included.
  if (history.state?.full) setFull(true);
}
