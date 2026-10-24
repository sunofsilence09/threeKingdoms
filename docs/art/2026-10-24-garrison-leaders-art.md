# 地方军府 0.6：九位地方人物立绘

采用内置 `image_gen`，每个角色一次独立生成；目标为透明全身 PNG。参考检查了现有袁术、陈宫、王允的材质与比例，各人物均使用独立原创脸型和轮廓。原件保留在下列工具生成路径，项目文件逐字节复制，不重新绘制 alpha。

资产测试先于生成运行，出现 `ENOENT liu-biao-v1.png` 的预期 RED。生成后检查九张的完整头足、道具、竖幅尺寸和真实透明 alpha，并重跑同一测试。

## 检查记录（2026-10-24）

九张均为 **1024×1536、RGBA PNG**，alpha 范围 0—254。逐幅使用 view_image 检查，头冠、双足和完整道具均入画；马腾竖矛、公孙瓒斜矛、张燕长剑均未截断。上下安全边缘较紧，未进行裁切或放大。图像查看器可能显示透明像素底下的 RGB 渐色；抽查卑弥呼 `(100,800)`、`(150,800)`、`(200,800)`、`(300,800)` 的 alpha 均为 0，实际背景透明。

| 文件 | alpha=0 像素数 | alpha≥128 主体边界 (left,top,right,bottom) |
| --- | ---: | --- |
| liu-biao-v1.png | 922272 | (211,11,921,1519) |
| liu-zhang-v1.png | 914591 | (170,16,812,1520) |
| zhang-lu-v1.png | 954188 | (200,8,792,1525) |
| ma-teng-v1.png | 863171 | (180,6,942,1518) |
| himiko-v1.png | 1001516 | (272,14,790,1529) |
| gongsun-zan-v1.png | 955540 | (19,17,1003,1507) |
| yuan-shao-v1.png | 731244 | (17,8,1006,1517) |
| liu-yu-v1.png | 1006166 | (251,8,765,1527) |
| zhang-yan-v1.png | 1013245 | (133,19,942,1516) |

`npm test -- src/game/garrisonLeadersArt.test.ts`：1 个测试通过，检查九个文件的 PNG 签名、竖幅尺寸、RGBA 类型与不同 SHA-256。未修改角色资料或界面代码。

## liu-biao

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-383cdb31-dbb9-41d2-a2d1-464a188745df.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/liu-biao-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body game character PNG, target 1024x1536. Primary request: original Liu Biao, late Han Jingzhou scholar governor, tall dignified elderly Chinese man with an elongated refined face, narrow thoughtful eyes, long neat salt-and-pepper beard. Muted teal-purple ceremonial Han robe with subtly patterned trim and ivory underrobe, restrained black official crown, holding a complete rolled bamboo book across his waist. Semi-realistic painted collectible game illustration, detailed fabric and realistic face, coherent soft studio lighting, grounded historical costume. Upright relaxed three-quarter stance, entire crown, robe hem, both shoes and complete book visible; generous transparent margins on every side. Subject alone on genuinely transparent alpha background, no environment, no colored halo, no shadow background. Distinct original face, not copied from earlier reference portraits. No text, UI, watermark, magic effects, cropped feet or cropped props.
```

## liu-zhang

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-1d2f6c7f-af0f-4b5c-a42e-b94a574d0090.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/liu-zhang-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body game character PNG, target 1024x1536. Primary request: original Liu Zhang, late Han Sichuan governor, gentle middle-aged Chinese man with a round face, fuller cheeks, kindly uncertain eyes, small trimmed mustache and short rounded beard. Gray-green Shu brocade robe, subtle geometric woven pattern, cream inner layers, simple black Han official cap, holding a closed bamboo document with both hands near chest. Semi-realistic painted historical game illustration with detailed fabric and natural face, soft studio light. Relaxed three-quarter standing pose with soft sloping shoulders. Entire cap, sleeves, robe hem, both shoes and full document visible, generous empty transparent margin all sides. Distinct original face and silhouette, not reused from Liu Biao or other existing men. Subject alone on genuine transparent alpha background; no environment, halo or backdrop shadow. No text, UI, watermark, magic, cropped body or cropped prop.
```

