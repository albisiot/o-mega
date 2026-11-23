import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  OctahedronGeometry,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import {
  MAGENTA,
  INK,
  colorOf,
  octagonBase,
  aim,
  limb,
  zigzag,
  jag,
  cable,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** A cog lying flat round the origin, with its teeth and a hole for the axle, `depth` thick upwards. */
function cog(radius: number, teeth: number, depth: number): ExtrudeGeometry {
  const shape = new Shape();
  for (let i = 0; i < teeth * 4; i++) {
    const angle = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? radius : radius * 0.8;
    if (i) shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  shape.closePath();
  const hole = new Path();
  hole.absarc(0, 0, radius * 0.22, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 }).rotateX(-Math.PI / 2);
}

/** The point a share `u` of the way from one point to another. */
function between(from: Point, to: Point, u: number): Point {
  return [MathUtils.lerp(from[0], to[0], u), MathUtils.lerp(from[1], to[1], u), MathUtils.lerp(from[2], to[2], u)];
}

/**
 * Mekana (P056): she builds machines that run on spells, and by now she is more machine than
 * woman. At the edge of the temple dig, where the strings of the excavation cross over a fallen
 * column drum, her engine drinks the magic seeping out of the ground: it pulses up the pipe into
 * a glass tank, cogs turn, a circle of runes circles the tank. She raises her golden hand and
 * draws the spell up out of the pit, another circle of runes spinning round her claws. The price
 * shows: half her face is a cracked golden mask, the rest is patched with plasters and bandages,
 * and a cable from the engine is plugged into her back, because it is the engine that keeps her going.
 */
export function mekana(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x2a2228;
  const EARTH = 0x3b2b34;
  const EARTH_DARK = 0x1c1419;
  const STRATUM = 0x4f3843;
  const STRATUM_LIGHT = 0x67515b;
  const MARBLE = 0xd2c9b8;
  const MARBLE_DARK = 0x9c9384;
  const WOOD = 0x5e4a3a;
  const WOOD_DARK = 0x3e3028;
  const STRING = 0xeae4d4;
  const STEEL = 0x434859;
  const STEEL_DARK = 0x262a36;
  const CABLE = 0x17161d;
  const GOLD = 0xd4a640;
  const GOLD_DARK = 0x8f6c26;
  const PINK = 0xff9cc0;
  const COAT = 0x26223a;
  const COAT_LIGHT = 0x3a3560;
  const BLOUSE = 0x4a2a52;
  const BELT = 0x18151f;
  const BOOT = 0x1d1a24;
  const SKIN = 0xe9c6b0;
  const SKIN_DARK = 0xc99e88;
  const LIPS = 0x9c3a5c;
  const HAIR = 0x1d1626;
  const PLASTER = 0xe3cda4;
  const BANDAGE = 0xe6e0d2;
  const BANDAGE_DARK = 0xb9b2a2;

  const F = octagonBase(kit, SLAB);
  const H = 0.3;
  const G = F + H;

  // The dig: a terrace of earth with a trench cut into its front down to the old ground, the
  // layers showing on its walls.
  const PIT = { left: -1.5, right: -0.3, back: 0 };
  const PX = (PIT.left + PIT.right) / 2;
  const PW = PIT.right - PIT.left;
  const corner = (i: number): [number, number] => {
    const angle = Math.PI / 8 + (i * Math.PI) / 4;
    return [2.25 * Math.sin(angle), 2.25 * Math.cos(angle)];
  };
  // How far the slanted sides are from the centre, as |x| + |z|.
  const slant = 2.25 * (Math.sin(Math.PI / 8) + Math.cos(Math.PI / 8));
  const front = corner(0)[1];
  const rim: [number, number][] = [
    ...[0, 1, 2, 3, 4, 5, 6].map(corner),
    [PIT.left, slant + PIT.left],
    [PIT.left, PIT.back],
    [PIT.right, PIT.back],
    [PIT.right, front],
  ];
  const outline = new Shape();
  rim.forEach(([x, z], i) => (i ? outline.lineTo(x, -z) : outline.moveTo(x, -z)));
  outline.closePath();
  const terrace = add(new ExtrudeGeometry(outline, { depth: H, bevelEnabled: false }).rotateX(-Math.PI / 2), EARTH, 0, F, 0, {
    delay: 0.1,
    ink: 1.02,
  });
  const side = slant + PIT.left;
  [
    [0.07, STRATUM_LIGHT],
    [0.14, STRATUM],
    [0.22, STRATUM_LIGHT],
  ].forEach(([y, color]) => {
    decorate(terrace, new BoxGeometry(PW, 0.035, 0.01), color, [[PX, y, PIT.back + 0.006]]);
    decorate(terrace, new BoxGeometry(0.01, 0.035, side - 0.02), color, [[PIT.left + 0.006, y, side / 2]]);
  });
  decorate(terrace, new BoxGeometry(0.06, 0.04, 0.03), MARBLE_DARK, [
    [-1.2, 0.1, 0.01],
    [-0.55, 0.18, 0.01],
    [-0.85, 0.04, 0.01],
  ]);
  decorate(terrace, new BoxGeometry(0.03, 0.04, 0.06), MARBLE_DARK, [
    [PIT.left + 0.01, 0.17, 0.5],
    [PIT.left + 0.01, 0.05, 1.1],
  ]);
  decorate(terrace, new BoxGeometry(0.06, 0.04, 0.05), MARBLE_DARK, [
    [0.4, H + 0.02, -1.5],
    [0.2, H + 0.02, 1.75],
    [1.6, H + 0.02, 0.4],
    [-1.75, H + 0.02, 0.4],
  ]);
  const floor = new Shape();
  (
    [
      [PIT.left, PIT.back],
      [PIT.right, PIT.back],
      [PIT.right, front],
      [corner(7)[0], front],
      [PIT.left, side],
    ] as [number, number][]
  ).forEach(([x, z], i) => (i ? floor.lineTo(x, -z) : floor.moveTo(x, -z)));
  floor.closePath();
  add(new ExtrudeGeometry(floor, { depth: 0.006, bevelEnabled: false }).rotateX(-Math.PI / 2), EARTH_DARK, 0, F, 0, {
    delay: 0.12,
    flat: true,
    noInk: true,
  });
  [PIT.left + 0.05, PIT.right - 0.05].forEach((x, i) => box(0.08, H + 0.08, 0.08, WOOD, x, F, PIT.back + 0.05, { delay: 0.2 + i * 0.02 }));
  // The glowing seam along the floor of the trench, where the magic seeps up.
  const floorSeam = zigzag(kit, jag([PIT.left + 0.15, F + 0.01, PIT.back + 0.15], [-0.5, F + 0.01, 1.65], 7, 0.09, 4), 0.03, MAGENTA, 0.3);

  // A column drum of the old temple, half dug out, a crack of magic along it.
  const drum = add(new CylinderGeometry(0.21, 0.21, 0.55, 16).rotateZ(Math.PI / 2), MARBLE, -0.95, F - 0.1, 0.8, {
    delay: 0.3,
    rotation: [0, -0.5, 0],
  });
  decorate(
    drum,
    new BoxGeometry(0.56, 0.014, 0.014),
    MARBLE_DARK,
    [-1.1, -0.55, 0.55, 1.1].map((a) => [0, 0.21 + 0.21 * Math.cos(a), 0.21 * Math.sin(a)] as Point),
  );
  const cracks = [
    decorate(drum, new BoxGeometry(0.5, 0.02, 0.024), MAGENTA, [[0, 0.42, 0]]),
    decorate(drum, new BoxGeometry(0.012, 0.1, 0.022).rotateX(0.5), MAGENTA, [[0.28, 0.27, -0.03]]),
    decorate(drum, new BoxGeometry(0.012, 0.1, 0.022).rotateX(-0.6), MAGENTA, [[0.28, 0.18, 0.02]]),
    decorate(drum, new BoxGeometry(0.012, 0.09, 0.022).rotateX(0.4), MAGENTA, [[0.28, 0.1, -0.02]]),
  ];

  // A fallen capital of the temple, lying on its side on the terrace.
  const KX = 1.2;
  const KZ = 1.05;
  const turn = 0.6;
  const sink = 0.05;
  const bell = [
    [0, 0],
    [0.16, 0],
    [0.16, 0.07],
    [0.175, 0.085],
    [0.21, 0.125],
    [0.245, 0.165],
    [0.26, 0.19],
    [0, 0.19],
  ].map(([r, h]) => new Vector2(r, h));
  const capital = add(new LatheGeometry(bell, 20).rotateZ(-Math.PI / 2), MARBLE, KX, G - sink, KZ, { delay: 0.32, rotation: [0, turn, 0] });
  decorate(
    capital,
    new BoxGeometry(0.07, 0.014, 0.014),
    MARBLE_DARK,
    [-1.2, -0.6, 0, 0.6, 1.2].map((a) => [0.035, 0.26 + 0.162 * Math.cos(a), 0.162 * Math.sin(a)] as Point),
  );
  decorate(capital, new TorusGeometry(0.172, 0.012, 6, 24).rotateY(Math.PI / 2), MARBLE_DARK, [[0.075, 0.26, 0]]);
  box(0.1, 0.52, 0.52, MARBLE, KX + Math.cos(turn) * 0.24, G - sink, KZ - Math.sin(turn) * 0.24, { delay: 0.34, rotation: [0, turn, 0] });

  // The excavation's strings across the trench, on their stakes, and the diggers' ladder.
  [0.55, 1.15].forEach((z, i) => {
    [PIT.left - 0.12, PIT.right + 0.1].forEach((x, k) => cylinder(0.022, 0.022, 0.26, WOOD, x, G, z, { delay: 0.4 + i * 0.04 + k * 0.02 }));
    box(PW + 0.22, 0.008, 0.008, STRING, PX - 0.01, G + 0.21, z, { delay: 0.5 + i * 0.02, flat: true, noInk: true });
  });
  const ladderFoot = 0.28;
  const ladderTop = -0.12;
  [-1.36, -1.2].forEach((x, i) =>
    limb(kit, [x, F, ladderFoot], [x, G + 0.38, ladderTop], 0.018, 0.018, WOOD, { delay: 0.45 + i * 0.02 }),
  );
  for (let k = 1; k <= 5; k++) {
    const u = k / 6;
    box(0.16, 0.025, 0.025, WOOD, -1.28, F + u * (H + 0.38) - 0.0125, ladderFoot + u * (ladderTop - ladderFoot), { delay: 0.5 + k * 0.02, noInk: true });
  }

  // Her workbench at the back: a vice, cogs, a vial of spell and a spare claw.
  const BX = -1.15;
  const BZ = -0.95;
  const BH = 0.6;
  (
    [
      [-0.36, -0.17],
      [0.36, -0.17],
      [-0.36, 0.17],
      [0.36, 0.17],
    ] as [number, number][]
  ).forEach(([dx, dz], i) => box(0.05, BH, 0.05, WOOD_DARK, BX + dx, G, BZ + dz, { delay: 0.3 + i * 0.02 }));
  box(0.85, 0.06, 0.42, WOOD, BX, G + BH, BZ, { delay: 0.36 });
  const BT = G + BH + 0.06;
  box(0.12, 0.12, 0.14, STEEL, BX - 0.28, BT, BZ, { delay: 0.6 });
  box(0.04, 0.03, 0.2, STEEL_DARK, BX - 0.28, BT + 0.12, BZ, { delay: 0.62, noInk: true });
  add(cog(0.12, 8, 0.03), GOLD, BX + 0.05, BT, BZ + 0.05, { delay: 0.62 });
  add(cog(0.08, 6, 0.03), GOLD_DARK, BX + 0.18, BT, BZ - 0.1, { delay: 0.64 });
  const vial = cylinder(0.045, 0.045, 0.16, MAGENTA, BX + 0.32, BT, BZ + 0.08, { delay: 0.66, flat: true });
  cylinder(0.03, 0.03, 0.04, GOLD_DARK, BX + 0.32, BT + 0.16, BZ + 0.08, { delay: 0.68 });
  add(new ConeGeometry(0.028, 0.22, 6), GOLD, BX - 0.06, BT + 0.028, BZ - 0.08, { delay: 0.7, rotation: [0, 0.5, Math.PI / 2] });

  // The engine: a glass tank of spell in a golden cage, a dome, a bulb, and cogs at its side.
  const MX = 0.95;
  const MZ = -0.8;
  cylinder(0.5, 0.56, 0.22, STEEL_DARK, MX, G, MZ, { delay: 0.4 }, 8);
  cylinder(0.4, 0.42, 0.14, GOLD, MX, G + 0.22, MZ, { delay: 0.44 });
  const tank = cylinder(0.32, 0.32, 1.3, MAGENTA, MX, G + 0.36, MZ, { delay: 0.48, flat: true });
  const swirl = decorate(
    tank,
    new BoxGeometry(0.026, 0.18, 0.02),
    PINK,
    [
      [0.1, 0.25, 0.5],
      [0.5, 0.45, -0.6],
      [0, 0.72, -0.4],
      [0.75, 0.85, 0.7],
      [0.25, 1.05, -0.5],
      [0.95, 0.35, 0.3],
      [-0.3, 0.55, 0.6],
      [0.6, 1.15, 0.2],
    ].map(([angle, y, lean]) => [Math.sin(angle) * 0.322, y, Math.cos(angle) * 0.322, lean] as [number, number, number, number]),
  );
  for (let k = 0; k < 6; k++) {
    const angle = Math.PI / 6 + (k * Math.PI) / 3;
    cylinder(0.022, 0.022, 1.3, GOLD_DARK, MX + Math.sin(angle) * 0.355, G + 0.36, MZ + Math.cos(angle) * 0.355, { delay: 0.52 + k * 0.015 });
  }
  cylinder(0.42, 0.4, 0.14, GOLD, MX, G + 1.66, MZ, { delay: 0.56 });
  add(new SphereGeometry(0.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), STEEL, MX, G + 1.8, MZ, { delay: 0.6 });
  cylinder(0.07, 0.09, 0.3, STEEL_DARK, MX, G + 2.15, MZ, { delay: 0.64 });
  cylinder(0.1, 0.1, 0.04, GOLD, MX, G + 2.42, MZ, { delay: 0.66 });
  const bulb = ball(0.1, MAGENTA, MX, G + 2.46, MZ, { delay: 0.68, flat: true });
  const GZ = MZ + 0.15;
  const bigAt: Point = [MX + 0.6, G + 0.45, GZ];
  const smallAt: Point = [bigAt[0] + 0.43 * Math.cos(Math.PI / 3), bigAt[1] + 0.43 * Math.sin(Math.PI / 3), GZ];
  [bigAt, smallAt].forEach((at, i) => {
    box(0.07, at[1] - G, 0.07, STEEL_DARK, at[0], G, MZ + 0.04, { delay: 0.6 + i * 0.02 });
    limb(kit, [at[0], at[1], MZ + 0.04], [at[0], at[1], GZ + 0.1], 0.045, 0.045, STEEL_DARK, { delay: 0.78 + i * 0.02 });
  });
  const bigCog = add(cog(0.3, 12, 0.06), GOLD, ...bigAt, { delay: 0.7, rotation: [Math.PI / 2, 0, 0] });
  const smallCog = add(cog(0.18, 7, 0.06), GOLD_DARK, ...smallAt, { delay: 0.74, rotation: [Math.PI / 2, 0, 0] });

  /** A floating circle of runes round its centre: a ring, an inner ring, ticks and dots. */
  const runes = (radius: number, at: Point, tilt: number, delay: number) => {
    const ring = add(new TorusGeometry(radius, 0.016, 6, 48).rotateX(Math.PI / 2), MAGENTA, at[0], at[1], at[2], {
      delay,
      flat: true,
      noInk: true,
      rotation: [tilt, 0, 0],
    });
    decorate(ring, new TorusGeometry(radius * 0.78, 0.008, 4, 40).rotateX(Math.PI / 2), PINK, [[0, 0.016, 0]]);
    for (let k = 0; k < 6; k++) {
      const angle = (k / 6) * Math.PI * 2;
      decorate(ring, new BoxGeometry(radius * 0.2, 0.008, 0.016).rotateY(-angle), MAGENTA, [
        [Math.cos(angle) * radius * 0.89, 0.016, Math.sin(angle) * radius * 0.89],
      ]);
    }
    decorate(
      ring,
      new OctahedronGeometry(0.028),
      PINK,
      Array.from({ length: 6 }, (_, k) => {
        const angle = ((k + 0.5) / 6) * Math.PI * 2;
        return [Math.cos(angle) * radius, 0.016, Math.sin(angle) * radius] as Point;
      }),
    );
    return ring;
  };
  const tankRunesY = G + 1.15;
  const tankRunes = runes(0.62, [MX, tankRunesY, MZ], 0, 0.9);

  // The pipe that drinks from the pit, and the magic it carries up to the tank.
  const intake: Point[] = [
    [MX - 0.42, G + 0.1, MZ + 0.22],
    [0.1, G + 0.1, -0.3],
    [-0.55, G + 0.16, -0.1],
    [-0.64, F + 0.3, 0.2],
    [-0.6, F + 0.06, 0.45],
  ];
  cable(kit, intake, 0.055, STEEL, 0.5);
  cylinder(0.06, 0.11, 0.07, GOLD, -0.6, F, 0.45, { delay: 0.6 });
  const intakeCurve = new CatmullRomCurve3(intake.map((point) => new Vector3(...point)));
  const sips = [0, 1, 2].map((i) => ball(0.075, PINK, MX, G, MZ, { delay: 1.2 + i * 0.05 }));

  // Mekana: a long dark coat, patched; half of her a golden machine.
  const x0 = 0.35;
  const z0 = 0.55;
  const D = 1;
  [-1, 1].forEach((side, i) => box(0.15, 0.11, 0.28, BOOT, x0 + side * 0.12, G, z0 + 0.2, { delay: D + i * 0.02 }));
  const skirt = add(new CylinderGeometry(0.3, 0.47, 1.08, 18).scale(1, 1, 0.8), COAT, x0, G + 0.08, z0, { delay: D + 0.06 });
  decorate(skirt, new BoxGeometry(0.014, 1.06, 0.014).rotateX(-Math.atan(0.136 / 1.08)), INK, [[0.06, 0.54, 0.31]]);
  decorate(skirt, new SphereGeometry(0.018, 8, 6), GOLD, [
    [0.1, 0.75, 0.283],
    [0.1, 0.95, 0.258],
  ]);
  // Patches sewn on the coat.
  [
    [0.7, 0.35, 0.12],
    [-0.45, 0.62, -0.2],
  ].forEach(([angle, y, lean]) => {
    const radius = 0.47 - 0.17 * (y / 1.08) + 0.006;
    const at: Point = [Math.sin(angle) * radius, y, Math.cos(angle) * radius * 0.8];
    decorate(skirt, new BoxGeometry(0.13, 0.13, 0.012).rotateZ(lean).rotateY(angle * 0.8), COAT_LIGHT, [at]);
    decorate(skirt, new BoxGeometry(0.11, 0.008, 0.016).rotateZ(lean).rotateY(angle * 0.8), INK, [
      [at[0], at[1] + 0.05, at[2]],
      [at[0], at[1] - 0.05, at[2]],
    ]);
  });
  const waist = add(new CylinderGeometry(0.31, 0.31, 0.07, 18).scale(1, 1, 0.8), BELT, x0, G + 1.1, z0, { delay: D + 0.1 });
  decorate(waist, new BoxGeometry(0.08, 0.06, 0.02), GOLD, [[0, 0.035, 0.25]]);
  add(new CylinderGeometry(0.37, 0.29, 0.58, 18).scale(1, 1, 0.72), COAT, x0, G + 1.14, z0, { delay: D + 0.14 });
  box(0.13, 0.36, 0.03, BLOUSE, x0, G + 1.34, z0 + 0.235, { delay: D + 0.16, noInk: true, rotation: [0.1, 0, 0] });
  [-1, 1].forEach((side, i) =>
    box(0.09, 0.4, 0.03, COAT_LIGHT, x0 + side * 0.11, G + 1.3, z0 + 0.24, { delay: D + 0.18 + i * 0.02, rotation: [0.1, 0, -side * 0.3] }),
  );
  cylinder(0.12, 0.15, 0.1, COAT_LIGHT, x0, G + 1.66, z0, { delay: D + 0.22 });

  // Her head: the human half pale, a plaster on the cheek; the other half a golden mask, cracked.
  cylinder(0.065, 0.075, 0.16, SKIN, x0, G + 1.68, z0 + 0.01, { delay: D + 0.3 });
  const HR = 0.195;
  const k = HR / 0.18;
  const head = add(new SphereGeometry(HR, 18, 14).scale(0.92, 1.12, 0.95), SKIN, x0, G + 1.8, z0 + 0.03, { delay: D + 0.4 });
  const cy = HR * 1.12;
  const C: Point = [x0, G + 1.8 + cy, z0 + 0.03];
  /** A spot on the face, measured from the centre of the head as if it were 0.18 across. */
  const face = (x: number, y: number, z: number, lean = 0): [number, number, number, number] => [x * k, cy + y * k, z * k, lean];
  decorate(head, new BoxGeometry(0.052, 0.022, 0.022), INK, [face(0.062, 0.03, 0.155)]);
  decorate(head, new BoxGeometry(0.065, 0.013, 0.022), INK, [face(0.064, 0.046, 0.152, -0.25)]);
  decorate(head, new BoxGeometry(0.076, 0.02, 0.027), HAIR, [face(0.064, 0.078, 0.146, 0.18)]);
  decorate(head, new BoxGeometry(0.038, 0.076, 0.043), SKIN_DARK, [face(0.004, -0.015, 0.165)]);
  decorate(head, new BoxGeometry(0.08, 0.026, 0.028), LIPS, [face(0.01, -0.095, 0.148)]);
  [0.6, -0.6].forEach((lean) =>
    decorate(head, new BoxGeometry(0.086, 0.028, 0.015).rotateZ(lean).rotateY(0.69), PLASTER, [face(0.104, -0.045, 0.135)]),
  );
  const maskGeometry = new SphereGeometry(HR + 0.009, 20, 14, -Math.PI / 2, Math.PI - 0.1, 0.06 * Math.PI, 0.74 * Math.PI).scale(0.92, 1.12, 0.95);
  maskGeometry.computeBoundingBox();
  const lift = -(maskGeometry.boundingBox?.min.y ?? 0);
  const mask = add(maskGeometry, GOLD, C[0], C[1] - lift, C[2], { delay: D + 0.44, ink: 1.04 });
  const onMask = (x: number, y: number, z: number, lean = 0): [number, number, number, number] => [x * k, y * k + lift, z * k, lean];
  const eye = decorate(mask, new SphereGeometry(0.033, 10, 8), MAGENTA, [onMask(-0.062, 0.03, 0.158)]);
  decorate(mask, new TorusGeometry(0.041, 0.01, 6, 16), GOLD_DARK, [onMask(-0.062, 0.03, 0.166)]);
  decorate(mask, new SphereGeometry(0.013, 6, 4), GOLD_DARK, [
    onMask(-0.03, 0.12, 0.145),
    onMask(-0.03, 0.06, 0.169),
    onMask(-0.03, -0.03, 0.175),
    onMask(-0.03, -0.1, 0.155),
    onMask(-0.12, -0.06, 0.12),
  ]);
  decorate(mask, new BoxGeometry(0.013, 0.07, 0.015), INK, [onMask(-0.09, -0.025, 0.152, 0.5), onMask(-0.1, -0.08, 0.134, -0.45)]);
  ball(0.19 * k, HAIR, C[0] + 0.01, C[1] - 0.12 * k, C[2] - 0.07 * k, { delay: D + 0.46 });
  [
    [0.12, 0.14, 0.03, 0.08],
    [0.17, 0.04, -0.02, 0.075],
    [0.17, -0.07, -0.05, 0.07],
    [0.15, -0.15, -0.08, 0.06],
    [0, 0.2, 0.05, 0.08],
    [-0.1, 0.17, 0.02, 0.08],
    [0.08, 0.2, -0.06, 0.085],
    [-0.16, 0.08, -0.06, 0.08],
    [-0.05, 0.1, -0.17, 0.085],
    [0.1, 0, -0.16, 0.08],
  ].forEach(([dx, dy, dz, radius], i) =>
    ball(radius * k, HAIR, C[0] + dx * k, C[1] + (dy - radius) * k, C[2] + dz * k, { delay: D + 0.5 + i * 0.015, ink: 1.1 }),
  );
  [-0.05, -0.09].forEach((dx, i) =>
    limb(kit, [x0 + dx, G + 1.86, z0 + 0.08], [x0 + dx - 0.03, G + 1.72, z0 + 0.1], 0.016, 0.016, MAGENTA, {
      delay: D + 0.5 + i * 0.02,
      flat: true,
      noInk: true,
    }),
  );

  // Her human arm, the hand bandaged, rests on her hip.
  ball(0.13, COAT, x0 + 0.36, G + 1.47, z0, { delay: D + 0.24 });
  const shoulderL: Point = [x0 + 0.37, G + 1.6, z0];
  const elbowL: Point = [x0 + 0.6, G + 1.28, z0 - 0.04];
  const handL: Point = [x0 + 0.34, G + 1.1, z0 + 0.14];
  limb(kit, shoulderL, elbowL, 0.1, 0.09, COAT, { delay: D + 0.28 });
  ball(0.09, COAT_LIGHT, elbowL[0], elbowL[1] - 0.09, elbowL[2], { delay: D + 0.3 });
  limb(kit, elbowL, between(elbowL, handL, 0.8), 0.09, 0.08, COAT, { delay: D + 0.32 });
  const hand = add(new SphereGeometry(0.075, 12, 10).scale(1, 0.9, 1.2), BANDAGE, handL[0], handL[1] - 0.068, handL[2], { delay: D + 0.36 });
  decorate(hand, new TorusGeometry(0.076, 0.007, 4, 18).rotateX(Math.PI / 2).scale(1, 1, 1.2), BANDAGE_DARK, [
    [0, 0.05, 0],
    [0, 0.09, 0],
  ]);

  // Her golden arm, raised: tubes of spell along the forearm, claws spread.
  add(new SphereGeometry(0.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GOLD, x0 - 0.38, G + 1.5, z0, {
    delay: D + 0.26,
    rotation: [0, 0, 0.35],
  });
  const shoulderR: Point = [x0 - 0.39, G + 1.56, z0];
  const elbowR: Point = [x0 - 0.68, G + 1.32, z0 + 0.12];
  const wristR: Point = [x0 - 0.74, G + 1.75, z0 + 0.28];
  const upper = limb(kit, shoulderR, elbowR, 0.08, 0.07, GOLD, { delay: D + 0.28 });
  decorate(upper, new TorusGeometry(0.078, 0.014, 6, 16).rotateX(Math.PI / 2), STEEL_DARK, [[0, aim(shoulderR, elbowR).length * 0.5, 0]]);
  ball(0.085, STEEL_DARK, elbowR[0], elbowR[1] - 0.085, elbowR[2], { delay: D + 0.3 });
  const reach = aim(elbowR, wristR).length;
  const fore = limb(kit, elbowR, wristR, 0.088, 0.072, GOLD, { delay: D + 0.32 });
  const tubes = decorate(fore, new CylinderGeometry(0.022, 0.022, reach * 0.62, 8), MAGENTA, [
    [0, reach * 0.5, 0.078],
    [-0.05, reach * 0.5, 0.062],
  ]);
  decorate(fore, new TorusGeometry(0.084, 0.012, 6, 16).rotateX(Math.PI / 2), STEEL_DARK, [
    [0, reach * 0.12, 0],
    [0, reach * 0.88, 0],
  ]);
  const P: Point = [wristR[0], wristR[1] + 0.07, wristR[2] + 0.02];
  add(new SphereGeometry(0.085, 12, 10).scale(1, 1.1, 0.7), GOLD, P[0], P[1] - 0.0935, P[2], { delay: D + 0.36 });
  (
    [
      [-0.065, -0.5, 0.15],
      [-0.022, -0.15, 0.2],
      [0.022, 0.15, 0.2],
      [0.065, 0.45, 0.15],
    ] as Point[]
  ).forEach(([dx, spread, lean], i) => {
    const knuckle: Point = [P[0] + dx, P[1] + 0.06, P[2] + 0.01];
    const n = Math.hypot(spread, 1, lean);
    const joint: Point = [knuckle[0] + (spread / n) * 0.1, knuckle[1] + 0.1 / n, knuckle[2] + (lean / n) * 0.1];
    const m = Math.hypot(spread * 0.8, 1, lean + 0.7);
    const tip: Point = [joint[0] + ((spread * 0.8) / m) * 0.13, joint[1] + 0.13 / m, joint[2] + ((lean + 0.7) / m) * 0.13];
    limb(kit, knuckle, joint, 0.024, 0.022, GOLD, { delay: D + 0.4 + i * 0.02 });
    ball(0.022, STEEL_DARK, joint[0], joint[1] - 0.022, joint[2], { delay: D + 0.44 + i * 0.02, noInk: true });
    const claw = aim(joint, tip);
    add(new ConeGeometry(0.021, claw.length, 6), GOLD, ...joint, { delay: D + 0.46 + i * 0.02, rotation: claw.rotation });
  });
  const thumb = aim([P[0] + 0.07, P[1] - 0.02, P[2] + 0.02], [P[0] + 0.17, P[1] + 0.05, P[2] + 0.08]);
  add(new ConeGeometry(0.024, thumb.length, 6), GOLD, P[0] + 0.07, P[1] - 0.02, P[2] + 0.02, { delay: D + 0.5, rotation: thumb.rotation });
  const handRunes = runes(0.28, [P[0], P[1] + 0.15, P[2] + 0.02], Math.PI / 2 - 0.35, D + 0.8);

  // The cable from the engine into her back: the engine keeps her going.
  const tether: Point[] = [
    [MX - 0.22, G + 2, MZ + 0.2],
    [0.78, G + 2.3, -0.3],
    [x0 + 0.14, G + 1.98, z0 - 0.2],
    [x0 + 0.04, G + 1.7, z0 - 0.25],
  ];
  cable(kit, tether, 0.04, CABLE, 1.6);
  ball(0.07, GOLD, x0 + 0.04, G + 1.62, z0 - 0.25, { delay: 1.65 });
  const tetherCurve = new CatmullRomCurve3(tether.map((point) => new Vector3(...point)));
  const feeds = [0, 1].map((i) => ball(0.06, PINK, MX, G, MZ, { delay: 1.8 + i * 0.05 }));

  // The spell drawn up from the dig into her claws.
  const source: Point = [-0.78, F + 0.38, 0.85];
  const claws: Point = [P[0] - 0.02, P[1] + 0.2, P[2] + 0.05];
  const boltA = zigzag(kit, jag(source, claws, 7, 0.09, 1), 0.026, MAGENTA, 1.7);
  const boltB = zigzag(kit, jag([source[0] - 0.12, source[1], source[2] - 0.05], [claws[0] + 0.06, claws[1] - 0.08, claws[2]], 6, 0.12, 2), 0.02, PINK, 1.75);
  motes(12, MAGENTA, 0.028, [PIT.left + 0.15, F + 0.05, PIT.back + 0.15], [PIT.right - 0.15, F + 1.2, 1.4], 0.8);
  motes(8, PINK, 0.022, [P[0] - 0.3, P[1], P[2] - 0.15], [P[0] + 0.3, P[1] + 0.55, P[2] + 0.15], 1.9);

  const glassFrom = new Color(MAGENTA);
  const glassTo = new Color(PINK);
  const along = (curve: CatmullRomCurve3, bead: Group, radius: number, u: number) => {
    const point = curve.getPointAt(u);
    bead.position.set(point.x, point.y - radius, point.z);
  };
  tick((t) => {
    bigCog.rotation.y = t * 0.9;
    smallCog.rotation.y = 0.25 - t * 0.9 * (12 / 7);
    tankRunes.rotation.y = t * 0.5;
    tankRunes.position.y = tankRunesY + Math.sin(t * 1.3) * 0.05;
    handRunes.rotation.y = -t * 1.4;
    const pulse = (Math.sin(t * 2.2) + 1) / 2;
    colorOf(tank).lerpColors(glassFrom, glassTo, pulse * 0.3);
    colorOf(bulb).lerpColors(glassFrom, glassTo, 1 - pulse);
    colorOf(vial).lerpColors(glassFrom, glassTo, pulse);
    tubes.color.lerpColors(glassFrom, glassTo, pulse);
    eye.color.lerpColors(glassFrom, glassTo, 1 - pulse);
    for (const crack of cracks) crack.color.lerpColors(glassFrom, glassTo, pulse);
    for (const piece of floorSeam) colorOf(piece).lerpColors(glassFrom, glassTo, pulse);
    // Sips of magic go up the pipe to the tank, and from the tank down the cable into her.
    sips.forEach((bead, i) => along(intakeCurve, bead, 0.075, 1 - ((t * 0.3 + i / sips.length) % 1)));
    feeds.forEach((bead, i) => along(tetherCurve, bead, 0.06, (t * 0.35 + i / feeds.length) % 1));
    // The spell crackles: one bolt nearly always there, the other comes and goes.
    const beat = Math.floor(t * 10);
    const noise = Math.sin(beat * 12.9898) * 43758.5453;
    const a = beat % 5 !== 4;
    const b = noise - Math.floor(noise) > 0.45;
    for (const piece of boltA) piece.visible = a;
    for (const piece of boltB) piece.visible = b;
    swirl.visible = beat % 4 !== 2;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
