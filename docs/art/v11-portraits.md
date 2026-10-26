# 1.1.0立绘生成记录

使用内置 `image_gen.imagegen`，模式为全新图像生成（new-generation），`transparent_background=true`。共40幅独立PNG，1024×1536、RGBA；生成原件保留，正式文件与原件逐字节相同，没有程序去背。

- [32位历史人物：完整提示、原件路径、正式路径、SHA与逐张视觉检查](v11-historical-portraits.json)
- [8种原创地方官职业画像：完整提示、原件路径、SHA与透明审计](v11-original-prefect-portraits.json)

正式资产位于 `public/assets/characters/`，历史人物为 `<人物ID>-v1.png`，原创地方官为 `local-prefect-1-v1.png` 至 `local-prefect-8-v1.png`。原创太守的职业画像可以共用，姓名、年龄、成长和寿命身份各自独立；历史人物32幅互不复用。

逐张检查全身、头手足、兵器与服饰；40个不同SHA、有效轮廓均不触边，四角alpha≤1/255。审计命令：`python scripts/verify-v11-assets.py`。所有精确提示在上述JSON中，可据此重新生成（生成结果本身具有随机性）。
