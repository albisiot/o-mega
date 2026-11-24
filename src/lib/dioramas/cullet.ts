import { BoxGeometry, Color, CylinderGeometry, Group, OctahedronGeometry, TetrahedronGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bin } from "@/lib/diorama-props";

/**
 * Cullet (P019): the Compagnia Lete's boxer in an underground ring, hood up, robe open, magenta
 * gloves up in guard and bouncing on his feet; his opponent is flat on the canvas with stars
 * circling his head. The price is his glass jaw: cracked and taped, and splinters of it glint on
 * the canvas at his feet.
 */
export function cullet(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x8a93a3;
  const ROBE = 0x1f5a6a;
  const SKIN = 0xd8a082;
  const RIVAL = 0xb07a58;
  const TAPE = 0xf0ece0;
  const F = octagonBase(kit, 0x1d1b28);

  // The ring: a canvas on a raised platform, corner posts with pads, ropes on three sides.
  const canvas = box(3.1, 0.2, 3.1, 0x2e3a52, 0, F, 0, { delay: 0.06, ink: 1.02 });
  decorate(canvas, new BoxGeometry(3.1, 0.06, 0.01), 0x1c2232, [[0, 0.1, 1.556]]);
  const G = F + 0.2;
  const P = 1.42;
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      cylinder(0.05, 0.06, 1.4, STEEL, sx * P, G, sz * P, { delay: 0.12 }, 8);
      box(0.16, 0.85, 0.16, sx > 0 ? MAGENTA : CYAN, sx * P, G + 0.45, sz * P, { delay: 0.16 });
    }),
  );
  [0.5, 0.85, 1.2].forEach((h, k) => {
    const color = k === 1 ? 0xd8d2c4 : MAGENTA;
    add(new CylinderGeometry(0.025, 0.025, 2 * P, 6).rotateZ(Math.PI / 2), color, 0, G + h, -P, { delay: 0.2 + k * 0.03, noInk: true });
    [-1, 1].forEach((sx) => add(new CylinderGeometry(0.025, 0.025, 2 * P, 6).rotateX(Math.PI / 2), color, sx * P, G + h, 0, { delay: 0.22 + k * 0.03, noInk: true }));
  });

  // His corner: a stool, a bucket, a towel over the rope.
  box(0.36, 0.05, 0.36, 0x3e3028, 1.1, G + 0.5, -1.05, { delay: 0.3 });
  cylinder(0.04, 0.04, 0.5, 0x23222b, 1.1, G, -1.05, { delay: 0.28 }, 8);
  bin(kit, 1.15, -0.6, G, 0.32, 0x2f6f86);
  box(0.06, 0.4, 0.26, TAPE, P, G + 0.9, -0.85, { delay: 0.36, noInk: true });

  // The opponent, out cold on his back along the ropes, stars going round his head.
  const RX = -0.85;
  const RZ = -0.25;
  add(new CylinderGeometry(0.21, 0.19, 0.7, 12).rotateX(Math.PI / 2), RIVAL, RX, G, RZ, { delay: 0.5 });
  add(new CylinderGeometry(0.2, 0.2, 0.24, 12).rotateX(Math.PI / 2), CYAN, RX, G, RZ + 0.45, { delay: 0.52 });
  [-0.11, 0.11].forEach((dx, i) => {
    add(new CylinderGeometry(0.08, 0.08, 0.7, 8).rotateX(Math.PI / 2), RIVAL, RX + dx, G, RZ + 0.9, { delay: 0.54 + i * 0.02 });
    box(0.14, 0.22, 0.1, INK, RX + dx, G, RZ + 1.28, { delay: 0.56 + i * 0.02 });
    limb(kit, [RX + dx * 2, G + 0.1, RZ - 0.25], [RX + dx * 3.6, G + 0.08, RZ - 0.45], 0.07, 0.07, RIVAL, { delay: 0.58 });
    ball(0.13, CYAN, RX + dx * 4, G, RZ - 0.5, { delay: 0.6 + i * 0.02 });
  });
  const head = ball(0.18, RIVAL, RX, G, RZ - 0.52, { delay: 0.6 });
  const xEye = new BoxGeometry(0.07, 0.012, 0.014);
  decorate(head, xEye.clone().rotateY(0.8), INK, [
    [-0.06, 0.36, 0.02],
    [0.06, 0.36, 0.02],
  ]);
  decorate(head, xEye.clone().rotateY(-0.8), INK, [
    [-0.06, 0.36, 0.02],
    [0.06, 0.36, 0.02],
  ]);
  const stars = [0, 1, 2, 3].map((k) => add(new OctahedronGeometry(0.05), YELLOW, RX, G + 0.5, RZ - 0.52, { delay: 1.6 + k * 0.05, flat: true }));

  // Cullet: hood up over his curls, robe hanging open, trunks, gloves up in guard.
  const boxer = figure(kit, {
    x: 0.55,
    z: 0.35,
    y: G,
    facing: 0.35,
    height: 2.5,
    build: "broad",
    skin: SKIN,
    hair: { style: "curly", color: 0x3a2418 },
    face: { mouth: "smirk", brows: "angry" },
    headwear: { kind: "hood", color: ROBE },
    top: { kind: "tank", color: SKIN, sleeves: "none" },
    bottom: { kind: "shorts", color: 0x1c2c3a },
    belt: 0x2e4a60,
    cape: ROBE,
    shoes: 0x1a1a22,
    gloves: MAGENTA,
    arms: [
      [-0.32, 1.7, 0.45],
      [0.3, 1.78, 0.5],
    ],
    legs: "wide",
    delay: 0.8,
  });
  // Big gloves with taped cuffs.
  const gloves: Group[] = [];
  boxer.hands.forEach((hand, i) => {
    gloves.push(ball(0.16, MAGENTA, hand[0], hand[1] - 0.16, hand[2] + 0.04, { delay: 1.4 + i * 0.03 }));
    gloves.push(limb(kit, [hand[0], hand[1] - 0.16, hand[2] - 0.08], [hand[0] + (i ? 0.08 : -0.08), hand[1] - 0.3, hand[2] - 0.2], 0.1, 0.09, TAPE, { delay: 1.42 + i * 0.03 }));
  });
  // The glass jaw: a strip of tape on it and bright cracks spreading over the chin.
  const RH = boxer.headRadius;
  const cy = RH * 1.06;
  decorate(boxer.headPart, new BoxGeometry(0.13, 0.07, 0.03), TAPE, [[0.1, cy - 0.13, RH * 0.72, 0.5]]);
  decorate(boxer.headPart, new BoxGeometry(0.008, 0.07, 0.01), 0xdff8ff, [
    [-0.05, cy - 0.15, RH * 0.8, 0.5],
    [-0.09, cy - 0.11, RH * 0.76, -0.4],
    [-0.02, cy - 0.19, RH * 0.72, 0.2],
    [0.03, cy - 0.17, RH * 0.8, -0.6],
  ]);

  // Splinters of his jaw on the canvas, glinting.
  const shards: Point[] = [
    [0.15, 0.95, 0.3],
    [0.45, 1.15, 1.1],
    [0.85, 1.05, 2.2],
    [0.05, 1.3, 0.7],
    [1.0, 0.85, 1.6],
  ];
  const glints = shards.map(([x, z, turn], i) => add(new TetrahedronGeometry(0.06 + (i % 2) * 0.02), 0xbfefff, x, G, z, { delay: 1.7 + i * 0.04, flat: true, rotation: [turn, turn * 2, 0] }));

  const bouncing = [...boxer.parts, ...gloves];
  const rest = bouncing.map((part) => part.position.y);
  const dim = new Color(0x8fd8f0);
  const bright = new Color(0xffffff);
  tick((t) => {
    // He bounces on his toes; the stars go round; the splinters catch the light in turn.
    const bounce = Math.abs(Math.sin(t * 5)) * 0.04;
    bouncing.forEach((part, i) => (part.position.y = rest[i] + bounce));
    stars.forEach((star, k) => {
      const a = t * 2.2 + (k * Math.PI) / 2;
      star.position.set(RX + Math.cos(a) * 0.26, G + 0.48 + Math.sin(a * 2) * 0.03, RZ - 0.52 + Math.sin(a) * 0.26);
      star.rotation.y = t * 3;
    });
    glints.forEach((glint, i) => colorOf(glint).copy(Math.floor(t * 2 + i * 0.7) % 3 === 0 ? bright : dim));
  });

  return { width: 4.9, height: 4.2, lookY: 1.45 };
}
