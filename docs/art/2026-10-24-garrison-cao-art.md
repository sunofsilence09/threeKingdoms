# 0.6.0 曹氏将领与地方驻军立绘

生成日期：2026-10-24。使用内置 `image_gen`，每张资产独立调用；夏侯惇双目版以伤目版进行保留身份的编辑。未使用 CLI/API 回退，未修改旧立绘。全部项目图直接复制生成原件，未重采样、未抠除或改写原生 alpha；所有原件保留于 Codex 生成目录。

已先查看 `gao-shun-v1.png`、`zhou-tai-v1.png`、`chen-gong-v1.png`，仅用作既有半写实风格与细节密度参考，没有借用旧脸。此为原创历史游戏概绘，不宣称肖像复原。

## 交付与检查

所有最终图均为 **1024 × 1536、RGBA PNG**，alpha 极值 **0–254**，存在大量 alpha=0 透明像素。已通过 `view_image` 逐幅检查全身、头饰、双脚和所有兵器；武器及主体未截断，画面无文字、UI、水印、同伴或坐骑。全尺寸预览可能显示透明像素的底层 RGB 色，实际 alpha 已单独读数验证。

下表边界为 alpha>128 的半开区间 `(left, top, right, bottom)`。提示词请求宽留白，实际选稿最窄有效边距为21px（普通军士枪尖）；所有主要轮廓与兵器均在画布内，保留原生成 alpha，不以阈值强行修边。士兵长左下角 alpha=1，其余各图四角均 alpha=0，透明像素总数如下。

| 最终文件 | 主体与兵器检查 | alpha>128 边界 | 完全透明像素 |
| --- | --- | --- | --- |
| `public/assets/characters/xiahou-dun-v1.png` | 玄青甲与青蓝织物、铜饰；壮实方脸短须，人物左眼（观者右侧）覆眼罩，完整长刀。 | 210,25,856,1503 | 1035324 |
| `public/assets/characters/xiahou-dun-uninjured-v1.png` | 同脸、同发饰、同甲片、同持刀姿势；已去除眼罩及额头斜带，双眼完整。 | 210,24,859,1504 | 1025686 |
| `public/assets/characters/xiahou-yuan-v1.png` | 赭红轻甲与束发，精干弓手；强弓两端、弦、腰侧箭囊和箭羽完整。 | 216,77,970,1474 | 1075366 |
| `public/assets/characters/cao-ren-v1.png` | 厚重铁灰与蓝灰甲、兜鍪、宽大蓝漆矩盾，剑尖和双脚均完整，区别于高顺圆盾。 | 33,128,992,1432 | 913270 |
| `public/assets/characters/cao-xiu-v1.png` | 成年精干骑将步姿，深红甲、窄脸短须、小冠红缨；整杆长矛完整。 | 212,24,753,1477 | 1134061 |
| `public/assets/characters/local-soldier-v1.png` | 年轻成年军士，米褐粗布、轻札甲和素帻；木杆枪头及尾端、双脚完整。此图是守军职业代表，机制遵从用户后续5000守军与不可招募要求。 | 249,21,759,1450 | 1152142 |
| `public/assets/characters/local-captain-v1.png` | 中年军士长，铁灰完整札甲、橄榄褐内衣与朴素兜鍪；直剑、木椭圆盾及双脚完整。 | 89,30,929,1482 | 978742 |

## 原件与 SHA-256

- 最终：`public/assets/characters/xiahou-dun-v1.png`
  - 原件：`C:/Users/silence/.codex/generated_images/01a16c0e-b82c-7030-8372-e7add07f26a7/exec-fcdf991b-318e-4c6a-8700-aef22b1dcd82.png`
  - SHA-256：`504f7055ffbb35db3036676fb310c4b43866fce2989a6e0f11b54585e8105e1b`
- 最终：`public/assets/characters/xiahou-dun-uninjured-v1.png`
  - 原件：`C:/Users/silence/.codex/generated_images/01a16c0e-b82c-7030-8372-e7add07f26a7/exec-1a3c2308-c01e-458b-b2fd-df373e0207b9.png`
  - SHA-256：`3002eb7671656704cd33edd86655184a6ea25838f5891ea96a78f35c51f74167`
- 最终：`public/assets/characters/xiahou-yuan-v1.png`
  - 原件：`C:/Users/silence/.codex/generated_images/01a16c0e-b82c-7030-8372-e7add07f26a7/exec-fa3aea8e-6368-4a3b-9d71-f3f733a6c276.png`
  - SHA-256：`b6a142b58c759e7add1299644b30bbf0d9cbda4594368e9096c999ed72e14df9`
