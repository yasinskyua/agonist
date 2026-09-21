# Agonist — Гра для заучування атласу й Ролей

Status: ready-for-agent

Походження: розпитування (grill-with-docs) і прототип 21.09.2026. Терміни
Гра, Режим, Партія записані в `CONTEXT.md`. Прототип — гілка
`prototype/muscle-game`, вердикт — у `PROTOTYPE-VERDICT.md` на ній.

## Problem Statement

Тренер відкриває довідник, коли треба щось перевірити: який М'яз працює в
цій Вправі, де він на тілі. Але в залі, перед Клієнтом, йому треба знати це
напам'ять — хто Агоніст, де лежить підлопатковий, чим Синергіст відрізняється
від Стабілізатора. Довідник відповідає на питання, але не вчить: прочитане
раз забувається, і Тренер знову лізе в телефон посеред підходу.

У застосунку немає способу перевірити себе й закріпити знання — тільки
гортати й читати.

## Solution

Гра в стилі «прапори й столиці»: Тренер обирає Режим, відповідає на десять
питань поспіль, одразу бачить, чи влучив, а при помилці — правильну відповідь
на мапі з одним рядком пояснення. У кінці Партії — рахунок і список помилок з
посиланнями в довідник. Гра пам'ятає, де Тренер помиляється, і частіше питає
саме це.

П'ять Режимів, кожен учить одне:

1. **Знайди М'яз** — дано назву, тапнути М'яз на мапі.
2. **Назви М'яз** — М'яз підсвічено на мапі, вибрати назву з чотирьох.
3. **Хто Агоніст?** — дано Вправу, вибрати її Агоніста з чотирьох М'язів.
4. **Яка Роль?** — дано Вправу й М'яз, вибрати його Роль у ній.
5. **Де Агоніст?** — дано М'яз, вибрати Вправу, в якій він Агоніст, з чотирьох.

Вхід — кнопка «▶ Гра» в шапці атласу. Партія — окремий повноекранний екран:
прогрес, серія, велике питання, мапа посередині, великі кнопки відповідей.

## User Stories

### Вхід і вибір Режиму

1. As a Тренер, I want a «Гра» button in the atlas header, so that I can start practising from the screen I already have open.
2. As a Тренер, I want to see all five Modes as large tiles with a one-line description each, so that I know what each one trains before I start.
3. As a Тренер, I want to start a Round with one tap on a Mode, so that a Round fits between two clients.
4. As a Тренер, I want the Quiz to have its own address, so that the phone's Back and the installed app's back gesture leave it the way they leave any other screen.
5. As a Тренер, I want a reload on the Quiz address to bring me to the Mode picker, not break, so that an interrupted Round costs nothing but the Round.
6. As a Тренер, I want to leave the Quiz with a close button at any time, so that I can return to the atlas when a client arrives.

### Партія

7. As a Тренер, I want each Round to be exactly ten questions of one Mode, so that I can finish it in about a minute.
8. As a Тренер, I want a progress bar that shows which questions I got right and wrong so far, so that I see how the Round is going.
9. As a Тренер, I want a streak counter once I have two or more right in a row, so that a good run feels rewarding.
10. As a Тренер, I want no question to repeat within one Round, so that ten questions mean ten different things.
11. As a Тренер, I want every answer — right or wrong — to wait for my «Далі» and never move on by itself, so that I have time to read the solution even when I was right.
12. As a Тренер, I want the screen to have the same size and layout after a right answer and after a wrong one, so that the map does not jump and I know where «Далі» is.
13. As a Тренер, I want the right answer shown on the body map after every answer, so that I connect the name with the place.
14. As a Тренер, I want one line of explanation after a mistake, so that I learn the reason, not just the answer.
15. As a Тренер, I want the question and the answers in the interface language, so that the Quiz speaks the same language as the rest of the app.

### Режим 1: Знайди М'яз

16. As a Тренер, I want to be given a Muscle's name and tap it on the map, so that I learn where each Muscle lies.
17. As a Тренер, I want to turn the figure myself between front and back, so that knowing which side a Muscle is on is part of the knowledge, not a hint.
18. As a Тренер, I want a tap on either the left or the right Muscle to count, so that the side of the body does not matter.
19. As a Тренер, I want the finger-sized tap zones of the atlas to work in the Quiz too, so that a narrow Muscle can be hit with a thumb.
20. As a Тренер, I want pinch and drag to zoom the figure without counting as an answer, so that I can look closer before I tap.
21. As a Тренер, I want a wrong tap to tell me which Muscle I actually tapped, so that I learn that one too.
22. As a Тренер, I want the right Muscle highlighted and the figure turned to the side that shows it, so that I see where it was.
23. As a Тренер, I want the Muscle's Function as the explanation, so that I remember what it does along with where it is.
24. As a Тренер, I want only Muscles that have Exercises to be asked, so that every question matters in the gym.

