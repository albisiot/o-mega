/**
 * How a special pack looks in the shop and when it is opened.
 * - background: the shop panel, a colour or a gradient (CSS paint);
 * - accent: a solid colour for what cannot be a gradient (the buy button's text and fill, the
 *   swatch in the admin list), readable on black;
 * - ink: the text on the background;
 * - body, omega: the pack drawing; shadow: the buy button's shadow.
 */
export type PackPalette = {
  name: string;
  background: string;
  accent: string;
  ink: string;
  body: string;
  omega: string;
  shadow: string;
};

const INK = "#000000";
const LIGHT_INK = "#fff8e7";

/**
 * The shop palettes. The keys are what the database accepts (public.is_pack_color): a new one
 * needs a migration. The first six are the original ones and keep their look.
 */
export const PACK_COLORS = {
  magenta: { name: "Magenta", background: "#ff2e6c", accent: "#ff2e6c", ink: INK, body: "#ffd60a", omega: "#ff2e6c", shadow: "#16c8ff" },
  cyan: { name: "Ciano", background: "#16c8ff", accent: "#16c8ff", ink: INK, body: "#ffd60a", omega: "#16c8ff", shadow: "#ff2e6c" },
  yellow: { name: "Giallo", background: "#ffd60a", accent: "#ffd60a", ink: INK, body: "#ff2e6c", omega: "#ffd60a", shadow: "#ff2e6c" },
  orange: { name: "Arancio", background: "#ff8a00", accent: "#ff8a00", ink: INK, body: "#16c8ff", omega: "#ffd60a", shadow: "#ff2e6c" },
  violet: { name: "Viola", background: "#a970ff", accent: "#a970ff", ink: INK, body: "#ffd60a", omega: "#a970ff", shadow: "#16c8ff" },
  green: { name: "Verde", background: "#3ddc84", accent: "#3ddc84", ink: INK, body: "#ff2e6c", omega: "#ffd60a", shadow: "#ff2e6c" },
  red: { name: "Rosso", background: "#ff3b30", accent: "#ff3b30", ink: INK, body: "#ffd60a", omega: "#ffd60a", shadow: "#16c8ff" },
  blue: { name: "Blu", background: "#2f6bff", accent: "#5b8cff", ink: LIGHT_INK, body: "#ffd60a", omega: "#16c8ff", shadow: "#ffd60a" },
  pink: { name: "Rosa", background: "#ff8fc7", accent: "#ff8fc7", ink: INK, body: "#16c8ff", omega: "#ff2e6c", shadow: "#a970ff" },
  lime: { name: "Lime", background: "#c6f432", accent: "#c6f432", ink: INK, body: "#a970ff", omega: "#ff2e6c", shadow: "#a970ff" },
  teal: { name: "Petrolio", background: "#00b3a4", accent: "#00b3a4", ink: INK, body: "#ffd60a", omega: "#ff2e6c", shadow: "#ff2e6c" },
  silver: { name: "Argento", background: "#d9dde3", accent: "#d9dde3", ink: INK, body: "#16c8ff", omega: "#ff2e6c", shadow: "#a970ff" },
  noir: { name: "Nero", background: "#1c1c1c", accent: "#ffd60a", ink: LIGHT_INK, body: "#ffd60a", omega: "#ff2e6c", shadow: "#ffd60a" },
  sunset: {
    name: "Tramonto",
    background: "linear-gradient(135deg, #ff2e6c 0%, #ff8a00 55%, #ffd60a 100%)",
    accent: "#ff8a00",
    ink: INK,
    body: "#16c8ff",
    omega: "#ffd60a",
    shadow: "#16c8ff",
  },
  aurora: {
    name: "Aurora",
    background: "linear-gradient(135deg, #16c8ff 0%, #3ddc84 100%)",
    accent: "#16c8ff",
    ink: INK,
    body: "#ffd60a",
    omega: "#a970ff",
    shadow: "#a970ff",
  },
  cosmic: {
    name: "Cosmo",
    background: "linear-gradient(135deg, #a970ff 0%, #ff2e6c 100%)",
    accent: "#a970ff",
    ink: INK,
    body: "#ffd60a",
    omega: "#16c8ff",
    shadow: "#16c8ff",
  },
  holo: {
    name: "Olografico",
    background: "linear-gradient(120deg, #ffd60a 0%, #ff2e6c 35%, #16c8ff 70%, #3ddc84 100%)",
    accent: "#ffd60a",
    ink: INK,
    body: "#fff8e7",
    omega: "#ff2e6c",
    shadow: "#16c8ff",
  },
  toxic: {
    name: "Tossico",
    background: "linear-gradient(135deg, #c6f432 0%, #3ddc84 100%)",
    accent: "#c6f432",
    ink: INK,
    body: "#a970ff",
    omega: "#ffd60a",
    shadow: "#ff2e6c",
  },
  abyss: {
    name: "Abisso",
    background: "linear-gradient(160deg, #2f6bff 0%, #1c1c1c 100%)",
    accent: "#16c8ff",
    ink: LIGHT_INK,
    body: "#16c8ff",
    omega: "#ffd60a",
    shadow: "#16c8ff",
  },
  lava: {
    name: "Lava",
    background: "linear-gradient(160deg, #ff3b30 0%, #1c1c1c 100%)",
    accent: "#ff8a00",
    ink: LIGHT_INK,
    body: "#ff8a00",
    omega: "#ffd60a",
    shadow: "#ff3b30",
  },
  gold: {
    name: "Oro",
    background: "linear-gradient(135deg, #fff1a8 0%, #ffd60a 45%, #c99700 100%)",
    accent: "#ffd60a",
    ink: INK,
    body: "#1c1c1c",
    omega: "#ffd60a",
    shadow: "#ff2e6c",
  },
} as const satisfies Record<string, PackPalette>;

