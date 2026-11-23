import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  Euler,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  OctahedronGeometry,
  PerspectiveCamera,
  Quaternion,
  RedFormat,
  Scene,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from "three";

// A character's diorama: the figure on a small base with a piece of Nuova Megara, built
// from simple shapes in the comic style of the threat dioramas (src/lib/threat-diorama.ts).
// It costs no download beyond three.js, and it rises like a pop-up book.

const POP_SECONDS = 0.45;
const REST_YAW = -0.35;
const FOV = 32;
const FRAME_MARGIN = 1.04;
const FRAME_MS = 1000 / 30;
const FRAME_MARGIN_MS = 4;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;

const YELLOW = 0xffd60a;
const ORANGE = 0xff8a00;
const CYAN = 0x16c8ff;
const MAGENTA = 0xff2e6c;
const INK = 0x14121c;
const PLINTH = 0x1d1b28;

type Point = [number, number, number];
type PartOptions = {
  delay: number;
  rotation?: [number, number, number];
  flat?: boolean;
  noInk?: boolean;
  ink?: number;
  /** A thicker twin for shapes a plain scale can't outline, such as cables. */
  outline?: BufferGeometry;
};

/** The tools a character's diorama is built with. Every part pops in after its delay, in seconds. */
type Kit = {
  /** A shape standing on height y: its lowest point is moved to y. */
  add(geometry: BufferGeometry, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  cylinder(top: number, bottom: number, h: number, color: number, x: number, y: number, z: number, options: PartOptions, sides?: number): Group;
  ball(radius: number, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  /** Small flat details stuck to a part, so they pop and turn with it; each spot can lean by an angle. */
  decorate(part: Group, geometry: BufferGeometry, color: number, spots: [number, number, number, number?][]): void;
  /** Motion on every frame, from the seconds since the diorama opened. */
  tick(update: (elapsed: number) => void): void;
  /** Specks rising slowly through a box and starting again from the bottom. */
  motes(count: number, color: number, size: number, from: [number, number, number], to: [number, number, number], delay: number): void;
};

/** What the camera keeps in frame: the diorama's width and height, and the height it looks at. */
type Framing = { width: number; height: number; lookY: number };

/** The parts' colour, for a glow that changes on its own. */
function colorOf(part: Group): Color {
  return ((part.children[0] as Mesh).material as MeshBasicMaterial).color;
}

/** The base every diorama stands on: a dark octagon with a magenta band, and a slab with a cyan edge. Returns the slab's top. */
function octagonBase({ cylinder }: Kit, slab: number): number {
  const octagon: Point = [0, Math.PI / 8, 0];
  cylinder(2.5, 2.62, 0.42, PLINTH, 0, -0.42, 0, { delay: 0, ink: 1.02, rotation: octagon }, 8);
  cylinder(2.64, 2.64, 0.07, MAGENTA, 0, -0.27, 0, { delay: 0.04, flat: true, noInk: true, rotation: octagon }, 8);
  cylinder(2.42, 2.5, 0.1, slab, 0, 0, 0, { delay: 0.06, ink: 1.02, rotation: octagon }, 8);
  cylinder(2.52, 2.52, 0.025, CYAN, 0, 0.05, 0, { delay: 0.08, flat: true, noInk: true, rotation: octagon }, 8);
  return 0.1;
}

const UP = new Vector3(0, 1, 0);

/** The length from one point to another, and the turn that points a part built upright at `from` towards `to`. */
function aim(from: Point, to: Point): { length: number; rotation: Point } {
  const direction = new Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const length = direction.length();
  const turn = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(UP, direction.divideScalar(length)));
  return { length, rotation: [turn.x, turn.y, turn.z] };
}

/** An arm or a leg: a cylinder from one joint to the next, `start` and `end` its radii there. */
function limb(kit: Kit, from: Point, to: Point, start: number, end: number, color: number, options: PartOptions): Group {
  const { length, rotation } = aim(from, to);
  return kit.cylinder(end, start, length, color, ...from, { ...options, rotation });
}

/** A zigzag of flat bars through the points, such as a spark; returns its pieces. */
function zigzag(kit: Kit, points: Point[], thickness: number, color: number, delay: number): Group[] {
  return points.slice(1).map((to, i) => {
    const { length, rotation } = aim(points[i], to);
    return kit.box(thickness, length, thickness, color, ...points[i], { delay: delay + i * 0.02, flat: true, noInk: true, rotation });
  });
}

/** A spark crawling along a path: points that wind round it at `reach`, `steps` per stretch of the path. */
function crawl(path: Point[], steps: number, reach: number, twist: number): Point[] {
  const points: Point[] = [path[0]];
  let k = 0;
  for (let s = 0; s < path.length - 1; s++) {
    const from = new Vector3(...path[s]);
    const to = new Vector3(...path[s + 1]);
    const along = to.clone().sub(from).normalize();
    const side = new Vector3().crossVectors(along, UP);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const lift = new Vector3().crossVectors(along, side).normalize();
    for (let i = 1; i <= steps; i++) {
      k++;
      const angle = twist + k * 1.4;
      const point = from
        .clone()
        .lerp(to, i / steps)
        .addScaledVector(side, Math.cos(angle) * reach)
        .addScaledVector(lift, Math.sin(angle) * reach);
      points.push([point.x, point.y, point.z]);
    }
  }
  return points;
}

/** A cable hanging through the points, with its own ink. It pops from its first point. */
function cable(kit: Kit, points: Point[], radius: number, color: number, delay: number): Group {
  const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  const [x, y, z] = points[0];
  const tube = (r: number) => new TubeGeometry(curve, 32, r, 6).translate(-x, -y, -z);
  const geometry = tube(radius);
  geometry.computeBoundingBox();
  const low = geometry.boundingBox?.min.y ?? 0;
  return kit.add(geometry, color, x, y + low, z, { delay, outline: tube(radius + 0.018) });
}

/** An upright wall with an arch cut out of its foot, centred on x = 0 and facing +z. */
function archedWall(width: number, height: number, depth: number, arch: { x: number; half: number; spring: number }): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(arch.x - arch.half, 0);
  shape.lineTo(arch.x - arch.half, arch.spring);
  shape.absarc(arch.x, arch.spring, arch.half, Math.PI, 0, true);
  shape.lineTo(arch.x + arch.half, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 }).translate(0, 0, -depth / 2);
}

