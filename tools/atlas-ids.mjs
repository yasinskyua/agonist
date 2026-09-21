// Checks the atlas's two SVGs and extracts the list of Muscles from them into
// assets/atlas/muscle-ids.json.
//
// Run:  node tools/atlas-ids.mjs          — rewrite the list
//       node tools/atlas-ids.mjs --check  — fail if the list has drifted from the SVGs
//
// The SVGs themselves are built by tools/build-atlas.mjs from the Figma exports.
// This script works with what lies in the repository and is the check after any edit.

import { readFileSync, writeFileSync } from 'node:fs';

const VIEWS = { front: 'assets/atlas/front.svg', back: 'assets/atlas/back.svg' };
const OUTPUT = 'assets/atlas/muscle-ids.json';

const FORBIDDEN = [
  [/<image\b/i, 'вбудований растр (<image>)'],
  [/<text\b|<tspan\b/i, 'текст (<text>/<tspan>)'],
  [/font-family|font-size|@font-face/i, 'залежність від шрифту (font-*)'],
  [/(?:xlink:)?href\s*=\s*["']https?:|url\(\s*["']?https?:/i, 'зовнішнє посилання'],
];

function readPaths(path) {
  let svg;
  try {
    svg = readFileSync(path, 'utf8');
  } catch {
    throw new Error(
      `немає ${path}. Атлас збирається з експортів Figma — ` +
        'кроки в assets/atlas/README.md',
    );
  }

  for (const [pattern, what] of FORBIDDEN) {
    const hit = svg.match(pattern);
    if (hit) throw new Error(`${path}: ${what}, знайдено "${hit[0]}"`);
  }

  // One path may belong to two overlapping Muscles (the neck), so an attribute
  // value is a space-separated list of names, like `class`.
  const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]+)"`))?.[1].split(' ') ?? [];
  const paths = (svg.match(/<path\b[^>]*>/g) ?? [])
    .map((tag) => ({ muscles: attr(tag, 'data-muscle'), groups: attr(tag, 'data-group') }))
    .filter((p) => p.muscles.length > 0);

  if (paths.length === 0) {
    throw new Error(`${path}: жодного data-muscle. Зібрано не тим скриптом?`);
  }
  return paths;
}

export function collectMuscles(views = VIEWS) {
  const byMuscle = new Map();

  for (const [view, path] of Object.entries(views)) {
    for (const { muscles, groups } of readPaths(path)) {
      for (const muscle of muscles) {
        if (!byMuscle.has(muscle)) byMuscle.set(muscle, { views: [], groups: [], paths: 0 });
        const entry = byMuscle.get(muscle);
        if (!entry.views.includes(view)) entry.views.push(view);
        // A Muscle's Muscle Group is the one covering its paths; there is no need
        // to author the link by hand, it is already drawn in the atlas.
        for (const group of groups) if (!entry.groups.includes(group)) entry.groups.push(group);
        entry.paths += 1;
      }
    }
  }

  const muscles = {};
  for (const id of [...byMuscle.keys()].sort()) {
    const entry = byMuscle.get(id);
    entry.groups.sort();
    muscles[id] = entry;
  }

  return {
    source: 'Human Anatomy Component System — Ryan Graves, CC BY 4.0 (див. CREDITS.md)',
    generatedBy: 'tools/atlas-ids.mjs',
    views,
    count: byMuscle.size,
    muscles,
  };
}

if (import.meta.filename === process.argv[1]) {
  const check = process.argv.includes('--check');

  try {
    const json = JSON.stringify(collectMuscles(), null, 2) + '\n';

    if (check) {
      if (readFileSync(OUTPUT, 'utf8') !== json) {
        throw new Error(`${OUTPUT} розійшовся з SVG. Запусти: node tools/atlas-ids.mjs`);
      }
      console.log(`${OUTPUT} — актуальний`);
    } else {
      writeFileSync(OUTPUT, json);
      const { count, muscles } = JSON.parse(json);
      const groups = new Set(Object.values(muscles).flatMap((m) => m.groups));
      const orphan = Object.entries(muscles).filter(([, m]) => m.groups.length === 0);
      console.log(`${OUTPUT}: ${count} М'язів, ${groups.size} М'язових груп`);
      if (orphan.length) console.log(`  без групи: ${orphan.map(([id]) => id).join(', ')}`);
    }
  } catch (error) {
    console.error(error.message); // a stack trace is noise here: the error is addressed to a person
    process.exit(1);
  }
}
