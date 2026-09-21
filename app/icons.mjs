// The app's icons: one set of line icons at one stroke weight, so every button
// that shows a picture instead of a word reads as one family. They carry no
// name of their own — the button that holds one names itself with `aria-label`.

const PATHS = {
  back: 'M15 18l-6-6 6-6',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
  close: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  up: 'M18 15l-6-6-6 6',
  down: 'M6 9l6 6 6-6',
  full: 'M14 4h6v6M10 20H4v-6M20 4l-6 6M4 20l6-6',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
};

export const icon = (name) =>
  `<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${PATHS[name]}"/></svg>`;
