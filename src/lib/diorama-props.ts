import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, type Kit, type Point } from "@/lib/diorama-kit";
import { shade } from "@/lib/diorama-figure";

// Ready-made pieces of Nuova Megara for the characters' dioramas: street furniture, house
// fronts, ruins, the market, the port, the skyline and the volcano. Each takes the kit, a place
// and a delay (seconds before it pops in), and returns its parts. Ground height `y` is where the
// piece stands (the base's slab is at 0.1). Facing turns a piece about the vertical (0: its
// front looks at the camera at rest, along +z).

const DARK = 0x23222b;
const STONE = 0x5d6680;
const STONE_DARK = 0x46506a;
const WOOD = 0x5e4a3a;
const WOOD_DARK = 0x3e3028;
const LEAF = 0x2f8f4f;
const ORANGE_LIGHT = 0xffa630;

/** Turns a point (dx, dz) about (x, z) by `facing`. */
function around(x: number, z: number, dx: number, dz: number, facing: number): [number, number] {
  const c = Math.cos(facing);
  const s = Math.sin(facing);
  return [x + dx * c + dz * s, z - dx * s + dz * c];
}

/** A street lamp; returns its lit head, e.g. to make it flicker. */
export function lamp(kit: Kit, x: number, z: number, y: number, delay: number, height = 2.2, light = YELLOW): Group {
  kit.cylinder(0.035, 0.05, height, DARK, x, y, z, { delay }, 8);
  kit.box(0.32, 0.04, 0.04, DARK, x + 0.13, y + height - 0.04, z, { delay: delay + 0.04 });
  kit.add(new ConeGeometry(0.11, 0.1, 6).rotateX(Math.PI), DARK, x + 0.26, y + height - 0.12, z, { delay: delay + 0.06 });
  return kit.box(0.14, 0.12, 0.14, light, x + 0.26, y + height - 0.26, z, { delay: delay + 0.08, flat: true });
}

/** A wooden bench with iron legs. */
export function bench(kit: Kit, x: number, z: number, y: number, delay: number, facing = 0): Group[] {
  const rot: [number, number, number] = [0, facing, 0];
  const parts = [-0.4, 0.4].map((dx) => {
    const [px, pz] = around(x, z, dx, 0, facing);
    return kit.box(0.05, 0.3, 0.32, DARK, px, y, pz, { delay, rotation: rot });
  });
  parts.push(kit.box(1, 0.05, 0.34, WOOD, x, y + 0.3, z, { delay: delay + 0.05, rotation: rot }));
  const [bx, bz] = around(x, z, 0, -0.17, facing);
  parts.push(kit.box(1, 0.28, 0.04, WOOD, bx, y + 0.36, bz, { delay: delay + 0.08, rotation: [-0.15, facing, 0] }));
  return parts;
}

/** A wooden crate, or a stack of them. */
export function crate(kit: Kit, x: number, z: number, y: number, delay: number, size = 0.4, color = WOOD, turn = 0): Group {
  const part = kit.box(size, size, size, color, x, y, z, { delay, rotation: [0, turn, 0] });
  kit.decorate(part, new BoxGeometry(size * 0.9, size * 0.08, 0.01), WOOD_DARK, [
    [0, size * 0.3, size / 2 + 0.002],
    [0, size * 0.7, size / 2 + 0.002],
  ]);
  return part;
}

/** A metal drum. */
export function barrel(kit: Kit, x: number, z: number, y: number, delay: number, color = 0x2f6f86): Group {
  const part = kit.cylinder(0.2, 0.2, 0.5, color, x, y, z, { delay }, 14);
  kit.decorate(part, new TorusGeometry(0.2, 0.015, 6, 18).rotateX(Math.PI / 2), shade(color, 0.6), [
    [0, 0.12, 0],
    [0, 0.38, 0],
  ]);
  return part;
}

/** A tree: a trunk and a round crown of two or three balls. */
export function tree(kit: Kit, x: number, z: number, y: number, delay: number, height = 1.8, leaf = LEAF): Group[] {
  const parts = [kit.cylinder(0.07, 0.1, height * 0.55, WOOD, x, y, z, { delay }, 8)];
  const top = y + height * 0.5;
  [
    [0, 0.15, 0, 0.42],
    [-0.22, 0, 0.05, 0.3],
    [0.22, 0.02, -0.04, 0.32],
  ].forEach(([dx, dy, dz, r], i) => parts.push(kit.ball(r * (height / 1.8), shade(leaf, 1 - i * 0.12), x + dx, top + dy, z + dz, { delay: delay + 0.08 + i * 0.04 })));
  return parts;
}

