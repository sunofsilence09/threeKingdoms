import Phaser from 'phaser';

const BODY_FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';

export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  const size = Number.parseInt(String(style.fontSize ?? 16), 10);
  return scene.add.text(x, y, text, {
    fontFamily: BODY_FONT,
    resolution: 3,
    // CJK glyphs extend above the Latin metrics used by Phaser's default test string.
    metrics: { ascent: size, descent: Math.ceil(size * 0.25), fontSize: size + Math.ceil(size * 0.25) },
    padding: { left: 2, right: 2, top: 2, bottom: 2 },
    ...style,
  });
}
