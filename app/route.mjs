// The address bar is the screen. That is what lets a link to a Muscle or an
// Exercise be sent to another Trainer, and lets GitHub Pages serve the app
// without any server configuration.

export const HOME = '#/';
export const GAME = '#/game';
export const EXAM = '#/exam';
export const EXAM_CARDS = '#/exam/cards';
export const EXAM_TEST = '#/exam/test';
export const muscleHref = (id) => `#/muscle/${id}`;
export const exerciseHref = (id) => `#/exercise/${id}`;
export const examQuestionHref = (id) => `#/exam/q/${id}`;

const SIDES = ['front', 'back'];

/**
 * The screen an address asks for. An id out of a URL is untrusted — a stale
 * link must show home, not throw — and `atlas.muscle` / `atlas.exercise` answer
 * `undefined` for what is not theirs.
 */
export function parseRoute(hash, atlas) {
  const [first, second, third] = hash.replace(/^#\/?/, '').split('/');
  if (first === 'muscle' && atlas.muscle(second)) return { screen: 'muscle', id: second };
  if (first === 'exercise' && atlas.exercise(second)) return { screen: 'exercise', id: second };
  if (first === 'game') return { screen: 'game' };
  if (first === 'exam') {
    // Cards (ticket 06) and Test (ticket 07) are their own Formats — Partiya
    // screens, not the Digest.
    if (second === 'cards') return { screen: 'examCards' };
    if (second === 'test') return { screen: 'examTest' };
    // A summary's mistake links land here, on the Digest, at the Question it
    // names — `id` is untrusted (a stale link, a typo), so the Digest just
    // does not scroll to it, rather than break.
    if (second === 'q' && third) return { screen: 'exam', id: third };
    // Every other #/exam/* address — a typo, an unknown Topic — opens the Digest.
    return { screen: 'exam' };
  }
  // Links from before the sheet: #/front/pectoralis_major. The bare #/front and
  // #/back — the map, one side at a time — are home now: it shows both sides.
  if (SIDES.includes(first) && atlas.muscle(second)) return { screen: 'muscle', id: second };
  return { screen: 'home' };
}
