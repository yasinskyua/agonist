// The Quiz: a Round of ten Cards, each a Exercise whose Agonist the Trainer
// tries to recall before revealing it and grading themself «Знав» / «Не
// знав» (ADR-0007). It asks the atlas and knows nothing about the screen, so
// a Round can be played and checked in Node on the real content.
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

export function createQuiz({ atlas, random = Math.random }) {
  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  // The atlas lists the Agonist first.
  const agonistOf = (exercise) => atlas.exerciseMuscles(exercise)[0].muscle.id;

  function createRound(exerciseIds) {
    const cards = exerciseIds.map((exercise) => ({ exercise, answer: agonistOf(exercise) }));
    const results = cards.map(() => null); // 'known' | 'unknown' | null, one per Card
    let index = 0;
    let revealed = false;

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

      /** Grading moves on to the next Card, unrevealed again — or finishes the Round on the last one. */
      grade(knew) {
        if (this.finished) throw new Error('the Round is over');
        if (!revealed) throw new Error('reveal the Card first');
        results[index] = knew ? 'known' : 'unknown';
        if (index < cards.length - 1) {
          index++;
          revealed = false;
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

  return {
    round() {
      const ids = shuffle(atlas.exercises().map((e) => e.id)).slice(0, ROUND_SIZE);
      return createRound(ids);
    },
  };
}
