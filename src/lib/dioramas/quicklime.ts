import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { crate, floor, skyline } from "@/lib/diorama-props";

/**
 * Quicklime (P065): the grinning chemist in a magenta shirt and rubber apron has just melted
 * his way through the gate of a port warehouse: the padlock in his hand is running down in
 * yellow drops, the bars behind him end in glowing stumps. His own gloves are melting too, and
 * a crate holds the pile of gloves he has already eaten through.
 */
export function quicklime(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const RUST = 0x7a3a4a;
  const GLOVE = 0x3a3f4a;
  const ACID = 0xe8f04a;
  const F = octagonBase(kit, 0x1b1d26);
  const G = floor(kit, F, 0.06, 0x2c3040, 0x1e2230, 0.5);
  skyline(kit, -1.85, G, 0.1, [0x22344a, 0x2a2f4a, 0x1f2a44], -1.4, 0.9);

  // The gate: posts, rails and bars, with a hole melted through the middle.
  const GZ = -1.3;
  [-1.7, 1.45].forEach((x, i) => box(0.16, 2.5, 0.16, shade(RUST, 0.8), x, G, GZ, { delay: 0.12 + i * 0.03 }));
  [0.35, 2.1].forEach((y, i) => box(3.1, 0.07, 0.06, RUST, -0.12, G + y, GZ, { delay: 0.18 + i * 0.03 }));
  const stumps: Point[] = [];
  for (let k = 0; k < 15; k++) {
    const x = -1.52 + k * 0.205;
    const cut = Math.abs(x - 0.6) < 0.3;
    if (cut) {
      box(0.04, 0.55, 0.04, RUST, x, G + 0.05, GZ, { delay: 0.22 + k * 0.01, noInk: true });
      box(0.04, 0.45, 0.04, RUST, x, G + 1.75, GZ, { delay: 0.22 + k * 0.01, noInk: true });
      stumps.push([x, G + 0.6, GZ], [x, G + 1.72, GZ]);
    } else {
      const bar = box(0.04, 2.15, 0.04, RUST, x, G + 0.05, GZ, { delay: 0.22 + k * 0.01, noInk: true });
      decorate(bar, new BoxGeometry(0.045, 0.12, 0.045), 0x9a5a3a, [[0, 0.5 + (k % 4) * 0.35, 0]]);
    }
  }
  stumps.forEach((p, i) => ball(0.04, i % 2 ? ACID : YELLOW, p[0], p[1] - 0.04, p[2], { delay: 0.5, flat: true, noInk: true }));
  // The cut chain still hanging from the post.
  [0, 1, 2, 3].forEach((k) => add(new TorusGeometry(0.05, 0.016, 6, 12), 0x8a8f9c, 1.3, G + 1.25 - k * 0.09, GZ + 0.1, { delay: 0.4 + k * 0.02, rotation: [0, k % 2 ? Math.PI / 2 : 0, 0] }));

  // The crate of spent gloves, holes and all.
  crate(kit, 1.45, 0.45, G, 0.4, 0.5, 0x5e4a3a, -0.3);
  [
    [1.33, 0.42, 0.2],
    [1.58, 0.5, 0.7],
    [1.42, 0.62, 0.1],
  ].forEach(([x, z, turn], i) => {
    const glove = add(new SphereGeometry(0.15, 10, 8).scale(1, 0.45, 1.2), 0x5a6070, x, G + 0.5 + i * 0.05, z, { delay: 0.6 + i * 0.04, rotation: [0, turn, 0] });
    decorate(glove, new BoxGeometry(0.045, 0.05, 0.17), 0x5a6070, [-0.09, -0.03, 0.03, 0.09].map((dx) => [dx, 0.06, 0.21] as Point));
    decorate(glove, new CylinderGeometry(0.04, 0.04, 0.01, 10), ACID, [[0.04, 0.135, 0], [-0.05, 0.13, -0.08]]);
  });

  // Quicklime, padlock in his left hand, his right raised and dripping.
  const man = figure(kit, {
    x: -0.2,
    z: 0.4,
    y: G,
    facing: 0.4,
    height: 2.45,
    skin: 0xd9a07a,
    hair: { style: "spiky", color: 0x2a1e1c },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "apron", color: 0xb0285a, accent: 0x1f3a46, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x23262f },
    shoes: 0x2a2622,
    gloves: GLOVE,
    arms: [[-0.6, 2.05, 0.35], [0.4, 1.35, 0.55]],
    delay: 0.7,
  });
  // Goggles pushed up on his forehead.
  const R = man.headRadius;
  const brow = R * 1.06 + 0.17;
  decorate(man.headPart, new TorusGeometry(R * 0.78, 0.022, 6, 24).rotateX(Math.PI / 2), 0x2a2630, [[0, brow, -0.01]]);
  decorate(man.headPart, new CylinderGeometry(0.06, 0.06, 0.07, 14).rotateX(Math.PI / 2), 0x4a4f5c, [-1, 1].map((s) => [s * 0.09, brow + 0.02, R * 0.72] as Point));
  decorate(man.headPart, new CylinderGeometry(0.042, 0.042, 0.02, 14).rotateX(Math.PI / 2), CYAN, [-1, 1].map((s) => [s * 0.09, brow + 0.02, R * 0.72 + 0.04] as Point));
  // The apron runs down to his shins.
  const at = man.at;
  box(0.56, 0.85, 0.03, 0x1f3a46, ...at(0, 0.28, 0.26), { delay: 1.1, rotation: [0.06, 0.4, 0] });

  // The padlock, melting in his hand.
  const [right, left] = man.hands;
  const lock = box(0.22, 0.2, 0.1, 0xb08d3c, left[0], left[1] - 0.24, left[2] + 0.05, { delay: 1.4, rotation: [0, 0.4, 0.15] });
  decorate(lock, new SphereGeometry(0.05, 8, 6).scale(1, 1.4, 0.5), YELLOW, [[-0.05, 0.03, 0.05], [0.06, 0.1, 0.05]]);
  decorate(lock, new TorusGeometry(0.07, 0.018, 6, 12, Math.PI), 0x9aa3b4, [[0, 0.2, 0]]);
  decorate(lock, new BoxGeometry(0.03, 0.04, 0.01), INK, [[0, 0.1, 0.052]]);
  // Melting gloves: glowing blobs on his fingers.
  [right, left].forEach((hand, i) =>
    [0, 1, 2].forEach((k) => ball(0.035, k % 2 ? ACID : YELLOW, hand[0] + (k - 1) * 0.05, hand[1] - 0.1 - k * 0.02, hand[2] + 0.07, { delay: 1.45 + i * 0.04, flat: true, noInk: true })),
  );
  // Acid puddles, smoking.
  [
    [left[0] + 0.05, left[2] + 0.1, 0.26],
    [right[0] - 0.1, right[2] + 0.2, 0.2],
  ].forEach(([x, z, r], i) => {
    add(new CylinderGeometry(r, r, 0.008, 18).scale(1, 1, 0.65), 0x6a7a20, x, G, z, { delay: 0.6 + i * 0.03, flat: true, noInk: true });
    add(new CylinderGeometry(r * 0.75, r * 0.75, 0.01, 18).scale(1, 1, 0.6), ACID, x, G, z, { delay: 0.62 + i * 0.03, flat: true, noInk: true });
  });
  motes(10, 0xc8c090, 0.03, [left[0] - 0.25, G, left[2] - 0.1], [left[0] + 0.3, G + 1.2, left[2] + 0.3], 1.5);

  // Drops falling from the hands and the lock.
  const sources: Point[] = [
    [right[0] - 0.04, right[1] - 0.12, right[2] + 0.07],
    [right[0] + 0.05, right[1] - 0.14, right[2] + 0.07],
    [left[0] + 0.02, left[1] - 0.26, left[2] + 0.1],
    [left[0] - 0.08, left[1] - 0.24, left[2] + 0.08],
    [left[0] + 0.1, left[1] - 0.12, left[2] + 0.08],
  ];
  const drops = sources.map((p, i) => add(new ConeGeometry(0.025, 0.07, 8).rotateX(Math.PI), YELLOW, ...p, { delay: 1.6 + i * 0.03, flat: true, noInk: true }));
  tick((t) => {
    drops.forEach((drop, i) => {
      const [x, y, z] = sources[i];
      const u = (t * 0.7 + i * 0.37) % 1;
      drop.position.set(x, y - (y - G) * u * u, z);
    });
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