- 最终：`public/assets/characters/cao-ren-v1.png`
  - 原件：`C:/Users/silence/.codex/generated_images/01a16c0e-b82c-7030-8372-e7add07f26a7/exec-2b55fc03-8933-45fc-9d76-d4bf3b782110.png`
  - SHA-256：`85fdfe29c3f7960fdeadb216095671a7248acda0efe743eac2ba8c835f99eada`
- 最终：`public/assets/characters/cao-xiu-v1.png`
  - 原件：`C:/Users/silence/.codex/generated_images/01a16c0e-b82c-7030-8372-e7add07f26a7/exec-114ee005-c967-4302-8bfb-e452393b18ac.png`
  - SHA-256：`57866ff224b84852364b37f5d301fd6f6bb57a418ab0ce9b2a9c8865d161673b`
- 最终：`public/assets/characters/local-soldier-v1.png`
  - 原件：`C:/Users/silence/.codex/generated_images/01a16c0e-b82c-7030-8372-e7add07f26a7/exec-a22aeced-ec86-450e-a0fa-8e8936f3b82e.png`
  - SHA-256：`c1797156ddc0861a740b1bfc7957f75c7211f34c20e7ea44ba9009b2f4a8706c`
- 最终：`public/assets/characters/local-captain-v1.png`
  - 原件：`C:/Users/silence/.codex/generated_images/01a16c0e-b82c-7030-8372-e7add07f26a7/exec-b4e2f375-0758-447d-9355-49de988b5e33.png`
  - SHA-256：`4e5a64cfd795d1c648804c61c95c596c276b2968f547af69092cad8c7d65071b`

夏侯惇最初稿另保留于 `C:/Users/silence/.codex/generated_images/01a16c0e-b82c-7030-8372-e7add07f26a7/exec-17c5124d-ea2c-4e49-859b-167a44c6fe59.png`。选择第二次编辑稿作为伤目最终图，其后以该最终图生成双目版。两版脸型、发式、甲装、站姿和长刀一致，双目版仅按提示去掉眼罩/斜带并恢复健康左眼；存在生成编辑带来的少量色彩和细节变化。

## 小人配色参考

| 人物 | 主配色与头饰 |
| --- | --- |
| 夏侯惇两版 | 玄青甲约 `#273b4a`、青蓝织物约 `#205363`、铜饰约 `#987447`；低冠高髻、短须，伤目版人物左眼覆盖 |
| 夏侯渊 | 赭红织物约 `#984b35`、棕铁甲约 `#4b3930`、红褐束发；弓与腰侧箭囊 |
| 曹仁 | 厚重蓝灰铁甲约 `#3c4858`、深蓝矩盾约 `#2c3e54`；低铁盔黑缨、宽壮体型 |
| 曹休 | 深红甲衣约 `#6f2928`、黑铁；小冠红缨、精干体型 |
| 普通军士 | 米褐衣约 `#a39578`、轻棕甲约 `#504839`、灰褐素帻；无须青年 |
| 士兵长 | 橄榄褐衣约 `#68614a`、铁灰甲约 `#4d4a42`；圆兜鍪护颈、短须 |

## 完整提示词

### 夏侯惇初稿

```text
Use case: historical-scene. Asset type: full-body game character portrait PNG cutout, 1024x1536 vertical. Primary request: original semi-realistic painted portrait of Xiahou Dun, mature Han Chinese general of the late Eastern Han, circa age 40, a steady powerful veteran standing in a grounded three-quarter stance. Strong rectangular face, straight heavy eyebrows, short full black beard with subtle grey, black hair in a high compact topknot beneath a low practical dark iron military headpiece. His ANATOMICAL LEFT eye (on viewer's RIGHT side of face) is covered by a narrow dark cloth eye patch and strap; right eye intact, no blood or gore. Wear distinctive blackened deep navy-teal lamellar armor, restrained bronze fittings, dark teal layered tunic and long divided armor skirt, dark boots; broad but disciplined silhouette, not a ragged pirate or ornate fantasy lord. Hold a single long-handled glaive steadily at his side, blade pointed up, complete blade, pole and butt visible, both hands and feet visible. Style: polished realistic digital illustration, finely rendered aged metal, linen and skin, period-inspired historical game art, realistic anatomy, soft neutral directional light. Composition: single whole person centered, from entire headpiece to soles, entire glaive enclosed, generous transparent margin on every edge, 8 percent padding top and bottom, 8 percent side padding, subject about 82 percent canvas height. Background: genuinely transparent alpha, no environment, no colored backdrop, no floor, no cast shadow or halo. No text, no frame, no UI, no watermark, no companions or horse. Original identity: do not copy existing Gao Shun or Zhou Tai faces; use the inspected references only as level-of-detail/style guidance.
```

