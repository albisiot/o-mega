import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, Group, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { flame, floor, table } from "@/lib/diorama-props";

/**
 * Vulgate (P027): the medium of the Sciolti in her back room, by a curtain of beads. Your secrets
 * drift in as a pink ribbon of smoke, go in at one ear and straight out of the other into a jar
 * for sale, while her eyes stay blank: she knows everything about you and understands none of
 * it. Bottled secrets with blank tags fill the shelf, a candle flickers, the beads sway.
 */
export function vulgate(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WALL = 0x251d38;
  const WOOD = 0x3e2c2a;
  const CLOAK = 0x34316e;
  const SMOKE = 0xff5fb0;
  const TAG = 0xe8dcc0;
  const F = octagonBase(kit, 0x1e1828);
  const G = floor(kit, F, 0.06, 0x2c2236, 0x1e1828, 0.36);

  // The back wall with a dark doorway, and the curtain of beads hanging in it.
  const wall = box(3.3, 2.7, 0.14, WALL, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.86, 2.0, 0.01), 0x0e0a16, [[0.85, 1.0, 0.075]]);
  [0.37, 1.33].forEach((x) => box(0.1, 2.1, 0.12, WOOD, x, G, -1.42, { delay: 0.14 }));
  box(1.08, 0.1, 0.14, WOOD, 0.85, G + 2.04, -1.42, { delay: 0.16 });
  const L = 1.92;
  const top = G + 2.04;
  const strands: { part: Group; x: number }[] = [];
  for (let k = 0; k < 8; k++) {
    const x = 0.5 + k * 0.1;
    const part = cylinder(0.006, 0.006, L, 0x3a1a3a, x, top - L, -1.37, { delay: 0.2 + k * 0.02, flat: true, noInk: true }, 4);
    const beads = Array.from({ length: 9 }, (_, i) => [0, 0.12 + i * 0.2 + (k % 3) * 0.05, 0] as Point);
    decorate(part, new SphereGeometry(0.03, 8, 6).scale(1, 1.7, 1), k % 2 ? MAGENTA : 0xb04aa8, beads);
    strands.push({ part, x });
  }

  // Bottled secrets for sale on two shelves, each with a blank tag.
  [1.12, 1.72].forEach((h, row) => {
    const plank = box(1.3, 0.05, 0.26, WOOD, -0.95, G + h, -1.31, { delay: 0.2 + row * 0.04 });
    decorate(plank, new BoxGeometry(0.08, 0.1, 0.005), TAG, [-0.45, -0.15, 0.15, 0.45].map((dx) => [dx, -0.06, 0.135] as Point));
    [-0.45, -0.15, 0.15, 0.45].forEach((dx, i) => {
      const glow = [CYAN, MAGENTA, 0xb06cff][(i + row) % 3];
      cylinder(0.08, 0.08, 0.2, glow, -0.95 + dx, G + h + 0.05, -1.3, { delay: 0.3 + row * 0.1 + i * 0.03, flat: true }, 12);
      cylinder(0.085, 0.085, 0.04, 0x2a2030, -0.95 + dx, G + h + 0.25, -1.3, { delay: 0.32 + row * 0.1 + i * 0.03 }, 12);
    });
  });

  // A round rug, and the little table with the jar being filled, the takings and a candle.
  const rug = cylinder(1.0, 1.0, 0.012, 0x4a1640, 0, G, 0.15, { delay: 0.12, flat: true, noInk: true }, 28);
  decorate(rug, new TorusGeometry(0.86, 0.025, 4, 40).rotateX(Math.PI / 2), 0xc8963c, [[0, 0.014, 0]]);
  table(kit, 1.3, 0.3, G, 0.3, true, 0x3a2a3a, 0.72);
  const T = G + 0.76;
  const jar = cylinder(0.13, 0.13, 0.3, 0xff8ccb, 1.2, T, 0.25, { delay: 0.5, flat: true }, 16);
  decorate(jar, new BoxGeometry(0.1, 0.07, 0.005), TAG, [[0.03, 0.12, 0.132]]);
  cylinder(0.14, 0.14, 0.03, 0x9fd8e8, 1.2, T + 0.3, 0.25, { delay: 0.54, noInk: true }, 16);
  [0, 1, 2].forEach((k) => cylinder(0.06, 0.06, 0.02, YELLOW, 1.48, T + k * 0.022, 0.42, { delay: 0.56 + k * 0.02 }, 12));
  cylinder(0.035, 0.035, 0.2, 0xe8dcc0, 1.46, T, 0.1, { delay: 0.58 }, 8);
  const candle = flame(kit, 1.46, 0.1, T + 0.2, 0.62, 0.32);

  // Vulgate: hooded, blank glowing eyes, a hand at her temple and the other held out for payment.
  const medium = figure(kit, {
    x: 0,
    z: 0.08,
    y: G,
    facing: 0.3,
    height: 2.35,
    build: "slim",
    skin: 0xd0a8c4,
    hair: { style: "short", color: 0x120f1a },
    face: { mouth: "open", brows: "raised", eyes: 0xe8ffff, glow: true },
    top: { kind: "robe", color: CLOAK, accent: 0x46448a },
    cape: 0x23214a,
    arms: [[-0.32, 2.08, 0.3], [0.5, 1.32, 0.45]],
    delay: 0.8,
  });
  // Long black hair round her face (built here: the figure's "long" hair hangs over the face),
  // and her hood, open wide enough at the front to show it.
  const RH = medium.headRadius;
  const crown = medium.head[1] - G;
  const veil = new CylinderGeometry(RH * 1.03, RH * 1.3, RH * 2.7, 16, 1, true, 0.95, Math.PI * 2 - 1.9);
  add(veil, 0x120f1a, ...medium.at(0, crown + RH * 0.35 - RH * 2.7, -0.02), { delay: 1.2, rotation: [0, 0.3, 0] });
  const hoodAt = medium.at(0, crown + 0.04 - RH * 1.4, -0.06);
  add(new SphereGeometry(RH * 1.4, 18, 12, Math.PI / 2 + 1.15, Math.PI * 2 - 2.3), 0x423e8c, ...hoodAt, { delay: 1.25, rotation: [0, 0.3, 0] });
  const [, palm] = medium.hands;
  cylinder(0.055, 0.055, 0.02, YELLOW, palm[0], palm[1] + 0.08, palm[2], { delay: 1.5 });
  const ear = (side: number): Point => medium.at(side * 0.24, medium.head[1] - G, 0);

  // The smoke: in from the front (from you), in at one ear, out of the other, down into the jar.
  const ribbon = (points: Point[], delay: number) => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    const [x, y, z] = points[0];
    const geometry = new TubeGeometry(curve, 64, 0.03, 6).translate(-x, -y, -z);
    geometry.computeBoundingBox();
    add(geometry, SMOKE, x, y + (geometry.boundingBox?.min.y ?? 0), z, { delay, flat: true, noInk: true });
    return curve;
  };
  const inward = ribbon(
    [
      [-0.9, G + 0.9, 1.9],
      [-1.45, G + 1.4, 1.25],
      [-1.1, G + 2.05, 0.8],
      [-0.75, G + 2.5, 0.5],
      [-0.45, G + 2.25, 0.3],
      ear(-1),
    ],
    1.5,
  );
  const outward = ribbon(
    [
      ear(1),
      [0.62, G + 2.5, 0.1],
      [1.05, G + 2.4, 0.0],
      [1.4, G + 1.9, 0.12],
      [1.15, G + 1.45, 0.3],
      [1.2, T + 0.32, 0.25],
    ],
    1.6,
  );
  const specks = [inward, inward, inward, outward, outward, outward].map((curve, i) => ({
    curve,
    phase: (i % 3) / 3,
    part: ball(0.045, 0xfff0f8, 0, 0, 0, { delay: 1.7, flat: true, noInk: true }),
  }));

  tick((t) => {
    for (const { curve, phase, part } of specks) {
      const p = curve.getPointAt((t * 0.22 + phase) % 1);
      part.position.set(p.x, p.y - 0.045, p.z);
    }
    strands.forEach(({ part, x }, k) => {
      const swing = Math.sin(t * 1.3 + k * 0.6) * 0.035;
      part.position.set(x + L * Math.sin(swing), top - L * Math.cos(swing), -1.37);
      part.rotation.z = swing;
    });
    const flicker = Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05;
    candle.forEach((part) => (part.rotation.z = flicker));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
