// Перевіряє два SVG атласу й витягує з них перелік id у assets/atlas/muscle-ids.json.
//
// Запуск:  node tools/atlas-ids.mjs          — перезаписати перелік
//          node tools/atlas-ids.mjs --check  — впасти, якщо перелік розійшовся з SVG
//
// ponytail: SVG розбирається регулярками, не парсером. Файли — машинний експорт
// Figma, а не рукописна розмітка; якщо колись з'явиться SVG з іншого джерела,
// міняти на DOMParser з jsdom.

import { readFileSync, writeFileSync } from 'node:fs';

const VIEWS = { front: 'assets/atlas/front.svg', back: 'assets/atlas/back.svg' };
const OUTPUT = 'assets/atlas/muscle-ids.json';

// id, які Figma генерує сама: clip0_1_2, paint0_linear_1_2, filter1_d, pattern0.
const TECHNICAL_ID = /^(clip|paint|path|filter|pattern|mask|image)\d/;

const FORBIDDEN = [
  [/<image\b/i, 'вбудований растр (<image>)'],
  [/<text\b|<tspan\b/i, 'текст (<text>/<tspan>)'],
  [/font-family|font-size|@font-face/i, 'залежність від шрифту (font-*)'],
  [/(?:xlink:)?href\s*=\s*["']https?:|url\(\s*["']?https?:/i, 'зовнішнє посилання'],
];

/** Вирізає <defs> — усередині лише технічні визначення, не анатомія. */
const stripDefs = (svg) => svg.replace(/<defs\b[\s\S]*?<\/defs>/gi, '');

function readView(name, path) {
  let svg;
  try {
    svg = readFileSync(path, 'utf8');
  } catch {
    throw new Error(
      `немає ${path}. Два SVG експортуються з Figma руками — ` +
        'кроки в assets/atlas/README.md',
    );
  }

  for (const [pattern, what] of FORBIDDEN) {
    const hit = svg.match(pattern);
    if (hit) throw new Error(`${path}: ${what}, знайдено "${hit[0]}"`);
  }

  const ids = [...stripDefs(svg).matchAll(/<(\w[\w-]*)\b[^>]*\bid="([^"]+)"/g)]
    .map((m) => m[2])
    .filter((id) => !TECHNICAL_ID.test(id));

  if (ids.length === 0) throw new Error(`${path}: жодного id — експорт без імен шарів?`);
  return { name, ids: [...new Set(ids)] };
}

/** `pectoralis_major_l` → `pectoralis_major`; решта — як є. */
const baseId = (id) => id.replace(/_[lr]$/, '');

export function collect(views = VIEWS) {
  const byBase = new Map();

  for (const [name, path] of Object.entries(views)) {
    for (const element of readView(name, path).ids) {
      const base = baseId(element);
      const entry = byBase.get(base) ?? { id: base, views: [], elements: [] };
      if (!entry.views.includes(name)) entry.views.push(name);
      if (!entry.elements.includes(element)) entry.elements.push(element);
      byBase.set(base, entry);
    }
  }

  const ids = [...byBase.values()].sort((a, b) => a.id.localeCompare(b.id));
  for (const entry of ids) entry.elements.sort();

  return {
    source: 'Human Anatomy Component System — Ryan Graves, CC BY 4.0 (див. CREDITS.md)',
    generatedBy: 'tools/atlas-ids.mjs',
    views,
    count: ids.length,
    ids,
  };
}

if (import.meta.filename === process.argv[1]) {
  let json;
  try {
    json = JSON.stringify(collect(), null, 2) + '\n';
  } catch (error) {
    console.error(error.message); // стектрейс тут — шум: помилка адресована людині
    process.exit(1);
  }

  if (process.argv.includes('--check')) {
    if (readFileSync(OUTPUT, 'utf8') !== json) {
      console.error(`${OUTPUT} розійшовся з SVG. Запусти: node tools/atlas-ids.mjs`);
      process.exit(1);
    }
    console.log(`${OUTPUT} — актуальний`);
  } else {
    writeFileSync(OUTPUT, json);
    const { count, ids } = JSON.parse(json);
    const paired = ids.filter((e) => e.elements.length > 1).length;
    console.log(`${OUTPUT}: ${count} id, з них ${paired} з парними сторонами _l/_r`);
  }
}