### Режим 2: Назви М'яз

25. As a Тренер, I want a Muscle highlighted and framed on the map, and four names to choose from, so that I learn to name what I see.
26. As a Тренер, I want the wrong names to come from the same Muscle Group when possible, so that I have to tell neighbours apart.
27. As a Тренер, I want the Function shown after a mistake, so that the name gets an anchor.

### Режим 3: Хто Агоніст?

28. As a Тренер, I want an Exercise name and four Muscles to choose its Agonist from, so that I learn who drives each movement.
29. As a Тренер, I want the wrong options to be the Exercise's own Synergists and Stabilizers first, so that I learn to separate the Agonist from the Muscles that only help.
30. As a Тренер, I want the full Role Distribution of the Exercise painted on the map after I answer, in the atlas's Role colours, so that I see the whole picture at once.
31. As a Тренер, I want the explanation to say what Role the Muscle I picked actually has in this Exercise, or that it does not work in it, so that my mistake teaches me something.

### Режим 4: Яка Роль?

32. As a Тренер, I want an Exercise and one of its Muscles, and to choose the Muscle's Role, so that I learn to tell Synergist from Stabilizer — the finest distinction in the product.
33. As a Тренер, I want the Muscle highlighted on the map while I choose, so that I know which one is meant.
34. As a Тренер, I want the right Role's one-line description as the explanation, so that I learn the difference between Roles, not just the label.
35. As a Тренер, I want the Role options to be whatever Roles the atlas defines, so that the Quiz keeps working if Roles are extended.

### Режим 5: Де Агоніст?

36. As a Тренер, I want a Muscle name and four Exercises, exactly one of which has it as the Agonist, so that I learn which Exercises target each Muscle.
37. As a Тренер, I want the wrong options to be Exercises where this Muscle works but is not the Agonist, so that I learn the difference between "works in" and "drives".
38. As a Тренер, I want the question worded as "In which Exercise is X the Agonist?", not "which Exercise loads X", so that the question has one right answer.
39. As a Тренер, I want the explanation to tell me what Role the Muscle has in the Exercise I picked, so that I learn from the wrong choice.

### Непевні рішення

40–41a. *Зняті.* Вичитка Розподілу Ролей закрита (тікет 10 і ADR-0006 на `main`): усі 80 Вправ звірені з ExRx, позначок непевності в контенті більше немає. Гра питає про весь Розподіл Ролей.

### Детальніше

41b. As a Тренер, I want a «Детальніше» button after each answer that opens, over the map, what the Agonist does and every Muscle of the Exercise by Role with the author's note on why, so that I can read the full solution when I want to and skip it when I don't.

### Підсумок

42. As a Тренер, I want the score out of ten at the end of a Round, so that I know how I did.
43. As a Тренер, I want my longest streak shown when it was three or more, so that a good run is acknowledged even with mistakes.
44. As a Тренер, I want the list of my mistakes, each linking to its Muscle or Exercise in the reference, so that I can read up right away.
45. As a Тренер, I want a mistake link to take me out of the Quiz straight into the reference page, so that one tap gets me to the answer.
46. As a Тренер, I want «Ще раз», «Інший Режим» and close buttons on the summary, so that I choose what to do next.

### Пам'ять помилок

47. As a Тренер, I want Muscles and Exercises I got wrong to come up more often in later Rounds of the same Mode, so that the Quiz spends my time on what I do not know.
48. As a Тренер, I want an item to stop being "weak" after I answer it right twice in a row, so that what I have learned stops coming back.
49. As a Тренер, I want the memory kept on my phone between visits, so that it builds up over days.
50. As a Тренер, I want the Quiz to work normally when the phone's storage is blocked, just without memory, so that a private window does not break it.

### Доступність

51. As a Тренер using a keyboard, I want to play Modes 2–5 with Tab and Enter, so that a laptop works as well as a phone.
52. As a Тренер using a screen reader, I want the result of each answer announced, so that I know whether I was right without seeing the colours.
53. As a Тренер, I want right and wrong shown by a mark and words, not by colour alone, so that colour blindness does not hide the result.

