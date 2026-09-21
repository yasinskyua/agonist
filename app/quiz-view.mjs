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

/** The words for what a picked Muscle is in an Exercise — as the line and as what a screen reader hears. */
export function explain(t, atlas, result) {
  const muscle = atlas.muscle(result.given).uk;
  return result.givenRole
    ? t('game.explain.role').replace('{muscle}', muscle).replace('{role}', t(`role.${result.givenRole}`).toLowerCase())
    : t('game.explain.absent').replace('{muscle}', muscle);
}

/** What a screen reader is told once an answer is in. */
export function announce(t, atlas, result) {
  if (result.right) return `${t('game.right')}. ${explain(t, atlas, result)}`;
  return `${t('game.wrong')}. ${t('game.wrong.agonist')} ${atlas.muscle(result.answer).uk}. ${explain(t, atlas, result)}`;
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
export function roundHtml(t, lang, atlas, round) {
  const q = round.current;
  const result = round.result;
  const exercise = atlas.exercise(q.exercise);

  // Once answered, only the right one and the wrong pick stay: the four
  // options have done their job, and the room goes to the map.
  const option = (id) => {
    const state = !result ? '' : id === q.answer ? 'ok' : 'no';
    // A mark and, for a screen reader, words: colour alone says nothing to everyone.
    const mark = state === 'ok' ? '✓ ' : state === 'no' ? '✗ ' : '';
    return `<button class="g-opt ${state}" type="button" data-g="pick" data-id="${id}" ${result ? 'disabled' : ''}>${mark}${atlas.muscle(id).uk}</button>`;
  };
  const shown = !result ? q.options : q.options.filter((id) => id === q.answer || id === result.given);

  // The legend sits over the map's corner, not in the panel: the map needs the height.
  const legend = result
    ? `<ul class="legend g-legend">${ROLES.filter((r) => result.roles.some((x) => x.role === r))
        .map((r) => `<li data-role="${r}">${t(`role.${r}`)}</li>`)
        .join('')}</ul>`
    : '';

  // Right or wrong, the same shape and the same room: a verdict, what the
  // picked Muscle is in this Exercise, and «Next». Nothing moves on by itself —
  // the Trainer reads the solution and goes on when ready.
  const verdict = !result
    ? ''
    : `<p class="g-why"><b class="g-verdict ${result.right ? 'ok' : 'no'}">${result.right ? `✓ ${t('game.right')}` : `✗ ${t('game.wrong')}`}.</b> ${explain(t, atlas, result)}</p>
       <button class="g-next" type="button" data-g="next">${round.finished ? t('game.finish') : t('game.next')}</button>`;

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
    under: `${legend}<div class="g-opts">${shown.map(option).join('')}</div>${verdict}`,
  };
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
