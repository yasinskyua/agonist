// A Round: a deck of Cards played in order, each graded before moving to the
// next. The Round doesn't know whether a Card is a Game Task (ADR-0010) or an
// Exam Question (ADR-0008) — the deck is just a list, built by the caller.
// `createQuiz` and `createExamQuiz` are those callers: they ask the atlas or
// the exam and know nothing about the screen, so a Round can be played and
// checked in Node on the real content.
//
// The Exam's Cards self-grade («Знав» / «Не знав», ADR-0007). The Test Format
// (ticket 07) and the Game's Tasks are auto-graded instead: `round.choose(x)`
// reveals the Card and remembers what was picked, so the caller reads
// `round.choice` back to mark the screen and to grade the Card correct or not.
//
// Randomness comes from the caller (`random` returns [0, 1) like
// `Math.random`), so a test can replay any Round from a seed.
//
//   const quiz = createQuiz({ atlas, random: Math.random });
//   const round = quiz.round();
//   round.current;              // a Task: { kind, exercise, muscle } — Exercise and Muscle ids
//   round.choose(tappedMuscle); // or DONT_KNOW
//   judge(atlas, round.current, round.choice); // { correct, tapped, role }
//   round.grade(correct);       // moves to the next Task
//   round.summary();            // once finished: { score, total, mistakes }

export const ROUND_SIZE = 10;

