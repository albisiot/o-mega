import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { CYAN, INK, ORANGE, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Tariffario (P194): the woman who clears houses of their presences in four hours, in a family's
 * kitchen with the window on the sunset. Bandana, overalls and knee pads, toolbox in one hand and
 * the folding ruler on her shoulder, she walks in on a ghost rising from the oven; on the wall the
 * clock races through her four hours, and the sideboard where she put the last ones, taped shut
 * with no magic at all, rattles and leaks cyan light.
 */
export function tariffario(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const GHOST = 0x9fe8ff;
  const TAPE = 0xb8c0c8;
  const WOOD = 0x5e4a3a;
  const F = octagonBase(kit, 0x1e1c26);
  const G = floor(kit, F, 0.06, 0x463a40, 0x2e2428, 0.4);

  // The kitchen wall: majolica tiles, the window on the sunset, pans on a rail.
  const wall = box(2.8, 2.7, 0.2, 0x2a3a56, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  const majolica: Point[] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++) majolica.push([-1.32 + c * 0.24, 1.05 + r * 0.24, 0.105]);
  decorate(wall, new BoxGeometry(0.2, 0.2, 0.01), 0x3a6a8a, majolica.filter((_, k) => k % 2 === 0));
  decorate(wall, new BoxGeometry(0.2, 0.2, 0.01), 0xd8d2c0, majolica.filter((_, k) => k % 2 === 1));
  decorate(wall, new BoxGeometry(0.8, 0.9, 0.01), 0x14121c, [[0.75, 1.75, 0.105]]);
  decorate(wall, new BoxGeometry(0.66, 0.76, 0.012), ORANGE, [[0.75, 1.75, 0.11]]);
  decorate(wall, new BoxGeometry(0.12, 0.3, 0.014), 0x7a3a3a, [
    [0.55, 1.52, 0.115],
    [0.68, 1.48, 0.115],
    [0.86, 1.55, 0.115],
  ]);
  decorate(wall, new BoxGeometry(0.66, 0.04, 0.016), 0x14121c, [[0.75, 1.75, 0.118]]);
  box(0.9, 0.06, 0.2, 0x3a2e2a, 0.75, G + 1.27, -1.58, { delay: 0.2 });
  box(1.0, 0.03, 0.03, 0x23222b, -0.5, G + 2.35, -1.6, { delay: 0.2, noInk: true });
  [-0.8, -0.35].forEach((x, k) => {
    add(new CylinderGeometry(0.17 - k * 0.03, 0.15 - k * 0.03, 0.05, 16).rotateX(Math.PI / 2), 0x3a3a44, x, G + 1.95 - k * 0.06, -1.6, { delay: 0.25 + k * 0.03 });
    box(0.03, 0.22, 0.03, 0x3a3a44, x, G + 2.12 - k * 0.06, -1.6, { delay: 0.27 + k * 0.03, noInk: true });
  });

  // The clock, racing through her four hours.
  const clock = add(new CylinderGeometry(0.22, 0.22, 0.04, 20).rotateX(Math.PI / 2), 0xe8e2d0, 0.1, G + 2.05, -1.63, { delay: 0.3 });
  decorate(clock, new BoxGeometry(0.02, 0.05, 0.01), INK, [
    [0, 0.4, 0.025],
    [0, 0.04, 0.025],
    [0.18, 0.22, 0.025, Math.PI / 2],
    [-0.18, 0.22, 0.025, Math.PI / 2],
  ]);
  const minute = box(0.025, 0.17, 0.01, INK, 0.1, G + 2.27, -1.6, { delay: 0.35, noInk: true });
  const hour = box(0.035, 0.11, 0.01, ORANGE, 0.1, G + 2.27, -1.595, { delay: 0.36, noInk: true });

  // The oven, the ghost coming out of it.
  const oven = box(0.85, 0.9, 0.6, 0x2c2a34, -1.25, G, -0.95, { delay: 0.3, rotation: [0, 0.6, 0] });
  decorate(oven, new BoxGeometry(0.5, 0.3, 0.01), 0x14121c, [[0, 0.38, 0.305]]);
  decorate(oven, new BoxGeometry(0.42, 0.22, 0.012), ORANGE, [[0, 0.38, 0.31]]);
  decorate(oven, new SphereGeometry(0.035, 8, 6), 0x8a93a3, [
    [-0.25, 0.76, 0.3],
    [-0.08, 0.76, 0.3],
    [0.08, 0.76, 0.3],
    [0.25, 0.76, 0.3],
  ]);
  const ghost = [
    add(new ConeGeometry(0.2, 0.55, 10).rotateX(Math.PI), GHOST, -1.15, G + 0.9, -0.85, { delay: 0.6, flat: true, ink: 1.04, rotation: [0.2, 0, -0.3] }),
    add(new CylinderGeometry(0.17, 0.22, 0.55, 12), GHOST, -1.05, G + 1.4, -0.75, { delay: 0.65, flat: true, ink: 1.04 }),
  ];
  const ghostHead = ball(0.17, GHOST, -1.02, G + 1.93, -0.72, { delay: 0.7, flat: true, ink: 1.04 });
  decorate(ghostHead, new BoxGeometry(0.06, 0.08, 0.02), 0x1d3a48, [
    [-0.06, 0.2, 0.15],
    [0.07, 0.2, 0.15],
  ]);
  decorate(ghostHead, new SphereGeometry(0.04, 8, 6), 0x1d3a48, [[0, 0.08, 0.15]]);
  ghost.push(ghostHead);
  [-1, 1].forEach((side) => {
    const { length, rotation } = aim([-1.05 + side * 0.17, G + 1.85, -0.72], [-0.75 + side * 0.25, G + 2.15, -0.45]);
    ghost.push(cylinder(0.04, 0.06, length, GHOST, -1.05 + side * 0.17, G + 1.85, -0.72, { delay: 0.75, flat: true, ink: 1.04, rotation }));
  });

  // The sideboard where she put the last ones: taped shut, light leaking, rattling.
  const board = box(0.95, 1.05, 0.45, WOOD, 1.45, G, -0.6, { delay: 0.4, rotation: [0, -0.6, 0] });
  decorate(board, new BoxGeometry(0.4, 0.8, 0.01), 0x4a3a2e, [
    [-0.22, 0.5, 0.226],
    [0.22, 0.5, 0.226],
  ]);
  decorate(board, new BoxGeometry(0.03, 0.85, 0.014), CYAN, [[0, 0.5, 0.228]]);
  decorate(board, new BoxGeometry(0.85, 0.025, 0.014), CYAN, [[0, 0.06, 0.228]]);
  decorate(board, new BoxGeometry(0.09, 0.95, 0.02), TAPE, [
    [0, 0.5, 0.235, 0.75],
    [0, 0.5, 0.235, -0.75],
  ]);
  decorate(board, new BoxGeometry(0.09, 0.4, 0.02), TAPE, [[0.02, 0.6, 0.24, Math.PI / 2]]);
  // Its top: a jug and a roll of tape.
  cylinder(0.08, 0.1, 0.24, 0x2a4a6a, 1.6, G + 1.05, -0.75, { delay: 0.5 }, 10);
  add(new CylinderGeometry(0.08, 0.08, 0.07, 14), TAPE, 1.25, G + 1.05, -0.55, { delay: 0.52 });

  // Tariffario walking in, toolbox in hand, the ruler on her shoulder.
  const theta = 0.25;
  const woman = figure(kit, {
    x: 0.35,
    z: 0.5,
    y: G,
    facing: theta,
    height: 2.4,
    build: "normal",
    skin: 0xc89070,
    hair: { style: "curly", color: 0x3a2a24 },
    face: { mouth: "smirk", brows: "calm" },
    headwear: { kind: "bandana", color: 0xd8402a },
    top: { kind: "shirt", color: 0xe0d6c0, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2f4f8a },
    shoes: 0x3a2c22,
    arms: ["down", [0.26, 1.38, 0.42]],
    legs: "stride",
    delay: 0.9,
  });
  const at = woman.at;
  const turn: Point = [0, theta, 0];
  // The overalls' bib and braces, and the knee pads.
  box(0.46, 0.42, 0.05, 0x2f4f8a, ...at(0, 1.08, 0.25), { delay: 1.3, rotation: turn });
  [-1, 1].forEach((side) => box(0.07, 0.36, 0.04, 0x2f4f8a, ...at(side * 0.16, 1.48, 0.23), { delay: 1.32, rotation: turn }));
  box(0.42, 0.45, 0.04, 0x2f4f8a, ...at(0, 1.08, -0.24), { delay: 1.32, rotation: turn });
  [
    [-0.17, 0.52, 0.23],
    [0.17, 0.48, -0.1],
  ].forEach(([lx, ly, lz], i) => box(0.2, 0.2, 0.06, 0xd8d0b8, ...at(lx, ly, lz + 0.1), { delay: 1.34 + i * 0.02, rotation: turn }));
  // The toolbox, orange and cream.
  const [toolHand] = woman.hands;
  const toolbox = box(0.5, 0.26, 0.24, ORANGE, toolHand[0], toolHand[1] - 0.38, toolHand[2], { delay: 1.4, rotation: turn });
  decorate(toolbox, new BoxGeometry(0.51, 0.08, 0.25), 0xe0d6c0, [[0, 0.22, 0]]);
  decorate(toolbox, new BoxGeometry(0.05, 0.05, 0.01), 0x8a93a3, [
    [-0.16, 0.18, 0.125],
    [0.16, 0.18, 0.125],
  ]);
  box(0.16, 0.12, 0.03, 0x23222b, toolHand[0], toolHand[1] - 0.12, toolHand[2], { delay: 1.42, rotation: turn, noInk: true });
  // The folding ruler, over her left shoulder.
  const low = at(0.28, 1.3, 0.5);
  const high = at(0.4, 2.4, -0.68);
  const { length, rotation } = aim(low, high);
  const ruler = box(0.06, length, 0.02, 0xe8e2d0, ...low, { delay: 1.45, rotation });
  decorate(
    ruler,
    new BoxGeometry(0.062, 0.12, 0.022),
    ORANGE,
    Array.from({ length: Math.floor(length / 0.3) }, (_, k) => [0, 0.15 + k * 0.3, 0] as Point),
  );

  const rest = ghost.map((part) => part.position.clone());
  tick((t) => {
    // The ghost sways over the oven; the clock's hands race; the sideboard rattles now and then.
    const sway = Math.sin(t * 1.3) * 0.06;
    ghost.forEach((part, i) => part.position.set(rest[i].x + sway * (i / 3), rest[i].y + Math.sin(t * 2) * 0.04, rest[i].z));
    minute.rotation.z = -t * 3;
    hour.rotation.z = -t * 0.25 - 1.2;
    board.rotation.z = Math.sin(t * 0.9) > 0.75 ? Math.sin(t * 40) * 0.02 : 0;
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
