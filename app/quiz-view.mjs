// The Quiz's three screens as markup: the Mode picker, a question, the summary.
// Pure functions from the Round to a string — no DOM, no state — so that the
// wiring in `ui.mjs` stays about events and the atlas figure.
//
// Names come from the atlas in the interface language: Muscles in Ukrainian
// everywhere, Exercises in `lang`.

import { ROLES } from './atlas.mjs';
import { MODES } from './quiz.mjs';

/** A streak is worth showing from two in a row, and worth summing up from three. */
export const STREAK_SHOWN = 2;
export const STREAK_PRAISED = 3;

const closeButton = (t) =>
  `<button class="g-close" type="button" data-g="close" aria-label="${t('close')}">✕</button>`;

/**
 * What the picked Muscle is in this Exercise. The line does not repeat the
 * Muscle's name: it is marked ✓ or ✗ right above, and a 57-letter name would
 * make the line as long as the room it has.
 */
export function explain(t, result) {
  return result.givenRole
    ? t('game.explain.role').replace('{role}', t(`role.${result.givenRole}`).toLowerCase())
    : t('game.explain.absent');
}

/** What a screen reader is told once an answer is in. */
export function announce(t, atlas, result) {
  // Heard, not seen: the marks on the options are not read out, so the names are.
  const picked = `${atlas.muscle(result.given).uk}. ${explain(t, result)}`;
  if (result.right) return `${t('game.right')}. ${picked}`;
  return `${t('game.wrong')}. ${picked} ${t('game.wrong.agonist')} ${atlas.muscle(result.answer).uk}.`;
}

export function pickerHtml(t) {
  return `
    <div class="g-bar"><h2 class="g-title" tabindex="-1">${t('game.enter')}</h2>${closeButton(t)}</div>
    <p class="g-lead">${t('game.pick.says')}</p>
    <div class="g-tiles">${MODES.map(
      (m) => `
      <button class="g-mode" type="button" data-g="start" data-mode="${m.id}" ${m.ready ? '' : 'disabled'}>
        <b>${t(`mode.${m.id}`)}</b>
        <small>${t(`mode.${m.id}.says`)}</small>
        ${m.ready ? '' : `<em class="g-soon">${t('game.soon')}</em>`}
      </button>`,
    ).join('')}</div>`;
}

const dots = (t, round) => `
  <div class="g-dots" role="img" aria-label="${t('game.question')} ${round.index + 1} ${t('game.of')} ${round.total}">
    ${round.results
      .map((r, i) => `<i data-r="${r ?? (i === round.index ? 'now' : '')}"></i>`)
      .join('')}
  </div>`;

/** A question: the top (progress, the question) and the under part (answers, verdict). */
export function roundHtml(t, lang, atlas, round, open = false) {
  const q = round.current;
  const result = round.result;
  const exercise = atlas.exercise(q.exercise);

  // One shape for the whole question, before the answer and after it: the
  // four options stay where they were (marked, not removed), the line under
  // them holds the prompt and then the verdict, and «Next» is always there —
  // idle until an answer is in. Nothing on screen appears, vanishes or resizes.
  const option = (id) => {
    const state = !result ? '' : id === q.answer ? 'ok' : id === result.given ? 'no' : 'dim';
    // A mark and, for a screen reader, words: colour alone says nothing to everyone.
    const mark = state === 'ok' ? '✓ ' : state === 'no' ? '✗ ' : '';
    return `<button class="g-opt ${state}" type="button" data-g="pick" data-id="${id}" ${result ? 'disabled' : ''}>${mark}${atlas.muscle(id).uk}</button>`;
  };

  // The legend sits over the map's corner, not in the panel: the map needs the height.
  const legend = result
    ? `<ul class="legend g-legend">${ROLES.filter((r) => result.roles.some((x) => x.role === r))
        .map((r) => `<li data-role="${r}">${t(`role.${r}`)}</li>`)
        .join('')}</ul>`
    : '';

  const line = !result
    ? `<p class="g-why g-hint">${t(`game.hint.${q.mode}`)}</p>`
    : `<p class="g-why"><b class="g-verdict ${result.right ? 'ok' : 'no'}">${result.right ? `✓ ${t('game.right')}` : `✗ ${t('game.wrong')}`}.</b> ${explain(t, result)}</p>`;

  const next = `<button class="g-next" type="button" data-g="next" ${result ? '' : 'disabled'}>${round.index === round.total - 1 ? t('game.finish') : t('game.next')}</button>`;
  // The long explanation opens over the map, so the panel keeps its height.
  const more = `<button class="g-more" type="button" data-g="more" aria-controls="g-more" aria-expanded="${Boolean(open)}" ${result ? '' : 'disabled'}>${open ? t('game.more.hide') : t('game.more')}</button>`;

  return {
    top: `
      <div class="g-bar">
        ${dots(t, round)}
        <span class="g-streak">${round.streak >= STREAK_SHOWN ? `<span role="img" aria-label="${round.streak} ${t('game.streak')}">🔥 ${round.streak}</span>` : ''}</span>
        ${closeButton(t)}
      </div>
      <h2 class="g-q" tabindex="-1">
        <span class="g-lead">${t(`game.ask.${q.mode}`)}</span>
        <span class="g-big">${exercise[lang]}</span>
      </h2>`,
    under: `${legend}<div class="g-opts">${q.options.map(option).join('')}</div>${line}<div class="g-go">${more}${next}</div>`,
  };
}