export type PackPreset = keyof typeof PACK_COLORS;

export const PACK_COLOR_KEYS = Object.keys(PACK_COLORS) as PackPreset[];

/** The presets with a gradient background, shown in their own group. */
export const GRADIENT_PACK_COLORS = PACK_COLOR_KEYS.filter((key) => PACK_COLORS[key].background.includes("gradient"));
export const SOLID_PACK_COLORS = PACK_COLOR_KEYS.filter((key) => !GRADIENT_PACK_COLORS.includes(key));

/** What special_packs.color holds: a preset key or a custom value ("custom:#from:#to:#body:#omega"). */
export type PackColor = string;

/** The four colours an admin picks for a custom pack; from = to for a solid background. */
export type CustomPackColor = { from: string; to: string; body: string; omega: string };

const HEX = /^#[0-9a-f]{6}$/;
const CUSTOM = /^custom:(#[0-9a-f]{6}):(#[0-9a-f]{6}):(#[0-9a-f]{6}):(#[0-9a-f]{6})$/;

/** "#FF2E6C" or "#ff2e6c" → "#ff2e6c"; null for anything else (the colour input gives lower case). */
export function normalizeHex(value: string): string | null {
  const hex = value.trim().toLowerCase();
  return HEX.test(hex) ? hex : null;
}

/** The value saved for a custom colour; null if a colour is not a #rrggbb hex. */
export function customPackColorValue(custom: CustomPackColor): string | null {
  const parts = [custom.from, custom.to, custom.body, custom.omega].map(normalizeHex);
  return parts.every(Boolean) ? `custom:${parts.join(":")}` : null;
}

/** The four colours of a custom value; null if it is not one. */
export function parseCustomPackColor(value: string | null | undefined): CustomPackColor | null {
  const match = value ? CUSTOM.exec(value) : null;
  return match ? { from: match[1], to: match[2], body: match[3], omega: match[4] } : null;
}

/** Same rule as the server's is_pack_color. */
export function isPackColor(value: string | null | undefined): boolean {
  return value != null && (Object.prototype.hasOwnProperty.call(PACK_COLORS, value) || parseCustomPackColor(value) !== null);
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio of two #rrggbb colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The palette of a custom colour: text dark or light, whichever reads better on both ends of the background. */
export function customPalette(custom: CustomPackColor): PackPalette {
  const readable = (ink: string) => Math.min(contrast(custom.from, ink), contrast(custom.to, ink));
  const ink = readable(INK) >= readable(LIGHT_INK) ? INK : LIGHT_INK;
  // On the black buy button: the background colour if it shows, otherwise one of the pack's.
  const accent = [custom.from, custom.to, custom.omega, custom.body].find((hex) => contrast(hex, "#000000") >= 4.5) ?? "#ffd60a";
  return {
    name: "Personalizzato",
    background: custom.from === custom.to ? custom.from : `linear-gradient(135deg, ${custom.from} 0%, ${custom.to} 100%)`,
    accent,
    ink,
    body: custom.body,
    omega: custom.omega,
    shadow: custom.omega === custom.from ? custom.body : custom.omega,
  };
}

/** A colour from the server, or magenta if it is one this version of the app does not know. */
export function packColor(key: string | null | undefined): PackPalette {
  const custom = parseCustomPackColor(key);
  if (custom) return customPalette(custom);
  return PACK_COLORS[(key ?? "magenta") as PackPreset] ?? PACK_COLORS.magenta;
}

/** The app's solid colours, offered as quick picks wherever an admin types a #rrggbb colour. */
export const APP_SWATCHES: { name: string; hex: string }[] = [
  ...SOLID_PACK_COLORS.filter((key) => key !== "noir").map((key) => ({ name: PACK_COLORS[key].name, hex: PACK_COLORS[key].background })),
  { name: "Bianco", hex: "#fff8e7" },
  { name: "Grigio", hex: "#7c8794" },
];
