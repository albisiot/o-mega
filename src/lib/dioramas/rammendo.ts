import { BoxGeometry, Color, CylinderGeometry, DodecahedronGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle } from "@/lib/diorama-props";

/**
 * Rammendo (P313): the night-shift nurse has just landed fist-first in the ambulance bay of the
 * emergency department, cracking the asphalt; the stitches on her arms and face glow brighter as
 * the clock over the door races through the night. Machines and she don't get on: the coffee
 * machine she kicked lies askew, its screen blinking an error, an ambulance flashing behind.
 */
export function rammendo(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WALL = 0x2a3348;
  const ASPHALT = 0x2a2d3a;
  const F = octagonBase(kit, 0x1c1e28);
  const G = floor(kit, F, 0.06, ASPHALT, 0x22242e, 0.8);

  // The emergency entrance: a lit glass door under a canopy, windows, a cyan cross and a clock.
  const wall = box(2.4, 2.8, 0.3, WALL, -0.45, G, -1.45, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.26, 0.3, 0.01), CYAN, [-0.85, -0.3, 0.3, 0.85].flatMap((x) => [1.85, 2.4].map((y) => [x, y, 0.155] as Point)));
  decorate(wall, new BoxGeometry(1.0, 1.15, 0.01), YELLOW, [[0.25, 0.575, 0.155]]);
  decorate(wall, new BoxGeometry(0.04, 1.15, 0.02), INK, [[0.25, 0.575, 0.165]]);
  decorate(wall, new BoxGeometry(0.4, 0.4, 0.02), 0x14121c, [[-0.85, 1.3, 0.16]]);
  decorate(wall, new BoxGeometry(0.3, 0.09, 0.01), CYAN, [[-0.85, 1.3, 0.175]]);
  decorate(wall, new BoxGeometry(0.09, 0.3, 0.01), CYAN, [[-0.85, 1.3, 0.175]]);
  const canopy = box(1.5, 0.1, 0.75, 0x3a4258, -0.2, G + 1.35, -0.95, { delay: 0.2 });
  decorate(canopy, new BoxGeometry(0.12, 0.012, 0.12), YELLOW, [-0.4, 0, 0.4].map((x) => [x, -0.008, 0.05] as Point));
  [-0.85, 0.45].forEach((x) => box(0.06, 1.35, 0.06, 0x8a93a3, x, G, -0.65, { delay: 0.18, noInk: true }));
  const C: Point = [-0.2, G + 1.95, -1.27];
  add(new CylinderGeometry(0.2, 0.2, 0.04, 20).rotateX(Math.PI / 2), 0xe8e4dc, C[0], C[1] - 0.2, C[2], { delay: 0.3 });
  const hour = add(new BoxGeometry(0.03, 0.11, 0.01), INK, C[0], C[1], C[2] + 0.03, { delay: 0.34, flat: true, noInk: true });
  const minute = add(new BoxGeometry(0.02, 0.16, 0.01), INK, C[0], C[1], C[2] + 0.04, { delay: 0.36, flat: true, noInk: true });

  // The ambulance parked by the door, its light bar flashing.
  const body = box(1.0, 0.85, 0.7, 0xe0dccf, 1.6, G + 0.22, -0.65, { delay: 0.3 });
  decorate(body, new BoxGeometry(1.0, 0.1, 0.01), CYAN, [[0, 0.35, 0.355]]);
  decorate(body, new BoxGeometry(0.3, 0.25, 0.01), 0x16303e, [[0.25, 0.62, 0.355]]);
  const cab = box(0.42, 0.62, 0.66, 0xe0dccf, 0.89, G + 0.22, -0.65, { delay: 0.34 });
  decorate(cab, new BoxGeometry(0.2, 0.22, 0.68), 0x16303e, [[-0.05, 0.42, 0]]);
  [0.95, 1.85].forEach((x) => [-1, 1].forEach((s) => add(new CylinderGeometry(0.14, 0.14, 0.08, 12).rotateX(Math.PI / 2), 0x23222b, x, G, -0.65 + s * 0.34, { delay: 0.36 })));
  const lights = [MAGENTA, CYAN].map((color, i) => box(0.14, 0.08, 0.3, color, 0.82 + i * 0.16, G + 0.84, -0.65, { delay: 0.4, flat: true }));

  // The coffee machine she fought with, knocked askew, error blinking; empty cups by it.
  const machine = box(0.55, 1.4, 0.45, 0x3a2a4a, -1.55, G, -0.6, { delay: 0.4, rotation: [0, 0.5, 0.14] });
  decorate(machine, new BoxGeometry(0.34, 0.72, 0.01), 0x16303e, [[-0.06, 0.82, 0.23]]);
  [CYAN, 0xe8e4dc, MAGENTA].forEach((color, k) => decorate(machine, new BoxGeometry(0.07, 0.1, 0.01), color, [-0.16, -0.06, 0.04].map((x) => [x, 0.6 + k * 0.22, 0.235] as Point)));
  decorate(machine, new BoxGeometry(0.06, 0.2, 0.01), 0x8a93a3, [[0.19, 0.95, 0.235]]);
  decorate(machine, new BoxGeometry(0.3, 0.08, 0.01), INK, [[-0.06, 0.3, 0.235]]);
  const error = decorate(machine, new BoxGeometry(0.4, 0.1, 0.01), MAGENTA, [[0, 1.27, 0.235]]);
  decorate(machine, new BoxGeometry(0.3, 0.02, 0.01), INK, [[0.05, 0.45, 0.235, 0.5]]);
  [
    [-1.05, -0.05, 0],
    [-1.2, 0.15, 1.4],
    [-0.95, 0.2, 1.2],
  ].forEach(([x, z, lie], i) => cylinder(0.05, 0.04, 0.13, 0xe8e4dc, x, G + (lie ? 0.05 : 0), z, { delay: 0.45 + i * 0.03, rotation: [0, 0, lie] }, 10));
  puddle(kit, 1.15, 0.75, G, 0.5, 0.35, MAGENTA);

  // Rammendo, down on one knee, her right fist on a heaved slab of asphalt.
  const N = figure(kit, {
    x: -0.15,
    z: 0.55,
    y: G,
    facing: 0.75,
    height: 2.4,
    skin: 0x6a4232,
    hair: { style: "curly", color: 0x2a2224 },
    face: { mouth: "frown", brows: "angry", marks: MAGENTA },
    top: { kind: "jacket", color: 0x1f4650, accent: 0x2f7a80, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2a6a72 },
    shoes: 0xe8e8e0,
    arms: [[-0.62, 0.52, 0.3], [0.55, 1.4, 0.3]],
    legs: "kneel",
    delay: 0.8,
  });
  box(0.09, 0.12, 0.02, 0xe8e4dc, ...N.at(0.15, 1.2, 0.27), { delay: 1.3, rotation: [0, 0.75, 0], noInk: true });
  const fist = N.hands[0];
  add(new DodecahedronGeometry(0.24), 0x363a4a, fist[0] + 0.05, G - 0.06, fist[2], { delay: 0.6, rotation: [0.4, 0.3, 0] });
  box(0.36, 0.1, 0.3, ASPHALT, fist[0] - 0.25, G, fist[2] + 0.12, { delay: 0.62, rotation: [0.1, 0.4, 0.5] });
  [0, 1, 2, 3, 4, 5].forEach((k) => {
    const a = k * 1.1 + 0.3;
    const r = 0.45 + (k % 3) * 0.2;
    const size = 0.07 + (k % 3) * 0.04;
    add(new DodecahedronGeometry(size), k % 2 ? ASPHALT : 0x363a4a, fist[0] + Math.cos(a) * r, G - size * 0.3, fist[2] + Math.sin(a) * r * 0.8, { delay: 0.62 + k * 0.02, rotation: [k, k * 2, 0] });
  });
  [0.2, 1.3, 2.4, 3.6, 4.7].forEach((a, k) => box(0.6 + (k % 2) * 0.25, 0.008, 0.025, INK, fist[0] + Math.cos(a) * 0.45, G, fist[2] + Math.sin(a) * 0.4, { delay: 0.7, flat: true, noInk: true, rotation: [0, -a, 0] }));

  // The stitches on her bare forearms, glowing.
  const rings = [0, 1].flatMap((i) => {
    const [elbow, hand] = [N.elbows[i], N.hands[i]];
    const { rotation } = aim(elbow, hand);
    return [0.25, 0.5, 0.75].map((u, k) =>
      add(new TorusGeometry(0.11, 0.016, 6, 20).rotateX(Math.PI / 2), MAGENTA, ...lerp(elbow, hand, u), { delay: 1.5 + k * 0.05, flat: true, noInk: true, rotation }),
    );
  });

  const glowFrom = new Color(MAGENTA);
  const glowTo = new Color(0xffd0e4);
  tick((t) => {
    // A whole night every twelve seconds: the later it gets, the brighter her stitches.
    const night = (t % 12) / 12;
    hour.rotation.z = -night * Math.PI - 0.5;
    minute.rotation.z = -night * Math.PI * 12 - 2.2;
    const k = night * (0.75 + 0.25 * Math.sin(t * 6));
    rings.forEach((ring) => colorOf(ring).lerpColors(glowFrom, glowTo, k));
    const on = Math.floor(t * 3) % 2;
    colorOf(lights[0]).set(on ? 0x5a1a30 : MAGENTA);
    colorOf(lights[1]).set(on ? CYAN : 0x0b3d50);
    error.color.set(Math.floor(t * 2) % 2 ? 0x3a1a2a : MAGENTA);
  });

  return { width: 4.9, height: 4.3, lookY: 1.35 };
}

function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
