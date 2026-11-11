import type { CSSProperties } from "react";

/**
 * Each character's name has a look of its own: typeface, paint, outline and a 3D extrusion,
 * chosen to recall who they are. Purely visual, like the effects in card-effects.ts.
 * The typefaces are loaded in app/layout.tsx.
 */
export type NameFont =
  | "anton"
  | "comic"
  | "myth"
  | "scifi"
  | "stencil"
  | "gothic"
  | "speed"
  | "pixel"
  | "block"
  | "slab"
  | "horror"
  | "bubble"
  | "elegant";

type FontInfo = {
  family: string;
  /** Average width of a capital, in em: sizes the name so that it always fits. */
  advance: number;
  /** Blackletter is unreadable in capitals: those names keep their own case. */
  mixedCase?: boolean;
};

export const NAME_FONTS: Record<NameFont, FontInfo> = {
  anton: { family: "var(--font-anton)", advance: 0.48 },
  comic: { family: "var(--font-bangers)", advance: 0.44 },
  myth: { family: "var(--font-cinzel)", advance: 0.81 },
  scifi: { family: "var(--font-orbitron)", advance: 0.83 },
  stencil: { family: "var(--font-stencil)", advance: 0.55 },
  gothic: { family: "var(--font-pirata)", advance: 0.48, mixedCase: true },
  speed: { family: "var(--font-racing)", advance: 0.61 },
  pixel: { family: "var(--font-silkscreen)", advance: 0.76 },
  block: { family: "var(--font-bungee)", advance: 0.76 },
  slab: { family: "var(--font-alfa-slab)", advance: 0.85 },
  horror: { family: "var(--font-creepster)", advance: 0.49 },
  bubble: { family: "var(--font-titan)", advance: 0.7 },
  elegant: { family: "var(--font-abril)", advance: 0.72 },
};

export type NameStyle = {
  font: NameFont;
  /** Paint inside the letters: a color or CSS backgrounds, the first layer on top. */
  fill: string;
  /** Outline around the letters. */
  rim: string;
  /** Extrusion colors (hex), from the front edge to the back. */
  side: [string, string];
  /** Extrusion length in steps of 0.035em. */
  depth?: number;
  /** Extrusion direction in degrees, clockwise from the right: 90 goes straight down. */
  angle?: number;
  /** Thin line drawn on the letters' edge, over the paint. */
  line?: string;
  glow?: string;
  /** Ghost copies to the left and right, like a split signal. */
  split?: [string, string];
  /** Blurs the ghosts into a haze. */
  haze?: boolean;
  /** Forward lean in degrees. */
  slant?: number;
  /** Extra space between letters, in em. */
  tracking?: number;
  /** Per-letter [rotation in degrees, rise in em], repeated along the name. */
  jitter?: [number, number][];
};

const STEP = 0.035;
const DEPTH = 8;

/** Light from above on every name: a bright bevel along the top, shade at the foot. */
const LIGHT =
  "linear-gradient(180deg, transparent 0 13%, rgb(255 255 255 / 0.55) 13% 19%, rgb(255 255 255 / 0.12) 27%, transparent 40% 62%, rgb(0 0 0 / 0.32) 88%)";

// ---------- Paint helpers ----------
// The letters' capitals sit between about 14% and 86% of the painted box.

function svg(width: number, height: number, body: string): string {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
}

