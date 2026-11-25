import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, TorusGeometry, Vector3 } from "three";
import { ORANGE, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bench, floor, lamp } from "@/lib/diorama-props";

/**
 * Eudaemon (P175): on the seafront the Compagnia's curator of public happiness, faceless behind
 * an oval screen and wearing a ruff of glass vials, conducts the joy out of a grey man slumped on
 * a bench and pours it into a beaming lady in a straw hat: amber beads stream through his collar
 * and the vials fill and empty. He takes nothing, he says: he moves it.
 */
export function eudaemon(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0x8a8aa0;
  const NAVY = 0x1e2a48;
  const GLASS = 0xc8eef4;
  const BRASS = 0xa08850;
  const LACE = 0xf0ece2;
  const F = octagonBase(kit, 0x1d2030);
  const G = floor(kit, F, 0.06, 0x3c3a4a, 0x2a2a38, 0.45);

  // The sea behind the balustrade, a sail on it, and a lamp post.
  const sea = box(3.0, 0.03, 0.5, 0x14506a, 0, G, -1.72, { delay: 0.08, noInk: true });
  decorate(sea, new BoxGeometry(0.3, 0.01, 0.025), 0xbfe8f0, [
    [-1.0, 0.03, 0.05],
    [-0.2, 0.03, -0.1],
    [0.7, 0.03, 0.1],
  ]);
  box(0.36, 0.08, 0.12, 0xe8e2d0, -0.6, G + 0.03, -1.75, { delay: 0.2 });
  const sail = add(new CylinderGeometry(0, 0.16, 0.42, 3).scale(1, 1, 0.15), 0xf4f0e6, -0.6, G + 0.11, -1.75, { delay: 0.24 });
  box(1.6, 0.6, 0.05, 0x3a3456, 1.0, G, -1.95, { delay: 0.1, rotation: [0, -0.25, 0] });
  box(3.5, 0.08, 0.16, STONE, 0, G + 0.62, -1.38, { delay: 0.14 });
  for (let k = 0; k < 13; k++) cylinder(0.045, 0.065, 0.62, k % 2 ? STONE : 0x7a7a90, -1.65 + k * 0.275, G, -1.38, { delay: 0.16 + k * 0.01 }, 8);
  lamp(kit, 1.75, -0.95, G, 0.3, 2.3, 0xe8e8e0);

  // The drained man on the bench: grey, slumped, his hat beside him.
  bench(kit, -1.35, 0.25, G, 0.4, 0.75);
  const man = figure(kit, {
    x: -1.32,
    z: 0.33,
    y: G,
    facing: 0.75,
    height: 2.3,
    skin: 0xb8b0aa,
    hair: { style: "short", color: 0x6a6a72 },
    face: { mouth: "frown", brows: "worried" },
    top: { kind: "suit", color: 0x5a5a64, accent: 0xa8a8b0, tie: 0x46464e },
    bottom: { kind: "trousers", color: 0x4a4a54 },
    shoes: 0x2a2a30,
    arms: [
      [-0.2, 0.7, 0.42],
      [0.2, 0.7, 0.42],
    ],
    legs: "sit",
    delay: 0.9,
  });
  cylinder(0.2, 0.2, 0.02, 0x4a4a54, -0.85, G + 0.35, 0.0, { delay: 1.3 }, 16);
  cylinder(0.12, 0.13, 0.12, 0x4a4a54, -0.85, G + 0.37, 0.0, { delay: 1.32 }, 16);

  // The lady he pours it into: a straw hat, a beaming grin, a hand on her hat.
  const lady = figure(kit, {
    x: 1.3,
    z: 0.7,
    y: G,
    facing: -0.1,
    height: 2.3,
    skin: 0xe8c0a0,
    hair: { style: "bob", color: 0x4a2a1e },
    face: { mouth: "grin", brows: "raised" },
    headwear: { kind: "hat", color: 0xd8c08a, accent: 0xc8285a },
    top: { kind: "dress", color: 0xe4d8bc },
    belt: 0xc8285a,
    shoes: 0xc8285a,
    arms: ["hip", "wave"],
    delay: 1.0,
  });

  // Eudaemon: a hood, an oval screen for a face, a long navy coat, lace at the cuffs.
  const theta = 0.3;
  const lord = figure(kit, {
    x: 0.05,
    z: -0.3,
    y: G,
    facing: theta,
    height: 2.65,
    build: "slim",
    skin: 0xe6e6de,
    face: { blank: true },
    headwear: { kind: "hood", color: 0x18203a },
    top: { kind: "coat", color: NAVY, accent: 0x2c3c62 },
    bottom: { kind: "trousers", color: 0x161e34 },
    shoes: 0x14141c,
    arms: [
      [-0.62, 1.62, 0.38],
      [0.62, 1.58, 0.38],
    ],
    delay: 1.2,
  });
  const at = lord.at;
  const turn: Point = [0, theta, 0];
  const R = lord.headRadius;
  add(new TorusGeometry(R * 0.82, 0.028, 6, 24).scale(0.85, 1.05, 1), BRASS, ...at(0, lord.head[1] - G - R * 0.88, R * 0.78), { delay: 1.6, rotation: turn });
  decorate(lord.headPart, new BoxGeometry(R * 1.1, 0.008, 0.01), 0xb8b8b0, [-0.06, -0.02, 0.02, 0.06, 0.1].map((dy) => [0, R * 1.06 + dy, R * 0.93] as Point));
  // Brass buttons down the front.
  [1.3, 1.45, 1.6, 1.75].forEach((y, i) => ball(0.025, BRASS, ...at(0.06, y, 0.235 + (y - 1.3) * 0.02), { delay: 1.65 + i * 0.02 }));
  // Lace cuffs.
  lord.hands.forEach((hand, i) => {
    const elbow = lord.elbows[i];
    const from: Point = [elbow[0] + (hand[0] - elbow[0]) * 0.72, elbow[1] + (hand[1] - elbow[1]) * 0.72, elbow[2] + (hand[2] - elbow[2]) * 0.72];
    limb(kit, from, [elbow[0] + (hand[0] - elbow[0]) * 0.85, elbow[1] + (hand[1] - elbow[1]) * 0.85, elbow[2] + (hand[2] - elbow[2]) * 0.85], 0.085, 0.1, LACE, { delay: 1.7 });
  });

  // The ruff: glass vials round his neck, each with its level of amber.
  const neck = at(0, 1.98, 0.02);
  const vials = Array.from({ length: 11 }, (_, k) => {
    const a = -1.75 + (k / 10) * 3.5;
    const out = at(Math.sin(a) * 0.52, 2.2, Math.cos(a) * 0.52);
    const from: Point = [neck[0] + (out[0] - neck[0]) * 0.25, neck[1] + 0.03, neck[2] + (out[2] - neck[2]) * 0.25];
    const { length, rotation } = aim(from, out);
    cylinder(0.042, 0.042, length, GLASS, ...from, { delay: 1.75 + k * 0.02, rotation }, 10);
    const fill = cylinder(0.048, 0.048, length, ORANGE, ...from, { delay: 1.8 + k * 0.02, rotation, flat: true, noInk: true }, 10);
    cylinder(0.05, 0.05, 0.05, BRASS, ...out, { delay: 1.85 + k * 0.02, rotation }, 10);
    return fill;
  });

  // The joy: beads drawn out of the grey man into the collar, and out of the collar into the lady.
  const streams = [
    [man.head, at(-0.3, 2.05, 0.1), [-0.7, 0.6]],
    [at(0.3, 2.05, 0.1), lady.head, [0.6, 0.6]],
  ] as [Point, Point, [number, number]][];
  const beads = streams.flatMap(([from, to, [bend, lift]], s) => {
    const path = new CatmullRomCurve3([
      new Vector3(from[0], from[1] + (s ? 0 : 0.3), from[2]),
      new Vector3((from[0] + to[0]) / 2 + bend * 0.2, Math.max(from[1], to[1]) + lift, (from[2] + to[2]) / 2 + 0.2),
      new Vector3(to[0], to[1] + (s ? 0.35 : 0), to[2]),
    ]);
    return Array.from({ length: 6 }, (_, k) => ({ part: ball(0.05, ORANGE, from[0], from[1], from[2], { delay: 2 + s * 0.2 + k * 0.03, flat: true, noInk: true }), path, k }));
  });

  tick((t) => {
    beads.forEach(({ part, path, k }) => {
      const p = path.getPoint((t * 0.22 + k / 6) % 1);
      part.position.set(p.x, p.y - 0.05, p.z);
    });
    // The vials fill and empty in a wave round the collar.
    vials.forEach((fill, k) => fill.children[0].scale.set(1, 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.6 - k * 0.6)), 1));
    sail.rotation.z = Math.sin(t * 1.3) * 0.06;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
