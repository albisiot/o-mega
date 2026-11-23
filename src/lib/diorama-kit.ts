import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Euler,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Shape,
  TubeGeometry,
  Vector3,
} from "three";

// What every character's diorama is built with: the colours, the shared types and the helpers.
// The dioramas themselves are in src/lib/dioramas, one file per character; src/lib/card-diorama.ts
// mounts them on a canvas.

export const YELLOW = 0xffd60a;
export const ORANGE = 0xff8a00;
export const CYAN = 0x16c8ff;
export const MAGENTA = 0xff2e6c;
export const INK = 0x14121c;
export const PLINTH = 0x1d1b28;

export type Point = [number, number, number];
export type PartOptions = {
  delay: number;
  rotation?: [number, number, number];
  flat?: boolean;
  noInk?: boolean;
  ink?: number;
  /** A thicker twin for shapes a plain scale can't outline, such as cables. */
  outline?: BufferGeometry;
};

/** The tools a character's diorama is built with. Every part pops in after its delay, in seconds. */
export type Kit = {
  /** A shape standing on height y: its lowest point is moved to y. */
  add(geometry: BufferGeometry, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  cylinder(top: number, bottom: number, h: number, color: number, x: number, y: number, z: number, options: PartOptions, sides?: number): Group;
  ball(radius: number, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  /** Small flat details stuck to a part, so they pop and turn with it; each spot can lean by an angle. Returns their material. */
  decorate(part: Group, geometry: BufferGeometry, color: number, spots: [number, number, number, number?][]): MeshBasicMaterial;
  /** Motion on every frame, from the seconds since the diorama opened. */
  tick(update: (elapsed: number) => void): void;
  /** Specks rising slowly through a box and starting again from the bottom. */
  motes(count: number, color: number, size: number, from: [number, number, number], to: [number, number, number], delay: number): void;
};

/** What the camera keeps in frame: the diorama's width and height, and the height it looks at. */
export type Framing = { width: number; height: number; lookY: number };

/** The parts' colour, for a glow that changes on its own. */
export function colorOf(part: Group): Color {
  return ((part.children[0] as Mesh).material as MeshBasicMaterial).color;
}

/** The base every diorama stands on: a dark octagon with a magenta band, and a slab with a cyan edge. Returns the slab's top. */
export function octagonBase({ cylinder }: Kit, slab: number): number {
  const octagon: Point = [0, Math.PI / 8, 0];
  cylinder(2.5, 2.62, 0.42, PLINTH, 0, -0.42, 0, { delay: 0, ink: 1.02, rotation: octagon }, 8);
  cylinder(2.64, 2.64, 0.07, MAGENTA, 0, -0.27, 0, { delay: 0.04, flat: true, noInk: true, rotation: octagon }, 8);
  cylinder(2.42, 2.5, 0.1, slab, 0, 0, 0, { delay: 0.06, ink: 1.02, rotation: octagon }, 8);
  cylinder(2.52, 2.52, 0.025, CYAN, 0, 0.05, 0, { delay: 0.08, flat: true, noInk: true, rotation: octagon }, 8);
  return 0.1;
}

const UP = new Vector3(0, 1, 0);

/** The length from one point to another, and the turn that points a part built upright at `from` towards `to`. */
export function aim(from: Point, to: Point): { length: number; rotation: Point } {
  const direction = new Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const length = direction.length();
  const turn = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(UP, direction.divideScalar(length)));
  return { length, rotation: [turn.x, turn.y, turn.z] };
}

/** An arm or a leg: a cylinder from one joint to the next, `start` and `end` its radii there. */
export function limb(kit: Kit, from: Point, to: Point, start: number, end: number, color: number, options: PartOptions): Group {
  const { length, rotation } = aim(from, to);
  return kit.cylinder(end, start, length, color, ...from, { ...options, rotation });
}

/** A zigzag of flat bars through the points, such as a spark; returns its pieces. */
export function zigzag(kit: Kit, points: Point[], thickness: number, color: number, delay: number): Group[] {
  return points.slice(1).map((to, i) => {
    const { length, rotation } = aim(points[i], to);
    return kit.box(thickness, length, thickness, color, ...points[i], { delay: delay + i * 0.02, flat: true, noInk: true, rotation });
  });
}

/** A spark crawling along a path: points that wind round it at `reach`, `steps` per stretch of the path. */
export function crawl(path: Point[], steps: number, reach: number, twist: number): Point[] {
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
export function cable(kit: Kit, points: Point[], radius: number, color: number, delay: number): Group {
  const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  const [x, y, z] = points[0];
  const tube = (r: number) => new TubeGeometry(curve, 32, r, 6).translate(-x, -y, -z);
  const geometry = tube(radius);
  geometry.computeBoundingBox();
  const low = geometry.boundingBox?.min.y ?? 0;
  return kit.add(geometry, color, x, y + low, z, { delay, outline: tube(radius + 0.018) });
}

/** An upright wall with an arch cut out of its foot, centred on x = 0 and facing +z. */
export function archedWall(width: number, height: number, depth: number, arch: { x: number; half: number; spring: number }): ExtrudeGeometry {
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
export function archMouth(half: number, spring: number): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(-half, spring);
  shape.absarc(0, spring, half, Math.PI, 0, true);
  shape.lineTo(half, 0);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 18 });
}

/** A jagged line from one point to another, swinging `amplitude` either side: a spark's path. */
export function jag(from: Point, to: Point, steps: number, amplitude: number, seed: number): Point[] {
  const points: Point[] = [from];
  for (let k = 1; k < steps; k++) {
    const u = k / steps;
    const swing = (k % 2 ? 1 : -1) * amplitude * (0.6 + 0.4 * Math.abs(Math.sin(seed * 7.3 + k * 2.1)));
    points.push([
      MathUtils.lerp(from[0], to[0], u) + swing,
      MathUtils.lerp(from[1], to[1], u),
      MathUtils.lerp(from[2], to[2], u) + swing * 0.5 * Math.cos(seed + k),
    ]);
  }
  points.push(to);
  return points;
}