/** A plant in a terracotta pot. */
export function potted(kit: Kit, x: number, z: number, y: number, delay: number, leaf = LEAF): Group[] {
  return [
    kit.cylinder(0.14, 0.1, 0.22, 0xb0603a, x, y, z, { delay }, 10),
    kit.ball(0.2, leaf, x, y + 0.18, z, { delay: delay + 0.05 }),
  ];
}

/**
 * A house front: a wall facing +z with rows of windows (lit or dark, with shutters), a door
 * and an optional balcony. `width` along x, `height` up, a thin depth behind it.
 */
export function facade(
  kit: Kit,
  x: number,
  z: number,
  y: number,
  delay: number,
  options: { width: number; height: number; color: number; windows?: number; floors?: number; door?: boolean; balcony?: boolean; lit?: number; shutters?: number; depth?: number },
): Group {
  const { width, height, color } = options;
  const depth = options.depth ?? 0.3;
  const wall = kit.box(width, height, depth, color, x, y, z, { delay, ink: 1.02 });
  const columns = options.windows ?? Math.max(1, Math.floor(width / 0.6));
  const floors = options.floors ?? Math.max(1, Math.floor((height - 0.5) / 0.75));
  const lit = options.lit ?? YELLOW;
  const shutters = options.shutters ?? 0x2f6f60;
  const panes: Point[] = [];
  const dark: Point[] = [];
  const blinds: Point[] = [];
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < columns; c++) {
      const wx = -width / 2 + (width / columns) * (c + 0.5);
      const wy = 0.55 + f * ((height - 0.5) / floors) + 0.2;
      if (options.door && f === 0 && c === Math.floor(columns / 2)) continue;
      ((f * 3 + c * 7) % 4 === 0 ? dark : panes).push([wx, wy, depth / 2 + 0.005]);
      blinds.push([wx - 0.13, wy, depth / 2 + 0.006], [wx + 0.13, wy, depth / 2 + 0.006]);
    }
  }
  if (panes.length) kit.decorate(wall, new BoxGeometry(0.16, 0.24, 0.01), lit, panes);
  if (dark.length) kit.decorate(wall, new BoxGeometry(0.16, 0.24, 0.01), 0x141a26, dark);
  kit.decorate(wall, new BoxGeometry(0.07, 0.26, 0.012), shutters, blinds);
  if (options.door) kit.decorate(wall, new BoxGeometry(0.32, 0.55, 0.012), shade(color, 0.45), [[-width / 2 + (width / columns) * (Math.floor(columns / 2) + 0.5), 0.275, depth / 2 + 0.006]]);
  if (options.balcony) {
    kit.box(width * 0.5, 0.05, 0.25, shade(color, 0.7), x, y + 1.2, z + depth / 2 + 0.12, { delay: delay + 0.1 });
    kit.box(width * 0.5, 0.22, 0.02, DARK, x, y + 1.25, z + depth / 2 + 0.24, { delay: delay + 0.12, noInk: true });
  }
  return wall;
}

/** A Greek column; `broken` cuts it short with a jagged top and no capital. */
export function column(kit: Kit, x: number, z: number, y: number, delay: number, height = 2.2, broken = false, color = 0x7c9cb4): Group[] {
  const parts = [kit.box(0.46, 0.1, 0.46, shade(color, 1.15), x, y, z, { delay })];
  const shaftHeight = broken ? height * 0.6 : height - 0.24;
  const shaft = kit.cylinder(0.17, 0.2, shaftHeight, color, x, y + 0.1, z, { delay: delay + 0.04 }, 10);
  kit.decorate(
    shaft,
    new BoxGeometry(0.025, shaftHeight * 0.9, 0.01),
    shade(color, 0.75),
    [-0.36, 0, 0.36].map((angle) => [Math.sin(angle) * 0.19, shaftHeight / 2, Math.cos(angle) * 0.19] as Point),
  );
  parts.push(shaft);
  if (broken) parts.push(kit.add(new ConeGeometry(0.19, 0.24, 7), color, x, y + 0.1 + shaftHeight, z, { delay: delay + 0.08, rotation: [0.2, 0, 0.3] }));
  else {
    parts.push(kit.cylinder(0.25, 0.19, 0.1, shade(color, 1.15), x, y + 0.1 + shaftHeight, z, { delay: delay + 0.08 }, 10));
    parts.push(kit.box(0.5, 0.1, 0.5, shade(color, 1.15), x, y + 0.2 + shaftHeight, z, { delay: delay + 0.1 }));
  }
  return parts;
}

