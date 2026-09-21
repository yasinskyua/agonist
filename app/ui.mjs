// The glue between the atlas and the screen: it inlines the two SVGs, listens
// for taps and draws the Muscle panel. There is deliberately no logic here —
// every answer comes from `atlas.mjs`.
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
  const [muscles, groups, exercises, atlasIds, thanks, ...svgSources] = await Promise.all([
    json('content/muscles.json'),
    json('content/muscle-groups.json'),
    json('content/exercises.json'),
    json('assets/atlas/muscle-ids.json'),
    json('content/credits.json'),
    ...VIEWS.map((view) => text(`assets/atlas/${view}.svg`)),
  ]);

  const atlas = createAtlas({
    muscles: muscles.muscles,
    groups: groups.groups,
    exercises: exercises.exercises,
    atlasMuscles: atlasIds.muscles,
  });

  // A Muscle with no Exercises has nothing to show, so it is not interactive.
  const withExercises = new Set(
    atlas.muscles().map((m) => m.id).filter((id) => atlas.muscleExercises(id).length > 0),
  );

  const el = (id) => document.getElementById(id);
  const map = el('map');
  const panel = el('panel');
  const credits = el('credits');
  const highlight = el('highlight');

  /** The finger minimum. One source: the CSS that sizes the buttons too. */
  const minTapPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tap'));

  /** Whether the pointer is a finger. A mouse is hurt by help it did not need. */
  const coarsePointer = matchMedia('(pointer: coarse)');

  // Only the language is state. The screen lives in the hash, so a link to a
  // Muscle survives being sent to another Trainer, and GitHub Pages needs no
  // server configuration to serve it.
  const state = { lang: LANGS[0] };

  const hashFor = (view, muscle) => `#/${view}${muscle ? `/${muscle}` : ''}`;

  /** The screen the address bar asks for. Anything unknown falls back. */
  function route() {
    const [first, second] = location.hash.replace(/^#\/?/, '').split('/');
    if (first === 'credits') return { screen: 'credits' };

    // A Muscle id out of a URL is untrusted: a stale link must show the map,
    // not throw.
    const muscle = atlas.muscle(second) ? second : null;
    const asked = VIEWS.includes(first) ? first : VIEWS[0];
    // The Muscle wins over the side. On the dissected figure each Muscle is
    // drawn from one side only (ADR-0003), so a link naming a Muscle the
    // asked-for side cannot show would light nothing at all.
    const views = muscle ? atlas.muscle(muscle).views : [];

    return {
      screen: 'map',
      view: !muscle || views.includes(asked) ? asked : views[0],
      muscle,
    };
  }

  /** Where the Credits screen returns to. */
  let lastMap = hashFor(VIEWS[0], null);

  // ── The map ─────────────────────────────────────────────────────────────

  const figures = new Map();
  VIEWS.forEach((view, i) => {
    map.insertAdjacentHTML('beforeend', svgSources[i]);
    const svg = map.lastElementChild;
    svg.dataset.view = view;
    // A path whose Muscles all lack Exercises invites no tap: not by colour,
    // not by reacting. Decided per path, because on the neck one path is two
    // Muscles and only one of them may be live.
    for (const path of svg.querySelectorAll('[data-muscle]')) {
      path.classList.toggle('off', !musclesOf(path).some((id) => withExercises.has(id)));
    }
    figures.set(view, svg);
  });

  /** The first Muscle of a path that has something to show. */
  const muscleAt = (target) => {
    const path = target.closest?.('[data-muscle]');
    return path && musclesOf(path).find((id) => withExercises.has(id));
  };

  /**
   * Tap zones over the figure, recomputed on every resize: 44 px is screen
   * pixels, while a Muscle's box lives in viewBox units.
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
    const stale = svg.querySelectorAll('rect.tap');

    if (!coarsePointer.matches) {
      for (const zone of stale) zone.remove();
      return;
    }

    const scale = svg.getScreenCTM()?.a;
    if (!scale) return; // this view is hidden — we will measure when it shows

    for (const zone of stale) zone.remove();

    const min = minTapPx / scale;
    const small = [];

    for (const id of withExercises) {
      const paths = svg.querySelectorAll(`[data-muscle~="${id}"]`);
      if (!paths.length) continue; // this Muscle is not seen from this side

      const box = union([...paths].map((p) => p.getBBox()));
      if (box.width >= min && box.height >= min) continue; // a finger already hits it
      small.push({ id, box, area: box.width * box.height });
    }

    // The smallest go last, or a neighbour's zone would cover them.
    small.sort((a, b) => b.area - a.area);

    for (const { id, box } of small) {
      const zone = document.createElementNS(SVG_NS, 'rect');
      const { x, y, width, height } = expand(box, min);
      zone.setAttribute('class', 'tap');
      // No `fill` attribute, or the highlight rule would paint the zone itself.
      zone.setAttribute('data-muscle', id);
      Object.entries({ x, y, width, height }).forEach(([k, v]) => zone.setAttribute(k, v));
      svg.append(zone);
    }
  }

  new ResizeObserver(() => layTapZones(figures.get(route().view ?? VIEWS[0]))).observe(map);

  map.addEventListener('click', (event) => {
    const id = muscleAt(event.target);
    if (id) location.hash = hashFor(route().view, id);
  });

  // ── The Muscle panel ────────────────────────────────────────────────────

  function renderPanel(t, selected) {
    if (!selected) {
      panel.hidden = true;
      panel.textContent = '';
      return;
    }

    const muscle = atlas.muscle(selected);
    const byRole = new Map(ROLES.map((role) => [role, []]));
    for (const { exercise, role } of atlas.muscleExercises(muscle.id)) {
      byRole.get(role).push(exercise[state.lang]);
    }

    panel.hidden = false;
    panel.innerHTML = `
      <button class="close" type="button">${t('close')}</button>
      <h2>${muscle.uk}</h2>
      ${muscle.la ? `<p class="latin">${muscle.la}</p>` : ''}
      <p class="action">${muscle.action}</p>
      <h3>${t('exercises.heading')}</h3>
      ${ROLES.filter((role) => byRole.get(role).length)
        .map(
          (role) => `
        <section class="role" data-role="${role}">
          <h4>${t(`role.${role}`)}</h4>
          <ul>${byRole.get(role).map((name) => `<li>${name}</li>`).join('')}</ul>
        </section>`,
        )
        .join('')}`;

    panel.querySelector('.close').addEventListener('click', () => {
      location.hash = hashFor(route().view, null);
    });
  }

  // ── The Credits screen ──────────────────────────────────────────────────

  /**
   * Attribution is a licence obligation, so the rows come from
   * `content/credits.json` rather than from this file: one place to edit, and
   * `app/credits.test.mjs` fails if it drifts from `CREDITS.md`.
   */
  function renderCredits(t) {
    credits.innerHTML = `
      <button class="close" type="button">${t('close')}</button>
      <h2>${t('credits.link')}</h2>
      ${thanks.credits
        .map(
          (row) => `
        <section class="credit">
          <h3>${row.what[state.lang]}</h3>
          <p>${row.work} — ${row.author}</p>
          <p>
            <a href="${row.licenseUrl}" rel="license noopener noreferrer" target="_blank">${row.license}</a>
            · <a href="${row.sourceUrl}" rel="noopener noreferrer" target="_blank">${t('credits.source')}</a>
          </p>
        </section>`,
        )
        .join('')}
      <p class="note">${thanks.note[state.lang]}</p>`;

    credits.querySelector('.close').addEventListener('click', () => {
      location.hash = lastMap;
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  function render() {
    const t = translator(state.lang);
    const here = route();
    const onMap = here.screen === 'map';
    if (onMap) lastMap = hashFor(here.view, here.muscle);

    document.documentElement.lang = state.lang;
    el('title').textContent = t('app.title');
    map.setAttribute('aria-label', t('map.label'));
    el('hint').textContent = t('map.hint');
    el('hint').hidden = !onMap || Boolean(here.muscle);
    el('credits-link').textContent = t('credits.link');

    const lang = el('lang');
    lang.textContent = t('lang.other');
    lang.setAttribute('aria-label', t('lang.switch'));

    map.hidden = !onMap;
    el('views').hidden = !onMap;
    credits.hidden = onMap;
    if (!onMap) {
      panel.hidden = true;
      renderCredits(t);
      return;
    }

    for (const view of VIEWS) {
      const button = el(`view-${view}`);
      button.textContent = t(`view.${view}`);
      button.setAttribute('aria-pressed', String(view === here.view));
      // `hidden` as a property exists only on HTML elements; an SVG element
      // swallows it silently. Here it has to be the attribute.
      figures.get(view).toggleAttribute('hidden', view !== here.view);
    }
    el('views').setAttribute('aria-label', t('view.label'));

    // Highlighting is one rule rather than a walk over paths: `~=` because a
    // neck path belongs to two Muscles, `[fill]` to skip the outline twins
    // (filling a detail stroke would smear it) and the tap zones themselves.
    highlight.textContent = here.muscle
      ? `[data-muscle~="${here.muscle}"][fill] { fill: var(--highlight); }`
      : '';

    layTapZones(figures.get(here.view));
    renderPanel(t, here.muscle);
  }

  el('lang').addEventListener('click', () => {
    state.lang = otherLang(state.lang);
    render();
  });

  el('credits-link').addEventListener('click', () => {
    location.hash = '#/credits';
  });

  for (const view of VIEWS) {
    // Switching sides drops the open Muscle. Keeping it would be a lie: the
    // other side does not draw it, so the panel would claim a selection over
    // a figure with nothing lit.
    el(`view-${view}`).addEventListener('click', () => {
      location.hash = hashFor(view, null);
    });
  }

  addEventListener('hashchange', render);
  // Plugging in a mouse, or picking the tablet up off its keyboard, changes
  // what the tap targets should be.
  coarsePointer.addEventListener('change', render);
  render();
}