## zhang-lu

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-758137f1-e538-4dba-88a4-008245b48fcd.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/zhang-lu-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body game character PNG, target 1024x1536. Primary request: original Zhang Lu, mature late Han Hanzhong religious community leader, lean Chinese man around fifty with a long narrow face, calm deep-set eyes and slightly graying pointed beard. Plain dark teal wide robe, rough natural linen texture, modest gray inner robe, tied cloth head covering around topknot, plain belt. Holds a complete bamboo record book in one hand, other hand rests within sleeve; no staff or magical paraphernalia. Semi-realistic painted historical game character with natural facial detail and softly lit folds. Centered upright three-quarter stance, complete headwear, feet, robe hem and book visible, generous transparent padding around all edges. A grounded administrator and Daoist community leader, no supernatural effects. Distinct face from Chen Gong and other officials. Genuine transparent alpha background, no scenery or colored halo, no text, UI, watermark or cropping.
```

## ma-teng

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-ec379504-7640-4486-84e5-4fdd52e4e302.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/ma-teng-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body game character PNG, target 1024x1536. Primary request: original Ma Teng, late Han northwestern Chinese frontier commander, imposing older broad-shouldered man with a weatherbeaten square face, sun-browned skin, gray mustache and heavy short beard, strong nose and tired watchful eyes. Tan-brown leather and bronze lamellar armor with distinctly rugged off-white fur collar, heavy brown boots, layered sandy cloth, simple practical metal helmet. Holding a long wooden-shaft spear vertically beside his body with the COMPLETE steel tip and shaft butt visible. Robust grounded walking stance, no horse. Semi-realistic painted game illustration with natural anatomy, detailed fur, worn metal and leather, soft studio lighting. Fit entire helmet, both boots, complete spear and cloak into portrait canvas with generous 8 percent transparent safety margins, never crop spear tip or foot. Distinct original face and bulky frontier silhouette. Subject alone, genuine transparent alpha background, no scenery, ground, colored halo or backdrop shadow. No text, watermark, UI, magic or extra weapons.
```

## himiko

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-63563cf5-6535-431e-80a7-aa87e12de987.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/himiko-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body historical game character PNG, target 1024x1536. Primary request: original Himiko, mature third-century ancient Wa queen, dignified East Asian woman around fifty with natural age lines, broad composed face and commanding serene gaze. Grounded ancient costume concept rather than claimed portrait reconstruction: a long ivory and ochre woven hemp dress with restrained indigo woven bands, simple wrapped textile layers, wooden-soled sandals, strands of small stone and green beads around neck and wrists. Black hair threaded slightly with gray, drawn back into a simple high bundled hairstyle with a modest bronze hair ornament. Holds a small complete round bronze mirror upright at waist in one hand, the other gently supports the wrist. No large fan or weapon. Semi-realistic painted game illustration, natural mature face and detailed textiles, softly lit, calm upright full-body three-quarter stance. Entire hair ornament, full dress, both sandals, hands and bronze mirror visible with generous transparent margin all sides. Genuine transparent alpha background, subject alone, no scenery, halo, ground or shadow backdrop. No modern Japanese shrine maiden clothing, no red hakama, no kimono obi, no samurai armor, no fantasy headdress, no magic effects, no text, UI or watermark.
```

## gongsun-zan

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-6137e597-7fdd-4299-ac09-f25713bd455a.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/gongsun-zan-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body game character PNG, target 1024x1536. Primary request: original Gongsun Zan, mature late Han northeastern Chinese frontier commander, late forties with angular wide-jawed face, pronounced cheekbones, dark mustache and short split beard, stern experienced gaze. White-gray practical lamellar armor over off-white padded tunic, white cloth mantle and pale gray scarf, simple dark-edged iron helmet WITHOUT plume; mature rugged border officer, distinctly unlike a youthful clean-shaven Zhao Yun. Holds one long wooden spear in a diagonal controlled guard, complete iron spearhead and full shaft butt visible. Full-body standing step, sturdy boots, no horse. Semi-realistic painted game illustration, realistic face and material details, restrained soft lighting. Entire helmet, mantle, both boots and COMPLETE spear fit within portrait canvas with generous 8 percent transparent safety padding. Grounded historical costume, original face and silhouette. Genuine transparent alpha background, no scenery, halo, ground or backdrop shadow. No text, UI, watermark, magical effects or cropped props.
```

