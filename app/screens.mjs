// What each screen says, as markup: the top of a page (its name and what it
// is), the list under the map, and the colours the map takes. Pure functions
// from the atlas and the address — no DOM, no state — so they can be checked
// in Node on the real content and `ui.mjs` stays about events.
//
// Muscles are named in Ukrainian everywhere; Exercises in `lang`.

import { ROLES } from './atlas.mjs';
import { judge } from './quiz.mjs';
import { otherLang, exerciseCount } from './i18n.mjs';
import { icon } from './icons.mjs';
import { muscleHref, exerciseHref, examQuestionHref, HOME, GAME, EXAM, EXAM_CARDS, EXAM_TEST, isRound } from './route.mjs';

const latin = (m) => (m.la ? `<small class="sub" translate="no">${m.la}</small>` : '');

/**
 * One row of any list: a link to a page. The Role, where the row has one, is
 * on the link itself (`data-role`), so its colour comes from CSS. So is what the
 * row lights on the map while it is read (`lights`: `data-muscle` or
 * `data-exercise`; see `litRules`). The Note that explains the Role sits beside
 * the link, not in it: read as the link's name it would be a paragraph.
 * `icon` and `cls` are for the welcome's doors (ticket 04), unused elsewhere.
 * `chevron` marks a row that opens a Muscle or Exercise page (ticket 09).
 */
function row({ href, lights, name, sub = '', aside = '', role = '', note = '', icon: rowIcon = '', cls = '', chevron = false }) {
  return `<li><a class="row${cls ? ` ${cls}` : ''}" href="${href}" ${lights}${role ? ` data-role="${role}"` : ''}>
    ${rowIcon}<span class="row-name"><b>${name}</b>${sub}</span>${aside ? `<small class="aside">${role ? '<i></i>' : ''}${aside}</small>` : ''}${chevron ? icon('forward', 'chev') : ''}</a>${note ? `<p class="why">${note}</p>` : ''}</li>`;
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
    chevron: true,
  });
};

const exerciseRow = (t, lang, e, { sub = '', aside = '', role = '' } = {}) =>
  row({ href: exerciseHref(e.id), lights: `data-exercise="${e.id}"`, name: e[lang], sub, aside: role ? t(`role.${role}`) : aside, role, chevron: true });

const section = (title, body, id) => `<section${id ? ` id="${id}"` : ''}><h2 class="h">${title}</h2>${body}</section>`;
const list = (rows, cls = 'list') => `<ul class="${cls}">${rows.join('')}</ul>`;

/** A Topic row: name and Question count, `data-act`-dispatched — the Cards
 *  length picker starts a Round with it, the Digest nav scrolls with it. */
const topicRowHtml = (act, topic, count) => `<li><button class="row" type="button" data-act="${act}" data-topic="${topic.id}">
    <span class="row-name"><b>${topic.uk}</b></span>
    <small class="aside">${count}</small>
  </button></li>`;

// ── Welcome: first launch's own state of home (ticket 04) ──────────────────

/** A door: the tab's own icon and name (ticket 03), with a line about what is behind it — an ordinary link to that section. */
const doorHtml = (t, tab, href) =>
  row({ href, lights: '', icon: icon(tab), cls: 'door', name: t(`tabs.${tab}`), sub: `<small class="sub">${t(`welcome.${tab}`)}</small>` });

/**
 * First launch: the app's name, one sentence on what it is, and the three
 * ways in. Every one of these — the doors, «Почати» — is a plain link to
 * where it says it goes; `ui.mjs` dismisses the welcome wherever a Trainer
 * leaves home from, doors and the tab bar alike (see `go()`), so nothing
 * here needs an action of its own.
 */
export function welcomeHtml(t) {
  return `
    <h1 tabindex="-1">${t('app.title')}</h1>
    <p class="lead">${t('welcome.about')}</p>
    <ul class="list welcome-doors">
      ${doorHtml(t, 'reference', HOME)}
      ${doorHtml(t, 'game', GAME)}
      ${doorHtml(t, 'exam', EXAM)}
    </ul>
    <a class="main" href="${HOME}">${t('welcome.start')}</a>`;
}

// ── Home ─────────────────────────────────────────────────────────────────

