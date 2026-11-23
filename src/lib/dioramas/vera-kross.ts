import {
  BackSide,
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Material,
  type Side,
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
  jag,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** Which faces of a part are drawn: open shells, such as a coat's skirt, need their inside too. */
function sided(part: Group, side: Side): Group {
  ((part.children[0] as Mesh).material as Material).side = side;
  return part;
}

/** A chain of links along a path, every other link turned a quarter. */
function chain(kit: Kit, path: Point[], color: number, delay: number): Group[] {
  const curve = new CatmullRomCurve3(path.map((point) => new Vector3(...point)));
  const count = Math.max(2, Math.round(curve.getLength() / 0.12));
  const points = curve.getSpacedPoints(count).map((point) => [point.x, point.y, point.z] as Point);
  return points.slice(0, -1).map((from, i) => {
    const geometry = new TorusGeometry(0.05, 0.017, 6, 12).scale(1, 1.45, 1);
    if (i % 2) geometry.rotateY(Math.PI / 2);
    return kit.add(geometry, color, ...from, { delay: delay + i * 0.015, rotation: aim(from, points[i + 1]).rotation });
  });
}

/** A footprint, toes towards +z: the sole and the heel. */
function footprint(): ExtrudeGeometry {
  const sole = new Shape();
  sole.absellipse(0, 0.04, 0.048, 0.076, 0, Math.PI * 2, false, 0);
  const heel = new Shape();
  heel.absellipse(0, -0.083, 0.039, 0.037, 0, Math.PI * 2, false, 0);
  return new ExtrudeGeometry([sole, heel], { depth: 0.006, bevelEnabled: false, curveSegments: 8 }).rotateX(Math.PI / 2);
}

/**
 * Vera Kross (P054): she finds anyone and never stops, least of all when she is losing. Deep in
 * the necropolis under the city, before a wall of burial niches, she strides after a trail of
 * glowing footprints that leads out of an open sarcophagus, scarred and bandaged. Three times
 * they chained her to the tombs: three broken shackles still hang from the wall. This fourth time
 * she tore the ring out of the stone, and drags it behind her, a lump of tuff on the chain locked
 * to her wrist. Her map with the red thread is pinned among the tombs. The price of trusting
 * nothing but her instinct: the tracker she smashed lies sparking on the floor, and her cracked
 * eyepiece flickers.
 */
export function veraKross(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const FLOOR = 0x2c2834;
  const JOINT = 0x1b1821;
  const TUFF = 0x4b4356;
  const TUFF_LIGHT = 0x5f566c;
  const TUFF_DARK = 0x352f3e;
  const HOLLOW = 0x08070c;
  const BONE = 0xd8d0bf;
  const URN = 0x6a4277;
  const PAPER = 0xcfc6b0;
  const MAP_LINE = 0x8f8573;
  const STEEL = 0x8e97a8;
  const RUST = 0x5a5f6c;
  const GADGET = 0x2f3440;
  const DEAD = 0x0b2a36;
  const STEP_DIM = 0x5a4a10;
  const SPARK = 0xd8fbff;
  const COAT = 0x1d4553;
  const COAT_LIGHT = 0x2a6070;
  const LINING = 0x6a1d48;
  const TOP = 0x17151d;
  const BELT = 0x2b2833;
  const TROUSERS = 0x24212d;
  const BOOT = 0x15131a;
  const GLOVE = 0x1b1921;
  const SKIN = 0xe2b9a0;
  const SKIN_DARK = 0xb98a72;
  const HAIR = 0xece8f3;
  const HAIR_SHADE = 0xbcb5c9;
  const BROW = 0x8d8798;
  const BANDAGE = 0xece8de;
  const SCAR = 0xa8505e;

  const F = octagonBase(kit, FLOOR);

  // The flagstones of the necropolis: their joints, staggered row by row.
  const across = (z: number) => Math.min(2.1, 3.0 - Math.abs(z));
  [-0.7, 0.1, 0.9, 1.7].forEach((z, i) =>
    box(across(z) * 2, 0.004, 0.02, JOINT, 0, F, z, { delay: 0.1 + i * 0.02, flat: true, noInk: true }),
  );
  const bands: [number, number, number[]][] = [
    [-1.15, -0.7, [-1.2, -0.1, 1.0]],
    [-0.7, 0.1, [-1.65, -0.6, 0.45, 1.6]],
    [0.1, 0.9, [-1.25, -0.15, 0.9, 1.95]],
    [0.9, 1.7, [-1.6, -0.55, 0.5, 1.4]],
    [1.7, 2.15, [-0.7, 0.4]],
  ];
  bands.forEach(([from, to, xs], i) =>
    xs.forEach((x) => box(0.02, 0.004, to - from, JOINT, x, F, (from + to) / 2, { delay: 0.12 + i * 0.02, flat: true, noInk: true })),
  );

  // The wall of burial niches: three rows of arched loculi cut into the tuff, dark inside.
  const W = 3.2;
  const H = 2.25;
  const LAYER = 0.22;
  const WZ = -1.26;
  const HALF = 0.24;
  const SPRING = 0.3;
  const columns = [-1.15, -0.38, 0.38, 1.15];
  const rows = [0.22, 0.86, 1.5];
  const face = new Shape();
  face.moveTo(-W / 2, 0);
  face.lineTo(W / 2, 0);
  face.lineTo(W / 2, H);
  face.lineTo(-W / 2, H);
  face.closePath();
  for (const x of columns) {
    for (const y of rows) {
      // The two niches on the right of the middle row are under the map.
      if (y === rows[1] && x > 0) continue;
      const hole = new Path();
      hole.moveTo(x - HALF, y);
      hole.lineTo(x + HALF, y);
      hole.lineTo(x + HALF, y + SPRING);
      hole.absarc(x, y + SPRING, HALF, 0, Math.PI, false);
      hole.lineTo(x - HALF, y);
      face.holes.push(hole);
    }
  }
  const wall = add(
    new ExtrudeGeometry(face, { depth: LAYER, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -LAYER / 2),
    TUFF,
    0,
    F,
    WZ,
    { delay: 0.2, ink: 1.02 },
  );
  box(W - 0.04, H - 0.04, 0.02, HOLLOW, 0, F + 0.02, WZ - LAYER / 2 + 0.02, { delay: 0.18, flat: true, noInk: true });
  box(W, H, 0.14, TUFF_DARK, 0, F, WZ - LAYER / 2 - 0.072, { delay: 0.16, ink: 1.02 });
  const front = LAYER / 2 + 0.003;
  // The courses of tuff blocks between the rows, and cracks.
  decorate(
    wall,
    new BoxGeometry(W, 0.014, 0.006),
    TUFF_DARK,
    [0.12, 0.81, 1.45, 2.13].map((y) => [0, y, front] as Point),
  );
  decorate(
    wall,
    new BoxGeometry(0.014, 0.1, 0.006),
    TUFF_DARK,
    [-1.3, -0.7, 0.05, 0.6, 1.25].flatMap((x, i) => [[x, 0.06, front], [x + (i % 2 ? 0.2 : -0.2), 2.19, front]] as Point[]),
  );
  decorate(wall, new BoxGeometry(0.012, 0.24, 0.006), INK, [
    [-1.5, 1.2, front, 0.3],
    [-0.77, 1.9, front, -0.25],
    [0, 1.3, front, 0.35],
    [0.77, 0.3, front, -0.3],
    [1.5, 1.7, front, 0.2],
  ]);
  // Where the fourth ring was torn out of the wall: a hole and its cracks.
  decorate(wall, new BoxGeometry(0.11, 0.09, 0.006), HOLLOW, [[-0.765, 0.5, front + 0.001, 0.4]]);
  decorate(wall, new BoxGeometry(0.01, 0.13, 0.006), INK, [
    [-0.72, 0.6, front, -0.6],
    [-0.83, 0.58, front, 0.7],
    [-0.76, 0.38, front, 0.15],
  ]);
  box(W + 0.1, 0.08, 0.42, TUFF_LIGHT, 0, F + H, WZ - 0.07, { delay: 0.28 });
  [
    [-1.15, 0.55, 0.2, 0.06],
    [-0.4, 0.4, 0.13, -0.08],
    [0.45, 0.62, 0.24, 0.04],
    [1.25, 0.42, 0.15, -0.05],
  ].forEach(([x, w, h, turn], i) =>
    box(w, h, 0.32, i % 2 ? TUFF_LIGHT : TUFF, x, F + H + 0.08, WZ - 0.06, { delay: 0.32 + i * 0.03, rotation: [0, turn, 0] }),
  );

  // What the niches hold: urns, skulls, a sealed slab and a broken one, votive cups with cold flames.
  const NZ = WZ - 0.01;
  const urnProfile = [
    [0, 0],
    [0.055, 0],
    [0.085, 0.06],
    [0.08, 0.13],
    [0.045, 0.18],
    [0.06, 0.21],
    [0, 0.21],
  ].map(([r, y]) => new Vector2(r, y));
  [
    [-1.15, rows[0]],
    [-0.38, rows[1]],
    [0.38, rows[2]],
  ].forEach(([x, y], i) => add(new LatheGeometry(urnProfile, 12), URN, x, F + y, NZ, { delay: 0.4 + i * 0.03 }));
  [
    [1.15, rows[0], -0.3],
    [-1.15, rows[1], 0.35],
  ].forEach(([x, y, turn], i) => {
    const skull = add(new SphereGeometry(0.08, 12, 10).scale(1, 0.92, 1.08), BONE, x, F + y, NZ + 0.02, { delay: 0.45 + i * 0.03, rotation: [0, turn, 0] });
    decorate(skull, new SphereGeometry(0.022, 8, 6), INK, [
      [-0.03, 0.08, 0.072],
      [0.03, 0.08, 0.072],
    ]);
    decorate(skull, new BoxGeometry(0.016, 0.02, 0.01), INK, [[0, 0.05, 0.085]]);
    decorate(skull, new BoxGeometry(0.06, 0.01, 0.01), INK, [[0, 0.025, 0.08]]);
  });
  const slab = box(0.52, 0.56, 0.03, TUFF_LIGHT, -0.38, F + rows[2] - 0.02, WZ + LAYER / 2 + 0.012, { delay: 0.5 });
  decorate(slab, new BoxGeometry(0.36, 0.34, 0.006), TUFF_DARK, [[0, 0.28, 0.016]]);
  box(0.52, 0.2, 0.03, TUFF_LIGHT, -0.38, F + rows[0] - 0.02, WZ + LAYER / 2 + 0.012, { delay: 0.52, rotation: [0, 0, 0.05] });
  box(0.22, 0.04, 0.15, TUFF_LIGHT, -0.2, F, -0.98, { delay: 0.55, rotation: [0, 0.7, 0] });
  const wisps: Group[] = [];
  [
    [-1.15, rows[2]],
    [0.38, rows[0]],
    [1.15, rows[2]],
  ].forEach(([x, y], i) => {
    cylinder(0.042, 0.032, 0.09, MAGENTA, x, F + y, NZ + 0.03, { delay: 0.56 + i * 0.03 });
    wisps.push(add(new CylinderGeometry(0, 0.026, 0.09, 6), CYAN, x, F + y + 0.09, NZ + 0.03, { delay: 0.6 + i * 0.03, flat: true, noInk: true }));
  });

  // Three iron rings in the wall, each with a broken shackle hanging: the three times they stopped her.
  [-1.5, 0, 0.765].forEach((x, i) => {
    const wait = 0.62 + i * 0.05;
    add(new TorusGeometry(0.05, 0.016, 6, 14), RUST, x, F + 0.6, WZ + LAYER / 2 + 0.02, { delay: wait });
    chain(kit, [[x, F + 0.6, WZ + LAYER / 2 + 0.06], [x + 0.01, F + 0.36, WZ + LAYER / 2 + 0.07]], STEEL, wait + 0.03);
    add(new TorusGeometry(0.075, 0.02, 6, 16, Math.PI * 1.5).rotateZ(-0.9 + i * 0.8), STEEL, x + 0.01, F + 0.19, WZ + LAYER / 2 + 0.07, {
      delay: wait + 0.08,
    });
  });

  // The map, pinned to the tombs: streets, the river, and her red thread from pin to pin.
  const map = box(0.98, 0.6, 0.02, PAPER, 0.77, F + 0.9, WZ + LAYER / 2 + 0.012, { delay: 0.64, rotation: [0, 0, -0.03] });
  const m = 0.013;
  decorate(map, new BoxGeometry(0.9, 0.008, 0.004), MAP_LINE, [
    [0, 0.12, m, 0.08],
    [0, 0.4, m, -0.05],
  ]);
  decorate(map, new BoxGeometry(0.008, 0.52, 0.004), MAP_LINE, [
    [-0.2, 0.3, m, 0.1],
    [0.22, 0.3, m, -0.12],
  ]);
  decorate(map, new BoxGeometry(0.3, 0.014, 0.004), CYAN, [
    [-0.33, 0.27, m, 0.45],
    [-0.06, 0.24, m, -0.25],
    [0.24, 0.28, m, 0.35],
  ]);
  const pins: [number, number][] = [
    [-0.38, 0.47],
    [-0.12, 0.15],
    [0.07, 0.47],
    [0.27, 0.18],
    [0.39, 0.43],
  ];
  pins.slice(1).forEach(([x, y], i) => {
    const [px, py] = pins[i];
    decorate(map, new BoxGeometry(Math.hypot(x - px, y - py), 0.014, 0.004), MAGENTA, [[(x + px) / 2, (y + py) / 2, m + 0.004, Math.atan2(y - py, x - px)]]);
  });
  decorate(map, new SphereGeometry(0.026, 8, 6), YELLOW, pins.map(([x, y]) => [x, y, m + 0.012] as Point));
  decorate(map, new TorusGeometry(0.06, 0.01, 6, 18), MAGENTA, [[0.39, 0.43, m + 0.006]]);

  // The sarcophagus, its lid shoved off and broken in two: the trail starts here.
  const SX = 1.22;
  const SZ = -0.36;
  box(0.72, 0.06, 1.12, TUFF_DARK, SX, F, SZ, { delay: 0.36 });
  const tomb = box(0.62, 0.44, 1.02, TUFF_LIGHT, SX, F + 0.06, SZ, { delay: 0.4 });
  decorate(tomb, new BoxGeometry(0.52, 0.04, 0.008), TUFF_DARK, [[0, 0.36, 0.512]]);
  decorate(tomb, new BoxGeometry(0.008, 0.04, 0.92), TUFF_DARK, [
    [0.312, 0.36, 0],
    [-0.312, 0.36, 0],
  ]);
  decorate(tomb, new BoxGeometry(0.34, 0.18, 0.008), TUFF_DARK, [[0, 0.16, 0.512]]);
  decorate(tomb, new BoxGeometry(0.008, 0.18, 0.62), TUFF_DARK, [[0.312, 0.16, 0]]);
  box(0.5, 0.012, 0.9, HOLLOW, SX, F + 0.5, SZ, { delay: 0.44, flat: true, noInk: true });
  const lid = box(0.72, 0.09, 0.6, TUFF, SX - 0.05, F + 0.5, SZ - 0.3, { delay: 0.48, rotation: [0, 0.32, -0.05] });
  decorate(lid, new BoxGeometry(0.4, 0.006, 0.014).rotateY(0.5), INK, [[0.05, 0.092, 0.05]]);
  box(0.72, 0.42, 0.09, TUFF, SX + 0.04, F, SZ + 0.85, { delay: 0.5, rotation: [-0.55, 0.12, 0] });

  // The trail she follows: footprints that glow under her eye, out of the tomb and away to the front.
  const trail = new CatmullRomCurve3(
    [
      [0.66, 0.08],
      [0.3, 0.52],
      [0.08, 1.05],
      [-0.05, 1.55],
      [-0.12, 2.05],
    ].map(([x, z]) => new Vector3(x, 0, z)),
  );
  const prints = Math.round(trail.getLength() / 0.2);
  const steps = trail.getSpacedPoints(prints).map((point, i) => {
    const along = trail.getTangentAt(i / prints);
    const side = i % 2 ? 0.07 : -0.07;
    return add(footprint(), STEP_DIM, point.x + along.z * side, F + 0.002, point.z - along.x * side, {
      delay: 0.5 + i * 0.04,
      flat: true,
      noInk: true,
      rotation: [0, Math.atan2(along.x, along.z), 0],
    });
  });

  // Vera Kross, striding after the trail in her long coat.
  const x0 = -0.25;
  const z0 = 0.3;
  const G = F;
  const D = 0.95;
  box(0.16, 0.14, 0.3, BOOT, x0 + 0.13, G, z0 + 0.3, { delay: D });
  box(0.16, 0.14, 0.3, BOOT, x0 - 0.13, G + 0.055, z0 - 0.3, { delay: D + 0.02, rotation: [0.38, 0, 0] });
  const legs: [Point, Point, Point][] = [
    [
      [x0 + 0.11, G + 1.12, z0 + 0.02],
      [x0 + 0.13, G + 0.64, z0 + 0.18],
      [x0 + 0.13, G + 0.12, z0 + 0.25],
    ],
    [
      [x0 - 0.11, G + 1.12, z0 - 0.02],
      [x0 - 0.13, G + 0.64, z0 - 0.06],
      [x0 - 0.13, G + 0.18, z0 - 0.26],
    ],
  ];
  legs.forEach(([hip, knee, ankle], i) => {
    limb(kit, hip, knee, 0.1, 0.085, TROUSERS, { delay: D + 0.04 + i * 0.02 });
    ball(0.085, BOOT, knee[0], knee[1] - 0.085, knee[2], { delay: D + 0.06 + i * 0.02 });
    limb(kit, knee, ankle, 0.085, 0.072, BOOT, { delay: D + 0.08 + i * 0.02 });
  });
  // The coat's skirt: open at the front, its hem swinging back as she walks, magenta inside.
  const skirt = (top: number, bottom: number) => {
    const geometry = new CylinderGeometry(top, bottom, 0.72, 20, 3, true, 0.42, Math.PI * 2 - 0.84);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const down = (0.36 - position.getY(i)) / 0.72;
      position.setZ(i, position.getZ(i) * 0.78 - down * down * 0.18);
    }
    geometry.computeVertexNormals();
    return geometry;
  };
  add(skirt(0.27, 0.5), COAT, x0, G + 0.46, z0, { delay: D + 0.1 });
  sided(add(skirt(0.258, 0.48), LINING, x0, G + 0.465, z0, { delay: D + 0.1, noInk: true }), BackSide);
  const torso = add(new CylinderGeometry(0.3, 0.24, 0.68, 16).scale(1, 1, 0.7), COAT, x0, G + 1.1, z0, { delay: D + 0.14 });
  decorate(torso, new BoxGeometry(0.15, 0.46, 0.02).rotateX(0.06), TOP, [[0, 0.42, 0.2]]);
  decorate(torso, new BoxGeometry(0.07, 0.36, 0.03), COAT_LIGHT, [
    [-0.1, 0.46, 0.205, 0.32],
    [0.1, 0.46, 0.205, -0.32],
  ]);
  [
    [G + 1.08, 0.255],
    [G + 1.32, 0.27],
  ].forEach(([y, radius], i) => {
    const belt = add(new CylinderGeometry(radius, radius - 0.005, 0.07, 16).scale(1, 1, 0.72), BELT, x0, y, z0, { delay: D + 0.18 + i * 0.02 });
    decorate(belt, new BoxGeometry(0.07, 0.06, 0.02), STEEL, [[0.05 - i * 0.1, 0.035, radius * 0.72]]);
  });
  [-1, 1].forEach((side, i) => ball(0.13, COAT, x0 + side * 0.29, G + 1.6, z0, { delay: D + 0.22 + i * 0.02 }));
  sided(
    add(new CylinderGeometry(0.25, 0.17, 0.3, 16, 1, true, 0.75, Math.PI * 2 - 1.5).scale(1, 1, 0.85), COAT_LIGHT, x0, G + 1.72, z0 - 0.01, {
      delay: D + 0.3,
    }),
    DoubleSide,
  );

  // Her right arm hangs forward, the fist round the chain; the manacle is still locked on the wrist.
  const shoulderR: Point = [x0 - 0.31, G + 1.76, z0];
  const elbowR: Point = [x0 - 0.42, G + 1.38, z0 + 0.1];
  const fistR: Point = [x0 - 0.37, G + 1.06, z0 + 0.34];
  const at = (from: Point, to: Point, u: number): Point => [
    MathUtils.lerp(from[0], to[0], u),
    MathUtils.lerp(from[1], to[1], u),
    MathUtils.lerp(from[2], to[2], u),
  ];
  limb(kit, shoulderR, elbowR, 0.095, 0.09, COAT, { delay: D + 0.26 });
  ball(0.09, COAT_LIGHT, elbowR[0], elbowR[1] - 0.09, elbowR[2], { delay: D + 0.28 });
  const cuffR = at(elbowR, fistR, 0.7);
  limb(kit, elbowR, cuffR, 0.09, 0.11, COAT, { delay: D + 0.3 });
  limb(kit, cuffR, fistR, 0.06, 0.06, GLOVE, { delay: D + 0.32 });
  ball(0.085, GLOVE, fistR[0], fistR[1] - 0.085, fistR[2], { delay: D + 0.36 });
  add(new TorusGeometry(0.085, 0.026, 6, 16).rotateX(Math.PI / 2), STEEL, ...at(elbowR, fistR, 0.8), {
    delay: D + 0.4,
    rotation: aim(elbowR, fistR).rotation,
  });
  // Her left arm: the sleeve torn off at the elbow, the forearm bandaged.
  const shoulderL: Point = [x0 + 0.31, G + 1.76, z0];
  const elbowL: Point = [x0 + 0.42, G + 1.36, z0 - 0.06];
  const handL: Point = [x0 + 0.4, G + 1.0, z0 + 0.1];
  limb(kit, shoulderL, elbowL, 0.095, 0.095, COAT, { delay: D + 0.26 });
  const torn = ball(0.1, COAT_LIGHT, elbowL[0], elbowL[1] - 0.1, elbowL[2], { delay: D + 0.28 });
  decorate(torn, new CylinderGeometry(0.03, 0, 0.08, 4), COAT_LIGHT, [
    [-0.05, -0.01, 0.05],
    [0.04, -0.02, 0.06],
    [0.07, 0.0, -0.03],
  ]);
  limb(kit, elbowL, handL, 0.07, 0.06, SKIN, { delay: D + 0.3 });
  const { rotation: forearm } = aim(elbowL, handL);
  [0.22, 0.42, 0.62].forEach((u, k) =>
    add(new TorusGeometry(0.068 - u * 0.012, 0.022, 6, 16).rotateX(Math.PI / 2), BANDAGE, ...at(elbowL, handL, u), {
      delay: D + 0.34 + k * 0.03,
      rotation: forearm,
      noInk: true,
    }),
  );
  ball(0.08, GLOVE, handL[0], handL[1] - 0.08, handL[2], { delay: D + 0.36 });

  // Her head: scarred and bruised, the cyber eyepiece cracked over her left eye.
  cylinder(0.075, 0.085, 0.16, SKIN, x0, G + 1.76, z0 + 0.01, { delay: D + 0.34 });
  const head = add(new SphereGeometry(0.19, 18, 14).scale(0.92, 1.08, 0.95), SKIN, x0, G + 1.86, z0 + 0.03, { delay: D + 0.4 });
  const cy = 0.205;
  decorate(head, new BoxGeometry(0.05, 0.022, 0.02), INK, [
    [-0.065, cy + 0.03, 0.163],
    [0.065, cy + 0.03, 0.163],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.018, 0.02), BROW, [
    [-0.065, cy + 0.075, 0.158, -0.3],
    [0.068, cy + 0.088, 0.16, 0.3],
  ]);
  decorate(head, new BoxGeometry(0.04, 0.06, 0.04), SKIN_DARK, [[0, cy - 0.02, 0.175]]);
  decorate(head, new BoxGeometry(0.07, 0.012, 0.01), INK, [[0.005, cy - 0.085, 0.158, 0.06]]);
  decorate(head, new BoxGeometry(0.012, 0.12, 0.008), SCAR, [[-0.088, cy - 0.025, 0.146, 0.25]]);
  decorate(head, new BoxGeometry(0.03, 0.006, 0.006), INK, [
    [-0.095, cy + 0.005, 0.148, 0.25],
    [-0.088, cy - 0.025, 0.152, 0.25],
    [-0.081, cy - 0.055, 0.152, 0.25],
  ]);
  decorate(head, new BoxGeometry(0.06, 0.028, 0.01), BANDAGE, [[0.08, cy - 0.06, 0.148, -0.5]]);
  const lens = decorate(head, new CylinderGeometry(0.05, 0.05, 0.025, 16).rotateX(Math.PI / 2), CYAN, [[0.066, cy + 0.03, 0.172]]);
  decorate(head, new TorusGeometry(0.052, 0.012, 6, 18), STEEL, [[0.066, cy + 0.03, 0.182]]);
  decorate(head, new BoxGeometry(0.1, 0.024, 0.02).rotateY(0.9), STEEL, [[0.135, cy + 0.035, 0.11]]);
  decorate(head, new BoxGeometry(0.008, 0.08, 0.006), INK, [[0.072, cy + 0.03, 0.188, 0.5]]);
  // Platinum hair, cut short, tufts swept up off the forehead and back.
  add(new SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.95, 0.8, 1), HAIR_SHADE, x0, G + 2.06, z0 + 0.01, {
    delay: D + 0.44,
    rotation: [-0.45, 0, 0],
  });
  [
    [-0.1, 0.1, 0.03, 0.35],
    [-0.035, 0.13, 0.05, 0.08],
    [0.035, 0.13, 0.04, -0.12],
    [0.105, 0.09, 0.0, -0.42],
  ].forEach(([dx, dy, dz, lean], i) =>
    add(new SphereGeometry(0.07, 10, 8).scale(0.85, 0.62, 2.1), HAIR, x0 + dx, G + 2.065 + dy, z0 + dz, {
      delay: D + 0.48 + i * 0.02,
      rotation: [-0.42, 0, lean],
    }),
  );

  // The chain from her wrist, dragging on the floor the ring she tore out of the wall, still in its lump of tuff.
  const lump: Point = [-1.45, F, -0.28];
  chain(
    kit,
    [
      [fistR[0], fistR[1] - 0.12, fistR[2] + 0.02],
      [fistR[0] - 0.02, G + 0.6, fistR[2] + 0.08],
      [fistR[0] - 0.05, G + 0.09, fistR[2] + 0.1],
      [fistR[0] - 0.3, G + 0.055, fistR[2] - 0.12],
      [lump[0] + 0.3, G + 0.055, lump[2] + 0.32],
      [lump[0] + 0.1, G + 0.07, lump[2] + 0.12],
    ],
    STEEL,
    1.5,
  );
  add(new DodecahedronGeometry(0.15), TUFF_LIGHT, lump[0], lump[1] - 0.04, lump[2], { delay: 1.75, rotation: [0.4, 0.7, 0.2] });
  add(new TorusGeometry(0.055, 0.017, 6, 14).rotateY(-0.8).rotateX(-0.5), RUST, lump[0] + 0.08, lump[1] + 0.1, lump[2] + 0.08, { delay: 1.78 });
  [-0.05, 0.05].forEach((dx, i) => {
    const from: Point = [-0.78 + dx, F, -1.12];
    const to: Point = [lump[0] + 0.05 + dx, F, lump[2] - 0.12];
    box(0.018, 0.004, Math.hypot(to[0] - from[0], to[2] - from[2]), INK, (from[0] + to[0]) / 2, F, (from[2] + to[2]) / 2, {
      delay: 1.8 + i * 0.03,
      flat: true,
      noInk: true,
      rotation: [0, Math.atan2(to[0] - from[0], to[2] - from[2]), 0],
    });
  });

  // The tracker she has no use for, smashed on the floor and sparking.
  const GX = 0.58;
  const GZ = 1.12;
  const gadget = box(0.2, 0.04, 0.3, GADGET, GX, F, GZ, { delay: 1.6, rotation: [0, 0.6, 0.06] });
  const screen = decorate(gadget, new BoxGeometry(0.15, 0.004, 0.2), CYAN, [[0, 0.041, -0.02]]);
  [0.5, -0.7, 1.8].forEach((turn) => decorate(gadget, new BoxGeometry(0.1, 0.005, 0.008).rotateY(turn), INK, [[0.02, 0.044, -0.0]]));
  decorate(gadget, new BoxGeometry(0.04, 0.012, 0.03), MAGENTA, [
    [-0.05, 0.044, 0.11],
    [0.05, 0.044, 0.11],
  ]);
  cylinder(0.012, 0.012, 0.16, STEEL, GX - 0.2, F + 0.012, GZ + 0.05, { delay: 1.66, rotation: [Math.PI / 2, 0, 0.9] });
  box(0.07, 0.03, 0.06, GADGET, GX + 0.2, F, GZ - 0.12, { delay: 1.68, rotation: [0, 0.4, 0] });
  const tip: Point = [GX + 0.06, F + 0.06, GZ - 0.1];
  const sparks = [
    zigzag(kit, jag(tip, [tip[0] + 0.05, tip[1] + 0.2, tip[2] - 0.02], 4, 0.03, 1), 0.014, SPARK, 1.7),
    zigzag(kit, jag(tip, [tip[0] - 0.08, tip[1] + 0.15, tip[2] + 0.04], 3, 0.025, 2), 0.014, CYAN, 1.72),
  ];

  // Dust drifting through the tomb.
  motes(10, CYAN, 0.018, [-1.5, F + 0.3, -1.0], [1.5, F + 2.2, 0.5], 1.4);

  const stepFrom = new Color(STEP_DIM);
  const stepTo = new Color(YELLOW);
  const lensOn = new Color(CYAN);
  const lensOff = new Color(DEAD);
  const wispFrom = new Color(CYAN);
  const wispTo = new Color(SPARK);
  tick((t) => {
    // A glow runs along the trail, out of the tomb towards the front, and starts again.
    const wave = (t * 3.2) % (steps.length + 5);
    steps.forEach((step, i) => {
      const d = wave - i;
      const pulse = d >= 0 && d < 4 ? 1 - d / 4 : 0;
      colorOf(step).lerpColors(stepFrom, stepTo, 0.62 + 0.38 * pulse);
    });
    // The cracked eyepiece cuts out now and then; the broken tracker flickers and sparks.
    const beat = Math.floor(t * 8);
    lens.color.copy(beat % 9 === 5 || beat % 13 === 8 ? lensOff : lensOn);
    screen.color.copy(beat % 5 === 2 || beat % 7 === 4 ? lensOff : lensOn);
    const noise = Math.sin(beat * 12.9898) * 43758.5453;
    sparks[0].forEach((piece) => (piece.visible = beat % 4 !== 3));
    sparks[1].forEach((piece) => (piece.visible = noise - Math.floor(noise) > 0.5));
    wisps.forEach((wisp, i) => {
      colorOf(wisp).lerpColors(wispFrom, wispTo, (Math.sin(t * 5 + i * 2.1) + 1) / 4);
      wisp.rotation.z = Math.sin(t * 3.3 + i) * 0.15;
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.4 };
}
