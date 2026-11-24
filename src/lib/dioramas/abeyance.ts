import { BoxGeometry, CylinderGeometry, type Mesh } from "three";
import { CYAN, MAGENTA, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, table } from "@/lib/diorama-props";

/**
 * Abeyance (P082): the Banco's robot accountant in the marble hall of the bank, a tower of
 * papers in one arm and an abacus in the other, his screen eyes sweeping left and right for
 * your payment while the stamp on his desk rejects another receipt. The envelope he can't find
 * sticks out of his own breast pocket.
 */
export function abeyance(kit: Kit): Framing {
  const { box, cylinder, ball, decorate, tick } = kit;
  const MARBLE = 0x4a5a7a;
  const SUIT = 0x4a5266;
  const PAPER = 0xe8e2d0;
  const SCREEN = 0x5ff2c0;
  const F = octagonBase(kit, 0x1c1b26);
  const G = floor(kit, F, 0.06, 0x262836, 0x1a1a24, 0);

  // A chequered marble floor.
  const tiles = box(0.001, 0.001, 0.001, 0x343a52, 0, G, 0, { delay: 0.08, flat: true, noInk: true });
  const squares: Point[] = [];
  for (let i = -4; i <= 4; i++)
    for (let j = -4; j <= 4; j++) if (!((i + j) & 1) && Math.abs(i) + Math.abs(j) <= 5.8) squares.push([i * 0.45, 0.003, j * 0.45]);
  decorate(tiles, new BoxGeometry(0.44, 0.004, 0.44), 0x343a52, squares);

  // The hall: a back wall of ledgers on shelves between two marble columns.
  const wall = box(3.0, 3.1, 0.2, 0x1f2236, 0, G, -1.6, { delay: 0.1, ink: 1.02 });
  const rows = [0.9, 1.5, 2.1, 2.7];
  decorate(wall, new BoxGeometry(1.0, 0.04, 0.06), 0x3a3048, rows.flatMap((y) => [[-0.95, y, 0.12], [0.95, y, 0.12]] as Point[]));
  [0x2f6f86, 0x7a2f55, 0xcfc6b0].forEach((color, c) =>
    decorate(
      wall,
      new BoxGeometry(0.07, 0.34, 0.05),
      color,
      rows.flatMap((y, r) => Array.from({ length: 9 }, (_, k) => k).filter((k) => (k + r + c) % 3 === 0).flatMap((k) => [[-1.38 + k * 0.1, y + 0.19, 0.12], [0.52 + k * 0.1, y + 0.19, 0.12]] as Point[])),
    ),
  );
  column(kit, -1.2, -1.15, G, 0.15, 3.0, false, MARBLE);
  column(kit, 1.2, -1.2, G, 0.18, 3.0, false, MARBLE);

  // The teller's desk: a banker's lamp, the receipts, and the stamp that keeps saying no.
  table(kit, 1.15, -0.3, G, 0.3, false, 0x3a2f48);
  const top = G + 0.8;
  const receipt = box(0.3, 0.012, 0.22, PAPER, 1.1, top, -0.18, { delay: 0.5, rotation: [0, 0.2, 0] });
  decorate(receipt, new BoxGeometry(0.12, 0.004, 0.08), MAGENTA, [[0.02, 0.013, 0.02]]);
  box(0.18, 0.04, 0.12, 0x2a2a34, 0.8, top, -0.45, { delay: 0.55 });
  cylinder(0.025, 0.05, 0.36, 0x2a2a34, 1.45, top, -0.5, { delay: 0.55 }, 8);
  kit.add(new CylinderGeometry(0.08, 0.16, 0.12, 12), 0x1f7f9c, 1.45, top + 0.3, -0.5, { delay: 0.6 });
  ball(0.06, YELLOW, 1.45, top + 0.22, -0.5, { delay: 0.62, flat: true, noInk: true });
  const stamp = [
    box(0.14, 0.05, 0.1, 0x2a2430, 1.12, top + 0.2, -0.18, { delay: 0.6 }),
    cylinder(0.025, 0.025, 0.14, 0x5e4a3a, 1.12, top + 0.25, -0.18, { delay: 0.62 }, 8),
    ball(0.045, 0x5e4a3a, 1.12, top + 0.37, -0.18, { delay: 0.64 }),
  ];
  const stampRest = stamp.map((part) => part.position.y);

  // The queue: brass posts and a velvet rope.
  const posts: [number, number][] = [
    [-1.65, 0.45],
    [-1.2, 1.15],
    [-0.45, 1.6],
  ];
  posts.forEach(([x, z], i) => {
    cylinder(0.03, 0.05, 0.75, 0x3a3f50, x, G, z, { delay: 0.3 + i * 0.04 }, 8);
    ball(0.05, 0xc8a040, x, G + 0.73, z, { delay: 0.34 + i * 0.04 });
  });
  posts.slice(1).forEach(([x, z], i) => {
    const [px, pz] = posts[i];
    cable(kit, [[px, G + 0.72, pz], [(px + x) / 2, G + 0.5, (pz + z) / 2], [x, G + 0.72, z]], 0.025, MAGENTA, 0.45 + i * 0.05);
  });

  // Abeyance: grey suit, a robot's neck and hands, an old monitor for a head.
  const FACE = 0.3;
  const clerk = figure(kit, {
    x: -0.15,
    z: 0.3,
    y: G,
    facing: FACE,
    height: 2.4,
    skin: 0x7a8292,
    hair: { style: "bald", color: 0x7a8292 },
    face: { blank: true },
    top: { kind: "suit", color: SUIT, accent: 0xe0dcd0 },
    bottom: { kind: "trousers", color: 0x3c4356 },
    shoes: 0x16161e,
    gloves: 0x9aa2b2,
    arms: [[-0.2, 1.22, 0.46], [0.46, 1.22, 0.38]],
    delay: 0.7,
  });
  const at = clerk.at;
  const turn: [number, number, number] = [0, FACE, 0];
  box(0.07, 0.42, 0.02, 0x1a1c28, ...at(0, 1.3, 0.27), { delay: 1.05, rotation: turn });
  // The envelope, right under his nose.
  box(0.17, 0.08, 0.03, 0x3a4052, ...at(0.16, 1.5, 0.262), { delay: 1.1, rotation: turn });
  const envelope = box(0.2, 0.13, 0.02, YELLOW, ...at(0.16, 1.53, 0.268), { delay: 1.15, rotation: [0, FACE, 0.22] });
  decorate(envelope, new BoxGeometry(0.11, 0.012, 0.005), 0x8a6a10, [
    [-0.045, 0.09, 0.011, -0.5],
    [0.045, 0.09, 0.011, 0.5],
  ]);

  // The papers: bundles stacked up to his chin.
  for (let k = 0; k < 5; k++) {
    const bundle = box(0.38, 0.1, 0.3, PAPER, ...at(-0.17 + ((k * 7) % 3) * 0.02 - 0.02, 1.02 + k * 0.1, 0.5), { delay: 1.2 + k * 0.04, rotation: [0, FACE + (k % 2 ? 0.08 : -0.06), 0] });
    decorate(bundle, new BoxGeometry(0.385, 0.006, 0.305), 0xa8a294, [
      [0, 0.035, 0],
      [0, 0.068, 0],
    ]);
  }

  // The abacus, beads sliding as he counts again.
  const [, abacusHand] = clerk.hands;
  const abacus = box(0.44, 0.3, 0.03, 0x2a2430, abacusHand[0], abacusHand[1] - 0.15, abacusHand[2] + 0.05, { delay: 1.3, rotation: [0, FACE - 0.25, 0.12] });
  decorate(abacus, new BoxGeometry(0.4, 0.008, 0.01), 0x8a7a5a, [0.06, 0.12, 0.18, 0.24].map((y) => [0, y, 0.02] as Point));
  decorate(abacus, new BoxGeometry(0.035, 0.035, 0.03), CYAN, [0.06, 0.12, 0.18, 0.24].flatMap((y) => [0.09, 0.13, 0.17].map((x) => [x, y, 0.025] as Point)));
  const first = abacus.children.length;
  decorate(abacus, new BoxGeometry(0.035, 0.035, 0.03), MAGENTA, [0.06, 0.12, 0.18, 0.24].map((y) => [-0.14, y, 0.025] as Point));
  const beads = abacus.children.slice(first) as Mesh[];

  // The monitor round his head: a green face on a dark screen, eyes that move.
  const headY = clerk.head[1] - G;
  const crt = box(0.64, 0.5, 0.46, 0x8a93a3, ...at(0, headY - 0.22, 0.01), { delay: 1.4, rotation: turn });
  box(0.44, 0.36, 0.24, 0x6e7686, ...at(0, headY - 0.16, -0.32), { delay: 1.42, rotation: turn });
  decorate(crt, new BoxGeometry(0.5, 0.36, 0.01), 0x0e2c26, [[0, 0.26, 0.231]]);
  decorate(crt, new BoxGeometry(0.48, 0.006, 0.005), 0x1a4a3c, [0.1, 0.16, 0.22, 0.28, 0.34, 0.4].map((y) => [0, y, 0.237] as Point));
  decorate(crt, new BoxGeometry(0.15, 0.02, 0.005), SCREEN, [[0, 0.17, 0.238]]);
  decorate(crt, new BoxGeometry(0.035, 0.035, 0.01), 0x2a2a34, [
    [0.25, 0.035, 0.231],
    [0.19, 0.035, 0.231],
  ]);
  const eyeAt = (dx: number): Point => at(dx, headY + 0.065, 0.257);
  const eyes = [-0.1, 0.1].map((dx) => box(0.055, 0.055, 0.012, SCREEN, ...eyeAt(dx), { delay: 1.5, rotation: turn, flat: true, noInk: true }));

  tick((t) => {
    // The eyes sweep the room, the stamp comes down, a bead slides along each rod.
    const look = Math.sin(t * 1.3) * 0.07;
    eyes.forEach((eye, k) => eye.position.set(...eyeAt((k ? 0.1 : -0.1) + look)));
    const u = (t % 1.8) / 1.8;
    const press = u > 0.42 && u < 0.52 ? 1 - Math.abs(u - 0.47) / 0.05 : 0;
    stamp.forEach((part, i) => (part.position.y = stampRest[i] - press * 0.19));
    beads.forEach((bead, k) => (bead.position.x = -0.14 + Math.max(0, Math.sin(t * 1.6 - k * 0.8)) * 0.17));
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