### 夏侯惇最终伤目编辑稿

```text
Use case: identity-preserve. Edit target: attached Xiahou Dun full-body portrait. Preserve exactly this character's face, anatomical LEFT eye patch (viewer right), hair, beard, expression, deep navy-teal and bronze costume, glaive, standing pose and detailed realistic painting style. Change only framing and background: scale the complete figure AND entire glaive together to fit inside the central 78 percent of a 1024x1536 portrait canvas, leaving at least 110 transparent pixels above the blade tip and below the boots and clear side margins. Remove all gray glow, mist, shadows and any background pixels: isolate only solid body/garments/weapon on genuinely transparent alpha; clean crisp natural cutout edges without aura. Nothing cropped, no floor or backdrop, no text. Preserve original detailed design and correct covered left eye. This is the final production cutout for a game UI, not a poster.
```

### 夏侯惇双目完整版本（编辑伤目最终图）

```text
Use case: identity-preserve. Edit target: this exact full-body Xiahou Dun game portrait. Make his pre-injury version, when BOTH EYES are healthy. Change ONLY the eye region: remove the dark eye patch covering his anatomical left eye (viewer right) and remove the entire diagonal dark strap across his forehead, reveal his natural healthy left eye and eyebrow matching the existing right eye, with normal intact skin and no scar. Keep exactly the same man, rectangular face, beard, hair and headpiece, pose, body, armor shapes and bronze ornament, navy-teal costume colors, hands, full long glaive, boots, lighting, detail level and original canvas size/framing. Preserve transparent alpha background. Do not redesign or restyle, no text, no floor. Whole figure and complete blade within canvas.
```

### 夏侯渊

```text
Use case: historical-scene. Asset type: original full-body character game PNG, vertical 1024x1536 transparent cutout. Subject: Xiahou Yuan, adult Han Chinese general in his early forties, lean muscular mobile archer, alert angular face with neat short mustache and pointed chin beard, sun-weathered skin, strong sharp eyes, distinct face from Xiahou Dun. Black hair topknot with rust-red cloth wrap, no helmet. Wear ochre-red and dark russet light lamellar armor over terracotta-red rough silk and brown riding trousers, short practical split coat, leather bracers, leather boots. A long powerful recurved bow in left hand, relaxed downward diagonal, bowstring visible; right hand rests near a waist quiver holding several arrows. Both limbs, bow tip-to-tip and all arrows entirely in view. Standing on foot in a poised brisk scouting stance, no horse. Style: semi-realistic finely painted late Eastern Han historical game portrait, realistic anatomy and detailed aged bronze, lacquer, woven fabric and leather, soft neutral directional lighting. Composition: one whole man centered, entire topknot and both boot soles visible, generous clear margins on all sides, top of person at y160 and soles at y1375 on 1536-high canvas; entire bow inside x100..925, never crop any weapon. Genuinely transparent alpha background with no fog, halo, floor, scenic backdrop or shadow. No text, logos, UI, watermarks, other characters, modern equipment or fantasy effects.
```

### 曹仁

```text
Use case: historical-scene. Asset type: single original late Eastern Han game character full-body PNG, 1024x1536 vertical genuine transparent cutout. Subject: Cao Ren, Han Chinese middle-aged general, strong wide stocky build and broad square face, close cropped moustache and solid trimmed beard, stern calm defending expression. Low domed dark iron helmet with short black crest and cheek guards. Distinctive dense thick layered iron lamellar armor in graphite and muted slate blue, bulky rounded shoulder guards, restrained bronze fastenings, subdued dusty blue lower tunic, dark sturdy boots. Left arm braces a large broad rectangular rounded-corner wooden shield clad in dark blue lacquer and iron bands, shield below chin and above ankles so face and both feet visible; right hand holds a straight double-edged jian sword pointing diagonally down away from legs, entire sword and tip visible. Grounded steadfast defensive stance, upright and compact. Must look different from the slender unhelmeted round-shield Gao Shun and ragged glaive Zhou Tai. Style: polished semi-realistic painted historical strategy game portrait, finely detailed worn metal, woodgrain shield edging, realistic skin and fabric, neutral soft side light. Composition: show the entire helmet, sword, shield, both hands and boots; everything inside central 80 percent of portrait, broad empty transparent space above and beneath, full shield not cropped, no horse. Transparent alpha only, no scenery, no black or white background, no fog, no glowing edge, no floor or cast shadow. No labels, text, frame, watermark, extra people, fantasy ornaments or magic.
```

