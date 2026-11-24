import { BoxGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, archMouth, archedWall, cable, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor } from "@/lib/diorama-props";

/**
 * Sibilla (P103): the oracle grown inside the temple's servers. A giant golden face floats in the
 * hall of columns, her hair a mane of cables plugged into the stone and the racks, haloes
 * turning round her and her eyes lit cyan. She already knows the question, but in front of
 * her a visitor checks his watch while the loading wheel goes round and round: she can't move
 * an inch, and the answer is late.
 */
export function sibilla(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const STONE = 0x6a7390;
  const GOLD = 0xd8b04a;
  const GOLD_DARK = 0x9a7428;
  const RACK = 0x1e2230;
  const WIRE = 0x1d5a66;
  const F = octagonBase(kit, 0x1c1e28);
  const G = floor(kit, F, 0.06, 0x2a2c3a, 0x1a1c26, 0.5);

  // The innermost hall of the temple: an arch into the dark, two cracked columns with sockets.
  const arch = archedWall(2.1, 2.5, 0.3, { x: 0, half: 0.42, spring: 0.95 });
  const wall = add(arch, STONE, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(2.1, 0.05, 0.01), 0x4e566e, [
    [0, 0.6, 0.151],
    [0, 1.95, 0.151],
  ]);
  add(archMouth(0.42, 0.95), 0x0c0e16, 0, G, -1.66, { delay: 0.12, noInk: true });
  [-1, 1].forEach((side, i) => {
    const [, shaft] = column(kit, side * 1.4, -0.85, G, 0.16 + i * 0.04, 2.5, false, 0x8a94a8);
    decorate(shaft, new BoxGeometry(0.014, 0.4, 0.01), INK, [
      [side * -0.05, 0.6, 0.19, 0.5],
      [side * 0.04, 1.5, 0.19, -0.4],
      [0, 1.8, 0.19, 0.3],
    ]);
    decorate(shaft, new BoxGeometry(0.06, 0.06, 0.04), CYAN, [
      [side * -0.12, 1.25, 0.15],
      [side * -0.14, 1.55, 0.12],
    ]);
  });

  // Server racks between the columns, their lights blinking.
  const leds = [0, 1].map(() => [] as Point[]);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) leds[(r + c) % 2].push([-0.14 + c * 0.14, 0.18 + r * 0.15, 0.226]);
  const racks: [number, number, number][] = [
    [-1.55, 0.15, 0.45],
    [1.6, 0.2, -0.45],
  ];
  const lights = racks.map(([x, z, turn], i) => {
    const rack = box(0.5, 1.1, 0.45, RACK, x, G, z, { delay: 0.3 + i * 0.05, rotation: [0, turn, 0] });
    decorate(rack, new BoxGeometry(0.46, 0.012, 0.01), 0x343a4e, Array.from({ length: 6 }, (_, k) => [0, 0.1 + k * 0.15, 0.226] as Point));
    return leds.map((spots, k) => decorate(rack, new BoxGeometry(0.08, 0.025, 0.01), k ? CYAN : 0x2a6f80, spots));
  });

  // Her face, a golden mask floating in the middle of the hall.
  const HX = 0;
  const HY = G + 2.45;
  const HZ = -0.35;
  const head = add(new SphereGeometry(0.55, 24, 18).scale(0.86, 1.08, 0.7), GOLD, HX, HY - 0.594, HZ, { delay: 0.6 });
  const c = 0.594;
  decorate(head, new SphereGeometry(0.085, 12, 8).scale(1.5, 0.8, 0.3), 0x6a4c1c, [
    [-0.16, c + 0.08, 0.345],
    [0.16, c + 0.08, 0.345],
  ]);
  const eyes = decorate(head, new SphereGeometry(0.07, 12, 8).scale(1.35, 0.5, 0.35), CYAN, [
    [-0.16, c + 0.08, 0.352],
    [0.16, c + 0.08, 0.352],
  ]);
  decorate(head, new BoxGeometry(0.17, 0.028, 0.03), GOLD_DARK, [
    [-0.16, c + 0.17, 0.34, 0.12],
    [0.16, c + 0.17, 0.34, -0.12],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.2, 0.08), 0xc89a3a, [[0, c - 0.02, 0.37]]);
  decorate(head, new BoxGeometry(0.16, 0.045, 0.03), 0x8a5a24, [[0, c - 0.2, 0.36]]);
  decorate(head, new BoxGeometry(0.012, 0.22, 0.01), INK, [
    [-0.27, c - 0.1, 0.27, 0.4],
    [0.22, c + 0.3, 0.28, -0.3],
    [0.08, c - 0.3, 0.33, 0.2],
  ]);
  // Her hair: cables from the top and back of her head, out and down into the columns, the racks
  // and the floor.
  const ends: Point[] = [
    [1.26, G + 2.0, -0.76],
    [1.26, G + 1.7, -0.76],
    [1.26, G + 1.35, -0.76],
    [1.52, G + 1.1, 0.14],
    [1.44, G + 1.1, 0.3],
    [0.95, G + 0.03, -0.35],
    [0.6, G + 0.03, -0.75],
    [0.85, G + 0.03, 0.2],
  ];
  for (let k = 0; k < 16; k++) {
    const side = k % 2 ? 1 : -1;
    const j = Math.floor(k / 2);
    const [ex, ey, ez] = ends[j];
    const end: Point = [side * ex, ey, ez];
    const from: Point = [HX + side * (0.12 + 0.035 * j), HY + 0.5 - j * 0.11, HZ - 0.18];
    const out: Point = [HX + side * (0.5 + 0.05 * j), from[1] + 0.12 - j * 0.04, HZ - 0.32];
    const fall: Point = [(out[0] + end[0]) / 2 + side * 0.15, (out[1] + end[1]) / 2 + 0.1, (out[2] + end[2]) / 2];
    cable(kit, [from, out, fall, end], 0.022, j % 3 ? WIRE : 0x2a8fa0, 0.8 + k * 0.02);
    ball(0.042, CYAN, end[0], end[1] - 0.042, end[2], { delay: 1.2 + k * 0.02, flat: true, noInk: true });
  }

  // Two haloes, tilted, turning round her.
  const haloes = [0.32, -0.42].map((tilt, k) =>
    add(new TorusGeometry(0.85 + k * 0.12, 0.014, 6, 48).rotateX(Math.PI / 2 + tilt), k ? YELLOW : 0xffe9a0, HX, HY - (0.85 + k * 0.12) * Math.sin(Math.abs(tilt)) - 0.014, HZ, {
      delay: 1.3 + k * 0.08,
      flat: true,
      noInk: true,
    }),
  );

  // The loading wheel under her chin: one light chasing round.
  const wheel: Point = [0, G + 1.5, -0.05];
  const across: Point = [Math.cos(0.35), 0, -Math.sin(0.35)];
  const dots = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    return box(0.08, 0.08, 0.08, 0x2f5a6a, wheel[0] + across[0] * Math.sin(a) * 0.21, wheel[1] - 0.04 + Math.cos(a) * 0.21, wheel[2] + across[2] * Math.sin(a) * 0.21, {
      delay: 1.5 + k * 0.02,
      flat: true,
      rotation: [0, 0.35, 0],
    });
  });

  // The visitor, small under her, checking his watch.
  const visitor = figure(kit, {
    x: 1.3,
    z: 0.95,
    y: G,
    facing: 0.05,
    height: 1.95,
    build: "normal",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "frown", brows: "angry" },
    headwear: { kind: "cap", color: MAGENTA, accent: 0x9a1c44 },
    top: { kind: "jacket", color: 0x8a2050, accent: 0xe8e2d0 },
    bottom: { kind: "trousers", color: 0x23283a },
    shoes: 0xe0dccf,
    arms: ["hip", [0.12, 1.42, 0.34]],
    delay: 1.6,
  });
  const watch = visitor.hands[1];
  box(0.08, 0.06, 0.08, CYAN, watch[0] + 0.01, watch[1] - 0.12, watch[2] - 0.04, { delay: 2.1, flat: true, rotation: [0, 0.05, 0] });

  const lit = [CYAN, 0x2a6f80];
  tick((t) => {
    const on = Math.floor(t * 8) % 8;
    dots.forEach((dot, k) => colorOf(dot).set(k === on ? 0xe8fbff : k === (on + 7) % 8 ? CYAN : k === (on + 6) % 8 ? 0x2a8fa0 : 0x2f5a6a));
    haloes.forEach((halo, k) => (halo.rotation.y = t * (k ? -0.5 : 0.7)));
    eyes.color.set(Math.sin(t * 2) > 0.9 ? 0xe8fbff : CYAN);
    lights.forEach((pair, i) => pair.forEach((material, k) => material.color.set(lit[(Math.floor(t * 2 + i) + k) % 2])));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