/** The shape of an arch's opening, flat, to close it from behind. */
function archMouth(half: number, spring: number): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-half, spring);
  shape.absarc(0, spring, half, Math.PI, 0, true);
  shape.lineTo(half, 0);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 18 });
}

/**
 * Keelstone (P055): he stands before the temple door, arms crossed, and no one gets past.
 * The price of his gift shows at his feet: the hem of his robe has turned to stone and roots
 * him to the paving, because from there he does not move.
 */
function keelstone(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x2f3a4c;
  const TILE_A = 0x56667e;
  const TILE_B = 0x4a5970;
  const STEP = 0x5a7590;
  const STEP_LIGHT = 0x6a87a2;
  const WALL = 0x456580;
  const WALL_LIGHT = 0x587b97;
  const COLUMN = 0x7c9cb4;
  const COLUMN_LIGHT = 0x94b3c8;
  const SKIN = 0xd2ccbd;
  const SKIN_DARK = 0x9d978a;
  const ROBE = 0x1d5662;
  const ROBE_LIGHT = 0x2c7c86;
  const HAIR = 0x9c978d;
  const BEARD = 0xb9b4a8;
  const DOOR_LIGHT = 0xfff1b8;

  octagonBase(kit, SLAB);
  const FLOOR = 0.12;
  // Paving in front of the temple, one slab missing.
  [-1.1, -0.37, 0.37, 1.1].forEach((x, column) =>
    [0.3, 1.02].forEach((z, row) => {
      if (column === 3 && row === 1) return;
      const turn = ((column * 7 + row * 3) % 5) * 0.012 - 0.024;
      box(0.68, 0.02, 0.68, (column + row) % 2 ? TILE_A : TILE_B, x, 0.1, z, {
        delay: 0.1 + (column + row) * 0.03,
        noInk: true,
        rotation: [0, turn, 0],
      });
    }),
  );

  // The temple: two steps, the wall with its door, two columns and the pediment.
  box(3.3, 0.15, 1.2, STEP, 0, 0.1, -0.95, { delay: 0.14, ink: 1.02 });
  box(2.9, 0.15, 0.95, STEP_LIGHT, 0, 0.25, -1.07, { delay: 0.2, ink: 1.02 });
  const TOP = 0.4;
  [-1, 1].forEach((x, i) => box(0.85, 2.62, 0.38, WALL, x, TOP, -1.3, { delay: 0.26 + i * 0.05, ink: 1.03 }));
  box(1.2, 0.57, 0.38, WALL_LIGHT, 0, 2.45, -1.3, { delay: 0.36, ink: 1.03 });
  // The light behind the door, brighter at its heart, and the light it throws down the steps.
  const doorway = box(1.15, 2.05, 0.04, YELLOW, 0, TOP, -1.32, { delay: 0.4, flat: true, noInk: true });
  const heart = box(0.66, 1.55, 0.04, DOOR_LIGHT, 0, TOP + 0.12, -1.29, { delay: 0.44, flat: true, noInk: true });
  box(1.05, 0.012, 0.42, 0xffe27a, 0, TOP, -0.82, { delay: 0.48, flat: true, noInk: true });
  box(1.15, 0.012, 0.22, 0xffe9a0, 0, 0.25, -0.46, { delay: 0.5, flat: true, noInk: true });
  [-0.64, 0.64].forEach((x, i) => box(0.12, 2.15, 0.06, WALL_LIGHT, x, TOP, -1.08, { delay: 0.42 + i * 0.03, ink: 1.04 }));
  box(1.4, 0.12, 0.06, WALL_LIGHT, 0, 2.5, -1.08, { delay: 0.47, ink: 1.04 });
  const glowFrom = new Color(YELLOW);
  const glowTo = new Color(ORANGE);
  const heartFrom = new Color(DOOR_LIGHT);
  const heartTo = new Color(YELLOW);
  tick((t) => {
    const k = (Math.sin(t * 1.6) + 1) / 2;
    colorOf(doorway).lerpColors(glowFrom, glowTo, k * 0.55);
    colorOf(heart).lerpColors(heartFrom, heartTo, k * 0.7);
  });

  [-1.2, 1.2].forEach((x, i) => {
    const wait = 0.5 + i * 0.06;
    box(0.46, 0.1, 0.46, COLUMN_LIGHT, x, TOP, -0.82, { delay: wait });
    const shaft = cylinder(0.17, 0.2, 2.3, COLUMN, x, TOP + 0.1, -0.82, { delay: wait + 0.04 }, 10);
    // Flutes down the shaft, and a crack across the right one.
    decorate(
      shaft,
      new BoxGeometry(0.025, 2.1, 0.01),
      0x56748c,
      [-0.36, 0, 0.36].map((angle) => [Math.sin(angle) * 0.19, 1.15, Math.cos(angle) * 0.19, 0] as [number, number, number, number]),
    );
    if (i === 1) decorate(shaft, new BoxGeometry(0.015, 0.3, 0.012), INK, [[0.05, 1.25, 0.19, 0.6], [-0.04, 1.05, 0.2, -0.4]]);
    cylinder(0.26, 0.19, 0.1, COLUMN_LIGHT, x, TOP + 2.4, -0.82, { delay: wait + 0.1 }, 10);
    box(0.52, 0.12, 0.52, COLUMN_LIGHT, x, TOP + 2.5, -0.82, { delay: wait + 0.12 });
  });
  const LINTEL = TOP + 2.62;
  const entablature = box(3, 0.3, 0.8, WALL_LIGHT, 0, LINTEL, -1.02, { delay: 0.68 });
  // A frieze of cyan stones along its front.
  decorate(
    entablature,
    new BoxGeometry(0.1, 0.1, 0.02),
    CYAN,
    Array.from({ length: 11 }, (_, i) => [-1.3 + i * 0.26, 0.15, 0.41] as [number, number, number]),
  );
  const pediment = new CylinderGeometry(1, 1, 0.74, 3);
  pediment.rotateX(Math.PI / 2);
  pediment.rotateZ(Math.PI);
  pediment.scale(1.73, 0.37, 1);
  add(pediment, STEP_LIGHT, 0, LINTEL + 0.3, -1.02, { delay: 0.74 });

  // Rubble: a fallen column drum and two blocks.
  add(new CylinderGeometry(0.19, 0.19, 0.55, 10).rotateZ(Math.PI / 2), COLUMN, 1.62, 0.1, 0.55, {
    delay: 0.8,
    rotation: [0, 0.7, 0],
  });
  box(0.3, 0.22, 0.26, WALL, -1.75, 0.1, 0.4, { delay: 0.84, rotation: [0, 0.4, 0] });
  box(0.2, 0.14, 0.18, WALL_LIGHT, -1.55, 0.1, 1.2, { delay: 0.88, rotation: [0.1, -0.3, 0.12] });

  // Keelstone, a little taller than the door behind him.
  const z0 = 0.45;
  const F = FLOOR;
  const D = 0.95;
  const robe = (top: number, bottom: number, h: number) => new CylinderGeometry(top, bottom, h, 18).scale(1, 1, 0.78);
  // The stone hem and the roots it sends into the paving.
  add(robe(0.6, 0.66, 0.16), SKIN_DARK, 0, F, z0, { delay: D });
  [0.35, 1.25, 2.2, 3.3, 4.3, 5.3].forEach((angle, i) => {
    const length = 0.42 + (i % 3) * 0.1;
    const reach = 0.55 + length / 2;
    box(length, 0.05, 0.11, SKIN_DARK, Math.cos(angle) * reach, F, z0 + Math.sin(angle) * reach * 0.8, {
      delay: D + 1 + i * 0.06,
      ink: 1.08,
      rotation: [0, -angle, 0],
    });
  });
  [
    [-0.85, 0.95, 0.5],
    [0.9, 1.15, -0.7],
    [0.2, 1.3, 0.2],
  ].forEach(([x, z, angle], i) =>
    box(0.32, 0.01, 0.025, INK, x, F + 0.005, z, { delay: D + 1.2 + i * 0.05, flat: true, noInk: true, rotation: [0, angle, 0] }),
  );
  [-0.17, 0.17].forEach((x, i) => box(0.18, 0.1, 0.26, SKIN, x, F, z0 + 0.5, { delay: D + 0.02 + i * 0.02 }));
  add(robe(0.46, 0.6, 1.05), ROBE, 0, F + 0.14, z0, { delay: D + 0.06 });
  add(robe(0.6, 0.46, 0.85), ROBE, 0, F + 1.15, z0, { delay: D + 0.12 });
  // The himation across his chest, from the right hip to the left shoulder.
  box(0.26, 1.3, 0.06, ROBE_LIGHT, 0.36, F + 0.95, z0 + 0.33, { delay: D + 0.18, rotation: [0.1, 0, 0.62] });
  [-1, 1].forEach((side, i) => {
    ball(0.27, ROBE, side * 0.56, F + 1.6, z0, { delay: D + 0.2 + i * 0.03 });
    cylinder(0.15, 0.17, 0.62, ROBE, side * 0.68, F + 1.3, z0 + 0.16, { delay: D + 0.24 + i * 0.03, rotation: [-0.3, 0, side * 0.12] });
  });
  // The forearms crossed in front of his chest, stone and cracked, each hand on the other arm.
  const forearm = (x: number, y: number, z: number, lean: number, wait: number) => {
    const part = add(new CylinderGeometry(0.12, 0.13, 1.16, 12).rotateZ(Math.PI / 2), SKIN, x, y, z, {
      delay: D + wait,
      rotation: [0, 0, lean],
    });
    decorate(part, new BoxGeometry(0.012, 0.16, 0.012), INK, [
      [-0.25, 0.13, 0.12, 0.5],
      [0.1, 0.14, 0.125, -0.7],
      [0.32, 0.12, 0.12, 0.3],
    ]);
  };
  forearm(0.08, F + 1.3, z0 + 0.46, 0.05, 0.32);
  ball(0.13, SKIN, -0.52, F + 1.27, z0 + 0.46, { delay: D + 0.36 });
  forearm(-0.08, F + 1.44, z0 + 0.54, -0.05, 0.38);
  ball(0.13, SKIN, 0.52, F + 1.41, z0 + 0.52, { delay: D + 0.42 });

  cylinder(0.14, 0.16, 0.22, SKIN, 0, F + 1.95, z0, { delay: D + 0.44 });
  const head = add(new SphereGeometry(0.27, 18, 14).scale(0.95, 1.1, 0.95), SKIN, 0, F + 2.08, z0, { delay: D + 0.48 });
  const face = 0.25;
  // Eyes under a heavy brow, and the cracks of his stone face.
  decorate(head, new BoxGeometry(0.3, 0.055, 0.05), SKIN_DARK, [[0, 0.36, face - 0.01]]);
  decorate(head, new BoxGeometry(0.07, 0.035, 0.02), INK, [
    [-0.09, 0.32, face + 0.005],
    [0.09, 0.32, face + 0.005],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.11, 0.06), SKIN_DARK, [[0, 0.27, face]]);
  decorate(head, new BoxGeometry(0.012, 0.14, 0.012), INK, [
    [0.16, 0.42, 0.19, 0.5],
    [-0.15, 0.24, 0.205, -0.3],
  ]);
  add(new SphereGeometry(0.23, 16, 12).scale(1.05, 1.25, 0.8), BEARD, 0, F + 1.8, z0 + 0.13, { delay: D + 0.54 });
  box(0.28, 0.06, 0.07, BEARD, 0, F + 2.3, z0 + 0.24, { delay: D + 0.56 });
  // Grey curls on top and behind.
  const centre = F + 2.08 + 0.297;
  [
    [0, 0.27, -0.02],
    [-0.16, 0.2, -0.12],
    [0.16, 0.2, -0.12],
    [-0.25, 0.04, -0.08],
    [0.25, 0.04, -0.08],
    [-0.11, 0.1, -0.24],
    [0.11, 0.1, -0.24],
    [0, -0.02, -0.27],
    [-0.13, 0.24, 0.1],
    [0.13, 0.24, 0.1],
  ].forEach(([x, y, z], i) => ball(0.095, HAIR, x, centre + y - 0.095, z0 + z, { delay: D + 0.58 + i * 0.02, ink: 1.1 }));

  // Specks of light drifting out of the door.
  motes(12, YELLOW, 0.035, [-0.55, TOP + 0.1, -1.15], [0.55, TOP + 2.2, -0.35], 1.2);

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}

