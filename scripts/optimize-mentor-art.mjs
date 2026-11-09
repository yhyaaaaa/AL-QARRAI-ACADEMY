/**
 * Turns the original character renders (design/mentors/source/<mentor>_<state>.png)
 * into web-ready assets (src/assets/mentors/<mentor>_<state>.webp).
 *
 * All four states of one mentor are cropped to the SAME box (the union of their
 * visible pixels), so the character never jumps when its state changes.
 *
 *   node scripts/optimize-mentor-art.mjs
 */
import sharp from "sharp";
import { readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "design/mentors/source";
const OUT = "src/assets/mentors";
const STATES = ["idle", "listening", "talking", "thinking"];
const PAD = 0.04; // breathing room around the character, relative to the crop size
mkdirSync(OUT, { recursive: true });

const mentors = [...new Set(readdirSync(SRC).filter((f) => f.endsWith(".png")).map((f) => f.split("_")[0]))];

async function opaqueBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let [x0, y0, x1, y1] = [info.width, info.height, -1, -1];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1, width: info.width, height: info.height };
}

for (const mentor of mentors) {
  const boxes = await Promise.all(STATES.map((s) => opaqueBox(join(SRC, `${mentor}_${s}.png`))));
  const u = boxes.reduce((a, b) => ({
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
    width: a.width,
    height: a.height,
  }));
  const pad = Math.round(Math.max(u.x1 - u.x0, u.y1 - u.y0) * PAD);
  const left = Math.max(0, u.x0 - pad);
  const top = Math.max(0, u.y0 - pad);
  const width = Math.min(u.width, u.x1 + pad + 1) - left;
  const height = Math.min(u.height, u.y1 + pad + 1) - top;

  for (const state of STATES) {
    const out = join(OUT, `${mentor}_${state}.webp`);
    const info = await sharp(join(SRC, `${mentor}_${state}.png`))
      .extract({ left, top, width, height })
      .webp({ quality: 88, alphaQuality: 95, effort: 6 })
      .toFile(out);
    console.log(`${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
  }
}
