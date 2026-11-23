import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
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
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** How much bigger than a sensible shopping bag hers is. */
const BAG_SIZE = 1.2;

/** The radius of the shopping bag at height y: full and round at the foot, narrower at the mouth. */
function sackRadius(y: number): number {
  if (y < 0.08) return 0.37 + 0.06 * Math.sin((Math.PI / 2) * (y / 0.08));
  return 0.43 - 0.1 * ((Math.min(y, 0.7) - 0.08) / 0.62) ** 1.5;
}

/** A piece of the shopping bag's cloth, from one height to another and round an arc; `closed` gives it a bottom. */
function sack(from: number, to: number, grow: number, closed = false, phi = 0, arc = Math.PI * 2): LatheGeometry {
  const points: Vector2[] = closed ? [new Vector2(0, from)] : [];
  for (let k = 0; k <= 8; k++) {
    const y = from + ((to - from) * k) / 8;
    points.push(new Vector2(sackRadius(y) * grow, y));
  }
  return new LatheGeometry(points, Math.max(2, Math.round((20 * arc) / (Math.PI * 2))), phi, arc).scale(1.1 * BAG_SIZE, BAG_SIZE, 0.75 * BAG_SIZE);
}

/**
 * Wardmother (P004): the old fortune-teller of the market reads the future at her stall at night,
 * under a striped awning and a bare bulb: tarot cards fanned on the cloth, a crystal ball glowing,
 * lemons on a fallen column drum and fish on ice, and three cards circling over her raised hand
 * while her eyes glow. The price shows: with her other hand she tugs at her huge tartan shopping
 * bag, which does not budge, and the phone she put down on her rug rings and rings, because she
 * has no idea how to answer it.
 */