/**
 * «More» after an answer: what the Agonist does, and every Muscle of the
 * Exercise by Role with the author's note on why, where there is one. Plain
 * text, not links: reading it must not throw the Trainer out of the Round.
 */
export function moreHtml(t, atlas, round) {
  const { exercise } = round.current;
  const { answer, given, roles } = round.result;
  const notes = atlas.exercise(exercise).notes ?? {};
  const agonist = atlas.muscle(answer);
  const byRole = ROLES.map((role) => ({ role, muscles: roles.filter((x) => x.role === role).map((x) => x.muscle) }))
    .filter((x) => x.muscles.length);
  const heading = (role, n) => (role === 'agonist' || n === 1 ? t(`role.${role}`) : t(`roles.${role}`));
  const mark = (id) => (id === answer ? '✓ ' : id === given ? '✗ ' : '');

  return `
    <h3 class="g-more-title" tabindex="-1">${t('game.more.agonist')}</h3>
    <p class="g-more-lead"><b>${agonist.uk}.</b> ${agonist.action}</p>
    <h3 class="g-more-title">${t('game.more.roles')}</h3>
    <div class="roles">${byRole.map(({ role, muscles }) => `
      <section class="role" data-role="${role}">
        <h4>${heading(role, muscles.length)}</h4>
        <p>${t(`role.${role}.does`)}</p>
        <ul>${muscles.map((id) => `
          <li${id === given ? ' class="picked"' : ''}>${mark(id)}${atlas.muscle(id).uk}${notes[id] ? `<p class="why">${notes[id]}</p>` : ''}</li>`).join('')}
        </ul>
      </section>`).join('')}
    </div>`;
}

export function summaryHtml(t, lang, atlas, round) {
  const { score, total, bestStreak, mistakes } = round.summary();
  const note =
    score === total ? t('game.perfect') : bestStreak >= STREAK_PRAISED ? `${t('game.best')} — ${bestStreak}` : '';

  return `
    <div class="g-bar"><h2 class="g-title" tabindex="-1">${t('game.finish')}</h2>${closeButton(t)}</div>
    <p class="g-score"><span class="sr">${t('game.score')}: </span><b>${score}</b>/${total}</p>
    ${note ? `<p class="g-lead g-note">${note}</p>` : ''}
    <div class="g-actions">
      <button class="g-next" type="button" data-g="again">${t('game.again')}</button>
      <button class="g-ghost" type="button" data-g="modes">${t('game.modes')}</button>
      <button class="g-ghost" type="button" data-g="close">${t('close')}</button>
    </div>
    ${mistakes.length ? `
      <h3 class="g-sub">${t('game.mistakes')}</h3>
      <ul class="g-list">${mistakes.map((m) => `
        <li><a class="row" href="#/exercise/${m.exercise}" data-exercise="${m.exercise}">${atlas.exercise(m.exercise)[lang]}<small>${t('search.agonist')}: ${atlas.muscle(m.answer).uk}</small></a></li>`).join('')}
      </ul>` : ''}`;
}
