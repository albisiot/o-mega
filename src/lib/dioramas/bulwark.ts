import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from "three";
import {
  YELLOW,
  CYAN,
  INK,
  colorOf,
  octagonBase,
  archMouth,
  limb,
  cable,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** A wall with a row of arches cut out of its foot, centred on x = 0 and facing +z: a portico. */
function arcade(width: number, height: number, depth: number, arches: number[], half: number, spring: number): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  for (const x of arches) {
    shape.lineTo(x - half, 0);
    shape.lineTo(x - half, spring);
    shape.absarc(x, spring, half, Math.PI, 0, true);
    shape.lineTo(x + half, 0);
  }
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, -depth / 2);
}

/** Where a thrown thing is along its flight, `u` from 0 to 1: in to the shield, then off it to the ground. */
function flight(from: Point, hit: Point, land: Point, u: number, bounces: boolean): Point | null {
  const arc = (a: Point, b: Point, k: number, rise: number): Point => [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k + rise * 4 * k * (1 - k),
    a[2] + (b[2] - a[2]) * k,
  ];
  if (u < 0.5) return arc(from, hit, u / 0.5, 0.35);
  if (bounces && u < 0.85) return arc(hit, land, (u - 0.5) / 0.35, 0.45);
  return null;
}

/**
 * Bulwark (P025): the Custodi's riot officer holds the piazza in front of the town hall at night,
 * planted behind her big dented shield, patched with tape, while tomatoes and slippers fly in and
 * bounce off it. The price of never hiding shows: the street lamp bends right over her and puts
 * her in its pool of light, a sprig of leaves stuck on her helmet is all her camouflage, and the
 * only cover around is a potted bush that reaches her knees.
 */