/** Every Muscle that has Exercises, by Muscle Group, with how many. */
export function indexHtml(t, lang, atlas) {
  const caption = `<p class="caption">${t('map.caption')}</p>`;
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
    // Only a word longer than the hint can be shortened.
    const [word = ''] = query.trim().split(/\s+/);
    const hint = word.length > 4 ? ` ${t('search.shorter').replace('{q}', word.slice(0, 4).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`))}` : '';
    return `<p class="none">${t('search.empty')}${hint}</p>`;
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
      <div class="field">
        ${icon('search')}
        <input id="q" name="q" type="search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search"
          placeholder="${t('search.placeholder')}" aria-label="${t('search.label')}" />
        <button class="clear" type="button" data-act="clear" aria-label="${t('search.clear')}" hidden>${icon('close')}</button>
      </div>
      <button class="cancel" type="button" data-act="cancel" hidden>${t('search.cancel')}</button>
    </div>`;
}

/** The Roles present in a list of {role} pairs (an Exercise's Muscles, or a Muscle's Exercises), most central first, each once. */
const rolesIn = (pairs) => {
  const used = new Set(pairs.map((x) => x.role));
  return ROLES.filter((r) => used.has(r));
};

/**
 * One legend item: the Role's colour and name; a tap opens its own sentence
 * from `CONTEXT.md` in place — a native `<details>`, no JS of our own (ticket 05).
 */
const roleItem = (t, r) =>
  `<li data-role="${r}"><details><summary><i></i>${t(`role.${r}`)}</summary><p>${t(`role.${r}.sentence`)}</p></details></li>`;

/** A legend of the Roles actually shown here, each a tap away from its sentence. Nothing when there are none. */
const legendHtml = (t, roles) =>
  roles.length ? `<ul class="legend" aria-label="${t('exercise.legend')}">${roles.map((r) => roleItem(t, r)).join('')}</ul>` : '';

/** The page's own words above the map: its name and what it is. */
export function pageTopHtml(t, lang, atlas, here) {
  if (here.screen === 'muscle') {
    const m = atlas.muscle(here.id);
    return `<h1 tabindex="-1">${m.uk}</h1>${m.la ? `<p class="sub" translate="no">${m.la}</p>` : ''}<p class="lead">${m.action}</p>${legendHtml(t, rolesIn(atlas.muscleExercises(here.id)))}`;
  }
  if (here.screen === 'exercise') {
    const e = atlas.exercise(here.id);
    return `<h1 tabindex="-1">${e[lang]}</h1><p class="sub" lang="${otherLang(lang)}">${e[otherLang(lang)]}</p>${legendHtml(t, rolesIn(atlas.exerciseMuscles(here.id)))}`;
  }
  return searchField(t);
}

/** A screen's own name, for the top bar's «‹ <name>» once it is the one just left. */
export function screenName(t, lang, atlas, at) {
  if (at.screen === 'muscle') return atlas.muscle(at.id)?.uk ?? '';
  if (at.screen === 'exercise') return atlas.exercise(at.id)?.[lang] ?? '';
  if (at.screen === 'exam') return t('tabs.exam');
  if (at.screen === 'game') return t('tabs.game');
  if (at.screen === 'examCards') return t('exam.cards');
  if (at.screen === 'examTest') return t('exam.test');
  return 'Agonist';
}

/**
 * The top bar's left slot (ADR-0009): the app's name on home, nothing on the
 * Digest (a tab's own top screen, same as home), «Закрити» in a Партія, and
 * everywhere else «‹ <name of the screen we came from>» — «Довідник» when
 * there is none (a link opened cold). `from` is the `{screen, id}` a step's
 * own history entry was pushed with, or undefined.
 */
