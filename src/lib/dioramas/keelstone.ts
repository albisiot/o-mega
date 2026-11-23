import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  SphereGeometry,
} from "three";
import {
  YELLOW,
  ORANGE,
  CYAN,
  INK,
  colorOf,
  octagonBase,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/**
 * Keelstone (P055): he stands before the temple door, arms crossed, and no one gets past.
 * The price of his gift shows at his feet: the hem of his robe has turned to stone and roots
 * him to the paving, because from there he does not move.
 */
export function keelstone(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x2f3a4c;
  const TILE_A = 0x56667e;
  const TILE_B = 0x4a5970;
  const STEP = 0x5a7590;
  const STEP_LIGHT = 0x6a87a2;
  const WALL = 0x456580;
  const WALL_LIGHT = 0x587b97;
  const COLUMN = 0x7c9cb4;
  const COLUMN_LIGHT = 0x94b3c8;
  const SKIN = 0xd2ccbd;
  const SKIN_DARK = 0x9d978a;
  const ROBE = 0x1d5662;
  const ROBE_LIGHT = 0x2c7c86;
  const HAIR = 0x9c978d;
  const BEARD = 0xb9b4a8;
  const DOOR_LIGHT = 0xfff1b8;

  octagonBase(kit, SLAB);
  const FLOOR = 0.12;
  // Paving in front of the temple, one slab missing.
  [-1.1, -0.37, 0.37, 1.1].forEach((x, column) =>
    [0.3, 1.02].forEach((z, row) => {
      if (column === 3 && row === 1) return;
      const turn = ((column * 7 + row * 3) % 5) * 0.012 - 0.024;
      box(0.68, 0.02, 0.68, (column + row) % 2 ? TILE_A : TILE_B, x, 0.1, z, {
        delay: 0.1 + (column + row) * 0.03,
        noInk: true,
        rotation: [0, turn, 0],
      });
    }),
  );

  // The temple: two steps, the wall with its door, two columns and the pediment.
  box(3.3, 0.15, 1.2, STEP, 0, 0.1, -0.95, { delay: 0.14, ink: 1.02 });
  box(2.9, 0.15, 0.95, STEP_LIGHT, 0, 0.25, -1.07, { delay: 0.2, ink: 1.02 });
  const TOP = 0.4;
  [-1, 1].forEach((x, i) => box(0.85, 2.62, 0.38, WALL, x, TOP, -1.3, { delay: 0.26 + i * 0.05, ink: 1.03 }));
  box(1.2, 0.57, 0.38, WALL_LIGHT, 0, 2.45, -1.3, { delay: 0.36, ink: 1.03 });
  // The light behind the door, brighter at its heart, and the light it throws down the steps.
  const doorway = box(1.15, 2.05, 0.04, YELLOW, 0, TOP, -1.32, { delay: 0.4, flat: true, noInk: true });
  const heart = box(0.66, 1.55, 0.04, DOOR_LIGHT, 0, TOP + 0.12, -1.29, { delay: 0.44, flat: true, noInk: true });
  box(1.05, 0.012, 0.42, 0xffe27a, 0, TOP, -0.82, { delay: 0.48, flat: true, noInk: true });
  box(1.15, 0.012, 0.22, 0xffe9a0, 0, 0.25, -0.46, { delay: 0.5, flat: true, noInk: true });
  [-0.64, 0.64].forEach((x, i) => box(0.12, 2.15, 0.06, WALL_LIGHT, x, TOP, -1.08, { delay: 0.42 + i * 0.03, ink: 1.04 }));
  box(1.4, 0.12, 0.06, WALL_LIGHT, 0, 2.5, -1.08, { delay: 0.47, ink: 1.04 });
  const glowFrom = new Color(YELLOW);
  const glowTo = new Color(ORANGE);
  const heartFrom = new Color(DOOR_LIGHT);
  const heartTo = new Color(YELLOW);
  tick((t) => {
    const k = (Math.sin(t * 1.6) + 1) / 2;
    colorOf(doorway).lerpColors(glowFrom, glowTo, k * 0.55);
    colorOf(heart).lerpColors(heartFrom, heartTo, k * 0.7);
  });

  [-1.2, 1.2].forEach((x, i) => {
    const wait = 0.5 + i * 0.06;
    box(0.46, 0.1, 0.46, COLUMN_LIGHT, x, TOP, -0.82, { delay: wait });
    const shaft = cylinder(0.17, 0.2, 2.3, COLUMN, x, TOP + 0.1, -0.82, { delay: wait + 0.04 }, 10);
    // Flutes down the shaft, and a crack across the right one.
    decorate(
      shaft,
      new BoxGeometry(0.025, 2.1, 0.01),
      0x56748c,
      [-0.36, 0, 0.36].map((angle) => [Math.sin(angle) * 0.19, 1.15, Math.cos(angle) * 0.19, 0] as [number, number, number, number]),
    );
    if (i === 1) decorate(shaft, new BoxGeometry(0.015, 0.3, 0.012), INK, [[0.05, 1.25, 0.19, 0.6], [-0.04, 1.05, 0.2, -0.4]]);
    cylinder(0.26, 0.19, 0.1, COLUMN_LIGHT, x, TOP + 2.4, -0.82, { delay: wait + 0.1 }, 10);
    box(0.52, 0.12, 0.52, COLUMN_LIGHT, x, TOP + 2.5, -0.82, { delay: wait + 0.12 });
  });
  const LINTEL = TOP + 2.62;
  const entablature = box(3, 0.3, 0.8, WALL_LIGHT, 0, LINTEL, -1.02, { delay: 0.68 });
  // A frieze of cyan stones along its front.
  decorate(
    entablature,
    new BoxGeometry(0.1, 0.1, 0.02),
    CYAN,
    Array.from({ length: 11 }, (_, i) => [-1.3 + i * 0.26, 0.15, 0.41] as [number, number, number]),
  );
  const pediment = new CylinderGeometry(1, 1, 0.74, 3);
  pediment.rotateX(Math.PI / 2);
  pediment.rotateZ(Math.PI);
  pediment.scale(1.73, 0.37, 1);
  add(pediment, STEP_LIGHT, 0, LINTEL + 0.3, -1.02, { delay: 0.74 });

  // Rubble: a fallen column drum and two blocks.
  add(new CylinderGeometry(0.19, 0.19, 0.55, 10).rotateZ(Math.PI / 2), COLUMN, 1.62, 0.1, 0.55, {
    delay: 0.8,
    rotation: [0, 0.7, 0],
  });
  box(0.3, 0.22, 0.26, WALL, -1.75, 0.1, 0.4, { delay: 0.84, rotation: [0, 0.4, 0] });
  box(0.2, 0.14, 0.18, WALL_LIGHT, -1.55, 0.1, 1.2, { delay: 0.88, rotation: [0.1, -0.3, 0.12] });

  // Keelstone, a little taller than the door behind him.
  const z0 = 0.45;
  const F = FLOOR;
  const D = 0.95;
  const robe = (top: number, bottom: number, h: number) => new CylinderGeometry(top, bottom, h, 18).scale(1, 1, 0.78);
  // The stone hem and the roots it sends into the paving.
  add(robe(0.6, 0.66, 0.16), SKIN_DARK, 0, F, z0, { delay: D });
  [0.35, 1.25, 2.2, 3.3, 4.3, 5.3].forEach((angle, i) => {
    const length = 0.42 + (i % 3) * 0.1;
    const reach = 0.55 + length / 2;
    box(length, 0.05, 0.11, SKIN_DARK, Math.cos(angle) * reach, F, z0 + Math.sin(angle) * reach * 0.8, {
      delay: D + 1 + i * 0.06,
      ink: 1.08,
      rotation: [0, -angle, 0],
    });
  });
  [
    [-0.85, 0.95, 0.5],
    [0.9, 1.15, -0.7],
    [0.2, 1.3, 0.2],
  ].forEach(([x, z, angle], i) =>
    box(0.32, 0.01, 0.025, INK, x, F + 0.005, z, { delay: D + 1.2 + i * 0.05, flat: true, noInk: true, rotation: [0, angle, 0] }),
  );
  [-0.17, 0.17].forEach((x, i) => box(0.18, 0.1, 0.26, SKIN, x, F, z0 + 0.5, { delay: D + 0.02 + i * 0.02 }));
  add(robe(0.46, 0.6, 1.05), ROBE, 0, F + 0.14, z0, { delay: D + 0.06 });
  add(robe(0.6, 0.46, 0.85), ROBE, 0, F + 1.15, z0, { delay: D + 0.12 });
  // The himation across his chest, from the right hip to the left shoulder.
  box(0.26, 1.3, 0.06, ROBE_LIGHT, 0.36, F + 0.95, z0 + 0.33, { delay: D + 0.18, rotation: [0.1, 0, 0.62] });
  [-1, 1].forEach((side, i) => {
    ball(0.27, ROBE, side * 0.56, F + 1.6, z0, { delay: D + 0.2 + i * 0.03 });
    cylinder(0.15, 0.17, 0.62, ROBE, side * 0.68, F + 1.3, z0 + 0.16, { delay: D + 0.24 + i * 0.03, rotation: [-0.3, 0, side * 0.12] });
  });
  // The forearms crossed in front of his chest, stone and cracked, each hand on the other arm.
  const forearm = (x: number, y: number, z: number, lean: number, wait: number) => {
    const part = add(new CylinderGeometry(0.12, 0.13, 1.16, 12).rotateZ(Math.PI / 2), SKIN, x, y, z, {
      delay: D + wait,
      rotation: [0, 0, lean],
    });
    decorate(part, new BoxGeometry(0.012, 0.16, 0.012), INK, [
      [-0.25, 0.13, 0.12, 0.5],
      [0.1, 0.14, 0.125, -0.7],
      [0.32, 0.12, 0.12, 0.3],
    ]);
  };
  forearm(0.08, F + 1.3, z0 + 0.46, 0.05, 0.32);
  ball(0.13, SKIN, -0.52, F + 1.27, z0 + 0.46, { delay: D + 0.36 });
  forearm(-0.08, F + 1.44, z0 + 0.54, -0.05, 0.38);
  ball(0.13, SKIN, 0.52, F + 1.41, z0 + 0.52, { delay: D + 0.42 });

  cylinder(0.14, 0.16, 0.22, SKIN, 0, F + 1.95, z0, { delay: D + 0.44 });
  const head = add(new SphereGeometry(0.27, 18, 14).scale(0.95, 1.1, 0.95), SKIN, 0, F + 2.08, z0, { delay: D + 0.48 });
  const face = 0.25;
  // Eyes under a heavy brow, and the cracks of his stone face.
  decorate(head, new BoxGeometry(0.3, 0.055, 0.05), SKIN_DARK, [[0, 0.36, face - 0.01]]);
  decorate(head, new BoxGeometry(0.07, 0.035, 0.02), INK, [
    [-0.09, 0.32, face + 0.005],
    [0.09, 0.32, face + 0.005],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.11, 0.06), SKIN_DARK, [[0, 0.27, face]]);
  decorate(head, new BoxGeometry(0.012, 0.14, 0.012), INK, [
    [0.16, 0.42, 0.19, 0.5],
    [-0.15, 0.24, 0.205, -0.3],
  ]);
  add(new SphereGeometry(0.23, 16, 12).scale(1.05, 1.25, 0.8), BEARD, 0, F + 1.8, z0 + 0.13, { delay: D + 0.54 });
  box(0.28, 0.06, 0.07, BEARD, 0, F + 2.3, z0 + 0.24, { delay: D + 0.56 });
  // Grey curls on top and behind.
  const centre = F + 2.08 + 0.297;
  [
    [0, 0.27, -0.02],
    [-0.16, 0.2, -0.12],
    [0.16, 0.2, -0.12],
    [-0.25, 0.04, -0.08],
    [0.25, 0.04, -0.08],
    [-0.11, 0.1, -0.24],
    [0.11, 0.1, -0.24],
    [0, -0.02, -0.27],
    [-0.13, 0.24, 0.1],
    [0.13, 0.24, 0.1],
  ].forEach(([x, y, z], i) => ball(0.095, HAIR, x, centre + y - 0.095, z0 + z, { delay: D + 0.58 + i * 0.02, ink: 1.1 }));

  // Specks of light drifting out of the door.
  motes(12, YELLOW, 0.035, [-0.55, TOP + 0.1, -1.15], [0.55, TOP + 2.2, -0.35], 1.2);

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
