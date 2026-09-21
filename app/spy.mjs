// The row passing the pinned map is «the one being read», and it lights its
// Muscles on the map. Two calculations decide that, kept here as plain numbers
// so they can be checked in Node; what measures them on the page is `ui.mjs`.

/** How far under the map's bottom edge the line sits, in px. */
export const LINE_GAP = 40;

/**
 * The row nearest to the line under the map: an index into `boxes` (each
 * `{ top, bottom }` in viewport px), or null when nothing is left to read. A
 * row that has gone up behind the map is not being read; a row half behind it
 * still is. Two equally near: the upper one.
 */
export function pickRow(boxes, mapBottom) {
  const line = mapBottom + LINE_GAP;
  let best = null;
  let bestDistance = Infinity;
  boxes.forEach(({ top, bottom }, i) => {
    if (bottom < mapBottom) return;
    const distance = Math.abs((top + bottom) / 2 - line);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

/**
 * The room to add under the list so that even the last row can be scrolled up
 * to the line: it is the screen's height less the line's place less what the
 * page already has under that row's middle (`tail`, which counts the row's own
 * lower half, its note and the page's bottom padding). Never negative: a long
 * page reaches the line by itself.
 */
export function roomAtEnd({ viewport, line, tail }) {
  return Math.max(0, viewport - line - tail);
}
