/** Shop palettes a special pack can use; the keys are the ones the database accepts (special_packs.color). */
export const PACK_COLORS = {
  magenta: { name: "Magenta", background: "#ff2e6c", body: "#ffd60a", omega: "#ff2e6c", shadow: "#16c8ff" },
  cyan: { name: "Ciano", background: "#16c8ff", body: "#ffd60a", omega: "#16c8ff", shadow: "#ff2e6c" },
  yellow: { name: "Giallo", background: "#ffd60a", body: "#ff2e6c", omega: "#ffd60a", shadow: "#ff2e6c" },
  orange: { name: "Arancio", background: "#ff8a00", body: "#16c8ff", omega: "#ffd60a", shadow: "#ff2e6c" },
  violet: { name: "Viola", background: "#a970ff", body: "#ffd60a", omega: "#a970ff", shadow: "#16c8ff" },
  green: { name: "Verde", background: "#3ddc84", body: "#ff2e6c", omega: "#ffd60a", shadow: "#ff2e6c" },
} as const;

export type PackColor = keyof typeof PACK_COLORS;

export const PACK_COLOR_KEYS = Object.keys(PACK_COLORS) as PackColor[];

/** A colour from the server, or magenta if it is one this version of the app does not know. */
export function packColor(key: string | null | undefined) {
  return PACK_COLORS[(key ?? "magenta") as PackColor] ?? PACK_COLORS.magenta;
}