/** A flight of steps rising away from the camera (along −z) from (x, z). */
export function steps(kit: Kit, x: number, z: number, y: number, delay: number, options: { width: number; count: number; tread?: number; rise?: number; color?: number; facing?: number }): Group[] {
  const tread = options.tread ?? 0.28;
  const rise = options.rise ?? 0.16;
  const color = options.color ?? STONE;
  const facing = options.facing ?? 0;
  const parts: Group[] = [];
  for (let k = 0; k < options.count; k++) {
    // Each step runs from its own front edge to the back of the flight.
    const depth = tread * (options.count - k);
    const [cx, cz] = around(x, z, 0, -(k * tread + depth / 2), facing);
    parts.push(kit.box(options.width, rise, depth, k % 2 ? color : shade(color, 1.1), cx, y + k * rise, cz, { delay: delay + k * 0.03, rotation: [0, facing, 0], ink: 1.02 }));
  }
  return parts;
}

/** A thin railing from one point to another, at height `height` above `y`. */
export function railing(kit: Kit, from: [number, number], to: [number, number], y: number, delay: number, height = 0.5, color = DARK): Group[] {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const turn = Math.atan2(-dz, dx);
  const parts = [kit.box(length, 0.03, 0.03, color, (from[0] + to[0]) / 2, y + height, (from[1] + to[1]) / 2, { delay, rotation: [0, turn, 0], noInk: true })];
  const posts = Math.max(2, Math.round(length / 0.35) + 1);
  for (let k = 0; k < posts; k++) {
    const t = k / (posts - 1);
    parts.push(kit.box(0.025, height, 0.025, color, from[0] + dx * t, y, from[1] + dz * t, { delay: delay + 0.02, noInk: true }));
  }
  return parts;
}

/** A market stall: a counter and a striped awning on four poles; returns the counter, to put goods on. */
export function stall(kit: Kit, x: number, z: number, y: number, delay: number, width = 1.6, stripes: [number, number] = [MAGENTA, 0x23707e], counter = 0x23404b): Group {
  const desk = kit.box(width, 0.75, 0.55, counter, x, y, z, { delay });
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => kit.box(0.04, 1.85, 0.04, DARK, x + sx * (width / 2 - 0.05), y, z + sz * 0.3 - 0.05, { delay: delay + 0.04, noInk: true })),
  );
  const n = Math.max(4, Math.round(width / 0.2));
  for (let k = 0; k < n; k++) {
    kit.box(width / n, 0.04, 0.85, k % 2 ? stripes[0] : stripes[1], x - width / 2 + (width / n) * (k + 0.5), y + 1.85, z, {
      delay: delay + 0.08 + k * 0.01,
      rotation: [0.18, 0, 0],
      noInk: true,
    });
  }
  return desk;
}

/** A round fountain with a jet of water. */
export function fountain(kit: Kit, x: number, z: number, y: number, delay: number, radius = 0.6): Group[] {
  return [
    kit.cylinder(radius, radius + 0.05, 0.3, STONE, x, y, z, { delay }, 20),
    kit.cylinder(radius - 0.06, radius - 0.06, 0.02, 0x1f8fb0, x, y + 0.28, z, { delay: delay + 0.04, flat: true, noInk: true }, 20),
    kit.cylinder(0.08, 0.12, 0.5, STONE_DARK, x, y + 0.3, z, { delay: delay + 0.06 }, 10),
    kit.cylinder(0.02, 0.05, 0.4, 0x9fe8ff, x, y + 0.8, z, { delay: delay + 0.1, flat: true, noInk: true }, 8),
  ];
}

