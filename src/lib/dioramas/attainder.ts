import { BoxGeometry, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Attainder (P116): before the office towers and smoking chimneys of the Compagnia Lete, the
 * executor of decrees in his black gown holds up a sealed decree, red tape swirling round him; in
 * front of him the man he has named is crumbling into scraps of paper, and the badge with his name
 * peels off his chest and flies into the decree.
 */
export function attainder(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const PAPER = 0xd8ccb0;
  const SHADE = 0x26302a;
  const F = octagonBase(kit, 0x1d1a22);
  const G = floor(kit, F, 0.06, 0x2c2a33, 0x1e1c24, 0.5);

  // The Company's towers, lit, and the factory chimneys smoking behind.
  [
    [-1.35, -1.05, 0.95, 3.5, 0.5],
    [-0.45, -1.6, 0.75, 2.9, 0.3],
  ].forEach(([x, z, w, h, turn], i) => {
    const tower = box(w, h, 0.55, 0x24302c, x, G, z, { delay: 0.1 + i * 0.06, ink: 1.02, rotation: [0, turn, 0] });
    const windows: Point[] = [];
    for (let r = 0; r < Math.floor((h - 0.3) / 0.28); r++) for (let c = 0; c < 3; c++) if ((r * 3 + c * 5 + i) % 4) windows.push([(c - 1) * w * 0.3, 0.25 + r * 0.28, 0.28]);
    decorate(tower, new BoxGeometry(w * 0.18, 0.14, 0.01), i ? CYAN : YELLOW, windows);
    ball(0.05, MAGENTA, x, G + h, z, { delay: 0.3, flat: true, noInk: true });
  });
  const puffs = [
    [0.95, -1.55, 2.6],
    [1.45, -1.15, 3.0],
    [1.85, -0.6, 2.4],
  ].map(([x, z, h], i) => {
    cylinder(0.12, 0.17, h, 0x2a2a30, x, G, z, { delay: 0.2 + i * 0.05 }, 10);
    ball(0.05, MAGENTA, x, G + h, z, { delay: 0.35, flat: true, noInk: true });
    return [0, 1].map((k) => ({ part: ball(0.16 + k * 0.05, 0x4a5a4e, x, G + h + 0.1, z, { delay: 0.5 + i * 0.05, noInk: true }), x, z, base: G + h + 0.1, phase: i * 0.3 + k * 0.5 }));
  });
  box(1.4, 0.9, 0.5, 0x2a2a30, 1.35, G, -1.2, { delay: 0.18, rotation: [0, -0.6, 0] });

  // Attainder: tall, grey hair combed back, a black gown over his suit, reading the decree aloud.
  const judge = figure(kit, {
    x: -0.3,
    z: -0.15,
    y: G,
    facing: 0.3,
    height: 2.6,
    skin: 0xb8b0a0,
    hair: { style: "short", color: 0x6e706c },
    face: { mouth: "frown", brows: "calm", marks: 0x8a8478 },
    top: { kind: "suit", color: 0x1f2a26, accent: 0xe8e4da, tie: INK },
    bottom: { kind: "trousers", color: 0x1a221e },
    cape: 0x161e1a,
    shoes: 0x14121c,
    arms: [
      [-0.38, 1.5, 0.45],
      [0.38, 1.5, 0.45],
    ],
    delay: 0.7,
  });
  // The decree, held out to us: blank lines, a wax seal, two rollers.
  const decreeAt = judge.at(0, 1.2, 0.5);
  const decree = box(0.78, 0.62, 0.02, PAPER, ...decreeAt, { delay: 1.3, rotation: [-0.12, 0.3, 0] });
  decorate(
    decree,
    new BoxGeometry(0.5, 0.012, 0.01),
    0x8a7e68,
    Array.from({ length: 6 }, (_, k) => [-0.06, 0.12 + k * 0.075, 0.012] as Point),
  );
  decorate(decree, new CylinderGeometry(0.07, 0.07, 0.02, 14).rotateX(Math.PI / 2), MAGENTA, [[0.26, 0.12, 0.02]]);
  decorate(decree, new BoxGeometry(0.04, 0.16, 0.01), MAGENTA, [
    [0.24, 0.02, 0.022, 0.2],
    [0.29, 0.02, 0.022, -0.2],
  ]);
  [0, 0.6].forEach((y) => decorate(decree, new CylinderGeometry(0.035, 0.035, 0.86, 10).rotateZ(Math.PI / 2), 0xc8bca0, [[0, y + 0.01, 0]]));

  // The man he named, a shadow already, crumbling from one side.
  const named = figure(kit, {
    x: 1.2,
    z: 0.55,
    y: G,
    facing: -0.8,
    height: 2.25,
    skin: SHADE,
    face: { blank: true },
    hair: { style: "short", color: 0x1e2620 },
    top: { kind: "shirt", color: SHADE },
    bottom: { kind: "trousers", color: SHADE },
    shoes: SHADE,
    arms: ["down", [0.45, 1.25, 0.25]],
    delay: 1,
  });
  [4, 5, 15, 16, 17].forEach((k) => (named.parts[k].visible = false));
  // Where he is already gone, the edge breaks into scraps.
  for (let k = 0; k < 12; k++) box(0.07, 0.07, 0.07, SHADE, ...named.at(0.2 + ((k * 5) % 4) * 0.08, 0.15 + k * 0.13, ((k * 3) % 3) * 0.06 - 0.06), { delay: 1.3 + k * 0.02, rotation: [k, k * 2, k * 0.5] });
  const flakes = Array.from({ length: 18 }, (_, k) => {
    const from = named.at(0.25 + ((k * 7) % 5) * 0.06, 0.2 + ((k * 11) % 9) * 0.2, ((k * 3) % 5) * 0.05 - 0.1);
    return { part: box(0.09, 0.09, 0.008, k % 3 ? PAPER : SHADE, ...from, { delay: 1.4 + k * 0.02, noInk: true }), from, phase: k / 18 };
  });
  // His name badge peels off and flies into the decree.
  const badgeFrom = named.at(-0.1, 1.55, 0.24);
  const badge = box(0.16, 0.1, 0.015, 0xf4f0e6, ...badgeFrom, { delay: 1.6, rotation: [0, -0.2, 0] });
  decorate(badge, new BoxGeometry(0.16, 0.03, 0.01), MAGENTA, [[0, 0.085, 0.01]]);
  const badgeTo: Point = [decreeAt[0] + 0.2, decreeAt[1] + 0.2, decreeAt[2] + 0.1];

  // Red tape swirling round them.
  const tapes = [
    [0.45, 1.8, 0.2],
    [1.0, 1.95, -0.15],
    [3.05, 1.6, 0.12],
  ].map(([y, r, tilt], k) =>
    add(new TorusGeometry(r, 0.018, 5, 48, 3.6).rotateX(Math.PI / 2), MAGENTA, 0, G + y, -0.1, { delay: 1.8 + k * 0.05, flat: true, noInk: true, rotation: [tilt, k * 2, 0] }),
  );

  tick((t) => {
    tapes.forEach((tape, k) => (tape.rotation.y = k * 2 + t * (k % 2 ? -0.5 : 0.4)));
    flakes.forEach(({ part, from, phase }, k) => {
      const u = (t / 3.5 + phase) % 1;
      part.position.set(from[0] + u * 0.4, from[1] + u * 0.9 + Math.sin(u * 6 + k) * 0.08, from[2] - u * 0.4);
      part.rotation.set(u * 6 + k, u * 4, k);
      part.visible = u < 0.92;
    });
    const v = (t / 4 + 0.45) % 1;
    const e = v < 0.7 ? v / 0.7 : 1;
    badge.position.set(badgeFrom[0] + (badgeTo[0] - badgeFrom[0]) * e, badgeFrom[1] + (badgeTo[1] - badgeFrom[1]) * e + Math.sin(e * Math.PI) * 0.5, badgeFrom[2] + (badgeTo[2] - badgeFrom[2]) * e);
    badge.rotation.z = e * 4;
    badge.visible = v < 0.8;
    puffs.flat().forEach(({ part, x, z, base, phase }) => {
      const u = (t / 4 + phase) % 1;
      part.position.set(x + u * 0.3, base + u * 0.6, z);
      part.children[0].scale.setScalar(0.6 + u * 0.8);
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.75 };
}
