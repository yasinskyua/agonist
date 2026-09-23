// The light/dark switch. The app opens light; the Trainer's tap pins the other
// theme, remembered per device in the browser (the same kind of memory as the
// language, i18n.mjs). The phone's own setting is not consulted. `storage` is
// a getter because merely touching `localStorage` can throw.
//
// The page's colours hang off `<html data-theme>`; index.html sets it before
// the first paint (a copy of `loadTheme` in a few lines — a module would load
// too late and flash the wrong theme), and `applyTheme` keeps it current.

export const THEMES = ['light', 'dark'];
export const otherTheme = (theme) => THEMES.find((t) => t !== theme);

// The browser bar takes the page's --bg (app.css); app/theme.test.mjs keeps them equal.
export const BAR = { light: '#ffffff', dark: '#121212' };

const THEME_KEY = 'theme';

/** The Trainer's pinned theme, or null: the default, light. */
export function loadTheme(storage) {
  try {
    const theme = storage().getItem(THEME_KEY);
    return THEMES.includes(theme) ? theme : null;
  } catch {
    return null;
  }
}

/** Pin the theme. A failed write only costs the memory, not the switch. */
export function saveTheme(storage, theme) {
  try {
    storage().setItem(THEME_KEY, theme);
  } catch {
    // Storage unavailable: the choice just won't outlive this session.
  }
}

/** Put a theme on the page: its colours, and the browser bar's. */
export function applyTheme(doc, theme) {
  doc.documentElement.dataset.theme = theme;
  doc.querySelector('meta[name="theme-color"]').content = BAR[theme];
}
