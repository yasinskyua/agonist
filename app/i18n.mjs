// Interface strings in both languages. Ukrainian is the Trainer's working
// language; English is for when the Client is a foreigner.
//
// Not translated here: Muscle names (Ukrainian and Latin live in the content)
// and Exercise names — those stay English in both, because that is how the
// gym says them.

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
  'close': { uk: 'Закрити', en: 'Close' },
  'credits.link': { uk: 'Подяки', en: 'Credits' },
  'credits.source': { uk: 'Джерело', en: 'Source' },
  'exercises.heading': { uk: 'Вправи', en: 'Exercises' },
  'role.agonist': { uk: 'Агоніст', en: 'Agonist' },
  'role.synergist': { uk: 'Синергісти', en: 'Synergists' },
  'role.stabilizer': { uk: 'Стабілізатори', en: 'Stabilizers' },
};

export const KEYS = Object.keys(STRINGS);

/**
 * Translation lookup. An unknown key is a bug, not a blank on screen: a silent
 * `?? ''` is only ever found by eye, and only in one of the two languages.
 */
export function translator(lang) {
  if (!LANGS.includes(lang)) throw new Error(`unknown language "${lang}"`);

  return (key) => {
    const string = STRINGS[key]?.[lang];
    if (!string) throw new Error(`no string "${key}" for language "${lang}"`);
    return string;
  };
}

/** The language the switch button moves to. There are exactly two. */
export const otherLang = (lang) => LANGS.find((l) => l !== lang);