export function navStart(t, lang, atlas, here, from) {
  if (here.screen === 'home') return { text: screenName(t, lang, atlas, here), act: 'home' };
  if (isRound(here.screen)) return { text: t('close'), act: 'home' };
  if (here.screen === 'exam') return { hidden: true };
  const name = from ? screenName(t, lang, atlas, from) : t('tabs.reference');
  return {
    html: `${icon('back')}<span class="navlabel">${name}</span>`,
    ariaLabel: `${t('back')}: ${name}`,
    act: 'back',
  };
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

// ── The Game: a Round of Tasks (ADR-0010) ───────────────────────────────

/** The verdict on the Task in play — only asked once the Trainer has answered. */
const verdictOf = (atlas, round) => judge(atlas, round.current, round.choice);

/** A Role by its colour and name: the swatch is the legend's (`data-role` gives the colour to CSS). */
const roleName = (t, r) => `<span class="rolename" data-role="${r}"><i></i>${t(`role.${r}`)}</span>`;

/** The Role buttons of «Яка Роль», one per Role the atlas has, in its order — the legend's. */
const roleButtons = (t) =>
  `<div class="card-go task-go roles">${ROLES.map(
    (r) => `<button class="ghost role-pick" type="button" data-act="answer-role" data-role="${r}"><i></i>${t(`role.${r}`)}</button>`,
  ).join('')}</div>`;

/** «Яка Роль» after the answer: the right Role and, on a miss, the Trainer's; what the Role is; and the Explanation, if the Exercise gives one. */
function roleAnswerHtml(t, atlas, task, v) {
  const note = atlas.exercise(task.exercise).notes?.[task.muscle];
  return `<p class="lead"><b>${t('task.role.right')}:</b> ${roleName(t, task.role)}</p>
    ${v.correct ? '' : `<p class="lead"><b>${t('task.chosen')}:</b> ${roleName(t, v.chosen)}</p>`}
    <p class="lead">${t(`role.${task.role}.sentence`)}</p>
    ${note ? `<p class="lead"><b>${t('task.note')}:</b> ${note}</p>` : ''}`;
}

/**
 * A Task: its wording — the action and its subject, the Exercise (Хто Агоніст,
 * Яка Роль) or the Muscle (Знайди М'яз) — and, at the foot (in the thumb zone,
 * `.task-go`), «Не знаю» while it waits for a tap (or for Яка Роль the five Role
 * buttons), or once answered the verdict and «Далі» in the same place. The
 * verdict is a mark and words, never colour alone, and the right answer is named
 * in words too — the map is not the only way to read it.
 */
export function taskTopHtml(t, lang, atlas, round) {
  const task = round.current;
  const { kind } = task;
  const find = kind === 'find';
  const subject = find ? atlas.muscle(task.muscle).uk : atlas.exercise(task.exercise)[lang];
  // Яка Роль points at its Muscle on the map, and names it: not everyone can tell it by the colour.
  const asked = kind === 'role' ? `<p class="lead">${t('task.muscle')}: <b>${atlas.muscle(task.muscle).uk}</b></p>` : '';
  const heading = `<h1 tabindex="-1"><small class="task-do">${t(`task.${kind}`)}</small>${subject}</h1>${asked}`;
  if (!round.revealed) {
    const who = kind === 'agonist' ? `\n      <details class="who"><summary>${t('card.agonist.question')}</summary><p>${t('role.agonist.sentence')}</p></details>` : '';
    const go = kind === 'role' ? roleButtons(t) : `<div class="card-go task-go"><button class="ghost" type="button" data-act="dont-know">${t('task.dontknow')}</button></div>`;
    return `${heading}${who}\n      ${go}`;
  }
  const v = verdictOf(atlas, round);
  const tapped = v.tapped && !v.correct
    ? `<p class="lead">${t('task.tapped')}: <b>${atlas.muscle(v.tapped).uk}</b>${find ? '' : ` — ${v.role ? t(`role.${v.role}`) : t('task.idle')}`}</p>`
    : '';
  const answer = find
    ? `<p class="lead">${atlas.muscle(task.muscle).action}</p>`
    : `<p class="lead"><b>${t('role.agonist')}:</b> ${atlas.muscle(task.muscle).uk}</p>`;
  const lines = kind === 'role' ? roleAnswerHtml(t, atlas, task, v) : find ? tapped + answer : answer + tapped;
  return `${heading}
    <p class="verdict" data-verdict="${v.correct ? 'right' : 'wrong'}"><span aria-hidden="true">${v.correct ? '✓' : '✕'}</span> ${t(v.correct ? 'task.right' : 'task.wrong')}</p>
    ${lines}
    ${kind === 'agonist' ? legendHtml(t, rolesIn(atlas.exerciseMuscles(task.exercise))) : ''}
    <div class="card-go task-go"><button class="main" type="button" data-act="next">${t('task.next')}</button></div>`;
}

/** Once answered: the Exercise's whole Role Distribution, as the Exercise page lists it — without Related Exercises, so nothing invites leaving the Round. */
export function taskListHtml(t, lang, atlas, round) {
  if (!round.revealed || round.current.kind === 'find') return '';
  const { exercise } = round.current;
  const notes = atlas.exercise(exercise).notes ?? {};
  return list(
    atlas
      .exerciseMuscles(exercise)
      .map(({ muscle, role }) => muscleRow(t, lang, atlas, muscle, { role, note: notes[muscle.id] })),
  );
}

/** What a screen reader is told once a Task is answered: verdict and the right answer, heard, not only seen in colour. */
export function taskAnnounce(t, atlas, round) {
  const v = verdictOf(atlas, round);
  const { kind, muscle, role } = round.current;
  if (kind === 'role') {
    const chosen = v.correct ? '' : ` ${t('task.chosen')}: ${t(`role.${v.chosen}`)}.`;
    return `${t(v.correct ? 'task.right' : 'task.wrong')}. ${t('task.role.right')}: ${t(`role.${role}`)}.${chosen}`;
  }
  const find = kind === 'find';
  const said = v.tapped && !v.correct ? ` ${t('task.tapped')}: ${atlas.muscle(v.tapped).uk}${find ? '' : ` — ${v.role ? t(`role.${v.role}`) : t('task.idle')}`}.` : '';
  const { uk, action } = atlas.muscle(muscle);
  const answer = find ? ` ${uk}. ${action}` : ` ${t('role.agonist')}: ${uk}.`;
  return `${t(v.correct ? 'task.right' : 'task.wrong')}.${answer}${said}`;
}

/**
 * What the map shows for a Task. Waiting, Яка Роль lights its Muscle in `--c-ask`
 * — a colour no Role has, or it would give the answer away; the taps ones show
 * the plain map. Answered: the Exercise's Role Distribution (Хто Агоніст, Яка
 * Роль) or the right Muscle alone in `--c-right` (Знайди М'яз), and over it a
 * wrong Muscle the Trainer tapped in `--c-miss` — colours no Role has, so
 * neither is mistaken for one.
 */
export function taskPaintRules(atlas, round) {
  const { kind, exercise, muscle } = round.current;
  if (!round.revealed) return kind === 'role' ? `#map [data-muscle~="${muscle}"][fill] { fill: var(--c-ask); }` : '';
  const { tapped, correct } = verdictOf(atlas, round);
  const base = kind === 'find' ? `#map [data-muscle~="${muscle}"][fill] { fill: var(--c-right); }` : paintRules(atlas, { screen: 'exercise', id: exercise });
  const miss = tapped && !correct ? `\n#map [data-muscle~="${tapped}"][fill] { fill: var(--c-miss); }` : '';
  return base + miss;
}

/** The header's «N з 10 · знав K», read off the Round in play; the Game says «правильно» instead (`word`), for it checks the answer itself. */
export function roundTally(t, round, word = 'round.known') {
  return `${round.index + 1} ${t('round.of')} ${round.total} · ${t(word)} ${round.score}`;
}

/** The Round's end: the score, and the Tasks missed, linked for a review — to the Exercise (Хто Агоніст, Яка Роль — with the right Role), or for Знайди М'яз to the Muscle. */
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
              m.kind === 'find'
                ? muscleRow(t, lang, atlas, atlas.muscle(m.muscle))
                : m.kind === 'role'
                  ? exerciseRow(t, lang, atlas.exercise(m.exercise), { sub: `<small class="sub">${atlas.muscle(m.muscle).uk}</small>`, role: m.role })
                  : exerciseRow(t, lang, atlas.exercise(m.exercise), {
                      aside: `${t('search.agonist')}: ${atlas.muscle(m.muscle).uk}`,
                    }),
            ),
          )}`
        : ''
    }`;
}

