import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, OctahedronGeometry, SphereGeometry, Vector3 } from "three";
import { CYAN, YELLOW, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, steps } from "@/lib/diorama-props";

/**
 * Sentinella (P235): the empire's garrison soldier still on guard at the foot of a Lete glass
 * tower, between two old columns. Bronze helmet and cuirass over a purple robe, his spear's head
 * crackling with lightning; nobody ever came to relieve him. A vine has climbed his spear, the
 * column beside him is scratched with tallies of the days, the bronze plate where his relief
 * should stand is empty and sprouting weeds, and now and then his head drops and snaps back up.
 */
export function sentinella(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const BRONZE = 0xb08a3a;
  const BRONZE_DARK = 0x7a5a28;
  const PURPLE = 0x4e3570;
  const GLASS = 0x18243a;
  const LEAF = 0x2f8f4f;
  const F = octagonBase(kit, 0x24202e);
  const G = floor(kit, F, 0.06, 0x3a3648, 0x2a2636, 0.6);

  // The Lete tower: a glass front lit late at night, a lit door at the top of three steps.
  const tower = box(2.6, 3.7, 0.3, GLASS, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  const lit: Point[] = [];
  const dark: Point[] = [];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 6; c++) ((r * 7 + c * 5) % 3 === 0 ? lit : dark).push([-1.05 + c * 0.42, 0.95 + r * 0.4, 0.151]);
  decorate(tower, new BoxGeometry(0.34, 0.32, 0.01), YELLOW, lit);
  decorate(tower, new BoxGeometry(0.34, 0.32, 0.01), 0x22344e, dark);
  decorate(tower, new BoxGeometry(0.66, 0.86, 0.01), 0x5fd0f0, [[0, 0.43, 0.151]]);
  decorate(tower, new BoxGeometry(0.03, 0.86, 0.02), GLASS, [[0, 0.43, 0.155]]);
  const late = [
    [-0.21, 2.15],
    [1.05, 3.35],
  ].map(([x, y], k) => box(0.34, 0.32, 0.01, YELLOW, x, G + y - 0.16, -1.594, { delay: 0.3 + k * 0.05, flat: true, noInk: true }));
  steps(kit, 0, -0.98, G, 0.2, { width: 1.5, count: 3, tread: 0.2, rise: 0.1, color: 0x4a4658 });
  column(kit, -1.25, -0.75, G, 0.3, 2.9, false, 0x8a8cb0);
  const right = column(kit, 1.3, -0.8, G, 0.34, 2.9, false, 0x8a8cb0);
  // Tallies of the days scratched into the column by the door.
  const tallies: [number, number, number, number][] = [];
  for (let g = 0; g < 6; g++) {
    const y = 0.55 + g * 0.22;
    for (let k = 0; k < 4; k++) tallies.push([-0.1 + k * 0.04, y, 0.19, 0]);
    tallies.push([-0.04, y, 0.2, 1.1]);
  }
  decorate(right[1], new BoxGeometry(0.016, 0.16, 0.01), 0xe8e2d0, tallies);

  // The plate where his relief should stand: empty, dusty, sprouting weeds.
  const plate = cylinder(0.38, 0.4, 0.04, BRONZE_DARK, 0.85, G, 0.25, { delay: 0.4 }, 8);
  decorate(plate, new BoxGeometry(0.12, 0.006, 0.26), 0x3e2c1a, [
    [-0.1, 0.042, 0.02],
    [0.1, 0.042, -0.02],
  ]);
  decorate(plate, new BoxGeometry(0.07, 0.006, 0.05), 0x6a4a2a, [
    [0.2, 0.043, 0.15, 0],
    [-0.18, 0.043, -0.2, 0],
    [0.05, 0.043, 0.25, 0],
  ]);
  [
    [0.62, 0.1],
    [1.05, 0.38],
    [0.78, 0.48],
  ].forEach(([x, z], i) => add(new ConeGeometry(0.04, 0.16, 5), LEAF, x, G + 0.04, z, { delay: 0.45 + i * 0.03, rotation: [0.2 * (i - 1), 0, 0.3 * (1 - i)] }));

  // Sentinella: bronze helmet, a purple robe and cloak, at attention with his spear.
  const facing = 0.3;
  const guard = figure(kit, {
    x: -0.45,
    z: 0.2,
    y: G,
    facing,
    height: 2.5,
    build: "broad",
    skin: 0xc89474,
    hair: { style: "short", color: 0x3a3a40 },
    face: { mouth: "neutral", brows: "calm", marks: 0x9a6a50 },
    headwear: { kind: "helmet", color: BRONZE, accent: BRONZE_DARK },
    top: { kind: "robe", color: PURPLE },
    cape: 0x3e2a5c,
    scarf: 0x5a3f80,
    arms: [[-0.5, 1.4, 0.26], "down"],
    delay: 0.8,
  });
  const u = 2.5 / 2.4;
  const hip = 1.08 * u;
  const shoulders = 1.72 * u;
  const o = (wait: number, tilt: [number, number] = [0, 0]) => ({ delay: 1.2 + wait, rotation: [tilt[0], facing, tilt[1]] as [number, number, number] });
  // The cuirass, the leather strips below it, the shoulder guards.
  const cuirass = add(new CylinderGeometry(0.505, 0.42, shoulders - hip + 0.02, 18).scale(1, 1, 0.8), BRONZE, ...guard.at(0, hip - 0.02, 0), o(0));
  decorate(cuirass, new BoxGeometry(0.03, 0.5, 0.02), BRONZE_DARK, [[0, 0.36, 0.385]]);
  decorate(cuirass, new BoxGeometry(0.2, 0.025, 0.02), BRONZE_DARK, [
    [-0.12, 0.5, 0.39, -0.25],
    [0.12, 0.5, 0.39, 0.25],
  ]);
  [-1.1, -0.72, -0.36, 0, 0.36, 0.72, 1.1].forEach((a, i) =>
    add(new BoxGeometry(0.11, 0.34, 0.04), i % 2 ? 0x5a3a28 : 0x6a4630, ...guard.at(Math.sin(a) * 0.4, hip - 0.36, Math.cos(a) * 0.33), {
      delay: 1.25 + i * 0.01,
      rotation: [0, facing + a, 0],
    }),
  );
  [-1, 1].forEach((side) =>
    add(new SphereGeometry(0.23, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), BRONZE, ...guard.at(side * 0.52, shoulders - 0.12, 0), o(0.1, [0, side * -0.35])),
  );
  [-1, 1].forEach((side) =>
    add(new BoxGeometry(0.05, 0.18, 0.12), BRONZE, ...guard.at(side * 0.19, guard.head[1] - G - 0.2, 0.12), o(0.15, [0, side * 0.15])),
  );

  // The spear, a vine climbing it, its head crackling.
  const hand = guard.hands[0];
  const shaft = cylinder(0.035, 0.035, 3.1, 0x3a2a22, hand[0], G, hand[2], { delay: 1.3 }, 8);
  decorate(
    shaft,
    new SphereGeometry(0.05, 6, 4).scale(1, 0.5, 1.6),
    LEAF,
    Array.from({ length: 14 }, (_, k) => [Math.cos(k * 1.3) * 0.06, 0.08 + k * 0.085, Math.sin(k * 1.3) * 0.06, k * 0.7] as [number, number, number, number]),
  );
  cylinder(0.05, 0.04, 0.12, BRONZE, hand[0], G + 3.1, hand[2], { delay: 1.35 }, 8);
  const tip: Point = [hand[0], G + 3.22, hand[2]];
  add(new OctahedronGeometry(0.1).scale(0.85, 3.6, 0.35), YELLOW, ...tip, { delay: 1.4, flat: true });
  const bolts = [0, 1].map((set) =>
    [0, 1, 2, 3].flatMap((k) => {
      const a = k * 1.7 + set * 0.9;
      const from: Point = [tip[0], tip[1] + 0.12 + k * 0.12, tip[2]];
      const to: Point = [tip[0] + Math.cos(a) * 0.55, from[1] + 0.2 - k * 0.12, tip[2] + Math.sin(a) * 0.35];
      return zigzag(kit, jag(from, to, 5, 0.06, k + set * 3), 0.026, k === 1 ? CYAN : YELLOW, 1.5);
    }),
  );

  // His head nods off now and then, and snaps back up.
  const neck = new Vector3(...guard.at(0, 1.84 * u, 0));
  const nodders = guard.parts.filter((part) => part.position.y > guard.head[1] - guard.headRadius * 1.3);
  const head = new Group();
  head.position.copy(neck);
  nodders[0].parent?.add(head);
  nodders.forEach((part) => {
    part.position.sub(neck);
    head.add(part);
  });
  const axis = new Vector3(Math.cos(facing), 0, -Math.sin(facing));

  tick((t) => {
    const flick = Math.floor(t * 11) % 2;
    bolts[0].forEach((bolt) => (bolt.visible = flick === 0));
    bolts[1].forEach((bolt) => (bolt.visible = flick === 1));
    const p = t % 6;
    const nod = p < 3.4 ? 0.26 * (p / 3.4) ** 2 : p < 3.6 ? 0.26 * (1 - (p - 3.4) / 0.2) : 0;
    head.quaternion.setFromAxisAngle(axis, nod);
    late[0].visible = t % 7 < 5;
    late[1].visible = (t + 3) % 9 < 6;
  });

  return { width: 4.9, height: 4.6, lookY: 1.65 };
}
