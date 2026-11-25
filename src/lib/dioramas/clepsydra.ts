import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { ORANGE, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { column, floor, rubble, volcanoBackdrop } from "@/lib/diorama-props";

/**
 * Clepsydra (P178): among the temple ruins above the sea the hourglass automaton stands on its
 * three bronze legs and mends a broken column, pouring molten amber from the spout under its
 * belly into the crack, which glows like a gold seam. The sand runs down through its glass, a
 * long tone rings out from its crown, and ivy has climbed one leg: it has not moved in days.
 */
export function clepsydra(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BRONZE = 0x8a6a3a;
  const VERDIGRIS = 0x3f7a68;
  const VERDIGRIS_DARK = 0x2c5a4c;
  const SAND = ORANGE;
  const IVY = 0x2f8f4f;
  const MARBLE = 0x8aa0b4;
  const F = octagonBase(kit, 0x1e1e26);
  const G = floor(kit, F, 0.06, 0x3a3430, 0x2a2522, 0);

  // The ruin: a standing pair of columns under their beam, a mended one, the volcano far off.
  volcanoBackdrop(kit, 0.55, -1.65, G, 0.1, 1.05);
  column(kit, -1.55, -0.85, G, 0.15, 2.5, false, MARBLE);
  column(kit, -0.85, -1.55, G, 0.2, 2.5, false, MARBLE);
  box(1.3, 0.26, 0.5, 0x9ab0c2, -1.2, G + 2.5, -1.2, { delay: 0.3, rotation: [0, Math.PI / 4, 0] });
  const mended = column(kit, 1.45, -0.95, G, 0.25, 1.8, false, MARBLE);
  decorate(mended[1], new BoxGeometry(0.02, 0.22, 0.01), SAND, [
    [0.06, 0.35, 0.19, 0.5],
    [0.0, 0.55, 0.2, -0.4],
    [0.07, 0.75, 0.19, 0.6],
  ]);
  rubble(kit, -0.9, 1.3, G, 0.3, 5, 0.4, 0x5a6478);
  rubble(kit, 1.5, 0.6, G, 0.35, 4, 0.3, 0x5a6478);

  // The broken column it is mending, a glowing crack down its face.
  const [colX, colZ] = [0.5, 0.5];
  const broken = column(kit, colX, colZ, G, 0.35, 1.05, true, MARBLE);
  const seam = decorate(broken[1], new BoxGeometry(0.025, 0.14, 0.01), SAND, [
    [0.08, 0.56, 0.19, 0.4],
    [0.05, 0.44, 0.195, -0.5],
    [0.08, 0.32, 0.19, 0.5],
    [0.05, 0.2, 0.195, -0.4],
    [0.08, 0.08, 0.19, 0.3],
  ]);

  // Clepsydra: three bronze legs under a disc, two glass bulbs with sand, a crown of holes.
  const cx = -0.35;
  const cz = -0.15;
  const toward = Math.atan2(colX - cx, colZ - cz);
  const hip = G + 0.95;
  const legs = [1, 3, 5].map((k) => toward + (k * Math.PI) / 3);
  legs.forEach((a, i) => {
    const s = Math.sin(a);
    const c = Math.cos(a);
    const h: Point = [cx + s * 0.34, hip + 0.02, cz + c * 0.34];
    const knee: Point = [cx + s * 0.78, G + 0.62, cz + c * 0.78];
    const foot: Point = [cx + s * 0.9, G + 0.08, cz + c * 0.9];
    limb(kit, h, knee, 0.075, 0.07, VERDIGRIS, { delay: 0.5 + i * 0.04 });
    const shin = limb(kit, knee, foot, 0.07, 0.045, VERDIGRIS_DARK, { delay: 0.55 + i * 0.04 });
    ball(0.11, BRONZE, knee[0], knee[1] - 0.11, knee[2], { delay: 0.6 + i * 0.04 });
    add(new ConeGeometry(0.07, 0.16, 6).rotateX(Math.PI), VERDIGRIS_DARK, foot[0], G, foot[2], { delay: 0.5 + i * 0.04 });
    if (i === 2)
      // Ivy up the leg nearest us: it has stood here for days.
      decorate(shin, new BoxGeometry(0.07, 0.03, 0.05), IVY, [
        [0.07, 0.08, 0.02, 0.5],
        [-0.06, 0.16, 0.04, -0.4],
        [0.06, 0.26, 0.03, 0.6],
        [-0.07, 0.34, 0.02, -0.5],
        [0.05, 0.44, 0.04, 0.4],
        [-0.04, 0.52, 0.05, -0.3],
      ]);
  });
  [0.1, 0.35, -0.2].forEach((dx, k) => ball(0.06, IVY, cx + Math.sin(legs[2]) * 0.9 + dx * 0.4, G, cz + Math.cos(legs[2]) * 0.9 + 0.08 + k * 0.04, { delay: 0.65 + k * 0.02 }));
  const disc = cylinder(0.5, 0.42, 0.2, BRONZE, cx, hip, cz, { delay: 0.7 }, 18);
  decorate(disc, new CylinderGeometry(0.025, 0.025, 0.01, 8).rotateX(Math.PI / 2), 0x5a4426, Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    return [Math.sin(a) * 0.47, 0.12, Math.cos(a) * 0.47] as Point;
  }));
  // The spout under its belly, and the molten stream into the crack.
  const out: Point = [cx + Math.sin(toward) * 0.62, hip - 0.02, cz + Math.cos(toward) * 0.62];
  limb(kit, [cx + Math.sin(toward) * 0.3, hip + 0.06, cz + Math.cos(toward) * 0.3], out, 0.06, 0.045, BRONZE, { delay: 0.8 });
  const target: Point = [colX - Math.sin(toward) * 0.12 + 0.05, G + 0.72, colZ - Math.cos(toward) * 0.12 + 0.12];
  const stream = cable(kit, [out, [out[0] + (target[0] - out[0]) * 0.6, out[1] - 0.02, out[2] + (target[2] - out[2]) * 0.6], target], 0.03, SAND, 0.9);

  // The bulbs: bronze ribs round the sand, the neck between them, the crown on top.
  const low = hip + 0.2;
  const neck = low + 0.64;
  const top = neck + 0.64;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const [s, c] = [Math.sin(a), Math.cos(a)];
    limb(kit, [cx + s * 0.46, low, cz + c * 0.46], [cx + s * 0.07, neck, cz + c * 0.07], 0.018, 0.018, BRONZE, { delay: 1 + k * 0.02 });
    limb(kit, [cx + s * 0.07, neck, cz + c * 0.07], [cx + s * 0.46, top, cz + c * 0.46], 0.018, 0.018, BRONZE, { delay: 1.1 + k * 0.02 });
  }
  const pile = add(new ConeGeometry(0.44, 0.5, 16), SAND, cx, low, cz, { delay: 1.2, flat: true });
  const upper = add(new ConeGeometry(0.4, 0.55, 16).rotateX(Math.PI), SAND, cx, neck + 0.02, cz, { delay: 1.25, flat: true });
  cylinder(0.012, 0.012, neck - low, SAND, cx, low, cz, { delay: 1.3, flat: true, noInk: true }, 6);
  cylinder(0.1, 0.1, 0.06, BRONZE, cx, neck - 0.03, cz, { delay: 1.15 }, 12);
  // Dark glass: a few glints on the near side.
  [
    [0.26, low + 0.18, 0.2],
    [0.24, top - 0.2, 0.22],
  ].forEach(([dx, y, dz], i) => box(0.025, 0.2, 0.01, 0xe8f6fa, cx + dx, y, cz + dz + 0.1, { delay: 1.35 + i * 0.03, flat: true, noInk: true, rotation: [0, 0.5, i ? 0.6 : -0.6] }));
  const crown = cylinder(0.53, 0.5, 0.14, BRONZE, cx, top, cz, { delay: 1.4 }, 18);
  decorate(crown, new CylinderGeometry(0.045, 0.045, 0.02, 10).rotateX(Math.PI / 2), 0x1a140c, Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2;
    return [Math.sin(a) * 0.52, 0.07, Math.cos(a) * 0.52] as Point;
  }));
  cylinder(0.46, 0.53, 0.05, 0x5a4426, cx, top + 0.14, cz, { delay: 1.45 }, 18);
  // The long tone: a ring that spreads from its crown.
  const tone = add(new TorusGeometry(0.62, 0.018, 6, 40).rotateX(Math.PI / 2), 0xbfe8f0, cx, top + 0.1, cz, { delay: 1.6, flat: true, noInk: true });

  const hot = colorOf(stream).clone();
  const cool = hot.clone().offsetHSL(0, 0, 0.18);
  tick((t) => {
    // Sand runs from the upper bulb into the lower one, and the glass turns over.
    const u = (t * 0.05 + 0.35) % 1;
    const s = Math.max(0.08, 1 - u);
    upper.children[0].scale.setScalar(s);
    upper.children[1].scale.set(1.06 * s, 1.036 * s, 1.06 * s);
    const h = Math.max(0.12, u);
    pile.children[0].scale.set(1, h, 1);
    pile.children[1].scale.set(1.06, 1.036 * h, 1.06);
    // The molten amber pulses down the crack.
    const k = (Math.sin(t * 3) + 1) / 2;
    colorOf(stream).lerpColors(hot, cool, k);
    seam.color.lerpColors(hot, cool, 1 - k);
    // One long tone: the ring spreads and fades, then rings again.
    const r = (t * 0.35) % 1;
    tone.children[0].scale.set(1 + r * 1.2, 1, 1 + r * 1.2);
    tone.visible = r < 0.8;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