// ── The Exam: the Digest (ADR-0008) ─────────────────────────────────────

/**
 * One Question: text, then the answer already open (this is the Digest — the
 * one Format that shows it without a tap), then the explanation. The
 * «не з матеріалів клубу» badge and the divergence note are content-driven:
 * neither appears unless the Question itself carries it.
 */
function questionHtml(t, lang, atlas, q) {
  const outside = q.source === 'outside' ? `<p class="exam-outside">${t('exam.outside')}</p>` : '';
  const caveat = q.caveat ? `<p class="exam-caveat">${q.caveat}</p>` : '';
  const exercise = q.exercise
    ? `<p class="exam-exercise"><a href="${exerciseHref(q.exercise)}">${t('exam.exercise')}: ${atlas.exercise(q.exercise)[lang]}</a></p>`
    : '';
  return `<li class="exam-q" id="q-${q.id}" tabindex="-1">
    <p class="exam-question"><span class="exam-no">${q.id}.</span> ${q.question}</p>
    <p class="exam-answer"><b>${q.answer}</b></p>
    ${outside}
    <p class="exam-explanation">${q.explanation}</p>
    ${caveat}
    ${exercise}
  </li>`;
}

/**
 * The Topic nav at the top of the Digest: name and Question count, same shape
 * as the Cards length picker's Topic rows (`examCardsPickerHtml`) — but a tap
 * here scrolls to the Topic's own section below (`data-act="exam-goto"`)
 * instead of starting a Round.
 */
