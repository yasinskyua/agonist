// A Round: a deck of Cards played in order, each self-graded «Знав» / «Не
// знав» before moving to the next (ADR-0007). The Round doesn't know whether
// a Card is a Game Exercise or an Exam Question (ADR-0008) — the deck is just
// a list, built by the caller. `createQuiz` and `createExamQuiz` are those
// callers: they ask the atlas or the exam and know nothing about the screen,
// so a Round can be played and checked in Node on the real content.
//
// The Test Format (ticket 07) auto-grades instead: `round.choose(i)` reveals
// the Card and remembers which option, so the caller reads `round.choice`
// back to mark the screen and to grade the Card correct or not.
//
// Randomness comes from the caller (`random` returns [0, 1) like
// `Math.random`), so a test can replay any Round from a seed.
//
//   const quiz = createQuiz({ atlas, random: Math.random });
//   const round = quiz.round();
//   round.current;              // { exercise, answer } — Exercise and Muscle ids
//   round.reveal();
//   round.grade(true);          // «Знав» — or false, «Не знав»; moves to the next Card
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

/** The Game's deck: every Exercise, shuffled, each Card naming its Agonist (the atlas lists it first). */
export function createQuiz({ atlas, random = Math.random }) {
  const shuffle = shuffleWith(random);
  const agonistOf = (exercise) => atlas.exerciseMuscles(exercise)[0].muscle.id;

  return {
    round(size = ROUND_SIZE) {
      const ids = shuffle(atlas.exercises().map((e) => e.id)).slice(0, size);
      const deck = ids.map((exercise) => ({ exercise, answer: agonistOf(exercise) }));
      return createRound(deck, size);
    },
  };
}

/**
 * The Exam Cards' deck: Questions, shuffled — every one, one Topic's, or a
 * caller-picked slice of them. `topic` narrows the pool before shuffling;
 * `length` slices it after — left out, the whole (possibly topic-narrowed)
 * pool plays, which is how «one Topic» and «all 51» both get their exact count.
 */
export function createExamQuiz({ exam, random = Math.random }) {
  const shuffle = shuffleWith(random);

  return {
    round({ topic, length } = {}) {
      const deck = shuffle(exam.questions({ topic }));
      return createRound(deck, length ?? deck.length);
    },
  };
}

/**
 * The Exam Test's deck: only Questions with a Test block (ticket 07 — one
 * without doesn't belong in the pool), each carrying its four options
 * pre-shuffled from the same seed as the deck, so a seed replays both the
 * Question order and the option order.
 */
export function createExamTestQuiz({ exam, random = Math.random }) {
  const shuffle = shuffleWith(random);

  return {
    round({ topic, length } = {}) {
      const pool = exam.testable().filter((q) => !topic || q.topic === topic);
      const deck = shuffle(pool).map((q) => {
        const question = q.test.question ?? q.question;
        const answer = q.test.answer ?? q.answer;
        return { ...q, question, answer, options: shuffle([answer, ...q.test.wrong]) };
      });
      return createRound(deck, length ?? deck.length);
    },
  };
}
