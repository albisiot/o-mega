import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import {
  CYAN,
  MAGENTA,
  INK,
  colorOf,
  octagonBase,
  limb,
  archMouth,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/**
 * Multitude (P059): he hears every thought and has none of his own. Hooded and faceless by the
 * rails, in front of the brick vault of a metro tunnel, he wears a cloud of other people's faces,
 * each tied to him by a magenta thread; their thoughts run down the threads into him, and the
 * faces glitch now and then. The price of his gift is the face he does not have.
 */
export function multitude(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const GROUND = 0x1c1a24;
  const BALLAST = 0x34303c;
  const SLEEPER = 0x3e3330;
  const RAIL = 0x8f98a8;
  const BRICK = 0x34365a;
  const MORTAR = 0x1a1a30;
  const NIGHT = 0x07060c;
  const ROBE = 0x1d4a55;
  const ROBE_DARK = 0x143640;
  const HOOD_INSIDE = 0x0b1216;
  const FACE = 0xe8dcc8;
  const GHOSTS = [0x5fc9e6, 0xe86aa0, 0x9d7be0];
  const GHOST_DARK = 0x2a2440;

  const F = octagonBase(kit, GROUND);

  // The track, out of the tunnel and along the base.
  box(1.45, 0.06, 3.2, BALLAST, 0, F, 0, { delay: 0.1, ink: 1.02 });
  for (let i = 0; i < 9; i++) box(1.05, 0.05, 0.16, SLEEPER, 0, F + 0.06, -1.45 + i * 0.37, { delay: 0.14 + i * 0.02, noInk: true });
  [-0.3, 0.3].forEach((dx, i) => box(0.07, 0.08, 3.2, RAIL, dx, F + 0.11, 0, { delay: 0.3 + i * 0.04, ink: 1.04 }));

  // The tunnel's brick vault, open at the front, dark inside, two lamps on its walls.
  const spring = 0.6;
  const outer = 1.45;
  const inner = 1.25;
  const shape = new Shape();
  shape.moveTo(outer, 0);
  shape.lineTo(outer, spring);
  shape.absarc(0, spring, outer, 0, Math.PI, false);
  shape.lineTo(-outer, 0);
  shape.lineTo(-inner, 0);
  shape.lineTo(-inner, spring);
  shape.absarc(0, spring, inner, Math.PI, 0, true);
  shape.lineTo(inner, 0);
  shape.closePath();
  const vault = add(
    new ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, -0.65),
    BRICK,
    0,
    F,
    -0.95,
    { delay: 0.2, ink: 1.02 },
  );
  const front = 0.656;
  decorate(
    vault,
    new BoxGeometry(0.014, 0.2, 0.01),
    MORTAR,
    Array.from({ length: 11 }, (_, k) => {
      const angle = (Math.PI * k) / 10;
      return [1.35 * Math.cos(angle), spring + 1.35 * Math.sin(angle), front, angle - Math.PI / 2] as [number, number, number, number];
    }),
  );
  decorate(
    vault,
    new BoxGeometry(0.2, 0.014, 0.01),
    MORTAR,
    [0.15, 0.3, 0.45].flatMap((y) => [[-1.35, y, front], [1.35, y, front]] as Point[]),
  );
  add(archMouth(inner, spring), NIGHT, 0, F, -1.62, { delay: 0.24, flat: true, noInk: true });
  const lamps = [-1, 1].map((side, i) =>
    box(0.08, 0.12, 0.08, CYAN, side * 1.18, F + spring + 0.35, -0.5, { delay: 0.3 + i * 0.03, flat: true, noInk: true }),
  );

  // Multitude: a long hooded robe, sleeves joined in front, no face inside the hood.
  const x0 = -1;
  const z0 = 0.6;
  const G = F;
  const D = 0.7;
  const robe = add(new CylinderGeometry(0.3, 0.62, 1.55, 18).scale(1, 1, 0.8), ROBE, x0, G, z0, { delay: D });
  decorate(robe, new BoxGeometry(0.03, 1.1, 0.02), ROBE_DARK, [
    [-0.18, 0.55, 0.42, 0.08],
    [0.05, 0.6, 0.43, -0.03],
    [0.24, 0.5, 0.4, -0.1],
  ]);
  [-1, 1].forEach((side, i) => {
    ball(0.2, ROBE, x0 + side * 0.3, G + 1.38, z0, { delay: D + 0.08 + i * 0.03 });
    limb(kit, [x0 + side * 0.36, G + 1.55, z0], [x0 + side * 0.11, G + 1.08, z0 + 0.36], 0.12, 0.16, ROBE, { delay: D + 0.12 });
  });
  const hc = G + 1.78;
  add(new SphereGeometry(0.2, 16, 12), HOOD_INSIDE, x0, hc - 0.2, z0 - 0.06, { delay: D + 0.2, noInk: true });
  const face = add(new SphereGeometry(0.17, 16, 12).scale(0.85, 1.1, 0.5), FACE, x0, hc - 0.187, z0 + 0.13, { delay: D + 0.24, noInk: true });
  // The hood, open at the front, with its point.
  add(new SphereGeometry(0.27, 18, 12, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5), ROBE, x0, hc - 0.27, z0, { delay: D + 0.22 });
  add(new SphereGeometry(0.13, 10, 8).scale(1, 1.4, 1), ROBE, x0, hc + 0.12, z0 - 0.05, { delay: D + 0.26, rotation: [-0.4, 0, 0] });
  const eyes = decorate(face, new BoxGeometry(0.025, 0.025, 0.01), MAGENTA, [
    [-0.05, 0.21, 0.085],
    [0.05, 0.21, 0.085],
  ]);

  // The cloud of faces he hears, each tied to his face by a thread.
  const facePoint = new Vector3(x0, hc, z0 + 0.14);
  const C: Point = [x0 + 0.15, G + 2.2, z0 - 0.3];
  const offsets: Point[] = [
    [-0.7, 0, 0],
    [-0.55, 0.35, -0.1],
    [-0.3, 0.6, -0.15],
    [0, 0.72, -0.2],
    [0.32, 0.62, -0.15],
    [0.6, 0.4, -0.1],
    [0.78, 0.08, -0.05],
    [0.68, -0.28, 0.02],
    [-0.72, -0.34, 0.05],
    [-0.25, 0.3, -0.35],
    [0.25, 0.28, -0.38],
    [0.42, -0.55, 0.08],
  ];
  const curves: CatmullRomCurve3[] = [];
  const heads = offsets.map(([dx, dy, dz], i) => {
    const color = GHOSTS[i % GHOSTS.length];
    const radius = 0.12 + (i % 3) * 0.015;
    const center = new Vector3(C[0] + dx, C[1] + dy, C[2] + dz);
    const head = add(new SphereGeometry(radius, 14, 10), color, center.x, center.y - radius, center.z, {
      delay: 1.3 + i * 0.05,
      flat: true,
    });
    const cy = radius;
    decorate(head, new BoxGeometry(0.025, 0.025, 0.01), INK, [
      [-0.04, cy + 0.02, radius - 0.01],
      [0.04, cy + 0.02, radius - 0.01],
    ]);
    decorate(head, new BoxGeometry(0.05, 0.01, 0.01), INK, [[0, cy - 0.05, radius - 0.02]]);
    // A few things to tell them apart: glasses, a bob, a cap, a beard.
    if (i % 4 === 0) decorate(head, new BoxGeometry(0.14, 0.012, 0.012), INK, [[0, cy + 0.02, radius]]);
    if (i % 4 === 1) decorate(head, new SphereGeometry(radius * 1.02, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), GHOST_DARK, [[0, cy + 0.01, -0.01]]);
    if (i % 4 === 2) decorate(head, new BoxGeometry(radius * 2.1, 0.03, radius * 1.6), GHOST_DARK, [[0, cy + radius * 0.7, 0.03]]);
    if (i % 4 === 3) decorate(head, new SphereGeometry(radius * 0.8, 10, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), GHOST_DARK, [[0, cy - 0.01, 0.03]]);
    // The thread, bowed a little upwards on its way.
    const middle = facePoint.clone().lerp(center, 0.5).add(new Vector3(0, 0.15, 0.1));
    const curve = new CatmullRomCurve3([facePoint.clone(), middle, center]);
    curves.push(curve);
    const [x, y, z] = facePoint.toArray();
    const tube = new TubeGeometry(curve, 20, 0.008, 4).translate(-x, -y, -z);
    tube.computeBoundingBox();
    add(tube, MAGENTA, x, y + (tube.boundingBox?.min.y ?? 0), z, { delay: 1.6 + i * 0.03, flat: true, noInk: true });
    return head;
  });
  // Thoughts running down six of the threads into him.
  const thoughts = [0, 2, 4, 6, 8, 10].map((i, k) => ({
    curve: curves[i],
    phase: k / 6,
    dot: ball(0.022, 0xffffff, 0, 0, 0, { delay: 1.9, flat: true, noInk: true }),
  }));

  const rest = heads.map((head) => head.position.clone());
  const tints = heads.map((head) => colorOf(head).clone());
  const point = new Vector3();
  const eyeColor = new Color(MAGENTA);
  const eyeBright = new Color(0xffc2dc);
  tick((t) => {
    // The glitch: now and then a face jumps aside and takes another face's colour.
    const beat = Math.floor(t * 8);
    heads.forEach((head, i) => {
      const noise = Math.sin(beat * 12.9898 + i * 78.233) * 43758.5453;
      const glitch = noise - Math.floor(noise) > 0.88;
      const bob = Math.sin(t * 1.1 + i) * 0.03;
      head.position.set(rest[i].x + (glitch ? (i % 2 ? 0.07 : -0.07) : 0), rest[i].y + bob, rest[i].z);
      colorOf(head).copy(glitch ? tints[(i + 1) % tints.length] : tints[i]);
    });
    for (const { curve, phase, dot } of thoughts) {
      const u = (t * 0.35 + phase) % 1;
      curve.getPoint(1 - u, point);
      dot.position.set(point.x, point.y - 0.022, point.z);
    }
    eyes.color.lerpColors(eyeColor, eyeBright, (Math.sin(t * 3) + 1) / 2);
    lamps.forEach((lamp, i) => (lamp.visible = Math.floor(t * 6 + i * 3) % 9 !== 0));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
