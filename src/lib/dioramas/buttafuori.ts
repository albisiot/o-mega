import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, cable, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Buttafuori (P309): at the door of the Banco's casino, under a round canopy ringed in neon, the
 * bouncer stands on the red carpet with his arms crossed, earpiece wire down his collar, so heavy
 * that his boots have sunk into the cracked paving. A dandy in a teal suit shoves at his side
 * with all he has and his shoes slip; the bouncer does not even look. The price: he can't move
 * either, the paving holds him like a plinth.
 */
export function buttafuori(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BRASS = 0xc9a040;
  const COAT = 0x2c3040;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x34303e, 0x24202c, 0.45);

  // The casino front: dark stone, lit glass doors, neon tubes on the pillars.
  const front = box(3.8, 3.0, 0.25, 0x2a2240, 0, G, -1.6, { delay: 0.1, ink: 1.02 });
  decorate(front, new BoxGeometry(0.42, 1.5, 0.01), ORANGE, [
    [-0.24, 0.75, 0.13],
    [0.24, 0.75, 0.13],
  ]);
  decorate(front, new BoxGeometry(0.03, 1.5, 0.012), 0x3a2a20, [[0, 0.75, 0.135]]);
  decorate(front, new BoxGeometry(0.06, 2.6, 0.02), MAGENTA, [
    [-0.75, 1.3, 0.14],
    [0.75, 1.3, 0.14],
    [-1.55, 1.3, 0.14],
    [1.55, 1.3, 0.14],
  ]);
  decorate(front, new BoxGeometry(0.4, 0.5, 0.01), 0x1c2436, [
    [-1.15, 1.9, 0.13],
    [1.15, 1.9, 0.13],
  ]);
  // The round canopy over the door, its neon rim and its rows of little lights.
  const canopy = add(new CylinderGeometry(1.25, 1.25, 0.14, 28, 1, false, -Math.PI / 2, Math.PI), 0x3a2a5a, 0, G + 2.75, -1.45, { delay: 0.2 });
  decorate(
    canopy,
    new CylinderGeometry(0.035, 0.035, 0.01, 8),
    0xffb8d0,
    [0.45, 0.8, 1.1].flatMap((r, i) => Array.from({ length: 5 + i * 2 }, (_, k) => [Math.sin(-Math.PI / 2 + ((k + 0.5) / (5 + i * 2)) * Math.PI) * r, -0.006, Math.cos(-Math.PI / 2 + ((k + 0.5) / (5 + i * 2)) * Math.PI) * r] as Point)),
  );
  const rim = add(new TorusGeometry(1.26, 0.04, 6, 28, Math.PI).rotateX(Math.PI / 2), MAGENTA, 0, G + 2.8, -1.45, { delay: 0.26, flat: true, noInk: true });
  // The red carpet and the brass posts with their velvet rope.
  box(0.95, 0.012, 2.6, 0x8a1a3a, 0, G, -0.2, { delay: 0.3, noInk: true });
  const posts: Point[] = [
    [-0.95, G, -0.75],
    [-1.0, G, 0.35],
    [-0.95, G, 1.35],
  ];
  posts.forEach(([x, y, z], i) => {
    cylinder(0.14, 0.16, 0.05, BRASS, x, y, z, { delay: 0.35 + i * 0.03 }, 12);
    cylinder(0.03, 0.03, 0.85, BRASS, x, y + 0.05, z, { delay: 0.37 + i * 0.03 }, 8);
    ball(0.06, BRASS, x, y + 0.88, z, { delay: 0.4 + i * 0.03 });
  });
  posts.slice(1).forEach(([x, y, z], i) => {
    const [px, , pz] = posts[i];
    cable(kit, [[px, y + 0.88, pz], [(px + x) / 2, y + 0.62, (pz + z) / 2], [x, y + 0.88, z]], 0.03, MAGENTA, 0.5 + i * 0.04);
  });
  // A palm in a planter.
  cylinder(0.3, 0.26, 0.4, 0x3a3a48, 1.65, G, -0.85, { delay: 0.3 }, 10);
  [0, 1, 2, 3].forEach((k) => cylinder(0.08 - k * 0.008, 0.09 - k * 0.008, 0.55, 0x6b5442, 1.65 + k * 0.03, G + 0.4 + k * 0.53, -0.85, { delay: 0.34 + k * 0.03 }, 8));
  [0, 1.3, 2.6, 3.9, 5.2].forEach((a, k) =>
    add(new ConeGeometry(0.1, 0.9, 5), 0x2f8f4f, 1.77, G + 2.45, -0.85, { delay: 0.5 + k * 0.03, rotation: [Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2] }),
  );

  // The bouncer, arms crossed, sunk to his ankles in the paving.
  const facing = 0.3;
  const u = 2.75 / 2.4;
  const big = figure(kit, {
    x: -0.05,
    z: 0.05,
    y: G - 0.1,
    facing,
    height: 2.75,
    build: "broad",
    skin: 0x6a4030,
    hair: { style: "short", color: 0x141216 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "coat", color: COAT, accent: 0x262a38 },
    bottom: { kind: "trousers", color: 0x22242e },
    shoes: 0x141218,
    arms: ["crossed", "crossed"],
    delay: 0.8,
  });
  // The flat top of his haircut, and the earpiece wire.
  cylinder(0.2 * u, 0.215 * u, 0.2, 0x141216, big.head[0], big.top - 0.12, big.head[2] - 0.02, { delay: 1.3, rotation: [0, facing, 0] }, 12);
  const ear = big.at(-0.24 * u, 2.12 * u - 0.1, 0.02);
  cable(kit, [ear, big.at(-0.27 * u, 1.95 * u - 0.1, -0.02), big.at(-0.2 * u, 1.8 * u - 0.1, -0.08)], 0.012, 0xd8d4c8, 1.4);
  ball(0.03, 0xd8d4c8, ear[0], ear[1] - 0.03, ear[2], { delay: 1.4 });
  // The paving broken round his boots: raised slabs, chunks and cracks.
  (
    [
      [-0.55, 0.3, 0.4],
      [0.45, 0.25, -0.5],
      [-0.2, 0.55, 0.15],
      [0.25, -0.3, 0.6],
    ] as [number, number, number][]
  ).forEach(([dx, dz, turn], i) =>
    box(0.36, 0.06, 0.3, 0x46424f, big.at(0, 0, 0)[0] + dx, G - 0.02, big.at(0, 0, 0)[2] + dz, { delay: 0.7 + i * 0.03, rotation: [turn * 0.4, turn, turn * 0.5] }),
  );
  [0.2, 1.1, 2.0, 2.9, 3.8, 4.9].forEach((a, i) =>
    box(0.5, 0.008, 0.025, INK, big.at(0, 0, 0)[0] + Math.cos(a) * 0.55, G, big.at(0, 0, 0)[2] + Math.sin(a) * 0.45, { delay: 0.75 + i * 0.02, flat: true, noInk: true, rotation: [0, -a, 0] }),
  );
  [-1, 1].forEach((side, i) =>
    [0, 1, 2].forEach((k) => {
      const p = big.at(side * 0.19 * u + (k - 1) * 0.12, 0, 0.12 + (k % 2) * 0.12);
      add(new DodecahedronGeometry(0.06), 0x5a5664, p[0], G - 0.02, p[2], { delay: 0.8 + i * 0.05 + k * 0.02, rotation: [k, k * 2, 0] });
    }),
  );

  // The dandy shoving at him, built upright and then leant into the push.
  const pushFacing = -1.45;
  const PX = 1.55;
  const PZ = 0.35;
  const dandy = figure(kit, {
    x: PX,
    z: PZ,
    y: G,
    height: 2.15,
    build: "slim",
    skin: 0xe8c0a0,
    hair: { style: "short", color: 0xc8a040 },
    face: { mouth: "open", brows: "worried", glasses: "shades", glassesColor: 0x14121c },
    top: { kind: "suit", color: 0x2f6f86, accent: 0xf0e8d8, tie: MAGENTA },
    bottom: { kind: "trousers", color: 0x2f6f86 },
    shoes: 0xf0e8d8,
    arms: [
      [-0.18, 1.55, 0.62],
      [0.18, 1.6, 0.62],
    ],
    legs: "stride",
    delay: 1.0,
  });
  const drops = [0, 1].map((k) => add(new SphereGeometry(0.035, 8, 6).scale(1, 1.4, 1), CYAN, PX - 0.26 + k * 0.52, G + 2.05 - k * 0.1, PZ + 0.05, { delay: 1.6 + k * 0.05, flat: true, noInk: true }));
  const lean = new Group();
  lean.position.set(PX, G, PZ);
  dandy.parts[0].parent?.add(lean);
  for (const part of [...dandy.parts, ...drops]) {
    part.position.sub(lean.position);
    lean.add(part);
  }
  lean.rotation.order = "YXZ";
  lean.rotation.set(0.38, pushFacing, 0);
  // Dust from his slipping shoes.
  const dust = [0, 1, 2].map((k) => ball(0.07 + k * 0.02, 0x5a5664, PX + 0.35 + k * 0.12, G, PZ - 0.15 + (k % 2) * 0.2, { delay: 1.7 + k * 0.04, noInk: true }));

  const rest = lean.position.clone();
  const neon = colorOf(rim);
  tick((t) => {
    // Heave, slip back, heave again; the bouncer never stirs.
    const heave = Math.abs(Math.sin(t * 2.6));
    lean.position.set(rest.x + heave * 0.05, rest.y, rest.z);
    lean.rotation.x = 0.38 + heave * 0.05;
    dust.forEach((puff, k) => (puff.children[0].scale.setScalar(0.6 + ((t * 1.5 + k * 0.33) % 1) * 0.8)));
    neon.setHex(Math.floor(t * 6) % 29 === 11 ? 0x5a1030 : MAGENTA);
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