function digestNavHtml(topics, exam) {
  return list(
    topics.map((topic) => topicRowHtml('exam-goto', topic, exam.questions({ topic: topic.id }).length)),
    'list exam-nav',
  );
}

/**
 * The Digest's header: the way into the two Formats, each button with half a
 * sentence under it saying what the Format asks of the Student (ticket 10).
 */
export function examDigestTopHtml(t) {
  const mode = (href, name, does) =>
    `<div><a class="main" href="${href}">${t(name)}</a><small class="does">${t(does)}</small></div>`;
  return `<h1 tabindex="-1">${t('tabs.exam')}</h1><div class="card-go">${mode(EXAM_CARDS, 'exam.cards', 'exam.cards.does')}${mode(EXAM_TEST, 'exam.test', 'exam.test.does')}</div>`;
}

/** The Digest: every Question the exam holds, grouped by Topic, in the set order. */
export function examDigestHtml(t, lang, atlas, exam) {
  const topics = exam.topics();
  const sections = topics
    .map((topic) =>
      section(
        topic.uk,
        list(
          exam.questions({ topic: topic.id }).map((q) => questionHtml(t, lang, atlas, q)),
          'exam-list',
        ),
        `topic-${topic.id}`,
      ),
    )
    .join('');
  return digestNavHtml(topics, exam) + sections;
}

// ── The Exam: Cards, a Round of Questions (ADR-0008) ────────────────────

/** «Повторити слабкі» (ticket 08): a button naming the weak count, or a line saying there is none. */
function weakRepeatHtml(t, act, weakCount) {
  return `
    <h2 class="h">${t('exam.weak')}</h2>
    ${
      weakCount
        ? `<div class="card-go"><button class="ghost" type="button" data-act="${act}" data-weak="1">${t('exam.weak.repeat').replace('{n}', weakCount)}</button></div>`
        : `<p class="lead">${t('exam.weak.empty')}</p>`
    }`;
}

/**
 * Before a Round: the Student picks how many Questions play — ten, one Topic,
 * all, or (ticket 08) just the Questions last graded «Не знав». `weakCount`
 * comes from the caller: this module never touches browser storage.
 */
export function examCardsPickerHtml(t, exam, weakCount = 0) {
  const all = exam.questions();
  const topics = exam
    .topics()
    .map((topic) => topicRowHtml('exam-round', topic, all.filter((q) => q.topic === topic.id).length));
  return `
    <p class="lead">${t('exam.cards.hint')}</p>
    <div class="card-go">
      <button class="main" type="button" data-act="exam-round" data-length="10">${t('exam.cards.ten')}</button>
      <button class="main" type="button" data-act="exam-round">${t('exam.cards.all').replace('{n}', all.length)}</button>
    </div>
    <h2 class="h">${t('exam.cards.topic')}</h2>
    <ul class="list">${topics.join('')}</ul>
    ${weakRepeatHtml(t, 'exam-round', weakCount)}`;
}

/**
 * A Card: the Question, then either the way to reveal its answer or, once
 * revealed, the answer, its explanation and the two grades — the same
 * content the Digest shows already open, read here one Question at a time.
 */
export function examCardTopHtml(t, round) {
  const q = round.current;
  const action = round.revealed
    ? `<p class="exam-answer"><b>${q.answer}</b></p>
       ${q.source === 'outside' ? `<p class="exam-outside">${t('exam.outside')}</p>` : ''}
       <p class="exam-explanation">${q.explanation}</p>
       ${q.caveat ? `<p class="exam-caveat">${q.caveat}</p>` : ''}
       <div class="card-go">
         <button class="ghost" type="button" data-act="exam-grade" data-knew="0">${t('card.no')}</button>
         <button class="main" type="button" data-act="exam-grade" data-knew="1">${t('card.yes')}</button>
       </div>`
    : `<button class="main" type="button" data-act="exam-reveal">${t('card.reveal')}</button>`;
  return `<h1 tabindex="-1">${q.question}</h1>${action}`;
}

