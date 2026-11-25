import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { ORANGE, aim, archMouth, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Principal (P181): through the flooded marble hall of the Banco walks the ledger of debts, a
 * giant of riveted leather and brass book covers glowing at the seams. Its chest opens like a
 * ledger and a page turns, as it comes to collect; a clerk runs off with his papers, sheets fly.
 * It is slow and it cannot sneak: every step splashes loudly and leaves a wet print behind.
 */
export function principal(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const LEATHER = 0x8a2a36;
  const BRASS = 0x8a6a3a;
  const DARK = 0x3a2a2a;
  const PAGE = 0xe8e0c8;
  const WATER = 0x1e4a5e;
  const F = octagonBase(kit, 0x1c1a22);
  const G = floor(kit, F, 0.06, 0x2c2a36, 0x1e1c26, 0.45);

  // Checkered marble: the light squares.
  const squares: Point[] = [];
  for (let i = -5; i <= 4; i++)
    for (let j = -5; j <= 4; j++) {
      const [x, z] = [i * 0.45 + 0.225, j * 0.45 + 0.225];
      if ((i + j) % 2 === 0 && Math.abs(x) + Math.abs(z) < 2.9 && Math.abs(x) < 2.0 && Math.abs(z) < 2.0) squares.push([x, 0.002, z]);
    }
  const marble = box(0.001, 0.001, 0.001, 0x46425a, 0, G, 0, { delay: 0.08, flat: true, noInk: true });
  decorate(marble, new BoxGeometry(0.44, 0.004, 0.44), 0x46425a, squares);

  // The hall's back wall with its tall arched windows.
  const wall = box(2.8, 3.1, 0.2, 0x2e2a3a, -0.1, G, -1.62, { delay: 0.1, ink: 1.02 });
  [-0.75, 0.55].forEach((x) => {
    decorate(wall, archMouth(0.42, 1.5), 0x8fc8da, [[x, 0.55, 0.1]]);
    decorate(wall, new BoxGeometry(0.035, 1.9, 0.03), 0x23222b, [[x, 1.5, 0.13]]);
    decorate(wall, new BoxGeometry(0.84, 0.035, 0.03), 0x23222b, [
      [x, 1.1, 0.13],
      [x, 1.6, 0.13],
    ]);
  });
  // A clerk's desk with its lamp.
  const desk = table(kit, 1.45, -0.55, G, 0.2, false, 0x4a3028);
  decorate(desk, new BoxGeometry(0.3, 0.06, 0.22), PAGE, [[-0.2, 0.06, 0.05]]);
  cylinder(0.025, 0.06, 0.32, BRASS, 1.65, G + 0.8, -0.65, { delay: 0.35 }, 8);
  add(new CylinderGeometry(0.06, 0.16, 0.1, 12, 1, true), 0x2f6a4a, 1.65, G + 1.08, -0.65, { delay: 0.38 });
  box(0.1, 0.05, 0.1, ORANGE, 1.65, G + 1.05, -0.65, { delay: 0.4, flat: true, noInk: true });

  // The flood on the floor, round its feet.
  const [cx, cz] = [0.15, -0.1];
  add(new CylinderGeometry(1.05, 1.05, 0.006, 28).scale(1, 1, 0.75), WATER, cx + 0.1, G + 0.004, cz + 0.2, { delay: 0.2, flat: true, noInk: true });
  [
    [-0.55, 0.95, 0.3],
    [-0.15, 1.35, 0.3],
  ].forEach(([x, z, turn], i) => add(new CylinderGeometry(0.13, 0.13, 0.006, 12).scale(0.75, 1, 1.4), WATER, cx + x, G + 0.006, cz + z - 2.2, { delay: 0.25 + i * 0.03, flat: true, noInk: true, rotation: [0, turn, 0] }));

  // Principal: a giant of book covers, one stride forward.
  const theta = 0.3;
  const L = (x: number, y: number, z: number): Point => [cx + x * Math.cos(theta) + z * Math.sin(theta), G + y, cz - x * Math.sin(theta) + z * Math.cos(theta)];
  const turn: Point = [0, theta, 0];
  const block = (from: Point, to: Point, w: number, color: number, delay: number) => add(new BoxGeometry(w, aim(from, to).length, w), color, ...from, { delay, rotation: aim(from, to).rotation });
  const seams: ReturnType<typeof decorate>[] = [];
  const legs: [Point, Point, Point, number][] = [
    [L(0.2, 1.36, 0), L(0.21, 0.76, 0.2), L(0.2, 0.15, 0.32), 0],
    [L(-0.2, 1.36, 0), L(-0.21, 0.8, -0.14), L(-0.2, 0.22, -0.34), -0.4],
  ];
  legs.forEach(([hip, knee, ankle, heel], i) => {
    const thigh = block(knee, hip, 0.34, i ? BRASS : LEATHER, 0.5 + i * 0.04);
    const shin = block(ankle, knee, 0.3, i ? LEATHER : BRASS, 0.45 + i * 0.04);
    seams.push(decorate(thigh, new BoxGeometry(0.35, 0.025, 0.35), ORANGE, [[0, 0.3, 0]]));
    seams.push(decorate(shin, new BoxGeometry(0.31, 0.025, 0.31), ORANGE, [[0, 0.32, 0]]));
    box(0.32, 0.16, 0.48, DARK, ankle[0], ankle[1] - 0.15, ankle[2], { delay: 0.4 + i * 0.04, rotation: [heel, theta, 0] });
  });
  box(0.72, 0.3, 0.42, DARK, ...L(0, 1.22, 0), { delay: 0.6, rotation: turn });
  const torso = box(0.92, 0.88, 0.52, LEATHER, ...L(0, 1.5, 0), { delay: 0.65, rotation: turn });
  decorate(torso, new BoxGeometry(0.44, 0.42, 0.02), BRASS, [
    [-0.23, 0.22, 0.25],
    [0.23, 0.66, 0.25],
    [0.465, 0.22, 0],
  ]);
  seams.push(decorate(torso, new BoxGeometry(0.93, 0.025, 0.53), ORANGE, [[0, 0.44, 0]]));
  decorate(torso, new BoxGeometry(0.03, 0.03, 0.01), 0x1a140c, [
    [-0.4, 0.05, 0.262],
    [0.4, 0.05, 0.262],
    [-0.4, 0.83, 0.262],
    [0.4, 0.83, 0.262],
  ]);
  // Its chest is a ledger: pages inside, a cover that opens, one page turning.
  const pages = box(0.6, 0.58, 0.06, PAGE, ...L(0, 1.65, 0.28), { delay: 0.8, rotation: turn });
  decorate(pages, new BoxGeometry(0.46, 0.012, 0.01), 0x8a7a68, Array.from({ length: 8 }, (_, k) => [0.02, 0.08 + k * 0.06, 0.031] as Point));
  decorate(pages, new BoxGeometry(0.012, 0.5, 0.01), 0x9a2a38, [[-0.16, 0.29, 0.032]]);
  const hinge = L(-0.31, 1.64, 0.33);
  const cover = add(new BoxGeometry(0.62, 0.62, 0.04).translate(0.31, 0, 0), BRASS, ...hinge, { delay: 0.85, rotation: [0, theta - 0.9, 0] });
  decorate(cover, new BoxGeometry(0.4, 0.4, 0.01), LEATHER, [[0.31, 0.31, 0.021]]);
  const leaf = add(new BoxGeometry(0.58, 0.56, 0.01).translate(0.29, 0, 0), 0xf4f0e2, ...L(-0.3, 1.66, 0.32), { delay: 0.9, rotation: turn });
  // Shoulders, arms swinging, blocky fists.
  [-1, 1].forEach((side, i) => {
    box(0.36, 0.34, 0.4, side < 0 ? BRASS : LEATHER, ...L(side * 0.6, 2.06, 0), { delay: 0.7 + i * 0.03, rotation: turn });
    const swing = side * 0.18;
    const elbow = L(side * 0.66, 1.5, swing);
    const fist = L(side * 0.64, 0.98, swing * 1.8 + 0.1);
    const upper = block(elbow, L(side * 0.62, 2.06, 0), 0.26, side < 0 ? LEATHER : BRASS, 0.75 + i * 0.03);
    block(fist, elbow, 0.24, side < 0 ? BRASS : LEATHER, 0.78 + i * 0.03);
    box(0.26, 0.26, 0.26, DARK, fist[0], fist[1] - 0.2, fist[2], { delay: 0.8 + i * 0.03, rotation: turn });
    seams.push(decorate(upper, new BoxGeometry(0.27, 0.025, 0.27), ORANGE, [[0, 0.04, 0]]));
  });
  // The head: a brass block with a carved, stern face and burning eye slits.
  box(0.2, 0.14, 0.2, DARK, ...L(0, 2.36, 0), { delay: 0.9, rotation: turn });
  const head = box(0.44, 0.52, 0.42, BRASS, ...L(0, 2.47, 0.02), { delay: 0.95, rotation: turn });
  decorate(head, new BoxGeometry(0.4, 0.05, 0.04), 0x5a4426, [[0, 0.36, 0.215]]);
  seams.push(decorate(head, new BoxGeometry(0.11, 0.035, 0.01), ORANGE, [
    [-0.1, 0.3, 0.212],
    [0.1, 0.3, 0.212],
  ]));
  decorate(head, new BoxGeometry(0.07, 0.16, 0.05), 0x6a5030, [[0, 0.2, 0.22]]);
  decorate(head, new BoxGeometry(0.18, 0.025, 0.01), 0x2a1e14, [[0, 0.08, 0.212]]);
  decorate(head, new BoxGeometry(0.22, 0.52, 0.01), LEATHER, [[0.0, 0.26, -0.212]]);

  // Splashes at its front foot, ripples, and a ring of noise as it steps.
  const front = legs[0][2];
  const splash = [-0.6, 0, 0.6].map((a, i) => add(new ConeGeometry(0.035, 0.24, 5), 0xbfe8f0, front[0] + Math.sin(theta + a) * 0.26, G, front[2] + Math.cos(theta + a) * 0.26, { delay: 1.1 + i * 0.03, flat: true, rotation: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5] }));
  const ripple = add(new TorusGeometry(0.3, 0.015, 6, 32).rotateX(Math.PI / 2), 0xbfe8f0, front[0], G + 0.01, front[2], { delay: 1.15, flat: true, noInk: true });

  // The clerk running away with his papers; sheets flying.
  const clerk = figure(kit, {
    x: -1.35,
    z: 0.75,
    y: G,
    facing: -0.55,
    height: 2.25,
    build: "slim",
    skin: 0xe0b896,
    hair: { style: "short", color: 0x2a1e1c },
    face: { mouth: "open", brows: "worried", glasses: "round" },
    top: { kind: "suit", color: 0x2e3446, accent: 0xe8e4dc, tie: 0x8a2a36 },
    bottom: { kind: "trousers", color: 0x2e3446 },
    shoes: 0x1a1820,
    arms: [[-0.3, 2.1, 0.3], "back"],
    legs: "stride",
    delay: 1.2,
  });
  const [held] = clerk.hands;
  box(0.24, 0.3, 0.03, PAGE, held[0], held[1] - 0.05, held[2], { delay: 1.6, rotation: [0.3, -0.55, 0.2] });
  const sheets = [
    [-0.9, 1.6, 0.2],
    [-0.4, 2.3, 0.6],
    [-1.6, 2.6, 0.1],
    [0.9, 2.0, 0.6],
    [-1.0, 0.0, 1.35],
  ].map(([x, y, z], i) => ({ part: box(0.2, 0.005, 0.26, PAGE, x, G + y, z, { delay: 1.7 + i * 0.03, rotation: [0.4, i, 0.3] }), x, y, z, i }));

  const glowFrom = new Color(ORANGE);
  const glowTo = glowFrom.clone().offsetHSL(0.02, 0, 0.15);
  tick((t) => {
    // The seams glow; the ledger opens and shuts and a page turns.
    const k = (Math.sin(t * 2.2) + 1) / 2;
    seams.forEach((seam) => seam.color.lerpColors(glowFrom, glowTo, k));
    const open = 0.9 + 0.25 * Math.sin(t * 0.8);
    cover.rotation.y = theta - open;
    const flip = (t * 0.3) % 1;
    leaf.rotation.y = theta - Math.min(open, flip * 1.6 * open);
    // Each heavy step splashes.
    const step = (t * 0.5) % 1;
    splash.forEach((drop, i) => {
      drop.children[0].scale.set(1, Math.max(0.05, 1 - step * 1.5 + i * 0.1), 1);
      drop.children[1].scale.set(1.06, 1.036 * Math.max(0.05, 1 - step * 1.5 + i * 0.1), 1.06);
    });
    ripple.children[0].scale.set(1 + step * 2.2, 1, 1 + step * 2.2);
    ripple.visible = step < 0.85;
    sheets.forEach(({ part, x, y, z, i }) => {
      if (i === 4) return;
      const u = (t * 0.12 + i * 0.27) % 1;
      part.position.set(x + Math.sin(t * 0.9 + i) * 0.15, G + y + u * 0.5, z + Math.cos(t * 0.7 + i) * 0.1);
      part.rotation.set(0.4 + Math.sin(t + i) * 0.5, i + t * 0.6, 0.3);
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
