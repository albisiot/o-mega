import { BoxGeometry, ConeGeometry, TorusGeometry, type Group } from "three";
import { CYAN, ORANGE, YELLOW, archMouth, archedWall, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Vulnerary (P140): the masked healer of the Lanterne in a vaulted crypt turned infirmary, worn
 * linen robe, bronze half-mask, a forked staff; his palm hovers over the bandaged arm of a woman
 * sitting on a cot, and threads of light carry her healing time up into him while the
 * hourglass at her bedside empties into his. Herbs dry on a beam, a copper still steams on the
 * shelf. The price: he takes her wounds on himself, his own forearm already bandaged.
 */
export function vulnerary(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const LINEN = 0x9a8f7a;
  const COPPER = 0xb0603a;
  const F = octagonBase(kit, 0x1a1a24);
  const G = floor(kit, F, 0.06, 0x34303c, 0x24202c, 0.42);

  // The crypt: a brick wall with a dark arch, a beam with herbs drying, a shelf with a still.
  const wall = add(archedWall(3.2, 2.8, 0.3, { x: -0.55, half: 0.5, spring: 1.3 }), 0x3a3448, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.32, 0.012, 0.01),
    0x2a2436,
    Array.from({ length: 24 }, (_, k) => [-1.3 + (k % 6) * 0.5 + (Math.floor(k / 6) % 2) * 0.25, 0.5 + Math.floor(k / 6) * 0.55, 0.151] as Point).filter(([x, y]) => Math.hypot(x + 0.55, Math.max(0, y - 1.3)) > 0.62 || y > 1.85),
  );
  add(archMouth(0.5, 1.3), 0x0e0c14, -0.55, G, -1.6, { delay: 0.12, flat: true, noInk: true });
  box(3.0, 0.14, 0.16, 0x4e3a2c, 0, G + 2.45, -1.0, { delay: 0.2 });
  const herbs: Group[] = [-1.15, -0.55, 0.15, 0.75].map((x, i) => {
    box(0.008, 0.25, 0.008, 0x8a7a5a, x, G + 2.2, -1.0, { delay: 0.25, noInk: true });
    return add(new ConeGeometry(0.11, 0.4, 6).rotateX(Math.PI), i % 2 ? 0x5a6a3a : 0x6a5a3a, x, G + 1.82, -1.0, { delay: 0.28 + i * 0.03 });
  });
  box(1.1, 0.06, 0.32, 0x4e3a2c, 0.95, G + 1.3, -1.2, { delay: 0.3 });
  ball(0.17, COPPER, 0.7, G + 1.36, -1.2, { delay: 0.35 });
  cable(kit, [[0.7, G + 1.68, -1.2], [0.95, G + 1.85, -1.18], [1.25, G + 1.55, -1.16]], 0.025, COPPER, 0.4);
  cylinder(0.08, 0.1, 0.18, 0x6a8a8a, 1.3, G + 1.36, -1.18, { delay: 0.42 }, 10);
  motes(5, 0xc8b8c8, 0.03, [0.6, G + 1.7, -1.3], [0.85, G + 2.3, -1.1], 0.8);
  cylinder(0.03, 0.03, 0.12, 0xe8e2d0, 1.05, G + 1.36, -1.1, { delay: 0.45 }, 8);
  const candle = ball(0.03, YELLOW, 1.05, G + 1.48, -1.1, { delay: 0.47, flat: true, noInk: true });

  // The cot, a blanket and a pillow; the woman sits on its edge holding out her arm.
  box(0.8, 0.42, 1.7, 0x4e3a2c, 1.3, G, 0.2, { delay: 0.3 });
  box(0.84, 0.08, 1.1, 0x23404b, 1.3, G + 0.42, 0.45, { delay: 0.35 });
  box(0.6, 0.12, 0.34, 0xe8e2d0, 1.3, G + 0.42, -0.45, { delay: 0.38 });
  const patient = figure(kit, {
    x: 0.98,
    z: 0.4,
    y: G,
    facing: -0.6,
    height: 2.2,
    build: "slim",
    skin: 0xd8b098,
    hair: { style: "long", color: 0x5a3020 },
    face: { mouth: "neutral", brows: "worried" },
    top: { kind: "dress", color: 0x6a5a8a },
    barefoot: true,
    arms: [[-0.2, 1.05, 0.55], "down"],
    legs: "sit",
    delay: 0.6,
  });
  // Her forearm in bandages: from the elbow the figure builds to her hand.
  const elbowOf = (s: number, sw: number, top: number, hand: Point, u: number): Point => [(s * sw + hand[0]) / 2 + s * 0.14 * u, (top + hand[1]) / 2 - 0.1 * u, hand[2] / 2 - 0.04 * u];
  const pu = 2.2 / 2.4;
  const pHand: Point = [-0.2, 1.05, 0.55];
  const pElbow = elbowOf(-1, 0.34 * pu, 1.72 * pu - 1.08 * pu * 0.38, pHand, pu);
  const lerp = (a: Point, b: Point, k: number): Point => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const wound = [patient.at(...lerp(pElbow, pHand, 0.15)), patient.at(...lerp(pElbow, pHand, 0.82))];
  limb(kit, wound[0], wound[1], 0.085, 0.08, 0xf0ece0, { delay: 1.2 });

  // Vulnerary: thin, dark curls, bronze half-mask, the linen robe; his palm over her arm.
  const X = -0.4;
  const Z = 0.3;
  const D = 0.55;
  const target = lerp(wound[0], wound[1], 0.5);
  const local = (w: Point): Point => {
    const dx = w[0] - X;
    const dz = w[2] - Z;
    return [dx * Math.cos(D) - dz * Math.sin(D), w[1] - G, dx * Math.sin(D) + dz * Math.cos(D)];
  };
  const palm = local([target[0] - 0.05, target[1] + 0.42, target[2]]);
  const healer = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: D,
    height: 2.45,
    build: "slim",
    skin: 0xc8a088,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "neutral", brows: "worried", mask: "eyes", maskColor: 0xb07a3a, marks: 0x8a6a5a },
    top: { kind: "robe", color: LINEN },
    cape: 0x7a705e,
    shoes: 0x3e3028,
    arms: [[-0.42, 1.42, 0.24], palm],
    delay: 0.8,
  });
  const at = healer.at;
  // His forked staff.
  const staffTop = at(-0.4, 2.55, 0.26);
  limb(kit, at(-0.45, 0, 0.3), staffTop, 0.035, 0.03, 0x5e4a3a, { delay: 1.3 });
  [-1, 1].forEach((side) => limb(kit, staffTop, at(-0.4 + side * 0.14, 2.82, 0.26), 0.028, 0.02, 0x5e4a3a, { delay: 1.32 }));
  // His own forearm, bandaged where her wound went.
  const hu = 2.45 / 2.4;
  const hElbow = elbowOf(1, 0.34 * hu, 1.72 * hu, palm, hu);
  limb(kit, at(...lerp(hElbow, palm, 0.25)), at(...lerp(hElbow, palm, 0.7)), 0.1, 0.095, 0xf0ece0, { delay: 1.4 });

  // Threads of light from her bandage into his palm, and specks of her time climbing them.
  const [hx, hy, hz] = healer.hands[1];
  const ends: Point[] = [0.1, 0.4, 0.7, 0.95].map((k) => lerp(wound[0], wound[1], k));
  ends.forEach((p, i) => limb(kit, [p[0], p[1] + 0.06, p[2]], [hx + (i - 1.5) * 0.03, hy - 0.06, hz], 0.011, 0.011, ORANGE, { delay: 1.5 + i * 0.04, flat: true, noInk: true }));
  const specks = Array.from({ length: 6 }, (_, k) => ball(0.025, YELLOW, ends[k % 4][0], ends[k % 4][1], ends[k % 4][2], { delay: 1.7, flat: true, noInk: true }));

  // The hourglass on a stool between them: her sand runs into his.
  const HX = 1.95;
  const HZ = 0.6;
  cylinder(0.2, 0.18, 0.45, 0x4e3a2c, HX, G, HZ, { delay: 0.4 }, 12);
  const glassY = G + 0.45;
  [0, 0.42].forEach((dy) => cylinder(0.13, 0.13, 0.03, 0x4e3a2c, HX, glassY + dy, HZ, { delay: 0.5 }, 12));
  [0, 2.1, 4.2].forEach((angle) => box(0.02, 0.39, 0.02, 0x4e3a2c, HX + Math.sin(angle) * 0.11, glassY + 0.03, HZ + Math.cos(angle) * 0.11, { delay: 0.52, noInk: true }));
  const upper = add(new ConeGeometry(0.09, 0.15, 12).rotateX(Math.PI), ORANGE, HX, glassY + 0.24, HZ, { delay: 0.55, flat: true });
  const lower = add(new ConeGeometry(0.1, 0.13, 12), ORANGE, HX, glassY + 0.03, HZ, { delay: 0.55, flat: true });
  add(new TorusGeometry(0.1, 0.01, 4, 16).rotateX(Math.PI / 2), CYAN, HX, glassY + 0.215, HZ, { delay: 0.56, flat: true, noInk: true });

  tick((t) => {
    // Specks climb the threads; the sand runs and turns over; herbs sway; the candle flickers.
    specks.forEach((speck, k) => {
      const u = (t * 0.45 + k / specks.length) % 1;
      const from = ends[k % 4];
      speck.position.set(from[0] + (hx - from[0]) * u, from[1] + (hy - from[1]) * u, from[2] + (hz - from[2]) * u);
    });
    const sand = (t * 0.08 + 0.5) % 1;
    upper.children[0].scale.set(1 - sand * 0.6, 1 - sand * 0.9, 1 - sand * 0.6);
    lower.children[0].scale.set(0.4 + sand * 0.6, 0.1 + sand * 0.9, 0.4 + sand * 0.6);
    herbs.forEach((herb, i) => (herb.rotation.z = Math.sin(t * 0.9 + i) * 0.05));
    candle.children[0].scale.y = 1 + Math.sin(t * 12) * 0.3;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
