import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor } from "@/lib/diorama-props";

/**
 * Azzardo (P250): the Banco di Kest's gambler at a felt table in the gaming hall, between
 * columns, under a hanging lamp. Silver bob, ruby earrings, a long black coat embroidered with
 * gold dice, she smirks over her fan of cards: she is behind, three chips against her sweating
 * opponent's tower, and that is when she stops making mistakes; one by one his chips hop across
 * the table onto her stack. Her winnings wait in a sack on a porter's trolley: she could never
 * lift them herself.
 */
export function azzardo(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const FELT = 0x1f5a5a;
  const WOOD = 0x4a1e30;
  const GOLD = 0xb08d3c;
  const CHIPS = [MAGENTA, 0xe8e2d0, CYAN];
  const F = octagonBase(kit, 0x1f1a28);
  const G = floor(kit, F, 0.06, 0x2a1e30, 0x22182a, 0.6);

  // The hall: two columns and the lamp hanging over the table.
  column(kit, -1.45, -1.3, G, 0.08, 3.0, false, 0x3a4a6a);
  column(kit, 1.55, -0.95, G, 0.12, 3.0, false, 0x3a4a6a);
  const TX = -0.1;
  const TZ = -0.2;
  box(0.015, 0.75, 0.015, 0x14121c, TX, G + 2.75, TZ, { delay: 0.2, noInk: true });
  add(new ConeGeometry(0.3, 0.22, 18), 0x5a1e40, TX, G + 2.55, TZ, { delay: 0.22 });
  ball(0.08, YELLOW, TX, G + 2.42, TZ, { delay: 0.26, flat: true, noInk: true });

  // The table: a pedestal, an oval of felt in a wooden rim.
  cylinder(0.12, 0.25, 0.75, WOOD, TX, G, TZ, { delay: 0.3 }, 12);
  add(new CylinderGeometry(1, 1, 0.08, 32).scale(1, 1, 0.62), FELT, TX, G + 0.75, TZ, { delay: 0.34 });
  add(new TorusGeometry(1, 0.04, 6, 40).rotateX(Math.PI / 2).scale(1, 1, 0.62), WOOD, TX, G + 0.79, TZ, { delay: 0.36 });
  const TOP = G + 0.83;

  // The chips: his tower, her three, and the one hopping across.
  const stack = (x: number, z: number, count: number, delay: number) =>
    Array.from({ length: count }, (_, k) => cylinder(0.07, 0.07, 0.03, CHIPS[k % 3], x, TOP + k * 0.032, z, { delay: delay + k * 0.01, ink: 1.03 }, 14));
  const HIS: Point = [0.25, TOP, -0.5];
  const HERS: Point = [-0.72, TOP, 0.02];
  const his = stack(HIS[0], HIS[2], 12, 0.4);
  const hers = stack(HERS[0], HERS[2], 12, 0.45);
  const hop = cylinder(0.07, 0.07, 0.03, CYAN, ...HIS, { delay: 0.6, ink: 1.03 }, 14);
  // A dealt hand lying face down on his side.
  [-0.12, 0.05].forEach((dx, i) => box(0.13, 0.008, 0.19, 0x1e2240, 0.45 + dx, TOP, -0.25, { delay: 0.5 + i * 0.03, rotation: [0, 0.4 + i * 0.3, 0] }));

  // Her opponent, sweating behind his tower.
  const ox = 0.4;
  const oz = -1.2;
  const OH = -0.65;
  const chairAt = (lx: number, lz: number): [number, number] => [ox + lx * Math.cos(OH) + lz * Math.sin(OH), oz - lx * Math.sin(OH) + lz * Math.cos(OH)];
  box(0.6, 0.06, 0.55, WOOD, ...xzy(chairAt(0, -0.05), G + 0.41), { delay: 0.3, rotation: [0, OH, 0] });
  box(0.6, 0.85, 0.06, WOOD, ...xzy(chairAt(0, -0.33), G + 0.47), { delay: 0.32, rotation: [0, OH, 0] });
  [-0.25, 0.25].forEach((lx) => [-0.28, 0.18].forEach((lz) => box(0.05, 0.41, 0.05, 0x2a1420, ...xzy(chairAt(lx, lz), G), { delay: 0.3, noInk: true, rotation: [0, OH, 0] })));
  const rival = figure(kit, {
    x: ox,
    z: oz,
    y: G,
    facing: OH,
    height: 2.45,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x8a8a94 },
    face: { mouth: "open", brows: "worried", beard: "moustache", beardColor: 0x6a6a74 },
    top: { kind: "suit", color: 0x3a2a4a, accent: 0xd8d2c4, tie: 0x8a2a5a },
    bottom: { kind: "trousers", color: 0x2a2034 },
    arms: [[-0.25, 0.95, 0.55], [0.25, 0.95, 0.55]],
    legs: "sit",
    delay: 0.6,
  });
  const sweat = add(new SphereGeometry(0.03, 8, 6).scale(1, 1.4, 1), CYAN, ...rival.at(0.2, rival.head[1] - G + 0.05, 0.1), { delay: 1.2, flat: true, noInk: true });
  const sweatTop = sweat.position.y;

  // Azzardo, smirking over her fan of cards.
  const H = 0.6;
  const player = figure(kit, {
    x: -1.1,
    z: 0.75,
    y: G,
    facing: H,
    height: 2.35,
    build: "slim",
    skin: 0xe8c0a8,
    hair: { style: "bob", color: 0xd8dce6 },
    face: { mouth: "smirk", brows: "raised" },
    top: { kind: "coat", color: 0x1a1a2e, accent: 0x2a2a44 },
    bottom: { kind: "trousers", color: 0x1a1a2e },
    shoes: 0x14121c,
    arms: [[-0.17, 1.7, 0.32], "hip"],
    delay: 0.9,
  });
  const P = player.at;
  // Gold dice embroidered down the front of her coat.
  const torso = player.parts[8];
  decorate(
    torso,
    new BoxGeometry(0.045, 0.045, 0.01),
    GOLD,
    [0.12, 0.27, 0.42, 0.57].flatMap((y, k) => [[-0.12, y, 0.2, (k * Math.PI) / 8] as [number, number, number, number], [0.12, y + 0.07, 0.2, (k * Math.PI) / 7] as [number, number, number, number]]),
  );
  decorate(player.parts[7], new BoxGeometry(0.05, 0.05, 0.01), GOLD, [
    [-0.14, 0.2, 0.25, 0.4],
    [0.15, 0.4, 0.24, 0.2],
    [-0.1, 0.48, 0.24, 0.7],
  ]);
  [-1, 1].forEach((side) => ball(0.032, 0xc02040, ...P(side * 0.19, 1.84, 0.03), { delay: 1.5 }));
  // The fan of cards.
  const [cx, cy, cz] = player.hands[0];
  [-0.55, -0.25, 0.05, 0.35, 0.65].forEach((lean, k) => {
    const card = box(0.16, 0.23, 0.006, 0x1e2240, cx + Math.sin(H) * k * 0.006, cy - 0.05, cz + Math.cos(H) * k * 0.006, { delay: 1.5 + k * 0.03, rotation: [0, H, lean + 0.25] });
    decorate(card, new BoxGeometry(0.125, 0.195, 0.002), GOLD, [[0, 0.115, 0.004]]);
    decorate(card, new BoxGeometry(0.1, 0.17, 0.002), 0x2a2a5a, [[0, 0.115, 0.005]]);
  });

  // Her winnings, in a sack on a porter's trolley.
  const [wx, wz] = [1.25, 0.85];
  [-0.16, 0.16].forEach((dx) => limb(kit, [wx + dx, G + 0.08, wz], [wx + dx, G + 1.1, wz - 0.28], 0.025, 0.025, 0x4a4f5c, { delay: 0.5 }));
  box(0.42, 0.03, 0.26, 0x4a4f5c, wx, G + 0.03, wz + 0.12, { delay: 0.52 });
  [-1, 1].forEach((side) => add(new CylinderGeometry(0.1, 0.1, 0.06, 14).rotateZ(Math.PI / 2), 0x23222b, wx + side * 0.22, G, wz - 0.05, { delay: 0.54 }));
  const sack = add(new SphereGeometry(0.3, 14, 10).scale(1, 1.2, 0.85), 0xb8a888, wx, G + 0.06, wz + 0.02, { delay: 0.58 });
  decorate(sack, new CylinderGeometry(0.06, 0.06, 0.01, 12).rotateX(Math.PI / 2), MAGENTA, [
    [-0.1, 0.5, 0.25],
    [0.08, 0.3, 0.255],
  ]);
  add(new ConeGeometry(0.1, 0.14, 10), 0xb8a888, wx, G + 0.74, wz + 0.02, { delay: 0.6 });
  add(new TorusGeometry(0.09, 0.025, 6, 14).rotateX(Math.PI / 2), 0x8a6a3a, wx, G + 0.72, wz + 0.02, { delay: 0.62 });
  [0, 1, 2].forEach((k) => cylinder(0.07, 0.07, 0.02, CHIPS[k], wx - 0.35 + k * 0.12, G, wz + 0.35 - k * 0.05, { delay: 0.62 }, 12));

  const shown = (chips: Group[], count: number) => chips.forEach((chip, k) => (chip.visible = k < count));
  const PERIOD = 1.5;
  tick((t) => {
    const n = Math.floor(t / PERIOD) % 9;
    const f = (t / PERIOD) % 1;
    shown(his, 11 - n);
    shown(hers, 3 + n);
    const from: Point = [HIS[0], TOP + (11 - n) * 0.032, HIS[2]];
    const to: Point = [HERS[0], TOP + (3 + n) * 0.032, HERS[2]];
    const s = Math.min(1, f * 1.6);
    hop.position.set(from[0] + (to[0] - from[0]) * s, from[1] + (to[1] - from[1]) * s + Math.sin(s * Math.PI) * 0.45, from[2] + (to[2] - from[2]) * s);
    hop.rotation.z = s * Math.PI * 2;
    sweat.position.y = sweatTop - ((t * 0.6) % 1) * 0.3;
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}

/** A point on the floor plan lifted to a height, as x, y, z. */
function xzy(p: [number, number], y: number): Point {
  return [p[0], y, p[1]];
}
