// Будує assets/atlas/{front,back}.svg з двох сирих експортів Figma.
//
//   node tools/build-atlas.mjs "~/Downloads/Muscular Systems.svg" "~/Downloads/Muscle Callouts.svg"
//
// Навіщо: в атласі Ryan Graves шари М'язів не названі — усі шляхи звуться
// `Vector`, `Group 574`. Імена живуть тільки у варіантах компонента виносок:
// `Muscle Group=- Biceps Brachii, View=Anterior, Dissection=Outer Muscles`, де
// потрібний М'яз залитий іншим кольором. Фігура у виносці й у самому атласі —
// та сама, тож ім'я переноситься з виноски на шлях атласу за геометрією.
// Це замінює ручне іменування півтори сотні шляхів.
//
// Вихідні файли в репозиторій не кладемо: разом вони важать 112 МБ, а в
// продукті потрібні лише два зібрані SVG.

import { readFileSync, writeFileSync } from 'node:fs';

const VIEWS = { front: 'Anterior', back: 'Posterior' };

// Рівень дисекції — одне рішення на весь скрипт. Написаний він в експортах
// по-різному: в атласі з одруківкою `Outter`, у виносках без неї. Тому дві
// орфографії, але вибір рівня один.
const DISSECTION = {
  systems: 'Outter/Inner Muscles', // саме так, з двома `t`
  callouts: 'Outer/Inner Muscles',
};

// Колір, яким виноска підсвічує цільовий М'яз. Калібрувальна константа: якщо
// автор атласу колись змінить палітру, міняти тут — скрипт скаже, що не
// знайшов жодного підсвіченого шляху.
const HIGHLIGHT = '#CE4849';

/** `Latissimus Dorsi & Teres Major` → `latissimus_dorsi_teres_major` */
const muscleId = (name) =>
  name
    .replace(/&#38;|&amp;|&/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** Тіло елемента з `id="<marker>"` до наступного `id="<prefix>` або кінця. */
function sliceById(svg, marker, prefix, from = 0) {
  const start = svg.indexOf(`id="${marker}"`, from);
  if (start < 0) throw new Error(`не знайдено варіант: ${marker}`);
  const end = svg.indexOf(`id="${prefix}`, start + marker.length + 5);
  return svg.slice(start, end < 0 ? svg.length : end);
}

const pathTags = (fragment) => fragment.match(/<path\b[^>]*\/?>/g) ?? [];

/**
 * Рамка шляху `[minX, minY, maxX, maxY]` за контрольними точками кривих.
 * Реальний контур завжди лежить усередині опуклої оболонки контрольних точок,
 * тож рамка не обріже фігуру.
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
 * Рамки всіх шляхів, зсунуті так, щоб ліва верхня точка фігури була в нулі.
 *
 * Зіставляти шляхи атласу й виноски за індексом не можна: порядок у двох
 * експортах не збігається. На рівні `Outter/Inner Muscles` шлях литки стоїть
 * в атласі 73-м, а у виносці 79-м — і литка діставала ім'я квадрицепса
 * мовчки, бо кількість шляхів однакова. Геометрія ж та сама: обидва експорти
 * дають фігуру ~589.6×1135.3, просто в різних місцях полотна.
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

// Наскільки рамка шляху у виносці може розійтися з рамкою того самого шляху
// в атласі, у вихідних одиницях (фігура ~590 завширшки). Виміряне
// розходження — до 1.02 одиниці; сусідні М'язи лежать на десятки одиниць
// далі, тож бере все одно найближчий, а межа лише ловить випадок, коли шляху
// немає зовсім. Калібрувальна константа: якщо новий експорт піде з іншою
// точністю, скрипт скаже, що не знайшов шляху, а не змовчить.
const TOLERANCE = 2;

/**
 * Індекси шляхів фігури, що відповідають рамці `box`: найближчий і всі, хто
 * лежить рівно там само.
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
 * Індекс шляху фігури → імена М'язів і М'язових груп, які його підсвічують.
 *
 * Виноски М'язів автор назвав `Muscle Group=- Biceps Brachii`, а М'язових
 * груп — `Muscle Group=Chest`, без дефіса. Дефіс і є єдиною ознакою, що це
 * М'яз. Пробіл після дефіса необов'язковий: `-Rhomboids` написано злитно, і
 * суворий шаблон мовчки губив цей М'яз.
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
          `${figmaView}, ${id}: підсвіченого шляху немає у фігурі. ` +
            'Фігури розійшлися — зіставлення за геометрією більше не діє.',
        );
      }
      // Однакова рамка означає шляхи, що лежать один на одному; ім'я дістають
      // обидва, інакше підсвітиться тільки верхній.
      for (const hit of hits) {
        if (!owners.has(hit)) owners.set(hit, []);
        if (!owners.get(hit).includes(id)) owners.get(hit).push(id);
      }
    });
  }

  if (muscles.size === 0) {
    throw new Error(`${figmaView}: жодного підсвіченого шляху — змінився ${HIGHLIGHT}?`);
  }
  return { muscles, groups };
}

/** viewBox навколо всіх шляхів, з полем. */
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
    let out = tag.replace(/\sid="[^"]*"/, ''); // `Vector 163` нічого не значить
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
    console.error('вжиток: node tools/build-atlas.mjs <Muscular Systems.svg> <Muscle Callouts.svg>');
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
        `${out}: ${tags} шляхів, ${muscles.size} М'язів, ${groups.size} груп, ` +
          `${(svg.length / 1024).toFixed(0)} КБ`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
