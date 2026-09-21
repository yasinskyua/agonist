// The map's zoom, as arithmetic. A view is `{ s, x, y }`: the map drawn `s`
// times larger, its top-left corner moved to (x, y) — the CSS
// `translate(x, y) scale(s)` with the origin in that corner. All coordinates are
// in the map's own pixels, from its top-left. Nothing here touches the page;
// `ui.mjs` reads the fingers and applies the result.

/** The whole body, as the map opens. */
export const IDENTITY = { s: 1, x: 0, y: 0 };
export const MAX_SCALE = 8;
/** A Muscle page frames its Muscle, but no closer than this. */
export const FRAME_MAX = 4;
/** …and leaves the Muscle filling this much of the map's tighter side. */
const FRAME_FILL = 0.45;
/** A scale a hair above 1 is the whole body, not a zoomed map. */
const SLACK = 1.01;

export const isZoomed = (view) => view.s > SLACK;

/** The view moved back inside the frame: no panning off into white space. */
export function clampPan({ s, x, y }, { width, height }) {
  return {
    s,
    x: Math.min(0, Math.max(width - width * s, x)),
    y: Math.min(0, Math.max(height - height * s, y)),
  };
}

/**
 * The view scaled by `factor` so that the point `at` of the screen keeps the
 * same point of the body under it; `to` is where that point should land, for
 * fingers that move as they pinch (default: where it was).
 */
export function zoomAt(view, factor, at, size, to = at) {
  const s = Math.min(MAX_SCALE, Math.max(1, view.s * factor));
  const k = s / view.s;
  return clampPan({ s, x: to.x - (at.x - view.x) * k, y: to.y - (at.y - view.y) * k }, size);
}

/** One finger dragging: the map moves by what it moved. */
export const panBy = (view, dx, dy, size) => clampPan({ ...view, x: view.x + dx, y: view.y + dy }, size);

/**
 * Two fingers, from where they were to where they are: the body between them
 * scales with the gap and follows their middle.
 */
export function pinch(view, [a0, b0], [a1, b1], size) {
  const before = Math.hypot(a0.x - b0.x, a0.y - b0.y);
  // Fingers on one spot have no gap to measure a change against.
  if (!before) return view;
  const factor = Math.hypot(a1.x - b1.x, a1.y - b1.y) / before;
  return zoomAt(view, factor, mid(a0, b0), size, mid(a1, b1));
}

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * The view that puts a Muscle in the middle, `box` being where it lies on the
 * whole body. A big Muscle needs no help and stays at 1×; a small one gets up to
 * `FRAME_MAX`.
 */
export function frameOn(box, size) {
  const fit = Math.min(size.width / (box.width || 1), size.height / (box.height || 1));
  const s = Math.min(FRAME_MAX, Math.max(1, FRAME_FILL * fit));
  return clampPan(
    { s, x: size.width / 2 - (box.x + box.width / 2) * s, y: size.height / 2 - (box.y + box.height / 2) * s },
    size,
  );
}
