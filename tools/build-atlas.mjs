// Будує assets/atlas/{front,back}.svg з двох сирих експортів Figma.
//
//   node tools/build-atlas.mjs "~/Downloads/Muscular Systems.svg" "~/Downloads/Muscle Callouts.svg"
//
// Навіщо: в атласі Ryan Graves шари М'язів не названі — усі шляхи звуться
// `Vector`, `Group 574`. Імена живуть тільки у варіантах компонента виносок:
// `Muscle Group=- Biceps Brachii, View=Anterior, Dissection=Outer Muscles`, де
// потрібний М'яз залитий іншим кольором. Фігура у виносці й у самому атласі —
// та сама, з тим самим порядком шляхів, тож ім'я переноситься за індексом.
// Це замінює ручне іменування півтори сотні шляхів.
//
// Вихідні файли в репозиторій не кладемо: разом вони важать 112 МБ, а в
// продукті потрібні лише два зібрані SVG.

import { readFileSync, writeFileSync } from 'node:fs';

const VIEWS = { front: 'Anterior', back: 'Posterior' };
const DISSECTION = 'Outer Muscles'; // глибокі М'язи — не в першій версії
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

/** Індекс шляху → імена М'язів, які його підсвічують (зазвичай один). */
function calloutMap(callouts, figmaView) {
  const owners = new Map();
  const re = /id="Muscle Group=- ([^,"]+), View=(Anterior|Posterior), Dissection=Outer Muscles"/g;

  for (const [, name, view] of callouts.matchAll(re)) {
    if (view !== figmaView) continue;
    const frag = sliceById(
      callouts,
      `Muscle Group=- ${name}, View=${view}, Dissection=${DISSECTION}`,
      'Muscle Group=',
    );
    pathTags(frag).forEach((tag, i) => {
      if (!tag.includes(HIGHLIGHT)) return;
      if (!owners.has(i)) owners.set(i, []);
      owners.get(i).push(muscleId(name));
    });
  }

  if (owners.size === 0) {
    throw new Error(`${figmaView}: жодного підсвіченого шляху — змінився ${HIGHLIGHT}?`);
  }
  return owners;
}

/**
 * Межі малюнка за контрольними точками кривих. Реальний контур завжди лежить
 * усередині опуклої оболонки контрольних точок, тож рамка не обріже фігуру.
 */
function viewBox(tags) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let x = 0, y = 0;

  for (const tag of tags) {
    const d = tag.match(/\sd="([^"]+)"/)?.[1];
    if (!d) continue;

    for (const [, cmd, args] of d.matchAll(/([MLCSQTAHVZmlcsqtahvz])([^MLCSQTAHVZmlcsqtahvz]*)/g)) {
      const n = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
      if (cmd === 'H') n.forEach((v) => (x = v));
      else if (cmd === 'V') n.forEach((v) => (y = v));
      else for (let i = 0; i + 1 < n.length; i += 2) { x = n[i]; y = n[i + 1]; }
      if (cmd === 'Z' || cmd === 'z') continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }

  const pad = 8;
  return [minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad].map(
    (v) => Math.round(v * 10) / 10,
  );
}

function buildView({ systems, callouts, figmaView }) {
  const figure = sliceById(systems, `View=${figmaView}, Dissection=${DISSECTION}, Color=Yes`, 'View=');
  const tags = pathTags(figure);
  const owners = calloutMap(callouts, figmaView);

  const maxIndex = Math.max(...owners.keys());
  if (maxIndex >= tags.length) {
    throw new Error(
      `${figmaView}: виноска вказує на шлях ${maxIndex}, а у фігурі їх ${tags.length}. ` +
        'Фігури розійшлися — зіставлення за індексом більше не діє.',
    );
  }

  const body = tags.map((tag, i) => {
    const clean = tag.replace(/\sid="[^"]*"/, ''); // `Vector 163` нічого не значить
    const muscles = owners.get(i);
    return muscles ? clean.replace(/^<path/, `<path data-muscle="${muscles.join(' ')}"`) : clean;
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

  return { svg, tags: tags.length, muscles: new Set([...owners.values()].flat()) };
}

const [systemsPath, calloutsPath] = process.argv.slice(2);
if (!systemsPath || !calloutsPath) {
  console.error('вжиток: node tools/build-atlas.mjs <Muscular Systems.svg> <Muscle Callouts.svg>');
  process.exit(1);
}

try {
  const systems = readFileSync(systemsPath, 'utf8');
  const callouts = readFileSync(calloutsPath, 'utf8');

  for (const [view, figmaView] of Object.entries(VIEWS)) {
    const { svg, tags, muscles } = buildView({ systems, callouts, figmaView });
    const out = `assets/atlas/${view}.svg`;
    writeFileSync(out, svg);
    console.log(
      `${out}: ${tags} шляхів, ${muscles.size} М'язів, ${(svg.length / 1024).toFixed(0)} КБ`,
    );
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
