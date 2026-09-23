// The Exam's content, checked and queried the way the atlas is (a mirror of
// `atlas.mjs`): the caller passes the content in, nothing here reads a file or
// touches the network, so it is tested in Node on the real content.
//
//   import { createExam } from './exam.mjs';
//   const exam = createExam({ questions, atlas });

import { ContentError } from './atlas.mjs';

export { ContentError };

/** The ten Topics, in the order the Digest and the Round-length picker use. */
export const TOPICS = [
  { id: 'trainer', uk: 'Робота тренера' },
  { id: 'anatomy', uk: 'Анатомія' },
  { id: 'physiology', uk: 'Фізіологія' },
  { id: 'biomechanics', uk: 'Біомеханіка й статура' },
  { id: 'training', uk: 'Вправи й побудова тренувань' },
  { id: 'nutrition', uk: 'Харчування' },
  { id: 'trx', uk: 'TRX' },
  { id: 'stretching', uk: 'Стретчинг і гнучкість' },
  { id: 'pregnancy', uk: 'Вагітність' },
  { id: 'crossfit', uk: 'Кросфіт' },
];

const TOPIC_IDS = new Set(TOPICS.map((t) => t.id));
const SOURCES = ['club', 'outside'];

/** The content invariants, all checked and thrown as one list. */
function check({ questions, atlas }) {
  const problems = [];

  for (const [id, q] of Object.entries(questions)) {
    if (!TOPIC_IDS.has(q.topic)) problems.push(`Питання "${id}": Тема "${q.topic}" не з переліку`);
    if (!q.question?.trim()) problems.push(`Питання "${id}" не має тексту`);
    if (!q.answer?.trim()) problems.push(`Питання "${id}" не має відповіді`);
    if (!q.explanation?.trim()) problems.push(`Питання "${id}" не має пояснення`);
    if (!SOURCES.includes(q.source)) problems.push(`Питання "${id}": невідоме джерело "${q.source}"`);

    if (q.caveat !== undefined && !q.caveat?.trim()) {
      problems.push(`Питання "${id}": порожня примітка`);
    }

    if (q.exercise !== undefined && !atlas.exercise(q.exercise)) {
      problems.push(`Питання "${id}" посилається на неіснуючу Вправу "${q.exercise}"`);
    }

    if (q.test !== undefined) {
      const answer = q.test.answer ?? q.answer;
      if (q.test.question !== undefined && !q.test.question.trim()) {
        problems.push(`Питання "${id}": порожнє формулювання Тесту`);
      }
      if (q.test.answer !== undefined && !q.test.answer.trim()) {
        problems.push(`Питання "${id}": порожня відповідь Тесту`);
      }
      if (!Array.isArray(q.test.wrong) || q.test.wrong.length !== 3) {
        problems.push(`Питання "${id}": блок Тесту має мати рівно три неправильні варіанти`);
      } else if (q.test.wrong.some((w) => w === answer)) {
        problems.push(`Питання "${id}": неправильний варіант Тесту збігається з правильною відповіддю`);
      }
    }
  }

  if (problems.length) throw new ContentError(problems);
}

const byId = (a, b) => Number(a.id) - Number(b.id);

export function createExam({ questions, atlas }) {
  check({ questions, atlas });

  const questionView = (id) => ({ id, ...questions[id] });
  const all = () => Object.keys(questions).map(questionView).sort(byId);

  return {
    /** The Topics that have at least one Question, in the set order. */
    topics: () => TOPICS.filter((t) => Object.values(questions).some((q) => q.topic === t.id)),

    /** Every Question, or one Topic's — never losing one to a typo in `topic`. */
    questions: ({ topic } = {}) => (topic ? all().filter((q) => q.topic === topic) : all()),

    /** A Question by id, or undefined: an id from the URL is untrusted. */
    question: (id) => (Object.hasOwn(questions, id) ? questionView(id) : undefined),

    /** Every Question with a Test block — the deck the Format Тест can build a Round from. */
    testable: () => all().filter((q) => q.test !== undefined),
  };
}
