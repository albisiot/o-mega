import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import {
  YELLOW,
  ORANGE,
  CYAN,
  MAGENTA,
  INK,
  octagonBase,
  limb,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/** A flame: a drop, round at its foot, licking up to a point that bends to one side. */
function flameShape(radius: number, height: number, bend: number): LatheGeometry {
  const profile = [
    [0, 0],
    [0.55, 0.03],
    [0.9, 0.11],
    [1, 0.22],
    [0.86, 0.38],
    [0.56, 0.58],
    [0.26, 0.8],
    [0, 1],
  ].map(([r, y]) => new Vector2(r * radius, y * height));
  const geometry = new LatheGeometry(profile, 9);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const u = position.getY(i) / height;
    position.setX(i, position.getX(i) + bend * u * u * height);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A scorch mark: a flat, ragged splat. */
function splat(radius: number, seed: number): ExtrudeGeometry {
  const shape = new Shape();
  const POINTS = 22;
  for (let i = 0; i < POINTS; i++) {
    const angle = (i / POINTS) * Math.PI * 2;
    const r = radius * (i % 2 ? 0.55 + 0.15 * Math.sin(seed + i * 3.1) : 0.9 + 0.22 * Math.sin(seed * 2 + i * 1.7));
    if (i) shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else shape.moveTo(r, 0);
  }
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false }).rotateX(-Math.PI / 2);
}

/** A flat cut-out standing on its foot and facing +z, like the scenery of a pop-up book. */
function cutout(shape: Shape, depth: number): ExtrudeGeometry {
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -depth / 2);
}

/**
 * A ribbon of fire winding up round a vertical axis, thinner towards its tip: `turns` round in
 * `rise`, starting `reach` out, thin at both ends. Returns the ribbon at a thickness, so its ink
 * can be a thicker twin.
 */
