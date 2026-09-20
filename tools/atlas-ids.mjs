// Перевіряє два SVG атласу й витягує з них перелік М'язів у
// assets/atlas/muscle-ids.json.
//
// Запуск:  node tools/atlas-ids.mjs          — перезаписати перелік
//          node tools/atlas-ids.mjs --check  — впасти, якщо перелік розійшовся з SVG
//
// Самі SVG збирає tools/build-atlas.mjs з експортів Figma. Цей скрипт працює
// з тим, що лежить у репозиторії, і є перевіркою після будь-яких правок.

import { readFileSync, writeFileSync } from 'node:fs';

const VIEWS = { front: 'assets/atlas/front.svg', back: 'assets/atlas/back.svg' };
const OUTPUT = 'assets/atlas/muscle-ids.json';

const FORBIDDEN = [
  [/<image\b/i, 'вбудований растр (<image>)'],
  [/<text\b|<tspan\b/i, 'текст (<text>/<tspan>)'],
  [/font-family|font-size|@font-face/i, 'залежність від шрифту (font-*)'],
  [/(?:xlink:)?href\s*=\s*["']https?:|url\(\s*["']?https?:/i, 'зовнішнє посилання'],
];

function readMuscles(path) {
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

  // Один шлях може належати двом М'язам, що накладаються (шия), тому значення
  // атрибута — список імен через пробіл, як у class.
  const muscles = [...svg.matchAll(/\sdata-muscle="([^"]+)"/g)].flatMap((m) => m[1].split(' '));

  if (muscles.length === 0) {
    throw new Error(`${path}: жодного data-muscle. Зібрано не тим скриптом?`);
  }
  return muscles;
}

export function collectMuscles(views = VIEWS) {
  const byMuscle = new Map();

  for (const [view, path] of Object.entries(views)) {
    for (const muscle of readMuscles(path)) {
      if (!byMuscle.has(muscle)) byMuscle.set(muscle, { views: [], paths: 0 });
      const entry = byMuscle.get(muscle);
      if (!entry.views.includes(view)) entry.views.push(view);
      entry.paths += 1;
    }
  }

  const muscles = {};
  for (const id of [...byMuscle.keys()].sort()) muscles[id] = byMuscle.get(id);

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
      const both = Object.values(muscles).filter((m) => m.views.length === 2).length;
      console.log(`${OUTPUT}: ${count} М'язів, з них ${both} видно з обох боків`);
    }
  } catch (error) {
    console.error(error.message); // стектрейс тут — шум: помилка адресована людині
    process.exit(1);
  }
}