const stroke = (color: string, width = 2) =>
  `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;

/** Top to bottom gradient. */
const grad = (...stops: string[]) => `linear-gradient(180deg, ${stops.join(", ")})`;

/** Polished metal: a bright sky, a hard horizon, a darker ground. */
const metal = (sky: string, horizon: string, ground: string, low: string, foot: string) =>
  grad(`${sky} 0 32%`, `${horizon} 47%`, `${ground} 50%`, `${low} 72%`, foot);

/** Glowing seams across the letters. */
const cracks = (color: string, size = "2.2em 1em") =>
  `${svg(
    88,
    40,
    `<path d="M0 30 L7 27 L12 31 L20 24 L27 26 L33 19 L41 22 L50 14 L58 17 L66 10 L75 13 L88 6 M33 19 L31 8 M58 17 L61 29 L57 40 M12 31 L9 40 M75 13 L73 0" ${stroke(color, 1.8)}/>`,
  )} 0 0 / ${size}`;

/** Horizontal lines, like a screen. */
const scanlines = (color: string) => `repeating-linear-gradient(180deg, transparent 0 0.07em, ${color} 0.07em 0.1em)`;

/** Angled facets, like broken glass. */
const facets = (light: string, mid: string, dark: string) =>
  `linear-gradient(118deg, ${light} 0 22%, ${mid} 22% 38%, ${dark} 38% 40%, ${light} 40% 58%, ${mid} 58% 74%, ${dark} 74% 76%, ${light} 76%)`;

const stripes = (color: string, angle = 135, width = 0.08) =>
  `repeating-linear-gradient(${angle}deg, ${color} 0 ${width}em, transparent ${width}em ${width * 2.2}em)`;

const dots = (color: string, size = 0.16) =>
  `radial-gradient(circle, ${color} 0 28%, transparent 32%) 0 0 / ${size}em ${size}em`;

const waves = (color: string) =>
  `${svg(40, 20, `<path d="M0 10 Q10 2 20 10 T40 10" ${stroke(color)}/>`)} 0 0 / 0.9em 0.45em`;

const circuit = (color: string) =>
  `${svg(
    40,
    24,
    `<path d="M0 8 H12 L18 2 H40 M0 20 H8 L14 14 H26 L30 20 H40" ${stroke(color, 1.6)}/><circle cx="12" cy="8" r="2.2" fill="${color}"/><circle cx="26" cy="14" r="2.2" fill="${color}"/>`,
  )} 0 0 / 1.1em 0.66em`;

const bricks = (color: string) =>
  `${svg(40, 20, `<path d="M0 0.5 H40 M0 10 H40 M12 0 V10 M32 10 V20" ${stroke(color, 1.6)}/>`)} 0 0.04em / 1.1em 0.55em`;

const stars = (color: string) =>
  `${svg(
    44,
    28,
    `<path d="M9 3 L10.4 8.6 L16 10 L10.4 11.4 L9 17 L7.6 11.4 L2 10 L7.6 8.6Z M31 13 L32 17 L36 18 L32 19 L31 23 L30 19 L26 18 L30 17Z" fill="${color}"/>`,
  )} 0 0 / 1em 0.64em`;

const scales = (color: string) =>
  `${svg(40, 20, `<path d="M0 10 A10 10 0 0 0 20 10 A10 10 0 0 0 40 10 M-10 20 A10 10 0 0 0 10 20 A10 10 0 0 0 30 20 A10 10 0 0 0 50 20" ${stroke(color, 1.6)}/>`)} 0 0 / 0.5em 0.25em`;

const veins = (color: string) =>
  `${svg(48, 28, `<path d="M0 16 C10 6 16 26 26 13 S40 4 48 12 M14 0 C16 8 12 12 18 18" ${stroke(color, 1.3)}/>`)} 0 0 / 1.5em 0.88em`;

const blueprint = (color: string) =>
  `${svg(20, 20, `<path d="M0 0.5 H20 M0.5 0 V20" ${stroke(color, 1)}/>`)} 0 0 / 0.22em 0.22em`;

const honeycomb = (color: string) =>
  `${svg(24, 28, `<path d="M12 1 L23 7.5 V20.5 L12 27 L1 20.5 V7.5Z" ${stroke(color, 1.8)}/>`)} 0 0 / 0.3em 0.35em`;

/** Drops hanging from the top of the letters. */
const drips = (color: string) =>
  `${svg(
    40,
    24,
    `<path d="M0 0 H40 V6 C36 6 36 16 33 16 C30 16 31 6 26 6 C22 6 23 11 20 11 C17 11 18 6 12 6 C9 6 9 20 6 20 C3 20 4 6 0 6Z" fill="${color}"/>`,
  )} 0 0.1em / 1.1em 0.66em repeat-x`;

const zigzag = (color: string) =>
  `${svg(40, 16, `<path d="M0 12 L8 4 L14 12 L22 4 L28 12 L36 4 L40 8" ${stroke(color, 2.2)}/>`)} 0 0.2em / 1em 0.4em repeat-x`;

const claws = (color: string) =>
  `${svg(60, 24, `<path d="M14 1 L6 23 M22 1 L14 23 M30 1 L22 23" ${stroke(color, 2.4)}/>`)} 0 0 / 2.2em 0.9em`;

const stitches = (color: string) =>
  `${svg(40, 24, `<path d="M0 12 H40 M5 8 L9 16 M15 8 L19 16 M25 8 L29 16 M35 8 L39 16" ${stroke(color, 1.8)}/>`)} 0 0 / 0.9em 0.54em repeat-x`;

const grain = (color: string) => `repeating-linear-gradient(176deg, ${color} 0 0.03em, transparent 0.03em 0.11em)`;

const speedLines = (color: string) => `repeating-linear-gradient(180deg, transparent 0 0.09em, ${color} 0.09em 0.12em, transparent 0.12em 0.2em)`;

const spiral = (light: string, dark: string) =>
  `repeating-radial-gradient(circle at 50% 55%, ${light} 0 0.07em, ${dark} 0.07em 0.14em)`;

const vortex = (light: string, dark: string) =>
  `repeating-conic-gradient(from 0deg at 50% 60%, ${light} 0 14deg, ${dark} 14deg 28deg)`;

const layers = (...parts: string[]) => parts.join(", ");

// ---------- The characters ----------

const STYLES: Record<string, NameStyle> = {
  // --- Delta ---
  // Gantry: the port's crane man, safety yellow with hazard stripes, heavy and straight down.
  P001: {
    font: "block",
    fill: layers(stripes("rgb(0 0 0 / 0.22)", 135, 0.07), grad("#fff3a0", "#ffd60a 55%", "#ff9f00")),
    rim: "#1a1400",
    side: ["#b37400", "#3d2600"],
    depth: 9,
    angle: 90,
  },
  // Foundling: a pickpocket with a kid's face, bubblegum and a little sway.
  P002: {
    font: "comic",
    fill: grad("#ffe3f2", "#ff7cc0 55%", "#c2398f"),
    rim: "#2a0018",
    side: ["#8a1f5c", "#2e0a1e"],
    angle: 45,
    jitter: [[-3, 0], [2, 0.03], [-1, 0], [3, -0.02]],
  },
  // Kelvin: a genius with no strength, cold and precise, a thin extrusion.
  P003: {
    font: "scifi",
    fill: layers(scanlines("rgb(255 255 255 / 0.35)"), grad("#ffffff", "#c4ecff 50%", "#5ab8f0")),
    rim: "#04203a",
    side: ["#3a8fc4", "#0b2a44"],
    depth: 5,
    tracking: 0.02,
  },
  // Wardmother: reads the future at the market, violet and starlit.
  P004: {
    font: "gothic",
    fill: layers(stars("rgb(255 240 190 / 0.8)"), grad("#ffe9a8", "#e0a3ff 50%", "#8a3fd1")),
    rim: "#1d0a2e",
    side: ["#6b2a99", "#1d0a2e"],
    glow: "rgb(200 140 255 / 0.4)",
  },
  // Pyrrhic: a walking bomb, danger stripes, shaking.
  P005: {
    font: "stencil",
    fill: layers(stripes("rgb(20 0 0 / 0.35)", 45, 0.07), grad("#fff36b", "#ff9a00 50%", "#ff3b00")),
    rim: "#1a0500",
    side: ["#a32a00", "#2a0800"],
    glow: "rgb(255 110 0 / 0.45)",
    jitter: [[-2, 0], [2, 0.02], [-1, -0.02], [2, 0]],
  },
  // Ephemeris: a fragile seer, moon silver, thin and spaced.
  P006: {
    font: "myth",
    fill: grad("#ffffff", "#e3dcff 50%", "#a99be0"),
    rim: "#1a1530",
    side: ["#7a6fb0", "#231c40"],
    depth: 5,
    tracking: 0.03,
    glow: "rgb(220 210 255 / 0.35)",
  },
  // Macadam: the armored van's driver, asphalt with the road's yellow line.
  P007: {
    font: "slab",
    fill: grad("#f2f2f2 0 38%", "#ffd60a 38% 52%", "#a0a0a0 52%", "#6a6a6a"),
    rim: "#111111",
    side: ["#555555", "#1a1a1a"],
    angle: 90,
  },
  // Understudy: an infiltrator, a theater curtain.
  P008: {
    font: "elegant",
    fill: layers(stripes("rgb(60 0 10 / 0.25)", 90, 0.05), grad("#ffd28a", "#ff5a5a 45%", "#8c1030")),
    rim: "#2a0510",
    side: ["#7a0f26", "#24040b"],
    tracking: 0.02,
  },
  // Dogwatch: the night shift, a flashlight beam over a navy uniform.
  P009: {
    font: "anton",
    fill: grad("#fff6c9", "#ffd166 34%", "#3b5b9a 60%", "#1d2c55"),
    rim: "#050a18",
    side: ["#2b3f73", "#0a1026"],
    depth: 7,
  },
  // Ferryman: the port smuggler, sea green with waves, a pirate's lettering.
  P010: {
    font: "gothic",
    fill: layers(waves("rgb(255 255 255 / 0.4)"), grad("#d8fff0", "#5fd3b0 50%", "#13705a")),
    rim: "#021a14",
    side: ["#0f5444", "#031612"],
  },
  // Epigone: the cult's newcomer, who brought cookies.
  P011: {
    font: "gothic",
    fill: layers(dots("#5a3418", 0.22), grad("#fff1d6", "#e2b98a 50%", "#a0703f")),
    rim: "#2a1606",
    side: ["#7a4a22", "#2a1606"],
  },
  // Vigil: arrives when the lights go out, warm lantern light.
  P012: {
    font: "comic",
    fill: grad("#fffbe0", "#ffd36b 50%", "#ff9a1f"),
    rim: "#1f1000",
    side: ["#a55a00", "#2a1500"],
    glow: "rgb(255 200 80 / 0.5)",
  },
  // Hawser: the port's colossus with magic tattoos, never moves.
  P013: {
    font: "block",
    fill: layers(zigzag("rgb(0 40 36 / 0.6)"), grad("#c9fff6", "#41d3c0 50%", "#0a6e66")),
    rim: "#01201d",
    side: ["#0b5a52", "#021714"],
    depth: 11,
    angle: 90,
  },
  // Lacuna: nobody remembers him, a grey that fades and blurs.
  P014: {
    font: "anton",
    fill: grad("#ededed", "#a6a6a6 50%", "#5e5e5e"),
    rim: "#111111",
    side: ["#4a4a4a", "#141414"],
    depth: 5,
    split: ["rgb(255 255 255 / 0.3)", "rgb(255 255 255 / 0.18)"],
    haze: true,
  },
  // Suture: the neighborhood doctor, white with red stitches.
  P015: {
    font: "elegant",
    fill: layers(stitches("#d7192e"), grad("#ffffff", "#ffe8e8 60%", "#ffc9c9")),
    rim: "#3a0008",
    side: ["#c2182b", "#3a0008"],
    depth: 6,
  },
  // Belladonna: the witch announced by bells, deadly nightshade.
  P016: {
    font: "gothic",
    fill: grad("#f0d0ff", "#a64dff 50%", "#3c0a5e"),
    rim: "#12001f",
    side: ["#4b0f73", "#12001f"],
    glow: "rgb(160 60 255 / 0.45)",
  },
  // Publican: the bar on neutral ground, a pint with its foam.
  P017: {
    font: "slab",
    fill: layers(dots("rgb(255 255 255 / 0.5)", 0.2), grad("#fff7d6 0 24%", "#ffcf4d 32%", "#e08a00")),
    rim: "#2a1500",
    side: ["#7a4500", "#2a1500"],
  },
  // Hornbook: the telepathic teacher, chalk on a blackboard.
  P018: {
    font: "slab",
    fill: layers(stripes("rgb(255 255 255 / 0.35)", 100, 0.03), grad("#ffffff", "#e8f5e0 60%", "#c7dcbf")),
    rim: "#0f2a1a",
    side: ["#2f6b47", "#0b2416"],
    depth: 6,
  },
  // Cullet: an unbeatable boxer with a glass jaw, bottle glass.
  P019: {
    font: "anton",
    fill: facets("#e6fff0", "#8fe3b0", "#2f9e63"),
    rim: "#022012",
    side: ["#2f8a58", "#06301b"],
    line: "rgb(255 255 255 / 0.5)",
    jitter: [[0, 0], [-3, 0.02], [0, 0], [2, -0.02], [0, 0], [-2, 0]],
  },
  // Longwave: the radio ham, waves on the air.
  P020: {
    font: "bubble",
    fill: layers(waves("rgb(0 80 50 / 0.45)"), grad("#e8fff5", "#7dffc4 50%", "#14b884")),
    rim: "#002619",
    side: ["#0f7a55", "#00261a"],
    angle: 30,
    glow: "rgb(80 255 180 / 0.35)",
    tracking: 0.03,
  },
  // Latchkey: an old-school lock picker, brass keys.
  P021: {
    font: "anton",
    fill: metal("#fff3c4", "#e0b84a", "#8a6410", "#c9973a", "#fff0b8"),
    rim: "#241800",
    side: ["#8a6410", "#241800"],
    tracking: 0.03,
  },
  // Warrant: a bounty hunter, a wanted poster.
  P022: {
    font: "slab",
    fill: layers(grain("rgb(110 60 20 / 0.18)"), grad("#fff4d6", "#e8c88a 55%", "#b8874a")),
    rim: "#2a1606",
    side: ["#6b4220", "#1f1006"],
    depth: 7,
    tracking: 0.02,
  },
  // Ignifuge: the firefighter, red with the reflective band.
  P023: {
    font: "stencil",
    fill: grad("#ff7b6b 0 40%", "#eaff6a 40% 54%", "#d81b1b 54%", "#9a0b0b"),
    rim: "#2a0303",
    side: ["#8a0b0b", "#2a0303"],
    angle: 90,
  },
  // Typo: the clumsy apprentice, letters out of place and a misprint.
  P024: {
    font: "comic",
    fill: grad("#fff8b0", "#ffe14d 50%", "#ff9f1c"),
    rim: "#241400",
    side: ["#a35a00", "#2a1500"],
    split: ["transparent", "rgb(255 46 108 / 0.75)"],
    jitter: [[-8, 0.04], [6, -0.05], [-4, 0.06], [10, 0]],
  },

  // --- Gamma ---
  // Bulwark: the riot shield, blue polycarbonate, solid as a wall.
  P025: {
    font: "stencil",
    fill: metal("#eef6ff", "#a9cdf2", "#3f74b4", "#6f9fd6", "#dcecff"),
    rim: "#071a33",
    side: ["#2d5c94", "#08203d"],
    depth: 10,
    angle: 90,
    tracking: 0.02,
  },
  // Rubicon: the biker gang boss, red chrome leaving a trail.
  P026: {
    font: "speed",
    fill: metal("#ffffff", "#ff9a9a", "#c40d1e", "#ff3b3b", "#ffd0d0"),
    rim: "#1a0003",
    side: ["#7a0010", "#1a0003"],
    angle: 165,
    slant: 10,
  },
  // Vulgate: a medium selling secrets, a crystal ball.
  P027: {
    font: "myth",
    fill: layers(stars("rgb(255 255 255 / 0.7)"), grad("#f2e6ff", "#c38bff 50%", "#5e2ca5")),
    rim: "#14062b",
    side: ["#4a1f85", "#14062b"],
    glow: "rgb(180 120 255 / 0.4)",
  },
  // Juncture: the electrician who fixes cables bare-handed, a live spark.
  P028: {
    font: "stencil",
    fill: layers(zigzag("rgb(120 70 0 / 0.55)"), grad("#ffffff", "#fff36b 45%", "#ffc400")),
    rim: "#1f1a00",
    side: ["#a37b00", "#2a2000"],
    glow: "rgb(255 240 80 / 0.5)",
  },
  // Malleus: the thug, cast iron hammered straight down.
  P029: {
    font: "block",
    fill: metal("#e6e6e6", "#a0a0a0", "#3a3a3a", "#6a6a6a", "#cfcfcf"),
    rim: "#000000",
    side: ["#4a1020", "#1a0008"],
    depth: 11,
    angle: 90,
  },
  // Milewright: runs over the rooftops, terracotta in the sunset.
  P030: {
    font: "speed",
    fill: grad("#ffffff", "#ffd29a 40%", "#ff7a3d 75%", "#c2410c"),
    rim: "#2a0e00",
    side: ["#a8441a", "#2a0e00"],
    angle: 165,
    slant: 12,
  },
  // Byline: a vain hacker, a hot pink terminal.
  P031: {
    font: "pixel",
    fill: layers(scanlines("rgb(90 0 50 / 0.4)"), grad("#ffd6f0", "#ff4fb8 50%", "#a3006a")),
    rim: "#1f0014",
    side: ["#80004f", "#1f0014"],
    glow: "rgb(255 80 190 / 0.4)",
  },
  // Escrow: deals in used curses, cursed gold.
  P032: {
    font: "gothic",
    fill: layers(dots("rgb(40 60 0 / 0.35)", 0.2), grad("#f6ffcf", "#c9e86a 50%", "#6b8a1a")),
    rim: "#141a00",
    side: ["#4d6610", "#141a00"],
    glow: "rgb(190 255 90 / 0.3)",
  },
  // Cathode: the gentle giant from the power plant, electric blue.
  P033: {
    font: "block",
    fill: layers(scanlines("rgb(255 255 255 / 0.25)"), grad("#ffffff", "#9ff0ff 45%", "#22b8ff")),
    rim: "#001a2a",
    side: ["#0f6a99", "#001a2a"],
    depth: 11,
    angle: 90,
    glow: "rgb(60 200 255 / 0.55)",
  },
  // Lullaby: the hypnotist, a soft spiral.
  P034: {
    font: "bubble",
    fill: spiral("#ffe0f7", "#c27bff"),
    rim: "#1e0730",
    side: ["#6a2fa0", "#1e0730"],
    glow: "rgb(230 140 255 / 0.4)",
  },
  // Ambit: a hot-headed street fighter.
  P035: {
    font: "anton",
    fill: grad("#fff0c2", "#ff8a3d 50%", "#e0261a"),
    rim: "#1f0300",
    side: ["#9a1a0a", "#2a0400"],
    angle: 45,
    slant: 6,
  },
  // Swarf: builds robots from metal shavings, brushed steel.
  P036: {
    font: "stencil",
    fill: layers(stripes("rgb(255 255 255 / 0.35)", 115, 0.03), metal("#f2f2f2", "#b5b5b5", "#555555", "#8a8a8a", "#e0e0e0")),
    rim: "#120208",
    side: ["#7a1b3a", "#1a0510"],
  },
  // Sordina: a spy for hire, a quiet noir grey, widely spaced.
  P037: {
    font: "elegant",
    fill: grad("#f2f2f2", "#bdbdbd 55%", "#5a5a5a"),
    rim: "#000000",
    side: ["#2a2a2a", "#050505"],
    depth: 5,
    tracking: 0.08,
  },
  // Nightward: the investigator, moonlight on a dark coat.
  P038: {
    font: "elegant",
    fill: grad("#ffffff", "#bfe3ff 40%", "#5b8fd6 75%", "#2b4a8a"),
    rim: "#040a1a",
    side: ["#1f3366", "#050b1f"],
    angle: 75,
  },
  // Credo: the fanatic, crimson and gold.
  P039: {
    font: "myth",
    fill: grad("#fff0b0", "#ffb000 40%", "#a8001e 80%"),
    rim: "#1a0005",
    side: ["#6b0012", "#1a0005"],
    tracking: 0.05,
  },
  // Gridwitch: the technomage, a circuit over violet magic.
  P040: {
    font: "scifi",
    fill: layers(circuit("rgb(170 255 110 / 0.85)"), grad("#efe0ff", "#9a5cff 50%", "#4b1fa6")),
    rim: "#12052b",
    side: ["#3d1785", "#12052b"],
    glow: "rgb(150 255 100 / 0.35)",
  },

  // --- Beta ---
  // Gavel: the debt collector, a judge's mahogany hammer.
  P041: {
    font: "slab",
    fill: layers(grain("rgb(60 20 0 / 0.25)"), grad("#ffd9a8", "#c8743a 50%", "#6b2d10")),
    rim: "#1a0700",
    side: ["#5a220a", "#1a0700"],
    depth: 11,
    angle: 90,
  },
  // Postmark: the courier, airmail stripes on the move.
  P042: {
    font: "speed",
    fill: `repeating-linear-gradient(135deg, #ff4a4a 0 0.1em, #ffffff 0.1em 0.2em, #3d6bff 0.2em 0.3em, #ffffff 0.3em 0.4em)`,
    rim: "#0a0a1a",
    side: ["#2a3f9e", "#0a0f2a"],
    angle: 165,
    slant: 10,
  },
  // Fathom: hears thoughts like the deep sea.
  P043: {
    font: "bubble",
    fill: layers(waves("rgb(255 255 255 / 0.35)"), grad("#e0fbff", "#4fd1e8 50%", "#0a4f8a")),
    rim: "#001a2e",
    side: ["#0b3d6b", "#00121f"],
    glow: "rgb(80 220 255 / 0.4)",
  },
  // Kiln: the arsonist, flames and embers.
  P044: {
    font: "horror",
    fill: layers(dots("rgb(255 255 200 / 0.5)", 0.24), grad("#fffbd0", "#ffd23f 30%", "#ff5a00 65%", "#b30000")),
    rim: "#1a0300",
    side: ["#8a1500", "#250400"],
    glow: "rgb(255 100 0 / 0.55)",
  },
  // Apostate: the former wrestling champion, a gold belt.
  P045: {
    font: "anton",
    fill: metal("#fffbe0", "#ffd23f", "#b37800", "#ffcc33", "#fff3b0"),
    rim: "#2a1a00",
    side: ["#c40d1e", "#3a0006"],
    depth: 10,
    tracking: 0.02,
  },
  // Larceny: the fastest thief in town, sleek violet.
  P046: {
    font: "speed",
    fill: grad("#ffe0ff", "#ff5ce1 45%", "#7a0aa8"),
    rim: "#1a0024",
    side: ["#5a0a80", "#160020"],
    angle: 170,
    slant: 14,
  },
  // Actuary: the Banco's analyst, a calculator display.
  P047: {
    font: "pixel",
    fill: layers(scanlines("rgb(20 50 0 / 0.3)"), grad("#e8ffd0", "#b8f08a 50%", "#5c9e2a")),
    rim: "#0d1a05",
    side: ["#3d6b1a", "#0d1a05"],
  },
  // Hapax: a street mage nearly blind, graffiti magic.
  P048: {
    font: "gothic",
    fill: layers(dots("rgb(255 80 220 / 0.6)", 0.22), grad("#e9ffd6", "#7dff5a 50%", "#00b36b")),
    rim: "#001a0b",
    side: ["#00703f", "#001a0b"],
    glow: "rgb(120 255 120 / 0.4)",
  },
  // Blackbody: a walking reactor, the color of a body heating up.
  P049: {
    font: "scifi",
    fill: grad("#ffffff 0 18%", "#ffe08a 32%", "#ff7a1a 55%", "#a3000f 80%", "#3a0006"),
    rim: "#000000",
    side: ["#3a0008", "#000000"],
    glow: "rgb(255 80 20 / 0.5)",
  },
  // Parley: the telepathic negotiator, calm and pale, never shouts.
  P050: {
    font: "elegant",
    fill: grad("#ffffff", "#d6f0ff 50%", "#9ad0ff"),
    rim: "#0a2238",
    side: ["#4a8ac2", "#0d2a45"],
    depth: 6,
    tracking: 0.03,
    glow: "rgb(160 210 255 / 0.3)",
  },

  // --- Alfa ---
  // Vetrix: glass bones, the fastest fighter in town: slanted shards about to fly.
  P051: {
    font: "speed",
    fill: facets("#f2fdff", "#a9ecfb", "#3fb2d0"),
    rim: "#06303d",
    side: ["#58c3dc", "#0b4153"],
    angle: 45,
    line: "rgb(255 255 255 / 0.7)",
    slant: 8,
    jitter: [[-5, 0], [3, -0.04], [-2, 0.03], [6, -0.02], [-4, 0.04], [2, 0]],
  },
  // Auctor: designed the power plant, a blueprint.
  P052: {
    font: "scifi",
    fill: layers(blueprint("rgb(255 255 255 / 0.4)"), grad("#e6f3ff", "#7fb8ff 50%", "#1f5fd1")),
    rim: "#021233",
    side: ["#163f8a", "#030f2a"],
    tracking: 0.04,
  },
  // Moth: nobody sees her, dusty wings.
  P053: {
    font: "elegant",
    fill: layers(dots("rgb(90 70 50 / 0.35)", 0.12), grad("#f7f1e8", "#cbb8a0 50%", "#7a6655")),
    rim: "#1a1410",
    side: ["#5a4a3a", "#1a1410"],
    split: ["rgb(255 255 255 / 0.25)", "rgb(255 255 255 / 0.15)"],
    haze: true,
    tracking: 0.06,
  },
  // Vera Kross: finds anyone and never stops, a target's crimson.
  P054: {
    font: "anton",
    fill: layers(
      "radial-gradient(circle at 50% 52%, transparent 0 0.16em, rgb(255 255 255 / 0.55) 0.16em 0.2em, transparent 0.2em)",
      grad("#ffffff", "#ffb3c1 40%", "#e0003a"),
    ),
    rim: "#1a0007",
    side: ["#8a0024", "#1a0007"],
    slant: 6,
    tracking: 0.03,
  },
  // Keelstone: guards the temple door and never moves, stone blocks.
  P055: {
    font: "myth",
    fill: layers(bricks("rgb(60 50 30 / 0.45)"), grad("#f2ede0", "#c9bfa8 50%", "#8a7f68")),
    rim: "#1a160e",
    side: ["#5a5242", "#1a160e"],
    depth: 12,
    angle: 90,
  },
  // Mekana: machines run by spells, brass with a magic glow.
  P056: {
    font: "stencil",
    fill: layers(circuit("rgb(255 90 220 / 0.6)"), metal("#fff0c9", "#e0a84a", "#7a4a10", "#c98f3a", "#ffe9b0")),
    rim: "#1f1000",
    side: ["#6b3a0a", "#1f1000"],
    glow: "rgb(255 60 200 / 0.4)",
  },

  // --- Omega ---
  // Holdout: cannot die and does not yield, scorched granite with a quiet aura.
  P057: {
    font: "slab",
    fill: grad("#fff6d0", "#f2c14e 35%", "#8a6a3a 70%", "#3a2e22"),
    rim: "#0d0904",
    side: ["#5a4630", "#0d0904"],
    depth: 13,
    angle: 90,
    glow: "rgb(255 240 200 / 0.35)",
  },
  // Absentia: perfect armor with nobody inside, a dark visor slit across chrome.
  P058: {
    font: "stencil",
    fill: grad("#ffffff 0 30%", "#c3d0dc 45%", "#0b0f14 46% 53%", "#16c8ff 53% 55%", "#8696a6 56% 70%", "#e6edf3 100%"),
    rim: "#05080c",
    side: ["#7d8b99", "#1c232b"],
    depth: 9,
    angle: 70,
    tracking: 0.04,
  },
  // Multitude: hears every mind, the name splits into the last voices it heard.
  P059: {
    font: "anton",
    fill: layers(scanlines("rgb(80 0 120 / 0.45)"), grad("#ffe9ff", "#e0b8ff 55%", "#b46cff")),
    rim: "#16001f",
    side: ["#6a1fa0", "#1c0630"],
    angle: 60,
    split: ["rgb(22 200 255 / 0.85)", "rgb(255 46 108 / 0.85)"],
    glow: "rgb(190 90 255 / 0.55)",
    tracking: 0.03,
  },
  // Mongibello: a volcano inside, basalt letters split by lava.
  P060: {
    font: "block",
    fill: layers(cracks("#ffd23f"), grad("#7a2e0e 0 28%", "#c2410c 48%", "#ff7a00 68%", "#ffd23f 92%")),
    rim: "#140402",
    side: ["#9c3305", "#250802"],
    depth: 10,
    angle: 80,
    glow: "rgb(255 90 0 / 0.6)",
  },

  // --- The new wave ---
  // Nadir: sheet-metal wings held by a weld, a little crooked.
  P061: {
    font: "comic",
    fill: grad("#f2f6f8 0 40%", "#ff9a3d 45% 49%", "#9fb0ba 52%", "#dfe7ec"),
    rim: "#0f1820",
    side: ["#5a6a75", "#121a20"],
    jitter: [[-3, 0.03], [0, 0], [3, -0.03], [0, 0]],
  },
  // Headway: a fire-extinguisher backpack, starts fast and cannot stop.
  P062: {
    font: "comic",
    fill: grad("#ffffff 0 26%", "#ff6a6a 36%", "#c40d1e"),
    rim: "#1f0003",
    side: ["#7a0008", "#1f0003"],
    angle: 175,
    slant: 12,
  },
  // Azimuth: a living magnet, red and blue poles.
  P063: {
    font: "comic",
    fill: `linear-gradient(90deg, #ff4a4a 0 50%, #4a7dff 50%)`,
    rim: "#0a0a1a",
    side: ["#3a3a5a", "#0a0a1a"],
  },
  // Tether: stretches and takes a while to come back, a rubber band.
  P064: {
    font: "anton",
    fill: grad("#fff1b8", "#ffb84d 50%", "#ff7a00"),
    rim: "#2a1400",
    side: ["#a35a00", "#2a1400"],
    tracking: 0.14,
    angle: 0,
    depth: 10,
  },
  // Quicklime: dissolves everything, caustic and dripping.
  P065: {
    font: "horror",
    fill: layers(drips("#f6ffd0"), grad("#fbffe0", "#d8ff4d 50%", "#7ac400")),
    rim: "#142000",
    side: ["#4d7a00", "#142000"],
    glow: "rgb(200 255 60 / 0.35)",
  },
  // Falx: home-made blades, a steel edge with a cut.
  P066: {
    font: "stencil",
    fill: grad("#ffffff 0 35%", "#c9d3db 50%", "#6f7d88 80%", "#ff2e4c 92%"),
    rim: "#0a0e12",
    side: ["#3a4650", "#0a0e12"],
    slant: -10,
    jitter: [[4, 0], [-4, 0.02], [4, 0], [-4, -0.02]],
  },
  // Odonate: mechanical wasps, yellow and black stripes.
  P067: {
    font: "comic",
    fill: layers(honeycomb("rgb(90 50 0 / 0.35)"), `repeating-linear-gradient(180deg, #ffd60a 0 0.16em, #ff9f00 0.16em 0.22em)`),
    rim: "#140c00",
    side: ["#3a2a00", "#0d0800"],
  },
  // Nimbus: turns into fog and reappears who knows where.
  P068: {
    font: "bubble",
    fill: grad("#ffffff", "#e3e9f0 50%", "#a7b4c2"),
    rim: "#1a222c",
    side: ["#6a7a8a", "#1a222c"],
    depth: 6,
    split: ["rgb(255 255 255 / 0.35)", "rgb(255 255 255 / 0.22)"],
    haze: true,
    tracking: 0.06,
  },
  // Noctiluca: a blinding sea glow, worth little by day.
  P069: {
    font: "bubble",
    fill: layers(dots("rgb(255 255 255 / 0.7)", 0.2), grad("#ffffff", "#9ff7ff 45%", "#1fd6ff")),
    rim: "#00202a",
    side: ["#0a6a80", "#00202a"],
    glow: "rgb(80 230 255 / 0.7)",
  },
  // Aerie: retractable wings, the open sky.
  P070: {
    font: "speed",
    fill: layers(stripes("rgb(255 255 255 / 0.45)", 160, 0.04), grad("#ffffff", "#cfe9ff 45%", "#6fb4ff")),
    rim: "#0b2340",
    side: ["#3a6fae", "#0b2340"],
    angle: 120,
    tracking: 0.05,
  },
  // Cineris: burns what she touches, embers turning into ash.
  P071: {
    font: "gothic",
    fill: grad("#fff0d0 0 16%", "#ff8a3d 34%", "#6a6a6a 68%", "#2e2e2e"),
    rim: "#0a0a0a",
    side: ["#3a3a3a", "#0a0a0a"],
    glow: "rgb(255 120 40 / 0.4)",
  },
  // Tacet: a hypnotic voice, every word costs her, red lips and silence.
  P072: {
    font: "elegant",
    fill: grad("#ffd6dc", "#ff3b6b 50%", "#7a0022"),
    rim: "#1a0008",
    side: ["#5a0018", "#1a0008"],
    depth: 6,
    tracking: 0.1,
  },
  // Collateral: a chrome arm and debts with the Banco, money green underneath.
  P073: {
    font: "stencil",
    fill: metal("#ffffff", "#c2d0d8", "#4a5a64", "#9fb3bf", "#f0f6fa"),
    rim: "#0a1014",
    side: ["#1f7a4a", "#06261a"],
    depth: 9,
  },
  // Tempestas: commands the wind and cannot keep still.
  P074: {
    font: "comic",
    fill: layers(waves("rgb(255 255 255 / 0.55)"), grad("#ffffff", "#bfe6ff 45%", "#4a90d9")),
    rim: "#06203a",
    side: ["#2a5a94", "#06203a"],
    slant: 8,
    jitter: [[0, -0.04], [0, 0.02], [0, 0.05], [0, 0.01], [0, -0.03]],
  },
  // Truss: an exoskeleton running on batteries, the charge level.
  P075: {
    font: "stencil",
    fill: grad("#d9e0e6 0 36%", "#7dff5a 37%", "#1fb34a"),
    rim: "#061a0a",
    side: ["#1f6b2f", "#061a0a"],
    depth: 10,
    angle: 90,
  },
  // Errata: a machine that bends chance, dice pips and plans gone wrong.
  P076: {
    font: "scifi",
    fill: layers(dots("rgb(40 0 20 / 0.5)", 0.24), grad("#ffffff", "#ffc2d6 45%", "#ff2e6c")),
    rim: "#1a0010",
    side: ["#7a0a3a", "#1a0010"],
    jitter: [[0, 0], [-6, 0.03], [0, 0], [5, -0.04], [0, 0], [-3, 0]],
  },
  // Dredge: steel tentacles, heavy and slow out of the water.
  P077: {
    font: "block",
    fill: layers(dots("rgb(160 70 20 / 0.45)", 0.2), grad("#c9ffe8 0 20%", "#4db89a 40%", "#3a4a4a 70%", "#1a2424")),
    rim: "#050a0a",
    side: ["#2a3a3a", "#050a0a"],
    depth: 12,
    angle: 90,
  },
  // Novissima: the power of a star, which burns her up.
  P078: {
    font: "myth",
    fill: layers(stars("#ffffff"), grad("#ffffff 0 30%", "#fff6b0 50%", "#ffc43d 75%", "#ff7a00")),
    rim: "#2a1400",
    side: ["#b36b00", "#2a1400"],
    glow: "rgb(255 220 120 / 0.65)",
  },
  // Effigy: turns people to stone with a look, and the stone climbs on her.
  P079: {
    font: "elegant",
    fill: layers(cracks("rgb(40 40 40 / 0.6)"), grad("#ececec", "#a6a6a6 50%", "#5a5a5a")),
    rim: "#121212",
    side: ["#4a4a4a", "#121212"],
    glow: "rgb(120 255 160 / 0.35)",
  },
  // Re Tifeo: the giant buried under the volcano, obsidian split by red.
  P080: {
    font: "myth",
    fill: layers(cracks("#ff4a2e"), grad("#e0a0b8", "#9a3a5a 50%", "#4a1222")),
    rim: "#0a0201",
    side: ["#3a0a05", "#0a0201"],
    depth: 12,
    angle: 90,
    glow: "rgb(255 50 20 / 0.5)",
  },

  // --- Robots, monsters and mutants ---
  // Derelict: a robot made of scrap, losing a piece on the way.
  P081: {
    font: "stencil",
    fill: layers(dots("rgb(90 30 0 / 0.4)", 0.18), grad("#ffd9b0", "#d2691e 50%", "#7a2e0a")),
    rim: "#1f0a00",
    side: ["#5a2a0a", "#1f0a00"],
    jitter: [[0, 0], [0, 0], [-9, -0.08], [0, 0], [3, 0], [0, 0], [0, 0], [-2, 0]],
  },
  // Abeyance: the Banco's robot accountant, a receipt that never shows your payment.
  P082: {
    font: "pixel",
    fill: layers(scanlines("rgb(0 0 0 / 0.12)"), grad("#ffffff", "#f2f2f2 50%", "#cfcfcf")),
    rim: "#1a1a1a",
    side: ["#2f6b5a", "#0a1f1a"],
  },
  // Cicatrix: half gecko, scales on green.
  P083: {
    font: "comic",
    fill: layers(scales("rgb(10 60 0 / 0.45)"), grad("#e9ffd0", "#8be04a 50%", "#2f8a1f")),
    rim: "#0a2000",
    side: ["#2a6b14", "#0a2000"],
  },
  // Patina: living mold in the metro, verdigris dripping.
  P084: {
    font: "horror",
    fill: layers(drips("rgb(20 80 60 / 0.8)"), grad("#d9fff0", "#5fd1a8 50%", "#2a7a6a")),
    rim: "#04140f",
    side: ["#1f5a4a", "#04140f"],
  },
  // Heirloom: the old house robot, a retro appliance in cream and mint.
  P085: {
    font: "bubble",
    fill: grad("#fffbe8 0 45%", "#bff0d8 46%", "#5ac2a0"),
    rim: "#0f2a20",
    side: ["#3a8a6a", "#0f2a20"],
    tracking: 0.02,
  },
  // Precinct: a beat cop who turns into a wolf, claw marks on blue.
  P086: {
    font: "horror",
    fill: layers(claws("rgb(255 255 255 / 0.6)"), grad("#ffffff 0 20%", "#c9d8ff 35%", "#2a4fd1 70%", "#0f1f6b")),
    rim: "#020821",
    side: ["#1a2f7a", "#020821"],
  },
  // Cerbero: three heads, so the name has three.
  P087: {
    font: "myth",
    fill: grad("#ffd0b0", "#ff5a2a 50%", "#5a0a0a"),
    rim: "#0d0000",
    side: ["#4a0505", "#0d0000"],
    split: ["rgb(255 90 40 / 0.55)", "rgb(255 90 40 / 0.55)"],
    glow: "rgb(255 60 20 / 0.35)",
  },
  // Gazetteer: knows everybody's business, newsprint.
  P088: {
    font: "slab",
    fill: layers(dots("rgb(0 0 0 / 0.28)", 0.12), grad("#ffffff", "#ece7dc 60%", "#c9c2b2")),
    rim: "#111111",
    side: ["#7a0f1f", "#1f0306"],
  },
  // Polifemo: one eye, right in the middle of the name.
  P089: {
    font: "block",
    fill: layers(
      "radial-gradient(circle at 50% 50%, #ffffff 0 0.11em, #ffd60a 0.11em 0.18em, #1a0a00 0.18em 0.21em, transparent 0.21em)",
      grad("#f0d2a8", "#a6764a 50%", "#5a3a1f"),
    ),
    rim: "#140a00",
    side: ["#4a2e14", "#140a00"],
    depth: 12,
    angle: 90,
  },
  // Lamprey: a vampire executive, blood dripping on a stylish red.
  P090: {
    font: "elegant",
    fill: layers(drips("#ffffff"), grad("#ffffff 0 25%", "#ffb3c1 35%", "#c40028 60%", "#4a0010")),
    rim: "#0d0003",
    side: ["#5a0014", "#0d0003"],
  },
  // Talos: the bronze automaton from the dig.
  P091: {
    font: "myth",
    fill: metal("#ffe7c2", "#e09a4a", "#7a3f10", "#c27a33", "#ffd9a0"),
    rim: "#1f0e00",
    side: ["#7a3f10", "#1f0e00"],
    depth: 11,
    angle: 90,
  },
  // Cariddi: a whirlpool with teeth in the port.
  P092: {
    font: "horror",
    fill: vortex("#bff6ff", "#2a9fd6"),
    rim: "#001826",
    side: ["#0a4f73", "#001826"],
    glow: "rgb(60 200 255 / 0.4)",
  },

  // --- Aliens, machines and people from the future ---
  // Glip: a little alien tourist on the wrong planet, bouncing.
  P093: {
    font: "bubble",
    fill: layers(dots("rgb(0 90 70 / 0.35)", 0.26), grad("#f0fff0", "#8affc1 50%", "#1fd1a8")),
    rim: "#00261a",
    side: ["#0f8a6a", "#00261a"],
    jitter: [[-6, 0.02], [5, -0.04], [-4, 0.03], [6, 0]],
  },
  // Censor: the robot that fines everyone, a red rubber stamp.
  P094: {
    font: "pixel",
    fill: layers(dots("rgb(255 255 255 / 0.3)", 0.14), grad("#ff7b7b", "#e01e1e 50%", "#a30f0f")),
    rim: "#1a0000",
    side: ["#7a0a0a", "#1a0000"],
    jitter: [[-3, 0]],
  },
  // Raster: laser eyes and poor sight, a red pixel screen.
  P095: {
    font: "pixel",
    fill: layers(scanlines("rgb(100 0 10 / 0.4)"), grad("#ffffff", "#ff8a8a 45%", "#ff1f3d")),
    rim: "#1f0006",
    side: ["#80001a", "#1f0006"],
    glow: "rgb(255 40 70 / 0.5)",
  },
  // Huckster: a jelly alien selling door to door, wobbling.
  P096: {
    font: "bubble",
    fill: grad("#ffe6fb", "#ff8ae0 50%", "#c42aa8"),
    rim: "#2a0024",
    side: ["#8a1a74", "#2a0024"],
    line: "rgb(255 255 255 / 0.5)",
    jitter: [[0, 0.03], [0, -0.03]],
  },
  // Sextant: an astronaut back in armor, a gold visor across white.
  P097: {
    font: "scifi",
    fill: layers(stars("rgb(255 255 255 / 0.8)"), grad("#ffffff 0 38%", "#f2c14e 40% 60%", "#c9d3db 62%", "#ffffff")),
    rim: "#0a1420",
    side: ["#4a5a6a", "#0a1420"],
    tracking: 0.04,
  },
  // Facsimile: the android in the engineer's place, a fax copy of a person.
  P098: {
    font: "pixel",
    fill: layers(circuit("rgb(0 255 200 / 0.6)"), grad("#ffe0c8 0 48%", "#7a8a96 52%", "#4a5560")),
    rim: "#10141a",
    side: ["#3a4450", "#10141a"],
    split: ["rgb(255 255 255 / 0.3)", "transparent"],
  },
  // Zeta Rax: an alien bounty hunter who never stops, acid green.
  P099: {
    font: "speed",
    fill: grad("#f0ffd6", "#b8ff3d 50%", "#4d9e00"),
    rim: "#0a1a00",
    side: ["#2f5a00", "#0a1a00"],
    angle: 155,
    slant: 10,
    tracking: 0.02,
  },
  // Retrograde: from the future, misses the past: 80s chrome and an extrusion going back.
  P100: {
    font: "speed",
    fill: grad("#1f1a6b 0 18%", "#8a3dff 34%", "#ff4fb8 48%", "#ffd23f 50%", "#ff9a1f 70%", "#ffe9a8"),
    rim: "#12002a",
    side: ["#5a1fa0", "#12002a"],
    angle: 225,
    slant: 10,
  },
  // Carillon: the nun piloting a robot of scaffolding and bells, bell bronze over a blue habit.
  P101: {
    font: "gothic",
    fill: metal("#fffbe0", "#ffd23f", "#9a6a00", "#e0b030", "#fff3b0"),
    rim: "#0a1430",
    side: ["#1f3a7a", "#0a1430"],
  },
  // Regina Ix: an alien empress, royal gold and purple.
  P102: {
    font: "elegant",
    fill: grad("#fff3c2 0 25%", "#ffd23f 35%", "#b03dff 60%", "#4a0a8a"),
    rim: "#14002a",
    side: ["#4a0a8a", "#14002a"],
    glow: "rgb(200 100 255 / 0.35)",
    tracking: 0.04,
  },
  // Sibilla: an AI raised in the oracle temple, gold circuits on the future's cyan.
  P103: {
    font: "scifi",
    fill: layers(circuit("rgb(255 210 80 / 0.8)"), grad("#ffffff", "#bff6ff 45%", "#36d1e0")),
    rim: "#00222a",
    side: ["#0b6f80", "#00222a"],
    glow: "rgb(80 230 255 / 0.45)",
    tracking: 0.05,
  },
  // Aion: what remains of time after the end, a void with echoes.
  P104: {
    font: "myth",
    fill: layers(stars("rgb(255 255 255 / 0.85)"), grad("#ffffff 0 15%", "#c9b8ff 35%", "#5a2ca8 60%", "#0d0420")),
    rim: "#000000",
    side: ["#2a0f5a", "#05010d"],
    split: ["rgb(160 120 255 / 0.6)", "rgb(255 255 255 / 0.35)"],
    haze: true,
    tracking: 0.12,
  },

  // --- From the compendium ---
  // Maroon: an alien technician left behind, maroon with a tech line.
  P105: {
    font: "scifi",
    fill: layers(circuit("rgb(120 240 255 / 0.55)"), grad("#ffd6dc 0 25%", "#c2415a 45%", "#6b0f24 85%")),
    rim: "#1a0008",
    side: ["#4a0a1a", "#1a0008"],
    tracking: 0.03,
  },
  // Futures: young again for ninety seconds, half gold and half grey.
  P106: {
    font: "slab",
    fill: `linear-gradient(90deg, #ffd23f 0 50%, #bdbdbd 50%)`,
    rim: "#1a1200",
    side: ["#7a5a00", "#1a1200"],
  },
  // Procura: a motel manager who copies voices and signatures, a pink neon sign.
  P107: {
    font: "comic",
    fill: grad("#ffffff", "#ffb3e6 45%", "#ff3bb8"),
    rim: "#2a0020",
    side: ["#8a0a60", "#2a0020"],
    glow: "rgb(255 60 190 / 0.55)",
    split: ["rgb(255 120 220 / 0.35)", "transparent"],
  },
  // Semaphore: her mirrors make her ideas yours, mirror chrome.
  P108: {
    font: "scifi",
    fill: metal("#ffffff", "#9ad6ff", "#2a3a5a", "#c9e6ff", "#ffffff"),
    rim: "#020a1a",
    side: ["#3a5a8a", "#020a1a"],
    split: ["rgb(150 210 255 / 0.4)", "transparent"],
  },
  // Parallasse: takes on other people's fear, a shifted second image.
  P109: {
    font: "anton",
    fill: grad("#ffffff", "#bff0ff 45%", "#3fb8e0"),
    rim: "#002030",
    side: ["#0f5a7a", "#002030"],
    split: ["transparent", "rgb(120 200 255 / 0.6)"],
    tracking: 0.02,
  },
  // Cursor: faster than a train on the old lines, speed lines.
  P110: {
    font: "speed",
    fill: layers(speedLines("rgb(255 255 255 / 0.6)"), grad("#ffffff", "#fff1a8 40%", "#ff8a00")),
    rim: "#241000",
    side: ["#a34a00", "#241000"],
    angle: 175,
    slant: 16,
  },
  // Antiphon: repeats formulas backwards, a gold echo to the left.
  P111: {
    font: "gothic",
    fill: grad("#ffe9a8 0 20%", "#d4af37 32%", "#c21a5a 62%", "#6a0a30"),
    rim: "#0d0006",
    side: ["#4a0020", "#0d0006"],
    split: ["rgb(212 175 55 / 0.55)", "transparent"],
  },
  // Plinth: the oldest living column in town, veined marble.
  P112: {
    font: "myth",
    fill: layers(veins("rgb(90 90 100 / 0.5)"), grad("#ffffff", "#eceae4 55%", "#bdb8ae")),
    rim: "#1a1814",
    side: ["#8a857a", "#1a1814"],
    depth: 12,
    angle: 90,
    tracking: 0.06,
  },
  // Harrow: a driverless harvester worshipped as a god, wheat gold over red iron.
  P113: {
    font: "block",
    fill: layers(stripes("rgb(120 70 0 / 0.25)", 90, 0.03), grad("#fff7c2", "#ffd23f 50%", "#c97a00")),
    rim: "#241400",
    side: ["#8a2a00", "#2a0a00"],
    depth: 11,
    angle: 90,
  },
  // Perpetuum: holds the magnetic field on a copper throne, field lines glowing blue.
  P114: {
    font: "block",
    fill: layers(waves("rgb(140 230 255 / 0.55)"), metal("#ffe0cc", "#e8875a", "#8a3a14", "#d07040", "#ffd1b8")),
    rim: "#1f0800",
    side: ["#7a2e0a", "#1f0800"],
    glow: "rgb(120 220 255 / 0.4)",
  },

  // --- Made for the new powers ---
  // Codicil: adds one clause and the matter ends, ink on parchment with a ruled line.
  P115: {
    font: "elegant",
    fill: layers(stripes("rgb(60 40 10 / 0.18)", 180, 0.02), grad("#fffaf0", "#f1e2bf 55%", "#c9a86a")),
    rim: "#1a1206",
    side: ["#6a5228", "#1a1206"],
    line: "#2a1a06",
  },
  // Attainder: a name that nobody can say any more, letters crumbling to ash.
  P116: {
    font: "gothic",
    fill: layers(cracks("rgb(0 0 0 / 0.55)"), grad("#f2f2f2 0 20%", "#9a9a9a 45%", "#8a0a1a 75%", "#3a0008")),
    rim: "#050002",
    side: ["#3a0a10", "#050002"],
    split: ["transparent", "rgb(150 150 150 / 0.35)"],
    haze: true,
  },
  // Subsong: whispers to giants, infrasound rings.
  P117: {
    font: "anton",
    fill: layers(waves("rgb(255 160 80 / 0.5)"), grad("#ffffff", "#bff3ec 45%", "#2aa79b")),
    rim: "#00201c",
    side: ["#0f6a60", "#00201c"],
    tracking: 0.04,
  },
  // Lure: the bait colossi chase, hazard stripes in glowing yellow.
  P118: {
    font: "stencil",
    fill: layers(stripes("rgb(30 20 0 / 0.55)", 135, 0.1), grad("#fffbd0", "#ffe14a 45%", "#ff8a00")),
    rim: "#241000",
    side: ["#a34a00", "#241000"],
    glow: "rgb(255 220 60 / 0.45)",
    slant: 10,
  },
  // Gradus: the porter who climbs the Banco's eleven floors, marble steps.
  P119: {
    font: "myth",
    fill: layers(veins("rgb(40 50 90 / 0.35)"), grad("#ffffff", "#e8ecf6 50%", "#9aa6c4")),
    rim: "#0a0f24",
    side: ["#1c2a5a", "#0a0f24"],
    depth: 11,
    angle: 90,
    jitter: [[0, -0.06], [0, -0.03], [0, 0], [0, 0.03], [0, 0.06], [0, 0.09]],
  },
  // Xenolith: the stone in his chest grows, basalt with violet seams.
  P120: {
    font: "block",
    fill: layers(cracks("rgb(190 120 255 / 0.85)"), grad("#cfcfd6", "#6a6a74 45%", "#2a2a30")),
    rim: "#08060c",
    side: ["#3a2a4a", "#08060c"],
    glow: "rgb(170 90 255 / 0.4)",
    depth: 10,
  },
  // Impetus: once he wins he does not stop, molten copper trails.
  P121: {
    font: "speed",
    fill: layers(speedLines("rgb(255 220 180 / 0.55)"), metal("#ffe6d2", "#e8875a", "#7a2e0a", "#c0602a", "#ffd1b8")),
    rim: "#1f0800",
    side: ["#8a3a14", "#1f0800"],
    angle: 175,
    slant: 18,
  },
  // Katabatic: the wind that falls from the volcano, ash turning to ice.
  P122: {
    font: "scifi",
    fill: layers(speedLines("rgb(255 255 255 / 0.4)"), grad("#ffffff", "#d8ecff 40%", "#8a96a6 70%", "#ff7a2a")),
    rim: "#0a0c10",
    side: ["#3a4250", "#0a0c10"],
    split: ["rgb(200 230 255 / 0.4)", "transparent"],
    haze: true,
    slant: -8,
  },

  // --- From the user's found images ---
  // Busker: the alien busker's one song, golden waves over moonlit teal.
  P123: {
    font: "bubble",
    fill: layers(waves("rgb(255 210 110 / 0.6)"), grad("#f4fbff", "#a9d6e0 50%", "#3c7f8f")),
    rim: "#04161a",
    side: ["#1d4e58", "#04161a"],
    glow: "rgb(255 200 90 / 0.35)",
    jitter: [[-4, 0.02], [3, -0.03], [-2, 0.03], [4, -0.02]],
  },
  // Impound: the body shop's sledgehammer, dented steel with a hi-vis stripe.
  P124: {
    font: "slab",
    fill: layers(
      "linear-gradient(180deg, transparent 0 56%, rgb(255 130 20 / 0.9) 56% 66%, transparent 66%)",
      facets("#eef3f8", "#9fb0c0", "#4a5868"),
    ),
    rim: "#0a0e14",
    side: ["#3a4656", "#0a0e14"],
    jitter: [[-3, 0], [2, 0.03], [-1, -0.02], [3, 0.02], [-2, 0], [1, 0.03], [-3, -0.01]],
  },
  // Lagan: everything the port loses, jewels set in wet brown skin.
  P125: {
    font: "horror",
    fill: layers(dots("rgb(255 220 120 / 0.8)", 0.22), dots("rgb(120 230 255 / 0.6)", 0.31), grad("#d9b48a", "#8a5a32 50%", "#2e1c0e")),
    rim: "#0a0603",
    side: ["#3a2412", "#0a0603"],
    glow: "rgb(60 200 200 / 0.3)",
  },
  // Overdue: the late night steam train, polished brass and streaks of steam.
  P126: {
    font: "speed",
    fill: layers(speedLines("rgb(255 255 255 / 0.35)"), metal("#fff6d8", "#e0b44a", "#7a5410", "#c08a28", "#ffe9a8")),
    rim: "#060a1c",
    side: ["#1a2850", "#060a1c"],
    angle: 170,
    slant: 12,
  },
  // Stentore: the marble statue that shouts, sound rings over mossy marble.
  P127: {
    font: "myth",
    fill: layers(spiral("rgb(255 80 200 / 0.18)", "transparent"), veins("rgb(70 110 70 / 0.5)"), grad("#ffffff", "#ecebe4 50%", "#a8a596")),
    rim: "#141410",
    side: ["#5a5a50", "#141410"],
    depth: 12,
    tracking: 0.03,
  },
  // Bisque: painted porcelain, cobalt flowers and a hairline crack.
  P128: {
    font: "elegant",
    fill: layers(cracks("rgb(40 50 90 / 0.45)", "3em 1.4em"), dots("rgb(40 80 200 / 0.55)", 0.28), grad("#ffffff", "#eef2fb 55%", "#b9c4dc")),
    rim: "#0a1030",
    side: ["#2a3c8a", "#0a1030"],
    line: "#1a2a6a",
  },
  // Bubalus: the ploughing buffalo, rusted riveted plates and a red-hot core.
  P129: {
    font: "block",
    fill: layers(dots("rgb(40 10 0 / 0.55)", 0.34), metal("#ffd6c0", "#d2603a", "#6a1a08", "#a83a18", "#ff9a6a")),
    rim: "#140400",
    side: ["#5a1606", "#140400"],
    glow: "rgb(255 50 20 / 0.45)",
    depth: 11,
  },
  // Gauger: the customs desk between two portals, a form grid in rift teal.
  P130: {
    font: "scifi",
    fill: layers(blueprint("rgb(0 40 40 / 0.35)"), grad("#f0fffd", "#8fe6dc 50%", "#1f8f86")),
    rim: "#021412",
    side: ["#0e5a52", "#021412"],
    split: ["rgb(0 220 255 / 0.45)", "rgb(255 40 190 / 0.45)"],
  },
  // Mischance: the black cat of bad luck, amber claw marks on a purple night.
  P131: {
    font: "gothic",
    fill: layers(claws("rgb(255 180 40 / 0.55)"), grad("#d9c8ff", "#6a3aa8 45%", "#1a0a2a")),
    rim: "#050208",
    side: ["#2a1240", "#050208"],
    glow: "rgb(150 70 255 / 0.4)",
    jitter: [[-5, 0.03], [4, -0.02], [-2, 0.04], [6, -0.03], [-4, 0.01]],
  },
  // Wirepuller: the puppet master, glowing strings over crimson theatre velvet; the letters dangle.
  P132: {
    font: "anton",
    fill: layers(
      "repeating-linear-gradient(90deg, transparent 0 0.2em, rgb(170 240 255 / 0.8) 0.2em 0.23em)",
      grad("#ffd0d0", "#c01830 45%", "#3a0008"),
    ),
    rim: "#080003",
    side: ["#4a0610", "#080003"],
    glow: "rgb(120 220 255 / 0.4)",
    jitter: [[-6, 0.05], [4, -0.04], [-3, 0.07], [7, -0.02], [-5, 0.04], [3, -0.06]],
  },
};

