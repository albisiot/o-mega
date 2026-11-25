import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, TorusGeometry, type Object3D } from "three";
import { YELLOW, archMouth, archedWall, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column } from "@/lib/diorama-props";

/**
 * Ballast (P205): the ferryman of the sunken dock under the metro, a tall thin stroke in a black
 * oilskin and a stiff pointed hood, standing on his flat barge among drowned columns and arches.
 * He holds the long pole in both hands, the oil lantern tied to it swinging. Piled at the stern,
 * every toll he was ever paid (a suitcase, a chair, a clock, a teddy bear, a pair of shoes); and
 * the outboard motor someone left there, tilted out of the water, never once started.
 */
export function ballast(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WATER = 0x0f2e2c;
  const FOAM = 0x8fd8c8;
  const STONE = 0x3e5650;
  const HULL = 0x3e3028;
  const PLANK = 0x5e4a3a;
  const BRASS = 0xb08d3c;
  const OILSKIN = 0x1a2624;
  const F = octagonBase(kit, WATER);

  /** A ring spreading on the still water, again and again. */
  const ripple = (x: number, z: number, radius: number, period: number, phase: number, delay: number) => {
    const ring = add(new TorusGeometry(radius, 0.014, 6, 36).rotateX(Math.PI / 2), FOAM, x, F + 0.002, z, { delay, flat: true, noInk: true });
    tick((t) => {
      const u = ((t + phase) / period) % 1;
      ring.children[0].scale.set(0.5 + u, 1, 0.5 + u);
      ring.visible = u < 0.85;
    });
  };

  // The drowned hall: an arch on black water between two columns, a broken one in front.
  add(archedWall(2.8, 3.2, 0.3, { x: 0, half: 0.62, spring: 1.55 }), STONE, 0, F, -1.6, { delay: 0.1, ink: 1.02 });
  add(archMouth(0.62, 1.55), 0x071a18, 0, F, -1.8, { delay: 0.14, flat: true, noInk: true });
  motes(8, 0x6fd8b8, 0.025, [-0.5, F + 0.1, -1.7], [0.5, F + 1.6, -1.6], 0.6);
  [-1.05, 1.05].forEach((x, i) => column(kit, x, -1.22, F, 0.18 + i * 0.05, 3.0, false, 0x4e6862));
  column(kit, 1.78, 0.42, F, 0.3, 1.9, true, 0x4e6862);
  column(kit, -1.9, 0.05, F, 0.32, 1.1, true, 0x4e6862);
  [
    [-1.05, -1.22],
    [1.05, -1.22],
    [1.78, 0.42],
  ].forEach(([x, z], k) => ripple(x, z, 0.32, 3.6, k * 1.2, 0.5));
  [
    [-0.9, 1.3, 0.5],
    [0.6, 1.55, -0.3],
    [1.2, -0.4, 0.2],
  ].forEach(([x, z, turn], k) => box(0.5, 0.004, 0.03, 0x2a5a52, x, F, z, { delay: 0.2 + k * 0.03, flat: true, noInk: true, rotation: [0, turn, 0] }));

  // The barge, side on to us.
  const BX = 0.05;
  const BZ = 0.3;
  const P = 0.35;
  const c = Math.cos(P);
  const s = Math.sin(P);
  const bt = (lx: number, ly: number, lz: number): Point => [BX + lx * c + lz * s, F + 0.18 + ly, BZ - lx * s + lz * c];
  const r: Point = [0, P, 0];
  const afloat: Object3D[] = [];
  const hull = box(2.7, 0.22, 0.95, HULL, ...bt(0, -0.22, 0), { delay: 0.4, rotation: r });
  decorate(
    hull,
    new BoxGeometry(2.6, 0.006, 0.02),
    0x2a201a,
    [-0.3, -0.1, 0.1, 0.3].map((z) => [0, 0.222, z] as Point),
  );
  afloat.push(hull);
  [-0.46, 0.46].forEach((z, k) => afloat.push(box(2.74, 0.09, 0.07, PLANK, ...bt(0, -0.02, z), { delay: 0.45 + k * 0.02, rotation: r })));
  [-1.35, 1.35].forEach((x, k) => afloat.push(box(0.07, 0.09, 0.95, PLANK, ...bt(x, -0.02, 0), { delay: 0.48 + k * 0.02, rotation: r })));
  const bow = bt(1.45, 0, 0);
  ripple(bow[0], bow[2], 0.3, 4, 0, 0.6);

  // The tolls, piled at the stern.
  const suitcase = box(0.5, 0.16, 0.34, 0x8a2a4a, ...bt(-1.0, 0, 0.12), { delay: 0.6, rotation: [0, P + 0.2, 0] });
  decorate(suitcase, new BoxGeometry(0.05, 0.04, 0.02), BRASS, [
    [-0.12, 0.1, 0.17],
    [0.12, 0.1, 0.17],
  ]);
  const clock = box(0.2, 0.26, 0.12, 0x4a3426, ...bt(-1.02, 0.16, 0.12), { delay: 0.64, rotation: [0, P + 0.1, 0] });
  decorate(clock, new CylinderGeometry(0.075, 0.075, 0.02, 16).rotateX(Math.PI / 2), 0xe8e2d0, [[0, 0.15, 0.065]]);
  decorate(clock, new BoxGeometry(0.01, 0.06, 0.01), 0x14121c, [[0, 0.17, 0.078]]);
  afloat.push(suitcase, clock);
  // A painted kitchen chair, a teddy bear on its seat, an umbrella against it.
  const chairAt = bt(-0.78, 0, -0.22);
  const chair = box(0.32, 0.04, 0.3, 0x2f6f86, chairAt[0], chairAt[1] + 0.32, chairAt[2], { delay: 0.66, rotation: [0, P - 0.3, 0] });
  afloat.push(chair);
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      const leg = bt(-0.78 + sx * 0.13, 0, -0.22 + sz * 0.12);
      afloat.push(box(0.035, 0.32, 0.035, 0x235a6e, ...leg, { delay: 0.66, noInk: true }));
    }),
  );
  const back = bt(-0.78, 0.36, -0.36);
  afloat.push(box(0.32, 0.4, 0.04, 0x2f6f86, ...back, { delay: 0.68, rotation: [0, P - 0.3, 0] }));
  const bear = bt(-0.78, 0.36, -0.2);
  afloat.push(
    ball(0.11, 0x9a6a40, bear[0], bear[1], bear[2], { delay: 0.72 }),
    ball(0.08, 0x9a6a40, bear[0], bear[1] + 0.2, bear[2] + 0.02, { delay: 0.74 }),
    ...[-1, 1].map((side) => ball(0.035, 0x7a5030, bear[0] + side * 0.06 * c, bear[1] + 0.33, bear[2] - side * 0.06 * s, { delay: 0.76 })),
  );
  const brolly = bt(-0.55, 0, -0.32);
  afloat.push(add(new ConeGeometry(0.06, 0.6, 8), 0x3a2a5a, brolly[0], brolly[1], brolly[2], { delay: 0.7, rotation: [0, 0, 0.35] }));
  [-0.06, 0.06].forEach((dz, k) => afloat.push(box(0.09, 0.07, 0.18, 0x7a2a22, ...bt(-0.5 + k * 0.03, 0, 0.3 + dz * 1.4), { delay: 0.74 + k * 0.02, rotation: [0, P + 0.3 * k, 0] })));
  // The outboard motor, tilted up out of the water for good.
  const motor = box(0.24, 0.28, 0.22, 0x4a4f5c, ...bt(-1.5, 0.0, 0), { delay: 0.78, rotation: [0, P, 0.5] });
  decorate(motor, new BoxGeometry(0.1, 0.08, 0.23), 0x8a4a2a, [[0.04, 0.12, 0]]);
  decorate(motor, new BoxGeometry(0.26, 0.06, 0.24), 0x353a46, [[0, 0.27, 0]]);
  const shaftFrom = bt(-1.58, 0.06, 0);
  const shaftTo = bt(-2.0, 0.0, 0);
  const shaft = limb(kit, shaftFrom, shaftTo, 0.035, 0.035, 0x3a3e48, { delay: 0.8 });
  const prop = add(new BoxGeometry(0.03, 0.26, 0.07), 0x6a6e78, shaftTo[0], shaftTo[1] - 0.13, shaftTo[2], { delay: 0.82, rotation: [0, P, 0.4] });
  decorate(prop, new BoxGeometry(0.03, 0.07, 0.26), 0x6a6e78, [[0, 0.13, 0]]);
  afloat.push(motor, shaft, prop);

  // Ballast: very tall and thin, robe to the deck, the hood stiff and pointed.
  const stand = bt(0.2, 0, 0);
  const ferryman = figure(kit, {
    x: stand[0],
    z: stand[2],
    y: F + 0.18,
    facing: P - 0.05,
    height: 2.85,
    build: "slim",
    skin: 0xb08870,
    face: { mouth: "frown", brows: "calm", marks: 0x8a6450 },
    headwear: { kind: "hood", color: OILSKIN },
    top: { kind: "robe", color: OILSKIN, accent: 0x24322e },
    shoes: 0x14161a,
    arms: [
      [-0.36, 2.3, 0.36],
      [0.12, 1.36, 0.42],
    ],
    delay: 0.9,
  });
  afloat.push(...ferryman.parts);
  const fat = ferryman.at;
  afloat.push(add(new ConeGeometry(0.14, 0.42, 10), OILSKIN, ...fat(0, 2.62, -0.07), { delay: 1.4, rotation: [-0.12, P, 0] }));
  // The pole, from above his head down into the water past the gunwale.
  const [high, low] = ferryman.hands;
  const dir: Point = [low[0] - high[0], low[1] - high[1], low[2] - high[2]];
  const top: Point = [high[0] - dir[0] * 0.9, high[1] - dir[1] * 0.9, high[2] - dir[2] * 0.9];
  const k = (low[1] - F) / -dir[1];
  const bottom: Point = [low[0] + dir[0] * k, F, low[2] + dir[2] * k];
  afloat.push(limb(kit, bottom, top, 0.032, 0.028, 0x6a5040, { delay: 1.3 }));
  ripple(bottom[0], bottom[2], 0.18, 2.4, 0.4, 1.3);

  // The oil lantern, tied to the pole between his hands, swinging.
  const tie: Point = [high[0] + dir[0] * 0.38, high[1] + dir[1] * 0.38, high[2] + dir[2] * 0.38];
  const hang = [
    box(0.012, 0.14, 0.012, 0x14121c, tie[0], tie[1] - 0.14, tie[2], { delay: 1.45, noInk: true }),
    add(new ConeGeometry(0.1, 0.08, 6), BRASS, tie[0], tie[1] - 0.22, tie[2], { delay: 1.46 }),
  ];
  const light = box(0.14, 0.2, 0.14, YELLOW, tie[0], tie[1] - 0.42, tie[2], { delay: 1.48, flat: true, rotation: r });
  decorate(light, new BoxGeometry(0.016, 0.2, 0.15), BRASS, [
    [-0.07, 0.1, 0],
    [0.07, 0.1, 0],
  ]);
  hang.push(light, cylinder(0.09, 0.08, 0.04, BRASS, tie[0], tie[1] - 0.46, tie[2], { delay: 1.5 }, 8));
  const swing = new Group();
  swing.position.set(...tie);
  swing.rotation.order = "YXZ";
  swing.rotation.y = P;
  light.parent?.add(swing);
  for (const part of hang) {
    part.position.sub(swing.position).applyAxisAngle(swing.up, -P);
    part.rotation.y -= P;
    swing.add(part);
  }
  afloat.push(swing);

  const rest = afloat.map((part) => part.position.y);
  const warm = new Color(YELLOW);
  const hot = new Color(0xfff2b0);
  tick((t) => {
    // The barge breathes on the still water; the lantern swings and flickers.
    const bob = Math.sin(t * 1.1) * 0.018;
    afloat.forEach((part, i) => (part.position.y = rest[i] + bob));
    swing.rotation.z = Math.sin(t * 1.3) * 0.16;
    colorOf(light).lerpColors(warm, hot, (Math.sin(t * 7) * Math.sin(t * 2.9) + 1) / 2);
  });

  return { width: 4.9, height: 4.6, lookY: 1.6 };
}
