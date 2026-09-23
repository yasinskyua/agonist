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