## Implementation Decisions

- **Новий глибокий модуль Гри, без DOM.** Уся логіка Гри — вибір питань, варіанти відповідей, перевірка, рахунок, серія, підсумок, пам'ять помилок — в одному модулі поруч з атласом. Він питає атлас і більше нічого не знає про екран. Інтерфейс вузький:
  - створення з атласом, джерелом випадковості й доступом до сховища (так само, як мова отримує сховище функцією, що може кинути виняток);
  - перелік Режимів;
  - `Партія` для Режиму — десять питань, кожне вже з варіантами відповідей і правильною відповіддю;
  - відповідь на питання — повертає, чи правильно, і що показати: правильний М'яз чи Вправу, Роль вибраного, рядок пояснення як дані (не як текст);
  - підсумок Партії — рахунок, найдовша серія, унікальні помилки.
- **Джерело випадковості передається ззовні**, щоб тести були детермінованими.
- **Форма питання** (з прототипу, скорочено):
  ```js
  { mode: 'find', muscle }                                   // Режим 1
  { mode: 'name', muscle, options: [muscle ×4] }             // Режим 2
  { mode: 'agonist', exercise, answer: muscle, options: [muscle ×4] }   // Режим 3
  { mode: 'role', exercise, muscle, answer: role, options: ROLES }      // Режим 4
  { mode: 'where', muscle, answer: exercise, options: [exercise ×4] }   // Режим 5
  ```
- **Пули питань:**
  - Режими 1, 2 — М'язи, у яких є хоча б одна Вправа.
  - Режим 3 — усі Вправи.
  - Режим 4 — усі пари «Вправа + М'яз».
  - Режим 5 — М'язи, що є Агоністом хоча б в одній Вправі.
- **Непевних рішень більше немає**: після тікета 10 черга вичитки порожня й прибрана з атласу, тож Гра нічого не виключає.
- **«Детальніше»** — кнопка поруч із «Далі», неактивна до відповіді. Відкриває поверх мапи, рівно на її місці, Функцію Агоніста й усі М'язи Вправи за Ролями (з описом Ролі й поясненням автора з `notes`, де воно є); вибраний М'яз позначений ✓ або ✗. Шапка й нижня панель при цьому не змінюються. Рядки — текст, не посилання: читання не виводить з Партії. Закривається тією ж кнопкою («Сховати») або Esc; наступне питання починається закритим.
- **Відволікаючі варіанти** — «схожі» спершу, решта добирається з усього пулу, без повторів і без другої правильної відповіді:
  - Режим 2 — М'язи тієї ж Групи.
  - Режим 3 — Синергісти й Стабілізатори цієї Вправи, потім М'язи Групи Агоніста.
  - Режим 5 — Вправи, де М'яз працює не Агоністом; Вправи, де він теж Агоніст, виключаються.