/** A flat skyline of Nuova Megara along the back of the base, windows lit; `z` is its depth. */
export function skyline(kit: Kit, z: number, y: number, delay: number, colors: number[] = [0x2a2f4a, 0x3a2a4a, 0x22344a], from = -2, to = 2): Group[] {
  const parts: Group[] = [];
  let x = from;
  let k = 0;
  while (x < to) {
    // Never past `to`: the last building is narrowed to fit, or left out.
    const w = Math.min(0.35 + ((k * 37) % 5) * 0.08, to - x);
    if (w < 0.2) break;
    const h = 0.7 + ((k * 53) % 7) * 0.22;
    const part = kit.box(w, h, 0.05, colors[k % colors.length], x + w / 2, y, z, { delay: delay + k * 0.03, ink: 1.02 });
    const lights: Point[] = [];
    for (let r = 0; r < Math.floor(h / 0.22); r++) if ((r + k) % 3 !== 0) lights.push([((r * 13) % 3 - 1) * w * 0.25, 0.12 + r * 0.22, 0.03]);
    if (lights.length) kit.decorate(part, new BoxGeometry(0.06, 0.07, 0.01), (k % 3 === 0 ? CYAN : YELLOW), lights);
    parts.push(part);
    x += w + 0.04;
    k++;
  }
  return parts;
}

/** The volcano far off: a flat silhouette with a glowing crater and a thin plume. */
export function volcanoBackdrop(kit: Kit, x: number, z: number, y: number, delay: number, size = 1.4): Group[] {
  // A four-sided cone turned to show an edge, then flattened: a flat mountain facing the camera.
  const cone = new CylinderGeometry(size * 0.12, size, size * 0.9, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.05);
  return [
    kit.add(cone, 0x3a2a40, x, y, z, { delay }),
    kit.box(size * 0.22, 0.05, 0.02, 0xff8a00, x, y + size * 0.88, z + 0.04, { delay: delay + 0.1, flat: true, noInk: true }),
    kit.ball(size * 0.12, 0x5a2148, x + size * 0.05, y + size * 1.0, z, { delay: delay + 0.15, noInk: true }),
    kit.ball(size * 0.16, 0x5a2148, x + size * 0.15, y + size * 1.2, z, { delay: delay + 0.2, noInk: true }),
  ];
}

/** The cooling tower of the power plant, glowing cyan inside. */
export function coolingTower(kit: Kit, x: number, z: number, y: number, delay: number, height = 2.4): Group[] {
  const shell = new CylinderGeometry(height * 0.28, height * 0.38, height, 20, 4, true);
  const position = shell.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const py = position.getY(i) / height + 0.5;
    const pinch = 1 - 0.22 * Math.sin(Math.PI * Math.min(1, py * 1.15));
    position.setX(i, position.getX(i) * pinch);
    position.setZ(i, position.getZ(i) * pinch);
  }
  shell.computeVertexNormals();
  return [
    kit.add(shell, 0x4a5060, x, y, z, { delay }),
    kit.add(new TorusGeometry(height * 0.28, 0.04, 6, 24).rotateX(Math.PI / 2), CYAN, x, y + height - 0.04, z, { delay: delay + 0.1, flat: true, noInk: true }),
    kit.cylinder(height * 0.26, height * 0.26, 0.02, 0x0b3d50, x, y + height - 0.06, z, { delay: delay + 0.12, flat: true, noInk: true }, 20),
  ];
}

/** A tower crane: mast, jib, a hanging hook; returns the warning light on top. */
export function towerCrane(kit: Kit, x: number, z: number, y: number, delay: number, height = 2.8, arm = -1.6, color = YELLOW): Group {
  kit.box(0.14, height, 0.14, color, x, y, z, { delay });
  kit.box(Math.abs(arm) + 0.5, 0.12, 0.12, color, x + arm / 2, y + height, z, { delay: delay + 0.08 });
  kit.box(0.012, 0.7, 0.012, INK, x + arm * 0.8, y + height - 0.7, z, { delay: delay + 0.12, noInk: true });
  kit.box(0.16, 0.12, 0.12, DARK, x + arm * 0.8, y + height - 0.82, z, { delay: delay + 0.14 });
  return kit.box(0.08, 0.08, 0.08, MAGENTA, x, y + height + 0.12, z, { delay: delay + 0.16, flat: true, noInk: true });
}

/** A small car. */
export function car(kit: Kit, x: number, z: number, y: number, delay: number, color = 0x3a4a7a, facing = 0): Group[] {
  const rot: [number, number, number] = [0, facing, 0];
  const parts = [kit.box(1.3, 0.3, 0.62, color, x, y + 0.1, z, { delay, rotation: rot })];
  const cabin = kit.box(0.7, 0.26, 0.56, shade(color, 1.2), x, y + 0.4, z, { delay: delay + 0.06, rotation: rot });
  kit.decorate(cabin, new BoxGeometry(0.6, 0.16, 0.58), 0x16303e, [[0, 0.13, 0]]);
  parts.push(cabin);
  [-0.42, 0.42].forEach((dx) =>
    [-0.31, 0.31].forEach((dz) => {
      const [wx, wz] = around(x, z, dx, dz, facing);
      parts.push(kit.add(new CylinderGeometry(0.13, 0.13, 0.08, 12).rotateX(Math.PI / 2), DARK, wx, y, wz, { delay: delay + 0.1, rotation: rot }));
    }),
  );
  return parts;
}

