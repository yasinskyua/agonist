// The app's icons: one set of line icons at one stroke weight, so every button
// that shows a picture instead of a word reads as one family. They carry no
// name of their own — the button that holds one names itself with `aria-label`.

const PATHS = {
  back: 'M15 18l-6-6 6-6',
  forward: 'M9 18l6-6-6-6',
  close: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  up: 'M18 15l-6-6-6 6',
  down: 'M6 9l6 6 6-6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4',
  full: 'M14 4h6v6M10 20H4v-6M20 4l-6 6M4 20l6-6',
  // Tab bar: named after the tab's data-tab value, so icon(tab.dataset.tab)
  // resolves directly without a separate name-mapping table.
  reference: 'M11 4H5v16h6M13 4h6v16h-6',
  game: 'M9 3h10v14H9zM5 7h10v14H5z',
  exam: 'M12 5L20 9L12 13L4 9ZM20 9V14',
  // The theme switch shows the theme it goes to.
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
};

export const icon = (name, cls = '') =>
  `<svg class="i${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${PATHS[name]}"/></svg>`;
