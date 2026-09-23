// Whether the Trainer has already dismissed the first-launch welcome (ticket
// 04): «Почати» or a door, tapped once. Same defensive shape as the language
// and the weak-Question memory (i18n.mjs, memory.mjs) — lives in the browser,
// per device, no account. `storage` is a getter because merely touching
// `localStorage` can throw (private window, blocked site data), and a
// blocked memory must cost only itself: the welcome then just shows again.

const WELCOME_KEY = 'welcome-seen';

/** Whether the welcome has already been dismissed. */
export function loadWelcomeSeen(storage) {
  try {
    return storage().getItem(WELCOME_KEY) === '1';
  } catch {
    return false;
  }
}

/** Remember that the welcome was dismissed, so it does not show again. */
export function saveWelcomeSeen(storage) {
  try {
    storage().setItem(WELCOME_KEY, '1');
  } catch {
    // Storage unavailable: the welcome just won't outlive this session.
  }
}
