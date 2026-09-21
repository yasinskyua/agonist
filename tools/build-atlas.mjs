// Builds assets/atlas/{front,back}.svg from the two raw Figma exports.
//
//   node tools/build-atlas.mjs "~/Downloads/Muscular Systems.svg" "~/Downloads/Muscle Callouts.svg"
//
// Why: in Ryan Graves's atlas the Muscle layers are unnamed — every path is
// called `Vector`, `Group 574`. The names live only in the variants of the
// callout component:
// `Muscle Group=- Biceps Brachii, View=Anterior, Dissection=Outer Muscles`,
// where the wanted Muscle is filled with a different colour. The figure in a
// callout and in the atlas itself is the same, so the name is carried from
// the callout to the atlas path by geometry. This replaces naming a hundred
// and fifty paths by hand.
//
// The source files are not kept in the repository: together they weigh 112 MB,
// and the product needs only the two built SVGs.

import { readFileSync, writeFileSync } from 'node:fs';

const VIEWS = { front: 'Anterior', back: 'Posterior' };

// The dissection level is one decision for the whole script. The exports spell
// it differently: the atlas has the typo `Outter`, the callouts do not. So two
// spellings, but one choice of level.
const DISSECTION = {
  systems: 'Outter/Inner Muscles', // spelled just so, with two `t`
  callouts: 'Outer/Inner Muscles',
};

// The colour a callout uses to highlight its target Muscle. A calibration
// constant: if the atlas author ever changes the palette, change it here — the
// script will say it found no highlighted path.
const HIGHLIGHT = '#CE4849';

/** `Latissimus Dorsi & Teres Major` → `latissimus_dorsi_teres_major` */
const muscleId = (name) =>
  name
    .replace(/&#38;|&amp;|&/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** The body of the element with `id="<marker>"`, up to the next `id="<prefix>` or the end. */
function sliceById(svg, marker, prefix, from = 0) {
  const start = svg.indexOf(`id="${marker}"`, from);
  if (start < 0) throw new Error(`variant not found: ${marker}`);
  const end = svg.indexOf(`id="${prefix}`, start + marker.length + 5);
  return svg.slice(start, end < 0 ? svg.length : end);
}

const pathTags = (fragment) => fragment.match(/<path\b[^>]*\/?>/g) ?? [];

/**
 * A path's box `[minX, minY, maxX, maxY]` from the curves' control points.
 * The real outline always lies inside the convex hull of its control points,
 * so the box will not clip the figure.
 */
function bboxOf(d) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let x = 0, y = 0;

  for (const [, cmd, args] of d.matchAll(/([MLCSQTAHVZmlcsqtahvz])([^MLCSQTAHVZmlcsqtahvz]*)/g)) {
    const n = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    if (cmd === 'H') n.forEach((v) => (x = v));
    else if (cmd === 'V') n.forEach((v) => (y = v));
    else for (let i = 0; i + 1 < n.length; i += 2) { x = n[i]; y = n[i + 1]; }
    if (cmd === 'Z' || cmd === 'z') continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }

  return minX === Infinity ? null : [minX, minY, maxX, maxY];
}

/**
 * The boxes of all paths, shifted so the figure's top-left point is at zero.
 *
 * Paths of the atlas and of a callout cannot be matched by index: the order
 * differs between the two exports. At the `Outter/Inner Muscles` level the calf
 * path is 73rd in the atlas and 79th in the callout — and the calf silently got
 * the quadriceps's name, because the number of paths is the same. The geometry
 * is the same, though: both exports give a ~589.6×1135.3 figure, just at
 * different places on the canvas.
 */
const boxesOf = (tags) =>
  tags.map((tag) => {
    const d = tag.match(/\sd="([^"]+)"/)?.[1];
    return d ? bboxOf(d) : null;
  });

export function figureBoxes(tags) {
  const boxes = boxesOf(tags);
  const drawn = boxes.filter(Boolean);
  const x0 = Math.min(...drawn.map((b) => b[0]));
  const y0 = Math.min(...drawn.map((b) => b[1]));
  return boxes.map((b) => b && [b[0] - x0, b[1] - y0, b[2] - x0, b[3] - y0]);
}

// How far a callout path's box may differ from the same path's box in the
// atlas, in source units (the figure is ~590 wide). The measured difference is
// up to 1.02 units; neighbouring Muscles lie tens of units apart, so the
// nearest one is taken anyway, and the limit only catches the case where the
// path is missing altogether. A calibration constant: if a new export comes
// with a different precision, the script says it found no path instead of
// staying silent.
const TOLERANCE = 2;

/**
 * The indices of the figure's paths matching the box `box`: the nearest one and
 * everything lying exactly the same place.
 */
export function matchingPaths(figure, box) {
  const away = figure.map((b) =>
    b ? Math.max(...b.map((v, k) => Math.abs(v - box[k]))) : Infinity,
  );
  const best = Math.min(...away);
  if (best > TOLERANCE) return [];
  return away.flatMap((d, i) => (d <= best + 1e-9 ? [i] : []));
}