const FACTION_LOOK: Record<string, Pick<NameStyle, "fill" | "side">> = {
  heroes: { fill: grad("#ffffff", "#bdefff 60%", "#16c8ff"), side: ["#0f7fa6", "#062633"] },
  villains: { fill: grad("#ffffff", "#ffc2d4 60%", "#ff2e6c"), side: ["#a3123f", "#33040f"] },
  neutrals: { fill: grad("#ffffff", "#fff1c7 60%", "#ffd60a"), side: ["#a68a06", "#2e2602"] },
};

/** A character without a look of its own (a card added later) gets a 3D name in its faction's colors. */
function fallbackStyle(faction: string): NameStyle {
  return { font: "anton", rim: "#000000", ...(FACTION_LOOK[faction] ?? FACTION_LOOK.neutrals) };
}

export function nameStyle(card: { code?: string; faction: string }): NameStyle {
  return (card.code && STYLES[card.code]) || fallbackStyle(card.faction);
}

export const STYLED_CODES = Object.keys(STYLES);

// ---------- From a style to CSS ----------

function mix(from: string, to: string, amount: number): string {
  const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  const value = [0, 1, 2].map((index) =>
    Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * amount),
  );
  return `#${value.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

const em = (value: number) => `${Number(value.toFixed(3))}em`;

/** The extrusion, cast shadow, glow and ghosts, as one text-shadow (the first entry is drawn on top). */
export function nameShadow(style: NameStyle): string {
  const depth = style.depth ?? DEPTH;
  const radians = ((style.angle ?? 60) * Math.PI) / 180;
  const dx = Math.cos(radians) * STEP;
  const dy = Math.sin(radians) * STEP;
  const layers: string[] = [];
  if (style.split) {
    const blur = style.haze ? "0.07em" : "0";
    layers.push(`-0.13em 0 ${blur} ${style.split[0]}`, `0.13em 0 ${blur} ${style.split[1]}`);
  }
  for (let i = 1; i <= depth; i++) {
    layers.push(`${em(dx * i)} ${em(dy * i)} 0 ${mix(style.side[0], style.side[1], depth > 1 ? (i - 1) / (depth - 1) : 0)}`);
  }
  // The back edge closes the solid, then the shadow it casts.
  layers.push(`${em(dx * (depth + 1))} ${em(dy * (depth + 1))} 0 ${style.rim}`);
  layers.push(`${em(dx * (depth + 3))} ${em(dy * (depth + 3))} 0.1em rgb(0 0 0 / 0.75)`);
  if (style.glow) layers.push(`0 0 0.3em ${style.glow}`, `0 0 0.7em ${style.glow}`);
  return layers.join(", ");
}

// Capitals that are clearly narrower or wider than the average one.
const LETTER_WIDTH: Record<string, number> = { I: 0.45, J: 0.75, " ": 0.5, M: 1.25, W: 1.35 };

/** How many em the name takes: the font size is the space available divided by this. */
export function nameWidth(name: string, style: NameStyle): number {
  const font = NAME_FONTS[style.font];
  const letters = [...name.toUpperCase()].reduce((sum, letter) => sum + (LETTER_WIDTH[letter] ?? 1), 0);
  const lean = Math.tan(((style.slant ?? 0) * Math.PI) / 180) * 0.8;
  const extrusion = Math.abs(Math.cos(((style.angle ?? 60) * Math.PI) / 180)) * STEP * ((style.depth ?? DEPTH) + 1);
  const scale = font.mixedCase ? 0.88 : 1;
  // 0.2em of padding (see .card-name-face) and a little room for the outline.
  return letters * (font.advance * scale + (style.tracking ?? 0)) + 0.3 + lean + extrusion + (style.split ? 0.13 : 0);
}

export function nameCss(name: string, style: NameStyle): CSSProperties {
  const font = NAME_FONTS[style.font];
  return {
    "--nm-font": font.family,
    "--nm-case": font.mixedCase ? "none" : "uppercase",
    "--nm-fill": `${LIGHT}, ${style.fill}`,
    "--nm-rim": style.rim,
    "--nm-line": style.line ?? "transparent",
    "--nm-shadow": nameShadow(style),
    "--nm-width": Number(nameWidth(name, style).toFixed(3)),
    "--nm-slant": `${-(style.slant ?? 0)}deg`,
    "--nm-tracking": em(style.tracking ?? 0),
  } as CSSProperties;
}
