import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import {
  YELLOW,
  CYAN,
  MAGENTA,
  INK,
  colorOf,
  octagonBase,
  aim,
  limb,
  zigzag,
  cable,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** The same shape with one normal per face, so glass shows its facets under the toon light. */
function faceted(geometry: BufferGeometry): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.computeVertexNormals();
  return flat;
}

/** A column shaft snapped off at the top: the rim and the break pushed up and down into jags. */
function brokenShaft(radius: number, height: number, seed: number): CylinderGeometry {
  const geometry = new CylinderGeometry(radius * 0.94, radius, height, 12);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    if (position.getY(i) < height / 2 - 1e-6) continue;
    const x = position.getX(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const rim = Math.hypot(x, z) / radius;
    const jag = (Math.sin(angle * 3 + seed) * 0.1 + Math.sin(angle * 5 + seed * 2.3) * 0.05) * rim + (x / radius) * 0.1;
    position.setY(i, height / 2 + jag);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A thin line through a curve, as long as the curve; it pops from its first point. */
function line(kit: Kit, curve: CatmullRomCurve3, radius: number, color: number, delay: number): Group {
  const first = curve.getPoint(0);
  const geometry = new TubeGeometry(curve, 48, radius, 4).translate(-first.x, -first.y, -first.z);
  geometry.computeBoundingBox();
  return kit.add(geometry, color, first.x, first.y + (geometry.boundingBox?.min.y ?? 0), first.z, { delay, flat: true, noInk: true });
}

/**
 * Vetrix (P051): the fastest fighter in the city has bones of glass. He lunges at us among the
 * broken columns of the temple dig under Nuova Megara, under the work lamps strung across the
 * pit, and thrusts out his glass arm: the shards breaking off it whirl round in an arc and
 * strike the column on the right, chipping the stone. The price shows on him: his arm and half
 * his face are cracked glass, a finger is gone, and splinters of him lie round his feet.
 */
export function vetrix(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x2a2430;
  const EARTH = 0x3d2f3c;
  const EARTH_DARK = 0x2e2430;
  const TIMBER = 0x5e4838;
  const TIMBER_DARK = 0x3e3028;
  const STONE = 0x8d93ad;
  const STONE_LIGHT = 0xa9aec6;
  const STONE_DARK = 0x666c86;
  const RAIL = 0x6c7488;
  const SUIT = 0x283249;
  const SUIT_LIGHT = 0x36435f;
  const STRAP = 0x16141e;
  const STEEL = 0x8a93a6;
  const BOOT = 0x1c1a24;
  const SKIN = 0xe2cabd;
  const SKIN_DARK = 0xb99d92;
  const HAIR = 0x1b1f30;
  const GLASS = 0xbfeaff;
  const GLASS_DEEP = 0x7cc6ec;
  const GLINT = 0xf4fcff;
  const PINK = 0xff8fc0;
  const BUCKET = 0x2f6f86;

  const F = octagonBase(kit, SLAB);

  // The floor of the pit: patches of darker earth.
  [
    [-0.9, 1.35, 0.9, 0.5, 0.3],
    [0.95, -0.1, 0.8, 0.6, -0.4],
    [-0.2, -0.75, 1.1, 0.45, 0.1],
  ].forEach(([x, z, w, d, turn], i) =>
    box(w, 0.012, d, EARTH_DARK, x, F, z, { delay: 0.1 + i * 0.02, flat: true, noInk: true, rotation: [0, turn, 0] }),
  );

  // The side of the pit at the back: a bank of earth shored up with planks, a railing along
  // its top where the street is, and a ladder down.
  const BANK = 0.95;
  box(2.9, BANK, 0.4, EARTH, 0, F, -1.55, { delay: 0.12, ink: 1.02 });
  [
    [-1.0, 0.16, 0.2],
    [0.2, 0.12, 0.25],
    [1.1, 0.14, 0.18],
  ].forEach(([x, h, r], i) =>
    add(new SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, h / r, 0.8), EARTH, x, F + BANK - 0.01, -1.55, { delay: 0.16 + i * 0.02 }),
  );
  [0.06, 0.33, 0.6].forEach((y, i) => box(2.8, 0.22, 0.05, TIMBER, 0, F + y, -1.33, { delay: 0.18 + i * 0.03, ink: 1.03 }));
  [-1.05, 0, 1.05].forEach((x, i) => box(0.1, 1.05, 0.08, TIMBER_DARK, x, F, -1.28, { delay: 0.26 + i * 0.03 }));
  const RAIL_Y = F + BANK;
  [-1.3, -0.45, 0.45].forEach((x, i) => box(0.05, 0.42, 0.05, RAIL, x, RAIL_Y, -1.62, { delay: 0.3 + i * 0.02 }));
  box(0.06, 0.85, 0.06, RAIL, 1.3, RAIL_Y, -1.62, { delay: 0.36 });
  [0.2, 0.4].forEach((y, i) => box(2.66, 0.04, 0.04, RAIL, 0, RAIL_Y + y, -1.62, { delay: 0.38 + i * 0.02 }));
  // The ladder leaning on the bank.
  const foot: [number, number] = [0.62, -0.92];
  const LADDER_TOP = BANK + 0.32;
  const LADDER_BACK = -1.28;
  [-0.17, 0.17].forEach((dx, i) => {
    const from: Point = [foot[0] + dx, F, foot[1]];
    const to: Point = [foot[0] + dx, F + LADDER_TOP, LADDER_BACK];
    const { length, rotation } = aim(from, to);
    box(0.05, length, 0.05, TIMBER, ...from, { delay: 0.4 + i * 0.02, rotation });
  });
  for (let rung = 0; rung < 5; rung++) {
    const u = (rung + 0.6) / 5.4;
    box(0.36, 0.035, 0.035, TIMBER_DARK, foot[0], F + u * LADDER_TOP, foot[1] + u * (LADDER_BACK - foot[1]), { delay: 0.44 + rung * 0.02 });
  }

  /** A fluted column on its square plinth, snapped off at `height` above the plinth. */
  const column = (x: number, z: number, radius: number, height: number, seed: number, delay: number) => {
    box(radius * 2.5, 0.12, radius * 2.5, STONE_DARK, x, F, z, { delay });
    cylinder(radius * 1.18, radius * 1.24, 0.1, STONE_LIGHT, x, F + 0.12, z, { delay: delay + 0.03 }, 14);
    const shaft = add(brokenShaft(radius, height, seed), STONE, x, F + 0.22, z, { delay: delay + 0.06 });
    const flute = height - 0.55;
    decorate(
      shaft,
      new BoxGeometry(0.024, flute, 0.024),
      STONE_DARK,
      Array.from({ length: 10 }, (_, k) => {
        const angle = (k / 10) * Math.PI * 2;
        return [Math.sin(angle) * radius * 0.985, 0.12 + flute / 2, Math.cos(angle) * radius * 0.985] as Point;
      }),
    );
    return shaft;
  };
  const A: Point = [-1.3, F, -0.95];
  column(A[0], A[2], 0.28, 2.3, 1.2, 0.3);
  // The column on the right is the target: the cracks are on the side the shards strike.
  const B: Point = [1.45, F, -0.45];
  const BR = 0.25;
  const target = column(B[0], B[2], BR, 1.55, 4.1, 0.38);
  const normal = new Vector3(0.45, 0, 0.89).normalize();
  const HIT_Y = 1.15;
  decorate(
    target,
    new BoxGeometry(0.016, 0.2, 0.016),
    INK,
    [
      [0, 0.08, 0.5],
      [0.3, -0.06, -0.6],
      [-0.3, 0.03, 0.9],
      [0.12, -0.17, 0.2],
      [-0.18, 0.16, -0.3],
      [0.45, 0.12, 0.4],
    ].map(([turn, dy, lean]) => {
      const angle = Math.atan2(normal.x, normal.z) + turn;
      return [Math.sin(angle) * BR, HIT_Y + dy, Math.cos(angle) * BR, lean] as [number, number, number, number];
    }),
  );
  // A fallen drum, and the capital the tall column lost, upside down.
  add(new CylinderGeometry(0.24, 0.24, 0.55, 12).rotateZ(Math.PI / 2), STONE, -1.55, F, 0.95, { delay: 0.46, rotation: [0, 0.5, 0] });
  box(0.6, 0.14, 0.6, STONE_LIGHT, -1.85, F, 0.05, { delay: 0.5, rotation: [0, 0.3, 0] });
  cylinder(0.32, 0.22, 0.16, STONE, -1.85, F + 0.14, 0.05, { delay: 0.53 }, 14);

  // The work lamps strung from the tall column to the railing, over the pit.
  add(new TorusGeometry(0.27, 0.025, 6, 20).rotateX(Math.PI / 2), INK, A[0], F + 2.08, A[2], { delay: 0.56, noInk: true });
  const lampLine: Point[] = [
    [A[0] + 0.27, F + 2.1, A[2]],
    [0.1, F + 1.92, -1.25],
    [1.3, RAIL_Y + 0.82, -1.62],
  ];
  cable(kit, lampLine, 0.014, INK, 0.6);
  const lampCurve = new CatmullRomCurve3(lampLine.map((point) => new Vector3(...point)));
  const bulbs = [0.22, 0.5, 0.78].map((u, i) => {
    const at = lampCurve.getPoint(u);
    box(0.012, 0.1, 0.012, INK, at.x, at.y - 0.1, at.z, { delay: 0.64 + i * 0.03, noInk: true });
    return ball(0.065, YELLOW, at.x, at.y - 0.22, at.z, { delay: 0.68 + i * 0.03, flat: true });
  });

  // The grid of the dig: stakes and yellow string, and a bucket of finds.
  const stakes: Point[] = [
    [0.4, F, 1.55],
    [1.35, F, 1.55],
    [1.35, F, 0.8],
    [0.4, F, 0.8],
  ];
  stakes.forEach(([x, y, z], i) => box(0.045, 0.24, 0.045, TIMBER, x, y, z, { delay: 0.7 + i * 0.02 }));
  stakes.forEach((from, i) => {
    const to = stakes[(i + 1) % stakes.length];
    const a: Point = [from[0], F + 0.17, from[2]];
    const b: Point = [to[0], F + 0.17, to[2]];
    const { length, rotation } = aim(a, b);
    box(0.014, length, 0.014, YELLOW, ...a, { delay: 0.76 + i * 0.02, flat: true, noInk: true, rotation });
  });
  cylinder(0.13, 0.1, 0.22, BUCKET, 1.0, F, 1.25, { delay: 0.82 });
  add(new TorusGeometry(0.11, 0.012, 6, 16, Math.PI), INK, 1.0, F + 0.22, 1.25, { delay: 0.85, noInk: true });

  // Vetrix, lunging at us; his glass arm thrust out towards the column on the right.
  const k = 1.15;
  const x0 = -0.55;
  const z0 = 0.3;
  const fx = 0.5;
  const fz = 0.866;
  const yaw = Math.atan2(fx, fz);
  /** A point of his body: so far forward, to his left and up from between his feet. */
  const P = (forward: number, side: number, up: number): Point => [
    x0 + k * (fx * forward + fz * side),
    F + k * up,
    z0 + k * (fz * forward - fx * side),
  ];
  /** A turn facing his way, leaning forward by `lean`. */
  const turn = (lean: number): Point => {
    const euler = new Euler().setFromQuaternion(new Quaternion().setFromEuler(new Euler(lean, yaw, 0, "YXZ")));
    return [euler.x, euler.y, euler.z];
  };
  const D = 0.95;

  // Legs: the front one bent, the back one stretched out behind him on its toes.
  const legs: [Point, Point, Point][] = [
    [P(0.03, 0.15, 1.04), P(0.46, 0.21, 0.66), P(0.5, 0.21, 0.14)],
    [P(-0.03, -0.15, 1.04), P(-0.38, -0.19, 0.62), P(-0.76, -0.21, 0.2)],
  ];
  legs.forEach(([hip, knee, ankle], i) => {
    limb(kit, hip, knee, 0.15 * k, 0.125 * k, SUIT, { delay: D + i * 0.03 });
    ball(0.12 * k, SUIT_LIGHT, knee[0], knee[1] - 0.12 * k, knee[2], { delay: D + 0.04 + i * 0.03 });
    limb(kit, knee, ankle, 0.115 * k, 0.09 * k, SUIT, { delay: D + 0.06 + i * 0.03 });
  });
  box(0.17 * k, 0.14 * k, 0.34 * k, BOOT, ...P(0.56, 0.21, 0), { delay: D + 0.1, rotation: turn(0) });
  box(0.16 * k, 0.13 * k, 0.32 * k, BOOT, ...P(-0.72, -0.21, 0.1), { delay: D + 0.12, rotation: turn(0.75) });

  // Hips and chest in his dark suit, a belt and a harness with magenta piping.
  add(new CylinderGeometry(0.28, 0.25, 0.22, 16).scale(k, k, 0.7 * k), SUIT, ...P(0, 0, 0.92), { delay: D + 0.12, rotation: turn(0) });
  const belt = add(new TorusGeometry(0.285 * k, 0.035 * k, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.7), STRAP, ...P(0, 0, 1.06), {
    delay: D + 0.2,
    rotation: turn(0),
  });
  decorate(belt, new BoxGeometry(0.09, 0.07, 0.02), STEEL, [[0, 0.04, 0.235]]);
  const LEAN = 0.2;
  const TORSO = 0.7;
  const torso = add(new CylinderGeometry(0.36, 0.27, TORSO, 16).scale(k, k, 0.66 * k), SUIT, ...P(0.01, 0, 1.06), {
    delay: D + 0.16,
    rotation: turn(LEAN),
  });
  decorate(torso, new BoxGeometry(0.08, 0.36, 0.04), STRAP, [[0, 0.23, 0.23]]);
  decorate(torso, new BoxGeometry(0.022, 0.4, 0.022), MAGENTA, [
    [-0.23, 0.48, 0.23, 0.08],
    [0.23, 0.48, 0.23, -0.08],
  ]);
  /** A point on the axis of his chest, `s` up from its foot. */
  const chest = (s: number, forward = 0): Point => P(0.01 + s * Math.sin(LEAN) + forward, 0, 1.06 + s * Math.cos(LEAN));
  add(new TorusGeometry(0.33 * k, 0.03 * k, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.66), STRAP, ...chest(0.39), {
    delay: D + 0.22,
    rotation: turn(LEAN),
  });
  const buckle = chest(0.38, 0.2);
  ball(0.045, STEEL, buckle[0], buckle[1], buckle[2], { delay: D + 0.26 });

  // His right arm cocked back, the fist by his ribs.
  const shoulderR = P(0.15, -0.36, 1.64);
  const elbowR = P(-0.18, -0.5, 1.36);
  const fistR = P(0.06, -0.42, 1.14);
  ball(0.15 * k, SUIT_LIGHT, shoulderR[0], shoulderR[1] - 0.15 * k, shoulderR[2], { delay: D + 0.24 });
  limb(kit, shoulderR, elbowR, 0.11 * k, 0.1 * k, SUIT, { delay: D + 0.28 });
  ball(0.1 * k, SUIT_LIGHT, elbowR[0], elbowR[1] - 0.1 * k, elbowR[2], { delay: D + 0.3 });
  limb(kit, elbowR, fistR, 0.1 * k, 0.09 * k, SUIT, { delay: D + 0.32 });
  ball(0.1 * k, STRAP, fistR[0], fistR[1] - 0.1 * k, fistR[2], { delay: D + 0.34 });

  // His left arm, all glass, thrust out: cracked, catching magenta and cyan, a finger broken off.
  const glassLimb = (from: Point, to: Point, start: number, end: number, color: number, delay: number) => {
    const { length, rotation } = aim(from, to);
    return add(faceted(new CylinderGeometry(end, start, length, 6)), color, ...from, { delay, rotation });
  };
  /** Cracks and coloured glints all round a glass limb. */
  const shatter = (part: Group, radius: number, length: number, seed: number) => {
    const around = (count: number, step: number, lean: (n: number) => number) =>
      Array.from({ length: count }, (_, n) => {
        const angle = seed + n * step;
        const y = length * (0.12 + 0.76 * ((n * 0.37 + seed) % 1));
        return [Math.cos(angle) * radius, y, Math.sin(angle) * radius, lean(n)] as [number, number, number, number];
      });
    decorate(part, new BoxGeometry(0.016, 0.12, 0.016), INK, around(6, 2.4, (n) => (n % 2 ? 0.6 : -0.5)));
    decorate(part, new BoxGeometry(0.035, 0.07, 0.035), PINK, around(2, 3.3, () => 0.4));
    decorate(part, new BoxGeometry(0.03, 0.08, 0.03), GLINT, around(2, 1.7, () => -0.3));
  };
  const shoulderL = P(0.15, 0.36, 1.64);
  const elbowL = P(0.43, 0.66, 1.68);
  const wrist = P(0.71, 0.95, 1.72);
  ball(0.15 * k, SUIT_LIGHT, shoulderL[0], shoulderL[1] - 0.15 * k, shoulderL[2], { delay: D + 0.24 });
  add(new TorusGeometry(0.155 * k, 0.022, 6, 20).rotateX(Math.PI / 2), MAGENTA, shoulderL[0], shoulderL[1] - 0.03, shoulderL[2], {
    delay: D + 0.3,
    flat: true,
    noInk: true,
  });
  const upper = glassLimb(shoulderL, elbowL, 0.105 * k, 0.095 * k, GLASS, D + 0.3);
  shatter(upper, 0.1 * k, aim(shoulderL, elbowL).length, 0.3);
  add(faceted(new OctahedronGeometry(0.1 * k, 0)), GLASS_DEEP, elbowL[0], elbowL[1] - 0.1 * k, elbowL[2], { delay: D + 0.34 });
  const fore = glassLimb(elbowL, wrist, 0.09 * k, 0.075 * k, GLASS, D + 0.36);
  shatter(fore, 0.085 * k, aim(elbowL, wrist).length, 0.7);

  // The open hand: a faceted palm and the fingers spread like a claw, the little one a stump.
  const along = new Vector3(...wrist).sub(new Vector3(...elbowL)).normalize();
  const across = new Vector3().crossVectors(along, new Vector3(0, 1, 0)).normalize();
  const lift = new Vector3().crossVectors(across, along).normalize();
  const palm = new Vector3(...wrist).addScaledVector(along, -0.02);
  const palmTo: Point = [palm.x + along.x, palm.y + along.y, palm.z + along.z];
  add(faceted(new OctahedronGeometry(0.1 * k, 0).scale(0.8, 1, 0.5)), GLASS, palm.x, palm.y, palm.z, {
    delay: D + 0.4,
    rotation: aim([palm.x, palm.y, palm.z], palmTo).rotation,
  });
  const knuckles = new Vector3(...wrist).addScaledVector(along, 0.16 * k);
  [
    [-0.06, -0.5, 0.05],
    [-0.02, -0.15, 0.2],
    [0.02, 0.12, 0.21],
    [0.06, 0.42, 0.18],
    [0, 1.25, 0.14],
  ].forEach(([offset, spread, length], i) => {
    const base = knuckles
      .clone()
      .addScaledVector(lift, offset * k)
      .addScaledVector(along, i === 4 ? -0.08 : 0);
    const direction = along.clone().multiplyScalar(Math.cos(spread)).addScaledVector(lift, Math.sin(spread));
    const tip = base.clone().addScaledVector(direction, length * k);
    glassLimb([base.x, base.y, base.z], [tip.x, tip.y, tip.z], 0.03 * k, i === 0 ? 0.024 : 0.008, i % 2 ? GLINT : GLASS, D + 0.44 + i * 0.02);
  });
  // Flakes of glass coming off the forearm.
  [
    [0.35, 0.11, 0.06],
    [0.6, 0.12, -0.06],
    [0.82, 0.14, 0.04],
  ].forEach(([u, out, up], i) => {
    const at = new Vector3(...elbowL)
      .lerp(new Vector3(...wrist), u)
      .addScaledVector(across, -out)
      .addScaledVector(lift, up);
    add(faceted(new OctahedronGeometry(0.045, 0).scale(0.6, 1.4, 0.4)), i === 1 ? PINK : GLINT, at.x, at.y, at.z, {
      delay: D + 0.5 + i * 0.03,
      noInk: true,
      rotation: [i, i * 2, 0.4],
    });
  });

  // His head: half skin and half cracked glass, magenta eyes, a smirk, dark hair swept back.
  cylinder(0.085 * k, 0.095 * k, 0.17 * k, SKIN, ...P(0.17, 0, 1.72), { delay: D + 0.38 });
  const HEAD = 0.2 * k;
  const TALL = 1.08;
  const centre = P(0.21, 0, 1.97);
  const halfHead = (start: number, sides: number, color: number, glass: boolean) => {
    const geometry = new SphereGeometry(HEAD, sides, 12, start, Math.PI).scale(1, TALL, 1);
    return add(glass ? faceted(geometry) : geometry, color, centre[0], centre[1] - HEAD * TALL, centre[2], {
      delay: D + 0.42,
      rotation: [0, yaw, 0],
    });
  };
  const skin = halfHead(-Math.PI / 2, 10, SKIN, false);
  const glassFace = halfHead(Math.PI / 2, 6, GLASS, true);
  /** A spot on the face, from its centre: across (to his left), up, and a little out, leaning. */
  const face = (x: number, y: number, out: number, lean = 0): [number, number, number, number] => {
    const [sx, sy] = [x * k, y * k];
    return [sx, HEAD * TALL + sy, Math.sqrt(Math.max(0, HEAD * HEAD - sx * sx - (sy / TALL) ** 2)) + out, lean];
  };
  const eye = new BoxGeometry(0.065, 0.034, 0.02);
  const brow = new BoxGeometry(0.085, 0.026, 0.02);
  decorate(skin, eye, MAGENTA, [face(-0.075, 0.03, 0.006)]);
  decorate(glassFace, eye, MAGENTA, [face(0.075, 0.03, 0.014)]);
  decorate(skin, brow, INK, [face(-0.075, 0.08, 0.008, -0.35)]);
  decorate(glassFace, brow, INK, [face(0.075, 0.08, 0.014, 0.35)]);
  decorate(skin, new BoxGeometry(0.05, 0.08, 0.04), SKIN_DARK, [face(0, -0.01, -0.006)]);
  decorate(skin, new BoxGeometry(0.1, 0.018, 0.02), INK, [face(0.01, -0.095, 0.004, 0.18)]);
  decorate(glassFace, new BoxGeometry(0.014, 0.1, 0.014), INK, [
    face(0.12, 0.06, 0.01, 0.5),
    face(0.1, -0.06, 0.01, -0.4),
    face(0.15, -0.02, 0.01, 0.9),
    face(0.05, -0.12, 0.01, 0.2),
    face(0.045, 0.11, 0.01, -0.7),
  ]);
  decorate(glassFace, new BoxGeometry(0.035, 0.06, 0.02), GLINT, [face(0.13, 0.11, 0.012)]);
  decorate(glassFace, new BoxGeometry(0.04, 0.05, 0.02), PINK, [face(0.14, -0.08, 0.008, 0.3)]);
  /** A point of the head, from its centre: to his left, up and forward. */
  const H = (x: number, y: number, z: number): Point => P(0.21 + z, x, 1.97 + y);
  const cap = H(0, 0.05, -0.05);
  ball(0.215 * k, HAIR, cap[0], cap[1] - 0.215 * k, cap[2], { delay: D + 0.46 });
  [
    [[0, 0.19, -0.03], [0.02, 0.38, -0.22]],
    [[-0.11, 0.16, -0.05], [-0.2, 0.3, -0.3]],
    [[0.11, 0.16, -0.05], [0.21, 0.31, -0.27]],
    [[0, 0.1, -0.15], [0, 0.14, -0.44]],
    [[-0.16, 0.05, -0.1], [-0.3, 0.04, -0.32]],
    [[0.16, 0.05, -0.1], [0.3, 0.07, -0.32]],
    [[-0.05, 0.17, 0.1], [-0.13, 0.07, 0.22]],
  ].forEach(([from, to], i) =>
    limb(kit, H(from[0], from[1], from[2]), H(to[0], to[1], to[2]), 0.075 * k, 0, HAIR, { delay: D + 0.5 + i * 0.02, ink: 1.1 }),
  );

  // Splinters of him on the ground round his feet.
  [
    [-0.2, 1.0, 0.4],
    [0.25, 0.4, 1.4],
    [-0.85, 0.6, 2.2],
    [0.3, 1.1, 0.9],
    [-0.5, -0.3, 2.8],
    [0.0, 1.35, 1.9],
    [-1.15, 0.2, 0.6],
  ].forEach(([x, z, angle], i) =>
    add(faceted(new OctahedronGeometry(0.075, 0).scale(0.5, 1.5, 0.3)), i % 3 ? GLASS : PINK, x, F, z, {
      delay: 1.5 + i * 0.03,
      ink: 1.12,
      rotation: [Math.PI / 2, angle, 0],
    }),
  );

  // The arc of shards: from his hand, out and round, into the column.
  const start = new Vector3(...wrist).addScaledVector(along, 0.42);
  const hit = new Vector3(B[0], F + 0.22 + HIT_Y, B[2]).addScaledVector(normal, BR + 0.01);
  const arc = new CatmullRomCurve3([
    start,
    new Vector3(1.15, F + 2.65, 0.95),
    new Vector3(1.85, F + 2.5, 0.45),
    new Vector3(1.98, F + 1.85, -0.05),
    hit,
  ]);
  /** The arc again, bowed up or down in its middle: a speed line beside the shards. */
  const bowed = (offset: number) =>
    new CatmullRomCurve3(arc.getPoints(24).map((point, n, all) => point.clone().setY(point.y + offset * Math.sin((Math.PI * n) / (all.length - 1)))));
  line(kit, bowed(0.09), 0.013, MAGENTA, 1.55);
  line(kit, bowed(-0.09), 0.013, CYAN, 1.58);
  const tones = [GLASS, GLINT, GLASS, PINK, GLASS_DEEP, GLINT, GLASS];
  const shards = Array.from({ length: 14 }, (_, i) =>
    add(faceted(new OctahedronGeometry(0.07 + (i % 3) * 0.02, 0).scale(0.5, 1.6, 0.3)), tones[i % tones.length], 0, 0, 0, {
      delay: 1.6 + i * 0.03,
      ink: 1.15,
    }),
  );
  // Where they strike: a burst of light and chips of stone.
  const tangent = new Vector3(-normal.z, 0, normal.x);
  const burst = Array.from({ length: 7 }, (_, n) => {
    const angle = (n / 7) * Math.PI * 2;
    const direction = normal
      .clone()
      .multiplyScalar(0.7)
      .addScaledVector(tangent, Math.cos(angle))
      .add(new Vector3(0, Math.sin(angle), 0))
      .normalize();
    const tip = hit.clone().addScaledVector(direction, 0.18 + (n % 2) * 0.12);
    return zigzag(kit, [[hit.x, hit.y, hit.z], [tip.x, tip.y, tip.z]], 0.032, n % 2 ? CYAN : GLINT, 1.7 + n * 0.01);
  }).flat();
  const chips = [0, 1, 2].map((i) => box(0.08, 0.06, 0.07, STONE_LIGHT, hit.x, hit.y, hit.z, { delay: 1.75 + i * 0.03, noInk: true }));
  motes(10, GLINT, 0.025, [0.3, F + 0.6, -0.6], [2.0, F + 2.6, 1.1], 1.8);

  const point = new Vector3();
  const lampOn = new Color(YELLOW);
  const lampDim = new Color(0x9c7a14);
  tick((t) => {
    shards.forEach((shard, i) => {
      const u = (t * 0.32 + i / shards.length) % 1;
      arc.getPointAt(u, point);
      shard.position.copy(point);
      shard.rotation.set(t * 5 + i, t * 3 + i * 2, i * 0.7);
      shard.visible = u < 0.97;
    });
    const beat = Math.floor(t * 8);
    burst.forEach((spike, n) => (spike.visible = (beat + n) % 3 !== 0));
    chips.forEach((chip, i) => {
      const u = (t * 0.6 + i / chips.length) % 1;
      const out = 0.04 + u * 0.4;
      const side = (i - 1) * 0.14;
      chip.position.set(hit.x + normal.x * out + tangent.x * side, hit.y - u * u * (hit.y - F), hit.z + normal.z * out + tangent.z * side);
      chip.rotation.set(u * 5 + i, i, u * 4);
      chip.visible = u < 0.96;
    });
    // The lamps flicker now and then as the shards strike.
    bulbs.forEach((bulb, i) => {
      const noise = Math.sin((beat + i * 7) * 12.9898) * 43758.5453;
      colorOf(bulb).lerpColors(lampOn, lampDim, beat > 0 && noise - Math.floor(noise) > 0.82 ? 1 : 0);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