/**
 * A figure path's index → the names of the Muscles and Muscle Groups that
 * highlight it.
 *
 * The author named Muscle callouts `Muscle Group=- Biceps Brachii` and Muscle
 * Group callouts `Muscle Group=Chest`, without the hyphen. The hyphen is the
 * only sign that it is a Muscle. The space after the hyphen is optional:
 * `-Rhomboids` is written together, and a strict pattern silently lost this
 * Muscle.
 */
function calloutMap(callouts, figmaView, figure) {
  const muscles = new Map();
  const groups = new Map();
  const re = new RegExp(
    `id="Muscle Group=([^,"]+), View=(Anterior|Posterior), Dissection=${DISSECTION.callouts}"`,
    'g',
  );

  for (const [, rawName, view] of callouts.matchAll(re)) {
    if (view !== figmaView) continue;
    const isMuscle = rawName.startsWith('-');
    const owners = isMuscle ? muscles : groups;
    const id = muscleId(rawName);

    const frag = sliceById(
      callouts,
      `Muscle Group=${rawName}, View=${view}, Dissection=${DISSECTION.callouts}`,
      'Muscle Group=',
    );
    const tags = pathTags(frag);
    const boxes = figureBoxes(tags);

    tags.forEach((tag, i) => {
      if (!tag.includes(HIGHLIGHT)) return;
      const hits = boxes[i] ? matchingPaths(figure, boxes[i]) : [];
      if (hits.length === 0) {
        throw new Error(
          `${figmaView}, ${id}: the highlighted path is not in the figure. ` +
            'The figures have diverged — matching by geometry no longer holds.',
        );
      }
      // An equal box means paths lying on top of each other; both get the name,
      // otherwise only the top one would light up.
      for (const hit of hits) {
        if (!owners.has(hit)) owners.set(hit, []);
        if (!owners.get(hit).includes(id)) owners.get(hit).push(id);
      }
    });
  }

  if (muscles.size === 0) {
    throw new Error(`${figmaView}: no highlighted path — did ${HIGHLIGHT} change?`);
  }
  return { muscles, groups };
}

/** A viewBox around all the paths, with a margin. */
function viewBox(tags) {
  const boxes = boxesOf(tags).filter(Boolean);

  const minX = Math.min(...boxes.map((b) => b[0]));
  const minY = Math.min(...boxes.map((b) => b[1]));
  const maxX = Math.max(...boxes.map((b) => b[2]));
  const maxY = Math.max(...boxes.map((b) => b[3]));

  const pad = 8;
  return [minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad].map(
    (v) => Math.round(v * 10) / 10,
  );
}

function buildView({ systems, callouts, figmaView }) {
  const slice = sliceById(
    systems,
    `View=${figmaView}, Dissection=${DISSECTION.systems}, Color=Yes`,
    'View=',
  );
  const tags = pathTags(slice);
  const { muscles: owners, groups } = calloutMap(callouts, figmaView, figureBoxes(tags));

  const body = tags.map((tag, i) => {
    let out = tag.replace(/\sid="[^"]*"/, ''); // `Vector 163` means nothing
    const attr = (name, value) =>
      value && (out = out.replace(/^<path/, `<path ${name}="${value.join(' ')}"`));
    attr('data-group', groups.get(i));
    attr('data-muscle', owners.get(i));
    return out;
  });

  const [x, y, w, h] = viewBox(tags);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" fill="none">`,
    '<!-- Human Anatomy Component System — Ryan Graves, CC BY 4.0. Див. CREDITS.md.',
    '     Зібрано tools/build-atlas.mjs, руками не правити. -->',
    ...body,
    '</svg>',
    '',
  ].join('\n');

  return {
    svg,
    tags: tags.length,
    muscles: new Set([...owners.values()].flat()),
    groups: new Set([...groups.values()].flat()),
  };
}

if (import.meta.filename === process.argv[1]) {
  const [systemsPath, calloutsPath] = process.argv.slice(2);
  if (!systemsPath || !calloutsPath) {
    console.error('usage: node tools/build-atlas.mjs <Muscular Systems.svg> <Muscle Callouts.svg>');
    process.exit(1);
  }

  try {
    const systems = readFileSync(systemsPath, 'utf8');
    const callouts = readFileSync(calloutsPath, 'utf8');

    for (const [view, figmaView] of Object.entries(VIEWS)) {
      const { svg, tags, muscles, groups } = buildView({ systems, callouts, figmaView });
      const out = `assets/atlas/${view}.svg`;
      writeFileSync(out, svg);
      console.log(
        `${out}: ${tags} paths, ${muscles.size} Muscles, ${groups.size} groups, ` +
          `${(svg.length / 1024).toFixed(0)} KB`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
