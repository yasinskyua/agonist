// The Student's memory of the last Exam Question graded «Не знав» — a Card's
// self-grade or a Test's wrong pick (ticket 08). «Повторити слабкі» builds a
// Round from exactly this set, for Cards and Test alike: the memory is one
// per Question, not one per Format.
//
// Lives in the browser, per device, the same as the language (i18n.mjs): no
// account, no sync — the app never had either. `storage` is a getter because
// merely touching `localStorage` can throw (private window, blocked site
// data), and a blocked memory must cost only itself, never the section.

const WEAK_KEY = 'weak-questions';

/** The ids last graded «Не знав» — a Set, empty when storage is unavailable or holds junk. */
export function loadWeak(storage) {
  try {
    const ids = JSON.parse(storage().getItem(WEAK_KEY));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

/** A Question's grade: «Знав» drops it from the weak set, «Не знав» adds it. */
export function saveAnswer(storage, id, knew) {
  try {
    const weak = loadWeak(storage);
    if (knew) weak.delete(id);
    else weak.add(id);
    storage().setItem(WEAK_KEY, JSON.stringify([...weak]));
  } catch {
    // Storage unavailable: this grade just won't be remembered.
  }
}

// The Game's own memory (ADR-0010): Tasks the Trainer missed, apart from the
// Exam's weak set above. Each weak Task keeps a count of right answers in a
// row; the second one takes it off. A Task is asked at most once per Round, so
// «in a row» means «in different Rounds» with no extra bookkeeping.

const GAME_WEAK_KEY = 'game-weak';
const STREAK_TO_CLEAR = 2;

/** The weak Task keys and their streaks — a Map, empty when storage is unavailable or holds junk. */
export function loadGameWeak(storage) {
  try {
    const saved = JSON.parse(storage().getItem(GAME_WEAK_KEY));
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return new Map();
    return new Map(Object.entries(saved).filter(([, streak]) => Number.isInteger(streak) && streak >= 0));
  } catch {
    return new Map();
  }
}

/** A Task's answer: a miss makes it weak from zero; a right answer counts only for a weak one. */
export function saveGameAnswer(storage, key, correct) {
  try {
    const weak = loadGameWeak(storage);
    if (!correct) weak.set(key, 0);
    else if (weak.has(key)) {
      const streak = weak.get(key) + 1;
      if (streak >= STREAK_TO_CLEAR) weak.delete(key);
      else weak.set(key, streak);
    } else return;
    storage().setItem(GAME_WEAK_KEY, JSON.stringify(Object.fromEntries(weak)));
  } catch {
    // Storage unavailable: this answer just won't be remembered.
  }
}