- **Режим 1 зараховує тап** по будь-якому шляху, що несе цей М'яз, на будь-якому виді й боці; шлях шиї, що несе два М'язи, зараховується для обох. Тап по М'язу без Вправ — звичайна помилка.
- **Пам'ять помилок:** окремо для кожного Режиму — множина «слабких» елементів (М'яз, Вправа або пара) з лічильником правильних відповідей поспіль; два поспіль знімають елемент. Партія бере до половини питань зі слабких цього Режиму, решту — випадково. Зберігається в `localStorage` пристрою під одним ключем Гри; зчитування й запис загорнуті так само, як запам'ятовування мови: заблоковане сховище означає Гру без пам'яті, не помилку.
- **Маршрут:** Гра має власну адресу в хеші поруч із М'язом і Вправою. Стан Партії живе в пам'яті сторінки; перезавантаження на адресі Гри відкриває вибір Режиму.
- **Екран Гри** (вердикт прототипу): вхід — кнопка в шапці поруч із перемикачем мови; Партія — повноекранний шар над атласом з власною шапкою (прогрес, серія, закрити), великим питанням, мапою посередині й великими кнопками внизу. Шторка атласу й підказка на мапі на час Гри ховаються. Мапа — та сама, що в атласі (ті самі фігури, масштабування, тап-зони); під час Гри тап по ній — відповідь, а не перехід у довідник.
- **Підсвічування** йде тим самим механізмом правил фарбування, що й екрани М'яза й Вправи. Ролі — кольорами Ролей атласу. Для Режиму 1 правильний і хибний М'язи мають власні кольори, які не збігаються з кольорами Ролей.
- **Рядки інтерфейсу** — через наявний словник, обома мовами. Назви М'язів — українською, як і всюди в застосунку; назви Вправ — мовою інтерфейсу.
- **Екран Партії не стрибає.** Шапка з питанням і нижня панель мають сталу висоту — однакову для кожного питання, до відповіді й після неї; мапа займає рівно те, що між ними. Усі назви одного кеглю — і довгі, і короткі; рамки розраховані на найдовшу назву, тож ніщо не зменшується, щоб влізти. Чотири варіанти лишаються на місці й після відповіді (позначені, не прибрані), рядок під ними — спершу підказка, потім вердикт, «Далі» завжди на місці й неактивна до відповіді. Кожне питання починається з цілої фігури; відповідь наближає правильний М'яз (як сторінка М'яза), розфарбовує Ролі й за потреби повертає фігуру. Наближення показується одразу й ніколи не переходить на наступне питання — інакше воно підказувало б відповідь. Розміри залежать лише від екрана пристрою (вузький чи низький телефон — на щабель менші для всіх назв разом), не від питання й не від довжини назви.
- **Після відповіді** — правильної чи хибної — екран однаковий за розміром і складом: вердикт, рядок «що цей М'яз у цій Вправі» і «Далі». Автопереходу немає: Тренер сам вирішує, коли йти далі (рішення після першої Партії на телефоні; спершу правильна відповідь переходила через секунду).

## Testing Decisions

- **Один шов — інтерфейс модуля Гри.** Тести кличуть лише його публічні функції й перевіряють поведінку: які питання приходять, які варіанти, що зараховується, що потрапляє в пам'ять. Не перевіряють, як модуль усередині вибирає.
- **На справжньому контенті**, як тести атласу: контент і є продукт, помилки найімовірніше в ньому. Фікстури — тільки там, де контент треба навмисно зламати (наприклад, Вправа без М'язів).
- **Детермінованість** — через передане джерело випадковості з фіксованим зерном.
- Що перевірити, серед іншого:
  - кожна Партія — рівно десять питань без повторів, для кожного Режиму;
  - у кожному питанні з вибором — чотири різні варіанти й рівно одна правильна відповідь; у Режимі 5 серед варіантів немає другої Вправи з тим самим Агоністом;
  - відволікаючі варіанти Режиму 3 — спершу з цієї ж Вправи;
  - Режим 1 зараховує тап по шляху, що несе два М'язи;
  - Режим 4 бере Ролі з атласу, а не має власного переліку;
  - помилка робить елемент слабким, дві правильні поспіль знімають; слабкі частіше потрапляють у Партію;
  - сховище, що кидає виняток, не ламає Гру.
- **Інтерфейс Гри** (шар, кнопки, фарбування, перехід з підсумку в довідник) перевіряється оком на телефоні, як решта UI за домовленістю попередньої специфікації. Виняток той самий, що й раніше: геометрія тап-зон уже покрита.
- Prior art: тести атласу (на справжньому контенті, `node:test`), тести словника (сховище, що кидає виняток).

## Out of Scope

- **Режим «Мікс»** — усі Режими в одній Партії. Після першої версії.
- **Рекорди й статистика за часом** — лише рахунок і серія поточної Партії.
- **Режим на М'язові групи** — рішення розпитування: Групи видні на мапі.
- **Таймер, звуки, анімації святкування.**
- **Синхронізація пам'яті між пристроями, акаунти.**
- **Офлайн** — у залі завжди є інтернет.
- **Гра для Клієнта** — Гра для Тренера; Клієнт і далі не користувач.
- **Режим 1 з клавіатури** — він просторовий за суттю; клавіатурі лишаються Режими 2–5.

## Further Notes

- Можливе розширення Ролей з трьох до п'яти (чернетка тікета 14 у `muscle-exercise-atlas`) Гру не ламає, бо Режим 4 бере Ролі з атласу. Пояснення Ролей тоді потребуватимуть нових рядків у словнику.
- Слово «навантажує» в Грі не вживається: у довіднику воно означає будь-яку Роль, а в Грі питання завжди про Агоніста.
- Чи цікаво грати, ще не перевірено на телефоні з повною Партією; перший тікет варто зробити тонким наскрізним (вхід → один Режим → підсумок), щоб це з'ясувати рано.
