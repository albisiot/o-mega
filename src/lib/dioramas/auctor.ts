import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  MeshBasicMaterial,
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
  zigzag,
  jag,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** Grows or shrinks a part's own meshes, leaving the group's pop-in scale alone. */
function swelling(part: Group): (size: number) => void {
  const rest = part.children.map((child) => child.scale.clone());
  return (size) => part.children.forEach((child, i) => child.scale.copy(rest[i]).multiplyScalar(Math.max(0.001, size)));
}

/** The point a share `u` of the way from one point to another. */
function between(from: Point, to: Point, u: number): Point {
  return [MathUtils.lerp(from[0], to[0], u), MathUtils.lerp(from[1], to[1], u), MathUtils.lerp(from[2], to[2], u)];
}

/**
 * Auctor (P052): he designed the power plant of Nuova Megara, and now he sells off the rest. In
 * the plant's yard, under its cooling tower, steaming and lit cyan inside, he has pulled a glowing
 * section out of the main conduit and holds it up high as at an auction, the current still
 * jumping up to it from the broken pipe, while his other hand waits for the bids. His drafting
 * table glows with the plant's blueprints. The price of his genius shows: a price tag hangs from
 * his own wrist, because he works for whoever pays, and on the blueprint the one circle of magic
 * is crossed out.
 */