/** A mooring bollard. */
export function bollard(kit: Kit, x: number, z: number, y: number, delay: number): Group[] {
  return [
    kit.cylinder(0.08, 0.1, 0.16, 0x4a4f5c, x, y, z, { delay }),
    kit.cylinder(0.12, 0.12, 0.04, 0x4a4f5c, x, y + 0.16, z, { delay: delay + 0.03 }),
  ];
}

/** A rubbish bin. */
export function bin(kit: Kit, x: number, z: number, y: number, delay: number, color = 0x2f6f60): Group[] {
  return [kit.cylinder(0.16, 0.14, 0.45, color, x, y, z, { delay }, 12), kit.cylinder(0.18, 0.18, 0.04, shade(color, 0.7), x, y + 0.45, z, { delay: delay + 0.04 }, 12)];
}

/**
 * A floor over the whole base: an octagon of paving, planks or earth, with a grid of joints cut
 * to the octagon's edge (`cell` apart; 0 for none). Returns the floor's top height.
 */
export function floor(kit: Kit, y: number, delay: number, color = 0x3a3f4e, joint = 0x262a35, cell = 0.5): number {
  const radius = 2.36;
  kit.cylinder(radius, radius, 0.03, color, 0, y, 0, { delay, noInk: true, rotation: [0, Math.PI / 8, 0] }, 8);
  const top = y + 0.03;
  if (!cell) return top;
  // Half the octagon's width at a distance d from its centre line, a little inside the rim.
  const inner = radius * Math.cos(Math.PI / 8) - 0.03;
  const half = (d: number) => Math.min(inner, inner * Math.SQRT2 - Math.abs(d));
  const lines: [number, number, number][] = [];
  for (let d = -inner + cell; d < inner; d += cell) lines.push([d, half(d), 0]);
  const material = kit.add(new BoxGeometry(0.001, 0.001, 0.001), joint, 0, top, 0, { delay, flat: true, noInk: true });
  for (const [d, w] of lines) {
    if (w <= 0.05) continue;
    kit.decorate(material, new BoxGeometry(2 * w, 0.004, 0.012), joint, [[0, 0.002, d]]);
    kit.decorate(material, new BoxGeometry(0.012, 0.004, 2 * w), joint, [[d, 0.002, 0]]);
  }
  return top;
}

/** A slab of paving on the base with a grid of joints; returns it. */
export function paving(kit: Kit, x: number, z: number, y: number, delay: number, width: number, depth: number, color = 0x3a3f4e, joint = 0x262a35, cell = 0.5): Group {
  const slab = kit.box(width, 0.03, depth, color, x, y, z, { delay, noInk: true });
  const lines: Point[] = [];
  for (let k = 1; k < Math.round(width / cell); k++) lines.push([-width / 2 + k * cell, 0.031, 0]);
  if (lines.length) kit.decorate(slab, new BoxGeometry(0.012, 0.004, depth), joint, lines);
  const rows: Point[] = [];
  for (let k = 1; k < Math.round(depth / cell); k++) rows.push([0, 0.031, -depth / 2 + k * cell]);
  if (rows.length) kit.decorate(slab, new BoxGeometry(width, 0.004, 0.012), joint, rows);
  return slab;
}

/** A blank round sign on a post (no lettering, ever): a metro sign, a stop, a warning. */
export function sign(kit: Kit, x: number, z: number, y: number, delay: number, color = MAGENTA, height = 1.6): Group {
  kit.cylinder(0.025, 0.025, height, DARK, x, y, z, { delay }, 8);
  const disc = kit.add(new CylinderGeometry(0.18, 0.18, 0.04, 20).rotateX(Math.PI / 2), color, x, y + height - 0.18, z, { delay: delay + 0.05 });
  kit.decorate(disc, new TorusGeometry(0.15, 0.02, 6, 20), 0xf4f0e6, [[0, 0.18, 0.025]]);
  return disc;
}

