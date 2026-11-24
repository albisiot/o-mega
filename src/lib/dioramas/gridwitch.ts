import { BoxGeometry, CylinderGeometry, Group, OctahedronGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { crate, floor } from "@/lib/diorama-props";

/**
 * A cap of hair over the top of a figure's head (the figure's own caps sit low and leave it bald);
 * `front` tips it back to bare the forehead.
 */
function hairCap(kit: Kit, person: Figure, color: number, facing: number, delay: number, front = 0.4): Group {
  const R = person.headRadius;
  const [x, y, z] = person.head;
  const cap = kit.add(new SphereGeometry(R * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.1, 1.02), color, x - Math.sin(facing) * 0.03, y - R * 0.05, z - Math.cos(facing) * 0.03, { delay });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-front, facing, 0);
  return cap;
}

/**
 * Gridwitch (P040): the techno-witch of the Lanterne in her basement repair shop, sitting at a
 * cluttered bench and mending a floating rune with a soldering iron; the spell flickers and
 * glitches, sparks spit from the tip, a motorised broom leans on the wall. Her price is how slow
 * she is: a snail on the bench is overtaking her work.
 */
export function gridwitch(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const WOOD = 0x4a3a46;
  const DARK = 0x23222b;
  const F = octagonBase(kit, 0x1e1a2a);
  const G = floor(kit, F, 0.06, 0x2a2638, 0x1c1a28, 0.4);

  // The basement wall: bricks, a shelf of half-mended radios and jars.
  const wall = box(3.2, 2.7, 0.2, 0x2e2a44, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  const bricks: Point[] = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 6; c++) if ((r * 5 + c * 3) % 4) bricks.push([-1.35 + c * 0.55 + (r % 2) * 0.27, 0.15 + r * 0.29, 0.105]);
  decorate(wall, new BoxGeometry(0.46, 0.22, 0.01), 0x35304e, bricks);
  box(1.5, 0.05, 0.3, WOOD, -0.75, G + 1.75, -1.25, { delay: 0.2 });
  [
    [-1.25, 0.32, 0.24, 0x5a6a7a],
    [-0.8, 0.4, 0.3, 0x7a3a5a],
  ].forEach(([x, w, h, color], i) => {
    const radio = box(w, h, 0.22, color, x, G + 1.8, -1.25, { delay: 0.25 + i * 0.04 });
    decorate(radio, new CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(Math.PI / 2), 0xe8e2d0, [[w * 0.25, h * 0.5, 0.11]]);
    decorate(radio, new BoxGeometry(w * 0.35, 0.02, 0.01), INK, [[-w * 0.15, h * 0.55, 0.115], [-w * 0.15, h * 0.4, 0.115]]);
  });
  [-0.35, -0.2].forEach((x, i) => cylinder(0.06, 0.06, 0.2, i ? 0x2f8f6f : 0x3a6a9a, x, G + 1.8, -1.25, { delay: 0.32 + i * 0.03 }, 10));

  // The broom, with an outboard propeller wired to it.
  const broomBase: Point = [1.25, G, -1.2];
  const broomTop: Point = [1.0, G + 2.0, -1.35];
  limb(kit, broomBase, broomTop, 0.03, 0.03, 0x6a4a32, { delay: 0.3 });
  add(new CylinderGeometry(0.06, 0.2, 0.45, 10), 0xb08d3c, ...broomBase, { delay: 0.34, rotation: [0, 0, 0.12] });
  box(0.16, 0.16, 0.14, 0x4a4f5c, 1.1, G + 1.15, -1.25, { delay: 0.38 });
  const hub: Point = [1.1, G + 1.23, -1.16];
  const propeller = box(0.05, 0.44, 0.02, 0x8a93a3, hub[0], hub[1] - 0.22, hub[2], { delay: 0.42, noInk: true });

  // The bench and its clutter: a wire spool, a circuit board, a pen pot, the soldering station.
  const BY = G + 0.7;
  box(1.9, 0.07, 0.7, WOOD, 0.1, BY, 0.62, { delay: 0.4 });
  [-0.8, 1.0].forEach((x) => [0.35, 0.9].forEach((z) => box(0.06, 0.7, 0.06, DARK, x, G, z, { delay: 0.36, noInk: true })));
  const T = BY + 0.07;
  const spool = add(new CylinderGeometry(0.1, 0.1, 0.16, 14).rotateZ(Math.PI / 2), 0x8a93a3, 0.75, T, 0.5, { delay: 0.5 });
  decorate(spool, new TorusGeometry(0.11, 0.02, 6, 16).rotateY(Math.PI / 2), 0x4a4f5c, [[-0.08, 0.1, 0], [0.08, 0.1, 0]]);
  const board = box(0.45, 0.03, 0.3, 0x1f6f60, 0.25, T, 0.7, { delay: 0.52, rotation: [0, 0.2, 0] });
  decorate(board, new BoxGeometry(0.08, 0.03, 0.06), INK, [[-0.12, 0.03, 0.05], [0.05, 0.03, -0.06], [0.14, 0.03, 0.07]]);
  decorate(board, new BoxGeometry(0.3, 0.005, 0.012), YELLOW, [[0, 0.032, 0], [0, 0.032, -0.1]]);
  cylinder(0.07, 0.07, 0.18, 0x3a4a6a, -0.55, T, 0.85, { delay: 0.54 }, 10);
  [-0.02, 0.03].forEach((dx, i) => box(0.02, 0.24, 0.02, i ? MAGENTA : CYAN, -0.55 + dx, T + 0.1, 0.85, { delay: 0.56, rotation: [0.15, 0, dx * 6] }));
  const station = box(0.3, 0.16, 0.24, 0x3a3a4a, -0.6, T, 0.45, { delay: 0.55 });
  decorate(station, new BoxGeometry(0.07, 0.05, 0.01), YELLOW, [[-0.07, 0.09, 0.121]]);

  // A crate of junk waiting its turn on the floor, wires spilling out.
  crate(kit, -1.35, 0.55, G, 0.45, 0.45, 0x5e4a3a, 0.4);
  box(0.3, 0.12, 0.2, 0x5a6a7a, -1.3, G + 0.45, 0.5, { delay: 0.5, rotation: [0.3, 0.5, 0.2] });
  cable(kit, [[-1.2, G + 0.42, 0.7], [-1.0, G + 0.15, 0.85], [-0.8, G + 0.03, 0.95]], 0.014, MAGENTA, 0.55);

  // The snail: the price, sliding along the bench's edge faster than she works.
  const snail = add(new SphereGeometry(0.09, 12, 8).scale(1.6, 0.45, 0.8), 0x9aa86a, 0, T, 0.9, { delay: 0.6 });
  decorate(snail, new TorusGeometry(0.06, 0.035, 8, 16), 0xb06a3a, [[0.02, 0.1, 0]]);
  decorate(snail, new BoxGeometry(0.012, 0.09, 0.012), 0x9aa86a, [[-0.13, 0.07, 0.025, 0.4], [-0.13, 0.07, -0.025, 0.4]]);

  // Gridwitch on her stool, smiling at the spell she is soldering.
  cylinder(0.22, 0.22, 0.06, 0x5a4a5a, 0.05, G + 0.39, -0.22, { delay: 0.5 });
  cylinder(0.04, 0.06, 0.39, DARK, 0.05, G, -0.22, { delay: 0.48 }, 8);
  const D = 0.8;
  const witch = figure(kit, {
    x: 0.05,
    z: -0.22,
    y: G,
    facing: 0.3,
    height: 2.3,
    build: "slim",
    skin: 0xe8bca8,
    hair: { style: "bun", color: 0x1e1a34 },
    face: { mouth: "smile", brows: "raised", marks: 0xc07a6a, eyes: 0x1a2a3a },
    top: { kind: "jacket", color: 0x3a2c5a, accent: 0x22203a },
    bottom: { kind: "trousers", color: 0x2a2436 },
    gloves: 0x2a2236,
    arms: [[-0.26, 1.12, 0.52], [0.36, 1.12, 0.5]],
    legs: "sit",
    delay: D,
  });
  // Goggles pushed up on her forehead, and patches on the jacket.
  hairCap(kit, witch, 0x1e1a34, 0.3, D + 0.38, 0.5);
  const u = 2.3 / 2.4;
  const RH = witch.headRadius;
  const headY = witch.head[1] - G;
  [-1, 1].forEach((side) => {
    add(new TorusGeometry(0.06, 0.02, 6, 14), 0x4a4f5c, ...witch.at(side * 0.09 * u, headY + RH * 0.55, RH * 1.0), { delay: D + 0.45, rotation: [0.5, 0.3, 0] });
    add(new CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(Math.PI / 2), MAGENTA, ...witch.at(side * 0.09 * u, headY + RH * 0.58, RH * 0.98), { delay: D + 0.47, flat: true, noInk: true, rotation: [0.5, 0.3, 0] });
  });
  [[-0.2, 1.05, 0.21, 0xb03a6a], [0.16, 0.92, 0.2, 0x8a5a3a]].forEach(([x, y, z, color], i) =>
    box(0.11, 0.1, 0.02, color, ...witch.at(x, y, z), { delay: D + 0.4 + i * 0.03, rotation: [0, 0.3, i ? 0.2 : -0.15] }),
  );
  const [ironHand, spellHand] = witch.hands;

  // The rune floating over her left hand: a ring, a diamond and glitching pixels.
  const R: Point = [spellHand[0] + 0.02, spellHand[1] + 0.42, spellHand[2] + 0.05];
  const rune = [
    add(new TorusGeometry(0.28, 0.022, 6, 30).scale(0.75, 1, 1), CYAN, R[0], R[1] - 0.3, R[2], { delay: D + 0.6, flat: true, noInk: true, rotation: [0, 0.3, 0] }),
    add(new OctahedronGeometry(0.17).scale(0.6, 1, 0.25), MAGENTA, R[0], R[1] - 0.17, R[2], { delay: D + 0.65, flat: true, noInk: true, rotation: [0, 0.3, 0] }),
  ];
  const pixels: Group[] = [
    [0.36, 0.15, 0], [0.42, -0.05, 0.02], [0.3, -0.24, 0.03], [-0.12, 0.38, -0.02], [0.12, 0.42, 0], [0.4, 0.34, 0.01], [0.26, 0.3, 0.02],
  ].map(([dx, dy, dz], k) =>
    box(0.05 + (k % 3) * 0.02, 0.04, 0.02, k % 2 ? CYAN : MAGENTA, R[0] + dx, R[1] + dy, R[2] + dz, { delay: D + 0.7 + k * 0.02, flat: true, noInk: true }),
  );

  // The soldering iron, its tip touching the ring, the cable back to the station.
  const tip: Point = [R[0] - 0.17, R[1] - 0.14, R[2]];
  const back: Point = [ironHand[0] - 0.08, ironHand[1] - 0.05, ironHand[2] - 0.04];
  limb(kit, back, ironHand, 0.035, 0.035, 0x3a6a9a, { delay: D + 0.5 });
  limb(kit, ironHand, tip, 0.03, 0.008, 0xb0b4bc, { delay: D + 0.52 });
  cable(kit, [back, [back[0] - 0.15, BY + 0.25, back[2] + 0.25], [-0.62, T + 0.08, 0.5]], 0.015, INK, D + 0.55);
  const sparks = [0, 1, 2].map((k) => {
    const a = k * 2.1;
    return zigzag(kit, [tip, [tip[0] + Math.cos(a) * 0.1, tip[1] + 0.05 + k * 0.03, tip[2] + Math.sin(a) * 0.08], [tip[0] + Math.cos(a) * 0.18, tip[1] + 0.12, tip[2] + Math.sin(a) * 0.14]], 0.014, YELLOW, D + 0.75);
  });
  motes(6, YELLOW, 0.015, [tip[0] - 0.08, tip[1], tip[2] - 0.08], [tip[0] + 0.08, tip[1] + 0.35, tip[2] + 0.08], 1.6);

  tick((t) => {
    rune.forEach((part, k) => (part.rotation.y = 0.3 + Math.sin(t * 1.4 + k) * 0.5));
    pixels.forEach((pixel, k) => (pixel.visible = (Math.floor(t * 6) + k * 3) % 5 !== 1));
    sparks.forEach((spark, k) => spark.forEach((piece) => (piece.visible = (Math.floor(t * 10) + k) % 3 !== 2)));
    // The propeller turns about its hub (a part turns about its foot, so the foot circles the hub).
    const spin = t * 12 + Math.PI / 2;
    propeller.rotation.z = spin;
    propeller.position.set(hub[0] + 0.22 * Math.sin(spin), hub[1] - 0.22 * Math.cos(spin), hub[2]);
    // The snail crosses the bench, very slowly, then starts again.
    snail.position.x = -0.35 + ((t * 0.05) % 1.1);
  });

  return { width: 4.9, height: 4.3, lookY: 1.3 };
}