function spiral(turns: number, phase: number, rise: number, reach: number): (thickness: number) => TubeGeometry {
  const SEGMENTS = 60;
  const SIDES = 6;
  const curve = new CatmullRomCurve3(
    Array.from({ length: 25 }, (_, i) => {
      const u = i / 24;
      const angle = phase + u * turns * Math.PI * 2;
      const radius = reach * (1 - u * 0.75);
      return new Vector3(Math.cos(angle) * radius, u * rise, Math.sin(angle) * radius);
    }),
  );
  return (thickness) => {
    const geometry = new TubeGeometry(curve, SEGMENTS, thickness, SIDES);
    const position = geometry.attributes.position;
    const centre = new Vector3();
    for (let i = 0; i < position.count; i++) {
      const u = Math.floor(i / (SIDES + 1)) / SEGMENTS;
      curve.getPointAt(u, centre);
      const taper = Math.min(1, 0.3 + u * 7) * (1 - u * 0.8);
      position.setXYZ(
        i,
        centre.x + (position.getX(i) - centre.x) * taper,
        centre.y + (position.getY(i) - centre.y) * taper,
        centre.z + (position.getZ(i) - centre.z) * taper,
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  };
}

/**
 * Kiln (P044): the pyromaniac of the Figli dell'Ultima, who lit his first fire by mistake and
 * none of the others. On a terrace of the high quarters, behind a stone balustrade, the roofs,
 * a dome and a bell tower stand against the volcano smoking far off on the skyline. He has set
 * the café's parasol alight and stands there grinning, a ribbon of fire winding round and round
 * above his raised palm and a lit match in his other hand. The price: he has not noticed that
 * the tail of his own coat is on fire too, a step from his jerrycan of petrol.
 */
export function kiln(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const TILE = 0x2f2838;
  const GROUT = 0x433a4e;
  const SCORCH = 0x16121a;
  const STONE = 0xa497b6;
  const STONE_DARK = 0x766a8a;
  const ROOFS = 0x241a36;
  const FAR = 0x47315f;
  const SMOKE = 0x5e4a66;
  const SMOKE_FAR = 0x4e3a62;
  const METAL = 0x5d6676;
  const POLE = 0xd8d0c4;
  const CANVAS = 0xc8306a;
  const VALANCE = 0x178fb5;
  const CUP = 0xf2eee6;
  const LEAF = 0x1f6f63;
  const LEAF_LIGHT = 0x2a8a78;
  const BARK = 0x4a3a40;
  const MATCH = 0xd9c7a0;
  const COAT = 0x5a2338;
  const COAT_LIGHT = 0x76304d;
  const SHIRT = 0x17151c;
  const TROUSERS = 0x221f2a;
  const SHOE = 0x141218;
  const SKIN = 0xe9d0c2;
  const SKIN_DARK = 0xbd968a;
  const SOCKET = 0x9a6a70;
  const TEETH = 0xf6f1e8;
  const SOOT = 0x3d343c;
  const CAN = 0xb02a58;
  const CAN_DARK = 0x7c1c3e;

  const F = octagonBase(kit, TILE);
  const G = F;

  /** Flames that lick and sway: an orange tongue, its yellow heart turned to the front. */
  const flames: { parts: Group[]; rest: number[][]; phase: number }[] = [];
  const flame = (x: number, y: number, z: number, size: number, delay: number) => {
    const phase = flames.length * 1.7;
    const turn: Point = [0, phase * 2.3, 0];
    const tongue = add(flameShape(0.11 * size, 0.46 * size, 0.3), ORANGE, x, y, z, { delay, flat: true, ink: 1.1, rotation: turn });
    const heart = add(flameShape(0.065 * size, 0.27 * size, 0.25), YELLOW, x + 0.026 * size, y, z + 0.072 * size, {
      delay: delay + 0.02,
      flat: true,
      noInk: true,
      rotation: turn,
    });
    const parts = [tongue, heart];
    flames.push({ parts, rest: parts.map((part) => part.children.map((child) => child.scale.y)), phase });
  };
  /** Puffs of smoke rising from a point and drifting with the wind, again and again. */
  const smokes: { puffs: Group[]; from: Point; drift: Point; period: number }[] = [];
  const smoke = (from: Point, drift: Point, count: number, size: number, color: number, period: number, delay: number) => {
    const puffs = Array.from({ length: count }, (_, i) => ball(size * (1 + (i % 2) * 0.25), color, ...from, { delay: delay + i * 0.05, noInk: true }));
    smokes.push({ puffs, from, drift, period });
  };

  // The terrace: big square tiles, scorched round the café table.
  const across = (v: number) => Math.min(2.1, 3.0 - Math.abs(v));
  [-0.65, -0.25, 0.15, 0.55, 0.95, 1.35, 1.75].forEach((z, i) =>
    box(across(z) * 2, 0.004, 0.018, GROUT, 0, F, z, { delay: 0.1 + i * 0.015, flat: true, noInk: true }),
  );
  [-1.8, -1.4, -1.0, -0.6, -0.2, 0.2, 0.6, 1.0, 1.4, 1.8].forEach((x, i) => {
    const from = Math.max(-1.05, -across(x));
    const to = across(x);
    box(0.018, 0.004, to - from, GROUT, x, F, (from + to) / 2, { delay: 0.12 + i * 0.015, flat: true, noInk: true });
  });

  // The far skyline: the volcano smoking behind the roofs, a dome and a bell tower of the city.
  const cone = new Shape();
  cone.moveTo(-1.25, 0);
  cone.lineTo(-1.25, 0.8);
  cone.lineTo(-0.36, 1.96);
  cone.lineTo(-0.24, 1.92);
  cone.lineTo(-0.1, 1.95);
  cone.lineTo(0.02, 1.9);
  cone.lineTo(0.7, 1.32);
  cone.lineTo(1.25, 1.05);
  cone.lineTo(1.25, 0);
  cone.closePath();
  const volcano = add(cutout(cone, 0.05), FAR, 0, F, -1.85, { delay: 0.2, ink: 1.015 });
  decorate(volcano, new BoxGeometry(0.34, 0.05, 0.006), ORANGE, [[-0.17, 1.92, 0.028]]);
  decorate(volcano, new BoxGeometry(0.16, 0.03, 0.006), YELLOW, [[-0.17, 1.93, 0.032]]);
  const roofs = new Shape();
  roofs.moveTo(-1.45, 0);
  roofs.lineTo(-1.45, 1.05);
  roofs.lineTo(-1.2, 1.05);
  roofs.lineTo(-1.2, 1.25);
  roofs.lineTo(-0.95, 1.25);
  roofs.lineTo(-0.95, 0.98);
  roofs.lineTo(-0.85, 0.98);
  roofs.absarc(-0.62, 0.98, 0.23, Math.PI, 0, true);
  roofs.lineTo(-0.39, 0.95);
  roofs.lineTo(-0.2, 0.95);
  roofs.lineTo(-0.2, 1.1);
  roofs.lineTo(0.15, 1.1);
  roofs.lineTo(0.15, 0.9);
  roofs.lineTo(0.35, 0.9);
  roofs.lineTo(0.35, 1.55);
  roofs.lineTo(0.45, 1.72);
  roofs.lineTo(0.55, 1.55);
  roofs.lineTo(0.55, 1.0);
  roofs.lineTo(0.9, 1.0);
  roofs.lineTo(0.9, 1.2);
  roofs.lineTo(1.15, 1.2);
  roofs.lineTo(1.15, 0.9);
  roofs.lineTo(1.45, 0.9);
  roofs.lineTo(1.45, 0);
  roofs.closePath();
  const city = add(cutout(roofs, 0.05), ROOFS, 0, F, -1.58, { delay: 0.26, ink: 1.015 });
  decorate(city, new BoxGeometry(0.05, 0.1, 0.05), ROOFS, [[-0.62, 1.25, 0]]);
  decorate(
    city,
    new BoxGeometry(0.045, 0.06, 0.006),
    CYAN,
    [
      [-1.35, 0.92],
      [-1.1, 1.12],
      [-1.02, 0.95],
      [-0.1, 0.98],
      [0.42, 1.36],
      [0.75, 0.88],
      [1.25, 0.8],
    ].map(([x, y]) => [x, y, 0.028] as Point),
  );
  decorate(
    city,
    new BoxGeometry(0.045, 0.06, 0.006),
    MAGENTA,
    [
      [-1.25, 0.88],
      [0.05, 0.96],
      [0.48, 1.18],
      [0.98, 1.06],
      [1.35, 0.8],
    ].map(([x, y]) => [x, y, 0.028] as Point),
  );
  smoke([-0.17, F + 1.95, -1.85], [0.5, 0.8, 0], 3, 0.12, SMOKE_FAR, 9, 0.6);

  // The balustrade along the terrace's edge: a plinth, stone balusters, end posts and the rail.
  const BZ = -1.2;
  box(3.2, 0.09, 0.3, STONE_DARK, 0, F, BZ, { delay: 0.14 });
  const baluster = [
    [0, 0],
    [0.065, 0],
    [0.065, 0.05],
    [0.04, 0.09],
    [0.05, 0.2],
    [0.08, 0.32],
    [0.055, 0.45],
    [0.035, 0.5],
    [0.06, 0.55],
    [0.06, 0.6],
    [0, 0.6],
  ].map(([r, y]) => new Vector2(r, y));
  for (let i = 0; i < 11; i++) add(new LatheGeometry(baluster, 10), STONE, -1.3 + i * 0.26, F + 0.09, BZ, { delay: 0.18 + i * 0.02 });
  [-1.5, 1.5].forEach((x, i) => {
    box(0.22, 0.6, 0.26, STONE_DARK, x, F + 0.09, BZ, { delay: 0.2 + i * 0.03 });
    ball(0.075, STONE, x, F + 0.79, BZ, { delay: 0.42 + i * 0.03 });
  });
  box(3.24, 0.1, 0.34, STONE, 0, F + 0.69, BZ, { delay: 0.4 });

  // A little tree in a stone pot, in the corner.
  const pot = [
    [0, 0],
    [0.16, 0],
    [0.2, 0.3],
    [0.23, 0.33],
    [0.23, 0.36],
    [0, 0.36],
  ].map(([r, y]) => new Vector2(r, y));
  const TX = -1.68;
  const TZ = -0.72;
  add(new LatheGeometry(pot, 12), STONE_DARK, TX, F, TZ, { delay: 0.3 });
  cylinder(0.035, 0.045, 0.55, BARK, TX, F + 0.36, TZ, { delay: 0.34 });
  [
    [0, 0.85, 0, 0.27, LEAF],
    [-0.16, 0.78, 0.08, 0.19, LEAF_LIGHT],
    [0.16, 0.8, -0.04, 0.2, LEAF_LIGHT],
    [0.02, 1.08, -0.02, 0.18, LEAF],
  ].forEach(([dx, y, dz, radius, color], i) => ball(radius, color, TX + dx, F + y, TZ + dz, { delay: 0.38 + i * 0.03 }));

  // The café table with its espresso, and the parasol over it, on fire.
  const PX = 1.1;
  const PZ = -0.1;
  cylinder(0.17, 0.19, 0.03, METAL, PX, G, PZ, { delay: 0.3 });
  cylinder(0.03, 0.03, 0.56, METAL, PX, G + 0.03, PZ, { delay: 0.32 });
  cylinder(0.32, 0.32, 0.035, METAL, PX, G + 0.59, PZ, { delay: 0.36 });
  cylinder(0.06, 0.06, 0.012, CUP, PX - 0.14, G + 0.625, PZ + 0.12, { delay: 0.5 });
  cylinder(0.038, 0.03, 0.055, CUP, PX - 0.14, G + 0.637, PZ + 0.12, { delay: 0.52 });
  cylinder(0.022, 0.022, 1.2, POLE, PX, G + 0.625, PZ, { delay: 0.4 });
  const octagon: Point = [0, Math.PI / 8, 0];
  cylinder(0.84, 0.84, 0.07, VALANCE, PX, G + 1.74, PZ, { delay: 0.46, rotation: octagon }, 8);
  cylinder(0.03, 0.82, 0.3, CANVAS, PX, G + 1.8, PZ, { delay: 0.5, rotation: octagon }, 8);
  const canopy = (dx: number, dz: number) => G + 1.8 + 0.3 * (1 - Math.hypot(dx, dz) / 0.82) - 0.02;
  [
    [0, 0, 1.3],
    [0.32, -0.15, 0.95],
    [-0.25, -0.3, 0.85],
    [0.12, 0.4, 0.8],
    [0.52, 0.22, 0.72],
    [-0.45, 0.18, 0.68],
    [0.4, -0.48, 0.75],
  ].forEach(([dx, dz, size], i) => flame(PX + dx, canopy(dx, dz), PZ + dz, size, 1.4 + i * 0.04));
  smoke([PX + 0.05, G + 2.5, PZ], [0.35, 1.0, 0.1], 5, 0.1, SMOKE, 3.4, 1.6);
  motes(14, ORANGE, 0.028, [PX - 0.7, G + 1.9, PZ - 0.6], [PX + 0.6, G + 3.1, PZ + 0.6], 1.6);
  // Scorch marks on the tiles, and a scrap of burning canvas fallen by the table.
  [
    [PX - 0.38, PZ + 0.38, 0.26],
    [PX + 0.32, PZ + 0.5, 0.18],
    [PX - 0.62, PZ + 0.72, 0.2],
  ].forEach(([x, z, radius], i) => add(splat(radius, i * 1.9 + 0.4), SCORCH, x, F + 0.002, z, { delay: 1.3 + i * 0.03, flat: true, noInk: true }));
  box(0.22, 0.012, 0.16, CANVAS, PX - 0.62, F, PZ + 0.72, { delay: 1.36, rotation: [0, 0.5, 0] });
  flame(PX - 0.62, F + 0.01, PZ + 0.72, 0.5, 1.5);

  // Kiln: tall and gaunt in a long coat, the collar wide round his neck.
  const x0 = -0.5;
  const z0 = 0.45;
  const D = 0.9;
  [-1, 1].forEach((side, i) => {
    box(0.15, 0.1, 0.3, SHOE, x0 + side * 0.14, G, z0 + 0.08, { delay: D + i * 0.02, rotation: [0, side * 0.18, 0] });
    cylinder(0.065, 0.07, 0.45, TROUSERS, x0 + side * 0.13, G + 0.08, z0, { delay: D + 0.04 + i * 0.02 });
  });
  // His jerrycan of petrol, right by his feet.
  const JX = x0 + 0.74;
  const JZ = z0 + 0.52;
  const can = box(0.27, 0.34, 0.12, CAN, JX, F, JZ, { delay: 1.2, rotation: [0, -0.45, 0] });
  decorate(can, new BoxGeometry(0.34, 0.022, 0.008), CAN_DARK, [
    [0, 0.17, 0.062, 0.9],
    [0, 0.17, 0.062, -0.9],
  ]);
  decorate(can, new BoxGeometry(0.13, 0.05, 0.04), CAN_DARK, [[-0.04, 0.36, 0]]);
  decorate(can, new CylinderGeometry(0.022, 0.028, 0.09).rotateZ(-0.6), SHOE, [[0.1, 0.37, 0]]);
  const skirt = add(new CylinderGeometry(0.29, 0.48, 1.0, 18).scale(1, 1, 0.74), COAT, x0, G + 0.32, z0, { delay: D + 0.08 });
  decorate(skirt, new BoxGeometry(0.08, 1.0, 0.012).rotateX(-0.14), SHIRT, [[0, 0.5, 0.29]]);
  // The price: the tail of his coat has caught fire, and he has not noticed.
  [1.05, 1.5, 1.95, 2.4].forEach((angle, i) => {
    decorate(skirt, new SphereGeometry(0.09, 8, 6).scale(1, 0.8, 0.5), SCORCH, [[0.46 * Math.sin(angle), 0.12, 0.34 * Math.cos(angle)]]);
    flame(x0 + 0.5 * Math.sin(angle), G + 0.28 + (i % 2) * 0.06, z0 + 0.37 * Math.cos(angle), [0.62, 0.85, 0.75, 0.55][i], 1.7 + i * 0.04);
  });
  smoke([x0 + 0.55, G + 0.7, z0 - 0.05], [0.25, 1.4, 0.05], 4, 0.08, SMOKE, 2.6, 1.8);
  const torso = add(new CylinderGeometry(0.32, 0.27, 0.7, 16).scale(1, 1, 0.7), COAT, x0, G + 1.26, z0, { delay: D + 0.12 });
  decorate(torso, new BoxGeometry(0.13, 0.5, 0.014).rotateX(0.07), SHIRT, [[0, 0.42, 0.212]]);
  decorate(torso, new BoxGeometry(0.06, 0.4, 0.025), COAT_LIGHT, [
    [-0.085, 0.47, 0.212, 0.28],
    [0.085, 0.47, 0.212, -0.28],
  ]);
  [-1, 1].forEach((side, i) => ball(0.13, COAT, x0 + side * 0.3, G + 1.72, z0, { delay: D + 0.18 + i * 0.02 }));
  add(new TorusGeometry(0.24, 0.085, 8, 22).rotateX(Math.PI / 2).scale(1, 1, 0.8), COAT_LIGHT, x0, G + 1.86, z0 - 0.01, { delay: D + 0.26 });

  // His right arm raised, the palm open under the fire; long bony fingers curled round it.
  const at = (from: Point, to: Point, u: number): Point => [
    MathUtils.lerp(from[0], to[0], u),
    MathUtils.lerp(from[1], to[1], u),
    MathUtils.lerp(from[2], to[2], u),
  ];
  const shoulderR: Point = [x0 - 0.3, G + 1.84, z0];
  const elbowR: Point = [x0 - 0.62, G + 1.58, z0 + 0.1];
  const palm: Point = [x0 - 0.66, G + 2.06, z0 + 0.22];
  limb(kit, shoulderR, elbowR, 0.1, 0.095, COAT, { delay: D + 0.22 });
  ball(0.095, COAT_LIGHT, elbowR[0], elbowR[1] - 0.095, elbowR[2], { delay: D + 0.24 });
  const cuffR = at(elbowR, palm, 0.62);
  limb(kit, elbowR, cuffR, 0.095, 0.135, COAT, { delay: D + 0.26 });
  limb(kit, at(elbowR, palm, 0.5), palm, 0.045, 0.04, SKIN, { delay: D + 0.28 });
  add(new SphereGeometry(0.07, 12, 8).scale(1.05, 0.5, 1.1), SKIN, palm[0], palm[1] - 0.035, palm[2], { delay: D + 0.3 });
  [2.0, 2.55, 3.1, 3.65, 0.9].forEach((angle, i) => {
    const out = i === 4 ? 0.09 : 0.11;
    const base: Point = [palm[0] + Math.cos(angle) * 0.06, palm[1] + 0.01, palm[2] + Math.sin(angle) * 0.06];
    const tip: Point = [palm[0] + Math.cos(angle) * out, palm[1] + (i === 4 ? 0.07 : 0.12), palm[2] + Math.sin(angle) * out];
    limb(kit, base, tip, 0.018, 0.013, SKIN, { delay: D + 0.32 + i * 0.02 });
  });
  // The fire in his palm: a hot heart, a tongue, and two ribbons of flame winding round it.
  const fire: Point = [palm[0], palm[1] + 0.02, palm[2]];
  ball(0.075, YELLOW, ...fire, { delay: 1.5, flat: true, noInk: true });
  flame(fire[0], fire[1] + 0.05, fire[2], 0.85, 1.52);
  const ribbons = [
    { color: ORANGE, make: spiral(1.75, 0, 0.9, 0.25), thickness: 0.048, speed: 2.4 },
    { color: MAGENTA, make: spiral(1.4, Math.PI, 0.7, 0.2), thickness: 0.034, speed: 3.3 },
  ].map(({ color, make, thickness, speed }, i) => {
    const part = add(make(thickness), color, ...fire, { delay: 1.56 + i * 0.05, flat: true, outline: make(thickness + 0.014) });
    return { part, speed };
  });
  motes(10, YELLOW, 0.024, [fire[0] - 0.22, fire[1] + 0.2, fire[2] - 0.22], [fire[0] + 0.22, fire[1] + 1.05, fire[2] + 0.22], 1.7);

  // His left arm hangs loose, a lit match between his fingers.
  const shoulderL: Point = [x0 + 0.3, G + 1.84, z0];
  const elbowL: Point = [x0 + 0.44, G + 1.44, z0 + 0.02];
  const handL: Point = [x0 + 0.42, G + 1.1, z0 + 0.18];
  limb(kit, shoulderL, elbowL, 0.1, 0.095, COAT, { delay: D + 0.22 });
  ball(0.095, COAT_LIGHT, elbowL[0], elbowL[1] - 0.095, elbowL[2], { delay: D + 0.24 });
  limb(kit, elbowL, at(elbowL, handL, 0.66), 0.095, 0.13, COAT, { delay: D + 0.26 });
  limb(kit, at(elbowL, handL, 0.5), handL, 0.042, 0.04, SKIN, { delay: D + 0.28 });
  ball(0.062, SKIN, handL[0], handL[1] - 0.062, handL[2], { delay: D + 0.3 });
  const matchFoot: Point = [handL[0] + 0.02, handL[1] + 0.01, handL[2] + 0.05];
  const matchTip: Point = [handL[0] + 0.08, handL[1] + 0.2, handL[2] + 0.11];
  limb(kit, matchFoot, matchTip, 0.011, 0.011, MATCH, { delay: D + 0.34 });
  ball(0.02, MAGENTA, matchTip[0], matchTip[1] - 0.01, matchTip[2], { delay: D + 0.36, noInk: true });
  flame(matchTip[0], matchTip[1] + 0.01, matchTip[2], 0.32, 1.65);

  // His head: bald and pale, sunken eyes glinting with the fire, a wide grin full of teeth, soot on his brow.
  cylinder(0.06, 0.07, 0.18, SKIN, x0, G + 1.9, z0 + 0.01, { delay: D + 0.3 });
  const head = add(new SphereGeometry(0.2, 18, 14).scale(0.86, 1.12, 0.94), SKIN, x0, G + 2.04, z0 + 0.03, { delay: D + 0.36 });
  const cy = 0.224;
  decorate(head, new SphereGeometry(0.045, 10, 8).scale(1.15, 0.85, 0.45), SOCKET, [
    [-0.068, cy + 0.03, 0.163],
    [0.068, cy + 0.03, 0.163],
  ]);
  decorate(head, new SphereGeometry(0.03, 10, 8).scale(1.2, 0.85, 0.5), TEETH, [
    [-0.066, cy + 0.03, 0.172],
    [0.066, cy + 0.03, 0.172],
  ]);
  decorate(head, new BoxGeometry(0.02, 0.024, 0.01), INK, [
    [-0.062, cy + 0.03, 0.19],
    [0.062, cy + 0.03, 0.19],
  ]);
  decorate(head, new BoxGeometry(0.011, 0.011, 0.006), YELLOW, [
    [-0.057, cy + 0.037, 0.197],
    [0.067, cy + 0.037, 0.197],
  ]);
  decorate(head, new BoxGeometry(0.08, 0.018, 0.015), SKIN_DARK, [
    [-0.07, cy + 0.08, 0.17, -0.32],
    [0.07, cy + 0.08, 0.17, 0.32],
  ]);
  decorate(head, new BoxGeometry(0.05, 0.012, 0.01), SKIN_DARK, [
    [-0.105, cy - 0.035, 0.135, 0.65],
    [0.105, cy - 0.035, 0.135, -0.65],
  ]);
  decorate(head, new BoxGeometry(0.035, 0.07, 0.035), SKIN_DARK, [[0, cy - 0.005, 0.186]]);
  decorate(head, new CylinderGeometry(0.181, 0.181, 0.045, 14, 1, true, -0.62, 1.24), TEETH, [[0, cy - 0.088, 0]]);
  decorate(head, new CylinderGeometry(0.184, 0.184, 0.011, 14, 1, true, -0.66, 1.32), INK, [
    [0, cy - 0.062, 0],
    [0, cy - 0.113, 0],
  ]);
  decorate(
    head,
    new BoxGeometry(0.006, 0.04, 0.006),
    INK,
    [-0.065, -0.022, 0.022, 0.065].map((x) => [x, cy - 0.088, Math.sqrt(0.181 ** 2 - x * x) + 0.002] as Point),
  );
  decorate(head, new BoxGeometry(0.04, 0.011, 0.01), INK, [
    [-0.118, cy - 0.072, 0.135, 0.75],
    [0.118, cy - 0.072, 0.135, -0.75],
  ]);
  decorate(head, new SphereGeometry(0.04, 8, 6).scale(0.5, 1, 0.8), SKIN, [
    [-0.168, cy, -0.01],
    [0.168, cy, -0.01],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.03, 0.01), SOOT, [
    [0.045, cy + 0.15, 0.13, 0.3],
    [-0.12, cy + 0.02, 0.125, -0.9],
  ]);

  tick((t) => {
    for (const { parts, rest, phase } of flames) {
      const k = 0.86 + 0.16 * Math.sin(t * 11 + phase) + 0.08 * Math.sin(t * 17 + phase * 2);
      const sway = 0.12 * Math.sin(t * 6 + phase);
      parts.forEach((part, p) => {
        part.children.forEach((child, c) => (child.scale.y = rest[p][c] * k));
        part.rotation.z = sway;
      });
    }
    for (const { puffs, from, drift, period } of smokes) {
      puffs.forEach((puff, i) => {
        const u = (t / period + i / puffs.length) % 1;
        puff.position.set(from[0] + drift[0] * u, from[1] + drift[1] * u, from[2] + drift[2] * u);
        puff.children[0].scale.setScalar(0.5 + u * 0.9);
        puff.visible = u < 0.92;
      });
    }
    for (const { part, speed } of ribbons) part.rotation.y = -t * speed;
  });

  return { width: 4.9, height: 4.6, lookY: 1.6 };
}
