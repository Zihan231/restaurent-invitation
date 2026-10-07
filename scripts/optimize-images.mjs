// Crops the A4 key-visual exports into tight, web-sized assets.
import sharp from "sharp";

const SRC = "assets-src";
const OUT = "public/images";

// Make near-white pixels connected to the image border transparent,
// so white text *inside* the artwork (ribbon lettering) is preserved.
async function keyOutBorderWhite(input, region, width, out) {
  const { data, info } = await sharp(input)
    .extract(region)
    .resize({ width })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const isWhite = (i) => Math.min(data[i], data[i + 1], data[i + 2]) > 228;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !isWhite(p * 4)) continue;
    seen[p] = 1;
    data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  // soften the anti-aliased fringe next to removed pixels
  for (let p = 0; p < w * h; p++) {
    if (seen[p]) continue;
    const x = p % w, y = (p / w) | 0;
    const near = (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) ||
      (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w]);
    if (near) {
      const m = Math.min(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
      const a = Math.max(60, 255 - m) / 255;
      // un-mix the white background out of the colour
      for (let c = 0; c < 3; c++) data[p * 4 + c] = Math.max(0, Math.min(255, (data[p * 4 + c] - 255 * (1 - a)) / a));
      data[p * 4 + 3] = Math.round(a * 255);
    }
  }
  await sharp(data, { raw: info }).webp({ quality: 88, alphaQuality: 90 }).toFile(out);
  console.log("wrote", out, w, "x", h);
}

// Building visual (dark background blends into page)
await sharp(`${SRC}/Water Park-01.png`)
  .extract({ left: 520, top: 600, width: 1440, height: 1240 })
  .resize({ width: 1080 })
  .webp({ quality: 80 })
  .toFile(`${OUT}/building.webp`);
const stats = await sharp(`${SRC}/Water Park-01.png`).extract({ left: 20, top: 3300, width: 40, height: 40 }).stats();
console.log("bg color", stats.channels.slice(0, 3).map((c) => Math.round(c.mean)));

await keyOutBorderWhite(`${SRC}/Nemonic-01.png`, { left: 615, top: 1810, width: 1250, height: 395 }, 760, `${OUT}/ribbon.webp`);
await keyOutBorderWhite(`${SRC}/logo-01.png`, { left: 250, top: 1075, width: 1975, height: 1370 }, 480, `${OUT}/logo.webp`);

// Social share preview
await sharp(`${SRC}/Card.png`).resize({ width: 1200 }).jpeg({ quality: 82 }).toFile(`${OUT}/og-card.jpg`);
console.log("done");
