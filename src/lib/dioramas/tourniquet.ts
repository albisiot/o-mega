import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type MeshBasicMaterial } from "three";
import { INK, MAGENTA, ORANGE, crawl, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Tourniquet (P169): in the back room of a bar the back-street doctor, arms and throat wrapped
 * in bandages and a corset of red leather straps, lays her hand on a docker's wounded arm: the
 * pain crawls out of him in magenta sparks and up her own arm, where her bandages stain red.
 * Behind her, the shelf of bottles; on the green-clothed table, her tray of instruments.
 */
export function tourniquet(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BANDAGE = 0xe8e2d0;
  const STRAP = 0x7a2a2a;
  const BRASS = 0xb08d3c;
  const STAIN = 0xb02848;
  const F = octagonBase(kit, 0x201c22);
  const G = floor(kit, F, 0.06, 0x3a2e2a, 0x2a201c, 0.4);

  // Brick back wall, the shelf of bottles, the lamp over them.
  const wall = box(3.2, 2.8, 0.25, 0x4a2e2a, -0.1, G, -1.5, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(3.2, 0.012, 0.01), 0x2e1c1a, Array.from({ length: 13 }, (_, k) => [0, 0.2 + k * 0.2, 0.126] as Point));
  const shelf = box(1.3, 2.2, 0.12, 0x3e3028, -1.05, G, -1.3, { delay: 0.2 });
  decorate(shelf, new BoxGeometry(1.25, 0.04, 0.3), 0x5e4a3a, [0.6, 1.2, 1.8].map((y) => [0, y, 0.2] as Point));
  [0x2f8f4f, 0x8a5a2a, 0x1f7f9c].forEach((color, c) =>
    decorate(
      shelf,
      new CylinderGeometry(0.055, 0.06, 0.24, 8),
      color,
      [0.62, 1.22, 1.82].flatMap((y, r) => [-0.45, -0.15, 0.15, 0.45].filter((_, k) => (k + r + c) % 3 === 0).map((x) => [x + c * 0.07, y + 0.14, 0.2] as Point)),
    ),
  );
  cylinder(0.015, 0.015, 0.6, INK, 0.35, G + 2.6, -0.15, { delay: 0.3, noInk: true }, 6);
  add(new ConeGeometry(0.3, 0.22, 14, 1, true), 0x2e3440, 0.35, G + 2.42, -0.15, { delay: 0.32 });
  const bulb = ball(0.09, ORANGE, 0.35, G + 2.3, -0.15, { delay: 0.35, flat: true });

  // The table under its green cloth: a tray, a basin, a roll of bandage.
  const desk = table(kit, 1.35, -0.75, G, 0.3, false, 0x2f5a4a);
  decorate(desk, new BoxGeometry(0.4, 0.02, 0.26), 0x9aa4b0, [[-0.15, 0.06, 0.05]]);
  decorate(desk, new BoxGeometry(0.2, 0.012, 0.025), 0xe8eef2, [
    [-0.15, 0.08, 0.0],
    [-0.15, 0.08, 0.08],
  ]);
  cylinder(0.15, 0.11, 0.12, 0x9aa4b0, 1.6, G + 0.8, -0.85, { delay: 0.5 }, 14);
  add(new CylinderGeometry(0.07, 0.07, 0.14, 12).rotateZ(Math.PI / 2), BANDAGE, 1.2, G + 0.8, -0.55, { delay: 0.52 });

  // The patient on a stool, his wounded arm held out to her.
  cylinder(0.24, 0.24, 0.06, 0x5e4a3a, 0.88, G + 0.55, 0.45, { delay: 0.4 }, 14);
  [0, 2.1, 4.2].forEach((a) => limb(kit, [0.88 + Math.sin(a) * 0.17, G, 0.45 + Math.cos(a) * 0.17], [0.88, G + 0.55, 0.45], 0.025, 0.025, 0x3e3028, { delay: 0.38, noInk: true }));
  const patient = figure(kit, {
    x: 0.88,
    z: 0.45,
    y: G,
    facing: -1.2,
    height: 2.3,
    build: "heavy",
    skin: 0xc48a66,
    hair: { style: "short", color: 0x2a1e1c },
    face: { mouth: "smile", brows: "worried", beard: "stubble" },
    headwear: { kind: "cap", color: 0x23404b },
    top: { kind: "shirt", color: 0x9aa0ab, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2b2f3a },
    shoes: 0x2a2622,
    arms: ["forward", "down"],
    legs: "sit",
    delay: 0.7,
  });
  const [woundHand] = patient.hands;
  const woundElbow = patient.elbows[0];
  const wound: Point = [(woundHand[0] + woundElbow[0]) / 2, (woundHand[1] + woundElbow[1]) / 2, (woundHand[2] + woundElbow[2]) / 2];
  limb(kit, woundElbow, woundHand, 0.115, 0.105, BANDAGE, { delay: 1.2 });
  ball(0.05, MAGENTA, wound[0], wound[1] + 0.06, wound[2], { delay: 1.3, flat: true });

  // Tourniquet, a hand on his arm.
  const theta = 0.3;
  const healer = figure(kit, {
    x: -0.25,
    z: 0.25,
    y: G,
    facing: theta,
    height: 2.4,
    skin: 0xe8c0a0,
    hair: { style: "long", color: 0x8a3a22 },
    face: { mouth: "neutral", brows: "calm", marks: 0xb06040 },
    top: { kind: "jacket", color: 0x2f6a58, accent: BANDAGE, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2a5a4a },
    shoes: 0x2a2622,
    scarf: BANDAGE,
    arms: ["down", [0.47, 1.25, 0.28]],
    delay: 0.9,
  });
  const { at } = healer;
  // Bandaged arms, stained red where the pain goes in.
  const stains: MeshBasicMaterial[] = [];
  [-1, 1].forEach((side, i) => {
    const shoulder = at(side * 0.4, 1.72, 0);
    const elbow = healer.elbows[i];
    const hand = healer.hands[i];
    const below: Point = [shoulder[0] + (elbow[0] - shoulder[0]) * 0.45, shoulder[1] + (elbow[1] - shoulder[1]) * 0.45, shoulder[2] + (elbow[2] - shoulder[2]) * 0.45];
    const wraps: [Point, Point, number][] = [
      [below, elbow, 0.12],
      [elbow, hand, 0.11],
    ];
    wraps.forEach(([from, to, r], k) => {
      const wrap = limb(kit, from, to, r, r * 0.92, BANDAGE, { delay: 1.3 + k * 0.03 });
      const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
      decorate(wrap, new TorusGeometry(r, 0.007, 4, 14).rotateX(Math.PI / 2), 0xb8b0a0, [0.25, 0.5, 0.75].map((u) => [0, u * length, 0] as Point));
      if (side > 0) stains.push(decorate(wrap, new SphereGeometry(0.045, 8, 6), STAIN, [[0.05, length * (k ? 0.6 : 0.4), 0.09]]));
    });
  });
  // The corset of straps and buckles.
  [1.06, 1.15, 1.24, 1.33, 1.42].forEach((y, k) => {
    const r = 0.31 + k * 0.008;
    const strap = add(new TorusGeometry(r, 0.035, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.74), STRAP, ...at(0, y, 0), { delay: 1.35 + k * 0.02, rotation: [0, theta, 0] });
    decorate(strap, new BoxGeometry(0.06, 0.05, 0.02), BRASS, [[0.05, 0.035, r * 0.74 + 0.03]]);
  });

  // The pain, crawling out of him and up her arm.
  const path: Point[] = [wound, healer.hands[1], healer.elbows[1], at(0.4, 1.66, 0)];
  const sparks = zigzag(kit, crawl(path, 4, 0.15, 0.4), 0.03, MAGENTA, 1.6);

  tick((t) => {
    // The sparks run up her arm in a wave; the stains flush with each wave; the bulb buzzes.
    const head = (t * 6) % (sparks.length + 4);
    sparks.forEach((spark, k) => (spark.visible = t === 0 || (k <= head && k > head - 6)));
    const flush = head > sparks.length - 2 ? 1 : 0;
    stains.forEach((material) => material.color.setHex(flush ? MAGENTA : STAIN));
    bulb.visible = Math.floor(t * 7) % 19 !== 9;
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
