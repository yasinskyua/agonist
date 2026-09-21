// Interface strings in both languages. Ukrainian is the Trainer's working
// language; English is for when the Client is a foreigner.
//
// Not translated here: Muscle names (Ukrainian and Latin live in the content)
// and Exercise names (each Exercise carries its own `uk` and `en`).

export const LANGS = ['uk', 'en'];

const STRINGS = {
  'app.title': { uk: "М'язи і вправи", en: 'Muscles and Exercises' },
  'map.label': { uk: 'Мапа тіла', en: 'Body map' },
  'map.hint': { uk: "Торкніться м'яза", en: 'Tap a muscle' },
  'map.legend': { uk: 'Тілесні — ті, для яких є вправи', en: 'Tinted muscles have exercises' },
  'view.front': { uk: 'Спереду', en: 'Front' },
  'view.back': { uk: 'Ззаду', en: 'Back' },
  'lang.other': { uk: 'EN', en: 'УКР' },
  'lang.switch': { uk: 'Switch to English', en: 'Перемкнути на українську' },
  'back': { uk: 'Назад', en: 'Back' },
  'close': { uk: 'Закрити', en: 'Close' },
  'zoom.reset': { uk: 'Скинути масштаб', en: 'Reset zoom' },
  'zoom.in': { uk: 'Збільшити', en: 'Zoom in' },
  'zoom.out': { uk: 'Зменшити', en: 'Zoom out' },
  'sheet.grip': { uk: 'Змінити висоту шторки', en: 'Resize the sheet' },
  'search.cancel': { uk: 'Скасувати', en: 'Cancel' },
  'search.count': { uk: 'Знайдено', en: 'Found' },
  'sheet.now': { uk: 'Зараз', en: 'Now' },
  'detent.low': { uk: 'низька', en: 'low' },
  'detent.mid': { uk: 'середня', en: 'half' },
  'detent.high': { uk: 'висока', en: 'full' },

  'search.label': { uk: "Пошук м'язів, груп і вправ", en: 'Search muscles, groups and exercises' },
  'search.placeholder': { uk: 'Жим лежачи, біцепс…', en: 'Bench press, biceps…' },
  'search.empty': {
    uk: "Нічого не знайдено. М'язи шукаються українською й латиною, вправи — українською й англійською.",
    en: 'Nothing found. Muscles are searched in Ukrainian and Latin, exercises in Ukrainian and English.',
  },
  'search.groups': { uk: "М'язові групи", en: 'Muscle groups' },
  'search.muscles': { uk: "М'язи", en: 'Muscles' },
  'search.exercises': { uk: 'Вправи', en: 'Exercises' },
  'search.agonist': { uk: 'агоніст', en: 'agonist' },

  'role.agonist': { uk: 'Агоніст', en: 'Agonist' },
  'role.synergist': { uk: 'Синергіст', en: 'Synergist' },
  'role.stabilizer': { uk: 'Стабілізатор', en: 'Stabilizer' },
  'roles.synergist': { uk: 'Синергісти', en: 'Synergists' },
  'roles.stabilizer': { uk: 'Стабілізатори', en: 'Stabilizers' },
  'role.agonist.does': { uk: 'Веде рух', en: 'Drives the movement' },
  'role.synergist.does': { uk: 'Допомагає агоністу', en: 'Assists the agonist' },
  'role.stabilizer.does': { uk: 'Утримує положення, руху не створює', en: 'Holds position, creates no movement' },

  'game.enter': { uk: 'Гра', en: 'Game' },
  'game.pick.says': {
    uk: '10 питань. Помилки — у довідник.',
    en: '10 questions. Mistakes link to the reference.',
  },
  'game.soon': { uk: 'скоро', en: 'soon' },
  'mode.find': { uk: "Знайди М'яз", en: 'Find the Muscle' },
  'mode.find.says': { uk: "Назва — тапни М'яз на мапі", en: 'A name — tap the muscle on the map' },
  'mode.name': { uk: "Назви М'яз", en: 'Name the Muscle' },
  'mode.name.says': { uk: "М'яз на мапі — вибери назву", en: 'A muscle on the map — pick its name' },
  'mode.agonist': { uk: 'Хто Агоніст?', en: 'Who is the Agonist?' },
  'mode.agonist.says': { uk: "Вправа — вибери М'яз, що веде рух", en: 'An exercise — pick the muscle that drives it' },
  'mode.role': { uk: 'Яка Роль?', en: 'Which Role?' },
  'mode.role.says': { uk: "Вправа і М'яз — вибери його Роль", en: 'An exercise and a muscle — pick its role' },
  'mode.where': { uk: 'Де Агоніст?', en: 'Where is the Agonist?' },
  'mode.where.says': { uk: "М'яз — вибери вправу, де він Агоніст", en: 'A muscle — pick the exercise where it is the agonist' },
  'game.question': { uk: 'Питання', en: 'Question' },
  'game.of': { uk: 'з', en: 'of' },
  'game.streak': { uk: 'поспіль', en: 'in a row' },
  'game.ask.agonist': { uk: 'Хто Агоніст у вправі', en: 'Who is the agonist in' },
  'game.hint.agonist': { uk: "Вибери М'яз, що веде рух у цій вправі", en: 'Pick the muscle that drives this exercise' },
  'game.right': { uk: 'Правильно', en: 'Correct' },
  'game.wrong': { uk: 'Хибно', en: 'Wrong' },
  'game.wrong.agonist': { uk: 'Агоніст —', en: 'The agonist is' },
  'game.explain.role': { uk: "Вибраний м'яз тут — {role}.", en: 'Your pick is the {role} here.' },
  'game.explain.absent': { uk: "Вибраний м'яз у цій вправі не працює.", en: 'Your pick does not work in this exercise.' },
  'game.next': { uk: 'Далі', en: 'Next' },
  'game.finish': { uk: 'Підсумок', en: 'Results' },
  'game.score': { uk: 'Рахунок', en: 'Score' },
  'game.best': { uk: 'Найдовша серія', en: 'Longest streak' },
  'game.perfect': { uk: 'Без жодної помилки', en: 'Not a single mistake' },
  'game.mistakes': { uk: 'Помилки — повтори в довіднику', en: 'Mistakes — review them in the reference' },
  'game.again': { uk: 'Ще раз', en: 'Play again' },
  'game.modes': { uk: 'Інший Режим', en: 'Another mode' },

  'muscle.plates': {
    uk: "У скількох вправах цей м'яз у кожній ролі",
    en: 'In how many exercises this muscle plays each role',
  },
  'muscle.none': { uk: "Вправ для цього м'яза поки немає.", en: 'No exercises for this muscle yet.' },
  'exercise.legend': { uk: 'Кольори ролей', en: 'Role colours' },
  'related.heading': { uk: "Пов'язані вправи", en: 'Related exercises' },
  'related.says': {
    uk: 'Той самий агоніст — заміна, коли тренажер зайнятий',
    en: 'Same agonist — a swap when the machine is taken',
  },
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

const LANG_KEY = 'lang';

/**
 * The remembered language, or the default. Browser storage can be blocked,
 * cleared or throw on access (private window), and none of that may break the
 * app: the language is then simply the default. `storage` is a getter because
 * merely touching `localStorage` can throw.
 */
export function loadLang(storage) {
  try {
    const lang = storage().getItem(LANG_KEY);
    return LANGS.includes(lang) ? lang : LANGS[0];
  } catch {
    return LANGS[0];
  }
}

/** Remember the language. A failed write is not worth an error: it is a convenience. */
export function saveLang(storage, lang) {
  try {
    storage().setItem(LANG_KEY, lang);
  } catch {
    // Storage unavailable: the language just won't outlive this session.
  }
}
