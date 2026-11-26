import { BoxGeometry, CylinderGeometry, DodecahedronGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Briciola (P315): the pastry cook shrunk to the size of a crumb on her own counter, among
 * giants: an espresso cup taller than she is, steaming, a biscuit like a stage, a sugar cube, a
 * rolling pin and a key as long as a bench. She springs off the biscuit's edge reaching for a
 * crumb, rings of light closing in round her as she gets smaller; one crumb is all the weight
 * she can carry.
 */
export function briciola(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const BISCUIT = 0xd89a40;
  const CUP = 0x2a7a9a;
  const F = octagonBase(kit, 0x1e1a26);
  const G = floor(kit, F, 0.06, 0x3a3448, 0x2a2436, 0.75);

  // The espresso cup on its saucer, coffee steaming.
  const [cx, cz] = [0.95, -0.9];
  cylinder(0.85, 0.75, 0.08, 0x3a8aaa, cx, G, cz, { delay: 0.1 }, 28);
  const cup = cylinder(0.62, 0.45, 1.25, CUP, cx, G + 0.08, cz, { delay: 0.15 }, 28);
  decorate(cup, new BoxGeometry(0.5, 0.06, 0.01), 0x9fe8ff, [[0.1, 0.9, 0.58, 0.1]]);
  add(new TorusGeometry(0.6, 0.035, 6, 32).rotateX(Math.PI / 2), 0x3a8aaa, cx, G + 1.29, cz, { delay: 0.2 });
  cylinder(0.58, 0.58, 0.01, 0x3a2218, cx, G + 1.3, cz, { delay: 0.22, flat: true, noInk: true }, 28);
  add(new TorusGeometry(0.26, 0.07, 8, 18, Math.PI).rotateZ(-Math.PI / 2), CUP, cx + 0.5, G + 0.5, cz + 0.12, { delay: 0.25, rotation: [0, -0.4, 0] });
  motes(10, 0xe8e4f0, 0.045, [cx - 0.3, G + 1.4, cz - 0.3], [cx + 0.3, G + 2.6, cz + 0.3], 1.0);

  // The rolling pin with flour round it, and a sugar cube.
  add(new CylinderGeometry(0.24, 0.24, 1.3, 18).rotateZ(Math.PI / 2), 0x7a6656, -0.95, G, -1.15, { delay: 0.3 });
  [-1.75, -0.15].forEach((x) => add(new CylinderGeometry(0.08, 0.08, 0.3, 10).rotateZ(Math.PI / 2), 0x5e4a3a, x, G + 0.16, -1.15, { delay: 0.32 }));
  [
    [-0.4, -0.7, 0.35],
    [-1.4, -0.65, 0.25],
    [0.2, 0.2, 0.18],
  ].forEach(([x, z, r], i) => cylinder(r, r, 0.006, 0xe8e4f0, x, G, z, { delay: 0.34 + i * 0.02, flat: true, noInk: true }, 16));
  const sugar = box(0.4, 0.4, 0.4, 0xf4f0f6, 0.0, G, -0.45, { delay: 0.36, rotation: [0, 0.45, 0] });
  decorate(sugar, new BoxGeometry(0.05, 0.05, 0.01), 0xc8c4d8, [
    [-0.1, 0.25, 0.201],
    [0.08, 0.12, 0.201],
    [0.12, 0.3, 0.201],
  ]);

  // The key lying on the counter.
  const ring: Point = [1.5, G, 0.4];
  const turn = -0.65;
  const [dx, dz] = [Math.sin(turn), Math.cos(turn)];
  add(new TorusGeometry(0.28, 0.07, 8, 22).rotateX(Math.PI / 2), 0x8a9ab8, ...ring, { delay: 0.4 });
  box(0.12, 0.12, 1.0, 0x8a9ab8, ring[0] + dx * 0.82, G, ring[2] + dz * 0.82, { delay: 0.42, rotation: [0, turn, 0] });
  [1.12, 1.25].forEach((d, i) => box(0.24, 0.1, 0.08, 0x8a9ab8, ring[0] + dx * d + dz * 0.14, G, ring[2] + dz * d - dx * 0.14, { delay: 0.44 + i * 0.02, rotation: [0, turn, 0] }));

  // The biscuit she stands on, chocolate chips and crumbs round it.
  const [bx, bz] = [-0.8, 0.4];
  const biscuit = cylinder(0.82, 0.85, 0.22, BISCUIT, bx, G, bz, { delay: 0.45 }, 24);
  decorate(
    biscuit,
    new BoxGeometry(0.1, 0.03, 0.1),
    0x5a3420,
    [
      [-0.4, 0.22, 0.1],
      [0.1, 0.22, -0.45],
      [-0.1, 0.22, 0.5],
      [0.45, 0.22, -0.05],
      [-0.5, 0.22, -0.35],
    ],
  );
  const crumbs: Point[] = [
    [0.15, 0.95, 0.07],
    [-0.05, 1.3, 0.05],
    [-1.55, 1.05, 0.06],
    [0.35, -0.05, 0.05],
    [-1.75, 0.1, 0.07],
  ];
  crumbs.forEach(([x, z, r], i) => add(new DodecahedronGeometry(r), BISCUIT, x, G - r * 0.2, z, { delay: 0.5 + i * 0.03, rotation: [i, i * 2, 0] }));

  // Briciola, small as a crumb, springing off the biscuit's edge.
  const top = G + 0.22;
  const B = figure(kit, {
    x: -0.55,
    z: 0.55,
    y: top,
    facing: 0.55,
    height: 1.7,
    skin: 0xe8b898,
    hair: { style: "bun", color: 0x2a1a24 },
    face: { mouth: "grin", brows: "raised", marks: 0xf4f0f6 },
    headwear: { kind: "bandana", color: 0xf0ece6 },
    top: { kind: "apron", color: 0xf0ece6, accent: MAGENTA, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x24384a },
    shoes: 0x1e1c24,
    arms: [[-0.4, 1.3, 0.5], "out"],
    legs: "stride",
    delay: 0.8,
  });
  const hand = B.hands[0];
  const crumb = add(new DodecahedronGeometry(0.07), BISCUIT, hand[0], hand[1] - 0.04, hand[2] + 0.06, { delay: 1.4 });
  B.parts.push(crumb);
  const falling = [0, 1, 2].map((k) => ball(0.025, BISCUIT, hand[0], hand[1] - 0.1, hand[2], { delay: 1.5 + k * 0.05, noInk: true }));

  // Rings closing in round her as she shrinks.
  const rings = [0, 1].map((k) => add(new TorusGeometry(0.5, 0.02, 6, 32).rotateX(Math.PI / 2), CYAN, ...B.at(0, 0.02, 0), { delay: 1.6 + k * 0.1, flat: true, noInk: true }));

  const rest = B.parts.map((part) => part.position.y);
  tick((t) => {
    const hop = Math.max(0, Math.sin(t * 3)) * 0.12;
    B.parts.forEach((part, i) => (part.position.y = rest[i] + hop));
    rings.forEach((r, k) => {
      const u = (t * 0.5 + k * 0.5) % 1;
      r.children.forEach((mesh) => mesh.scale.set(1.8 - u * 1.4, 1, 1.8 - u * 1.4));
      r.visible = u < 0.9;
    });
    falling.forEach((c, k) => {
      const u = (t * 0.8 + k / 3) % 1;
      c.position.set(hand[0] + k * 0.03, hand[1] - 0.12 + hop - u * (hand[1] - 0.12 - top), hand[2] + 0.04);
    });
  });

  return { width: 4.9, height: 4.0, lookY: 1.05 };
}
