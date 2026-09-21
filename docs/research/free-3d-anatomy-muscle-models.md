# Безкоштовні 3D-моделі анатомії людини з мʼязами — для iOS-застосунку

Дата перевірки: 2026-09-20. Усі твердження нижче взяті з першоджерел (офіційні сайти проєктів, GitHub-репозиторії, офіційні API). Де перевірити не вдалося — прямо написано «не підтверджено з першоджерела».

---

## TL;DR

Найкращий за якістю та повнотою мʼязовий атлас — **Z-Anatomy**: окремі іменовані обʼєкти, латина, TA2 ID, переклади, але лише у форматі `.blend` (експорт робити самому). **BodyParts3D** дає готові OBJ-файли на кожен FMA-концепт, з окремими лівими/правими мʼязами, проте мʼязова деталізація часткова. **TotalSegmentator** має найбільше іменованих мʼязових класів для фітнес-сценарію, але меші треба будувати самому з CT-сегментацій. **SPL Abdominal Atlas** — 19 готових мʼязових мешів (VTK), лише черевна ділянка, без FMA/TA ID. Решта джерел або дає злиті художні меші (Sketchfab), або не містить мʼязів чи мешів узагалі.

| Модель / джерело | Формати | Мʼязи окремими обʼєктами? |
|---|---|---|
| [Z-Anatomy](https://github.com/Z-Anatomy/The-blend) | .blend (Blender template) | ✅ так, окремі іменовані обʼєкти + TA2 ID + латина |
| [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) | OBJ | ✅ так, окремі файли + окремо left/right, з FMA ID |
| [TotalSegmentator](https://github.com/wasserth/TotalSegmentator) | NIfTI-сегментації → меш треба генерувати самому | ✅ так, окремі іменовані класи (`gluteus_maximus_left` тощо) |
| [SPL Abdominal Atlas (Open Anatomy)](https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html) | VTK (94 меші) | ✅ так, 19 мʼязових мешів з іменами у назві файлу |
| [NIH 3D](https://3d.nih.gov/) | GLB, STL | залежить від запису |
| [Sketchfab](https://sketchfab.com/) | glTF/OBJ/FBX/USDZ (залежить від автора) | зазвичай ❌ — один злитий меш |
| [MakeHuman](https://github.com/makehumancommunity/makehuman) | OBJ/FBX/glTF (експорт з програми) | ❌ мʼязів немає (базова оболонка тіла) |
| [Visible Human Project](https://www.nlm.nih.gov/research/visible/visible_human.html) | сирі зрізи/CT/MRI (не меші) | ❌ це не 3D-меші, потрібна власна сегментація |
| [Anatomy Standard](https://www.anatomystandard.com/) | 2D/відео; 3D-завантаження не підтверджено з першоджерела | н/д |
| [Human Protein Atlas](https://www.proteinatlas.org/) | — | ❌ мʼязових 3D-мешів немає |

---

## 1. BodyParts3D / Anatomography (DBCLS, Японія)

**Що це.** База 3D-моделей анатомії, побудована навколо концептів Foundational Model of Anatomy (FMA). Офіційно описана як «Parts of FMA (3.0) concepts» на [сторінці Anatomography](https://lifesciencedb.jp/bp3d/).

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

Датасет на Zenodo — [запис 10047292](https://zenodo.org/api/records/10047292), назва «Dataset with segmentations of 117 important anatomical structures in 1228 CT images», один файл `Totalsegmentator_dataset_v201.zip` розміром 23 581 218 285 байт (≈23.6 GB).

**Мʼязи окремо?** ✅ Так, окремими іменованими класами. У [README](https://github.com/wasserth/TotalSegmentator) перелічені серед інших:
- `head_muscles`: masseter_right/left, temporalis_right/left, lateral_pterygoid, medial_pterygoid, digastric…
- `headneck_muscles`: sternocleidomastoid, trapezius, platysma, levator scapulae, scalenes…
- `abdominal_muscles`: pectoralis_major, rectus_abdominis, serratus_anterior, latissimus_dorsi, trapezius, external/internal_oblique, erector_spinae, psoas_major, quadratus_lumborum (лише в межах T4–L4)
- `oculomotor_muscles`: rectus/oblique мʼязи ока
- `thigh_shoulder_muscles`: quadriceps_femoris, sartorius, deltoid, supraspinatus, infraspinatus, subscapularis, trapezius, triceps_brachii… — найцікавіше для фітнес/спортивного застосунку
- `tissue_types`: skeletal_muscle
- базова задача `total` містить, зокрема, `gluteus_maximus_left/right`, `gluteus_medius_left/right`, `gluteus_minimus_left/right` ([таблиця класів у README](https://github.com/wasserth/TotalSegmentator))

**Формати.** Вихід — маски сегментації (NIfTI); готових мешів немає, полігональну модель треба генерувати самому (marching cubes → decimation → glTF/USDZ). Формат вихідних файлів прямо як «OBJ/glTF» у README не заявлений — не підтверджено з першоджерела.

**Номенклатура.** Імена класів — машинні англійські (`psoas_major_left`). FMA/TA ID не підтверджено з першоджерела.

---

## 3. Open Anatomy Project — SPL Abdominal Atlas (Brigham & Women's / Harvard)

**Що це.** Атлас, отриманий із клінічного CT-скану. Офіційна сторінка: [«Derived from a clinical quality CT scan, this SPL Abdominal Atlas features the skeletal system, vasculature, muscles, and abdominal organs»](https://www.openanatomy.org/atlas-pages/atlas-spl-abdomen.html).

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

**Суміжний атлас.** [Mauritanian Anatomy Laboratory Thoracic Atlas](https://www.openanatomy.org/atlas-pages/atlas-mauritania-thorax.html) — опис перелічує «thoracic skeletal system, the respiratory system, the cardiovascular system, and the esophagus» — мʼязів у переліку немає.

---

## 4. Z-Anatomy (найповніший)

**Що це.** Вільний 3D-атлас у вигляді Blender application template. Офіційний репозиторій: [github.com/Z-Anatomy/The-blend](https://github.com/Z-Anatomy/The-blend) (репозиторій має назву `Models-of-human-anatomy`, опис «Human male model»). README: «This repository contains the Blender template of the Z-Anatomy Project. It includes models derived from 'BodyParts3D' and definitions that heavily rely on Wikipedia».

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

---

## 5. NIH 3D (колишній NIH 3D Print Exchange)

**Приклади записів** (через публічний API `https://3d.nih.gov/api/entries/<id>`):

- [3DPX-004646 «Head and Neck STL File 3D Model Converted from a CT Scan DICOM File»](https://3d.nih.gov/entries/3dpx-004646)
- [3DPX-013270 «Covid-19»](https://3d.nih.gov/entries/3dpx-013270)
- [3DPX-021161 «Detailed Human Brain Model»](https://3d.nih.gov/entries/3DPX-021161)
- [3dpx-003765 «3D model of the Brain»](https://3d.nih.gov/entries/3dpx-003765)

**Формати.** Головна сторінка [3d.nih.gov](https://3d.nih.gov/) каже, що користувач може «export your customized model as a GLB or STL».

**Висновок.** Єдиного атласу немає — це колекція окремих записів; кожен запис треба оцінювати окремо.

---

## 6. Sketchfab

**Що реально є (пошук через API, `downloadable=true`, запит «muscle anatomy»):**

| Модель | Полігонів (faces) |
|---|---|
| [Female Anatomy by CheRa_Muscles](https://sketchfab.com/3d-models/none-132188d5be9b47eabb0e64b378d81603) | 863 903 |
| [muscle anatomy](https://sketchfab.com/3d-models/none-89afe763fa674373841a4083213cdf5d) | 325 504 |
| [male muscle anatomy](https://sketchfab.com/3d-models/none-3dc6a9eaffb24b5e95e8ab1a501d0319) | 298 591 |
| [Female muscles base mesh](https://sketchfab.com/3d-models/none-abd8ccef6aeb42058601c192aadb8198) | 129 562 |
| [Bodybuilder Man Anatomy Practice Basemesh](https://sketchfab.com/3d-models/none-67f60a34b71e497ead72645e8c5e9151) | 47 994 |

**Мʼязи окремо?** ⚠️ Зазвичай ❌ — це художні écorché-меші для референсу, без поділу на іменовані мʼязи. Для конкретної моделі це видно лише після завантаження; через API не перевіряється.

**Номенклатура.** ❌ FMA/TA ID немає.

---

## 7. MakeHuman

**Що це.** Програма з офіційним репозиторієм [makehumancommunity/makehuman](https://github.com/makehumancommunity/makehuman); меші експортуються з програми.

**Мʼязи.** ❌ MakeHuman дає параметричну базову оболонку тіла, а не мʼязовий атлас. Наявність окремих мʼязових мешів не підтверджено з першоджерела (офіційний сайт makehumancommunity.org був недоступний на момент перевірки — ECONNREFUSED).

**Використання в проєкті.** Розумно як **база тіла / силует**, поверх якої лягають мʼязи з іншого джерела.

---

## 8. Visible Human Project (NLM / NIH)

[Офіційна сторінка NLM](https://www.nlm.nih.gov/research/visible/visible_human.html): бібліотека «cross-sectional cryosection, CT, and MRI images obtained from one male cadaver and one female cadaver».

- Visible Human Male (1994): ≈15 GB, 1 871 поперечних зрізів з кроком 1 мм
- Visible Human Female (1995): ≈40 GB, 5 189 анатомічних зображень з кроком 0.33 мм

**Це не меші.** Щоб отримати мʼязи як 3D-обʼєкти, потрібна власна сегментація — трудомісткий шлях.

---

## 9. Anatomy Standard

Наявність завантажуваних 3D-моделей і форматів на [сайті](https://www.anatomystandard.com/) не описана — не підтверджено з першоджерела.

---

## 10. Human Protein Atlas

[Human Protein Atlas](https://www.proteinatlas.org/) — білковий/клітинний ресурс, **мʼязових анатомічних 3D-мешів там немає**. Для анатомічного атласу нерелевантно.

---

## 11. Smithsonian Open Access

Офіційна сторінка `si.edu/openaccess` та `si.edu/openaccess/faq` на момент перевірки віддавали **HTTP 403** — дані про 3D-моделі **не підтверджено з першоджерела**. Єдине, що вдалося підтвердити: офіційний репозиторій [Smithsonian/OpenAccess](https://github.com/Smithsonian/OpenAccess) містить «Over 11 million metadata records» — це метадані, не 3D-меші.

Смітсонівські 3D-моделі в будь-якому разі — артефакти й зразки, не мʼязова анатомія людини.

---

## 12. Не вдалося перевірити

| Джерело | Статус |
|---|---|
| **AnatomyTool / Open3Dmodel** (`anatomytool.org`) | Сервер недоступний із цього середовища (ECONNREFUSED). Формати — **не підтверджено з першоджерела** |
| **Wikimedia Commons** | Конкретний мʼязовий 3D-файл не перевірявся — **не підтверджено з першоджерела** |
| **Apple, рекомендація «100k полігонів / 2048×2048 текстури»** | Фігурує як цитата з WWDC18 session 603, але сторінку сесії не вдалося прочитати напряму — **не підтверджено з першоджерела**. У поточній офіційній документації Apple жорсткого числа немає (див. нижче) |

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

1. **Базовий сценарій:** BodyParts3D OBJ → Blender (обʼєднання left/right, чистка, decimate, `subdivisionScheme=none`) → USDC/USDZ → RealityKit. FMA ID з `isa_parts_list_e.txt` стає ключем бази даних застосунку.
2. **Найповніший сценарій:** Z-Anatomy `.blend` → Blender → USDC/USDZ. `TA2.csv` дає TA2 ID, латинські назви й переклади; мʼязових обʼєктів більше, ніж у BodyParts3D, але готових OBJ/glTF/USDZ немає — експорт і оптимізацію `Startup.blend` (≈292.6 MB) робити самому.
3. **Запасний сценарій:** SPL Abdominal Atlas (19 мʼязів, VTK → Blender через imports) для першого вертикального зрізу.
4. **Для фітнес-сценарію:** TotalSegmentator (`thigh_shoulder_muscles`, `abdominal_muscles`, `head_muscles`, `headneck_muscles` + `total`) на публічних CT → власні меші.
5. **Силует тіла:** MakeHuman як базова оболонка, поверх якої лягають мʼязи з іншого джерела.
