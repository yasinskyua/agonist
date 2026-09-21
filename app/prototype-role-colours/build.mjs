// Throwaway: four ways to paint five Roles on the real atlas, for ticket 14.
import { readFileSync, writeFileSync } from 'node:fs';

const repo = new URL('../../', import.meta.url).pathname;
const read = (p) => readFileSync(repo + p, 'utf8');
const content = JSON.parse(read('content/exercises.json')).exercises;
const snap = JSON.parse(read('docs/research/exrx-roles.json')).exercises;
const muscles = JSON.parse(read('content/muscles.json')).muscles;
const svg = (side) => read(`assets/atlas/${side}.svg`).replace(/<!--[\s\S]*?-->/g, '');

const IDS = ['barbell-row', 'back-squat', 'deadlift', 'chin-up', 'plank'];
const short = (id) => {
  const uk = muscles[id].uk;
  const gym = uk.match(/\(([^)]+)\)/);
  const name = gym ? gym[1] : uk;
  return name[0].toUpperCase() + name.slice(1);
};

const exercises = IDS.map((id) => {
  const s = snap[id];
  const roles = {};
  for (const [m, role] of Object.entries(content[id].muscles)) {
    roles[m] =
      role !== 'stabilizer' ? role
      : s.dynamic_stabilizers?.includes(m) ? 'dynamic'
      : s.antagonist_stabilizers?.includes(m) ? 'antagonist'
      : 'stabilizer';
  }
  return { id, name: content[id].uk, roles };
});
const names = Object.fromEntries(
  [...new Set(exercises.flatMap((e) => Object.keys(e.roles)))].map((m) => [m, short(m)]),
);

const html = readFileSync(new URL('./template.html', import.meta.url), 'utf8')
  .replace('/*DATA*/', `const EXERCISES = ${JSON.stringify(exercises)};\nconst NAMES = ${JSON.stringify(names)};`)
  .replace('<!--FRONT-->', svg('front'))
  .replace('<!--BACK-->', svg('back'));
writeFileSync(new URL('./role-colours.html', import.meta.url), html);
console.log('ok', (html.length / 1024).toFixed(0) + ' KB');
