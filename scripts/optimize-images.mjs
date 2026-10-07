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

// ---- Favicons: gold artwork from inside the logo oval, on a dark square ----
const ART = { left: 590, top: 1300, width: 1300, height: 920 }; // gold mark, fully inside the black oval
const DARK = { r: 11, g: 7, b: 9, alpha: 1 };

async function iconPng(size, { rounded, fill, ring = rounded }) {
  const artW = Math.round(size * fill);
  const art = await sharp(`${SRC}/logo-01.png`).extract(ART).resize({ width: artW }).toBuffer();
  const meta = await sharp(art).metadata();
  const r = rounded ? Math.round(size * 0.22) : 0;
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${r}" fill="rgb(${DARK.r},${DARK.g},${DARK.b})"/>` +
      (ring ? `<rect x="${size * 0.03}" y="${size * 0.03}" width="${size * 0.94}" height="${size * 0.94}" rx="${r * 0.9}" fill="none" stroke="#d4a437" stroke-opacity="0.55" stroke-width="${Math.max(1, size * 0.018)}"/>` : "") +
      `</svg>`
  );
  return sharp(bg)
    .composite([{ input: art, left: Math.round((size - artW) / 2), top: Math.round((size - meta.height) / 2) }])
    .png()
    .toBuffer();
}

// Multi-size .ico built from PNG entries (supported by all modern browsers).
function toIco(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, buf }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(buf.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.buf)]);
}

const { writeFileSync } = await import("node:fs");
const small = await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await iconPng(size, { rounded: true, fill: size < 48 ? 1 : 0.92, ring: size >= 48 }) })));
writeFileSync("app/favicon.ico", toIco(small));
writeFileSync("app/icon.png", await iconPng(512, { rounded: true, fill: 0.82 }));
writeFileSync("app/apple-icon.png", await iconPng(180, { rounded: false, fill: 0.8 })); // iOS rounds it itself
console.log("icons written");
