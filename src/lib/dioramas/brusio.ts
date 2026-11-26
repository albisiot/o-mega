import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Brusio (P328): the old switchboard operator stands at her exchange under two hanging lamps,
 * headset on, one hand at her temple and the other held out: the murmur of the whole city's
 * thoughts spirals in towards her as little bubbles, while the lamps on the board blink and a
 * handset dangles off the hook. Her swivel chair waits behind her with her walking cane on it.
 */
export function brusio(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WOOD = 0x4a3428;
  const DARK = 0x23222b;
  const BRASS = 0x9a7a3a;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2e2a36, 0x221e2a, 0.35);

  // The switchboard: a wooden cabinet, a black panel of jacks and lamps, a ledge of keys.
  const board = box(2.9, 2.0, 0.35, WOOD, 0, G, -1.4, { delay: 0.1, ink: 1.02 });
  decorate(board, new BoxGeometry(2.7, 1.05, 0.01), 0x14121c, [[0, 1.35, 0.176]]);
  const jacks: Point[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 14; c++) jacks.push([-1.22 + c * 0.188, 1.02 + r * 0.14, 0.18]);
  decorate(board, new CylinderGeometry(0.025, 0.025, 0.01, 10).rotateX(Math.PI / 2), BRASS, jacks);
  const lamps = [YELLOW, CYAN, MAGENTA].map((color, k) => {
    const spots: Point[] = [];
    for (let c = 0; c < 14; c++) if ((c * 5 + k * 3) % 3 === 0) spots.push([-1.22 + c * 0.188, 1.55 + ((c + k) % 2) * 0.16, 0.183]);
    return { material: decorate(board, new BoxGeometry(0.05, 0.05, 0.01), color, spots), color };
  });
  const ledge = box(2.9, 0.07, 0.42, WOOD, 0, G + 0.78, -1.05, { delay: 0.16 });
  decorate(ledge, new CylinderGeometry(0.02, 0.02, 0.05, 8), 0xe8e2d0, [-1.1, -0.9, -0.7, -0.5, 0.5, 0.7].map((x) => [x, 0.09, 0.05] as Point));
  box(2.9, 0.75, 0.06, 0x3e3028, 0, G, -0.86, { delay: 0.14 });
  // Patch cords looping from the jacks down to the ledge.
  [
    [-1.03, 1.16, -0.3, MAGENTA],
    [-0.47, 1.02, 0.4, CYAN],
    [0.28, 1.3, 0.95, YELLOW],
    [0.84, 1.16, 1.2, 0xe0402a],
  ].forEach(([x, y, to, color], i) => cable(kit, [[x, G + y, -1.2], [(x + to) / 2, G + 0.86, -0.98], [to, G + 0.9, -0.9]], 0.014, color, 0.4 + i * 0.05));

  // Two lamps hanging from a rail over the board.
  [-1.4, 1.4].forEach((x) => box(0.05, 1.0, 0.05, DARK, x, G + 2.0, -1.4, { delay: 0.2 }));
  box(2.85, 0.05, 0.05, DARK, 0, G + 3.0, -1.4, { delay: 0.22 });
  const bulbs = [-0.85, 0.85].map((x, k) => {
    box(0.012, 0.42, 0.012, INK, x, G + 2.58, -1.4, { delay: 0.25, noInk: true });
    add(new ConeGeometry(0.2, 0.16, 12, 1, true), 0x2f5a48, x, G + 2.44, -1.4, { delay: 0.28 + k * 0.03 });
    return ball(0.07, YELLOW, x, G + 2.38, -1.4, { delay: 0.3 + k * 0.03, flat: true, noInk: true });
  });

  // The handset off the hook, swinging on its cord below a candlestick phone.
  cylinder(0.07, 0.09, 0.04, DARK, 1.05, G + 0.85, -1.0, { delay: 0.35 }, 12);
  cylinder(0.025, 0.025, 0.3, DARK, 1.05, G + 0.89, -1.0, { delay: 0.37 }, 8);
  add(new CylinderGeometry(0.06, 0.04, 0.08, 10), DARK, 1.05, G + 1.19, -1.0, { delay: 0.39 });
  const pivot: Point = [1.12, G + 0.85, -0.76];
  const cord = add(new BoxGeometry(0.012, 0.35, 0.012), DARK, ...pivot, { delay: 0.42, noInk: true, rotation: [Math.PI, 0, 0] });
  const handset = box(0.05, 0.24, 0.05, DARK, pivot[0], pivot[1] - 0.6, pivot[2], { delay: 0.45 });
  decorate(handset, new CylinderGeometry(0.045, 0.045, 0.05, 10), DARK, [
    [0, 0.02, 0],
    [0, 0.22, 0],
  ]);

  // Her swivel chair, the cane hooked on its back.
  const [cx, cz] = [-1.05, -0.35];
  [0, 1, 2, 3, 4].forEach((k) => {
    const a = (k / 5) * Math.PI * 2;
    box(0.28, 0.04, 0.05, DARK, cx + Math.cos(a) * 0.13, G + 0.04, cz - Math.sin(a) * 0.13, { delay: 0.3, rotation: [0, a, 0] });
  });
  cylinder(0.03, 0.03, 0.45, 0x8a93a3, cx, G + 0.06, cz, { delay: 0.32 }, 8);
  cylinder(0.25, 0.25, 0.08, 0x23404b, cx, G + 0.5, cz, { delay: 0.34 }, 16);
  box(0.42, 0.45, 0.06, 0x23404b, cx - 0.12, G + 0.68, cz - 0.2, { delay: 0.36, rotation: [-0.1, 0.5, 0] });
  limb(kit, [cx + 0.18, G, cz + 0.02], [cx + 0.02, G + 1.1, cz - 0.24], 0.022, 0.022, 0x5e4a3a, { delay: 0.4 });
  add(new TorusGeometry(0.06, 0.022, 6, 12, Math.PI), 0x5e4a3a, cx - 0.04, G + 1.08, cz - 0.27, { delay: 0.42, rotation: [0, 0.5, 0] });

  // Brusio: headset on, a hand at her temple, the other held out to the city.
  const facing = 0.3;
  const H = 2.3;
  const u = H / 2.4;
  const operator = figure(kit, {
    x: 0.25,
    z: 0.15,
    y: G,
    facing,
    height: H,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "bun", color: 0xc8ccd4 },
    face: { mouth: "neutral", brows: "angry", glasses: "square", marks: 0xc09a88 },
    top: { kind: "coat", color: 0xc8901c, accent: 0x2f5a48 },
    bottom: { kind: "skirt", color: 0x23404b },
    shoes: 0x2a2026,
    arms: [[-0.24, 2.05, 0.1], [0.3, 1.6, 0.7]],
    delay: 0.8,
  });
  // The headset: band over the head, ear cups, the mouthpiece on its boom.
  const RH = operator.headRadius;
  const [hx, hy, hz] = operator.head;
  add(new TorusGeometry(RH * 1.24, 0.022, 6, 20, Math.PI), DARK, hx, hy - 0.02, hz, { delay: 1.4, noInk: true, rotation: [0, facing, 0] });
  [-1, 1].forEach((side) => {
    const cup = operator.at(side * (RH * 1.24), 2.14 * u - 0.07, 0.0);
    const part = add(new CylinderGeometry(0.075, 0.075, 0.06, 14).rotateZ(Math.PI / 2), DARK, ...cup, { delay: 1.42, rotation: [0, facing, 0] });
    decorate(part, new TorusGeometry(0.05, 0.012, 5, 14).rotateY(Math.PI / 2), CYAN, [[side * 0.032, 0.075, 0]]);
  });
  const mic = operator.at(0.08, 2.14 * u - 0.14, RH + 0.04);
  limb(kit, operator.at(RH + 0.05, 2.14 * u - 0.03, 0.02), mic, 0.012, 0.012, DARK, { delay: 1.45, noInk: true });
  ball(0.03, DARK, mic[0], mic[1] - 0.03, mic[2], { delay: 1.47 });

  // The city's murmur: bubbles spiralling in from all round to her headset.
  const ear = operator.at(0, 2.14 * u, 0);
  const murmurs = Array.from({ length: 14 }, (_, k) => ({
    part: ball(0.05 + (k % 3) * 0.015, k % 3 === 1 ? CYAN : MAGENTA, ear[0], ear[1], ear[2], { delay: 1.6 + k * 0.03, flat: true, ink: 1.15 }),
    angle: (k / 14) * Math.PI * 2,
    lift: ((k * 7) % 5) * 0.3 - 0.9,
    phase: ((k * 5) % 14) / 14,
  }));

  tick((t) => {
    murmurs.forEach(({ part, angle, lift, phase }) => {
      const s = (t * 0.22 + phase) % 1;
      const r = 1.7 * (1 - s) + 0.2;
      const a = angle + s * 3.5;
      part.position.set(ear[0] + Math.cos(a) * r, ear[1] + lift * (1 - s) - 0.05, ear[2] + Math.sin(a) * r * 0.8);
      part.visible = s < 0.92;
    });
    lamps.forEach(({ material, color }, k) => material.color.setHex(Math.floor(t * 3 + k * 2) % 5 === 4 ? 0x2a2830 : color));
    const swing = Math.sin(t * 1.3) * 0.3;
    cord.rotation.set(Math.PI, 0, swing);
    handset.position.set(pivot[0] - Math.sin(swing) * 0.35, pivot[1] - Math.cos(swing) * 0.35 - 0.26, pivot[2]);
    bulbs.forEach((bulb, k) => (bulb.visible = Math.floor(t * 5 + k * 7) % 41 !== 30));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