export function bulwark(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SLAB = 0x2c2f3b;
  const JOINT = 0x1d1f28;
  const POOL = 0x5a4a1e;
  const PLASTER = 0x7a3659;
  const TRIM = 0xa8577f;
  const SHADE = 0x1a0f1c;
  const WOOD = 0x3e2a2a;
  const SHUTTER = 0x1f6a74;
  const PAPER = 0xe8e2d4;
  const CLOCK = 0xf2e4b0;
  const IRON = 0x1c1c24;
  const ARMOR = 0x24405a;
  const ARMOR_DARK = 0x1b2a3c;
  const PLATE = 0x2f6f90;
  const HELMET = 0x2c4c6a;
  const VISOR = 0x6fb8d4;
  const STEEL = 0x74859a;
  const STEEL_DARK = 0x4a5768;
  const TAPE = 0xbdbcb2;
  const SKIN = 0xc9926e;
  const SKIN_DARK = 0xa06e50;
  const LIPS = 0xb04a5a;
  const HAIR = 0x1c1418;
  const BOOT = 0x15161c;
  const BATON = 0x2a2a33;
  const LEAF = 0x3c9a5c;
  const TWIG = 0x5a3e2e;
  const POT = 0x7e786e;
  const TOMATO = 0xe2283c;
  const EGG = 0xf2eee2;
  const SOLE = 0xe0d6c2;
  const STRAP = 0xd0306a;

  const F = octagonBase(kit, SLAB);
  const x0 = 0.2;
  const z0 = 0.15;

  // The piazza: big paving slabs, and the lamp's warm pool right where she stands.
  add(new CylinderGeometry(1.05, 1.05, 0.004, 32).scale(1, 1, 0.8), POOL, x0 - 0.15, F, z0 + 0.4, { delay: 0.1, flat: true, noInk: true });
  [-0.45, 0.25, 0.95, 1.65].forEach((z, i) => {
    const half = Math.min(2.15, 3.05 - Math.abs(z));
    box(half * 2, 0.004, 0.025, JOINT, 0, F + 0.004, z, { delay: 0.12 + i * 0.02, flat: true, noInk: true });
  });
  [-1.65, -1.1, -0.55, 0, 0.55, 1.1, 1.65].forEach((x, i) => {
    const far = Math.min(2.15, 3.05 - Math.abs(x));
    box(0.025, 0.004, far + 1, JOINT, x, F + 0.004, (far - 1) / 2, { delay: 0.14 + i * 0.02, flat: true, noInk: true });
  });

  // The town hall: a portico of three arches, the balcony over the door, the clock on top.
  const BZ = -1.3;
  const front = 0.25;
  const arches = [-1.02, 0, 1.02];
  const hall = add(arcade(3.2, 2.5, 0.5, arches, 0.34, 0.78), PLASTER, 0, F, BZ, { delay: 0.2, ink: 1.02 });
  arches.forEach((x, i) => {
    add(new TorusGeometry(0.38, 0.045, 6, 18, Math.PI), TRIM, x, F + 0.78 - 0.045, BZ + front, { delay: 0.3 + i * 0.03, noInk: true });
    add(archMouth(0.34, 0.78), SHADE, x, F, BZ - front + 0.005, { delay: 0.24, flat: true, noInk: true });
  });
  decorate(hall, new BoxGeometry(0.42, 0.06, 0.04), TRIM, [
    [-0.51, 0.78, front + 0.01],
    [0.51, 0.78, front + 0.01],
  ]);
  decorate(hall, new BoxGeometry(0.3, 0.06, 0.04), TRIM, [
    [-1.47, 0.78, front + 0.01],
    [1.47, 0.78, front + 0.01],
  ]);
  // Under the arches: the door with its lit fanlight, the notice board, a barred window still lit.
  const door = box(0.4, 0.62, 0.03, WOOD, 0, F, BZ - front + 0.03, { delay: 0.34, noInk: true });
  decorate(door, new BoxGeometry(0.012, 0.6, 0.01), INK, [[0, 0.31, 0.017]]);
  add(archMouth(0.2, 0), CYAN, 0, F + 0.62, BZ - front + 0.03, { delay: 0.36, flat: true, noInk: true });
  const board = box(0.42, 0.4, 0.04, WOOD, -1.02, F + 0.3, BZ - front + 0.03, { delay: 0.36, noInk: true });
  decorate(board, new BoxGeometry(0.1, 0.13, 0.01), PAPER, [
    [-0.12, 0.27, 0.022, 0.08],
    [0.02, 0.25, 0.022, -0.05],
    [0.14, 0.28, 0.022, 0.12],
    [-0.06, 0.11, 0.022, -0.1],
    [0.1, 0.1, 0.022, 0.04],
  ]);
  const office = box(0.3, 0.34, 0.02, CYAN, 1.02, F + 0.3, BZ - front + 0.02, { delay: 0.36, flat: true, noInk: true });
  decorate(
    office,
    new BoxGeometry(0.018, 0.34, 0.02),
    INK,
    [-0.1, -0.033, 0.033, 0.1].map((x) => [x, 0.17, 0.012] as Point),
  );

  // Upper floor: shuttered windows either side, the French door and balcony in the middle.
  box(3.24, 0.07, 0.07, TRIM, 0, F + 1.3, BZ + front + 0.03, { delay: 0.4, noInk: true });
  box(3.3, 0.12, 0.62, TRIM, 0, F + 2.5, BZ, { delay: 0.42 });
  [-1.02, 1.02].forEach((x) => {
    decorate(hall, new BoxGeometry(0.42, 0.72, 0.02), TRIM, [[x, 1.88, front + 0.005]]);
    decorate(hall, new BoxGeometry(0.06, 0.06, 0.06), TRIM, [[x, 2.27, front + 0.02]]);
  });
  decorate(hall, new BoxGeometry(0.5, 0.06, 0.06), TRIM, [
    [-1.02, 2.27, front + 0.02],
    [1.02, 2.27, front + 0.02],
    [0, 2.3, front + 0.02],
  ]);
  decorate(hall, new BoxGeometry(0.32, 0.6, 0.02), SHADE, [[-1.02, 1.88, front + 0.012]]);
  decorate(hall, new BoxGeometry(0.32, 0.6, 0.02), CYAN, [[1.02, 1.88, front + 0.012]]);
  decorate(hall, new BoxGeometry(0.16, 0.62, 0.02), SHUTTER, [
    [-1.27, 1.88, front + 0.012],
    [-0.77, 1.88, front + 0.012],
    [0.77, 1.88, front + 0.012],
    [1.27, 1.88, front + 0.012],
  ]);
  decorate(hall, new BoxGeometry(0.46, 0.86, 0.02), TRIM, [[0, 1.84, front + 0.005]]);
  decorate(hall, new BoxGeometry(0.34, 0.76, 0.02), CYAN, [[0, 1.82, front + 0.012]]);
  decorate(hall, new BoxGeometry(0.018, 0.76, 0.02), INK, [[0, 1.82, front + 0.016]]);
  const BF = BZ + front;
  box(0.92, 0.06, 0.34, TRIM, 0, F + 1.37, BF + 0.17, { delay: 0.46 });
  for (let k = 0; k < 6; k++) cylinder(0.024, 0.03, 0.2, TRIM, -0.36 + k * 0.144, F + 1.43, BF + 0.29, { delay: 0.5 + k * 0.01, ink: 1.15 }, 8);
  box(0.92, 0.05, 0.07, TRIM, 0, F + 1.63, BF + 0.29, { delay: 0.56 });
  [-1, 1].forEach((side) => box(0.05, 0.05, 0.3, TRIM, side * 0.435, F + 1.63, BF + 0.15, { delay: 0.56 }));
  // The clock in the attic; its hands go round.
  const attic = box(0.9, 0.55, 0.3, PLASTER, 0, F + 2.62, BZ, { delay: 0.5 });
  decorate(attic, new CircleGeometry(0.19, 24), CLOCK, [[0, 0.29, 0.152]]);
  decorate(attic, new TorusGeometry(0.19, 0.022, 6, 28), INK, [[0, 0.29, 0.152]]);
  decorate(
    attic,
    new BoxGeometry(0.02, 0.045, 0.01),
    INK,
    [0, 1, 2, 3].map((k) => [Math.sin((k * Math.PI) / 2) * 0.15, 0.29 + Math.cos((k * Math.PI) / 2) * 0.15, 0.156, (k * Math.PI) / 2] as [number, number, number, number]),
  );
  box(1.02, 0.07, 0.38, TRIM, 0, F + 3.17, BZ, { delay: 0.54 });
  const hub: Point = [0, F + 2.91, BZ + 0.16];
  const hourHand = box(0.026, 0.09, 0.012, INK, ...hub, { delay: 0.6, flat: true, noInk: true });
  const minuteHand = box(0.018, 0.14, 0.012, INK, hub[0], hub[1], hub[2] + 0.005, { delay: 0.62, flat: true, noInk: true });

  // The street lamp: a thin post whose arm bends right over her head.
  const LX = -0.85;
  const LZ = -0.35;
  cylinder(0.1, 0.13, 0.28, IRON, LX, F, LZ, { delay: 0.5 }, 8);
  cylinder(0.026, 0.03, 2.48, IRON, LX, F + 0.28, LZ, { delay: 0.54 }, 8);
  const arm: Point = [x0 - 0.08, F + 2.9, z0 + 0.12];
  cable(kit, [[LX, F + 2.7, LZ], [LX + 0.3, F + 3.0, LZ + 0.15], [x0 - 0.3, F + 3.02, z0 + 0.05], arm], 0.024, IRON, 0.62);
  cylinder(0.012, 0.012, 0.08, IRON, arm[0], F + 2.82, arm[2], { delay: 0.7, noInk: true }, 6);
  cylinder(0.02, 0.13, 0.09, IRON, arm[0], F + 2.73, arm[2], { delay: 0.72 }, 4);
  const lamp = cylinder(0.105, 0.07, 0.18, YELLOW, arm[0], F + 2.55, arm[2], { delay: 0.74, flat: true }, 4);
  cylinder(0.05, 0.02, 0.05, IRON, arm[0], F + 2.5, arm[2], { delay: 0.76 }, 4);

  // The only cover in the piazza: a potted bush up to her knees.
  const bushX = x0 - 0.35;
  const bushZ = z0 + 1.15;
  cylinder(0.17, 0.13, 0.24, POT, bushX, F, bushZ, { delay: 0.6 });
  cylinder(0.19, 0.19, 0.04, POT, bushX, F + 0.24, bushZ, { delay: 0.62 });
  ball(0.2, LEAF, bushX, F + 0.2, bushZ, { delay: 0.66 });
  [
    [-0.13, 0.32, 0.02, 0.12],
    [0.13, 0.3, -0.02, 0.12],
    [0.02, 0.42, 0, 0.11],
  ].forEach(([dx, y, dz, r], i) => ball(r, LEAF, bushX + dx, F + y, bushZ + dz, { delay: 0.7 + i * 0.02 }));

  // What has already been thrown: a squashed tomato and a lost slipper.
  add(new CylinderGeometry(0.11, 0.11, 0.008, 9).scale(1, 1, 0.7), TOMATO, 0.95, F, 1.45, { delay: 0.8, flat: true, noInk: true });
  [
    [0.82, 1.55],
    [1.1, 1.38],
    [0.98, 1.62],
  ].forEach(([x, z], i) => cylinder(0.03, 0.03, 0.008, TOMATO, x, F, z, { delay: 0.82 + i * 0.02, flat: true, noInk: true }, 7));
  const slipper = (x: number, y: number, z: number, delay: number, turn: number) => {
    const sole = box(0.14, 0.035, 0.3, SOLE, x, y, z, { delay, rotation: [0, turn, 0] });
    decorate(sole, new BoxGeometry(0.15, 0.055, 0.09), STRAP, [[0, 0.045, 0.04]]);
    return sole;
  };
  slipper(1.3, F, 0.8, 0.84, 0.9);

  // Bulwark: armour over a heavy uniform, boots planted wide.
  const D = 0.9;
  [-1, 1].forEach((side, i) => {
    const ankle: Point = [x0 + side * 0.27, F + 0.12, z0 + 0.02];
    const hip: Point = [x0 + side * 0.15, F + 0.86, z0];
    box(0.22, 0.16, 0.36, BOOT, ankle[0], F, z0 + 0.07, { delay: D + i * 0.02 });
    const leg = limb(kit, ankle, hip, 0.12, 0.15, ARMOR_DARK, { delay: D + 0.04 + i * 0.02 });
    decorate(leg, new BoxGeometry(0.17, 0.17, 0.06), PLATE, [[0, 0.3, 0.13]]);
  });
  add(new CylinderGeometry(0.34, 0.32, 0.22, 16).scale(1, 1, 0.75), ARMOR_DARK, x0, F + 0.76, z0, { delay: D + 0.08 });
  add(new CylinderGeometry(0.42, 0.34, 0.74, 16).scale(1, 1, 0.72), ARMOR, x0, F + 0.96, z0, { delay: D + 0.12 });
  const belt = add(new CylinderGeometry(0.355, 0.35, 0.09, 16).scale(1, 1, 0.76), BOOT, x0, F + 0.92, z0, { delay: D + 0.14 });
  decorate(belt, new BoxGeometry(0.12, 0.14, 0.08), ARMOR_DARK, [
    [-0.24, 0.03, 0.2],
    [0.24, 0.03, 0.2],
  ]);
  box(0.5, 0.42, 0.1, PLATE, x0, F + 1.2, z0 + 0.25, { delay: D + 0.16 });
  [-1, 1].forEach((side, i) =>
    add(new SphereGeometry(0.21, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), PLATE, x0 + side * 0.43, F + 1.5, z0, {
      delay: D + 0.2 + i * 0.03,
      rotation: [0, 0, side * -0.35],
    }),
  );
  cylinder(0.17, 0.21, 0.14, ARMOR_DARK, x0, F + 1.66, z0, { delay: D + 0.22 });

  // Her right arm holds the baton down; the left is through the shield's straps.
  const shoulderR: Point = [x0 - 0.46, F + 1.56, z0];
  const elbowR: Point = [x0 - 0.62, F + 1.16, z0 + 0.08];
  const handR: Point = [x0 - 0.58, F + 0.84, z0 + 0.28];
  limb(kit, shoulderR, elbowR, 0.11, 0.1, ARMOR, { delay: D + 0.26 });
  ball(0.1, PLATE, elbowR[0], elbowR[1] - 0.1, elbowR[2], { delay: D + 0.28 });
  limb(kit, elbowR, handR, 0.095, 0.085, ARMOR, { delay: D + 0.3 });
  ball(0.09, BOOT, handR[0], handR[1] - 0.09, handR[2], { delay: D + 0.34 });
  limb(kit, [handR[0] + 0.02, handR[1] + 0.06, handR[2] - 0.12], [handR[0] + 0.08, handR[1] - 0.5, handR[2] + 0.26], 0.032, 0.032, BATON, {
    delay: D + 0.36,
  });
  const shoulderL: Point = [x0 + 0.46, F + 1.56, z0];
  const elbowL: Point = [x0 + 0.62, F + 1.16, z0 + 0.22];
  const handL: Point = [x0 + 0.38, F + 1.08, z0 + 0.48];
  limb(kit, shoulderL, elbowL, 0.11, 0.1, ARMOR, { delay: D + 0.26 });
  ball(0.1, PLATE, elbowL[0], elbowL[1] - 0.1, elbowL[2], { delay: D + 0.28 });
  limb(kit, elbowL, handL, 0.095, 0.085, ARMOR, { delay: D + 0.3 });
  ball(0.09, BOOT, handL[0], handL[1] - 0.09, handL[2], { delay: D + 0.34 });

  // Her head: dark curls spilling from the helmet, a level stare.
  const hc = F + 1.99;
  cylinder(0.09, 0.1, 0.12, SKIN, x0, F + 1.72, z0, { delay: D + 0.36 });
  const head = add(new SphereGeometry(0.2, 18, 14).scale(0.88, 1.05, 0.95), SKIN, x0, hc - 0.21, z0 + 0.02, { delay: D + 0.4 });
  const cy = 0.21;
  decorate(head, new BoxGeometry(0.05, 0.036, 0.02), INK, [
    [-0.064, cy + 0.035, 0.172],
    [0.064, cy + 0.035, 0.172],
  ]);
  decorate(head, new BoxGeometry(0.03, 0.012, 0.02), INK, [
    [-0.096, cy + 0.05, 0.16, 0.5],
    [0.096, cy + 0.05, 0.16, -0.5],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.016, 0.03), HAIR, [
    [-0.064, cy + 0.08, 0.162, 0.12],
    [0.064, cy + 0.08, 0.162, -0.12],
  ]);
  decorate(head, new BoxGeometry(0.044, 0.06, 0.05), SKIN_DARK, [[0, cy - 0.01, 0.185]]);
  decorate(head, new BoxGeometry(0.075, 0.026, 0.02), LIPS, [[0, cy - 0.085, 0.17]]);
  decorate(head, new BoxGeometry(0.075, 0.008, 0.01), INK, [[0, cy - 0.085, 0.182]]);
  // Long dark curls from under the helmet, framing her face and falling on her shoulders.
  [
    [-0.17, -0.06, 0.06, 0.07],
    [0.17, -0.06, 0.06, 0.07],
    [-0.2, -0.17, 0.02, 0.08],
    [0.2, -0.17, 0.02, 0.08],
    [-0.23, -0.29, -0.02, 0.085],
    [0.23, -0.29, -0.02, 0.085],
    [-0.15, -0.22, -0.14, 0.085],
    [0.15, -0.22, -0.14, 0.085],
    [0, -0.18, -0.2, 0.09],
    [-0.08, -0.31, -0.18, 0.08],
    [0.08, -0.31, -0.18, 0.08],
  ].forEach(([dx, dy, dz, r], i) => ball(r, HAIR, x0 + dx, hc + dy - r, z0 + dz, { delay: D + 0.44 + i * 0.01, ink: 1.1 }));
  // The helmet: a shell open on the face, its visor raised, and the sprig that is her camouflage.
  const HR = 0.245;
  add(new SphereGeometry(HR, 18, 12, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, 0, Math.PI * 0.6), HELMET, x0, hc + HR * Math.cos(Math.PI * 0.6), z0, {
    delay: D + 0.48,
  });
  add(new SphereGeometry(HR + 0.004, 18, 6, 0, Math.PI * 2, 0, Math.PI * 0.3), HELMET, x0, hc + HR * Math.cos(Math.PI * 0.3), z0, { delay: D + 0.5 });
  const VR = HR + 0.03;
  const visor = add(new SphereGeometry(VR, 18, 5, Math.PI / 2 - 1.15, 2.3, Math.PI * 0.05, Math.PI * 0.27), VISOR, x0, hc + VR * Math.cos(Math.PI * 0.32), z0, {
    delay: D + 0.54,
    ink: 1.03,
  });
  decorate(visor, new BoxGeometry(0.18, 0.022, 0.01), 0xd8f6ff, [[0.07, 0.07, 0.235, 0.25]]);
  [-1, 1].forEach((side) =>
    add(new CylinderGeometry(0.045, 0.045, 0.03, 12).rotateZ(Math.PI / 2), HELMET, x0 + side * (VR - 0.005), hc - 0.01, z0 + 0.02, { delay: D + 0.56 }),
  );
  box(0.018, 0.2, 0.018, TWIG, x0 - 0.04, hc + 0.18, z0 - 0.04, { delay: D + 0.6, rotation: [0, 0, 0.3], noInk: true });
  [
    [-0.12, 0.31, -0.02, 0.6],
    [-0.02, 0.35, -0.06, -0.2],
    [-0.14, 0.24, -0.1, 1.1],
    [0.04, 0.28, 0, -0.7],
    [-0.07, 0.36, 0.02, 0.2],
  ].forEach(([dx, dy, dz, lean], i) =>
    add(new SphereGeometry(0.06, 8, 6).scale(0.55, 1.5, 0.3), LEAF, x0 + dx, hc + dy, z0 + dz, { delay: D + 0.62 + i * 0.02, rotation: [0, 0.4 * i, lean] }),
  );

  // The shield: dented, cracked and taped, a tomato and an egg already on it.
  const R = 0.56;
  const C: Point = [x0 + 0.15, F + 1.06, z0 + 0.62];
  const shield = add(new CylinderGeometry(R, R, 0.06, 36).rotateX(Math.PI / 2), STEEL, C[0], C[1] - R, C[2], { delay: D + 0.56, ink: 1.04 });
  decorate(shield, new TorusGeometry(R, 0.035, 6, 40), STEEL_DARK, [[0, R, 0]]);
  const dents: [number, number][] = [
    [-0.26, 0.24],
    [0.3, -0.22],
    [-0.08, -0.33],
    [0.34, 0.28],
    [-0.38, -0.04],
  ];
  decorate(shield, new CircleGeometry(0.055, 10), STEEL_DARK, dents.map(([x, y]) => [x, R + y, 0.031] as Point));
  decorate(shield, new CircleGeometry(0.022, 8), INK, dents.map(([x, y]) => [x, R + y, 0.033] as Point));
  decorate(shield, new BoxGeometry(0.09, 0.012, 0.004), INK, [
    [-0.2, R - 0.12, 0.033, 0.5],
    [-0.14, R - 0.17, 0.033, -0.4],
    [-0.07, R - 0.2, 0.033, 0.6],
    [0, R - 0.25, 0.033, -0.3],
  ]);
  decorate(shield, new BoxGeometry(0.28, 0.06, 0.004), TAPE, [
    [-0.12, R - 0.19, 0.036, 0.7],
    [-0.12, R - 0.19, 0.038, -0.7],
  ]);
  decorate(shield, new CircleGeometry(0.1, 9), TOMATO, [[0.12, R + 0.16, 0.034]]);
  decorate(shield, new CircleGeometry(0.035, 7), TOMATO, [
    [0.24, R + 0.23, 0.034],
    [0.0, R + 0.25, 0.034],
    [0.22, R + 0.06, 0.034],
  ]);
  decorate(shield, new BoxGeometry(0.03, 0.14, 0.004), TOMATO, [
    [0.08, R + 0.04, 0.034],
    [0.15, R + 0.02, 0.034],
  ]);
  decorate(shield, new CircleGeometry(0.085, 10), EGG, [[-0.25, R + 0.04, 0.034]]);
  decorate(shield, new CircleGeometry(0.036, 10), YELLOW, [[-0.23, R + 0.04, 0.037]]);
  decorate(shield, new BoxGeometry(0.05, 0.42, 0.004), 0xa9b8c8, [[0.28, R + 0.02, 0.033, 0.55]]);

  // Thrown things: a tomato coming in from the right, a slipper bouncing off with a flash where it hit.
  const SF = C[2] + 0.04;
  const tomatoFrom: Point = [1.5, F + 2.0, 1.55];
  const tomatoHit: Point = [C[0] + 0.12, C[1] + 0.08, SF + 0.08];
  const tomato = ball(0.085, TOMATO, ...tomatoFrom, { delay: 1.7 });
  decorate(tomato, new BoxGeometry(0.07, 0.025, 0.07), LEAF, [[0, 0.17, 0]]);
  const slipperFrom: Point = [-1.35, F + 1.5, 1.75];
  const slipperHit: Point = [C[0] - 0.2, C[1] - 0.1, SF + 0.16];
  const slipperLand: Point = [-0.75, F, 1.6];
  const flying = slipper(...slipperFrom, 1.75, 0.6);
  const impact: Point = [C[0] - 0.2, C[1] - 0.04, SF + 0.04];
  const flash = Array.from({ length: 7 }, (_, k) => {
    const angle = (k / 7) * Math.PI * 2 + 0.3;
    const reach = 0.1;
    return box(0.03, k % 2 ? 0.12 : 0.18, 0.01, YELLOW, impact[0] - Math.sin(angle) * reach, impact[1] + Math.cos(angle) * reach, impact[2], {
      delay: 1.8,
      flat: true,
      noInk: true,
      rotation: [0, 0, angle],
    });
  });

  const PERIOD = 2.4;
  const lampFrom = new Color(YELLOW);
  const lampTo = new Color(0xfff2b0);
  tick((t) => {
    // At rest the tomato is on its way in and the slipper has just bounced off.
    const tu = (t / PERIOD + 0.15) % 1;
    const tp = flight(tomatoFrom, tomatoHit, tomatoFrom, tu, false);
    tomato.visible = tp !== null;
    if (tp) tomato.position.set(...tp);
    const su = (t / PERIOD + 0.6) % 1;
    const sp = flight(slipperFrom, slipperHit, slipperLand, su, true);
    flying.visible = sp !== null;
    if (sp) {
      flying.position.set(...sp);
      flying.rotation.set(0.5 + t * 7, 0.6, 0.3);
    }
    for (const ray of flash) ray.visible = su > 0.5 && su < 0.62;
    minuteHand.rotation.z = -t * 0.8;
    hourHand.rotation.z = 1.05 - t * 0.07;
    colorOf(lamp).lerpColors(lampFrom, lampTo, Math.max(0, (Math.sin(t * 3.1) + Math.sin(t * 7.3)) * 0.12 + 0.2));
  });

  return { width: 4.9, height: 4.6, lookY: 1.6 };
}