export function auctor(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x2a2d36;
  const JOINT = 0x1d1f27;
  const TOWER = 0x4c5b70;
  const TOWER_DARK = 0x313b4a;
  const GLOW = 0x9eeaff;
  const STEAM = 0xa9c8d6;
  const STEEL = 0x66707f;
  const STEEL_DARK = 0x3a404d;
  const DIM = 0x0b3d50;
  const BRASS = 0xb08d45;
  const BOARD = 0x3a3742;
  const PAPER = 0x0c3150;
  const GRID = 0x1a5f84;
  const WOOD = 0x6b5440;
  const WOOD_DARK = 0x45362a;
  const COIN_EDGE = 0x9a7a10;
  const COAT = 0xdcd5c0;
  const COAT_SHADE = 0xb3ab95;
  const BURN = 0x3e3128;
  const STAIN = 0x9a8a62;
  const SHIRT = 0x262a33;
  const TROUSERS = 0x2b2f3a;
  const BOOT = 0x2a2622;
  const SKIN = 0xd6a37f;
  const SKIN_DARK = 0xaa7a5a;
  const HAIR = 0xeeece6;
  const STUBBLE = 0xb3ab9f;
  const STRAP = 0x2c2420;

  const F = octagonBase(kit, SLAB);

  // Joints in the concrete of the plant's yard.
  [
    [0, 1.45, 2.8, 0],
    [0, -0.05, 4.2, 0],
    [-0.5, 0, 3.6, Math.PI / 2],
  ].forEach(([x, z, length, turn], i) =>
    box(length, 0.004, 0.014, JOINT, x, F, z, { delay: 0.1 + i * 0.02, flat: true, noInk: true, rotation: [0, turn, 0] }),
  );

  // The cooling tower: a concrete hyperboloid, dark inside, lit cyan round the top, steaming.
  const TX = 1.05;
  const TZ = -0.95;
  const TH = 2.8;
  const towerRadius = (y: number) => 0.5 * Math.sqrt(1 + ((y - 0.68 * TH) / 1.52) ** 2);
  const profile = Array.from({ length: 15 }, (_, i) => new Vector2(towerRadius((i / 14) * TH), (i / 14) * TH));
  const tower = add(new LatheGeometry(profile, 32), TOWER, TX, F, TZ, { delay: 0.2, ink: 1.03 });
  // The ring of air inlets at its foot.
  decorate(
    tower,
    new BoxGeometry(0.1, 0.16, 0.02),
    TOWER_DARK,
    [-0.9, -0.55, -0.2, 0.15, 0.5, 0.85, 1.2].map((angle) => [Math.sin(angle) * 0.785, 0.1, Math.cos(angle) * 0.785] as Point),
  );
  add(new CylinderGeometry(towerRadius(TH) + 0.012, towerRadius(TH - 0.24) + 0.012, 0.24, 32, 1, true), CYAN, TX, F + TH - 0.24, TZ, {
    delay: 0.3,
    flat: true,
    noInk: true,
  });
  add(new TorusGeometry(towerRadius(TH) + 0.012, 0.03, 6, 32).rotateX(Math.PI / 2), TOWER_DARK, TX, F + TH - 0.03, TZ, {
    delay: 0.32,
    noInk: true,
  });
  const inner = towerRadius(TH - 0.1) - 0.012;
  cylinder(inner, inner, 0.01, GLOW, TX, F + TH - 0.1, TZ, { delay: 0.34, flat: true, noInk: true }, 32);
  const puffs = [0.17, 0.22, 0.15, 0.2, 0.24, 0.16, 0.21].map((radius, i) =>
    ball(radius, STEAM, TX, F + TH, TZ, { delay: 0.6 + i * 0.04, ink: 1.1 }),
  );
  const puffSizes = puffs.map(swelling);

  // The plant's chimney behind, its warning light blinking.
  const HX = -1.45;
  const HZ = -1.15;
  const HH = 3.05;
  cylinder(0.13, 0.2, HH, TOWER, HX, F, HZ, { delay: 0.24 });
  [2.25, 2.65].forEach((y, i) => {
    const radius = 0.2 - 0.07 * (y / HH) + 0.012;
    cylinder(radius, radius, 0.1, CYAN, HX, F + y, HZ, { delay: 0.34 + i * 0.03, flat: true, noInk: true });
  });
  cylinder(0.15, 0.15, 0.06, TOWER_DARK, HX, F + HH - 0.04, HZ, { delay: 0.38 });
  const beacon = ball(0.05, MAGENTA, HX, F + HH + 0.02, HZ, { delay: 0.42, flat: true, noInk: true });

  // The main conduit out of the tower, on its supports, with a section missing: the one he holds.
  const PY = F + 0.3;
  const PR = 0.12;
  const RUN = 1.6;
  const PZ = 1;
  const END = 0.55;
  const GAP = [0.85, 1.25];
  const pipe = (from: Point, to: Point, radius: number, color: number, delay: number, flat = false) =>
    limb(kit, from, to, radius, radius, color, { delay, flat, noInk: flat });
  pipe([RUN, PY, -0.55], [RUN, PY, PZ], PR, STEEL, 0.4);
  pipe([RUN, PY, PZ], [GAP[1], PY, PZ], PR, STEEL, 0.44);
  pipe([GAP[0], PY, PZ], [END, PY, PZ], PR, STEEL, 0.46);
  ball(PR, STEEL, RUN, PY - PR, PZ, { delay: 0.45 });
  ball(PR, STEEL, END, PY - PR, PZ, { delay: 0.47 });
  cylinder(PR, PR, PY - F, STEEL, END, F, PZ, { delay: 0.46 });
  cylinder(0.17, 0.17, 0.04, BRASS, END, F, PZ, { delay: 0.5 });
  pipe([RUN, PY, -0.48], [RUN, PY, -0.43], 0.16, BRASS, 0.48);
  pipe([GAP[1] + 0.05, PY, PZ], [GAP[1], PY, PZ], 0.16, BRASS, 0.5);
  pipe([GAP[0], PY, PZ], [GAP[0] - 0.05, PY, PZ], 0.16, BRASS, 0.52);
  pipe([GAP[1], PY, PZ], [GAP[1] - 0.012, PY, PZ], 0.1, CYAN, 0.56, true);
  pipe([GAP[0] + 0.012, PY, PZ], [GAP[0], PY, PZ], 0.1, CYAN, 0.56, true);
  box(0.22, PY - F - PR + 0.02, 0.08, STEEL_DARK, RUN, F, 0.2, { delay: 0.38 });
  [1.42, 0.7].forEach((x, i) => box(0.08, PY - F - PR + 0.02, 0.22, STEEL_DARK, x, F, PZ, { delay: 0.39 + i * 0.02 }));
  // Rings round the pipe that light up one after the other, up to the break; past it, nothing.
  const ring = (color: number, x: number, z: number, across: boolean, delay: number) => {
    const geometry = new TorusGeometry(PR + 0.008, 0.022, 6, 20);
    if (across) geometry.rotateY(Math.PI / 2);
    return add(geometry, color, x, PY - PR - 0.03, z, { delay, flat: true, noInk: true });
  };
  const flow = [
    ...[-0.25, -0.05, 0.15, 0.35, 0.55, 0.75].map((z, i) => ring(CYAN, RUN, z, false, 0.6 + i * 0.03)),
    ring(CYAN, 1.4, PZ, true, 0.8),
  ];
  ring(DIM, 0.7, PZ, true, 0.82);
  const gapSpark = zigzag(kit, jag([GAP[1] - 0.02, PY, PZ], [GAP[0] + 0.02, PY + 0.02, PZ], 4, 0.05, 3), 0.022, YELLOW, 1.6);

  // His drafting table, the blueprints of the plant glowing on it.
  const DX = -1.3;
  const DZ = -0.15;
  const TILT = 0.5;
  const TOP = F + 1.2;
  [-1, 1].forEach((sx, i) =>
    [-1, 1].forEach((sz) => {
      const dz = sz * 0.25;
      cylinder(0.03, 0.035, TOP - F - dz * Math.sin(TILT) - 0.01, STEEL_DARK, DX + sx * 0.42, F, DZ + dz * Math.cos(TILT), { delay: 0.3 + i * 0.02 });
    }),
  );
  box(0.84, 0.04, 0.04, STEEL_DARK, DX, F + 0.32, DZ + 0.25 * Math.cos(TILT), { delay: 0.36 });
  const board = box(1, 0.05, 0.7, BOARD, DX, TOP, DZ, { delay: 0.4, rotation: [TILT, 0, 0] });
  decorate(board, new BoxGeometry(0.9, 0.004, 0.6), PAPER, [[0, 0.052, 0]]);
  decorate(board, new BoxGeometry(0.9, 0.003, 0.006), GRID, [-0.2, 0, 0.2].map((z) => [0, 0.055, z] as Point));
  decorate(board, new BoxGeometry(0.006, 0.003, 0.6), GRID, [-0.3, -0.1, 0.1, 0.3].map((x) => [x, 0.055, 0] as Point));
  /** Lines drawn on the sheet, from point to point of the board's top (x across, z down the slope). */
  const draw = (points: [number, number][], color: number, width: number, height: number) => {
    const drawn: MeshBasicMaterial[] = [];
    for (let i = 1; i < points.length; i++) {
      const [x1, z1] = points[i - 1];
      const [x2, z2] = points[i];
      const geometry = new BoxGeometry(Math.hypot(x2 - x1, z2 - z1) + width, 0.003, width).rotateY(Math.atan2(-(z2 - z1), x2 - x1));
      drawn.push(decorate(board, geometry, color, [[(x1 + x2) / 2, height, (z1 + z2) / 2]]));
    }
    return drawn;
  };
  // The tower in elevation, and the conduit with the section he has taken out of it.
  const lines = [
    ...draw([[-0.36, 0.22], [-0.28, -0.04], [-0.3, -0.22]], CYAN, 0.014, 0.058),
    ...draw([[-0.04, 0.22], [-0.12, -0.04], [-0.1, -0.22]], CYAN, 0.014, 0.058),
    ...draw([[-0.4, 0.22], [0, 0.22]], CYAN, 0.014, 0.058),
    ...draw([[-0.04, 0.15], [0.1, 0.15]], CYAN, 0.014, 0.058),
    ...draw([[0.24, 0.15], [0.4, 0.15]], CYAN, 0.014, 0.058),
    ...draw([[0.12, 0.1], [0.22, 0.1], [0.22, 0.2], [0.12, 0.2], [0.12, 0.1]], CYAN, 0.01, 0.058),
  ];
  // Magic, crossed out: he has no use for it.
  decorate(board, new TorusGeometry(0.1, 0.014, 6, 28).rotateX(Math.PI / 2), MAGENTA, [[0.24, 0.058, -0.12]]);
  decorate(board, new TorusGeometry(0.05, 0.009, 6, 20).rotateX(Math.PI / 2), MAGENTA, [[0.24, 0.058, -0.12]]);
  draw([[0.1, -0.26], [0.38, 0.02]], YELLOW, 0.03, 0.062);
  draw([[0.1, 0.02], [0.38, -0.26]], YELLOW, 0.03, 0.062);

  // A crate for the bidders: stacks of coins, one spinning, and the auctioneer's gavel.
  const CX = -0.8;
  const CZ = 1.2;
  const crate = box(0.52, 0.34, 0.42, WOOD, CX, F, CZ, { delay: 0.5, rotation: [0, 0.2, 0] });
  decorate(crate, new BoxGeometry(0.52, 0.02, 0.01), WOOD_DARK, [
    [0, 0.11, 0.212],
    [0, 0.23, 0.212],
  ]);
  const CT = F + 0.34;
  [
    [-0.12, -0.06, 0.12],
    [0.02, -0.1, 0.18],
    [0.14, 0.02, 0.07],
  ].forEach(([dx, dz, height], i) => {
    const stack = cylinder(0.07, 0.07, height, YELLOW, CX + dx, CT, CZ + dz, { delay: 0.7 + i * 0.04 });
    decorate(
      stack,
      new CylinderGeometry(0.072, 0.072, 0.006, 14),
      COIN_EDGE,
      Array.from({ length: Math.floor(height / 0.03) }, (_, k) => [0, 0.03 + k * 0.03, 0] as Point),
    );
  });
  const coin = add(new CylinderGeometry(0.06, 0.06, 0.016, 16).rotateX(Math.PI / 2), YELLOW, CX - 0.12, CT, CZ + 0.13, { delay: 0.82 });
  add(new CylinderGeometry(0.05, 0.05, 0.17, 12).rotateX(Math.PI / 2), WOOD_DARK, CX + 0.16, CT, CZ + 0.12, { delay: 0.84, rotation: [0, 0.4, 0] });
  limb(kit, [CX + 0.16, CT + 0.035, CZ + 0.12], [CX - 0.08, CT + 0.025, CZ + 0.22], 0.02, 0.018, WOOD_DARK, { delay: 0.86 });

  // Auctor: a lanky old man in a burnt lab coat, goggles pushed up on his white hair.
  const x0 = 0.15;
  const z0 = 0.35;
  const D = 1;
  const G = F;
  [-1, 1].forEach((side, i) => {
    box(0.19, 0.12, 0.32, BOOT, x0 + side * 0.14, G, z0 + 0.05, { delay: D + i * 0.02 });
    cylinder(0.1, 0.11, 0.8, TROUSERS, x0 + side * 0.14, G + 0.1, z0, { delay: D + 0.04 + i * 0.02 });
  });
  const skirt = add(new CylinderGeometry(0.31, 0.43, 0.88, 18).scale(1, 1, 0.78), COAT, x0, G + 0.45, z0, { delay: D + 0.1 });
  box(0.13, 0.88, 0.04, TROUSERS, x0, G + 0.45, z0 + 0.325, { delay: D + 0.12, noInk: true, rotation: [-0.106, 0, 0] });
  const onSkirt = (angle: number, y: number): Point => {
    const radius = 0.43 - 0.12 * (y / 0.88) + 0.004;
    return [Math.sin(angle) * radius, y, Math.cos(angle) * radius * 0.78];
  };
  decorate(skirt, new CylinderGeometry(0.035, 0.035, 0.012, 10).rotateX(Math.PI / 2), BURN, [
    onSkirt(-0.9, 0.22),
    onSkirt(0.6, 0.55),
    onSkirt(1.05, 0.2),
    onSkirt(0.4, 0.14),
  ]);
  decorate(skirt, new SphereGeometry(0.06, 10, 8).scale(1, 0.7, 0.3), STAIN, [onSkirt(-0.55, 0.6), onSkirt(0.8, 0.36)]);
  add(new CylinderGeometry(0.37, 0.31, 0.6, 18).scale(1, 1, 0.72), COAT, x0, G + 1.25, z0, { delay: D + 0.14 });
  box(0.15, 0.55, 0.03, SHIRT, x0, G + 1.28, z0 + 0.235, { delay: D + 0.16, noInk: true, rotation: [0.07, 0, 0] });
  [-1, 1].forEach((side, i) =>
    box(0.08, 0.45, 0.035, COAT_SHADE, x0 + side * 0.1, G + 1.36, z0 + 0.25, { delay: D + 0.18 + i * 0.02, rotation: [0.07, 0, -side * 0.28] }),
  );
  box(0.46, 0.17, 0.08, COAT_SHADE, x0, G + 1.8, z0 - 0.13, { delay: D + 0.2, rotation: [-0.35, 0, 0] });
  [-1, 1].forEach((side, i) => ball(0.14, COAT, x0 + side * 0.37, G + 1.62, z0, { delay: D + 0.22 + i * 0.02 }));

  // His head: a long face, a sly smile, white stubble, white hair standing up all round.
  cylinder(0.08, 0.09, 0.15, SKIN, x0, G + 1.82, z0 + 0.01, { delay: D + 0.34 });
  const head = add(new SphereGeometry(0.21, 18, 14).scale(0.9, 1.15, 0.95), SKIN, x0, G + 1.93, z0 + 0.02, { delay: D + 0.4 });
  const cy = 0.2415;
  const C: Point = [x0, G + 1.93 + cy, z0 + 0.02];
  decorate(head, new SphereGeometry(0.2133, 16, 8, 0, Math.PI * 2, 0.6 * Math.PI, 0.4 * Math.PI).scale(0.9, 1.15, 0.95), STUBBLE, [[0, cy, 0]]);
  decorate(head, new BoxGeometry(0.055, 0.03, 0.022), INK, [
    [-0.072, cy + 0.033, 0.179],
    [0.072, cy + 0.033, 0.179],
  ]);
  decorate(head, new BoxGeometry(0.094, 0.026, 0.033), HAIR, [
    [-0.075, cy + 0.075, 0.168, -0.12],
    [0.075, cy + 0.094, 0.166, 0.35],
  ]);
  decorate(head, new BoxGeometry(0.05, 0.088, 0.055), SKIN_DARK, [[0, cy - 0.022, 0.188]]);
  decorate(head, new BoxGeometry(0.11, 0.018, 0.022), INK, [[0.013, cy - 0.119, 0.177, 0.18]]);
  decorate(head, new SphereGeometry(0.039, 8, 6), SKIN_DARK, [
    [-0.186, cy, -0.01],
    [0.186, cy, -0.01],
  ]);
  ball(0.19, HAIR, C[0], C[1] - 0.055, C[2] - 0.077, { delay: D + 0.46 });
  const spikes: Point[] = [
    [0, 1, -0.15],
    [-0.55, 0.8, -0.2],
    [0.55, 0.8, -0.2],
    [-0.9, 0.35, -0.2],
    [0.9, 0.35, -0.2],
    [-0.35, 0.6, -0.75],
    [0.35, 0.6, -0.75],
    [0, 0.3, -1],
    [-0.95, -0.05, -0.35],
    [0.95, -0.05, -0.35],
    [-0.3, 0.95, 0.3],
    [0.3, 0.95, 0.3],
  ];
  spikes.forEach((direction, i) => {
    const n = Math.hypot(...direction);
    const at = (reach: number): Point => [
      C[0] + (direction[0] / n) * reach,
      C[1] + 0.066 + (direction[1] / n) * reach,
      C[2] - 0.044 + (direction[2] / n) * reach,
    ];
    const from = at(0.155);
    const { length, rotation } = aim(from, at(0.44));
    add(new ConeGeometry(0.08, length, 6), HAIR, ...from, { delay: D + 0.5 + i * 0.015, rotation });
  });
  // The goggles, pushed up on his forehead.
  add(new TorusGeometry(0.171, 0.024, 6, 24).rotateX(Math.PI / 2).scale(0.96, 1, 1.02), STRAP, C[0], C[1] + 0.12 - 0.024, C[2], {
    delay: D + 0.56,
    noInk: true,
  });
  [-1, 1].forEach((side, i) => {
    const cup = add(new CylinderGeometry(0.057, 0.057, 0.077, 14).rotateX(Math.PI / 2), BRASS, C[0] + side * 0.072, C[1] + 0.16 - 0.057, C[2] + 0.16, {
      delay: D + 0.6 + i * 0.02,
    });
    decorate(cup, new CylinderGeometry(0.044, 0.044, 0.01, 14).rotateX(Math.PI / 2), CYAN, [[0, 0.057, 0.04]]);
  });
  box(0.044, 0.022, 0.022, BRASS, C[0], C[1] + 0.149, C[2] + 0.177, { delay: D + 0.62, noInk: true });

  // His left arm holds the section of conduit up high; the right waits, palm up, for the bids.
  const shoulderL: Point = [x0 + 0.39, G + 1.75, z0];
  const elbowL: Point = [x0 + 0.64, G + 2.08, z0 + 0.1];
  const fist: Point = [x0 + 0.6, G + 2.47, z0 + 0.2];
  limb(kit, shoulderL, elbowL, 0.12, 0.11, COAT, { delay: D + 0.28 });
  ball(0.11, COAT_SHADE, elbowL[0], elbowL[1] - 0.11, elbowL[2], { delay: D + 0.3 });
  limb(kit, elbowL, between(elbowL, fist, 0.75), 0.11, 0.1, COAT, { delay: D + 0.32 });
  ball(0.1, SKIN, fist[0], fist[1] - 0.1, fist[2], { delay: D + 0.36 });
  const lotY = fist[1] + 0.06;
  cylinder(0.15, 0.15, 0.05, BRASS, fist[0], lotY, fist[2], { delay: D + 0.5 });
  cylinder(0.11, 0.11, 0.34, STEEL, fist[0], lotY + 0.05, fist[2], { delay: D + 0.52 });
  const lotGlow = cylinder(0.116, 0.116, 0.14, CYAN, fist[0], lotY + 0.15, fist[2], { delay: D + 0.54, flat: true, noInk: true });
  cylinder(0.15, 0.15, 0.05, BRASS, fist[0], lotY + 0.39, fist[2], { delay: D + 0.56 });

  const shoulderR: Point = [x0 - 0.39, G + 1.75, z0];
  const elbowR: Point = [x0 - 0.58, G + 1.3, z0 + 0.12];
  const palm: Point = [x0 - 0.55, G + 1.38, z0 + 0.55];
  const wristR = between(elbowR, palm, 0.8);
  limb(kit, shoulderR, elbowR, 0.12, 0.11, COAT, { delay: D + 0.28 });
  ball(0.11, COAT_SHADE, elbowR[0], elbowR[1] - 0.11, elbowR[2], { delay: D + 0.3 });
  limb(kit, elbowR, wristR, 0.11, 0.1, COAT, { delay: D + 0.32 });
  add(new SphereGeometry(0.1, 14, 10).scale(1.1, 0.5, 1.2), SKIN, palm[0], palm[1] - 0.05, palm[2], { delay: D + 0.36 });
  [
    [-0.03, 0.02],
    [0.035, -0.03],
  ].forEach(([dx, dz], i) => cylinder(0.05, 0.05, 0.018, YELLOW, palm[0] + dx, palm[1] + 0.01 + i * 0.018, palm[2] + dz, { delay: D + 0.7 + i * 0.04 }));
  // The price tag on his own wrist.
  const tag = box(0.008, 0.12, 0.008, INK, wristR[0], wristR[1] - 0.1, wristR[2], { delay: D + 0.7, noInk: true, rotation: [0, 0, Math.PI] });
  decorate(tag, new BoxGeometry(0.15, 0.2, 0.012), INK, [[0, 0.22, 0]]);
  decorate(tag, new BoxGeometry(0.125, 0.175, 0.02), YELLOW, [[0, 0.22, 0]]);
  decorate(tag, new CylinderGeometry(0.016, 0.016, 0.024, 10).rotateX(Math.PI / 2), INK, [[0, 0.155, 0]]);

  // The current jumps from the broken conduit up to the section in his hand.
  const gapMid: Point = [(GAP[0] + GAP[1]) / 2, PY + 0.1, PZ];
  const lotTop: Point = [fist[0] + 0.13, lotY + 0.26, fist[2]];
  const boltA = zigzag(kit, jag(gapMid, lotTop, 8, 0.1, 1), 0.03, YELLOW, 1.7);
  const boltB = zigzag(kit, jag([gapMid[0] + 0.08, gapMid[1], gapMid[2]], [lotTop[0], lotTop[1] - 0.16, lotTop[2] + 0.06], 7, 0.13, 2), 0.022, YELLOW, 1.75);
  motes(8, YELLOW, 0.025, [fist[0] - 0.25, lotY + 0.1, fist[2] - 0.15], [fist[0] + 0.3, lotY + 0.75, fist[2] + 0.15], 1.8);

  const flowFrom = new Color(DIM);
  const flowTo = new Color(CYAN);
  const lotFrom = new Color(CYAN);
  const lotTo = new Color(GLOW);
  tick((t) => {
    // Steam rises from the tower, swells and thins out.
    puffs.forEach((puff, i) => {
      const u = (t * 0.12 + i / puffs.length) % 1;
      puff.position.set(TX - 0.15 + u * 0.5 + Math.sin(i * 2.3) * 0.12, F + TH - 0.25 + u * 1.05, TZ + 0.05 - u * 0.25 + Math.cos(i * 1.7) * 0.08);
      puffSizes[i](Math.sin(Math.PI * u) ** 0.6);
    });
    // The current runs along the conduit and stops at the break.
    flow.forEach((part, i) => colorOf(part).lerpColors(flowFrom, flowTo, (Math.sin(t * 5 - i * 1) + 1) / 2));
    colorOf(lotGlow).lerpColors(lotFrom, lotTo, ((Math.sin(t * 3) + 1) / 2) * 0.7);
    for (const line of lines) line.color.lerpColors(lotFrom, lotTo, ((Math.sin(t * 1.3) + 1) / 2) * 0.5);
    // The sparks crackle: the big one nearly always there, the others come and go.
    const beat = Math.floor(t * 12);
    const noise = Math.sin(beat * 12.9898) * 43758.5453;
    const a = beat % 5 !== 4;
    const b = noise - Math.floor(noise) > 0.5;
    for (const piece of boltA) piece.visible = a;
    for (const piece of boltB) piece.visible = b;
    for (const piece of gapSpark) piece.visible = beat % 3 !== 1;
    beacon.visible = Math.floor(t * 1.2) % 2 === 0;
    tag.rotation.z = Math.PI + Math.sin(t * 1.6) * 0.18;
    coin.rotation.y = t * 6;
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
