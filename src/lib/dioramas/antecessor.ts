import { BoxGeometry, Color, CylinderGeometry, DodecahedronGeometry, TorusGeometry } from "three";
import { ORANGE, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { bin, column, flame, floor, rubble } from "@/lib/diorama-props";

/**
 * Antecessor (P184): in the temple dig, before a stone slab burning at its edges between two
 * columns, the ancient sovereign stands awake: a blocky giant of mosaic stone with a ribbed
 * head and a slit of orange eyes. The dig's floor puts itself in order round him: loose tiles
 * lift off the earth and fly into neat rows. His price: he is sunk to the shins in the trench
 * and does not move; the archaeologists left their barrow, bucket and string behind.
 */
export function antecessor(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const STONE = 0x6a7a72;
  const STONE_DARK = 0x4e5c58;
  const STONE_LIGHT = 0x8a9a8e;
  const EARTH = 0x3a3028;
  const F = octagonBase(kit, 0x1a1a22);
  const G = floor(kit, F, 0.06, EARTH, 0x2e261f, 0);

  // The slab behind him, burning at its edges, between a whole column and a broken one.
  const halo = [
    box(1.75, 0.12, 0.04, ORANGE, 0, G + 3.0, -1.56, { delay: 0.08, flat: true, noInk: true }),
    box(0.12, 3.05, 0.04, ORANGE, -0.81, G, -1.56, { delay: 0.08, flat: true, noInk: true }),
    box(0.12, 3.05, 0.04, ORANGE, 0.81, G, -1.56, { delay: 0.08, flat: true, noInk: true }),
  ];
  const slab = box(1.5, 3.0, 0.2, 0x3e4c4a, 0, G, -1.5, { delay: 0.1 });
  decorate(
    slab,
    new BoxGeometry(0.14, 0.14, 0.01),
    0x56665e,
    Array.from({ length: 18 }, (_, k) => [-0.55 + (k % 6) * 0.22, 0.5 + Math.floor(k / 6) * 0.9 + (k % 2) * 0.2, 0.101] as Point),
  );
  column(kit, -1.5, -0.95, G, 0.14, 2.9, false, 0x5a6a78);
  column(kit, 1.45, -1.0, G, 0.16, 2.2, true, 0x5a6a78);
  rubble(kit, 1.65, -0.35, G, 0.2, 4, 0.35);
  // A brazier at the front.
  cylinder(0.08, 0.12, 0.6, 0x3a3440, 1.5, G, 0.6, { delay: 0.22 }, 8);
  cylinder(0.24, 0.12, 0.16, 0x4a4250, 1.5, G + 0.6, 0.6, { delay: 0.26 }, 12);
  const fire = flame(kit, 1.5, 0.6, G + 0.72, 0.3, 1.1);

  // The mosaic floor he is ordering: neat rows of tiles, three slots still empty.
  const tileColors = [STONE, STONE_DARK, STONE_LIGHT, 0x7a4a6a];
  const slots: Point[] = [];
  let k = 0;
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 7; col++) {
      const x = -0.95 + col * 0.31;
      const z = 0.5 + row * 0.31;
      const at: Point = [x, G, z];
      if ((row === 0 && col === 5) || (row === 1 && col === 1) || (row === 2 && col === 4)) {
        slots.push(at);
        continue;
      }
      box(0.27, 0.04, 0.27, tileColors[(row * 3 + col * 5) % 4], ...at, { delay: 0.3 + k * 0.012, ink: 1.03 });
      k++;
    }
  const starts: Point[] = [
    [1.0, G, 1.45],
    [-1.55, G, 0.95],
    [0.15, G, 1.95],
  ];
  const loose = starts.map((p, i) => box(0.27, 0.04, 0.27, tileColors[i + 1], ...p, { delay: 0.6 + i * 0.04, ink: 1.03, rotation: [0.15, 0.7 * (i + 1), 0.1] }));
  motes(8, STONE_LIGHT, 0.02, [-1.2, G, 0.3], [1.1, G + 0.6, 1.7], 1);

  // What the archaeologists left: a barrow on its side, a bucket, pegs and string.
  const barrow = box(0.5, 0.2, 0.36, 0x7a2f55, -1.55, G, 0.15, { delay: 0.4, rotation: [0, 0.4, 1.2] });
  decorate(barrow, new CylinderGeometry(0.1, 0.1, 0.04, 12).rotateZ(Math.PI / 2), 0x23222b, [[0.28, 0.1, 0]]);
  bin(kit, -1.1, 1.55, G, 0.42, 0x23707e);
  [
    [-1.85, -0.3],
    [-1.85, 0.75],
    [-1.25, 0.75],
  ].forEach(([x, z], i) => box(0.03, 0.3, 0.03, 0xd8c8a0, x, G, z, { delay: 0.45 + i * 0.02, noInk: true }));
  box(0.012, 0.012, 1.05, 0xe8e2d0, -1.85, G + 0.26, 0.22, { delay: 0.5, flat: true, noInk: true });
  box(0.6, 0.012, 0.012, 0xe8e2d0, -1.55, G + 0.26, 0.75, { delay: 0.5, flat: true, noInk: true });

  // Antecessor, in his own frame: legs sunk in the trench, a cross of shoulders, a ribbed head.
  const DF = 0.3;
  const X0 = 0;
  const Z0 = -0.6;
  const a = (lx: number, ly: number, lz: number): Point => [X0 + lx * Math.cos(DF) + lz * Math.sin(DF), G + ly, Z0 - lx * Math.sin(DF) + lz * Math.cos(DF)];
  const turn: [number, number, number] = [0, DF, 0];
  const block = (w: number, h: number, d: number, color: number, at: Point, delay: number) => {
    const part = box(w, h, d, color, ...at, { delay, rotation: turn });
    // Mosaic chips on its front.
    decorate(
      part,
      new BoxGeometry(0.07, 0.07, 0.01),
      STONE_LIGHT,
      Array.from({ length: Math.round(w * h * 14) }, (_, i) => [((i * 0.37) % 1 - 0.5) * w * 0.85, (((i * 0.61) % 1) * 0.85 + 0.07) * h, d / 2 + 0.005] as Point),
    );
    return part;
  };
  [-1, 1].forEach((side, i) => {
    block(0.38, 1.25, 0.44, STONE, a(side * 0.27, 0, 0), 0.8 + i * 0.03);
    add(new DodecahedronGeometry(0.3).scale(1.2, 0.5, 1.2), EARTH, ...a(side * 0.3, -0.05, 0.08), { delay: 0.86 + i * 0.03 });
  });
  block(0.95, 0.35, 0.5, STONE_DARK, a(0, 1.15, 0), 0.9);
  add(new CylinderGeometry(0.62, 0.38, 0.95, 4).rotateY(Math.PI / 4).scale(1.15, 1, 0.55), STONE, ...a(0, 1.45, 0), { delay: 0.95, rotation: turn });
  block(1.95, 0.4, 0.56, STONE, a(0, 2.28, 0), 1.0);
  [-1, 1].forEach((side, i) => block(0.34, 1.05, 0.4, STONE_DARK, a(side * 0.8, 1.25, 0), 1.05 + i * 0.03));
  cylinder(0.12, 0.14, 0.15, STONE_DARK, ...a(0, 2.68, 0), { delay: 1.1 });
  const head = cylinder(0.22, 0.24, 0.5, STONE, ...a(0, 2.78, 0), { delay: 1.15 }, 16);
  decorate(
    head,
    new TorusGeometry(0.232, 0.012, 4, 20).rotateX(Math.PI / 2),
    STONE_DARK,
    [0.1, 0.18, 0.34, 0.42].map((y) => [0, y, 0] as Point),
  );
  head.rotation.y = DF;
  decorate(head, new BoxGeometry(0.3, 0.07, 0.04), 0x14121c, [[0, 0.26, 0.22]]);
  const eyes = decorate(head, new BoxGeometry(0.07, 0.035, 0.02), ORANGE, [
    [-0.08, 0.26, 0.245],
    [0.08, 0.26, 0.245],
  ]);

  const eyeFrom = new Color(ORANGE);
  const eyeTo = new Color(YELLOW);
  const restFire = fire.map((part) => part.rotation.z);
  tick((t) => {
    // Each loose tile lies, lifts, flies to its slot, stays, and starts again.
    loose.forEach((tile, i) => {
      const u = ((t + i * 2) / 6) % 1;
      const from = starts[i];
      const to = slots[i];
      const m = u < 0.15 ? 0 : u < 0.5 ? (u - 0.15) / 0.35 : 1;
      const e = m * m * (3 - 2 * m);
      tile.position.set(from[0] + (to[0] - from[0]) * e, G + Math.sin(e * Math.PI) * 0.55, from[2] + (to[2] - from[2]) * e);
      tile.rotation.set(0.15 * (1 - e), 0.7 * (i + 1) * (1 - e), 0.1 * (1 - e));
      tile.visible = u < 0.92;
    });
    eyes.color.lerpColors(eyeFrom, eyeTo, (Math.sin(t * 1.3) + 1) / 2);
    halo.forEach((bar) => colorOf(bar).lerpColors(eyeFrom, eyeTo, (Math.sin(t * 0.7) + 1) / 3));
    fire.forEach((part, i) => (part.rotation.z = restFire[i] + Math.sin(t * 11 + i) * 0.08));
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
