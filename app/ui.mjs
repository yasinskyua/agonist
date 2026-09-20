// Клей між атласом і екраном: інлайнить два SVG, слухає тап, малює панель
// М'яза. Логіки тут навмисно немає — усі відповіді дає `atlas.mjs`.
//
// Модуль не чіпає `document` при імпорті: усе починається з `start()`. Саме
// тому геометрію зон тапу можна перевірити в Node без емуляції DOM.

import { createAtlas, ROLES } from './atlas.mjs';
import { LANGS, translator, otherLang } from './i18n.mjs';

/** Мінімальна зона під палець. Нижче цього тап промахується. */
const MIN_TAP_PX = 44;

const VIEWS = ['front', 'back'];

/** Рамка, що вкриває всі передані. М'яз — це кілька шляхів. */
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
 * Рамка, розтягнута до `min` по кожній стороні від свого центру. Тікет 02
 * заміряв, що 30 М'язів із 40 вужчі за палець; зона тапу тому окрема й
 * грубіша за шлях, який підсвічується.
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

const SVG_NS = 'http://www.w3.org/2000/svg';

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

  // М'яз без Вправ показувати нема чого, тож він і не інтерактивний.
  const live = new Set(
    atlas.muscles().map((m) => m.id).filter((id) => atlas.muscleExercises(id).length > 0),
  );

  const el = (id) => document.getElementById(id);
  const map = el('map');
  const panel = el('panel');
  const highlight = el('highlight');

  const state = { lang: LANGS[0], view: VIEWS[0], muscle: null };

  // ── Мапа ────────────────────────────────────────────────────────────────

  const figures = new Map();
  VIEWS.forEach((view, i) => {
    map.insertAdjacentHTML('beforeend', svgSources[i]);
    const svg = map.lastElementChild;
    svg.dataset.view = view;
    // Шлях, жоден М'яз якого не має Вправ, не запрошує до тапу: ні кольором,
    // ні реакцією. Перевіряємо пошляхово, бо на шиї один шлях — два М'язи.
    for (const path of svg.querySelectorAll('[data-muscle]')) {
      const ids = path.getAttribute('data-muscle').split(' ');
      path.classList.toggle('off', !ids.some((id) => live.has(id)));
    }
    figures.set(view, svg);
  });

  /** Перший М'яз шляху, який має що показати. */
  const muscleAt = (target) => {
    const path = target.closest?.('[data-muscle]');
    return path?.getAttribute('data-muscle').split(' ').find((id) => live.has(id));
  };

  /**
   * Зони тапу поверх фігури. Перераховуються при кожній зміні розміру:
   * 44 px — це екранні пікселі, а рамка М'яза живе в координатах viewBox.
   */
  function layTapZones(svg) {
    for (const zone of svg.querySelectorAll('rect.tap')) zone.remove();

    const scale = svg.getScreenCTM()?.a;
    if (!scale) return; // вид схований — порахуємо, коли покажуть

    const min = MIN_TAP_PX / scale;
    const small = [];

    for (const id of live) {
      const paths = svg.querySelectorAll(`[data-muscle~="${id}"]`);
      if (!paths.length) continue; // М'яза не видно з цього боку

      const box = union([...paths].map((p) => p.getBBox()));
      if (box.width >= min && box.height >= min) continue; // палець і так влучає
      small.push({ id, box, area: box.width * box.height });
    }

    // Найдрібніші кладемо останніми: інакше зона сусіда накриє їх зверху.
    small.sort((a, b) => b.area - a.area);

    for (const { id, box } of small) {
      const zone = document.createElementNS(SVG_NS, 'rect');
      const { x, y, width, height } = expand(box, min);
      zone.setAttribute('class', 'tap');
      // Без `fill`, інакше правило підсвічування пофарбувало б саму зону.
      zone.setAttribute('data-muscle', id);
      Object.entries({ x, y, width, height }).forEach(([k, v]) => zone.setAttribute(k, v));
      svg.append(zone);
    }
  }

  new ResizeObserver(() => layTapZones(figures.get(state.view))).observe(map);

  map.addEventListener('click', (event) => {
    const id = muscleAt(event.target);
    if (id) select(id);
  });

  // ── Панель М'яза ────────────────────────────────────────────────────────

  function renderPanel(t) {
    if (!state.muscle) {
      panel.hidden = true;
      panel.textContent = '';
      return;
    }

    const muscle = atlas.muscle(state.muscle);
    const byRole = new Map(ROLES.map((role) => [role, []]));
    for (const { exercise, role } of atlas.muscleExercises(muscle.id)) {
      byRole.get(role).push(exercise.en);
    }

    panel.hidden = false;
    panel.innerHTML = `
      <button class="close" type="button">${t('muscle.close')}</button>
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

    panel.querySelector('.close').addEventListener('click', () => select(null));
  }

  // ── Рендер ──────────────────────────────────────────────────────────────

  function render() {
    const t = translator(state.lang);

    document.documentElement.lang = state.lang;
    document.title = t('app.title');
    el('title').textContent = t('app.title');
    el('map-label').textContent = t('map.label');
    el('hint').textContent = t('map.hint');
    el('hint').hidden = Boolean(state.muscle);

    for (const view of VIEWS) {
      const button = el(`view-${view}`);
      button.textContent = t(`view.${view}`);
      button.setAttribute('aria-pressed', String(view === state.view));
      // `hidden` як властивість існує тільки в HTML-елементів, SVG його мовчки
      // проковтне: тут потрібен саме атрибут.
      figures.get(view).toggleAttribute('hidden', view !== state.view);
    }
    el('views').setAttribute('aria-label', t('view.label'));

    const lang = el('lang');
    lang.textContent = t('lang.other');
    lang.title = t('lang.switch');

    // Підсвічування — одне правило, а не обхід шляхів: `~=` бо шлях на шиї
    // належить двом М'язам. `[fill]` відсікає обвідні двійники й зони тапу.
    highlight.textContent = state.muscle
      ? `[data-muscle~="${state.muscle}"][fill] { fill: var(--highlight); }`
      : '';

    layTapZones(figures.get(state.view));
    renderPanel(t);
  }

  function select(id) {
    state.muscle = id;
    render();
    if (id) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  el('lang').addEventListener('click', () => {
    state.lang = otherLang(state.lang);
    render();
  });

  for (const view of VIEWS) {
    el(`view-${view}`).addEventListener('click', () => {
      state.view = view;
      render();
    });
  }

  render();
}