/**
 * Juncture (P028): the old electrician of the Lanterne mends a live cable with his bare hands
 * on the platform at a metro tunnel's mouth, under his work lantern, and the sparks run up his
 * arm. A train's lights grow in the dark of the tunnel.
 */
function juncture(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x2a2f3c;
  const BALLAST = 0x3a3742;
  const SLEEPER = 0x4a3a32;
  const RAIL = 0x9aa3b3;
  const CONCRETE = 0x46505f;
  const JOINT = 0x2c323e;
  const BRICK = 0x6e3550;
  const BRICK_LIGHT = 0x8a4766;
  const MORTAR = 0x2a1622;
  const NIGHT = 0x08070d;
  const DIM = 0x0b3d50;
  const POLE = 0x4b3a30;
  const STEEL = 0x6c7686;
  const TOOLBOX = 0x2c6e8a;
  const CABLE = 0x17161d;
  const COPPER = 0xd9822b;
  const SKIN = 0xd9a07a;
  const SKIN_DARK = 0xb27a58;
  const HAIR = 0xc4beb4;
  const SHIRT = 0x2f6f86;
  const SHIRT_LIGHT = 0x4a8ea5;
  const DENIM = 0x23364d;
  const LEATHER = 0x6b4a2a;
  const BOOT = 0x33261f;

  const F = octagonBase(kit, SLAB);

  // The track out of the tunnel: ballast, sleepers, two rails, and the third rail under its yellow cover.
  const TRACK = -0.6;
  box(1.45, 0.06, 3.2, BALLAST, TRACK, F, 0.1, { delay: 0.1, ink: 1.02 });
  for (let i = 0; i < 9; i++) {
    box(1.05, 0.05, 0.16, SLEEPER, TRACK, F + 0.06, -1.38 + i * 0.37, { delay: 0.14 + i * 0.02, noInk: true });
  }
  [-0.3, 0.3].forEach((dx, i) => box(0.07, 0.08, 3.2, RAIL, TRACK + dx, F + 0.11, 0.1, { delay: 0.32 + i * 0.04, ink: 1.04 }));
  for (let i = 0; i < 5; i++) box(0.06, 0.07, 0.06, STEEL, 0.02, F + 0.06, -1.1 + i * 0.6, { delay: 0.36, noInk: true });
  box(0.1, 0.06, 3, 0xc99a1c, 0.02, F + 0.13, 0.15, { delay: 0.4 });

  // The platform, with its yellow edge line and the joints of its slabs.
  const platform = box(1.7, 0.16, 2.35, CONCRETE, 1.05, F, 0.025, { delay: 0.12, ink: 1.02 });
  decorate(platform, new BoxGeometry(1.7, 0.004, 0.012), JOINT, [
    [0, 0.162, -0.55],
    [0, 0.162, 0.2],
    [0, 0.162, 0.85],
  ]);
  const G = F + 0.16;
  box(0.07, 0.006, 2.35, YELLOW, 0.3, G, 0.025, { delay: 0.42, flat: true, noInk: true });

  // The brick wall with the tunnel's arch, dark inside, and the train's two lamps far in.
  const WALL_X = 0.025;
  const arch = { x: TRACK - WALL_X, half: 0.6, spring: 1.1 };
  const wall = add(archedWall(3.45, 2.3, 0.36, arch), BRICK, WALL_X, F, -1.3, { delay: 0.2, ink: 1.02 });
  const front = 0.185;
  decorate(
    wall,
    new BoxGeometry(0.5, 0.018, 0.01),
    MORTAR,
    [0.28, 0.56, 0.84, 1.12, 1.4].map((y) => [-1.475, y, front] as Point),
  );
  decorate(
    wall,
    new BoxGeometry(1.72, 0.018, 0.01),
    MORTAR,
    [0.28, 0.56, 0.84, 1.12, 1.4].map((y) => [0.86, y, front] as Point),
  );
  decorate(wall, new BoxGeometry(3.4, 0.018, 0.01), MORTAR, [
    [0, 1.92, front],
    [0, 2.16, front],
  ]);
  decorate(
    wall,
    new BoxGeometry(0.018, 0.26, 0.01),
    MORTAR,
    [
      [-1.55, 0.14], [0.3, 0.14], [1.1, 0.14], [-1.35, 0.42], [0.65, 0.42], [1.45, 0.42],
      [-1.6, 0.7], [0.25, 0.7], [1.2, 0.7], [-1.3, 0.98], [0.75, 0.98], [1.5, 0.98],
      [-1.5, 1.26], [0.4, 1.26], [1.05, 1.26], [-1.2, 2.04], [-0.3, 2.04], [0.9, 2.04],
    ].map(([x, y]) => [x, y, front] as Point),
  );
  add(new TorusGeometry(0.66, 0.06, 6, 24, Math.PI), BRICK_LIGHT, TRACK, F + arch.spring - 0.06, -1.12, { delay: 0.3, noInk: true });
  add(archMouth(arch.half, arch.spring), NIGHT, TRACK, F, -1.47, { delay: 0.22, flat: true, noInk: true });
  const lamps = [-0.25, 0.25].map((dx, i) =>
    box(0.16, 0.1, 0.02, CYAN, TRACK + dx, F + 0.4, -1.44, { delay: 0.5 + i * 0.03, flat: true, noInk: true }),
  );

  // The pole: insulators, a transformer, the wires to the wall, and his work lantern.
  const PX = 1.45;
  const PZ = -0.6;
  cylinder(0.07, 0.09, 2.9, POLE, PX, G, PZ, { delay: 0.5 }, 8);
  box(1, 0.08, 0.08, POLE, PX, G + 2.62, PZ, { delay: 0.6 });
  [-0.4, 0, 0.4].forEach((dx, i) => cylinder(0.035, 0.05, 0.1, CYAN, PX + dx, G + 2.7, PZ, { delay: 0.66 + i * 0.03 }));
  cylinder(0.16, 0.16, 0.42, STEEL, PX + 0.2, G + 1.75, PZ, { delay: 0.62 });
  cylinder(0.17, 0.17, 0.04, CABLE, PX + 0.2, G + 2.17, PZ, { delay: 0.66 });
  cable(kit, [[PX - 0.4, G + 2.8, PZ], [0.2, G + 2.38, -0.95], [-1.4, F + 2.3, -1.25]], 0.018, CABLE, 0.85);
  cable(kit, [[PX, G + 2.8, PZ], [0.95, G + 2.48, -0.95], [0.4, F + 2.3, -1.25]], 0.018, CABLE, 0.9);
  cable(kit, [[PX + 0.4, G + 2.8, PZ], [1.62, G + 2.5, -0.92], [1.55, F + 2.3, -1.25]], 0.018, CABLE, 0.95);
  box(0.34, 0.04, 0.04, POLE, PX - 0.22, G + 2.2, PZ, { delay: 0.7 });
  box(0.012, 0.18, 0.012, INK, PX - 0.36, G + 2.04, PZ, { delay: 0.72, noInk: true });
  const lantern = box(0.15, 0.2, 0.15, YELLOW, PX - 0.36, G + 1.84, PZ, { delay: 0.74, flat: true });
  cylinder(0.02, 0.11, 0.07, CABLE, PX - 0.36, G + 2.04, PZ, { delay: 0.76 });
  // A coil of spare cable by the pole and his toolbox.
  [0, 0.07].forEach((y, i) =>
    add(new TorusGeometry(0.17, 0.035, 6, 20).rotateX(Math.PI / 2), CABLE, 1.55, G + y, 0.05, {
      delay: 0.78 + i * 0.04,
      noInk: true,
    }),
  );
  const toolbox = box(0.42, 0.2, 0.24, TOOLBOX, 0.48, G, 1.0, { delay: 0.8, rotation: [0, 0.3, 0] });
  decorate(toolbox, new BoxGeometry(0.24, 0.04, 0.04), YELLOW, [[0, 0.24, 0]]);

  // Juncture: an old man in a shirt with rolled sleeves and overalls, his tool belt round his belly.
  const x0 = 0.85;
  const z0 = 0.4;
  const D = 1;
  [-1, 1].forEach((side, i) => {
    box(0.2, 0.13, 0.32, BOOT, x0 + side * 0.16, G, z0 + 0.06, { delay: D + i * 0.02 });
    cylinder(0.13, 0.14, 0.7, DENIM, x0 + side * 0.16, G + 0.08, z0, { delay: D + 0.04 + i * 0.02 });
  });
  add(new CylinderGeometry(0.36, 0.34, 0.2, 16).scale(1, 1, 0.8), DENIM, x0, G + 0.66, z0, { delay: D + 0.08 });
  add(new SphereGeometry(0.37, 18, 14).scale(1.05, 0.95, 0.85), DENIM, x0, G + 0.78, z0 + 0.06, { delay: D + 0.1 });
  add(new CylinderGeometry(0.42, 0.4, 0.6, 16).scale(1, 1, 0.8), SHIRT, x0, G + 1.08, z0, { delay: D + 0.14 });
  box(0.42, 0.36, 0.07, DENIM, x0, G + 1.16, z0 + 0.33, { delay: D + 0.18 });
  [-1, 1].forEach((side, i) => {
    const strap = aim([x0 + side * 0.16, G + 1.5, z0 + 0.37], [x0 + side * 0.2, G + 1.7, z0 + 0.22]);
    box(0.06, strap.length, 0.03, DENIM, x0 + side * 0.16, G + 1.5, z0 + 0.37, { delay: D + 0.2, rotation: strap.rotation, ink: 1.1 });
    ball(0.03, YELLOW, x0 + side * 0.16, G + 1.47, z0 + 0.38, { delay: D + 0.24 + i * 0.02, noInk: true });
  });
  add(new CylinderGeometry(0.38, 0.38, 0.09, 16).scale(1, 1, 0.84), LEATHER, x0, G + 0.7, z0, { delay: D + 0.22 });
  [-1, 1].forEach((side, i) => box(0.15, 0.17, 0.09, LEATHER, x0 + side * 0.3, G + 0.56, z0 + 0.24, { delay: D + 0.26 + i * 0.02 }));
  [
    [-0.33, 0.68, 0.24],
    [-0.27, 0.7, 0.25],
    [0.3, 0.68, 0.24],
  ].forEach(([dx, y, dz], i) => cylinder(0.022, 0.022, 0.17, YELLOW, x0 + dx, G + y, z0 + dz, { delay: D + 0.3 + i * 0.02 }));

  // The right arm hangs; the left holds the cable up in front of him.
  [-1, 1].forEach((side, i) => ball(0.16, SHIRT, x0 + side * 0.4, G + 1.4, z0, { delay: D + 0.24 + i * 0.02 }));
  const shoulderR: Point = [x0 - 0.44, G + 1.55, z0];
  const elbowR: Point = [x0 - 0.5, G + 1.12, z0 + 0.04];
  limb(kit, shoulderR, elbowR, 0.12, 0.11, SHIRT, { delay: D + 0.28 });
  cylinder(0.12, 0.12, 0.07, SHIRT_LIGHT, x0 - 0.5, G + 1.06, z0 + 0.04, { delay: D + 0.3 });
  limb(kit, [x0 - 0.5, G + 1.08, z0 + 0.04], [x0 - 0.49, G + 0.72, z0 + 0.12], 0.095, 0.08, SKIN, { delay: D + 0.32 });
  ball(0.085, SKIN, x0 - 0.49, G + 0.6, z0 + 0.13, { delay: D + 0.34 });
  const shoulderL: Point = [x0 + 0.44, G + 1.55, z0];
  const elbowL: Point = [x0 + 0.58, G + 1.18, z0 + 0.12];
  const hand: Point = [x0 + 0.42, G + 1.5, z0 + 0.55];
  limb(kit, shoulderL, elbowL, 0.12, 0.11, SHIRT, { delay: D + 0.28 });
  ball(0.115, SHIRT_LIGHT, elbowL[0], elbowL[1] - 0.115, elbowL[2], { delay: D + 0.3 });
  limb(kit, elbowL, hand, 0.1, 0.085, SKIN, { delay: D + 0.32 });
  ball(0.1, SKIN, hand[0], hand[1] - 0.1, hand[2], { delay: D + 0.36 });

  // His head: grey hair, a big moustache, a smile.
  cylinder(0.09, 0.1, 0.12, SKIN, x0, G + 1.62, z0, { delay: D + 0.36 });
  const head = add(new SphereGeometry(0.21, 18, 14).scale(0.95, 1.05, 0.95), SKIN, x0, G + 1.7, z0 + 0.02, { delay: D + 0.4 });
  const cy = 0.2205;
  decorate(head, new BoxGeometry(0.05, 0.03, 0.02), INK, [
    [-0.075, cy + 0.04, 0.19],
    [0.075, cy + 0.04, 0.19],
  ]);
  decorate(head, new BoxGeometry(0.08, 0.025, 0.03), HAIR, [
    [-0.075, cy + 0.085, 0.18],
    [0.075, cy + 0.085, 0.18],
  ]);
  decorate(head, new BoxGeometry(0.06, 0.08, 0.06), SKIN_DARK, [[0, cy - 0.005, 0.2]]);
  decorate(head, new BoxGeometry(0.22, 0.055, 0.07), HAIR, [[0, cy - 0.065, 0.185]]);
  decorate(head, new BoxGeometry(0.08, 0.012, 0.01), INK, [[0, cy - 0.11, 0.175]]);
  decorate(head, new SphereGeometry(0.04, 8, 6), SKIN_DARK, [
    [-0.195, cy, 0],
    [0.195, cy, 0],
  ]);
  ball(0.2, HAIR, x0, G + 1.75, z0 - 0.03, { delay: D + 0.44 });
  [
    [-0.12, 0.17, -0.06],
    [0.12, 0.17, -0.06],
    [0, 0.2, 0.04],
  ].forEach(([dx, dy, dz], i) => ball(0.07, HAIR, x0 + dx, G + 1.92 + dy - 0.07, z0 + dz, { delay: D + 0.48 + i * 0.02, ink: 1.1 }));

  // The live cable from the transformer, through his hand, frayed and sparking past it.
  const end: Point = [hand[0] - 0.1, hand[1] + 0.19, hand[2] + 0.05];
  cable(kit, [[PX + 0.2, G + 1.78, PZ + 0.05], [1.6, G + 0.45, 0], [1.45, G + 0.9, 0.7], hand, end], 0.04, CABLE, 1.5);
  [
    [-0.08, 0.06, 0.03],
    [-0.02, 0.1, 0.05],
    [0.04, 0.08, 0.06],
    [-0.1, 0, 0.06],
  ].forEach(([dx, dy, dz], i) => zigzag(kit, [end, [end[0] + dx, end[1] + dy, end[2] + dz]], 0.018, COPPER, 1.6 + i * 0.02));
  // Two sparks winding up his arm, from the frayed end to the shoulder.
  const arm: Point[] = [end, hand, elbowL, shoulderL];
  const sparkA = zigzag(kit, crawl(arm, 3, 0.19, 0), 0.035, YELLOW, 1.7);
  const sparkB = zigzag(kit, crawl(arm, 3, 0.2, Math.PI), 0.035, YELLOW, 1.72);
  motes(6, YELLOW, 0.03, [end[0] - 0.12, end[1] - 0.05, end[2] - 0.08], [end[0] + 0.18, end[1] + 0.35, end[2] + 0.12], 1.8);

  const lanternFrom = new Color(YELLOW);
  const lanternTo = new Color(ORANGE);
  const lampFrom = new Color(DIM);
  const lampTo = new Color(CYAN);
  tick((t) => {
    colorOf(lantern).lerpColors(lanternFrom, lanternTo, ((Math.sin(t * 1.4) + 1) / 2) * 0.5);
    // The train's lamps brighten slowly, then the tunnel is dark again.
    const near = ((t * 0.25) % 1) ** 2;
    for (const lamp of lamps) colorOf(lamp).lerpColors(lampFrom, lampTo, near);
    // The sparks crackle: the first goes out one beat in five, the second comes and goes.
    const beat = Math.floor(t * 12);
    const noise = Math.sin(beat * 12.9898) * 43758.5453;
    const a = beat % 5 !== 4;
    const b = noise - Math.floor(noise) > 0.5;
    for (const part of sparkA) part.visible = a;
    for (const part of sparkB) part.visible = b;
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}

const BUILDERS: Record<string, (kit: Kit) => Framing> = {
  P028: juncture,
  P055: keelstone,
};

/** Whether a card has a diorama. */
export function hasCardDiorama(code: string): boolean {
  return code in BUILDERS;
}

/**
 * Draws a card's diorama on the canvas: it rises like a pop-up book, sways on its own and
 * turns when dragged. Returns the cleanup function. Throws if WebGL is not available or the
 * card has no diorama.
 */
export function mountCardDiorama(canvas: HTMLCanvasElement, code: string, onContextLost: () => void): () => void {
  const build = BUILDERS[code];
  if (!build) throw new Error(`No diorama for ${code}`);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  scene.add(new AmbientLight(0xffffff, 1.7));
  const sun = new DirectionalLight(0xffffff, 2.8);
  sun.position.set(4, 8, 5);
  scene.add(sun);

  const toonSteps = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
  toonSteps.minFilter = toonSteps.magFilter = NearestFilter;
  toonSteps.needsUpdate = true;

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const ink = new MeshBasicMaterial({ color: 0x000000, side: BackSide });
  materials.push(ink);
  const root = new Group();
  scene.add(root);
  const parts: { group: Group; delay: number }[] = [];
  const tickers: ((elapsed: number) => void)[] = [];
  const specks: { mesh: InstancedMesh; start: Float32Array; speed: Float32Array; bottom: number; top: number; delay: number }[] = [];
  const matrix = new Matrix4();

  const add: Kit["add"] = (geometry, color, x, y, z, options) => {
    geometry.computeBoundingBox();
    const lift = -(geometry.boundingBox?.min.y ?? 0);
    geometry.translate(0, lift, 0);
    geometries.push(geometry);
    const group = new Group();
    group.position.set(x, y, z);
    if (options.rotation) group.rotation.set(...options.rotation);
    const material = options.flat ? new MeshBasicMaterial({ color }) : new MeshToonMaterial({ color, gradientMap: toonSteps });
    materials.push(material);
    group.add(new Mesh(geometry, material));
    if (options.outline) {
      options.outline.translate(0, lift, 0);
      geometries.push(options.outline);
      group.add(new Mesh(options.outline, ink));
    } else if (!options.noInk) {
      const outline = new Mesh(geometry, ink);
      const size = options.ink ?? 1.06;
      outline.scale.set(size, 1 + (size - 1) * 0.6, size);
      outline.position.y = -0.02;
      group.add(outline);
    }
    group.scale.setScalar(0.001);
    root.add(group);
    parts.push({ group, delay: options.delay });
    return group;
  };

  const kit: Kit = {
    add,
    box: (w, h, d, color, x, y, z, options) => add(new BoxGeometry(w, h, d), color, x, y, z, options),
    cylinder: (top, bottom, h, color, x, y, z, options, sides = 14) =>
      add(new CylinderGeometry(top, bottom, h, sides), color, x, y, z, options),
    ball: (radius, color, x, y, z, options) => add(new SphereGeometry(radius, 16, 12), color, x, y, z, options),
    decorate(part, geometry, color, spots) {
      const material = new MeshBasicMaterial({ color });
      geometries.push(geometry);
      materials.push(material);
      for (const [x, y, z, lean = 0] of spots) {
        const mesh = new Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.rotation.z = lean;
        part.add(mesh);
      }
    },
    tick: (update) => tickers.push(update),
    motes(count, color, size, from, to, delay) {
      const geometry = new OctahedronGeometry(size);
      const material = new MeshBasicMaterial({ color });
      geometries.push(geometry);
      materials.push(material);
      const mesh = new InstancedMesh(geometry, material, count);
      const start = new Float32Array(count * 3);
      const speed = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        // Spread by a fixed pattern: the same specks on every phone.
        const r = (n: number) => {
          const v = Math.sin((i + 1) * 127.1 + n * 311.7) * 43758.5453;
          return v - Math.floor(v);
        };
        start[i * 3] = MathUtils.lerp(from[0], to[0], r(1));
        start[i * 3 + 1] = MathUtils.lerp(from[1], to[1], r(2));
        start[i * 3 + 2] = MathUtils.lerp(from[2], to[2], r(3));
        speed[i] = 0.12 + r(4) * 0.18;
      }
      mesh.visible = false;
      root.add(mesh);
      specks.push({ mesh, start, speed, bottom: from[1], top: to[1], delay });
    },
  };

  const framing = build(kit);

  function placeSpecks(elapsed: number) {
    for (const item of specks) {
      item.mesh.visible = elapsed >= item.delay;
      if (!item.mesh.visible) continue;
      const t = elapsed - item.delay;
      const height = item.top - item.bottom;
      for (let i = 0; i < item.speed.length; i++) {
        const y = item.start[i * 3 + 1] + item.speed[i] * t;
        const wrapped = item.bottom + ((((y - item.bottom) % height) + height) % height);
        const x = item.start[i * 3] + Math.sin(t * 0.9 + i) * 0.06;
        item.mesh.setMatrixAt(i, matrix.makeTranslation(x, wrapped, item.start[i * 3 + 2]));
      }
      item.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    // Far enough that the whole base stays in a narrow canvas while it turns.
    const half = Math.tan(MathUtils.degToRad(FOV / 2));
    const distance = FRAME_MARGIN * Math.max(framing.height / 2 / half, framing.width / 2 / (half * camera.aspect));
    camera.position.set(0, framing.lookY + distance * 0.3, distance);
    camera.lookAt(0, framing.lookY, 0);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(() => {
    resize();
    if (still) draw(start, true);
  });

  let yaw = REST_YAW;
  let targetYaw = REST_YAW;
  let dragX: number | null = null;
  const onDown = (event: PointerEvent) => {
    dragX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (dragX === null) return;
    targetYaw += (event.clientX - dragX) * 0.012;
    dragX = event.clientX;
    if (still) {
      yaw = targetYaw;
      draw(start, true);
    }
  };
  const onUp = () => {
    dragX = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  let frame = 0;
  let start = 0;
  let previous = 0;
  let slowFrames = 0;
  let still = reduced;
  const popMs = (Math.max(...parts.map((part) => part.delay)) + POP_SECONDS) * 1000;

  function draw(now: number, settled: boolean) {
    const elapsed = (now - start) / 1000;
    for (const { group, delay } of parts) {
      const x = settled ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / POP_SECONDS));
      const eased = x >= 1 ? 1 : 1 + 2.9 * (x - 1) ** 3 + 1.9 * (x - 1) ** 2;
      const wide = 1 - (1 - eased) * 0.5;
      group.scale.set(Math.max(0.001, wide), Math.max(0.001, eased), Math.max(0.001, wide));
    }
    for (const update of tickers) update(settled ? 0 : elapsed);
    placeSpecks(settled ? popMs / 1000 : elapsed);
    if (!settled) {
      if (dragX === null) targetYaw += (REST_YAW + Math.sin(now * 0.0006) * 0.22 - targetYaw) * 0.02;
      yaw += (targetYaw - yaw) * 0.12;
    }
    root.rotation.y = yaw;
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    const delta = now - previous;
    // Full display rate while something moves on purpose, half rate at rest.
    const atRest = now - start > popMs && dragX === null;
    if (atRest && delta < FRAME_MS - FRAME_MARGIN_MS) return;
    previous = now;
    // Too slow for this phone: stop on the finished diorama, turning only when dragged.
    slowFrames = delta > SLOW_FRAME_MS && delta < 500 ? slowFrames + 1 : 0;
    if (slowFrames >= SLOW_FRAMES_LIMIT) {
      cancelAnimationFrame(frame);
      still = true;
      draw(now, true);
      return;
    }
    draw(now, false);
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  start = previous = performance.now();
  observer.observe(canvas);
  resize();
  if (still) draw(start, true);
  else frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("webglcontextlost", onLost);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    toonSteps.dispose();
    renderer.dispose();
    // iOS allows few live WebGL contexts.
    renderer.forceContextLoss();
  };
}
