import { BoxGeometry, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, INK, ORANGE, YELLOW, aim, cable, crawl, jag, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * Tensione (P297): the Comune's electrician of the Custodi stands on a high-voltage pylon at
 * night, chained to its leg, one yellow-gloved hand flung out and crackling with the current he
 * carries in his body, arcs leaping to the line. Below lie the price of a body that burns every
 * gadget it touches: his phone, smoking, and a melted tester in the open toolbox.
 */
export function tensione(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const F = octagonBase(kit, 0x1a1d2a);
  const G = floor(kit, F, 0.06, 0x2b2a34, 0x1f1e28, 0.6);
  const STEEL = 0x46608a;
  const BRACE = 0x9a3a7a;
  const NAVY = 0x262c5c;
  const LEATHER = 0x8a5a2a;
  const LINK = 0xb8c0cc;

  // The port lights far off.
  skyline(kit, -1.9, G, 0.1, [0x22344a, 0x2a2f4a, 0x3a2a4a], 0.25, 1.3);

  // The pylon: four legs leaning in, cross-bracing on every face, two arms with insulators.
  const PX = -0.55;
  const PZ = -0.85;
  const H = 4.2;
  const half = (y: number) => 0.72 - (0.52 * y) / H;
  const corner = (sx: number, sz: number, y: number): Point => [PX + sx * half(y), G + y, PZ + sz * half(y)];
  const SIDES = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  SIDES.forEach(([sx, sz], i) => {
    limb(kit, corner(sx, sz, 0), corner(sx, sz, H), 0.06, 0.04, STEEL, { delay: 0.1 + i * 0.03 });
    box(0.22, 0.12, 0.22, 0x5a5a66, PX + sx * 0.72, G, PZ + sz * 0.72, { delay: 0.08 });
  });
  const LEVELS = [0.15, 0.9, 1.8, 2.6, 3.3, 4.0];
  SIDES.forEach(([ax, az], k) => {
    const [bx, bz] = SIDES[(k + 1) % 4];
    LEVELS.forEach((y, j) => {
      const delay = 0.2 + j * 0.04;
      if (j > 0) limb(kit, corner(ax, az, y), corner(bx, bz, y), 0.022, 0.022, BRACE, { delay, noInk: true });
      if (j === LEVELS.length - 1) return;
      const up = LEVELS[j + 1];
      limb(kit, corner(ax, az, y), corner(bx, bz, up), 0.016, 0.016, BRACE, { delay, noInk: true });
      limb(kit, corner(bx, bz, y), corner(ax, az, up), 0.016, 0.016, BRACE, { delay, noInk: true });
    });
  });
  // The platform he stands on, on the front face.
  box(1.4, 0.06, 0.36, STEEL, PX, G + 0.9, PZ + half(0.9) + 0.12, { delay: 0.45 });
  const insulator = (x: number, y: number, z: number, delay: number) => {
    for (let k = 0; k < 4; k++) cylinder(0.07, 0.07, 0.04, 0x9fdfff, x, y - 0.1 - k * 0.08, z, { delay: delay + k * 0.02 }, 10);
    return [x, y - 0.38, z] as Point;
  };
  box(2.6, 0.1, 0.12, STEEL, PX, G + 3.6, PZ, { delay: 0.5 });
  box(1.8, 0.1, 0.12, STEEL, PX, G + 4.05, PZ, { delay: 0.55 });
  const live = insulator(PX + 1.2, G + 3.6, PZ, 0.6);
  const other = insulator(PX - 1.2, G + 3.6, PZ, 0.6);
  const high = insulator(PX + 0.8, G + 4.05, PZ, 0.65);
  // The lines run off behind the pylon, to the edge of the base.
  [live, other, high].forEach((p, i) => cable(kit, [p, [p[0], p[1] - 0.12, PZ - 0.55], [p[0], p[1] - 0.05, -1.5 - (i === 1 ? 0 : 0.5)]], 0.014, INK, 0.7 + i * 0.03));

  // Tensione, in navy work clothes, leather harness, yellow gloves and boots.
  const HT = 2.35;
  const u = HT / 2.4;
  const Y = G + 0.96;
  const sparky = figure(kit, {
    x: -0.3,
    z: -0.14,
    y: Y,
    facing: 0.3,
    height: HT,
    build: "normal",
    skin: 0xd8a888,
    hair: { style: "wild", color: 0x16121c },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "shirt", color: NAVY },
    bottom: { kind: "trousers", color: NAVY },
    shoes: YELLOW,
    gloves: YELLOW,
    belt: LEATHER,
    arms: [[-0.45, 2.0, 0.15], [0.95, 1.8, 0.35]],
    legs: "wide",
    delay: 0.9,
  });
  [-1, 1].forEach((side) => {
    const ankle: Point = [side * 0.34 * u, 0.12 * u, 0];
    const top: Point = [side * 0.31 * u, 0.36 * u, 0.015];
    limb(kit, sparky.at(...ankle), sparky.at(...top), 0.12 * u, 0.125 * u, YELLOW, { delay: 1.1 });
  });
  const torso = sparky.parts[7];
  decorate(torso, new BoxGeometry(0.06, 0.66 * u, 0.02), LEATHER, [
    [-0.15 * u, 0.36 * u, 0.25],
    [0.15 * u, 0.36 * u, 0.25],
  ]);
  decorate(torso, new TorusGeometry(0.035, 0.01, 6, 12), LINK, [[-0.15 * u, 0.5 * u, 0.27]]);
  const pouch = box(0.2, 0.22, 0.12, LEATHER, ...sparky.at(-0.36, 0.82, 0.12), { delay: 1.3, rotation: [0, 0.3, 0] });
  decorate(pouch, new CylinderGeometry(0.02, 0.02, 0.12, 6), YELLOW, [
    [-0.05, 0.26, 0],
    [0.04, 0.27, 0.01],
  ]);

  // The chain from his belt, through his right hand, to the pylon's leg.
  const chain = (from: Point, to: Point, n: number, delay: number) => {
    const { rotation } = aim(from, to);
    for (let k = 0; k <= n; k++) {
      const p = [0, 1, 2].map((i) => from[i] + ((to[i] - from[i]) * k) / n) as Point;
      add(new TorusGeometry(0.035, 0.011, 5, 10).rotateY(k % 2 ? Math.PI / 2 : 0), LINK, ...p, { delay: delay + k * 0.02, rotation });
    }
  };
  const [grip, zap] = sparky.hands;
  chain(sparky.at(-0.2, 1.0, 0.2), grip, 7, 1.5);
  chain(grip, corner(-1, 1, 2.9), 6, 1.6);

  // The current: arcs from his left glove to the line and into the night, crawling up his arm.
  const bolts = (seed: number) => [
    ...zigzag(kit, jag(zap, live, 6, 0.12, seed), 0.05, CYAN, 1.8),
    ...zigzag(kit, jag(zap, [1.75, G + 1.7, 0.55], 5, 0.14, seed + 1), 0.045, 0xeefcff, 1.85),
    ...zigzag(kit, jag(zap, [1.55, G + 2.9, 0.4], 5, 0.12, seed + 2), 0.04, CYAN, 1.9),
    ...zigzag(kit, jag(zap, [1.35, G + 2.1, -0.4], 4, 0.1, seed + 3), 0.035, 0xeefcff, 1.95),
  ];
  const boltsA = bolts(1);
  const boltsB = bolts(4);
  const arm = zigzag(kit, crawl([sparky.at(0.4 * u, 1.72 * u, 0), sparky.elbows[1], zap], 3, 0.07, 0), 0.025, 0xeefcff, 1.95);

  // On the ground: the smoking phone and the toolbox with the melted tester.
  const phone = box(0.22, 0.035, 0.38, INK, 0.95, G, 1.0, { delay: 0.6, rotation: [0, 0.5, 0] });
  decorate(phone, new BoxGeometry(0.18, 0.005, 0.32), 0x2a2a30, [[0, 0.036, 0]]);
  decorate(phone, new BoxGeometry(0.012, 0.006, 0.16).rotateY(0.5), 0xdff6ff, [[0.03, 0.038, 0.05]]);
  decorate(phone, new BoxGeometry(0.012, 0.006, 0.12).rotateY(-0.7), 0xdff6ff, [[-0.02, 0.038, -0.06]]);
  decorate(phone, new BoxGeometry(0.05, 0.006, 0.05), ORANGE, [[0.05, 0.038, -0.1]]);
  add(new CylinderGeometry(0.34, 0.34, 0.004, 14), 0x151419, 0.95, G, 1.0, { delay: 0.55, flat: true, noInk: true });
  motes(10, 0x7a7888, 0.06, [0.85, G + 0.05, 0.9], [1.05, G + 1.6, 1.1], 1.0);
  const tool = box(0.5, 0.22, 0.28, 0x2f6f86, -1.25, G, 0.85, { delay: 0.6, rotation: [0, 0.3, 0] });
  decorate(tool, new BoxGeometry(0.46, 0.012, 0.24), 0x16323e, [[0, 0.222, 0]]);
  box(0.5, 0.26, 0.03, 0x2f6f86, -1.29, G + 0.22, 0.72, { delay: 0.65, rotation: [-0.5, 0.3, 0] });
  const tester = box(0.14, 0.2, 0.06, YELLOW, -1.2, G + 0.2, 0.88, { delay: 0.7, rotation: [0.3, 0.3, 0.5] });
  decorate(tester, new BoxGeometry(0.1, 0.06, 0.01), 0x1a1a1e, [[0, 0.14, 0.031]]);
  decorate(tester, new BoxGeometry(0.06, 0.06, 0.012), 0x2a1a14, [[0.02, 0.04, 0.031, 0.4]]);
  motes(5, 0x5a5868, 0.03, [-1.3, G + 0.3, 0.8], [-1.1, G + 1.0, 0.95], 1.1);

  tick((t) => {
    const k = Math.floor(t * 11);
    const flip = k % 4 === 3;
    boltsA.forEach((part) => (part.visible = !flip));
    boltsB.forEach((part) => (part.visible = flip));
    arm.forEach((part, i) => (part.visible = (k + i) % 5 !== 4));
  });

  return { width: 4.9, height: 4.7, lookY: 2.05 };
}
