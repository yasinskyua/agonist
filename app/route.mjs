// The address bar is the screen. That is what lets a link to a Muscle or an
// Exercise be sent to another Trainer, and lets GitHub Pages serve the app
// without any server configuration.

export const HOME = '#/';
export const GAME = '#/game';
export const EXAM = '#/exam';
export const muscleHref = (id) => `#/muscle/${id}`;
export const exerciseHref = (id) => `#/exercise/${id}`;

const SIDES = ['front', 'back'];

/**
 * The screen an address asks for. An id out of a URL is untrusted — a stale
 * link must show home, not throw — and `atlas.muscle` / `atlas.exercise` answer
 * `undefined` for what is not theirs.
 */
export function parseRoute(hash, atlas) {
  const [first, second] = hash.replace(/^#\/?/, '').split('/');
  if (first === 'muscle' && atlas.muscle(second)) return { screen: 'muscle', id: second };
  if (first === 'exercise' && atlas.exercise(second)) return { screen: 'exercise', id: second };
  if (first === 'game') return { screen: 'game' };
  // Cards and Test (tickets 06-07) will read `second` as a Format; today every
  // #/exam/* address — a stale link, a typo, an unknown Topic — opens the Digest.
  if (first === 'exam') return { screen: 'exam' };
  // Links from before the sheet: #/front/pectoralis_major. The bare #/front and
  // #/back — the map, one side at a time — are home now: it shows both sides.
  if (SIDES.includes(first) && atlas.muscle(second)) return { screen: 'muscle', id: second };
  return { screen: 'home' };
}