### 曹休

```text
Use case: historical-scene. Asset type: original adult Cao Xiu full-body portrait for late Eastern Han historical game, 1024x1536 vertical PNG cutout with true transparent alpha. Subject: mature Han Chinese cavalry officer in his mid thirties standing on foot, lean athletic elegant build, distinctive narrow oval face, straight black eyebrows, subtle neat moustache and tiny chin beard, black hair gathered into high topknot under small practical dark iron cap with short burgundy tassel, composed decisive expression. Deep crimson lacquered lamellar armor with dark leather lacing and small bronze fittings, fitted dark red tunic, split riding skirt and dark trousers, forearm guards and leather riding boots. Show an adult professional commander, no child, no horse. Hold one complete slim wooden-shaft spear upright at his side, short steel leaf blade above shoulder height, butt near boot sole, both hands and entire spear included. Other hand resting at belt in a precise ready stance. Style: refined semi-realistic painted historical strategy game illustration, realistic anatomy and detailed fabric/skin/worn metal; armor more agile and fitted than Cao Ren, dark crimson different from Xiahou Yuan's ochre-red. Composition: single full man centered head-to-toe with all props inside canvas, leave at least120pixels clear transparent space above spear tip and below boots, at least100pixels side margin. Transparent background only, no glow, scene, fog, floor, shadow, text, labels, border, watermark or fantasy effects.
```

### 地方普通军士

```text
Use case: historical-scene. Asset type: original local ordinary city garrison soldier occupational portrait for a late Eastern Han strategy game, 1024x1536 vertical true transparent PNG cutout. Single young adult Han Chinese man about25, modest lean sturdy physique, earnest ordinary round face with no beard, dark hair mostly covered with a plain faded gray-brown cloth headwrap. Wear coarse undyed sand-beige linen long-sleeved tunic, small basic dark brown light lamellar vest with unadorned rectangular plates, cloth belt, brown trousers and simple cloth-wrapped boots. Practical low rank local defender, no noble ornament, no silk cape. Right hand grips a plain wooden-shaft long spear vertically beside him, small iron spearhead and complete wooden butt visible, left hand relaxed at waist; stable simple standing guard posture. Same semi-realistic finely painted historical game style as the generals but materially simpler. Original face, must not resemble named generals. Body, headwrap, hands, both feet and entire spear all enclosed with generous transparent padding, spear not taller than y130..1400 inside1536height, soldier from y200..1400; no cropping. Transparent alpha background, no scenic setting, no floor or cast shadow, no fog, no halo. No text, no UI, no frame, no watermark, no horse, no other people or fantasy.
```

### 地方士兵长

```text
Use case: historical-scene. Asset type: original local city garrison captain occupational full-body game portrait, late Eastern Han period, 1024x1536 vertical genuine transparent PNG. Subject: middle-aged Han Chinese man about45, average strong mature body, weathered angular face with a short moustache and stubble, calm experienced command expression, modest simple round iron helmet with short neck guards and no extravagant plume. More complete practical lamellar armor than an ordinary soldier: dark iron-gray breast, broad practical shoulder plates, muted olive-brown padded cloth underneath, brown leather belt and bracers, armored split skirt, sturdy dark boots. Entire short straight jian sword held in right hand angled gently down at side, left arm carries a medium oval shield of plain wood and iron edging, complete shield visible. Clear composed directing posture, torso turned slightly toward viewer, confident and authoritative without rich decoration. Style: semi-realistic polished painted historical strategy character, finely detailed woven cloth, weathered iron and realistic skin. Original ordinary career identity distinct from named Cao generals and Gao Shun. Composition: single whole person centered, entire helmet, sword tip, shield and boot soles inside canvas with broad transparent margins; top y160 bottom y1380 approximately. True transparent background only, no scene, floor, mist, halo, cast shadow or background shape. No text, UI, labels, watermarks, border, companions, horse or magical effects.
```

## 验证记录

- 先新增 `src/game/garrisonCaoArt.test.ts`，运行 `npm test -- src/game/garrisonCaoArt.test.ts`：RED，因缺少 `xiahou-dun-v1.png` 产生 ENOENT。
- 7图落盘后同命令：GREEN，1测试通过；逐一校验 PNG 签名、竖幅比例、RGBA 类型、最低尺寸与7个不同 SHA-256。
- Pillow 只读检查尺寸、alpha极值、完全透明像素、四角alpha和主体边界；无图像处理与重写。
- 全部最终图已逐幅本地打开检查。未改共享角色资料或 UI；没有提交或推送。
