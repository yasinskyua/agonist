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
  'spy.all': { uk: "Усі м'язи", en: 'All muscles' },
  'map.legend': { uk: 'Тілесні — ті, для яких є вправи', en: 'Tinted muscles have exercises' },
  'zoom.in': { uk: 'Наблизити', en: 'Zoom in' },
  'zoom.out': { uk: 'Віддалити', en: 'Zoom out' },
  'zoom.fit': { uk: 'Усе тіло', en: 'Whole body' },
  'map.hide': { uk: 'Сховати мапу', en: 'Hide the map' },
  'map.show': { uk: 'Показати мапу', en: 'Show the map' },
  'map.full': { uk: 'Мапа на весь екран', en: 'Full-screen map' },
  'map.close': { uk: 'Закрити мапу', en: 'Close the map' },
  'pick.open': { uk: 'Відкрити', en: 'Open' },
  'view.label': { uk: 'Сторона тіла', en: 'Side of the body' },
  'view.front': { uk: 'Спереду', en: 'Front' },
  'view.back': { uk: 'Ззаду', en: 'Back' },
  'lang.other': { uk: 'EN', en: 'УКР' },
  'lang.switch': { uk: 'Switch to English', en: 'Перемкнути на українську' },
  'back': { uk: 'Назад', en: 'Back' },
  'close': { uk: 'Закрити', en: 'Close' },
  'search.cancel': { uk: 'Скасувати', en: 'Cancel' },
  'search.clear': { uk: 'Очистити пошук', en: 'Clear search' },
  'search.count': { uk: 'Знайдено', en: 'Found' },

  'search.label': { uk: "Пошук м'язів, груп і вправ", en: 'Search muscles, groups and exercises' },
  'search.placeholder': { uk: 'Жим лежачи, біцепс…', en: 'Bench press, biceps…' },
  'search.empty': {
    uk: "Нічого не знайдено. Шукаються м'язи, групи й вправи.",
    en: 'Nothing found. Muscles, groups and exercises are searched.',
  },
  // «{q}» is the first letters of the Trainer's own word.
  'search.shorter': { uk: 'Спробуйте коротше: «{q}»', en: 'Try it shorter: «{q}»' },
  'search.groups': { uk: "М'язові групи", en: 'Muscle groups' },
  'search.muscles': { uk: "М'язи", en: 'Muscles' },
  'search.exercises': { uk: 'Вправи', en: 'Exercises' },
  'search.agonist': { uk: 'агоніст', en: 'agonist' },

  'role.agonist': { uk: 'Агоніст', en: 'Agonist' },
  'role.synergist': { uk: 'Синергіст', en: 'Synergist' },
  'role.stabilizer': { uk: 'Стабілізатор', en: 'Stabilizer' },
  'role.dynamic_stabilizer': { uk: 'Динамічний стабілізатор', en: 'Dynamic stabilizer' },
  'role.antagonist_stabilizer': { uk: 'Стабілізатор-антагоніст', en: 'Antagonist stabilizer' },
  'roles.synergist': { uk: 'Синергісти', en: 'Synergists' },
  'roles.stabilizer': { uk: 'Стабілізатори', en: 'Stabilizers' },
  'roles.dynamic_stabilizer': { uk: 'Динамічні стабілізатори', en: 'Dynamic stabilizers' },
  'roles.antagonist_stabilizer': { uk: 'Стабілізатори-антагоністи', en: 'Antagonist stabilizers' },
  'role.agonist.does': { uk: 'Веде рух', en: 'Drives the movement' },
  'role.synergist.does': { uk: 'Допомагає агоністу', en: 'Assists the agonist' },
  'role.dynamic_stabilizer.does': {
    uk: 'Рухається разом із суглобами, майже не змінюючи довжини',
    en: 'Moves with the joints, barely changing length',
  },
  'role.stabilizer.does': { uk: 'Утримує положення, руху не створює', en: 'Holds position, creates no movement' },
  'role.antagonist_stabilizer.does': {
    uk: 'Тримає суглоб з протилежного боку',
    en: 'Holds the joint from the opposite side',
  },

  // The legend's own disclosure sentences (ticket 05): one per Role, after
  // `CONTEXT.md`'s definitions — shown when a tap opens that Role in the legend.
  'role.agonist.sentence': {
    uk: "Агоніст — м'яз, який виконує основний рух Вправи: у присіданні це квадрицепс.",
    en: "The Agonist is the Muscle that drives the Exercise's main movement — the quadriceps in a squat.",
  },
  'role.synergist.sentence': {
    uk: "Синергіст — м'яз, який допомагає Агоністу виконати рух, не ведучи його сам: у присіданні це сідничні.",
    en: 'A Synergist is a Muscle that helps the Agonist move without leading it — the glutes in a squat.',
  },
  'role.dynamic_stabilizer.sentence': {
    uk: "Динамічний стабілізатор — двосуглобовий м'яз, що проходить Вправу майже без зміни довжини, стабілізуючи суглоби на ходу: у присіданні це задня поверхня стегна.",
    en: 'A Dynamic stabilizer is a two-joint Muscle that barely changes length through the Exercise, stabilizing the joints as it goes — the hamstrings in a squat.',
  },
  'role.stabilizer.sentence': {
    uk: "Стабілізатор — м'яз, який утримує положення тіла чи суглоба під час Вправи, не створюючи самого руху: у присіданні це розгиначі спини.",
    en: "A Stabilizer is a Muscle that holds the body or a joint in place during the Exercise without creating the movement itself — the spinal erectors in a squat.",
  },
  'role.antagonist_stabilizer.sentence': {
    uk: "Стабілізатор-антагоніст — м'яз, що скорочується з протилежного боку суглоба, аби двосуглобовий м'яз зберігав натяг у сусідньому суглобі: у згинанні ніг лежачи це квадрицепс.",
    en: 'An Antagonist stabilizer is a Muscle that contracts on the opposite side of a joint so a two-joint Muscle keeps its tension at the neighboring joint — the quadriceps in a lying leg curl.',
  },

  // The header's way into the Game (ADR-0007): the two grades of a Card.
  'flash.enter': { uk: 'Знав / Не знав', en: 'Knew it / Didn\'t' },
  'card.hint': { uk: 'Назви Агоніста вголос, потім перевір себе', en: 'Say the Agonist out loud, then check yourself' },
  // The Card's own disclosure (ticket 05), before reveal: what the task asks for.
  'card.agonist.question': { uk: 'Хто такий Агоніст?', en: 'Who is the Agonist?' },
  'card.reveal': { uk: 'Показати відповідь', en: 'Show the answer' },
  'card.no': { uk: 'Не знав', en: "Didn't know it" },
  'card.yes': { uk: 'Знав', en: 'Knew it' },
  'round.known': { uk: 'знав', en: 'knew' },
  // «1 з 10 · знав 0»: the tally spelled out in words, not «1/10».
  'round.of': { uk: 'з', en: 'of' },
  'round.done': { uk: 'Підсумок', en: 'Results' },
  'round.score': { uk: 'Рахунок', en: 'Score' },
  'round.perfect': { uk: 'Без жодної помилки', en: 'Not a single mistake' },
  'round.review': { uk: 'Варто переглянути', en: 'Worth reviewing' },
  'round.map': { uk: 'На мапу', en: 'To the map' },
  'round.again': { uk: 'Ще партія', en: 'Another round' },

  // «{n}» is the number: the noun after it declines by it (see `exerciseCount`).
  'exercises.one': { uk: '{n} вправа', en: '{n} exercise' },
  'exercises.few': { uk: '{n} вправи', en: '{n} exercises' },
  'exercises.many': { uk: '{n} вправ', en: '{n} exercises' },
  'exercises.other': { uk: '{n} вправи', en: '{n} exercises' },
  'muscle.none': { uk: "Вправ для цього м'яза поки немає.", en: 'No exercises for this muscle yet.' },
  'exercise.legend': { uk: 'Кольори ролей', en: 'Role colours' },
  'related.heading': { uk: "Пов'язані вправи", en: 'Related exercises' },
  'related.says': {
    uk: 'Той самий агоніст — заміна, коли тренажер зайнятий',
    en: 'Same agonist — a swap when the machine is taken',
  },

  // The bottom tab bar (ADR-0008): navigation between the app's sections.
  'tabs.label': { uk: 'Розділи застосунку', en: 'App sections' },
  'tabs.reference': { uk: 'Довідник', en: 'Reference' },
  'tabs.game': { uk: 'Гра', en: 'Game' },
  'tabs.exam': { uk: 'Іспит', en: 'Exam' },

  // The Exam's Digest: Питання за Темами, відповідь відкрита одразу.
  'exam.outside': { uk: 'не з матеріалів клубу', en: 'not from the club materials' },
  'exam.exercise': { uk: 'Вправа', en: 'Exercise' },

  // The Exam's Cards Format (ADR-0008): the same Question, self-graded.
  'exam.cards': { uk: 'Картки', en: 'Cards' },
  'exam.cards.does': { uk: 'Згадати відповідь самому', en: 'Recall the answer yourself' },
  'exam.cards.hint': { uk: 'Скільки Питань? Оберіть довжину Партії.', en: 'How many Questions? Pick the length of the Round.' },
  'exam.cards.ten': { uk: '10 Питань', en: '10 Questions' },
  // «{n}» is the whole Exam's Question count — never hardcoded, so it can't drift from the content.
  'exam.cards.all': { uk: 'Усі {n}', en: 'All {n}' },
  'exam.cards.topic': { uk: 'Одна Тема', en: 'One Topic' },
  'exam.answer': { uk: 'Відповідь', en: 'Answer' },
  'exam.digest': { uk: 'До Конспекту', en: 'To the Digest' },

  // The Exam's Test Format (ADR-0008, ticket 07): four options, auto-graded —
  // the length picker reuses the Cards strings above, unchanged wording.
  'exam.test': { uk: 'Тест', en: 'Test' },
  'exam.test.does': { uk: 'Обрати з чотирьох варіантів', en: 'Pick from four options' },
  'exam.test.next': { uk: 'Далі', en: 'Next' },
  'exam.test.correct': { uk: 'Правильно', en: 'Correct' },
  'exam.test.wrong': { uk: 'Неправильно', en: 'Incorrect' },

  // «Повторити слабкі» (ticket 08): a Round of only the Questions last graded
  // «Не знав» — shared wording between Cards and Test, since the memory is.
  'exam.weak': { uk: 'Слабкі Питання', en: 'Weak Questions' },
  // «{n}» is how many Questions are weak right now — never hardcoded.
  'exam.weak.repeat': { uk: 'Повторити слабкі ({n})', en: 'Repeat weak ({n})' },
  'exam.weak.empty': { uk: 'Поки нема чого повторювати.', en: 'Nothing to repeat yet.' },

  // The first-launch welcome (ticket 04): home's own state until dismissed.
  // The three doors reuse the tab names (tabs.*) above; these are the lines
  // under each — reference/game/exam matches the tab it repeats.
  'welcome.about': { uk: "Довідник м'язів і вправ для персонального тренера.", en: 'A reference of muscles and exercises for personal trainers.' },
  'welcome.reference': { uk: "Мапа тіла, м'язи й вправи", en: 'Body map, muscles and exercises' },
  'welcome.game': { uk: 'Партія карток: назви Агоніста вголос', en: 'A round of cards: say the Agonist out loud' },
  'welcome.exam': { uk: 'Конспект і партії до Іспиту Школи Тренерів', en: 'Digest and rounds for the Trainer School Exam' },
  'welcome.start': { uk: 'Почати', en: 'Start' },
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

/**
 * «3 вправи», «12 вправ», «1 вправа»: the noun follows the number by the
 * language's own plural rules, which Ukrainian has four of.
 */
export function exerciseCount(lang, n) {
  return translator(lang)(`exercises.${new Intl.PluralRules(lang).select(n)}`).replace('{n}', n);
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
