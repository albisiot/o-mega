// Builds the letter outlines used by the 3D winner name (src/lib/winner-name-3d.ts):
// downloads each card-name typeface from Google Fonts as TrueType and writes the glyphs the
// names need as three.js typeface JSON in public/fonts/names/. Run with `node scripts/build-name-fonts.mjs`.
// The fonts are under the SIL Open Font License; each file keeps the font's copyright notice.
import { mkdir, writeFile } from "node:fs/promises";

const FONTS = {
  anton: "Anton",
  comic: "Bangers",
  myth: "Cinzel:wght@900",
  scifi: "Orbitron:wght@900",
  stencil: "Big+Shoulders+Stencil:wght@900",
  gothic: "Pirata+One",
  speed: "Racing+Sans+One",
  pixel: "Silkscreen",
  block: "Bungee",
  slab: "Alfa+Slab+One",
  horror: "Creepster",
  bubble: "Titan+One",
  elegant: "Abril+Fatface",
};

// Names are drawn in capitals, except in the blackletter face, which keeps their own case.
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MIXED_CASE = new Set(["gothic"]);
const OUT_DIR = new URL("../public/fonts/names/", import.meta.url);

function tables(view) {
  const signature = view.getUint32(0);
  if (signature !== 0x00010000 && signature !== 0x74727565) throw new Error("Not a TrueType font");
  const result = {};
  for (let i = 0; i < view.getUint16(4); i++) {
    const record = 12 + i * 16;
    const tag = String.fromCharCode(...[0, 1, 2, 3].map((k) => view.getUint8(record + k)));
    result[tag] = { offset: view.getUint32(record + 8), length: view.getUint32(record + 12) };
  }
  return result;
}