/** Stones scattered on the ground. */
export function rubble(kit: Kit, x: number, z: number, y: number, delay: number, count = 5, spread = 0.6, color = STONE_DARK): Group[] {
  const parts: Group[] = [];
  for (let k = 0; k < count; k++) {
    const angle = k * 2.4;
    const r = spread * (0.3 + ((k * 7) % 5) / 6);
    const size = 0.07 + ((k * 3) % 4) * 0.025;
    parts.push(kit.add(new DodecahedronGeometry(size), k % 2 ? color : shade(color, 1.2), x + Math.cos(angle) * r, y - size * 0.3, z + Math.sin(angle) * r, { delay: delay + k * 0.03, rotation: [k, k * 2, 0] }));
  }
  return parts;
}

/** A puddle catching a coloured light. */
export function puddle(kit: Kit, x: number, z: number, y: number, delay: number, radius = 0.35, light = MAGENTA): Group[] {
  return [
    kit.add(new CylinderGeometry(radius, radius, 0.006, 18).scale(1, 1, 0.6), 0x14303f, x, y, z, { delay, flat: true, noInk: true }),
    kit.box(radius * 0.15, 0.008, radius * 0.9, light, x, y + 0.002, z, { delay: delay + 0.04, flat: true, noInk: true }),
  ];
}

/** A lantern on a bracket of a wall; returns its light. */
export function wallLantern(kit: Kit, x: number, z: number, y: number, delay: number, light = ORANGE_LIGHT): Group {
  kit.box(0.04, 0.04, 0.22, DARK, x, y, z + 0.11, { delay, noInk: true });
  kit.add(new ConeGeometry(0.1, 0.08, 6).rotateX(Math.PI), DARK, x, y - 0.06, z + 0.22, { delay: delay + 0.03 });
  return kit.box(0.12, 0.16, 0.12, light, x, y - 0.24, z + 0.22, { delay: delay + 0.05, flat: true });
}

/** A ball held in a hand or floating: a crystal ball, a light, a planet. */
export function orb(kit: Kit, at: Point, radius: number, color: number, delay: number, glow = true): Group {
  return kit.ball(radius, color, at[0], at[1] - radius, at[2], { delay, flat: glow, noInk: glow });
}

/** A ring of light round a point, flat on the ground or standing: a spell, a target, a halo. */
export function ring(kit: Kit, at: Point, radius: number, color: number, delay: number, standing = false): Group {
  const geometry = new TorusGeometry(radius, 0.02, 6, 36);
  if (!standing) geometry.rotateX(Math.PI / 2);
  return kit.add(geometry, color, at[0], at[1], at[2], { delay, flat: true, noInk: true });
}

/** A sphere-and-cone flame: an outer orange tongue and a yellow core; returns both, to flicker. */
export function flame(kit: Kit, x: number, z: number, y: number, delay: number, size = 1): Group[] {
  return [
    kit.add(new ConeGeometry(0.16 * size, 0.5 * size, 8), 0xff8a00, x, y, z, { delay, flat: true }),
    kit.add(new ConeGeometry(0.08 * size, 0.3 * size, 8), YELLOW, x, y, z + 0.06 * size, { delay: delay + 0.04, flat: true, noInk: true }),
  ];
}

/** A table: a top on one leg (round, for a café) or four (square). */
export function table(kit: Kit, x: number, z: number, y: number, delay: number, round = true, color = 0x3a4050, height = 0.75): Group {
  if (round) {
    kit.cylinder(0.04, 0.12, height, DARK, x, y, z, { delay }, 8);
    return kit.cylinder(0.38, 0.38, 0.04, color, x, y + height, z, { delay: delay + 0.04 }, 18);
  }
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => kit.box(0.05, height, 0.05, DARK, x + sx * 0.4, y, z + sz * 0.28, { delay, noInk: true })));
  return kit.box(0.95, 0.05, 0.7, color, x, y + height, z, { delay: delay + 0.04 });
}

/** A pole with wires: a lamp-post-like mast with a crossbar. */
export function pole(kit: Kit, x: number, z: number, y: number, delay: number, height = 2.6, color = 0x4b3a30): Group[] {
  return [kit.cylinder(0.06, 0.08, height, color, x, y, z, { delay }, 8), kit.box(0.8, 0.06, 0.06, color, x, y + height - 0.25, z, { delay: delay + 0.05 })];
}

