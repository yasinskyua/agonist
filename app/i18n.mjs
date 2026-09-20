// Рядки інтерфейсу двома мовами. Робоча мова Тренера — українська; англійська
// потрібна, коли Клієнт іноземець.
//
// Не перекладаються тут: назви М'язів (українська й латина живуть у контенті)
// і назви Вправ — вони англійські в залі обома мовами.

export const LANGS = ['uk', 'en'];

const STRINGS = {
  'app.title': { uk: "М'язи і вправи", en: 'Muscles and Exercises' },
  'map.label': { uk: 'Мапа тіла', en: 'Body map' },
  'map.hint': { uk: "Тапніть по М'язу", en: 'Tap a muscle' },
  'view.label': { uk: 'Вид', en: 'View' },
  'view.front': { uk: 'Спереду', en: 'Front' },
  'view.back': { uk: 'Ззаду', en: 'Back' },
  'lang.other': { uk: 'EN', en: 'УКР' },
  'lang.switch': { uk: 'Switch to English', en: 'Перемкнути на українську' },
  'muscle.close': { uk: 'Закрити', en: 'Close' },
  'exercises.heading': { uk: 'Вправи', en: 'Exercises' },
  'role.agonist': { uk: 'Агоніст', en: 'Agonist' },
  'role.synergist': { uk: 'Синергісти', en: 'Synergists' },
  'role.stabilizer': { uk: 'Стабілізатори', en: 'Stabilizers' },
};

export const KEYS = Object.keys(STRINGS);

/**
 * Пошук перекладу. Невідомий ключ — помилка коду, а не порожнє місце на
 * екрані: мовчазний `??  ''` знаходиться лише очима й лише в одній мові.
 */
export function translator(lang) {
  if (!LANGS.includes(lang)) throw new Error(`невідома мова "${lang}"`);

  return (key) => {
    const string = STRINGS[key]?.[lang];
    if (!string) throw new Error(`немає рядка "${key}" для мови "${lang}"`);
    return string;
  };
}

/** Друга мова — та, на яку перемикає кнопка. Мов рівно дві. */
export const otherLang = (lang) => LANGS.find((l) => l !== lang);
