// The one-time «add to home screen» strip on home (ticket 14). iOS has no
// install prompt of its own, so the app tells a Trainer where the button is —
// once, and only where it is true: Safari on iPhone, still in the browser
// tab, after the welcome (two hints never stand together).
//
// The «closed» memory is the welcome's twin (welcome.mjs): per device, in the
// browser, `storage` a getter because merely touching `localStorage` can
// throw, and a blocked memory costs only itself — the strip shows again.

const CLOSED_KEY = 'install-hint-closed';

/** Whether the hint has already been closed. */
export function loadInstallHintClosed(storage) {
  try {
    return storage().getItem(CLOSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Remember that the hint was closed, so it does not come back. */
export function saveInstallHintClosed(storage) {
  try {
    storage().setItem(CLOSED_KEY, '1');
  } catch {
    // Storage unavailable: the hint just won't stay closed past this session.
  }
}

// iPhone browsers other than Safari (Chrome, Firefox, Edge, Opera, Google app)
// say «Safari» in their user agent too, but their Share menu is not this one.
const OTHER_IOS_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//;

/**
 * Whether the strip should be up. `standalone` is «already launched from the
 * home screen»; `welcomeSeen` and `closed` come from the two memories.
 */
export function installHintWanted({ userAgent, standalone, welcomeSeen, closed }) {
  const safariOnIphone = /iPhone/.test(userAgent) && /Safari/.test(userAgent) && !OTHER_IOS_BROWSER.test(userAgent);
  return safariOnIphone && !standalone && welcomeSeen && !closed;
}
