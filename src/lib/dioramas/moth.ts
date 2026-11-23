import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Shape,
  SphereGeometry,
} from "three";
import {
  YELLOW,
  ORANGE,
  CYAN,
  MAGENTA,
  INK,
  colorOf,
  octagonBase,
  aim,
  limb,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** A fixed pseudo-random number in [0, 1): the same scatter on every phone. */
function noise(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** The point part of the way from one point to another. */
function along(from: Point, to: Point, u: number): Point {
  return [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u];
}

/** A flat outline through the corners. */
function polygon(corners: [number, number][]): Shape {
  const shape = new Shape();
  shape.moveTo(...corners[0]);
  corners.slice(1).forEach((corner) => shape.lineTo(...corner));
  shape.closePath();
  return shape;
}

/** A disc, as a flat shape. */
function disc(x: number, y: number, radius: number): Shape {
  const shape = new Shape();
  shape.absarc(x, y, radius, 0, Math.PI * 2, false);
  return shape;
}

/** The shadow of a big man in a cap, his club raised: flat shapes facing +z, the feet on y = 0. */
function thugShadow(): Shape[] {
  return [
    polygon([
      [-0.42, 0], [-0.12, 0], [-0.02, 0.78], [0.1, 0], [0.42, 0], [0.36, 0.92], [0.44, 1.55], [0.52, 1.7],
      [0.24, 1.86], [-0.26, 1.86], [-0.56, 1.68], [-0.7, 1.12], [-0.68, 0.84], [-0.52, 0.84], [-0.5, 1.28], [-0.42, 0.92],
    ]),
    disc(0.02, 2.02, 0.21),
    polygon([[-0.23, 2.08], [0.42, 2.05], [0.4, 2.13], [0.2, 2.16], [0.17, 2.31], [-0.17, 2.32], [-0.24, 2.15]]),
    polygon([[0.34, 1.56], [0.52, 1.6], [0.86, 1.92], [0.74, 2.44], [0.58, 2.4], [0.68, 1.98], [0.4, 1.8]]),
    disc(0.66, 2.42, 0.11),
    polygon([[0.58, 2.38], [0.74, 2.34], [1.16, 2.7], [1.1, 2.9], [0.92, 2.92], [0.56, 2.5]]),
    disc(1.02, 2.82, 0.12),
  ];
}

/** A moth with open wings, flat and facing +z. */
function mothWings(): ExtrudeGeometry {
  const wings = polygon([
    [0, 0.02], [-0.07, 0.09], [-0.13, 0.07], [-0.11, 0], [-0.05, -0.05], [0, -0.02],
    [0.05, -0.05], [0.11, 0], [0.13, 0.07], [0.07, 0.09],
  ]);
  return new ExtrudeGeometry(wings, { depth: 0.008, bevelEnabled: false }).translate(0, 0, -0.004);
}

/**
 * Moth (P053): nobody ever sees her, and she never fights. On a stone stairway of the old town at
 * night, a lantern on a house wall draws a cloud of moths; the shadow of a big man with a club
 * looms on the plaster, and Moth is already slipping away towards the steps, glancing back at
 * us. Her trailing foot and hand crumble into magenta and cyan specks, and every few seconds she
 * fades out piece by piece, all but her face, and comes back, as she always does.
 */
export function moth(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x24222e;
  const JOINT = 0x17151e;
  const STEP = 0x4a485c;
  const NOSING = 0x5d5b72;
  const PLASTER = 0x55304e;
  const HALO = 0x6c3c58;
  const HALO_HOT = 0x8a5262;
  const BRICK = 0x7c3c52;
  const CRACK = 0x2a1828;
  const SHADOW = 0x120c18;
  const OPENING = 0x07060b;
  const IRON = 0x1f1e29;
  const POOL = 0x3a2c2e;
  const POOL_HOT = 0x54392f;
  const WING = 0xd8cee8;
  const POT = 0x6a3048;
  const LEAF = 0x2b6658;
  const SUIT = 0x2a5266;
  const SUIT_DARK = 0x214254;
  const STRAP = 0x15131b;
  const GLOVE = 0x1b1923;
  const SKIN = 0xeed9d2;
  const SKIN_DARK = 0xd2ada6;
  const HAIR = 0x231a31;
  const EYE = 0xe8f0f0;
  const IRIS = 0x4fb8ad;
  const LIPS = 0xc23a66;

  const F = octagonBase(kit, SLAB);

  // The worn flags of the old street.
  const joints: [number, number, number, number][] = [
    [-0.78, -0.55, 1.75, -0.55],
    [-0.78, 0.15, 1.95, 0.15],
    [-0.78, 0.85, 1.85, 0.85],
    [-0.6, 1.55, 1.5, 1.55],
    [1.0, -1.28, 1.0, -0.55],
    [-0.2, -1.28, -0.2, -0.55],
    [1.35, -0.55, 1.35, 0.15],
    [0.4, -0.55, 0.4, 0.15],
    [0.9, 0.15, 0.9, 0.85],
    [-0.1, 0.15, -0.1, 0.85],
    [1.3, 0.85, 1.3, 1.55],
    [0.35, 0.85, 0.35, 1.55],
  ];
  joints.forEach(([x1, z1, x2, z2], i) => {
    const across = z1 === z2;
    box(across ? x2 - x1 : 0.025, 0.008, across ? 0.025 : z2 - z1, JOINT, (x1 + x2) / 2, F, (z1 + z2) / 2, {
      delay: 0.1 + i * 0.01,
      flat: true,
      noInk: true,
    });
  });

  // The house wall at the back: old plaster, bricks showing through, cracks.
  const WALL_Z = -1.36;
  const WALL_FRONT = WALL_Z + 0.08;
  const face = 0.085;
  const wall = box(3.6, 2.5, 0.16, PLASTER, 0, F, WALL_Z, { delay: 0.12, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.17, 0.07, 0.01),
    BRICK,
    [
      [-0.55, 0.32], [-0.35, 0.32], [-0.45, 0.42], [-0.65, 0.42], [-0.55, 0.52],
      [1.25, 2.36], [1.45, 2.36], [1.35, 2.26], [1.55, 2.26],
      [0.2, 0.3], [0.4, 0.3], [0.3, 0.4],
    ].map(([x, y]) => [x, y, face] as Point),
  );
  decorate(wall, new BoxGeometry(0.014, 0.24, 0.01), CRACK, [
    [-0.3, 1.1, face, -0.4],
    [-0.38, 1.3, face, 0.3],
    [0.5, 2.35, face, 0.5],
    [1.7, 1.2, face, -0.3],
  ]);

  // The lantern on its iron bracket, and its light on the wall and on the flags.
  const LX = 0.1;
  const LY = F + 1.95;
  const LZ = -0.92;
  decorate(wall, new CylinderGeometry(0.62, 0.62, 0.004, 28).rotateX(Math.PI / 2), HALO, [[LX, LY - F + 0.1, face - 0.003]]);
  decorate(wall, new CylinderGeometry(0.36, 0.36, 0.004, 24).rotateX(Math.PI / 2), HALO_HOT, [[LX, LY - F + 0.1, face - 0.001]]);
  add(new CylinderGeometry(0.8, 0.8, 0.004, 28).scale(1, 1, 0.6), POOL, LX, F, -0.62, { delay: 0.3, flat: true, noInk: true });
  add(new CylinderGeometry(0.46, 0.46, 0.004, 24).scale(1, 1, 0.6), POOL_HOT, LX, F + 0.002, -0.7, { delay: 0.32, flat: true, noInk: true });
  const arm = aim([LX, LY + 0.45, WALL_FRONT], [LX, LY + 0.45, LZ]);
  box(0.05, arm.length + 0.04, 0.05, IRON, LX, LY + 0.425, WALL_FRONT, { delay: 0.5, rotation: arm.rotation });
  const brace = aim([LX, LY + 0.12, WALL_FRONT], [LX, LY + 0.44, WALL_FRONT + 0.2]);
  box(0.03, brace.length, 0.03, IRON, LX, LY + 0.12, WALL_FRONT, { delay: 0.52, rotation: brace.rotation });
  box(0.015, 0.12, 0.015, IRON, LX, LY + 0.31, LZ, { delay: 0.54, noInk: true });
  cylinder(0.02, 0.14, 0.1, IRON, LX, LY + 0.22, LZ, { delay: 0.56, rotation: [0, Math.PI / 4, 0] }, 4);
  const glass = box(0.16, 0.22, 0.16, ORANGE, LX, LY, LZ, { delay: 0.58, flat: true });
  decorate(
    glass,
    new BoxGeometry(0.018, 0.22, 0.018),
    IRON,
    [
      [-0.08, 0.11, 0.08],
      [0.08, 0.11, 0.08],
      [-0.08, 0.11, -0.08],
      [0.08, 0.11, -0.08],
    ],
  );
  cylinder(0.1, 0.05, 0.05, IRON, LX, LY - 0.05, LZ, { delay: 0.6, rotation: [0, Math.PI / 4, 0] }, 4);
  motes(5, ORANGE, 0.014, [LX - 0.25, LY - 0.3, LZ - 0.2], [LX + 0.25, LY + 0.3, LZ + 0.2], 1.4);

  // The stone stairway up to a dark passage, with its iron handrail and a pot on the top step.
  const SX = -1.38;
  const SW = 1.1;
  const RISE = 0.16;
  const TREAD = 0.32;
  const BOTTOM = 0.96;
  for (let k = 0; k < 7; k++) {
    const front = BOTTOM - TREAD * k;
    const depth = front - WALL_FRONT;
    const step = box(SW, RISE, depth, STEP, SX, F + RISE * k, front - depth / 2, { delay: 0.2 + k * 0.04, ink: 1.02 });
    decorate(step, new BoxGeometry(SW, 0.01, 0.05), NOSING, [[0, RISE + 0.001, depth / 2 - 0.025]]);
  }
  const top = RISE * 7;
  decorate(wall, new BoxGeometry(0.62, 1.06, 0.01), OPENING, [[SX, top + 0.53, face]]);
  decorate(wall, new BoxGeometry(0.08, 1.06, 0.03), NOSING, [
    [SX - 0.35, top + 0.53, face + 0.01],
    [SX + 0.35, top + 0.53, face + 0.01],
  ]);
  decorate(wall, new BoxGeometry(0.82, 0.09, 0.04), NOSING, [[SX, top + 1.1, face + 0.015]]);
  const RAIL_X = SX + SW / 2 - 0.06;
  const posts = [0, 3, 6].map((k): Point => [RAIL_X, F + RISE * (k + 1), BOTTOM - TREAD * k - TREAD / 2]);
  posts.forEach((post, i) => box(0.035, 0.7, 0.035, IRON, ...post, { delay: 0.5 + i * 0.03 }));
  const railFrom: Point = [posts[0][0], posts[0][1] + 0.7, posts[0][2]];
  const railTo: Point = [posts[2][0], posts[2][1] + 0.7, posts[2][2]];
  const rail = aim(railFrom, railTo);
  box(0.045, rail.length, 0.045, IRON, ...railFrom, { delay: 0.6, rotation: rail.rotation });
  ball(0.045, IRON, railFrom[0], railFrom[1] - 0.03, railFrom[2], { delay: 0.62 });
  const potX = SX - 0.36;
  const potZ = WALL_FRONT + 0.16;
  cylinder(0.1, 0.075, 0.16, POT, potX, F + top, potZ, { delay: 0.64 });
  [
    [-0.05, 0.02, 0.07],
    [0.05, 0, 0.06],
    [0, 0.08, 0.065],
  ].forEach(([dx, dy, r], i) => ball(r, LEAF, potX + dx, F + top + 0.13 + dy, potZ, { delay: 0.66 + i * 0.02 }));
  [
    [-0.06, 0.16],
    [0.06, 0.12],
  ].forEach(([dx, dy], i) => ball(0.035, MAGENTA, potX + dx, F + top + 0.14 + dy, potZ + 0.05, { delay: 0.72 + i * 0.02, noInk: true }));

  // The shadow of the man she will not fight, looming on the wall from somewhere off the street.
  const shadow = add(
    new ExtrudeGeometry(thugShadow(), { depth: 0.008, bevelEnabled: false }).scale(0.74, 0.74, 1),
    SHADOW,
    0.95,
    F,
    WALL_FRONT + 0.006,
    { delay: 0.8, flat: true, noInk: true },
  );

  // Moth, slipping away towards the steps, looking back over her shoulder. Every piece of her has
  // a place in the fade: 0 trails behind and goes first, 1 leads; the head never goes.
  const x0 = 0.05;
  const z0 = 0.52;
  const G = F;
  const D = 0.9;
  const pieces: { part: Group; order: number }[] = [];
  const keep = (part: Group, order: number) => {
    pieces.push({ part, order });
    return part;
  };
  const specks: { part: Group; base: Point; phase: number }[] = [];
  /** Where a limb breaks off: a few shrinking crumbs of it, then specks drifting off behind her. */
  const crumble = (from: Point, to: Point, color: number, size: number, count: number, seed: number, delay: number) => {
    [0.12, 0.3, 0.48].forEach((u, i) => {
      const at = along(from, to, u);
      const s = size * (1 - i * 0.25);
      keep(box(s, s, s, color, at[0], at[1] - s / 2, at[2], { delay: delay + i * 0.03, rotation: [0.4 * i, 0.7 * i, 0.3] }), 0.05);
    });
    for (let i = 0; i < count; i++) {
      const u = 0.35 + (0.75 * i) / count;
      const at = along(from, to, u);
      const base: Point = [at[0] + (noise(seed + i) - 0.5) * 0.14, at[1] + (noise(seed + i + 40) - 0.5) * 0.14, at[2] + (noise(seed + i + 80) - 0.5) * 0.14];
      const s = 0.035 + noise(seed + i + 120) * 0.035;
      const part = box(s, s, s, i % 3 === 2 ? CYAN : MAGENTA, ...base, { delay: delay + 0.1 + i * 0.02, flat: true, noInk: true, rotation: [0, 0.6, 0.4] });
      specks.push({ part, base, phase: noise(seed + i + 160) });
    }
  };

  // The near leg strides forward, its boot planted on the flags.
  const hipN: Point = [x0 - 0.04, G + 1.08, z0 + 0.1];
  const kneeN: Point = [x0 - 0.4, G + 0.62, z0 + 0.13];
  const ankleN: Point = [x0 - 0.32, G + 0.12, z0 + 0.13];
  keep(limb(kit, hipN, kneeN, 0.12, 0.095, SUIT, { delay: D }), 0.55);
  keep(ball(0.095, SUIT, kneeN[0], kneeN[1] - 0.095, kneeN[2], { delay: D + 0.03 }), 0.6);
  keep(limb(kit, kneeN, ankleN, 0.09, 0.07, SUIT, { delay: D + 0.04 }), 0.6);
  keep(limb(kit, [ankleN[0], G + 0.06, ankleN[2]], along(ankleN, kneeN, 0.45), 0.08, 0.085, STRAP, { delay: D + 0.06 }), 0.62);
  keep(box(0.3, 0.11, 0.13, STRAP, ankleN[0] - 0.07, G, ankleN[2], { delay: D + 0.06 }), 0.65);
  // The far leg trails behind her and is already going, below the knee.
  const hipF: Point = [x0 + 0.02, G + 1.08, z0 - 0.1];
  const kneeF: Point = [x0 + 0.3, G + 0.64, z0 - 0.12];
  const ankleF: Point = [x0 + 0.72, G + 0.86, z0 - 0.12];
  const toeF: Point = [x0 + 0.95, G + 0.74, z0 - 0.12];
  keep(limb(kit, hipF, kneeF, 0.12, 0.095, SUIT_DARK, { delay: D + 0.02 }), 0.15);
  keep(ball(0.095, SUIT_DARK, kneeF[0], kneeF[1] - 0.095, kneeF[2], { delay: D + 0.05 }), 0.1);
  const stub = along(kneeF, ankleF, 0.3);
  keep(limb(kit, kneeF, stub, 0.09, 0.085, SUIT_DARK, { delay: D + 0.06 }), 0.08);
  crumble(stub, toeF, SUIT_DARK, 0.08, 12, 1, D + 0.1);

  // Hips, a slim body leaning into the run, the belt and the strap of her harness.
  keep(add(new SphereGeometry(0.19, 14, 10).scale(0.82, 0.78, 1), SUIT, x0, G + 0.92, z0, { delay: D + 0.08 }), 0.4);
  const waist: Point = [x0 - 0.02, G + 1.04, z0];
  const chest: Point = [x0 - 0.2, G + 1.8, z0];
  const trunk = aim(waist, chest);
  const torso = keep(
    add(new CylinderGeometry(0.2, 0.145, trunk.length, 16).scale(0.66, 1, 1), SUIT, ...waist, { delay: D + 0.12, rotation: trunk.rotation }),
    0.45,
  );
  decorate(torso, new BoxGeometry(0.045, 0.56, 0.02), STRAP, [[0, 0.44, 0.19, -0.45]]);
  decorate(torso, new BoxGeometry(0.03, 0.16, 0.02), SUIT_DARK, [[-0.05, 0.62, 0.2]]);
  const belt = keep(
    add(new CylinderGeometry(0.162, 0.162, 0.06, 16).scale(0.68, 1, 1), STRAP, ...along(waist, chest, 0.06), {
      delay: D + 0.16,
      rotation: trunk.rotation,
    }),
    0.45,
  );
  decorate(belt, new BoxGeometry(0.02, 0.05, 0.07), CYAN, [[-0.115, 0.03, 0.04]]);
  const thigh = aim(hipN, kneeN);
  [0.35, 0.62].forEach((u, i) => {
    const at = along(hipN, kneeN, u);
    const radius = 0.12 - 0.025 * u + 0.006;
    keep(add(new CylinderGeometry(radius, radius, 0.035, 14), STRAP, ...at, { delay: D + 0.18 + i * 0.02, rotation: thigh.rotation, noInk: true }), 0.55);
  });

  // The near arm swings back and is crumbling at the wrist; the far one reaches for the steps.
  const shoulderN: Point = [x0 - 0.2, G + 1.72, z0 + 0.2];
  const shoulderF: Point = [x0 - 0.2, G + 1.72, z0 - 0.2];
  [shoulderN, shoulderF].forEach((at, i) => keep(ball(0.095, SUIT, at[0], at[1] - 0.095, at[2], { delay: D + 0.2 + i * 0.02 }), 0.5));
  const elbowN: Point = [x0 + 0.06, G + 1.4, z0 + 0.28];
  const handN: Point = [x0 + 0.4, G + 1.26, z0 + 0.32];
  keep(limb(kit, shoulderN, elbowN, 0.08, 0.07, SUIT, { delay: D + 0.24 }), 0.3);
  keep(ball(0.068, GLOVE, elbowN[0], elbowN[1] - 0.068, elbowN[2], { delay: D + 0.26 }), 0.25);
  const wrist = along(elbowN, handN, 0.55);
  keep(limb(kit, elbowN, wrist, 0.065, 0.06, GLOVE, { delay: D + 0.28 }), 0.2);
  crumble(wrist, [handN[0] + 0.2, handN[1] - 0.04, handN[2] + 0.02], GLOVE, 0.065, 8, 50, D + 0.3);
  const elbowF: Point = [x0 - 0.5, G + 1.46, z0 - 0.26];
  const handF: Point = [x0 - 0.76, G + 1.66, z0 - 0.22];
  keep(limb(kit, shoulderF, elbowF, 0.08, 0.07, SUIT, { delay: D + 0.24 }), 0.7);
  keep(ball(0.068, GLOVE, elbowF[0], elbowF[1] - 0.068, elbowF[2], { delay: D + 0.26 }), 0.75);
  keep(limb(kit, elbowF, handF, 0.065, 0.055, GLOVE, { delay: D + 0.28 }), 0.8);
  keep(add(new SphereGeometry(0.075, 12, 10).scale(1.15, 0.8, 0.9), GLOVE, handF[0] - 0.02, handF[1] - 0.05, handF[2], { delay: D + 0.32 }), 0.9);

  // Her head, turned back over her shoulder to us: pale, a black bob with a fringe, sleepy eyes,
  // a half smile.
  keep(limb(kit, [x0 - 0.19, G + 1.74, z0], [x0 - 0.24, G + 1.93, z0 + 0.01], 0.062, 0.056, SKIN, { delay: D + 0.3 }), 1.2);
  const YAW = 0.15;
  const cos = Math.cos(YAW);
  const sin = Math.sin(YAW);
  const ry = 0.16 * 1.08;
  const origin: Point = [x0 - 0.27, G + 2.06 - ry, z0 + 0.02];
  /** A point of the head, given in the head's own frame (face towards +z). */
  const onHead = (x: number, y: number, z: number): Point => [origin[0] + x * cos + z * sin, origin[1] + y, origin[2] - x * sin + z * cos];
  const head = keep(add(new SphereGeometry(0.16, 18, 14).scale(0.92, 1.08, 0.95), SKIN, ...origin, { delay: D + 0.36, rotation: [0, YAW, 0] }), 1.2);
  decorate(head, new BoxGeometry(0.066, 0.036, 0.012), EYE, [
    [-0.058, ry + 0.01, 0.142],
    [0.058, ry + 0.01, 0.142],
  ]);
  decorate(head, new BoxGeometry(0.028, 0.03, 0.012), IRIS, [
    [-0.05, ry + 0.006, 0.148],
    [0.066, ry + 0.006, 0.148],
  ]);
  // Heavy lids over the eyes: a sly, sleepy look.
  decorate(head, new BoxGeometry(0.082, 0.026, 0.016), INK, [
    [-0.058, ry + 0.028, 0.143],
    [0.058, ry + 0.028, 0.143],
  ]);
  decorate(head, new BoxGeometry(0.03, 0.05, 0.03), SKIN_DARK, [[0, ry - 0.025, 0.152]]);
  decorate(head, new BoxGeometry(0.062, 0.022, 0.014), LIPS, [[0.008, ry - 0.08, 0.137, 0.16]]);
  const capTheta = 1.25;
  const capRadius = 0.19;
  keep(
    add(
      new SphereGeometry(capRadius, 16, 10, 0, Math.PI * 2, 0, capTheta),
      HAIR,
      ...onHead(0, ry + 0.008 + capRadius * Math.cos(capTheta), -0.012),
      { delay: D + 0.42, rotation: [0, YAW, 0] },
    ),
    1.2,
  );
  const bobTheta = 2.25;
  const bobRadius = 0.2;
  keep(
    add(
      new SphereGeometry(bobRadius, 18, 12, Math.PI / 2 + 1, Math.PI * 2 - 2, 0, bobTheta),
      HAIR,
      ...onHead(0, ry + 0.004 + bobRadius * Math.cos(bobTheta), -0.02),
      { delay: D + 0.4, rotation: [0, YAW, 0] },
    ),
    1.2,
  );
  crumble(onHead(0.12, ry + 0.02, -0.14), onHead(0.5, ry - 0.1, -0.42), HAIR, 0.05, 5, 90, D + 0.5);
  motes(10, MAGENTA, 0.022, [x0 + 0.3, G + 0.6, z0 - 0.3], [x0 + 1.1, G + 2.3, z0 + 0.4], 1.6);

  // The moths round the lantern.
  const lampY = LY + 0.11;
  const moths = Array.from({ length: 8 }, (_, i) => {
    const part = add(mothWings(), WING, LX, lampY, LZ, { delay: 1.3 + i * 0.04, flat: true, noInk: true });
    decorate(part, new BoxGeometry(0.022, 0.1, 0.02), INK, [[0, 0.07, 0.006]]);
    return {
      part,
      wings: part.children[0],
      rx: 0.3 + (i % 3) * 0.07,
      rz: 0.2 + (i % 2) * 0.07,
      lift: -0.22 + ((i * 3) % 8) * 0.045,
      speed: (1.1 + (i % 4) * 0.3) * (i % 2 ? 1 : -1),
      phase: i * 0.79,
    };
  });

  const glowFrom = new Color(ORANGE);
  const glowTo = new Color(YELLOW);
  const glowLow = new Color(0x8a4210);
  const shadowMesh = shadow.children[0];
  tick((elapsed) => {
    // The first frame can start a moment before the diorama opened.
    const t = Math.max(0, elapsed);
    // The lantern flickers, now and then nearly going out.
    const beat = Math.floor(t * 9);
    const dip = t > 1 && noise(beat * 0.37) > 0.93;
    if (dip) colorOf(glass).copy(glowLow);
    else colorOf(glass).lerpColors(glowFrom, glowTo, ((Math.sin(t * 1.7) + 1) / 2) * 0.55);
    // The shadow sways and swells, as if he were coming closer and stopping.
    const swell = Math.sin(t * 0.9);
    shadowMesh.scale.set(1 + swell * 0.04, 1 + swell * 0.04, 1);
    shadowMesh.position.x = swell * 0.05;
    for (const [i, moth] of moths.entries()) {
      const angle = moth.phase + moth.speed * t;
      moth.part.position.set(
        LX + Math.cos(angle) * moth.rx,
        lampY + moth.lift + Math.sin(angle * 2 + i) * 0.05 - 0.07,
        LZ + Math.sin(angle) * moth.rz,
      );
      moth.part.rotation.z = Math.sin(angle) * 0.3;
      moth.wings.scale.x = 0.3 + 0.7 * Math.abs(Math.cos(t * 16 + i * 1.7));
    }
    // The specks drift off behind her and shrink away.
    for (const [i, speck] of specks.entries()) {
      const u = (t * 0.3 + speck.phase) % 1;
      speck.part.position.set(speck.base[0] + u * 0.45, speck.base[1] + u * 0.3, speck.base[2] + Math.sin(u * 6 + i) * 0.04);
      speck.part.children[0].scale.setScalar(1 - u * 0.75);
    }
    // Every nine seconds she fades from the back forward, all but her face, then comes back;
    // in between, a piece of her blinks out now and then.
    const p = (t % 9) / 9;
    const fade = p < 0.45 ? 0 : p < 0.58 ? (p - 0.45) / 0.13 : p < 0.68 ? 1 : p < 0.82 ? 1 - (p - 0.68) / 0.14 : 0;
    for (const [i, { part, order }] of pieces.entries()) {
      const blink = t > 1 && order < 1 && noise(beat * 3.1 + i * 0.7) > 0.975;
      part.visible = order >= fade * 0.95 && !blink;
    }
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
