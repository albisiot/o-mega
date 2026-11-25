import { BoxGeometry, ConeGeometry, CylinderGeometry } from "three";
import { ORANGE, colorOf, crawl, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bench, column, floor } from "@/lib/diorama-props";

/**
 * Commiato (P259): the old master of the Silent Blade in exile, on a ruined terrace above the
 * sea at sunset, the sun sinking behind the parapet. He holds his spear of light upright, a
 * spark winding up its shaft, and holds out his other hand, which is already coming apart into
 * drifting specks of light: the last lesson is stepping aside. On the bench his pupil's wooden
 * practice sword waits for whoever comes next.
 */
export function commiato(kit: Kit): Framing {
  const { add, box, cylinder, tick, motes } = kit;
  const ROBE = 0x1e2a48;
  const PALE = 0xc8d4e0;
  const LIGHT = 0xbff4ff;
  const STONE = 0x7a6a8a;
  const F = octagonBase(kit, 0x221c2a);
  const G = floor(kit, F, 0.06, 0x4a3a4c, 0x3a2c3c, 0.45);

  // The parapet at the back, the sun going down behind it.
  box(3.4, 0.6, 0.3, 0x5a4a62, 0, G, -1.4, { delay: 0.08, ink: 1.02 });
  box(3.5, 0.08, 0.38, 0x6a5a72, 0, G + 0.6, -1.4, { delay: 0.12 });
  add(new CylinderGeometry(0.75, 0.75, 0.04, 40).rotateX(Math.PI / 2), ORANGE, 0.7, G + 0.62 - 0.75, -1.75, { delay: 0.16, flat: true, noInk: true });
  [
    [-0.6, 0.9, 1.1],
    [1.3, 1.05, 0.7],
  ].forEach(([x, y, w], k) => box(w, 0.05, 0.02, 0xff5a8a, x, G + y, -1.72, { delay: 0.2 + k * 0.03, flat: true, noInk: true }));

  // Ruins: a standing column, a broken one, a fallen block.
  column(kit, -1.55, -0.75, G, 0.2, 2.9, false, STONE);
  column(kit, -0.95, -1.15, G, 0.24, 2.0, true, STONE);
  box(1.0, 0.28, 0.34, 0x6a5a7a, -1.3, G, 0.6, { delay: 0.3, rotation: [0, 0.5, 0.06] });

  // The bench, and the pupil's wooden sword waiting on it.
  bench(kit, 1.35, 0.5, G, 0.32, -0.6);
  const along = (u: number): Point => [1.35 + u * 0.825, G + 0.35, 0.5 + u * 0.565];
  box(0.06, 0.035, 0.5, 0x8a6a48, ...along(0.05), { delay: 0.5, rotation: [0, 0.97, 0] });
  box(0.14, 0.04, 0.04, 0x5e4a3a, ...along(-0.22), { delay: 0.52, rotation: [0, 0.97, 0] });
  box(0.04, 0.04, 0.14, 0x3e3028, ...along(-0.3), { delay: 0.54, rotation: [0, 0.97, 0] });

  // Commiato: white hair, a long navy robe with pale bands, a high collar.
  const f = 0.25;
  const master = figure(kit, {
    x: 0,
    z: 0.25,
    y: G,
    facing: f,
    height: 2.5,
    build: "slim",
    skin: 0xd8a888,
    hair: { style: "short", color: 0xc4c6d2 },
    face: { mouth: "neutral", brows: "calm", marks: 0xb08068 },
    top: { kind: "robe", color: ROBE },
    shoes: 0x1a1a22,
    arms: [
      [-0.42, 1.35, 0.25],
      [0.58, 1.3, 0.38],
    ],
    delay: 0.8,
  });
  const at = master.at;
  [-1, 1].forEach((side) => limb(kit, at(side * 0.08, 1.78, 0.25), at(side * 0.3, 0.18, 0.37), 0.035, 0.04, PALE, { delay: 1.1 }));
  const collar = cylinder(0.14, 0.17, 0.2, ROBE, ...at(0, 1.74, 0), { delay: 1.12 }, 14);
  kit.decorate(collar, new BoxGeometry(0.2, 0.025, 0.02), PALE, [[0, 0.19, 0.14]]);

  // The spear of light, upright in his right hand, a spark winding up it.
  const [spearHand, open] = master.hands;
  const foot: Point = [spearHand[0], G + 0.02, spearHand[2]];
  cylinder(0.024, 0.024, 2.95, LIGHT, ...foot, { delay: 1.3, flat: true });
  add(new ConeGeometry(0.06, 0.32, 8), 0xe8fbff, foot[0], G + 2.95, foot[2], { delay: 1.35, flat: true });
  const spirals = [0, 1].map((k) => zigzag(kit, crawl([foot, [foot[0], G + 3.0, foot[2]]], 18, 0.06, k * 1.7), 0.012, k ? 0x16c8ff : 0xffffff, 1.5 + k * 0.05));

  // His open hand coming apart: the hand itself turned to light, specks drifting off it.
  const hand = master.parts.reduce((best, part) => {
    const d = (p: typeof part) => Math.hypot(p.position.x - open[0], p.position.y - (open[1] - 0.09), p.position.z - open[2]);
    return d(part) < d(best) ? part : best;
  });
  colorOf(hand).setHex(LIGHT);
  const specks = Array.from({ length: 9 }, (_, k) => box(0.04 + (k % 3) * 0.01, 0.04, 0.04, k % 2 ? LIGHT : 0x16c8ff, ...open, { delay: 1.4 + k * 0.02, flat: true, noInk: true, rotation: [k, k * 2, 0] }));
  motes(14, 0xd8fbff, 0.022, [open[0] - 0.15, open[1] - 0.1, open[2] - 0.2], [open[0] + 0.7, open[1] + 1.6, open[2] + 0.3], 1.6);

  tick((t) => {
    spirals.forEach((spiral, k) => spiral.forEach((piece) => (piece.visible = Math.floor(t * 5) % 2 === k)));
    specks.forEach((speck, k) => {
      const u = (t * 0.22 + k / 9) % 1;
      speck.position.set(open[0] + 0.05 + u * 0.65 + Math.sin(k * 2.3) * 0.08, open[1] - 0.04 + u * 0.75 + (k % 3) * 0.05, open[2] + Math.cos(k * 1.7) * 0.15 - u * 0.1);
      speck.rotation.y = k + t * (k % 2 ? 1.5 : -1.2);
      speck.visible = u < 0.88;
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
