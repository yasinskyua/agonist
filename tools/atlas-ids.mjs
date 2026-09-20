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

// Імена шарів атласу — латина малими літерами з підкресленнями:
// `pectoralis_major_l`. Усе інше, що Figma пише в `id`, цій формі не
// відповідає: автоімена неназваних шарів (`Vector`, `Vector 2`, `Group 5`,
// `Union`) і технічні id (`clip0_1_2`, `paint0_linear_1_2`, `mask0_d`) — усюди
// великі літери, пробіли або цифри. Тому allowlist, а не список винятків:
// перелічити форму анатомічного імені можна, а всі форми сміття Figma — ні.
//
// Єдине, що тут проходить і М'язом не є, — ім'я самого фрейму, якщо воно
// анатомічне на вигляд (`anterior`). Видно оком у згенерованому файлі.
const MUSCLE_ID = /^[a-z][a-z_]*$/;

const FORBIDDEN = [
  [/<image\b/i, 'вбудований растр (<image>)'],
  [/<text\b|<tspan\b/i, 'текст (<text>/<tspan>)'],
  [/font-family|font-size|@font-face/i, 'залежність від шрифту (font-*)'],
  [/(?:xlink:)?href\s*=\s*["']https?:|url\(\s*["']?https?:/i, 'зовнішнє посилання'],
];

/** Вирізає <defs> — усередині лише технічні визначення, не анатомія. */
const stripDefs = (svg) => svg.replace(/<defs\b[\s\S]*?<\/defs>/gi, '');

/** `pectoralis_major_l` → `pectoralis_major_r` і навпаки; непарний id → null. */
const otherSide = (id) =>
  /_[lr]$/.test(id) ? id.slice(0, -1) + (id.endsWith('_l') ? 'r' : 'l') : null;

function readIds(path) {
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

  // \sid=" а не \bid=" — інакше сюда ж влізло б будь-яке data-id="…".
  const ids = [...stripDefs(svg).matchAll(/\sid="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => MUSCLE_ID.test(id));

  if (ids.length === 0) {
    throw new Error(
      `${path}: жодного анатомічного id. Експорт без галочки ` +
        'Include "id" attribute — див. assets/atlas/README.md',
    );
  }
  return ids;
}

export function collectMuscleIds(views = VIEWS) {
  const byId = new Map();

  for (const [view, path] of Object.entries(views)) {
    for (const id of readIds(path)) {
      if (!byId.has(id)) byId.set(id, new Set());
      byId.get(id).add(view);
    }
  }

  // Ключ — справжній id елемента в SVG, без синтезованих імен: саме цим id
  // контент називає М'яза (спека, «Формат контенту»), тож у переліку має
  // лежати рівно те, що можна знайти в файлі. Парність показує `pair`.
  const ids = {};
  for (const id of [...byId.keys()].sort()) {
    const counterpart = otherSide(id);
    ids[id] = { views: [...byId.get(id)] };
    if (counterpart && byId.has(counterpart)) ids[id].pair = counterpart;
  }

  return {
    source: 'Human Anatomy Component System — Ryan Graves, CC BY 4.0 (див. CREDITS.md)',
    generatedBy: 'tools/atlas-ids.mjs',
    views,
    count: byId.size,
    ids,
  };
}

if (import.meta.filename === process.argv[1]) {
  const check = process.argv.includes('--check');

  try {
    const json = JSON.stringify(collectMuscleIds(), null, 2) + '\n';

    if (check) {
      if (readFileSync(OUTPUT, 'utf8') !== json) {
        throw new Error(`${OUTPUT} розійшовся з SVG. Запусти: node tools/atlas-ids.mjs`);
      }
      console.log(`${OUTPUT} — актуальний`);
    } else {
      writeFileSync(OUTPUT, json);
      const { count, ids } = JSON.parse(json);
      const paired = Object.values(ids).filter((e) => e.pair).length;
      console.log(`${OUTPUT}: ${count} id, з них ${paired} з парною стороною _l/_r`);
    }
  } catch (error) {
    console.error(error.message); // стектрейс тут — шум: помилка адресована людині
    process.exit(1);
  }
}
