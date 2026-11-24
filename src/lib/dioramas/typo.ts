import { BoxGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Typo (P024): the Compagnia Lete's bungling apprentice in the control room of a substation, hair
 * on end, goggles pushed up, a terrified grin, clutching a box of buttons that crackles with
 * sparks. He has pressed everything: the console behind him blinks at random, its gauges swing
 * and one panel has already blown open, smoking and spitting sparks.
 */
export function typo(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const PANEL = 0x2a3040;
  const STEEL = 0x4a4f5c;
  const F = octagonBase(kit, 0x1c1e28);
  const G = floor(kit, F, 0.06, 0x2a2d3a, 0x1e2029, 0.45);

  // The console: an upright board of screens, dials and buttons, a desk of buttons below.
  const board = box(3.1, 2.3, 0.35, PANEL, 0, G, -1.25, { delay: 0.1, ink: 1.02 });
  const face = 0.176;
  decorate(board, new BoxGeometry(0.6, 0.4, 0.01), 0x0b3d50, [
    [-1.0, 1.85, face],
    [0.1, 1.85, face],
  ]);
  decorate(board, new BoxGeometry(0.5, 0.02, 0.01), CYAN, [
    [-1.0, 1.8, face + 0.002, 0.3],
    [0.1, 1.9, face + 0.002, -0.2],
  ]);
  const grid = (x0: number, y0: number, offset: number): Point[] =>
    [0, 1, 2].flatMap((r) => [0, 1, 2, 3].filter((c) => (r + c + offset) % 3 === 0).map((c) => [x0 + c * 0.13, y0 + r * 0.13, face] as Point));
  const lights = [MAGENTA, CYAN, YELLOW].map((color, k) => decorate(board, new BoxGeometry(0.07, 0.07, 0.02), color, [...grid(-1.2, 0.95, k), ...grid(-0.1, 0.95, k + 1)]));
  // Two gauges with swinging needles.
  const needles: Group[] = [];
  [0.75, 1.2].forEach((x, k) => {
    decorate(board, new CylinderGeometry(0.17, 0.17, 0.01, 20).rotateX(Math.PI / 2), 0xd8d2c4, [[x, 1.75, face]]);
    decorate(board, new TorusGeometry(0.17, 0.02, 6, 20), INK, [[x, 1.75, face + 0.004]]);
    needles.push(box(0.018, 0.14, 0.01, MAGENTA, x, G + 1.75, -1.25 + face + 0.012, { delay: 0.4 + k * 0.05, flat: true, noInk: true }));
  });
  // The panel that blew: a black hole, scorch, smoke and sparks.
  decorate(board, new BoxGeometry(0.55, 0.5, 0.01), 0x0e0c12, [[0.95, 0.95, face]]);
  decorate(board, new BoxGeometry(0.75, 0.08, 0.01), 0x14121c, [
    [0.95, 1.25, face - 0.002, 0.4],
    [0.9, 0.7, face - 0.002, -0.3],
  ]);
  const smoke = [0, 1, 2].map((k) => ball(0.14, 0x4a4a5a, 0, 0, 0, { delay: 0.6 + k * 0.05, noInk: true }));
  const panelSparks = [0, 1].map((k) => zigzag(kit, jag([0.8 + k * 0.2, G + 1.0, -1.05], [0.95 + k * 0.25, G + 1.45, -0.95], 4, 0.06, k + 3), 0.016, k ? CYAN : MAGENTA, 0.7));
  const desk = box(2.8, 0.85, 0.45, STEEL, 0, G, -0.82, { delay: 0.2 });
  decorate(desk, new BoxGeometry(0.06, 0.02, 0.06), YELLOW, [-1.1, -0.8, -0.5, 0.4, 0.7, 1.0].map((x) => [x, 0.86, 0.05] as Point));
  // Hazard stripes on the floor in front of it.
  const tape = box(2.6, 0.01, 0.14, YELLOW, 0, G, -0.45, { delay: 0.3, flat: true, noInk: true });
  decorate(tape, new BoxGeometry(0.05, 0.012, 0.2), INK, Array.from({ length: 13 }, (_, i) => [-1.2 + i * 0.2, 0.004, 0] as Point));

  // Typo: wild hair, goggles up on his forehead, a lab coat, a terrified grin.
  const apprentice = figure(kit, {
    x: 0.05,
    z: 0.45,
    y: G,
    facing: 0.35,
    height: 2.35,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "wild", color: 0x6a2a5a },
    face: { mouth: "grin", brows: "worried", marks: 0x6a5050 },
    top: { kind: "coat", color: 0x8a9ab0, accent: 0xa8b8c8 },
    bottom: { kind: "trousers", color: 0x2a3040 },
    shoes: 0x2a2622,
    arms: [
      [-0.24, 1.32, 0.52],
      [0.24, 1.32, 0.52],
    ],
    delay: 0.8,
  });
  const RH = apprentice.headRadius;
  const headY = apprentice.head[1] - G;
  const turn: Point = [0, 0.35, 0];
  const band = apprentice.at(0, headY + RH * 0.62, -0.02);
  add(new TorusGeometry(RH * 0.92, 0.025, 6, 20).rotateX(Math.PI / 2), INK, band[0], band[1], band[2], { delay: 1.4, rotation: turn });
  [-1, 1].forEach((side) => {
    const lens = apprentice.at(side * 0.09, headY + RH * 0.72, RH * 0.8);
    const goggle = add(new CylinderGeometry(0.065, 0.065, 0.05, 14).rotateX(Math.PI / 2), INK, lens[0], lens[1] - 0.065, lens[2], { delay: 1.45 });
    goggle.rotation.order = "YXZ";
    goggle.rotation.set(-0.6, 0.35, 0);
    decorate(goggle, new CylinderGeometry(0.05, 0.05, 0.01, 14).rotateX(Math.PI / 2), 0x7fdfff, [[0, 0.065, 0.026]]);
  });

  // The box in his hands: buttons on top, sparks crackling over it.
  const middle = apprentice.at(0, 1.22, 0.56);
  const gadget = box(0.52, 0.2, 0.32, 0x5a5f6c, middle[0], middle[1], middle[2], { delay: 1.3, rotation: turn });
  decorate(gadget, new CylinderGeometry(0.035, 0.035, 0.03, 10), MAGENTA, [
    [-0.16, 0.21, 0.06],
    [0.0, 0.21, -0.06],
  ]);
  decorate(gadget, new CylinderGeometry(0.035, 0.035, 0.03, 10), CYAN, [
    [-0.06, 0.21, 0.08],
    [0.14, 0.21, 0.05],
  ]);
  decorate(gadget, new CylinderGeometry(0.06, 0.06, 0.04, 12), YELLOW, [[0.12, 0.22, -0.07]]);
  const top = middle[1] + 0.24;
  const arcs = [0, 1, 2, 3].map((k) =>
    zigzag(kit, jag([middle[0] - 0.2 + k * 0.12, top, middle[2]], [middle[0] - 0.1 + k * 0.1, top + 0.35 + (k % 2) * 0.1, middle[2] + 0.05], 4, 0.05, k), 0.014, k % 2 ? CYAN : MAGENTA, 1.6),
  );
  // Cables from the box back to the console.
  cable(kit, [[middle[0] - 0.2, middle[1] + 0.05, middle[2] - 0.15], [-0.6, G + 0.05, 0.2], [-0.9, G + 0.05, -0.55], [-1.0, G + 0.5, -0.6]], 0.025, MAGENTA, 1.2);
  cable(kit, [[middle[0] + 0.2, middle[1] + 0.05, middle[2] - 0.15], [0.7, G + 0.05, 0.3], [1.0, G + 0.05, -0.4], [0.9, G + 0.5, -0.6]], 0.025, CYAN, 1.25);

  tick((t) => {
    // Random blinking, swinging needles, crackling sparks, smoke from the blown panel.
    lights.forEach((material, k) => (material.visible = Math.floor(t * 6 + k * 2.3) % 3 !== 0));
    needles.forEach((needle, k) => (needle.rotation.z = Math.sin(t * (3 + k * 2.2)) * 1.1 + (k ? 0.4 : -0.4)));
    const flicker = Math.floor(t * 10);
    arcs.forEach((arc, k) => arc.forEach((bar) => (bar.visible = (flicker + k) % 4 !== 0)));
    panelSparks.forEach((spark, k) => spark.forEach((bar) => (bar.visible = (flicker + k * 3) % 5 < 3)));
    smoke.forEach((puff, k) => {
      const v = (t * 0.3 + k / 3) % 1;
      puff.position.set(0.95 + Math.sin(v * 5 + k) * 0.1, G + 1.15 + v * 1.4, -0.95 + v * 0.3);
      puff.children[0].scale.setScalar(0.5 + v * 1.2);
      puff.visible = v < 0.9;
    });
  });

  return { width: 4.9, height: 4.2, lookY: 1.4 };
}
