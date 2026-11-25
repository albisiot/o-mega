import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { ORANGE, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, floor, skyline } from "@/lib/diorama-props";

/**
 * Signifer (P190): on the rescue teams' training quay at dusk, a lookout tower with a ring buoy
 * behind him and the old town over the water, the old instructor stands tall in his long
 * patched coat, both hands on his standard, a pole topped with a copper disc that turns and
 * catches the light. A young trainee in an orange life vest runs to the standard. His price waits
 * beside him: a folding stool and a thermos, because he no longer stands for long.
 */
export function signifer(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const DARK = 0x23222b;
  const COAT = 0x3a3c44;
  const COPPER = 0xc8703a;
  const WHITE = 0xf0ece0;
  const F = octagonBase(kit, 0x1a1c26);
  const G = floor(kit, F, 0.06, 0x3a3f4e, 0x2a2e3a, 0.5);

  // The water behind the quay's edge, and the old town across it.
  box(3.0, 0.012, 0.55, 0x0e3a4e, 0, G, -1.78, { delay: 0.06, flat: true, noInk: true });
  box(3.0, 0.1, 0.12, 0x5d6680, 0, G, -1.44, { delay: 0.08 });
  skyline(kit, -2.08, G, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.0, 1.05);
  bollard(kit, 0.9, -1.25, G, 0.2);

  // The lookout tower: legs, a platform, rails, a ladder, a ring buoy and a flag.
  const TX = -1.3;
  const TZ = -0.75;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.06, 1.7, 0.06, 0x4a4f5c, TX + sx * 0.28, G, TZ + sz * 0.28, { delay: 0.2 })));
  box(0.72, 0.07, 0.72, 0x4a4f5c, TX, G + 1.7, TZ, { delay: 0.25 });
  [
    [0, -0.34, 0.72, 0.04],
    [-0.34, 0, 0.04, 0.72],
    [0.34, 0, 0.04, 0.72],
    [0, 0.34, 0.72, 0.04],
  ].forEach(([dx, dz, w, d], i) => box(w, 0.04, d, 0x4a4f5c, TX + dx, G + 2.15, TZ + dz, { delay: 0.28 + i * 0.02, noInk: true }));
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.03, 0.45, 0.03, 0x4a4f5c, TX + sx * 0.34, G + 1.75, TZ + sz * 0.34, { delay: 0.3, noInk: true })));
  [-0.15, 0.15].forEach((dx) => box(0.03, 1.75, 0.03, DARK, TX + dx, G, TZ + 0.42, { delay: 0.32, noInk: true, rotation: [-0.12, 0, 0] }));
  const ladder = box(0.001, 0.001, 0.001, DARK, TX, G, TZ + 0.42, { delay: 0.34, flat: true, noInk: true });
  decorate(ladder, new BoxGeometry(0.3, 0.025, 0.025), DARK, Array.from({ length: 6 }, (_, k) => [0, 0.25 + k * 0.26, -0.03 - k * 0.032] as Point));
  const buoy = add(new TorusGeometry(0.17, 0.05, 8, 20), WHITE, TX, G + 1.82, TZ + 0.37, { delay: 0.4 });
  decorate(
    buoy,
    new BoxGeometry(0.07, 0.11, 0.11),
    ORANGE,
    [0, 1, 2, 3].map((k) => [Math.cos((k * Math.PI) / 2 + 0.78) * 0.17, 0.22 + Math.sin((k * Math.PI) / 2 + 0.78) * 0.17, 0, (k * Math.PI) / 2 + 0.78] as [number, number, number, number]),
  );
  cylinder(0.015, 0.015, 0.6, DARK, TX + 0.3, G + 2.19, TZ - 0.3, { delay: 0.42 }, 6);
  const flag = add(new ConeGeometry(0.1, 0.32, 3).rotateZ(-Math.PI / 2).translate(0.16, 0, 0), ORANGE, TX + 0.3, G + 2.62, TZ - 0.3, { delay: 0.45, flat: true });

  // A rope coil, a float, and the stool and thermos.
  [0, 1, 2].forEach((k) => add(new TorusGeometry(0.24 - k * 0.03, 0.04, 6, 20).rotateX(Math.PI / 2), 0xb09a70, -1.2, G + k * 0.07, 0.95, { delay: 0.5 + k * 0.03 }));
  const float = ball(0.24, ORANGE, 1.5, G, 0.75, { delay: 0.55 });
  decorate(float, new TorusGeometry(0.245, 0.03, 6, 20).rotateX(Math.PI / 2), DARK, [[0, 0.24, 0]]);
  [-1, 1].forEach((side) => box(0.03, 0.5, 0.03, DARK, -0.55 + side * 0.15, G, 0.95, { delay: 0.6, noInk: true, rotation: [0, 0.3, side * 0.35] }));
  box(0.36, 0.03, 0.3, 0x2f6f86, -0.55, G + 0.46, 0.95, { delay: 0.64, rotation: [0, 0.3, 0] });
  cylinder(0.05, 0.05, 0.22, 0x8a93a3, -0.5, G + 0.49, 0.95, { delay: 0.68 }, 10);
  cylinder(0.055, 0.055, 0.05, DARK, -0.5, G + 0.71, 0.95, { delay: 0.7 }, 10);

  // Signifer, tall in his patched coat, both hands on the standard.
  const old = figure(kit, {
    x: 0.35,
    z: 0.15,
    y: G,
    facing: 0.3,
    height: 2.5,
    build: "slim",
    skin: 0xd0a080,
    hair: { style: "wild", color: 0xc8c8d0 },
    face: { mouth: "neutral", brows: "calm", marks: 0xa07a60 },
    top: { kind: "coat", color: COAT, accent: 0x2a2c32 },
    bottom: { kind: "trousers", color: 0x2a2c34 },
    shoes: 0x2a2226,
    arms: [
      [0.26, 1.22, 0.4],
      [0.34, 1.66, 0.38],
    ],
    delay: 0.8,
  });
  // Patches on the sleeves and coat.
  old.hands.forEach((hand, i) => {
    const elbow = old.elbows[i];
    const mid: Point = [(hand[0] + elbow[0]) / 2, (hand[1] + elbow[1]) / 2 - 0.06, (hand[2] + elbow[2]) / 2];
    box(0.1, 0.12, 0.12, i ? 0x6a6050 : 0x5a5e68, ...mid, { delay: 1.2 + i * 0.03, rotation: [0, 0.3, 0.2] });
  });
  [
    [0.18, 1.05, 0.29, 0x5a5e68],
    [-0.2, 0.62, 0.3, 0x6a6050],
  ].forEach(([lx, ly, lz, color], i) => box(0.14, 0.14, 0.03, color, ...old.at(lx, ly, lz), { delay: 1.25 + i * 0.03, rotation: [0, 0.3, 0] }));
  // The standard: a pole with brass bands and a copper disc that turns.
  const foot = old.at(0.33, 0, 0.42);
  const pole = cylinder(0.035, 0.04, 3.0, 0x6a5440, ...foot, { delay: 1.3 }, 8);
  decorate(pole, new CylinderGeometry(0.045, 0.045, 0.06, 8), 0xb08d3c, [0.4, 1.0, 2.1, 2.7].map((y) => [0, y, 0] as Point));
  const top = new Group();
  top.position.set(foot[0], G + 3.05, foot[2]);
  top.rotation.set(0.75, 0.3, 0);
  const disc = add(new CylinderGeometry(0.34, 0.34, 0.035, 24), COPPER, 0, 0, 0, { delay: 1.4 });
  decorate(disc, new TorusGeometry(0.22, 0.012, 4, 24).rotateX(Math.PI / 2), 0xe8a060, [[0, 0.036, 0]]);
  decorate(disc, new CylinderGeometry(0.06, 0.06, 0.02, 12), 0xe8a060, [[0, 0.04, 0]]);
  disc.parent?.add(top);
  top.add(disc);
  cylinder(0.05, 0.03, 0.12, 0xb08d3c, foot[0], G + 2.95, foot[2], { delay: 1.38 }, 8);

  // The trainee in a life vest, running in to the standard.
  const kid = figure(kit, {
    x: 1.35,
    z: -0.55,
    y: G,
    facing: -0.9,
    height: 2.2,
    skin: 0xb07850,
    hair: { style: "curly", color: 0x1e1612 },
    face: { mouth: "open", brows: "raised" },
    top: { kind: "shirt", color: 0x2a3040 },
    bottom: { kind: "trousers", color: 0x2a3040 },
    shoes: 0x1a1a22,
    arms: [
      [-0.3, 1.5, 0.35],
      [0.35, 1.1, -0.3],
    ],
    legs: "stride",
    delay: 1.5,
  });
  const vest = add(new CylinderGeometry(0.37, 0.31, 0.56, 14).scale(1, 1, 0.82), ORANGE, ...kid.at(0, 1.0, 0), { delay: 1.8, rotation: [0, -0.9, 0] });
  decorate(vest, new CylinderGeometry(0.365, 0.36, 0.04, 14, 1, true).scale(1, 1, 0.84), WHITE, [
    [0, 0.2, 0],
    [0, 0.38, 0],
  ]);
  const parts = [...kid.parts, vest];
  const rest = parts.map((part) => part.position.y);

  tick((t) => {
    // The disc turns and flashes; the trainee runs; the flag flaps.
    disc.rotation.y = t * 0.6;
    const bounce = Math.abs(Math.sin(t * 6)) * 0.035;
    parts.forEach((part, i) => (part.position.y = rest[i] + bounce));
    flag.rotation.y = Math.sin(t * 3) * 0.35;
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
