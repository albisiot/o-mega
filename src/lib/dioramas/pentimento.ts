import { BoxGeometry, CylinderGeometry, SphereGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, archMouth, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Pentimento (P170): the Comune's portraitist, grey bun and paint-spattered smock, stands in
 * the council hall between a blank-eyed marble bust and the portrait she has made of it. She
 * tried to paint it badly; it came out alive: rosy, curly, its eyes glancing round the hall and
 * blinking. Against the wall lean her other failures, every one a masterpiece.
 */
export function pentimento(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const MARBLE = 0xd8d4c8;
  const WOOD = 0x5e4a3a;
  const SKIN = 0xe0a888;
  const HAIR = 0x6a4a3a;
  const F = octagonBase(kit, 0x221e26);
  const G = floor(kit, F, 0.06, 0x3e3a48, 0x2c2834, 0.5);

  // The council hall: an arched window on the harbour and a plain banner.
  const wall = box(3.2, 3.0, 0.3, 0x4a4058, -0.1, G, -1.45, { delay: 0.1, ink: 1.02 });
  decorate(wall, archMouth(0.48, 1.0), 0x6a5e78, [[-0.95, 0.82, 0.15]]);
  decorate(wall, archMouth(0.4, 1.0), 0x2a4a6a, [[-0.95, 0.9, 0.152]]);
  decorate(wall, new BoxGeometry(0.8, 0.3, 0.01), 0x163a52, [[-0.95, 1.05, 0.175]]);
  decorate(wall, new BoxGeometry(0.05, 0.05, 0.01), ORANGE, [
    [-1.15, 1.25, 0.176],
    [-0.98, 1.3, 0.176],
    [-0.8, 1.24, 0.176],
  ]);
  const banner = box(0.6, 1.2, 0.03, 0x8a1e44, 0.75, G + 1.55, -1.28, { delay: 0.2 });
  decorate(banner, new BoxGeometry(0.5, 0.05, 0.01), CYAN, [
    [0, 0.15, 0.016],
    [0, 1.05, 0.016],
  ]);

  // The bust on its pedestal: blank stone eyes.
  const BX = -1.5;
  const BZ = -0.7;
  box(0.42, 0.95, 0.42, MARBLE, BX, G, BZ, { delay: 0.3 });
  const turnBust: Point = [0, 0.75, 0];
  add(new SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 0.6), MARBLE, BX, G + 0.95, BZ, { delay: 0.35, rotation: turnBust });
  cylinder(0.09, 0.1, 0.22, MARBLE, BX, G + 1.12, BZ, { delay: 0.38 });
  const bust = add(new SphereGeometry(0.2, 16, 12).scale(0.95, 1.08, 0.95), MARBLE, BX, G + 1.28, BZ, { delay: 0.4, rotation: turnBust });
  decorate(bust, new BoxGeometry(0.05, 0.015, 0.02), 0xb8b2a4, [
    [-0.07, 0.24, 0.18],
    [0.07, 0.24, 0.18],
  ]);
  [-0.12, -0.04, 0.05, 0.12, 0].forEach((dx, k) => ball(0.07, MARBLE, BX + dx * 1.15 * Math.cos(0.75), G + 1.63 - (k === 4 ? 0 : 0.04), BZ - dx * 1.15 * Math.sin(0.75) - 0.04, { delay: 0.42 + k * 0.01 }));

  // The easel and the living portrait.
  const EX = 1.05;
  const EZ = -0.3;
  const yaw = 0.2;
  const onCanvas = (lx: number, ly: number, lz: number): Point => [EX + lx * Math.cos(yaw) + lz * Math.sin(yaw), G + 0.75 + ly, EZ - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
  limb(kit, onCanvas(-0.4, -0.75, 0.2), onCanvas(0, 1.25, -0.02), 0.025, 0.025, WOOD, { delay: 0.3 });
  limb(kit, onCanvas(0.4, -0.75, 0.2), onCanvas(0, 1.25, -0.02), 0.025, 0.025, WOOD, { delay: 0.3 });
  limb(kit, onCanvas(0, -0.75, -0.55), onCanvas(0, 1.2, -0.06), 0.025, 0.025, WOOD, { delay: 0.32 });
  box(0.9, 0.05, 0.12, WOOD, ...onCanvas(0, -0.05, 0.08), { delay: 0.34, rotation: [0, yaw, 0] });
  const canvas = box(0.9, 1.1, 0.05, 0xe8e2d0, ...onCanvas(0, 0, 0.06), { delay: 0.4, rotation: [0, yaw, 0] });
  const disc = (r: number) => new CylinderGeometry(r, r, 0.01, 20).rotateX(Math.PI / 2);
  decorate(canvas, new BoxGeometry(0.8, 1.0, 0.01), 0x1f3a3a, [[0, 0.55, 0.026]]);
  decorate(canvas, new BoxGeometry(0.62, 0.3, 0.01), 0x2f5a6a, [[0, 0.17, 0.03]]);
  decorate(canvas, new BoxGeometry(0.1, 0.12, 0.01), SKIN, [[0, 0.36, 0.031]]);
  decorate(canvas, disc(0.22).scale(1, 1.15, 1), HAIR, [[0, 0.68, 0.031]]);
  decorate(canvas, disc(0.18).scale(1, 1.25, 1), SKIN, [[0, 0.6, 0.034]]);
  decorate(canvas, disc(0.06), HAIR, [-0.17, -0.09, 0, 0.09, 0.17].map((x) => [x, 0.84 - Math.abs(x) * 0.6, 0.035] as Point));
  decorate(canvas, new BoxGeometry(0.08, 0.045, 0.01), 0xf4f0e6, [
    [-0.075, 0.64, 0.04],
    [0.075, 0.64, 0.04],
  ]);
  decorate(canvas, new BoxGeometry(0.08, 0.018, 0.01), HAIR, [
    [-0.075, 0.7, 0.04],
    [0.075, 0.7, 0.04],
  ]);
  decorate(canvas, disc(0.035), 0xf08a8a, [
    [-0.11, 0.54, 0.038],
    [0.11, 0.54, 0.038],
  ]);
  decorate(canvas, new BoxGeometry(0.09, 0.022, 0.01), MAGENTA, [[0, 0.47, 0.04]]);
  const pupils = [-0.075, 0.075].map((x, i) => box(0.03, 0.035, 0.01, INK, ...onCanvas(x, 0.623, 0.106), { delay: 0.6 + i * 0.02, flat: true, noInk: true, rotation: [0, yaw, 0] }));
  const lids = [-0.075, 0.075].map((x, i) => box(0.09, 0.05, 0.01, SKIN, ...onCanvas(x, 0.615, 0.112), { delay: 0.62 + i * 0.02, flat: true, noInk: true, rotation: [0, yaw, 0] }));

  // Her failures, leaning on the wall: each one beautiful.
  [
    [1.55, -0.95, 0.5],
    [1.75, -0.6, 0.9],
  ].forEach(([x, z, turn], k) => {
    const failure = box(0.5, 0.62, 0.04, 0xe8e2d0, x, G, z, { delay: 0.5 + k * 0.05, rotation: [-0.2, -turn, 0] });
    decorate(failure, new BoxGeometry(0.44, 0.56, 0.01), [0x3a2a4a, 0x22344a][k], [[0, 0.31, 0.021]]);
    decorate(failure, disc(0.1).scale(1, 1.2, 1), SKIN, [[0, 0.36, 0.026]]);
    decorate(failure, disc(0.12).scale(1, 0.6, 1), [ORANGE, CYAN][k], [[0, 0.12, 0.026]]);
  });

  // Pentimento with her brushes, the smock spattered.
  const theta = 0.3;
  const painter = figure(kit, {
    x: 0.0,
    z: 0.45,
    y: G,
    facing: theta,
    height: 2.3,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "bun", color: 0xb8b8bc },
    face: { mouth: "neutral", brows: "calm", marks: 0xb08870 },
    top: { kind: "coat", color: 0xb8b0a0, accent: 0x2a2a30 },
    bottom: { kind: "long-skirt", color: 0xa8a090 },
    belt: 0x5a4a3a,
    shoes: 0x3a2c22,
    arms: [
      [-0.1, 1.12, 0.4],
      [0.12, 1.08, 0.38],
    ],
    delay: 0.9,
  });
  const { at } = painter;
  [
    [-0.15, 1.5, ORANGE],
    [0.12, 1.3, CYAN],
    [0.2, 0.75, MAGENTA],
    [-0.22, 0.6, ORANGE],
    [0.05, 1.65, MAGENTA],
  ].forEach(([x, y, color], k) => ball(0.035, color, ...at(x, y - 0.035, 0.3 + (y < 1 ? 0.06 : 0)), { delay: 1.3 + k * 0.02, flat: true, noInk: true }));
  const [hand] = painter.hands;
  [
    [0.35, 0.5, ORANGE],
    [0.42, 0.42, CYAN],
    [0.28, 0.55, MAGENTA],
  ].forEach(([dx, dy, color], k) => {
    const tip = at(dx, 1.12 + dy, 0.42 + k * 0.03);
    limb(kit, hand, tip, 0.014, 0.012, WOOD, { delay: 1.4 + k * 0.03 });
    ball(0.025, color, tip[0], tip[1] - 0.025, tip[2], { delay: 1.45 + k * 0.03, flat: true });
  });

  const rest = pupils.map((pupil) => pupil.position.clone());
  tick((t) => {
    // The painted eyes glance round the hall and blink now and then.
    const look = Math.sin(t * 0.9);
    const shift = look > 0.5 ? 0.022 : look < -0.5 ? -0.022 : 0;
    pupils.forEach((pupil, i) => pupil.position.set(rest[i].x + shift * Math.cos(yaw), rest[i].y, rest[i].z - shift * Math.sin(yaw)));
    const blink = t > 0 && t % 3.7 < 0.15;
    lids.forEach((lid) => (lid.visible = blink));
    pupils.forEach((pupil) => (pupil.visible = !blink));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
