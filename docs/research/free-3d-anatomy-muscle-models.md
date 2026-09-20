# Безкоштовні 3D-моделі анатомії людини з мʼязами — для iOS-застосунку

Дата перевірки: 2026-09-20. Усі твердження нижче взяті з першоджерел (офіційні сайти проєктів, GitHub-репозиторії, сторінки ліцензій, офіційні API). Де перевірити не вдалося — прямо написано «не підтверджено з першоджерела».

---

## TL;DR

Реально придатних до закритого комерційного iOS-застосунку джерел мʼязів **мало**. Практично лише два: **BodyParts3D** (за поточною офіційною сторінкою ліцензії — CC BY 4.0) і **TotalSegmentator** (Apache-2.0 моделі + CC BY 4.0 датасет, але меші треба будувати самому з CT-сегментацій). Найкращий за якістю та повнотою атлас — **Z-Anatomy** — заблокований ShareAlike **і** вбудованими NC-ассетами.

| Модель / джерело | Ліцензія (цитата з першоджерела) | Комерційне використання в закритому App Store-застосунку | Формати | Мʼязи окремими обʼєктами? |
|---|---|---|---|---|
| [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) | «Creative Commons Attribution 4.0 International» (сторінка оновлена 2025/02/27) | ✅ так, з атрибуцією. ⚠️ але є суперечність зі старою сторінкою (див. «Ліцензійні пастки») | OBJ | ✅ так, окремі файли + окремо left/right, з FMA ID |
| [TotalSegmentator](https://github.com/wasserth/TotalSegmentator) | «Openly available for any usage (Apache-2.0 license)» для частини задач; датасет — [CC BY 4.0](https://zenodo.org/api/records/10047292) | ✅ так для Apache-2.0-задач. ❌ ні для `thigh_shoulder_muscles`, `tissue_types` (ліцензія безкоштовна лише non-commercial) | NIfTI-сегментації → меш треба генерувати самому | ✅ так, окремі іменовані класи (`gluteus_maximus_left` тощо) |
| [SPL Abdominal Atlas (Open Anatomy)](https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html) | «3D Slicer License section B» | ⚠️ ймовірно так, але це кастомна ліцензія з обовʼязковим текстом атрибуції, не CC | VTK (94 меші) | ✅ так, 19 мʼязових мешів з іменами у назві файлу |
| [NIH 3D](https://3d.nih.gov/terms) | «many entries in NIH 3D fall under public domain or Creative Commons licenses (e.g., CC-BY), others may have more restrictive terms» | ⚠️ залежить від кожного запису; трапляється CC-BY-NC-ND | GLB, STL | залежить від запису |
| [Sketchfab (CC BY / CC0)](https://api.sketchfab.com/v3/licenses) | «CC Attribution … Commercial use is allowed» / «CC0 Public Domain» | ✅ для CC BY і CC0; ❌ для CC BY-NC*, CC BY-ND | glTF/OBJ/FBX/USDZ (залежить від автора) | зазвичай ❌ — один злитий меш |
| [Z-Anatomy](https://github.com/Z-Anatomy/The-blend) | «Creative Commons Attribution-ShareAlike 4.0 International License» | ❌ **блокер**: ShareAlike + вбудовані CC-BY-NC-SA / CC-BY-NC моделі | .blend (Blender template) | ✅ так, окремі іменовані обʼєкти + TA2 ID + латина |
| [MakeHuman](https://github.com/makehumancommunity/makehuman) | код — «GNU Affero General Public License», ассети — «Creative Commons CC0 1.0 Universal» | ✅ ассети CC0. ⚠️ AGPL стосується самої програми, не експортованих мешів | OBJ/FBX/glTF (експорт з програми) | ❌ мʼязів немає (базова оболонка тіла) |
| [Anatomy Standard](https://www.anatomystandard.com/docs/terms-of-use.html) | «Creative Commons Attribution-Non Commercial 4.0 International License» | ❌ **блокер (NC)** | 2D/відео; 3D-завантаження не підтверджено з першоджерела | н/д |
| [Visible Human Project](https://www.nlm.nih.gov/research/visible/visible_human.html) | «a public-domain library of cross-sectional cryosection, CT, and MRI images»; «As of 2019, a license is no longer required to access the VHP datasets» | ✅ так | сирі зрізи/CT/MRI (не меші) | ❌ це не 3D-меші, потрібна власна сегментація |
| [Human Protein Atlas](https://www.proteinatlas.org/about/licence) | «Creative Commons Attribution 4.0 International License» | ✅ так | — | ❌ мʼязових 3D-мешів немає |

---

## 1. BodyParts3D / Anatomography (DBCLS, Японія)

**Що це.** База 3D-моделей анатомії, побудована навколо концептів Foundational Model of Anatomy (FMA). Офіційно описана як «Parts of FMA (3.0) concepts» на [сторінці Anatomography](https://lifesciencedb.jp/bp3d/).

**Ліцензія.** Поточна офіційна сторінка ліцензії в архіві NBDC (оновлена 2025/02/27) каже: [«The license for this database is specified in the Creative Commons Attribution 4.0 International»](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), з обовʼязковою атрибуцією рядком `"BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"`. Та сама сторінка прямо дозволяє: «freely redistribute part or whole of the data from this database» і «freely create and distribute database and other derivative works».

**Комерційне використання / редистрибуція в закритому застосунку.** ✅ CC BY 4.0 дозволяє і комерцію, і вкладення у пропрієтарний продукт, за умови атрибуції. ShareAlike у цій редакції немає.

**Атрибуція.** Обовʼязкова, у формулюванні, наведеному вище ([джерело](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)).

**Формати й розміри.** [Офіційна сторінка завантаження](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) перелічує:
- `isa_BP3D_4.0_obj_99.zip` — 136 MB
- `partof_BP3D_4.0_obj_99.zip` — 62 MB
- текстові списки відповідностей: `isa_parts_list_e.txt` (126 KB), `partof_parts_list_e.txt` (58 KB), `isa_element_parts.txt` (1.1 MB) та ін.

Формат — OBJ; [сторінка про базу](https://lifesciencedb.jp/bp3d/info/index.html) згадує «Sets of data in OBJ formats (ver 2.0, 3.0, 4.0)» і що поточна версія 4.3i містить 3 899 концептів.

**Мʼязи окремо?** ✅ Так. Завантажений [`isa_parts_list_e.txt`](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt) містить 2 906 рядків виду `concept id / representation id / en`, де кожному FMA-концепту відповідає окремий BP-обʼєкт. Мʼязи присутні як індивідуальні обʼєкти, зокрема окремо ліві й праві:

```
FMA22314	BP8402	gluteus maximus
FMA22328	BP5065	right gluteus maximus
FMA22329	BP8401	left gluteus maximus
FMA13109	BP9039	pectoralis minor
```

У цьому ж файлі 93 записи містять слово «muscle» і 126 записів — типові назви скелетних мʼязів (biceps/deltoid/trapezius/gluteus/soleus/pectoralis/latissimus тощо). Другий список, [`partof_parts_list_e.txt`](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_parts_list_e.txt), має 1 369 записів і лише 9 зі словом «muscle» — тобто мʼязова деталізація в BodyParts3D **часткова**, це не повний мʼязовий атлас.

**Анатомічна номенклатура.** ✅ FMA ID присутній у першій колонці кожного запису списків ([isa](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt)). Terminologia Anatomica у самій BodyParts3D не підтверджено з першоджерела.

---

## 2. TotalSegmentator (University Hospital Basel)

**Що це.** Інструмент сегментації понад 100 анатомічних структур на CT/MRI + відкритий датасет сегментацій.

**Ліцензія.** У [README репозиторію](https://github.com/wasserth/TotalSegmentator) задачі поділені явним заголовком: **«Openly available for any usage (Apache-2.0 license)»** — і окремо **«Available with a license (free licenses available for non-commercial usage … For a commercial license contact jakob.wasserthal@usb.ch)»**.

Датасет на Zenodo — [запис 10047292](https://zenodo.org/api/records/10047292), поле `license: {"id": "cc-by-4.0"}`, назва «Dataset with segmentations of 117 important anatomical structures in 1228 CT images», один файл `Totalsegmentator_dataset_v201.zip` розміром 23 581 218 285 байт (≈23.6 GB).

**Комерційне використання.** ✅ для Apache-2.0-задач і для CC BY 4.0-датасету. ❌ безкоштовно — для ліцензованих задач.

**Мʼязи окремо?** ✅ Так, окремими іменованими класами. Під заголовком Apache-2.0 у [README](https://github.com/wasserth/TotalSegmentator) перелічені серед інших:
- `head_muscles`: masseter_right/left, temporalis_right/left, lateral_pterygoid, medial_pterygoid, digastric…
- `headneck_muscles`: sternocleidomastoid, trapezius, platysma, levator scapulae, scalenes…
- `abdominal_muscles`: pectoralis_major, rectus_abdominis, serratus_anterior, latissimus_dorsi, trapezius, external/internal_oblique, erector_spinae, psoas_major, quadratus_lumborum (лише в межах T4–L4)
- `oculomotor_muscles`: rectus/oblique мʼязи ока
- базова задача `total` містить, зокрема, `gluteus_maximus_left/right`, `gluteus_medius_left/right`, `gluteus_minimus_left/right` ([таблиця класів у README](https://github.com/wasserth/TotalSegmentator))

⚠️ **Пастка:** найцікавіші для фітнес/спортивного застосунку `thigh_shoulder_muscles` (quadriceps_femoris, sartorius, deltoid, supraspinatus, infraspinatus, subscapularis, trapezius, triceps_brachii…) і `tissue_types` (skeletal_muscle) стоять під заголовком «Available with a license», тобто безкоштовна ліцензія тільки non-commercial.

**Формати.** Вихід — маски сегментації (NIfTI); готових мешів немає, полігональну модель треба генерувати самому (marching cubes → decimation → glTF/USDZ). Формат вихідних файлів прямо як «OBJ/glTF» у README не заявлений — не підтверджено з першоджерела.

**Номенклатура.** Імена класів — машинні англійські (`psoas_major_left`). FMA/TA ID не підтверджено з першоджерела.

---

## 3. Open Anatomy Project — SPL Abdominal Atlas (Brigham & Women's / Harvard)

**Що це.** Атлас, отриманий із клінічного CT-скану. Офіційна сторінка: [«Derived from a clinical quality CT scan, this SPL Abdominal Atlas features the skeletal system, vasculature, muscles, and abdominal organs»](https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html).

**Ліцензія.** Сторінка атласу в полі License вказує «**3D Slicer License section B**» і веде на `slicer-license.html#PART-B`. У [тексті ліцензії 3D Slicer](https://slicer.org/LICENSE) Part B поширюється на «the software, and data, if any, which is the subject of this Software License (collectively, the 'Software')», містить пункт «Any commercialization of the Software is at the sole risk of the party or parties engaged in such commercialization» і вимагає при редистрибуції зберігати повний текст ліцензії та твердження «All or portions of this licensed product … have been obtained under license from The Brigham and Women's Hospital, Inc.».

**Комерційне використання / закритий застосунок.** ⚠️ Прямої заборони немає, і ліцензія прямо згадує комерціалізацію (на ризик користувача), але це **кастомна ліцензія, не CC** — потрібна юридична перевірка перед релізом. Копілефту типу ShareAlike у ній немає.

**Формати й розмір (перевірено завантаженням архіву).** `abdomen-2016-09.zip`, `Content-Length: 34 861 066` байт (≈33.2 MB), 172 файли, з них:
- **94 файли `.vtk`** (по одному мешу на структуру)
- 2 `.nrrd` (вихідний CT та label map), 1 `.mrml` (сцена 3D Slicer, 1.6 MB), `atlasStructure.json`, палітра `.ctbl`, PNG-ілюстрації та вбудований вебвʼювер.

Джерело архіву — [сторінка атласу](https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html), посилання `https://www.openanatomy.org/atlases/nac/abdomen-2016-09.zip`.

**Мʼязи окремо?** ✅ Так — **19 окремих мешів**, імена прямо в назвах файлів:

```
Model_131_right_psoas_muscle.vtk
Model_133_right_quadratus_lumborum_muscle.vtk
Model_135_right_external_oblique_muscle.vtk
Model_137_right_erector_spinae_muscle.vtk
Model_143_right_gluteus_maximus_muscle.vtk
Model_32_rectus_abdominis_muscle.vtk
… (+ дзеркальні left_*)
```

**Номенклатура.** ❌ Лише англійські назви. У `atlasStructure.json` кожна структура має `"annotation": {"name": "..."}` і числовий `dataKey` label map — **FMA або TA ID відсутні** (перевірено на вмісті архіву).

**Суміжний атлас.** [Mauritanian Anatomy Laboratory Thoracic Atlas](https://www.openanatomy.org/atlas-pages/atlas-mauritania-thorax.html) — та сама ліцензія «3D Slicer License section B», але опис перелічує «thoracic skeletal system, the respiratory system, the cardiovascular system, and the esophagus» — мʼязів у переліку немає.

---

## 4. Z-Anatomy (найповніший — і водночас юридично найризикованіший)

**Що це.** Вільний 3D-атлас у вигляді Blender application template. Офіційний репозиторій: [github.com/Z-Anatomy/The-blend](https://github.com/Z-Anatomy/The-blend) (репозиторій має назву `Models-of-human-anatomy`, опис «Human male model»). README: «This repository contains the Blender template of the Z-Anatomy Project. It includes models derived from 'BodyParts3D' and definitions that heavily rely on Wikipedia».

**Ліцензія.** [`License.txt`](https://github.com/Z-Anatomy/The-blend/blob/master/License.txt): «All the code and content shared by 'Z-Anatomy' is under **Creative Commons Attribution-ShareAlike 4.0 International License**», з умовою «You must distribute any derivative work based on part or whole of the data from this database under the same license».

**Комерційне використання в закритому App Store-застосунку.** ❌ Два незалежні блокери:
1. **ShareAlike.** Будь-яка адаптація мешів (ремеш, децимація, конвертація в USDZ з правками) має поширюватися під CC BY-SA 4.0 — тобто ви мусите віддати змінені моделі під тією ж ліцензією. Це не заражає код застосунку, але робить неможливим «закриті» власні моделі на цій базі.
2. **Вбудовані NC-ассети.** Той самий `License.txt` у секції ATTRIBUTIONS перелічує серед використаних та адаптованих моделей:
   - `"Anatomy of the Inner Ear - by University of Dundee School of Medicine - **CC-BY-NC-SA 4.0**"`
   - `"Kidney - by Lissie Cowley - **CC-BY-NC 4.0**"`

   NC-матеріал усередині CC BY-SA-збірки означає, що **пакет цілком не можна використовувати комерційно**, доки ці частини не вилучено.

**Формати й розміри (перевірено завантаженням).**
- `Z-Anatomy.zip` — 86 734 957 байт (≈82.7 MB), усередині `Startup.blend` на 306 838 281 байт (≈292.6 MB), плюс `__init__.py`, теми `Anatomy_Bright.xml` / `Anatomy_Dark.xml`
- `Z-Biomechanics.7z` — 21 644 942 байт (≈20.6 MB)
- `TA2.csv` — 1 510 396 байт
- (розміри з [GitHub Contents API](https://github.com/Z-Anatomy/The-blend))

Готових OBJ/glTF/USDZ у репозиторії немає — тільки `.blend`, експортувати треба самому.

**Мʼязи окремо?** ✅ Так, окремі іменовані обʼєкти. Перевірено витяганням рядків із `Startup.blend`: знайдено 196 унікальних рядків формату `<Назва> muscle;Musculus <латина>;…`, наприклад:

```
Biceps brachii muscle;Musculus biceps brachii;Muscle biceps brachial;…
Deltoid muscle;Musculus deltoideus;Muscle deltoïde;…
Biceps femoris muscle;Musculus biceps femoris;…
```

Тобто кожна структура має англійську назву, латинську (Terminologia Anatomica), переклади кількома мовами та текстовий опис.

**Номенклатура.** ✅ Файл [`TA2.csv`](https://github.com/Z-Anatomy/The-blend/blob/master/TA2.csv) — 7 315 рядків із заголовком `TA2ID;English;Latin;Français;Español;Portugues;Italiano;Parsi`, з них 217 записів мають латинську назву на `Musculus`. Тобто **Terminologia Anatomica 2 ID присутні**. FMA ID у самому Z-Anatomy не підтверджено з першоджерела (але вихідна BodyParts3D їх має).

**Примітка про ліцензію-предка.** У ATTRIBUTIONS Z-Anatomy вказує джерело як «BodyParts3D - The Database Center for Life Science - **CC-BY-SA 2.1 Japan**», тоді як поточна офіційна сторінка BodyParts3D декларує CC BY 4.0. Див. наступний розділ.

---

## 5. NIH 3D (колишній NIH 3D Print Exchange)

**Ліцензія.** Єдиної ліцензії немає. [Terms & Conditions](https://3d.nih.gov/terms): «many entries in NIH 3D fall under public domain or Creative Commons licenses (e.g., CC-BY), others may have more restrictive terms»; «Users are responsible for selecting and applying the appropriate license to their content»; «NIH 3D does not enforce license terms on behalf of contributors».

**Перевірка на реальних записах** (через публічний API `https://3d.nih.gov/api/entries/<id>`, поле `metadata.license`):

| Запис | Ліцензія |
|---|---|
| [3DPX-004646 «Head and Neck STL File 3D Model Converted from a CT Scan DICOM File»](https://3d.nih.gov/entries/3dpx-004646) | `CC-BY-NC-ND` ❌ |
| [3DPX-013270 «Covid-19»](https://3d.nih.gov/entries/3dpx-013270) | `CC-BY` ✅ |
| [3DPX-021161 «Detailed Human Brain Model»](https://3d.nih.gov/entries/3DPX-021161) | `CC-BY` ✅ |
| [3dpx-003765 «3D model of the Brain»](https://3d.nih.gov/entries/3dpx-003765) | `CC-BY-SA` ⚠️ |

**Формати.** Головна сторінка [3d.nih.gov](https://3d.nih.gov/) каже, що користувач може «export your customized model as a GLB or STL».

**Висновок.** Перед використанням **кожен** запис треба перевіряти окремо через API — поле `submissions[0].metadata.license`. CC-BY-NC-ND трапляється й на анатомічних моделях.

---

## 6. Sketchfab

**Набір ліцензій (перевірено через офіційний API `https://api.sketchfab.com/v3/licenses`):**

| Label | Requirements (дослівно з API) |
|---|---|
| CC Attribution | «Author must be credited. Commercial use is allowed.» |
| CC Attribution-ShareAlike | «Author must be credited. Modified versions must have the same license. Commercial use is allowed.» |
| CC Attribution-NoDerivs | «Author must be credited. Modified versions can not be distributed. Commercial use is allowed.» |
| CC Attribution-NonCommercial | «Author must be credited. No commercial use.» |
| CC Attribution-NonCommercial-ShareAlike | «Author must be credited. No commercial use. Modified versions must have the same license.» |
| CC Attribution-NonCommercial-NoDerivs | «Author must be credited. No commercial use. Modified versions can not be distributed.» |
| CC0 Public Domain | — |

Окремо існує платний [Sketchfab Store з власними Standard / Editorial ліцензіями](https://sketchfab.com/licenses), де Editorial «cannot be used for any commercial or promotional use» — це не CC і до безкоштовних моделей не стосується.

**Що реально є (пошук через API, `downloadable=true`, `license=by`, запит «muscle anatomy»):**

| Модель | Ліцензія | Полігонів (faces) |
|---|---|---|
| [Female Anatomy by CheRa_Muscles](https://sketchfab.com/3d-models/none-132188d5be9b47eabb0e64b378d81603) | CC Attribution | 863 903 |
| [muscle anatomy](https://sketchfab.com/3d-models/none-89afe763fa674373841a4083213cdf5d) | CC Attribution | 325 504 |
| [male muscle anatomy](https://sketchfab.com/3d-models/none-3dc6a9eaffb24b5e95e8ab1a501d0319) | CC Attribution | 298 591 |
| [Female muscles base mesh](https://sketchfab.com/3d-models/none-abd8ccef6aeb42058601c192aadb8198) | CC Attribution | 129 562 |
| [Bodybuilder Man Anatomy Practice Basemesh](https://sketchfab.com/3d-models/none-67f60a34b71e497ead72645e8c5e9151) | CC Attribution | 47 994 |

Той самий запит із фільтром `license=cc0` **не повернув жодного результату** — безкоштовних CC0-мʼязових атласів на Sketchfab за цим запитом не знайдено. Ширший запит «anatomy» + CC0 дає переважно черепи тварин і écorché-скульптури, а не мʼязові атласи.

**Мʼязи окремо?** ⚠️ Зазвичай ❌ — це художні écorché-меші для референсу, без поділу на іменовані мʼязи. Для конкретної моделі це видно лише після завантаження; через API не перевіряється.

**Номенклатура.** ❌ FMA/TA ID немає.

---

## 7. MakeHuman

**Ліцензії (з офіційного репозиторію [makehumancommunity/makehuman](https://github.com/makehumancommunity/makehuman)):**
- [`LICENSE.CODE.md`](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.CODE.md) — «GNU Affero General Public License, Version 3»
- [`LICENSE.ASSETS.md`](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md) — «Creative Commons CC0 1.0 Universal», тобто повна відмова від прав «for any purposes, including without limitation commercial purposes»

**Комерційне використання.** ✅ Меші, згенеровані з CC0-ассетів, можна вкладати в закритий застосунок без атрибуції. ⚠️ AGPL стосується самої програми MakeHuman — не лінкуйте її код у застосунок.

**Мʼязи.** ❌ MakeHuman дає параметричну базову оболонку тіла, а не мʼязовий атлас. Наявність окремих мʼязових мешів не підтверджено з першоджерела (офіційний сайт makehumancommunity.org був недоступний на момент перевірки — ECONNREFUSED).

**Використання в проєкті.** Розумно як **база тіла / силует**, поверх якої лягають мʼязи з іншого джерела.

---

## 8. Visible Human Project (NLM / NIH)

[Офіційна сторінка NLM](https://www.nlm.nih.gov/research/visible/visible_human.html): «a public-domain library of cross-sectional cryosection, CT, and MRI images obtained from one male cadaver and one female cadaver». Ключове: **«As of 2019, a license is no longer required to access the VHP datasets»**.

- Visible Human Male (1994): ≈15 GB, 1 871 поперечних зрізів з кроком 1 мм
- Visible Human Female (1995): ≈40 GB, 5 189 анатомічних зображень з кроком 0.33 мм

**Це не меші.** Щоб отримати мʼязи як 3D-обʼєкти, потрібна власна сегментація — трудомісткий шлях, але юридично найчистіший (public domain).

---

## 9. Anatomy Standard

[Terms of Use](https://www.anatomystandard.com/docs/terms-of-use.html): «Creative Commons Attribution-Non **Commercial** 4.0 International License».

❌ **Блокер для App Store-застосунку**, що монетизується. Наявність завантажуваних 3D-моделей і форматів на сторінці умов не описана — не підтверджено з першоджерела.

---

## 10. Human Protein Atlas

[Сторінка ліцензії](https://www.proteinatlas.org/about/licence): «Creative Commons Attribution 4.0 International License», комерційне використання прямо дозволене («we encourage you to use our resource for your research and commercial purposes»), з обовʼязковим цитуванням. Але це білковий/клітинний ресурс — **мʼязових анатомічних 3D-мешів там немає**. Для анатомічного атласу нерелевантно.

---

## 11. Smithsonian Open Access

Офіційна сторінка `si.edu/openaccess` та `si.edu/openaccess/faq` на момент перевірки віддавали **HTTP 403** — умови для 3D-моделей **не підтверджено з першоджерела**. Єдине, що вдалося підтвердити: офіційний репозиторій метаданих [Smithsonian/OpenAccess](https://github.com/Smithsonian/OpenAccess) має ліцензію `CC0-1.0` і містить «Over 11 million metadata records» — це метадані, не 3D-меші.

Смітсонівські 3D-моделі в будь-якому разі — артефакти й зразки, не мʼязова анатомія людини.

---

## 12. Не вдалося перевірити

| Джерело | Статус |
|---|---|
| **AnatomyTool / Open3Dmodel** (`anatomytool.org`) | Сервер недоступний із цього середовища (ECONNREFUSED). Ліцензії й формати — **не підтверджено з першоджерела** |
| **BlendSwap** (`blendswap.com/help/licenses`) | HTTP 404 — ліцензійна політика **не підтверджено з першоджерела** |
| **Wikimedia Commons** | Ліцензія визначається пофайлово; конкретний мʼязовий 3D-файл не перевірявся — **не підтверджено з першоджерела** |
| **Apple, рекомендація «100k полігонів / 2048×2048 текстури»** | Фігурує як цитата з WWDC18 session 603, але сторінку сесії не вдалося прочитати напряму — **не підтверджено з першоджерела**. У поточній офіційній документації Apple жорсткого числа немає (див. нижче) |

---

## Ліцензійні пастки

1. **Z-Anatomy тягне NC усередині CC BY-SA.** Найважливіше з усього документа. Сама збірка задекларована як CC BY-SA 4.0, але [`License.txt`](https://github.com/Z-Anatomy/The-blend/blob/master/License.txt) визнає включення «Anatomy of the Inner Ear … CC-BY-NC-SA 4.0» і «Kidney … CC-BY-NC 4.0». Комерційне використання пакета цілком **неможливе**; теоретично можливе лише після доказового вилучення внутрішнього вуха й нирок — і все одно з ShareAlike на решту.

2. **Суперечність у ліцензії BodyParts3D.** Поточна сторінка NBDC-архіву каже [CC BY 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) (оновлено 2025/02/27), тоді як [стара сторінка на lifesciencedb.jp](https://lifesciencedb.jp/bp3d/info/license/index.html) досі декларує «クリエイティブ・コモンズ 表示-継承2.1 日本» (CC BY-SA 2.1 Japan) з атрибуцією «BodyParts3D, Copyright© 2008 ライフサイエンス統合データベースセンター licensed by CC表示－継承2.1 日本», і Z-Anatomy теж атрибутує предка як CC-BY-SA 2.1 Japan. Різниця критична: SA vs не-SA. **Перед релізом — письмовий запит до DBCLS** (контакт вказано на сторінці ліцензії) з фіксацією відповіді.

3. **ShareAlike не «заражає» код застосунку, але заражає моделі.** CC BY-SA поширюється на адаптований матеріал. Якщо ви ремешите/децимуєте/перефарбуєте модель — результат має бути під CC BY-SA. Swift-код застосунку від цього не стає відкритим, але ексклюзивності на власні моделі не буде, і потрібно надати доступ до адаптованих файлів.

4. **NC = стоп для App Store.** CC BY-NC*, будь-який варіант — платний застосунок, підписка, реклама або навіть безкоштовний застосунок комерційної компанії зазвичай трактуються як комерційні. Це стосується Anatomy Standard (CC BY-NC 4.0), частини записів NIH 3D (CC-BY-NC-ND) і частини задач TotalSegmentator.

5. **ND (NoDerivatives) — окрема пастка.** Конвертація OBJ→USDZ з оптимізацією є похідним твором. CC-BY-ND і CC-BY-NC-ND (наприклад, [3DPX-004646](https://3d.nih.gov/entries/3dpx-004646)) роблять це неможливим — Sketchfab формулює прямо: «Modified versions can not be distributed» ([API ліцензій](https://api.sketchfab.com/v3/licenses)).

6. **NIH 3D нічого не гарантує.** [Terms](https://3d.nih.gov/terms): «NIH 3D does not enforce license terms on behalf of contributors. It is the responsibility of the uploading User to monitor and enforce compliance». Тобто платформа не є гарантом — перевіряйте поле `license` кожного запису і зберігайте докази.

7. **3D Slicer License Part B — не CC.** [Вимагає](https://slicer.org/LICENSE) відтворювати весь текст ліцензії в кожній копії або субліцензії та включати фразу про Brigham and Women's Hospital. Для iOS це означає окремий екран «Ліцензії» з повним текстом, а не однорядкову атрибуцію.

8. **AGPL у MakeHuman.** Ассети CC0, але код — AGPLv3. Не тягніть бібліотеки MakeHuman у застосунок; беріть лише експортовані меші.

---

## Наступні кроки для iOS

### Формати й конвертація

Офіційна документація Apple [«Creating USD files for Apple devices»](https://developer.apple.com/documentation/usd/creating-usd-files-for-apple-devices) каже дослівно:

- Три формати USD: **USDA** («a plain-text format»), **USDC** («a binary format … the preferred format for geometry-heavy assets and large scenes»), **USDZ** («a self-contained zip archive … the recommended format for distributing and sharing assets»). Рекомендація Apple: «Export directly to USDC from your DCC when working with geometry. Use USDZ when your asset is ready to distribute or deploy.»
- **Система координат:** «RealityKit uses Y-up orientation and meters as its unit scale.» BodyParts3D/VTK-дані зазвичай у міліметрах — масштаб доведеться виправляти.
- **Валідація:** «Validate that your assets conform to the USD specification before including them in your app by using OpenUSD's `usdchecker` command-line tool.»
- **Текстури в USDZ:** «USDZ files may only include JPEG, PNG, EXR, and AVIF. Use AVIF textures where possible».
- **Рендерери:** RealityKit, Raytracer, Storm, SceneKit — з різною підтримкою фіч; SceneKit у документі прямо названий «part of the deprecated SceneKit framework». Тобто для нового проєкту — **RealityKit, не SceneKit**.

Blender уміє і імпорт, і експорт USD, включно з USDZ-архівами ([Blender Manual, Universal Scene Description](https://docs.blender.org/manual/en/latest/files/import_export/usd.html)) — тобто ланцюжок `.blend`/OBJ → Blender → USDC/USDZ робиться без сторонніх інструментів.

На iOS/macOS Model I/O дає програмний експорт: `MDLAsset` — «you can export an asset to any of several file formats» ([Apple Developer, MDLAsset](https://developer.apple.com/documentation/ModelIO/MDLAsset)).

### Бюджет продуктивності

Apple у поточній документації **не дає жорсткого ліміту полігонів**. Натомість [«Creating USD files for Apple devices»](https://developer.apple.com/documentation/usd/creating-usd-files-for-apple-devices) формулює правила:

- «The number of triangles your renderer must draw each frame is one of the most significant factors affecting performance. Focus on how many triangles are **visible at any one time**, not just the total count in your scene.»
- «Split large geometry into chunks … This allows the renderer to cull sections that are off camera» — для анатомії це природно збігається з поділом на окремі мʼязи.
- **Критично для імпортованих мешів:** «The default `subdivisionScheme` value in USD is `catmullClark` … This means subdivision surfaces is automatically enabled for assets that don't explicitly include a subdivision scheme.» Кожен рівень підрозділу множить полігони на 4. **Обовʼязково ставте `subdivisionScheme = none` при експорті.**
- «The default `doubleSided` value is off, however some DCCs enable it automatically during export» — перевірити, бо анатомічні меші часто експортуються двосторонніми.
- Матеріали: «use metallic workflow shaders in your DCC» — specular workflow підтримують лише Storm і Raytracer, не RealityKit.
- Обовʼязкові API: «any geometry with an applied material use the `MaterialBindingAPI`» та `SkelBindingAPI` для скелетів.

Орієнтир «≈100k полігонів + один набір 2048×2048 PBR-текстур» походить із WWDC18 і **не підтверджено з першоджерела** в рамках цієї перевірки.

### Практичний план

1. **Юридика спершу.** Письмово підтвердити з DBCLS статус BodyParts3D (CC BY 4.0 чи CC BY-SA 2.1 JP). Від цієї відповіді залежить уся архітектура контенту.
2. **Базовий сценарій (якщо CC BY 4.0 підтверджено):** BodyParts3D OBJ → Blender (обʼєднання left/right, чистка, decimate, `subdivisionScheme=none`) → USDC/USDZ → RealityKit. FMA ID з `isa_parts_list_e.txt` стає ключем бази даних застосунку; `TA2.csv` із Z-Anatomy для перекладів використовувати **не можна** (CC BY-SA).
3. **Запасний сценарій:** SPL Abdominal Atlas (19 мʼязів, VTK → Blender через imports) для першого вертикального зрізу — але з повним текстом 3D Slicer License Part B у застосунку.
4. **Для фітнес-сценарію:** TotalSegmentator Apache-2.0-задачі (`abdominal_muscles`, `head_muscles`, `headneck_muscles` + `total`) на публічних CT → власні меші. Уникати `thigh_shoulder_muscles` і `tissue_types` без комерційної ліцензії.
5. **Ніколи не брати Z-Anatomy як основу продукту** — тільки як референс для перевірки анатомічної коректності власних моделей (перегляд у Blender сам по собі не є розповсюдженням).
6. Екран «Ліцензії та джерела» в застосунку з точними рядками атрибуції, які вимагають першоджерела — зокрема `"BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"`.