/** Once revealed: the Exercise the Question names, if any — nothing invites leaving the Round before then. */
export function examCardListHtml(t, lang, atlas, round) {
  if (!round.revealed || !round.current.exercise) return '';
  const { exercise } = round.current;
  return `<p class="exam-exercise"><a href="${exerciseHref(exercise)}">${t('exam.exercise')}: ${atlas.exercise(exercise)[lang]}</a></p>`;
}

/** What a screen reader is told once a Card is revealed: heard, not only seen. */
export function examCardAnnounce(t, round) {
  return `${t('exam.answer')}: ${round.current.answer}.`;
}

/** The Round's end: the score, and the Questions graded «Не знав», linked into the Digest. */
export function examSummaryHtml(t, round) {
  const { score, total, mistakes } = round.summary();
  return `
    <h1 tabindex="-1">${t('round.done')}</h1>
    <p class="score"><span class="sr">${t('round.score')}: </span><b>${score}</b>/${total}</p>
    ${score === total ? `<p class="lead">${t('round.perfect')}</p>` : ''}
    <div class="card-go"><a class="ghost" href="${EXAM}">${t('exam.digest')}</a></div>
    ${
      mistakes.length
        ? `<h2 class="h">${t('round.review')}</h2>${list(
            mistakes.map(
              (m) => `<li><a class="row" href="${examQuestionHref(m.id)}"><span class="row-name"><b>${m.question}</b></span></a></li>`,
            ),
          )}`
        : ''
    }`;
}

// ── The Exam: Test, four options, auto-graded (ADR-0008, ticket 07) ─────

/**
 * Before a Round: the same three lengths as Cards, over only the testable
 * Questions — a Topic with none of those does not offer an empty Round.
 */
export function examTestPickerHtml(t, exam, weakCount = 0) {
  const all = exam.testable();
  const topics = exam
    .topics()
    .filter((topic) => all.some((q) => q.topic === topic.id))
    .map(
      (topic) => `<li><button class="row" type="button" data-act="exam-test-round" data-topic="${topic.id}">
        <span class="row-name"><b>${topic.uk}</b></span>
        <small class="aside">${all.filter((q) => q.topic === topic.id).length}</small>
      </button></li>`,
    );
  return `
    <p class="lead">${t('exam.cards.hint')}</p>
    <div class="card-go">
      <button class="main" type="button" data-act="exam-test-round" data-length="10">${t('exam.cards.ten')}</button>
      <button class="main" type="button" data-act="exam-test-round">${t('exam.cards.all').replace('{n}', all.length)}</button>
    </div>
    <h2 class="h">${t('exam.cards.topic')}</h2>
    <ul class="list">${topics.join('')}</ul>
    ${weakRepeatHtml(t, 'exam-test-round', weakCount)}`;
}

/**
 * A Test screen: the Question and its four options. Before a choice, all four
 * are plain buttons; once `round.choice` is set, the correct one and the
 * Student's own wrong pick (if any) are marked, the explanation shows, and a
 * single Далі moves the Round on — auto-graded, no self-assessment.
 */
export function examTestTopHtml(t, round) {
  const q = round.current;
  const options = q.options
    .map((option, i) => {
      if (!round.revealed) {
        return `<li><button class="row option" type="button" data-act="exam-test-choose" data-index="${i}"><span class="row-name">${option}</span></button></li>`;
      }
      const state = option === q.answer ? 'correct' : i === round.choice ? 'wrong' : '';
      const label = state ? `<small class="aside">${t(`exam.test.${state}`)}</small>` : '';
      return `<li><span class="row option" ${state ? `data-state="${state}"` : ''}><span class="row-name">${option}</span>${label}</span></li>`;
    })
    .join('');
  const action = round.revealed
    ? `${q.source === 'outside' ? `<p class="exam-outside">${t('exam.outside')}</p>` : ''}
       <p class="exam-explanation">${q.explanation}</p>
       ${q.caveat ? `<p class="exam-caveat">${q.caveat}</p>` : ''}
       <div class="card-go"><button class="main" type="button" data-act="exam-test-next">${t('exam.test.next')}</button></div>`
    : '';
  return `<h1 tabindex="-1">${q.question}</h1><ul class="list">${options}</ul>${action}`;
}

/** What a screen reader is told once a choice is made: heard, not only seen in colour. */
export function examTestAnnounce(t, round) {
  const q = round.current;
  const correct = q.options[round.choice] === q.answer;
  return `${t(correct ? 'exam.test.correct' : 'exam.test.wrong')}. ${t('exam.answer')}: ${q.answer}.`;
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