## yuan-shao

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-ca935194-28c5-4ec5-92ee-1237dafa2361.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/yuan-shao-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body game character PNG, target 1024x1536. Primary request: original Yuan Shao, late Han Chinese aristocratic military leader in his fifties, handsome broad oval face with high arched brows, composed proud gaze, thick curled mustache and medium neatly forked black beard lightly gray at chin. Rich golden-brown bronze lamellar armor with dignified restrained engraving over dark brown silk, deep crimson cape, low bronze Han military crown with simple black topknot. One hand confidently rests on a complete straight sword in its scabbard at his left waist, the other gathers his cape. No purple robes. Semi-realistic painted historical game illustration, natural anatomy and polished material detail, soft studio light. Full-body broad upright commander stance, entire crown, cape, scabbard tip, hands and both boots visible with generous transparent padding. Original face clearly distinct from Yuan Shu. Genuine transparent alpha background, subject alone, no environment, halo, ground or backdrop shadow. No text, UI, watermark, fantasy armor, magic or cropped props.
```

## liu-yu

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-399375f5-bffd-48ab-937b-144a2de7cc9c.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/liu-yu-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body game character PNG, target 1024x1536. Primary request: original Liu Yu, elderly late Han Chinese civil governor known for modest living, slender slightly stooped man with a narrow weathered face, thin white eyebrows, gentle tired eyes, long sparse white beard and gray hair. Plain muted gray-blue linen official robe with simple darker trim, off-white inner robe, unadorned black low Han official cloth cap, plain woven belt and worn dark shoes. Holds a modest rolled bamboo document in both hands at waist. No gold jewelry, armor or luxurious brocade. Semi-realistic painted historical game illustration, natural elderly anatomy, careful linen textures, soft studio light. Reserved upright three-quarter full-body stance with modest shoulders; entire cap, hands, complete book, robe hem and both shoes visible within generous transparent margins. Distinct original face and simple grayblue silhouette, unlike Liu Biao's richer purple scholar robe. Genuine transparent alpha background, subject alone, no scenery, halo, ground or backdrop shadow. No text, UI, watermark, magic or cropping.
```

## zhang-yan

- 工具：内置 image_gen（transparent_background: true），独立生成一次。
- 原件：`C:\Users\silence\.codex\generated_images\01a16c0e-ddfb-7d71-8512-347503f33100\exec-318effda-f803-42cf-a0d1-dce99bdfc9cf.png`
- 最终：`D:/games/ThreeKingdoms/public/assets/characters/zhang-yan-v1.png`
- 选择与编辑：选用首次输出；无后续编辑。

完整提示词：

```text
Use case: historical-scene. Asset type: portrait-format transparent full-body game character PNG, target 1024x1536. Primary request: original Zhang Yan, agile late Han Black Mountain Chinese band leader, wiry athletic mature man around forty with sharply cut lean face, alert narrow eyes, slightly rough mustache and short stubble. Hair tied in a practical high topknot with plain dark cloth band, no helmet. Dark brown short leather and small lamellar armor vest over charcoal coarse tunic and trousers, ragged practical brown shoulder cloth, leg wraps and rugged boots. Carries one COMPLETE straight Chinese sword pointed diagonally down, blade tip within frame, free hand open for balance. Lithe guarded stepping stance that communicates mountain mobility, no scenery. Semi-realistic painted historical game illustration, natural anatomy and worn material details, soft studio lighting. Original face distinct from armored generals and scholars. Full head, both boots, all cloth and complete sword fully visible with generous transparent safety padding all sides. Genuine transparent alpha background, subject alone, no environment, halo, ground or backdrop shadow. No text, UI, watermark, oversized fantasy weapons, magic or cropped props.
```
