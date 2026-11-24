import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor } from "@/lib/diorama-props";

/**
 * Escrow (P032): the curse dealer of the Sciolti in her cluttered shop, studying a crackling
 * cursed ring through her loupe. Behind her the shelves of oddments (a skull, a globe, a cracked
 * mirror), at her feet a crate of second-hand curses still smoking violet, and on the counter
 * one of them already gift-wrapped with a yellow bow to sell as new. The doll in the crate turns
 * its head; she, who can't fight, keeps an old sword in the umbrella stand, rattling on its own.
 */
export function escrow(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WOOD = 0x3a2630;
  const BRASS = 0xc8963c;
  const VIOLET = 0xa45cff;
  const TAG = 0xe8dcc0;
  const F = octagonBase(kit, 0x1d1626);
  const G = floor(kit, F, 0.06, 0x2e2232, 0x201826, 0.3);

  // The shelves of oddments, with blank price tags on the boards.
  box(3.1, 2.5, 0.08, 0x2a1c2a, 0, G, -1.56, { delay: 0.1, ink: 1.02 });
  [-1.5, 1.5].forEach((x) => box(0.1, 2.5, 0.42, WOOD, x, G, -1.36, { delay: 0.12 }));
  [0.55, 1.15, 1.75, 2.35].forEach((h, i) => {
    const board = box(2.95, 0.05, 0.4, WOOD, 0, G + h, -1.36, { delay: 0.14 + i * 0.03 });
    decorate(board, new BoxGeometry(0.08, 0.1, 0.005), TAG, [-1.0, -0.2, 0.7].map((x) => [x + i * 0.1, -0.06, 0.205] as Point));
  });
  const S1 = G + 0.6;
  const S2 = G + 1.2;
  const S3 = G + 1.8;
  const skull = ball(0.15, 0xd8d0c0, -1.05, S3, -1.35, { delay: 0.3 });
  decorate(skull, new BoxGeometry(0.06, 0.06, 0.02), INK, [[-0.05, 0.16, 0.135], [0.05, 0.16, 0.135]]);
  decorate(skull, new BoxGeometry(0.1, 0.03, 0.02), INK, [[0, 0.06, 0.13]]);
  cylinder(0.05, 0.1, 0.12, BRASS, -0.35, S3, -1.35, { delay: 0.32 });
  ball(0.17, 0x2f6f86, -0.35, S3 + 0.12, -1.35, { delay: 0.34 });
  [0x7a2a4a, 0x2a4a6a, 0x5a4a2a, 0x3a2a5a].forEach((color, k) => box(0.09, 0.34 - (k % 2) * 0.06, 0.26, color, 0.35 + k * 0.1, S3, -1.36, { delay: 0.36 + k * 0.02 }));
  [[-1.15, 0x2a6a6a], [-0.85, 0x6a2a5a]].forEach(([x, color], k) => {
    cylinder(0.08, 0.11, 0.26, color, x, S2, -1.35, { delay: 0.38 + k * 0.03 }, 12);
    cylinder(0.05, 0.08, 0.1, color, x, S2 + 0.26, -1.35, { delay: 0.4 + k * 0.03 }, 12);
  });
  const mirror = add(new CylinderGeometry(0.2, 0.2, 0.03, 20).rotateX(Math.PI / 2).scale(0.8, 1.2, 1), BRASS, 0.75, S2, -1.3, { delay: 0.42 });
  decorate(mirror, new CylinderGeometry(0.16, 0.16, 0.01, 20).rotateX(Math.PI / 2).scale(0.8, 1.2, 1), 0x9fd8e8, [[0, 0.24, 0.018]]);
  decorate(mirror, new BoxGeometry(0.01, 0.22, 0.01), INK, [[-0.02, 0.26, 0.025, 0.5], [0.04, 0.2, 0.025, -0.7]]);
  [CYAN, MAGENTA, VIOLET].forEach((glow, k) => cylinder(0.07, 0.07, 0.18, glow, 0.05 + k * 0.2, S2, -1.35, { delay: 0.44 + k * 0.02, flat: true }, 10));
  box(0.5, 0.3, 0.3, 0x5a3a2a, -0.9, S1, -1.36, { delay: 0.46 });
  [0x2a4a6a, 0x7a2a4a, 0x3a5a3a, 0x6a4a2a, 0x4a2a5a].forEach((color, k) => box(0.09, 0.32, 0.26, color, 0.3 + k * 0.1, S1, -1.36, { delay: 0.48 + k * 0.02 }));

  // The counter, with the till and a curse wrapped as a present, a violet wisp escaping it.
  const counter = box(0.95, 0.88, 0.6, 0x4a2f36, 1.35, G, -0.3, { delay: 0.2 });
  decorate(counter, new BoxGeometry(0.85, 0.02, 0.01), 0x2e1c22, [[0, 0.3, 0.301], [0, 0.6, 0.301]]);
  const C = G + 0.88;
  box(0.4, 0.24, 0.32, BRASS, 1.55, C, -0.4, { delay: 0.5 });
  box(0.36, 0.06, 0.2, 0xa07a30, 1.55, C + 0.24, -0.45, { delay: 0.52, rotation: [-0.5, 0, 0] });
  const gift = box(0.26, 0.22, 0.26, MAGENTA, 1.12, C, -0.2, { delay: 0.55, rotation: [0, 0.3, 0] });
  decorate(gift, new BoxGeometry(0.05, 0.224, 0.264), YELLOW, [[0, 0.11, 0]]);
  decorate(gift, new BoxGeometry(0.264, 0.224, 0.05), YELLOW, [[0, 0.11, 0]]);
  [-1, 1].forEach((side) => add(new TorusGeometry(0.05, 0.018, 6, 12), YELLOW, 1.12 + side * 0.05, C + 0.21, -0.2, { delay: 0.6, rotation: [0, 0.3, side * 0.6] }));
  motes(6, VIOLET, 0.03, [1.0, C + 0.25, -0.3], [1.25, C + 0.9, -0.1], 1.0);

  // A crate of used curses: a doll, a hand mirror, a candlestick, all still smoking.
  crate(kit, -1.3, 0.75, G, 0.3, 0.5, 0x5e4a3a, 0.35);
  const doll = ball(0.1, 0xf0d8c8, -1.42, G + 0.52, 0.7, { delay: 0.6 });
  decorate(doll, new BoxGeometry(0.03, 0.03, 0.01), INK, [[-0.035, 0.09, 0.096], [0.035, 0.09, 0.096]]);
  decorate(doll, new BoxGeometry(0.03, 0.01, 0.01), MAGENTA, [[0, 0.05, 0.096]]);
  add(new SphereGeometry(0.108, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe0c060, -1.42, G + 0.645, 0.69, { delay: 0.62 });
  cylinder(0.02, 0.02, 0.25, BRASS, -1.15, G + 0.45, 0.8, { delay: 0.64, rotation: [0.3, 0, -0.3] }, 6);
  add(new CylinderGeometry(0.09, 0.09, 0.02, 14).rotateX(Math.PI / 2), 0x9fd8e8, -1.22, G + 0.48, 0.62, { delay: 0.66, rotation: [0, 0, 0.4] });
  motes(8, VIOLET, 0.03, [-1.55, G + 0.5, 0.55], [-1.05, G + 1.5, 0.95], 1.1);

  // The umbrella stand, with a sword in it.
  cylinder(0.14, 0.12, 0.45, BRASS, -1.75, G, -0.6, { delay: 0.3 }, 12);
  cylinder(0.025, 0.02, 0.9, 0x2a5a6a, -1.7, G + 0.2, -0.58, { delay: 0.34, rotation: [0, 0, 0.12] }, 6);
  const sword = [
    box(0.05, 0.75, 0.015, 0xc8ccd4, -1.8, G + 0.2, -0.62, { delay: 0.36 }),
    box(0.26, 0.04, 0.05, BRASS, -1.8, G + 0.95, -0.62, { delay: 0.38 }),
    box(0.04, 0.2, 0.04, 0x3a1a2a, -1.8, G + 0.99, -0.62, { delay: 0.4 }),
  ];

  // Escrow: grey hair up, a purple robe with a high collar, a brass loupe, the ring held up.
  const dealer = figure(kit, {
    x: -0.1,
    z: 0.25,
    y: G,
    facing: 0.55,
    height: 2.3,
    build: "slim",
    skin: 0xd8b0a0,
    hair: { style: "bun", color: 0xb8b4cc },
    face: { mouth: "smirk", brows: "raised", glasses: "monocle", glassesColor: BRASS, marks: 0xb08878 },
    top: { kind: "robe", color: 0x3e2558, accent: 0x55337a },
    scarf: 0x2a1840,
    cape: 0x2a1840,
    arms: ["hip", [0.3, 1.98, 0.4]],
    delay: 0.8,
  });
  ball(0.05, MAGENTA, ...dealer.at(0, 1.55, 0.21), { delay: 1.3 });
  // Her silver hair over the crown (the figure's own cap sits too low and lets the scalp show).
  const RH = dealer.headRadius;
  ball(RH * 1.06, 0xb8b4cc, ...dealer.at(0, dealer.head[1] - G + RH * 0.14 - RH * 1.06, -RH * 0.17), { delay: 1.2 });
  const [, hand] = dealer.hands;
  const ringAt: Point = [hand[0], hand[1] + 0.1, hand[2] + 0.02];
  add(new TorusGeometry(0.06, 0.018, 8, 18), YELLOW, ...ringAt, { delay: 1.4, rotation: [0, 0.55, 0] });
  const sparks: Group[][] = [0, 1].map((set) =>
    [0, 1, 2, 3].flatMap((k) => {
      const angle = k * 1.6 + set * 0.8;
      const from: Point = [ringAt[0], ringAt[1] + 0.06, ringAt[2]];
      const to: Point = [ringAt[0] + Math.cos(angle) * 0.3, ringAt[1] + 0.06 + Math.sin(angle) * 0.3, ringAt[2] + 0.05];
      return zigzag(kit, jag(from, to, 4, 0.04, k + set * 5), 0.015, set ? 0xfff2a0 : YELLOW, 1.5);
    }),
  );

  tick((t) => {
    const flash = Math.floor(t * 9) % 2;
    sparks[0].forEach((part) => (part.visible = flash === 0));
    sparks[1].forEach((part) => (part.visible = flash === 1));
    const look = Math.sin(t * 0.6);
    doll.rotation.y = look > 0.75 ? 0.8 : look < -0.75 ? -0.8 : 0;
    const rattle = Math.sin(t * 0.9) > 0.8 ? Math.sin(t * 40) * 0.04 : 0;
    sword.forEach((part, i) => {
      part.rotation.z = rattle;
      part.position.x = -1.8 - [0, 0.75, 0.79][i] * Math.sin(rattle);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