export function wardmother(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x262230;
  const RUG = 0x4a1838;
  const RUG_EDGE = 0x2a8a9a;
  const WOOD = 0x5e4a3a;
  const WOOD_DARK = 0x3e3028;
  const CLOTH = 0x1f4f5e;
  const AWNING = 0x1f5d6e;
  const VALANCE = 0x8a1f4c;
  const POLE = 0x3a3440;
  const LEAF = 0x3f9a5c;
  const LEEK = 0xd8e8c8;
  const FISH = 0x9fb6c8;
  const ICE = 0xd8f4ff;
  const PHONE = 0x1a1a22;
  const STAND = 0x3a2a3a;
  const CARD = 0xeee4cc;
  const VIOLET = 0xb06bff;
  const SHAWL = 0xb02a60;
  const FLOWER = 0xff7aa8;
  const FLOWER_TEAL = 0x2fb0b8;
  const DRESS = 0x1d3d4a;
  const SKIN = 0xd9b090;
  const SKIN_DARK = 0xb48a6a;
  const HAIR = 0xcfcad4;
  const EYES = 0xc45cff;
  const SHOE = 0x1a1418;
  const BAG = 0x2a6a7a;
  const SWEAT = 0x9fe8ff;

  const F = octagonBase(kit, SLAB);

  /** Adds a shape so that its own centre, not its lowest point, lands on the given spot. */
  const centred = (geometry: BufferGeometry, color: number, at: Point, delay: number, flat = true): Group => {
    geometry.computeBoundingBox();
    const low = geometry.boundingBox?.min.y ?? 0;
    return add(geometry, color, at[0], at[1] + low, at[2], { delay, flat, noInk: flat });
  };

  // Her rug on the street, in front of the stall.
  const rug = box(1.5, 0.015, 1.1, RUG, 0.45, F, 0.5, { delay: 0.1, noInk: true });
  decorate(rug, new BoxGeometry(1.4, 0.004, 0.04), RUG_EDGE, [
    [0, 0.017, -0.48],
    [0, 0.017, 0.48],
  ]);
  decorate(rug, new BoxGeometry(0.04, 0.004, 1.0), RUG_EDGE, [
    [-0.68, 0.017, 0],
    [0.68, 0.017, 0],
  ]);
  decorate(
    rug,
    new BoxGeometry(0.06, 0.004, 0.012),
    CARD,
    Array.from({ length: 6 }, (_, k) => [-0.78, 0.01, -0.45 + k * 0.18] as Point),
  );

  // The stall: a table under a cloth, the striped awning on four poles, a bare bulb hanging.
  const TX = -0.7;
  const TZ = -0.78;
  [
    [-0.74, -0.25],
    [0.74, -0.25],
    [-0.74, 0.25],
    [0.74, 0.25],
  ].forEach(([dx, dz], i) => box(0.06, 0.72, 0.06, WOOD_DARK, TX + dx, F, TZ + dz, { delay: 0.14 + i * 0.02 }));
  box(1.6, 0.06, 0.6, WOOD, TX, F + 0.72, TZ, { delay: 0.18 });
  box(1.66, 0.025, 0.66, CLOTH, TX, F + 0.78, TZ, { delay: 0.2 });
  const drape = box(1.66, 0.7, 0.025, CLOTH, TX, F + 0.1, TZ + 0.34, { delay: 0.22 });
  decorate(drape, new BoxGeometry(1.66, 0.03, 0.01), MAGENTA, [
    [0, 0.16, 0.014],
    [0, 0.58, 0.014],
  ]);
  decorate(
    drape,
    new BoxGeometry(0.06, 0.06, 0.01),
    MAGENTA,
    Array.from({ length: 9 }, (_, k) => [-0.72 + k * 0.18, 0.37, 0.014, Math.PI / 4] as [number, number, number, number]),
  );
  decorate(
    drape,
    new BoxGeometry(0.016, 0.07, 0.016),
    MAGENTA,
    Array.from({ length: 14 }, (_, k) => [-0.78 + k * 0.12, -0.03, 0] as Point),
  );
  const T = F + 0.805;

  const AX = -0.35;
  const AZ = -0.7;
  const TILT = 0.32;
  [
    [-1.62, -1.25, 2.58],
    [0.92, -1.25, 2.58],
    [-1.62, -0.13, 2.2],
    [0.92, -0.13, 2.2],
  ].forEach(([x, z, h], i) => cylinder(0.03, 0.035, h, POLE, x, F, z, { delay: 0.26 + i * 0.03 }, 8));
  const awning = box(2.7, 0.04, 1.3, AWNING, AX, F + 2.42, AZ, { delay: 0.4, rotation: [TILT, 0, 0] });
  const stripes = Array.from({ length: 6 }, (_, k) => -1.12 + k * 0.45);
  decorate(awning, new BoxGeometry(0.22, 0.004, 1.3), MAGENTA, stripes.map((x) => [x, 0.042, 0] as Point));
  decorate(awning, new BoxGeometry(0.22, 0.004, 1.3), MAGENTA, stripes.map((x) => [x, -0.002, 0] as Point));
  const edgeY = F + 2.42 - 0.65 * Math.sin(TILT);
  const edgeZ = AZ + 0.65 * Math.cos(TILT);
  const valance = box(2.72, 0.1, 0.02, VALANCE, AX, edgeY - 0.08, edgeZ, { delay: 0.46 });
  const scallops = Array.from({ length: 12 }, (_, k) => -1.24 + k * 0.225);
  decorate(
    valance,
    new CircleGeometry(0.1, 10, Math.PI, Math.PI),
    MAGENTA,
    scallops.filter((_, k) => k % 2 === 0).map((x) => [x, 0.002, 0] as Point),
  ).side = DoubleSide;
  decorate(
    valance,
    new CircleGeometry(0.1, 10, Math.PI, Math.PI),
    AWNING,
    scallops.filter((_, k) => k % 2 === 1).map((x) => [x, 0.002, 0] as Point),
  ).side = DoubleSide;
  const BULB_X = -1.15;
  const BULB_Z = -0.95;
  box(0.012, 0.85, 0.012, INK, BULB_X, F + 1.62, BULB_Z, { delay: 0.5, noInk: true });
  cylinder(0.035, 0.035, 0.06, PHONE, BULB_X, F + 1.57, BULB_Z, { delay: 0.52 });
  const bulb = ball(0.065, YELLOW, BULB_X, F + 1.45, BULB_Z, { delay: 0.54, flat: true });

  // A crate of lemons by the table's end, set on a fallen column drum, as the market does.
  const LX = -1.45;
  const LZ = -0.08;
  const drum = cylinder(0.22, 0.23, 0.3, 0xb7aec4, LX, F, LZ, { delay: 0.52 }, 16);
  decorate(
    drum,
    new BoxGeometry(0.02, 0.3, 0.02),
    0x8a829a,
    Array.from({ length: 12 }, (_, k) => [Math.sin((k / 12) * Math.PI * 2) * 0.225, 0.15, Math.cos((k / 12) * Math.PI * 2) * 0.225] as Point),
  );
  const LY = F + 0.3;
  const crate = box(0.46, 0.2, 0.36, WOOD, LX, LY, LZ, { delay: 0.56, rotation: [0, 0.5, 0] });
  decorate(crate, new BoxGeometry(0.46, 0.02, 0.01), WOOD_DARK, [
    [0, 0.07, 0.182],
    [0, 0.14, 0.182],
  ]);
  [
    [-0.13, -0.08],
    [0, -0.09],
    [0.13, -0.07],
    [-0.12, 0.06],
    [0.01, 0.07],
    [0.13, 0.07],
    [-0.05, 0, 0.07],
    [0.07, -0.01, 0.07],
  ].forEach(([dx, dz, up = 0], i) =>
    add(new SphereGeometry(0.068, 10, 8).scale(1.3, 1, 1), YELLOW, LX + dx * Math.cos(0.5) + dz * Math.sin(0.5), LY + 0.14 + up, LZ - dx * Math.sin(0.5) + dz * Math.cos(0.5), {
      delay: 0.6 + i * 0.02,
      ink: 1.1,
      rotation: [0, i * 0.7, 0],
    }),
  );
  // On the table: the tarot cards fanned out and the crystal ball.
  const fan = { x: -0.85, z: -0.5 };
  for (let k = 0; k < 5; k++) {
    const a = -0.6 + k * 0.3;
    const card = box(0.14, 0.008, 0.22, CARD, fan.x + Math.sin(a) * 0.12, T + k * 0.003, fan.z - Math.cos(a) * 0.12, {
      delay: 0.72 + k * 0.03,
      rotation: [0, -a, 0],
      ink: 1.08,
    });
    decorate(card, new BoxGeometry(0.1, 0.004, 0.17), k % 2 ? CYAN : MAGENTA, [[0, 0.01, 0]]);
    decorate(card, new BoxGeometry(0.04, 0.005, 0.04), YELLOW, [[0, 0.012, 0]]);
  }
  const BX = -1.15;
  const BZ = -0.86;
  cylinder(0.07, 0.11, 0.07, STAND, BX, T, BZ, { delay: 0.76 });
  cylinder(0.09, 0.09, 0.02, STAND, BX, T + 0.07, BZ, { delay: 0.78 });
  const orb = ball(0.17, CYAN, BX, T + 0.06, BZ, { delay: 0.82, flat: true });
  decorate(orb, new SphereGeometry(0.035, 8, 6), 0xffffff, [[-0.06, 0.26, 0.11]]);
  motes(8, VIOLET, 0.022, [BX - 0.14, T + 0.3, BZ - 0.12], [BX + 0.14, T + 0.85, BZ + 0.12], 1.2);

  // A crate of fish on ice on the ground, and two lemons that rolled away.
  const fishCrate = box(0.55, 0.16, 0.38, WOOD, -1.2, F, 0.55, { delay: 0.6, rotation: [0, 0.25, 0] });
  decorate(fishCrate, new BoxGeometry(0.5, 0.03, 0.33), ICE, [[0, 0.16, 0]]);
  decorate(fishCrate, new BoxGeometry(0.55, 0.02, 0.01), WOOD_DARK, [[0, 0.08, 0.192]]);
  [
    [-1.32, 0.5, 0.5],
    [-1.18, 0.6, -0.3],
    [-1.06, 0.48, 0.2],
  ].forEach(([x, z, turn], i) => {
    const fish = add(new SphereGeometry(0.055, 12, 8).scale(2.6, 0.7, 1), FISH, x, F + 0.17, z, { delay: 0.66 + i * 0.03, rotation: [0, turn + 0.25, 0] });
    decorate(fish, new ConeGeometry(0.05, 0.08, 4).rotateZ(-Math.PI / 2).scale(1, 1, 0.3), FISH, [[0.17, 0.04, 0]]);
    decorate(fish, new BoxGeometry(0.018, 0.018, 0.012), INK, [
      [-0.1, 0.05, 0.045],
      [-0.1, 0.05, -0.045],
    ]);
  });
  [
    [-0.5, 1.3],
    [0.95, 1.3],
  ].forEach(([x, z], i) => add(new SphereGeometry(0.068, 10, 8).scale(1.3, 1, 1), YELLOW, x, F, z, { delay: 0.7 + i * 0.03, ink: 1.1, rotation: [0, 0.8 + i, 0] }));

  // Her phone, put down on the rug: it rings and rings, and she has no idea how to answer it.
  const PX = 0.02;
  const PZ = 0.88;
  const phone = box(0.14, 0.022, 0.25, PHONE, PX, F + 0.015, PZ, { delay: 0.74, rotation: [0, 0.45, 0] });
  decorate(phone, new BoxGeometry(0.12, 0.004, 0.21), CYAN, [[0, 0.024, 0]]);
  decorate(phone, new BoxGeometry(0.065, 0.004, 0.007), INK, [
    [-0.02, 0.027, -0.035],
    [0.025, 0.027, 0.045],
  ]);
  decorate(phone, new BoxGeometry(0.007, 0.004, 0.07), INK, [
    [0.01, 0.027, 0.005],
    [-0.055, 0.027, -0.06],
  ]);
  const rings = [0.15, 0.23].flatMap((radius, k) =>
    [-1, 1].map((side) =>
      centred(
        new TorusGeometry(radius, 0.016, 4, 12, 1.4).rotateZ(side > 0 ? -0.7 : Math.PI - 0.7),
        YELLOW,
        [PX, F + 0.1, PZ],
        0.8 + k * 0.03,
      ),
    ),
  );

  // Her huge shopping bag, striped, leeks sticking out of it.
  const x0 = 0.6;
  const z0 = 0.35;
  const QX = x0 + 0.85;
  const QZ = z0 + 0.3;
  const QW = 0.47 * BAG_SIZE;
  const mouth = 0.7 * BAG_SIZE;
  const bag = add(sack(0, 0.7, 1, true), BAG, QX, F, QZ, { delay: 0.8 });
  // A tartan: magenta bands both ways, thin dark lines between them, a dark hem at the mouth.
  decorate(bag, sack(0.14, 0.24, 1.012), MAGENTA, [[0, 0, 0]]);
  decorate(bag, sack(0.42, 0.52, 1.012), MAGENTA, [[0, 0, 0]]);
  for (let k = 0; k < 8; k++) decorate(bag, sack(0.02, 0.64, 1.016, false, (k / 8) * Math.PI * 2, 0.22), MAGENTA, [[0, 0, 0]]);
  for (let k = 0; k < 8; k++) decorate(bag, sack(0.02, 0.64, 1.02, false, ((k + 0.5) / 8) * Math.PI * 2, 0.04), INK, [[0, 0, 0]]);
  decorate(bag, sack(0.32, 0.335, 1.02), INK, [[0, 0, 0]]);
  decorate(bag, sack(0.62, 0.7, 1.02), 0x1b4a56, [[0, 0, 0]]);
  decorate(bag, new CircleGeometry(sackRadius(0.7) * 0.98 * BAG_SIZE, 20).rotateX(-Math.PI / 2).scale(1.1, 1, 0.75), 0x14303a, [[0, mouth - 0.002, 0]]);
  decorate(bag, new TorusGeometry(0.2, 0.03, 6, 16, Math.PI), INK, [
    [0, mouth - 0.01, 0.17],
    [0, mouth - 0.01, -0.17],
  ]);
  const leeks: [number, number, number][] = [
    [0.08, 0.02, -0.4],
    [-0.04, -0.06, -0.15],
    [0.16, -0.08, -0.65],
  ];
  const along = (x: number, lean: number, d: number): [number, number] => [x - Math.sin(lean) * d, mouth + 0.02 + Math.cos(lean) * d];
  decorate(
    bag,
    new CylinderGeometry(0.04, 0.045, 0.46, 8),
    LEEK,
    leeks.map(([x, z, lean]) => [along(x, lean, 0.13)[0], along(x, lean, 0.13)[1], z, lean] as [number, number, number, number]),
  );
  decorate(
    bag,
    new CylinderGeometry(0.06, 0.035, 0.24, 6),
    LEAF,
    leeks.map(([x, z, lean]) => [along(x, lean, 0.47)[0], along(x, lean, 0.47)[1], z, lean] as [number, number, number, number]),
  );
  decorate(bag, new ConeGeometry(0.07, 0.12, 4).scale(1, 1, 0.3), FISH, [[-0.24, mouth + 0.08, 0.04, 0.5]]);
  const strain = [
    [-1, 0.04],
    [-1, 0.16],
    [1, 0.08],
  ].map(([side, y], i) => box(0.09, 0.016, 0.016, 0xf2f0ea, QX + side * (QW + 0.1), F + y, QZ + 0.1, { delay: 1.9 + i * 0.03, flat: true, noInk: true }));

  // Wardmother: an old woman, hunched, in a flowered shawl over a long dark dress.
  const D = 0.95;
  [-1, 1].forEach((side, i) => box(0.13, 0.08, 0.2, SHOE, x0 + side * 0.1, F, z0 + 0.2, { delay: D + i * 0.02 }));
  const skirt = add(new CylinderGeometry(0.28, 0.46, 0.86, 20).scale(1, 1, 0.85), DRESS, x0, F + 0.04, z0, { delay: D + 0.04 });
  decorate(
    skirt,
    new SphereGeometry(0.03, 6, 4),
    FLOWER,
    [-1.3, -0.85, -0.4, 0, 0.4, 0.85, 1.3].map((a) => [Math.sin(a) * 0.445, 0.1, Math.cos(a) * 0.445 * 0.85] as Point),
  );
  add(new CylinderGeometry(0.3, 0.3, 0.5, 16).scale(1, 1, 0.8), DRESS, x0, F + 0.86, z0 + 0.02, { delay: D + 0.08, rotation: [0.15, 0, 0] });
  const shawl = add(new CylinderGeometry(0.18, 0.5, 0.62, 20).scale(1, 1, 0.82), SHAWL, x0, F + 0.98, z0 + 0.05, { delay: D + 0.12, rotation: [0.12, 0, 0] });
  const onShawl = (a: number, h: number): Point => {
    const r = 0.5 - 0.32 * (h / 0.62) + 0.01;
    return [Math.sin(a) * r, h, Math.cos(a) * r * 0.82];
  };
  decorate(
    shawl,
    new SphereGeometry(0.035, 6, 4),
    FLOWER,
    [
      [-1.2, 0.12],
      [-0.4, 0.1],
      [0.4, 0.12],
      [1.2, 0.1],
      [-0.8, 0.32],
      [0, 0.3],
      [0.8, 0.32],
      [2.0, 0.15],
      [-2.0, 0.15],
      [3.1, 0.25],
    ].map(([a, h]) => onShawl(a, h)),
  );
  decorate(
    shawl,
    new SphereGeometry(0.03, 6, 4),
    FLOWER_TEAL,
    [
      [-0.8, 0.1],
      [0, 0.12],
      [0.8, 0.1],
      [-0.4, 0.3],
      [0.4, 0.3],
      [2.5, 0.2],
      [-2.5, 0.2],
    ].map(([a, h]) => onShawl(a, h)),
  );
  decorate(
    shawl,
    new BoxGeometry(0.018, 0.1, 0.018),
    VALANCE,
    Array.from({ length: 16 }, (_, k) => {
      const a = (k / 16) * Math.PI * 2;
      return [Math.sin(a) * 0.5, -0.04, Math.cos(a) * 0.41] as Point;
    }),
  );

  // Her head: glowing eyes under the shawl, grey hair, a big nose, coins at her ears.
  const hc = F + 1.84;
  const hz = z0 + 0.12;
  const head = add(new SphereGeometry(0.2, 18, 14).scale(0.95, 1.05, 0.95), SKIN, x0, hc - 0.21, hz, { delay: D + 0.3 });
  const cy = 0.21;
  const eyes = decorate(head, new BoxGeometry(0.07, 0.042, 0.02), EYES, [
    [-0.066, cy + 0.03, 0.178],
    [0.066, cy + 0.03, 0.178],
  ]);
  decorate(head, new BoxGeometry(0.03, 0.022, 0.02), 0xffffff, [
    [-0.066, cy + 0.03, 0.183],
    [0.066, cy + 0.03, 0.183],
  ]);
  decorate(head, new BoxGeometry(0.078, 0.022, 0.03), HAIR, [
    [-0.064, cy + 0.08, 0.162, -0.15],
    [0.064, cy + 0.08, 0.162, 0.15],
  ]);
  decorate(head, new BoxGeometry(0.052, 0.1, 0.07), SKIN_DARK, [[0, cy - 0.02, 0.185]]);
  decorate(head, new BoxGeometry(0.07, 0.012, 0.01), INK, [[0, cy - 0.1, 0.172]]);
  decorate(head, new BoxGeometry(0.035, 0.007, 0.01), INK, [
    [-0.1, cy - 0.06, 0.158, 0.6],
    [0.1, cy - 0.06, 0.158, -0.6],
    [-0.108, cy + 0.02, 0.16, -0.3],
    [0.108, cy + 0.02, 0.16, 0.3],
    [-0.06, cy - 0.12, 0.15, -0.5],
    [0.06, cy - 0.12, 0.15, 0.5],
  ]);
  // Grey hair under the shawl: a band over the brow, tufts by the cheeks.
  add(new SphereGeometry(0.17, 14, 10).scale(1.05, 0.4, 0.85), HAIR, x0, hc + 0.135 - 0.068, hz + 0.03, { delay: D + 0.34, ink: 1.04 });
  [-1, 1].forEach((side, i) => ball(0.065, HAIR, x0 + side * 0.155, hc - 0.09, hz + 0.04, { delay: D + 0.36 + i * 0.02, ink: 1.1 }));
  const HR = 0.245;
  const hood = add(new SphereGeometry(HR, 18, 12, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, Math.PI * 0.72), SHAWL, x0, hc + 0.02 + HR * Math.cos(Math.PI * 0.72), hz - 0.02, {
    delay: D + 0.4,
  });
  add(new SphereGeometry(HR + 0.004, 18, 6, 0, Math.PI * 2, 0, Math.PI * 0.3), SHAWL, x0, hc + 0.02 + (HR + 0.004) * Math.cos(Math.PI * 0.3), hz - 0.02, {
    delay: D + 0.42,
  });
  const onHood = (phi: number, theta: number): Point => [-HR * Math.cos(phi) * Math.sin(theta) * 1.01, -HR * Math.cos(Math.PI * 0.72) + HR * Math.cos(theta) * 1.01, HR * Math.sin(phi) * Math.sin(theta) * 1.01];
  decorate(
    hood,
    new SphereGeometry(0.03, 6, 4),
    FLOWER,
    [
      [0.2, 0.5],
      [2.9, 0.5],
      [-0.6, 0.6],
      [-1.6, 0.4],
      [-2.4, 0.6],
      [0.5, 1.1],
      [2.6, 1.1],
    ].map(([phi, theta]) => onHood(phi, theta)),
  );
  decorate(
    hood,
    new SphereGeometry(0.026, 6, 4),
    FLOWER_TEAL,
    [
      [0.0, 0.9],
      [3.1, 0.9],
      [-1.0, 0.9],
      [-2.0, 0.95],
      [1.5, 0.15],
    ].map(([phi, theta]) => onHood(phi, theta)),
  );
  [-1, 1].forEach((side, i) =>
    add(new CylinderGeometry(0.04, 0.04, 0.012, 12).rotateX(Math.PI / 2), YELLOW, x0 + side * 0.18, hc - 0.22, hz + 0.02, { delay: D + 0.46 + i * 0.02, ink: 1.12 }),
  );

  // Her right hand raised, palm up: three cards circle over it round a glowing stone.
  const shoulderR: Point = [x0 - 0.34, F + 1.5, z0 + 0.05];
  const elbowR: Point = [x0 - 0.58, F + 1.18, z0 + 0.3];
  const handR: Point = [x0 - 0.5, F + 1.48, z0 + 0.55];
  limb(kit, shoulderR, elbowR, 0.12, 0.1, SHAWL, { delay: D + 0.2 });
  ball(0.1, SHAWL, elbowR[0], elbowR[1] - 0.1, elbowR[2], { delay: D + 0.22 });
  limb(kit, elbowR, handR, 0.085, 0.065, DRESS, { delay: D + 0.24 });
  const wrist = aim(elbowR, handR);
  [0.72, 0.84].forEach((u, k) =>
    add(new TorusGeometry(0.075, 0.016, 6, 16).rotateX(Math.PI / 2), YELLOW, ...([0, 1, 2].map((j) => elbowR[j] + (handR[j] - elbowR[j]) * u) as Point), {
      delay: D + 0.3 + k * 0.03,
      noInk: true,
      rotation: wrist.rotation,
    }),
  );
  add(new SphereGeometry(0.08, 12, 8).scale(1, 0.55, 1.1), SKIN, handR[0], handR[1] - 0.02, handR[2], { delay: D + 0.28 });
  [
    [-0.06, 0.06],
    [-0.02, 0.08],
    [0.02, 0.08],
    [0.06, 0.06],
  ].forEach(([dx, dz], i) =>
    limb(kit, [handR[0] + dx, handR[1] + 0.02, handR[2] + dz * 0.6], [handR[0] + dx * 1.3, handR[1] + 0.12, handR[2] + dz + 0.04], 0.018, 0.014, SKIN, {
      delay: D + 0.3 + i * 0.02,
      ink: 1.15,
    }),
  );
  limb(kit, [handR[0] + 0.07, handR[1], handR[2] - 0.02], [handR[0] + 0.12, handR[1] + 0.07, handR[2] + 0.02], 0.02, 0.016, SKIN, { delay: D + 0.38, ink: 1.15 });
  const omen: Point = [handR[0], handR[1] + 0.34, handR[2]];
  const stone = centred(new SphereGeometry(0.06, 8, 6).scale(1, 1.2, 0.8), VIOLET, omen, 1.6);
  const orbit = centred(new TorusGeometry(0.26, 0.008, 4, 40).rotateX(Math.PI / 2 + 0.45), MAGENTA, omen, 1.65);
  const floating = Array.from({ length: 3 }, (_, k) => {
    const card = box(0.14, 0.22, 0.008, CARD, omen[0], omen[1], omen[2], { delay: 1.7 + k * 0.05, ink: 1.08 });
    [-1, 1].forEach((side) => decorate(card, new BoxGeometry(0.1, 0.17, 0.004), k === 1 ? CYAN : MAGENTA, [[0, 0.11, side * 0.006]]));
    decorate(card, new BoxGeometry(0.04, 0.04, 0.012), YELLOW, [[0, 0.11, 0]]);
    return card;
  });
  motes(6, MAGENTA, 0.02, [omen[0] - 0.25, omen[1] - 0.2, omen[2] - 0.25], [omen[0] + 0.25, omen[1] + 0.35, omen[2] + 0.25], 1.8);

  // Her left hand hangs on to the bag's handle: it will not come up.
  const shoulderL: Point = [x0 + 0.34, F + 1.5, z0 + 0.05];
  const handL: Point = [QX, F + mouth + 0.19, QZ + 0.17];
  const elbowL: Point = [x0 + 0.6, F + 1.16, z0 + 0.22];
  limb(kit, shoulderL, elbowL, 0.12, 0.1, SHAWL, { delay: D + 0.2 });
  ball(0.1, SHAWL, elbowL[0], elbowL[1] - 0.1, elbowL[2], { delay: D + 0.22 });
  limb(kit, elbowL, handL, 0.085, 0.065, DRESS, { delay: D + 0.24 });
  ball(0.075, SKIN, handL[0], handL[1] - 0.06, handL[2], { delay: D + 0.28 });
  const sweat = [0, 1].map((k) =>
    add(new SphereGeometry(0.028, 8, 6).scale(0.8, 1.4, 0.8), SWEAT, x0 + 0.2 + k * 0.05, hc + 0.05, hz + 0.12, { delay: 1.9 + k * 0.05, flat: true }),
  );

  const orbFrom = new Color(CYAN);
  const orbTo = new Color(VIOLET);
  const eyesFrom = new Color(EYES);
  const eyesTo = new Color(MAGENTA);
  const bulbFrom = new Color(YELLOW);
  const bulbTo = new Color(0xfff2b0);
  const phoneRest = phone.position.clone();
  const bagRest = bag.position.y;
  const stoneRest = stone.position.y;
  tick((t) => {
    const glow = (Math.sin(t * 1.6) + 1) / 2;
    colorOf(orb).lerpColors(orbFrom, orbTo, glow);
    colorOf(stone).lerpColors(orbTo, orbFrom, glow * 0.5);
    eyes.color.lerpColors(eyesFrom, eyesTo, glow * 0.5);
    colorOf(bulb).lerpColors(bulbFrom, bulbTo, Math.max(0, Math.sin(t * 5.3) * Math.sin(t * 2.1)) * 0.6);
    // The cards circle over her hand, bobbing.
    floating.forEach((card, k) => {
      const a = t * 0.8 + (k * Math.PI * 2) / 3 + 0.5;
      card.position.set(omen[0] + Math.cos(a) * 0.24, omen[1] - 0.11 + Math.sin(t * 1.5 + k * 2) * 0.04, omen[2] + Math.sin(a) * 0.24);
      card.rotation.y = Math.PI / 2 - a;
    });
    stone.position.y = stoneRest + Math.sin(t * 2) * 0.02;
    orbit.rotation.y = t * 0.6;
    // The phone rings in bursts and buzzes on the rug.
    const ringing = (t * 0.7) % 1 < 0.6;
    const buzz = ringing ? Math.sin(t * 60) * 0.008 : 0;
    phone.position.set(phoneRest.x + buzz, phoneRest.y, phoneRest.z);
    const beat = Math.floor(t * 4) % 2 === 0;
    rings.forEach((ring, k) => (ring.visible = ringing && (k < 2 || beat)));
    // She tugs, the bag barely lifts a corner, and falls back.
    const tug = Math.max(0, Math.cos(t * 2.2)) ** 3;
    bag.rotation.z = -0.05 * tug;
    bag.position.y = bagRest + Math.sin(0.05 * tug) * QW;
    for (const mark of strain) mark.visible = tug > 0.3;
    // Sweat runs off her brow.
    sweat.forEach((drop, k) => {
      const u = (t * 0.6 + k * 0.5 + 0.3) % 1;
      drop.position.set(x0 + 0.2 + k * 0.05 + u * 0.12, hc + 0.05 - u * 0.25, hz + 0.12);
      drop.visible = u < 0.85;
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
