// Prints the Role Distribution review queue — every decision the draft author is unsure
// of, agonists first. This is the entry point for ticket 10: the Trainer should
// not have to scroll 80 exercises of JSON to find the flagged ones.
//
// Run:  node tools/review-queue.mjs            — Markdown on stdout
//       node tools/review-queue.mjs > out.md   — a file you can send
//
// Output is Ukrainian: the reader is a Trainer, not a developer.

import { readFileSync } from 'node:fs';
import { createAtlas, ROLES } from '../app/atlas.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));

const atlas = createAtlas({
  muscles: read('content/muscles.json').muscles,
  groups: read('content/muscle-groups.json').groups,
  exercises: read('content/exercises.json').exercises,
  atlasMuscles: read('assets/atlas/muscle-ids.json').muscles,
});

const ROLE_UK = { agonist: 'Агоніст', synergist: 'Синергіст', stabilizer: 'Стабілізатор' };
const queue = atlas.reviewQueue();

console.log('# Черга вичитки Розподілу Ролей\n');
console.log(
  `${queue.length} позначених рішень із ${atlas.exercises().length} Вправ. ` +
    'Агоністи першими: помилка в Агоністі коштує дорожче.\n',
);

for (const role of ROLES) {
  const block = queue.filter((x) => x.role === role);
  if (!block.length) continue;

  console.log(`## ${ROLE_UK[role]} (${block.length})\n`);
  for (const { exercise, muscle, note } of block) {
    console.log(`- **${exercise.uk}** (${exercise.en}) — ${muscle.uk} \`${muscle.id}\`  \n  ${note}\n`);
  }
}
