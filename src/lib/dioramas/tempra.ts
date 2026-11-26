import { BoxGeometry, Color, ConeGeometry, TorusGeometry, type Group } from "three";
import { ORANGE, YELLOW, archMouth, archedWall, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { barrel, column, flame, floor, rubble } from "@/lib/diorama-props";

/**
 * Tempra (P285): the Third Smith, five thousand years old, at his forge under the mountain
 * among old columns, a river of lava behind. Bald and scarred, white hair wild at the sides,
 * leather apron, he holds the glowing head of an iron stamp on the anvil with his tongs and
 * raises the hammer; every blow throws sparks. He is lame: an iron brace on his leg, and his
 * brass crutch leans on the anvil, never far.
 */
export function tempra(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const IRON = 0x3a3f4e;
  const BRASS = 0xb08d3c;
  const ROCK = 0x3a3446;
  const F = octagonBase(kit, 0x1b1a24);
  const G = floor(kit, F, 0.06, 0x2c2834, 0x1e1a26, 0.5);

  /** Tilts a part in its own frame, then turns it about the vertical. */
  const yxz = (part: Group, tilt: number, turn: number, roll = 0) => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt, turn, roll);
    return part;
  };

  // The cave forge: columns, a lava channel behind, the hearth glowing in its stone arch.
  column(kit, -1.55, -0.85, G, 0.1, 2.9, false, 0x5d6680);
  column(kit, -0.35, -1.75, G, 0.15, 2.9, false, 0x5d6680);
  column(kit, 0.75, -1.65, G, 0.2, 2.9, true, 0x5d6680);
  const lava = add(new BoxGeometry(3.4, 0.02, 0.32), ORANGE, 0.1, G, -1.3, { delay: 0.3, flat: true, noInk: true, rotation: [0, 0.12, 0] });
  decorate(lava, new BoxGeometry(3.2, 0.01, 0.08), YELLOW, [[0.1, 0.02, 0.02]]);
  rubble(kit, 0.2, -1.0, G, 0.32, 6, 0.6, ROCK);
  add(archedWall(1.0, 1.15, 0.5, { x: 0, half: 0.24, spring: 0.36 }), 0x4a4458, 1.55, G, -0.7, { delay: 0.35, rotation: [0, -0.75, 0] });
  add(archMouth(0.24, 0.36), 0x5a1a10, 1.55 - 0.18 * Math.sin(-0.75), G, -0.7 - 0.18 * Math.cos(-0.75), { delay: 0.4, flat: true, noInk: true, rotation: [0, -0.75, 0] });
  const fire = flame(kit, 1.48, -0.6, G, 0.45, 0.9);
  barrel(kit, -1.45, 0.75, G, 0.5, 0x4a3a30);
  cylinder(0.18, 0.18, 0.01, 0x1f6f8a, -1.45, G + 0.5, 0.75, { delay: 0.55, flat: true, noInk: true }, 14);
  motes(8, 0xcfeef7, 0.03, [-1.6, G + 0.5, 0.6], [-1.3, G + 1.6, 0.9], 1);

  // The anvil on its stump, the crutch leaning on it.
  const A: Point = [0.42, G, 0.5];
  cylinder(0.3, 0.34, 0.35, 0x4a3a30, ...A, { delay: 0.5 }, 12);
  box(0.28, 0.22, 0.22, IRON, A[0], G + 0.35, A[2], { delay: 0.55, rotation: [0, 0.3, 0] });
  const anvil = box(0.62, 0.18, 0.28, IRON, A[0], G + 0.57, A[2], { delay: 0.6, rotation: [0, 0.3, 0] });
  decorate(anvil, new BoxGeometry(0.6, 0.012, 0.012), shade(IRON, 1.4), [[0, 0.18, 0.14]]);
  add(new ConeGeometry(0.09, 0.32, 10).rotateZ(-Math.PI / 2), IRON, A[0] + 0.42 * Math.cos(0.3), G + 0.62, A[2] - 0.42 * Math.sin(0.3), { delay: 0.65, rotation: [0, 0.3, 0] });
  const crutch = cylinder(0.03, 0.035, 1.55, BRASS, A[0] + 0.45, G, A[2] + 0.35, { delay: 0.7, rotation: [0.12, 0, 0.28] }, 8);
  decorate(crutch, new BoxGeometry(0.28, 0.05, 0.07), shade(BRASS, 0.7), [[0, 1.55, 0]]);
  decorate(crutch, new TorusGeometry(0.035, 0.01, 5, 10).rotateX(Math.PI / 2), shade(BRASS, 0.6), [
    [0, 0.5, 0],
    [0, 1.0, 0],
  ]);

  // The Seal on the anvil: an iron stamp's head, white-hot.
  const top = G + 0.75;
  const seal = cylinder(0.12, 0.12, 0.06, ORANGE, A[0] - 0.05, top, A[2] + 0.02, { delay: 1.4, flat: true }, 18);
  decorate(seal, new TorusGeometry(0.07, 0.015, 6, 18).rotateX(Math.PI / 2), YELLOW, [[0, 0.065, 0]]);
  cylinder(0.035, 0.045, 0.18, shade(IRON, 1.2), A[0] - 0.05, top + 0.06, A[2] + 0.02, { delay: 1.45 }, 8);

  // Tempra: bald and scarred, wild white hair at the sides, apron over a dark tunic.
  const facing = 0.45;
  const u = 2.45 / 2.4;
  const smith = figure(kit, {
    x: -0.5,
    z: -0.05,
    y: G,
    facing,
    height: 2.45,
    build: "broad",
    skin: 0xb88068,
    hair: { style: "bald", color: 0xe8e8ee },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0xbcbcc4, marks: 0x7a3a2e },
    top: { kind: "apron", color: 0x2a2638, accent: 0x7a4a30, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x24222e },
    shoes: 0x2a1e1a,
    belt: 0x3e2a1e,
    gloves: 0x2a2626,
    arms: [
      [-0.45, 2.3, 0.15],
      [0.42, 1.2, 0.6],
    ],
    delay: 0.8,
  });
  const R = smith.headRadius;
  [-1, 1].forEach((side) =>
    [
      [0.02, -0.1, 0.07],
      [0.08, -0.22, 0.08],
      [-0.06, -0.18, 0.06],
    ].forEach(([dy, dz, r], k) => ball(r, 0xe8e8ee, ...smith.at(side * R * 0.95, 2.14 * u + dy - r, dz), { delay: 1.3 + k * 0.02 })),
  );
  // The brace on his lame right leg.
  [0.24, 0.48].forEach((y, i) => add(new TorusGeometry(0.13, 0.025, 6, 14).rotateX(Math.PI / 2), IRON, ...smith.at(-0.17 * u, y * u, 0.03), { delay: 1.2 + i * 0.03 }));
  [-1, 1].forEach((side) => box(0.025, 0.42, 0.025, IRON, ...smith.at(-0.17 * u + side * 0.13, 0.12 * u, 0.03), { delay: 1.25, rotation: [0, facing, 0] }));

  // The tongs from his left hand to the Seal.
  const [hammerHand, tongHand] = smith.hands;
  [-0.025, 0.025].forEach((d) => limb(kit, [tongHand[0], tongHand[1] + d, tongHand[2]], [A[0] - 0.12, top + 0.03 + d, A[2] + 0.02], 0.016, 0.014, 0x23222b, { delay: 1.35 }));
  // The hammer, raised: it swings about his grip.
  const hammer = yxz(cylinder(0.025, 0.03, 0.55, 0x5e4a3a, ...hammerHand, { delay: 1.35 }, 8), -0.3, facing);
  decorate(hammer, new BoxGeometry(0.28, 0.14, 0.14), IRON, [[0, 0.55, 0]]);

  // Sparks: a fan of streaks off the Seal after every blow.
  const sparks = Array.from({ length: 10 }, (_, k) => {
    const a = (k / 10) * Math.PI * 2;
    return box(0.025, 0.025, 0.14, k % 3 ? ORANGE : YELLOW, A[0] - 0.05, top + 0.05, A[2] + 0.02, { delay: 1.5, flat: true, noInk: true, rotation: [0.6, a, 0] });
  });
  const hot = [new Color(ORANGE), new Color(0xfff2c0)];
  const lavaFrom = new Color(ORANGE);
  const lavaTo = new Color(0xff5a2a);

  const strike = (t: number) => {
    const p = (t * 0.8) % 1;
    hammer.rotation.x = p < 0.12 ? -0.3 + (p / 0.12) * 0.9 : 0.6 - ((p - 0.12) / 0.88) * 0.9;
    const burst = p < 0.35 ? p / 0.35 : -1;
    sparks.forEach((spark, k) => {
      const a = (k / 10) * Math.PI * 2;
      const r = 0.12 + Math.max(burst, 0) * (0.35 + (k % 3) * 0.1);
      spark.visible = burst >= 0;
      spark.position.set(A[0] - 0.05 + Math.sin(a) * r, top + 0.05 + Math.max(burst, 0) * 0.35 * (1 - Math.max(burst, 0)) + (k % 2) * 0.04, A[2] + 0.02 + Math.cos(a) * r);
    });
    colorOf(seal).lerpColors(hot[0], hot[1], burst >= 0 ? 1 - burst : 0);
  };
  strike(0.05);
  tick((t) => {
    strike(t + 0.05);
    colorOf(lava).lerpColors(lavaFrom, lavaTo, (Math.sin(t * 1.3) + 1) / 2);
    fire.forEach((f, i) => (f.children[0].scale.y = 1 + Math.sin(t * 9 + i) * 0.12));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