/** Character code to glyph index, from the Unicode cmap (format 4 or 12). */
function charMap(view, cmap) {
  const count = view.getUint16(cmap + 2);
  let best = null;
  for (let i = 0; i < count; i++) {
    const platform = view.getUint16(cmap + 4 + i * 8);
    const encoding = view.getUint16(cmap + 6 + i * 8);
    const offset = cmap + view.getUint32(cmap + 8 + i * 8);
    const format = view.getUint16(offset);
    if ((platform === 3 && (encoding === 1 || encoding === 10)) || platform === 0) {
      if (format === 12 || (format === 4 && !best)) best = { offset, format };
    }
  }
  if (!best) throw new Error("No Unicode cmap");
  const { offset, format } = best;
  if (format === 12) {
    const groups = view.getUint32(offset + 12);
    return (code) => {
      for (let g = 0; g < groups; g++) {
        const start = view.getUint32(offset + 16 + g * 12);
        const end = view.getUint32(offset + 20 + g * 12);
        if (code >= start && code <= end) return view.getUint32(offset + 24 + g * 12) + code - start;
      }
      return 0;
    };
  }
  const segments = view.getUint16(offset + 6) / 2;
  const ends = offset + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  return (code) => {
    for (let s = 0; s < segments; s++) {
      if (code > view.getUint16(ends + s * 2)) continue;
      const start = view.getUint16(starts + s * 2);
      if (code < start) return 0;
      const delta = view.getInt16(deltas + s * 2);
      const range = view.getUint16(ranges + s * 2);
      if (range === 0) return (code + delta) & 0xffff;
      const glyph = view.getUint16(ranges + s * 2 + range + (code - start) * 2);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

/** A glyph's contours as lists of points {x, y, on}, composites resolved. */
function contours(view, font, glyph, transform = [1, 0, 0, 1, 0, 0]) {
  const start = font.loca(glyph);
  const end = font.loca(glyph + 1);
  if (end === start) return [];
  let p = font.glyf + start;
  const contourCount = view.getInt16(p);
  p += 10;
  const apply = ({ x, y, on }) => ({
    x: transform[0] * x + transform[2] * y + transform[4],
    y: transform[1] * x + transform[3] * y + transform[5],
    on,
  });

  if (contourCount < 0) {
    const result = [];
    let flags;
    do {
      flags = view.getUint16(p);
      const component = view.getUint16(p + 2);
      p += 4;
      let dx, dy;
      if (flags & 0x0001) {
        dx = view.getInt16(p);
        dy = view.getInt16(p + 2);
        p += 4;
      } else {
        dx = view.getInt8(p);
        dy = view.getInt8(p + 1);
        p += 2;
      }
      let [a, b, c, d] = [1, 0, 0, 1];
      if (flags & 0x0008) {
        a = d = view.getInt16(p) / 16384;
        p += 2;
      } else if (flags & 0x0040) {
        a = view.getInt16(p) / 16384;
        d = view.getInt16(p + 2) / 16384;
        p += 4;
      } else if (flags & 0x0080) {
        a = view.getInt16(p) / 16384;
        b = view.getInt16(p + 2) / 16384;
        c = view.getInt16(p + 4) / 16384;
        d = view.getInt16(p + 6) / 16384;
        p += 8;
      }
      if (!(flags & 0x0002)) throw new Error("Point-matched composites are not supported");
      const [ta, tb, tc, td, tx, ty] = transform;
      const combined = [
        ta * a + tc * b,
        tb * a + td * b,
        ta * c + tc * d,
        tb * c + td * d,
        ta * dx + tc * dy + tx,
        tb * dx + td * dy + ty,
      ];
      result.push(...contours(view, font, component, combined));
    } while (flags & 0x0020);
    return result;
  }

  const ends = [];
  for (let i = 0; i < contourCount; i++) ends.push(view.getUint16(p + i * 2));
  p += contourCount * 2;
  p += 2 + view.getUint16(p);
  const total = ends.length ? ends[ends.length - 1] + 1 : 0;
  const flags = [];
  while (flags.length < total) {
    const flag = view.getUint8(p++);
    flags.push(flag);
    if (flag & 0x08) {
      const repeat = view.getUint8(p++);
      for (let r = 0; r < repeat; r++) flags.push(flag);
    }
  }
  const read = (short, same) => {
    const values = [];
    let value = 0;
    for (const flag of flags) {
      if (flag & short) {
        const delta = view.getUint8(p++);
        value += flag & same ? delta : -delta;
      } else if (!(flag & same)) {
        value += view.getInt16(p);
        p += 2;
      }
      values.push(value);
    }
    return values;
  };
  const xs = read(0x02, 0x10);
  const ys = read(0x04, 0x20);
  const result = [];
  let first = 0;
  for (const last of ends) {
    const points = [];
    for (let i = first; i <= last; i++) points.push(apply({ x: xs[i], y: ys[i], on: Boolean(flags[i] & 1) }));
    result.push(points);
    first = last + 1;
  }
  return result;
}

/** TrueType quadratic contours to the typeface path language: "m x y", "l x y", "q x y cpx cpy". */
function outline(paths) {
  const round = (value) => Math.round(value);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true });
  const commands = [];
  for (const points of paths) {
    if (points.length < 2) continue;
    let startIndex = points.findIndex((point) => point.on);
    let start;
    if (startIndex === -1) {
      start = mid(points[0], points[1]);
      startIndex = 0;
    } else {
      start = points[startIndex];
    }
    commands.push("m", round(start.x), round(start.y));
    let control = null;
    for (let k = 1; k <= points.length; k++) {
      const point = points[(startIndex + k) % points.length];
      const target = k === points.length ? start : point;
      if (k === points.length && !start.on) continue;
      if (point.on || k === points.length) {
        if (control) commands.push("q", round(target.x), round(target.y), round(control.x), round(control.y));
        else commands.push("l", round(target.x), round(target.y));
        control = null;
      } else if (control) {
        const between = mid(control, point);
        commands.push("q", round(between.x), round(between.y), round(control.x), round(control.y));
        control = point;
      } else {
        control = point;
      }
    }
    if (control) commands.push("q", round(start.x), round(start.y), round(control.x), round(control.y));
  }
  return commands.join(" ");
}

function nameRecord(view, name, id) {
  const count = view.getUint16(name + 2);
  const strings = name + view.getUint16(name + 4);
  for (let i = 0; i < count; i++) {
    const record = name + 6 + i * 12;
    if (view.getUint16(record) !== 3 || view.getUint16(record + 6) !== id) continue;
    const length = view.getUint16(record + 8);
    const offset = strings + view.getUint16(record + 10);
    let text = "";
    for (let c = 0; c < length; c += 2) text += String.fromCharCode(view.getUint16(offset + c));
    return text;
  }
  return "";
}

async function build(key, family) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}`)).text();
  const url = css.match(/url\((.*?\.ttf)\)/)?.[1];
  if (!url) throw new Error(`No TrueType file for ${family}`);
  const view = new DataView(await (await fetch(url)).arrayBuffer());
  const t = tables(view);
  if (t.fvar) console.warn(`${key}: variable font, using its default instance`);
  const unitsPerEm = view.getUint16(t.head.offset + 18);
  const longLoca = view.getInt16(t.head.offset + 50) === 1;
  const metrics = view.getUint16(t.hhea.offset + 34);
  const font = {
    glyf: t.glyf.offset,
    loca: (glyph) =>
      longLoca ? view.getUint32(t.loca.offset + glyph * 4) : view.getUint16(t.loca.offset + glyph * 2) * 2,
  };
  const advance = (glyph) => view.getUint16(t.hmtx.offset + Math.min(glyph, metrics - 1) * 4);
  const glyphOf = charMap(view, t.cmap.offset);

  const characters = ` ${UPPER}${MIXED_CASE.has(key) ? UPPER.toLowerCase() : ""}`;
  const glyphs = {};
  for (const character of characters) {
    const glyph = glyphOf(character.codePointAt(0));
    if (!glyph) throw new Error(`${key}: no glyph for "${character}"`);
    const paths = contours(view, font, glyph);
    const xs = paths.flat().map((point) => point.x);
    glyphs[character] = {
      ha: advance(glyph),
      x_min: xs.length ? Math.round(Math.min(...xs)) : 0,
      x_max: xs.length ? Math.round(Math.max(...xs)) : 0,
      o: outline(paths),
    };
  }

  const head = t.head.offset;
  const data = {
    glyphs,
    familyName: nameRecord(view, t.name.offset, 1),
    ascender: view.getInt16(t.hhea.offset + 4),
    descender: view.getInt16(t.hhea.offset + 6),
    underlinePosition: -100,
    underlineThickness: 50,
    boundingBox: {
      xMin: view.getInt16(head + 36),
      yMin: view.getInt16(head + 38),
      xMax: view.getInt16(head + 40),
      yMax: view.getInt16(head + 42),
    },
    resolution: unitsPerEm,
    original_font_information: {
      copyright: nameRecord(view, t.name.offset, 0),
      license: "SIL Open Font License 1.1",
      source: url,
    },
  };
  await writeFile(new URL(`${key}.json`, OUT_DIR), JSON.stringify(data));
  console.log(`${key}: ${Object.keys(glyphs).length} glyphs, ${JSON.stringify(data).length} bytes`);
}

await mkdir(OUT_DIR, { recursive: true });
for (const [key, family] of Object.entries(FONTS)) await build(key, family);