/** Fisher–Yates, seedable through `random` so a Round replays from a seed. */
function shuffleWith(random) {
  return (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
}

/** A Round over any deck of Cards, sliced to `size` (ten, typically). */
export function createRound(deck, size = ROUND_SIZE) {
  const cards = deck.slice(0, size);
  const results = cards.map(() => null); // 'known' | 'unknown' | null, one per Card
  let index = 0;
  let revealed = false;
  let choice = null; // Test only (ticket 07): the option index `choose()` was called with

  return {
    cards,
    total: cards.length,
    get index() {
      return index;
    },
    get current() {
      return cards[index];
    },
    get revealed() {
      return revealed;
    },
    get choice() {
      return choice;
    },
    get finished() {
      return results.every(Boolean);
    },
    get score() {
      return results.filter((r) => r === 'known').length;
    },

    reveal() {
      if (this.finished) throw new Error('the Round is over');
      if (revealed) throw new Error('the Card is already revealed');
      revealed = true;
    },

    /** Test only: picking an option reveals the Card and remembers which one, for the screen to mark and `grade()` to score. */
    choose(i) {
      this.reveal();
      choice = i;
    },

    /** Grading moves on to the next Card, unrevealed again — or finishes the Round on the last one. */
    grade(knew) {
      if (this.finished) throw new Error('the Round is over');
      if (!revealed) throw new Error('reveal the Card first');
      results[index] = knew ? 'known' : 'unknown';
      if (index < cards.length - 1) {
        index++;
        revealed = false;
        choice = null;
      }
    },

    summary() {
      if (!this.finished) throw new Error('finish the Round first');
      return {
        score: this.score,
        total: cards.length,
        mistakes: cards.filter((_, i) => results[i] === 'unknown'),
      };
    },
  };
}

/** What a Task is answered with when the Trainer gives up. Not a Muscle id: those have no hyphen. */
export const DONT_KNOW = 'dont-know';

const agonistOf = (atlas, exercise) => atlas.exerciseMuscles(exercise)[0].muscle.id;

/**
 * The kinds of Task (ADR-0010) — the list a Round is composed from. A kind says
 * every Task it could ask (`tasks`, off the atlas) and how an answer to one is
 * judged (`judge`); adding a kind is adding an entry, the composition below is
 * not touched. A Task names the Exercise and the Muscle it is about, so that no
 * Round asks about either twice — a kind that has no Exercise (Знайди М'яз)
 * just leaves it out.
 */
export const KINDS = [
  {
    id: 'agonist',
    tasks: (atlas) => atlas.exercises().map(({ id }) => ({ kind: 'agonist', exercise: id, muscle: agonistOf(atlas, id) })),
    /** `given` is the Muscle tapped. A miss carries that Muscle's Role in this Exercise — null where it does not work. */
    judge(atlas, task, given) {
      const tapped = given === DONT_KNOW ? null : given;
      const role = tapped && atlas.exerciseMuscles(task.exercise).find((x) => x.muscle.id === tapped)?.role;
      return { correct: tapped === task.muscle, tapped, role: role ?? null };
    },
  },
];

/** Whether an answer to `task` is right, and — for a miss — what was tapped. `given` is what the screen passes on: a Muscle id, or `DONT_KNOW`. */
export function judge(atlas, task, given, kinds = KINDS) {
  return kinds.find((k) => k.id === task.kind).judge(atlas, task, given);
}

/**
 * The Game's deck: kinds take turns (from a random one), each turn the next
 * Task of that kind off its shuffled pool that touches no Exercise or Muscle
 * already in the Round; the deck is then shuffled again so the turns do not show.
 */
export function createQuiz({ atlas, random = Math.random, kinds = KINDS }) {
  const shuffle = shuffleWith(random);

  return {
    round(size = ROUND_SIZE) {
      const pools = kinds.map((kind) => shuffle(kind.tasks(atlas)));
      const start = Math.floor(random() * pools.length);
      const usedExercises = new Set();
      const usedMuscles = new Set();
      const fresh = (task) => !usedExercises.has(task.exercise) && !usedMuscles.has(task.muscle);
      const deck = [];

      // `dry` counts kinds in a row that had nothing left to offer: all of them, and the deck is as full as it gets.
      for (let turn = 0, dry = 0; deck.length < size && dry < pools.length; turn++) {
        const pool = pools[(start + turn) % pools.length];
        const at = pool.findIndex(fresh);
        if (at < 0) {
          dry++;
          continue;
        }
        dry = 0;
        const [task] = pool.splice(at, 1);
        deck.push(task);
        // A kind with no Exercise (or no Muscle) adds nothing: `undefined` must not block its siblings.
        if (task.exercise) usedExercises.add(task.exercise);
        if (task.muscle) usedMuscles.add(task.muscle);
      }
      return createRound(shuffle(deck), size);
    },
  };
}

/**
 * The Exam Cards' deck: Questions, shuffled — every one, one Topic's, or a
 * caller-picked slice of them. `topic` narrows the pool before shuffling;
 * `length` slices it after — left out, the whole (possibly topic-narrowed)
 * pool plays, which is how «one Topic» and «all 51» both get their exact count.
 * `ids` (ticket 08, «Повторити слабкі») further narrows the pool to just
 * those ids — the weak-set button passes it alone, with no `topic`.
 */
export function createExamQuiz({ exam, random = Math.random }) {
  const shuffle = shuffleWith(random);

  return {
    round({ topic, length, ids } = {}) {
      const pool = exam.questions({ topic }).filter((q) => !ids || ids.has(q.id));
      const deck = shuffle(pool);
      return createRound(deck, length ?? deck.length);
    },
  };
}

/**
 * The Exam Test's deck: only Questions with a Test block (ticket 07 — one
 * without doesn't belong in the pool), each carrying its four options
 * pre-shuffled from the same seed as the deck, so a seed replays both the
 * Question order and the option order. `ids` (ticket 08) works as it does in
 * `createExamQuiz`.
 */
export function createExamTestQuiz({ exam, random = Math.random }) {
  const shuffle = shuffleWith(random);

  return {
    round({ topic, length, ids } = {}) {
      const pool = exam.testable().filter((q) => (!topic || q.topic === topic) && (!ids || ids.has(q.id)));
      const deck = shuffle(pool).map((q) => {
        const question = q.test.question ?? q.question;
        const answer = q.test.answer ?? q.answer;
        return { ...q, question, answer, options: shuffle([answer, ...q.test.wrong]) };
      });
      return createRound(deck, length ?? deck.length);
    },
  };
}
