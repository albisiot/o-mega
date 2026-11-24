import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, type Group } from "three";
import { INK, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { floor } from "@/lib/diorama-props";

/**
 * Patina (P084): the living mould of the Figli dell'Ultima grows out of the tiled wall of a
 * metro platform, a toadstool for a hat, a grinning skull face with glowing eyes and long
 * dripping claws reaching for the passengers. It has no legs, only roots spread over the tiles,
 * so it never moves: at its foot, years of unopened rent letters are going mouldy too.
 */
export function patina(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const MOSS = 0x3f7a5a;
  const MOSS_DARK = 0x2a5040;
  const LIME = 0xb8e04a;
  const CAP = 0xd8457a;
  const GLOW = 0xe8ff6a;
  const TILE = 0x2f6f86;
  const F = octagonBase(kit, 0x14181f);
  const G = floor(kit, F, 0.06, 0x24303a, 0x18202a, 0.35);

  // The platform: a tiled wall with the line's magenta band, a tiled pillar, the edge and the tracks.
  const wall = box(2.4, 3.1, 0.25, 0x16303c, -0.3, G, -1.55, { delay: 0.1, ink: 1.02 });
  const tiles: Point[] = [];
  const cracked: Point[] = [];
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 8; c++) ((r * 7 + c * 3) % 9 === 0 ? cracked : tiles).push([-1.05 + c * 0.3, 0.2 + r * 0.3, 0.13]);
  decorate(wall, new BoxGeometry(0.26, 0.26, 0.01), TILE, tiles);
  decorate(wall, new BoxGeometry(0.26, 0.26, 0.01), 0x1a2a30, cracked);
  decorate(wall, new BoxGeometry(2.4, 0.1, 0.012), MAGENTA, [[0, 2.35, 0.135]]);
  const pillar = box(0.42, 3.1, 0.42, 0x16303c, 1.0, G, -0.3, { delay: 0.15 });
  decorate(pillar, new BoxGeometry(0.17, 0.17, 0.01), TILE, Array.from({ length: 18 }, (_, k) => [(k % 2) * 0.2 - 0.1, 0.2 + Math.floor(k / 2) * 0.3, 0.212] as Point));
  decorate(pillar, new BoxGeometry(0.42, 0.1, 0.012), MAGENTA, [[0, 2.35, 0.215]]);
  box(0.08, 0.012, 2.4, YELLOW, 1.3, G, -0.05, { delay: 0.2, flat: true, noInk: true });
  const bed = box(0.75, 0.02, 2.2, 0x0e1014, 1.75, G, 0, { delay: 0.22, noInk: true });
  decorate(bed, new BoxGeometry(0.7, 0.012, 0.08), 0x3e3028, Array.from({ length: 9 }, (_, k) => [0, 0.02, -1.0 + k * 0.25] as Point));
  [1.55, 1.95].forEach((x, i) => box(0.04, 0.06, 2.2, 0x6a7080, x, G + 0.02, 0, { delay: 0.25 + i * 0.03 }));

  // Its roots: mould spreading over the floor and up the tiles.
  const CX = -0.4;
  const WZ = -1.42;
  [
    [-0.5, 0.2, 0.32],
    [0.45, -0.1, 0.28],
    [0.05, 0.55, 0.3],
    [-0.75, 0.6, 0.2],
    [0.7, 0.45, 0.22],
  ].forEach(([dx, dz, r], i) => add(new SphereGeometry(r, 12, 6).scale(1, 0.18, 1), i % 2 ? MOSS_DARK : MOSS, CX + dx, G - 0.02, WZ + 0.35 + dz, { delay: 0.3 + i * 0.03 }));
  [
    [-0.85, 0.9, 0.22],
    [0.75, 1.3, 0.2],
    [-0.6, 2.0, 0.18],
    [0.6, 2.4, 0.16],
    [-0.95, 1.5, 0.15],
  ].forEach(([dx, y, r], i) => add(new SphereGeometry(r, 12, 8).scale(1, 1.2, 0.3), i % 2 ? LIME : MOSS, CX + dx, G + y - r * 1.2, WZ + 0.05, { delay: 0.35 + i * 0.03 }));

  // Little toadstools sprouting from it, and from everything it touches.
  const toadstool = (x: number, y: number, z: number, size: number, delay: number) => {
    cylinder(size * 0.25, size * 0.3, size * 0.8, 0xe8e0d0, x, y, z, { delay }, 8);
    add(new SphereGeometry(size * 0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), CAP, x, y + size * 0.75, z, { delay: delay + 0.03 });
  };

  // Its body: a trunk of mould grown out of the wall, lumpy, into a ribbed chest. No legs.
  add(new CylinderGeometry(0.26, 0.4, 1.35, 14).scale(1, 1, 0.8), MOSS, CX, G, WZ + 0.3, { delay: 0.4 });
  [
    [-0.26, 0.3, 0.2, 0.17, MOSS_DARK],
    [0.24, 0.55, 0.22, 0.15, 0x6a9a4a],
    [-0.2, 0.92, 0.24, 0.14, MOSS_DARK],
    [0.22, 1.1, 0.2, 0.13, 0x4a8a6a],
    [0.05, 0.15, 0.3, 0.16, 0x4a8a6a],
  ].forEach(([dx, y, dz, r, color], i) => ball(r, color, CX + dx, G + y - r, WZ + 0.3 + dz, { delay: 0.45 + i * 0.03 }));
  ball(0.42, MOSS, CX, G + 1.2, WZ + 0.42, { delay: 0.6 });
  decorate(ball(0.3, MOSS_DARK, CX, G + 1.22, WZ + 0.6, { delay: 0.62 }), new BoxGeometry(0.34, 0.03, 0.02), 0x1e3a2c, [0.18, 0.28, 0.38].map((y) => [0, y, 0.27] as Point));
  [
    [0.32, 1.95, 0.55, 0.1],
    [-0.36, 0.85, 0.55, 0.09],
    [0.3, 0.5, 0.6, 0.08],
    [-0.15, 1.5, 0.95, 0.07],
  ].forEach(([dx, y, dz, size], i) => toadstool(CX + dx, G + y, WZ + dz, size, 0.7 + i * 0.03));

  // The head: a skull face with a grin and glowing eyes, under a magenta toadstool tilted back.
  const HX = CX;
  const HY = G + 2.05;
  const HZ = WZ + 0.68;
  const skull = ball(0.27, 0x3a6a4a, HX, HY, HZ, { delay: 0.8 });
  const eyes = decorate(skull, new SphereGeometry(0.065, 10, 8), GLOW, [
    [-0.1, 0.3, 0.23],
    [0.1, 0.3, 0.23],
  ]);
  decorate(skull, new SphereGeometry(0.09, 10, 8), INK, [
    [-0.1, 0.3, 0.19],
    [0.1, 0.3, 0.19],
  ]);
  decorate(skull, new BoxGeometry(0.24, 0.05, 0.02), 0xe8f0c0, [[0, 0.14, 0.235]]);
  decorate(skull, new BoxGeometry(0.008, 0.05, 0.022), INK, [-0.08, -0.04, 0, 0.04, 0.08].map((x) => [x, 0.14, 0.236] as Point));
  const TILT = -0.3;
  const capAt: Point = [HX, HY + 0.4, HZ - 0.02];
  const cap = add(new SphereGeometry(0.72, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1), CAP, ...capAt, { delay: 0.9, rotation: [TILT, 0, 0] });
  decorate(cap, new SphereGeometry(0.06, 8, 6).scale(1, 0.4, 1), 0xf4c0d8, [
    [0.3, 0.29, 0.2],
    [-0.35, 0.27, 0.1],
    [0.05, 0.32, -0.15],
    [-0.15, 0.25, 0.4],
    [0.45, 0.2, -0.3],
    [-0.5, 0.18, -0.25],
  ]);
  add(new CylinderGeometry(0.7, 0.24, 0.14, 22), 0x5a1a3a, capAt[0], capAt[1] - 0.14 * Math.cos(TILT), capAt[2] - 0.14 * Math.sin(TILT), { delay: 0.88, rotation: [TILT, 0, 0], noInk: true });
  [
    [0.25, 0.3, -0.25, 0.12],
    [-0.3, 0.26, -0.2, 0.1],
    [0.05, 0.32, -0.45, 0.14],
  ].forEach(([dx, dy, dz, s], i) => toadstool(capAt[0] + dx, capAt[1] + dy, capAt[2] + dz, s, 1.0 + i * 0.04));
  [-1.0, -0.4, 0.3, 0.9].forEach((a, i) => {
    const length = 0.16 + (i % 2) * 0.1;
    add(new ConeGeometry(0.025, length, 5).rotateX(Math.PI), LIME, capAt[0] + 0.66 * Math.sin(a), capAt[1] + 0.2 * Math.cos(a) - length, capAt[2] + 0.63 * Math.cos(a), { delay: 1.1 + i * 0.03, noInk: true });
  });

  // The arms: long, mossy, dripping, the claws reaching out for us.
  const fingers: { part: Group; base: Point }[] = [];
  const arm = (side: number, elbow: Point, wrist: Point, delay: number) => {
    const shoulder: Point = [CX + side * 0.38, G + 1.85, WZ + 0.45];
    limb(kit, shoulder, elbow, 0.13, 0.1, MOSS, { delay });
    ball(0.11, MOSS_DARK, elbow[0], elbow[1] - 0.11, elbow[2], { delay: delay + 0.03 });
    limb(kit, elbow, wrist, 0.1, 0.075, MOSS, { delay: delay + 0.05 });
    ball(0.1, MOSS_DARK, wrist[0], wrist[1] - 0.1, wrist[2], { delay: delay + 0.07 });
    toadstool(shoulder[0], shoulder[1] + 0.05, shoulder[2], 0.11, delay + 0.1);
    [0.25, 0.55, 0.85].forEach((u, i) => {
      const length = 0.18 + (i % 2) * 0.12;
      const p: Point = [elbow[0] + (wrist[0] - elbow[0]) * u, elbow[1] + (wrist[1] - elbow[1]) * u - 0.06, elbow[2] + (wrist[2] - elbow[2]) * u];
      add(new ConeGeometry(0.025, length, 5).rotateX(Math.PI), LIME, p[0], p[1] - length, p[2], { delay: delay + 0.12 + i * 0.03, noInk: true });
    });
    [-0.15, -0.05, 0.05, 0.15].forEach((spread, i) => {
      const tip: Point = [wrist[0] + side * 0.1 + spread * 1.1, wrist[1] - 0.3 + Math.abs(spread) * 0.5, wrist[2] + 0.3 - Math.abs(spread) * 0.6];
      const { length, rotation } = aim(wrist, tip);
      const part = add(new ConeGeometry(0.04, length, 6), 0xc8e0a0, ...wrist, { delay: delay + 0.15 + i * 0.02, rotation });
      fingers.push({ part, base: rotation });
    });
  };
  arm(1, [CX + 0.85, G + 1.75, WZ + 0.95], [CX + 1.0, G + 1.55, WZ + 1.55], 1.0);
  arm(-1, [CX - 0.85, G + 1.6, WZ + 0.9], [CX - 0.95, G + 1.35, WZ + 1.45], 1.05);

  // Years of rent letters in a heap at its foot, never opened, going green.
  [
    [0, 0, 0.3, 0],
    [0.12, 0.12, -0.5, 1],
    [-0.14, 0.08, 1.2, 1],
    [0.05, -0.04, 0.1, 2],
    [0.26, 0.28, 2.0, 0],
    [-0.22, 0.32, -0.9, 0],
    [0.02, 0.07, 0.8, 3],
    [0.3, -0.08, 1.5, 0],
  ].forEach(([dx, dz, turn, level], i) => {
    const letter = box(0.3, 0.018, 0.2, 0xe0dccf, CX + 0.62 + dx, G + level * 0.018, WZ + 1.05 + dz, { delay: 1.3 + i * 0.03, rotation: [0, turn, 0] });
    decorate(letter, new BoxGeometry(0.24, 0.004, 0.035), MAGENTA, [[0, 0.019, 0.04]]);
    decorate(letter, new BoxGeometry(0.05, 0.004, 0.06), 0x23404b, [[0.1, 0.019, -0.05]]);
  });
  const leaning = box(0.3, 0.018, 0.2, 0xe0dccf, CX + 0.28, G, WZ + 0.78, { delay: 1.5 });
  leaning.rotation.order = "YXZ";
  leaning.rotation.set(-1.1, 0.3, 0);
  decorate(leaning, new BoxGeometry(0.24, 0.004, 0.035), MAGENTA, [[0, 0.019, 0.04]]);
  toadstool(CX + 0.75, G + 0.06, WZ + 1.15, 0.09, 1.55);
  toadstool(CX + 0.55, G + 0.08, WZ + 1.2, 0.06, 1.58);
  add(new SphereGeometry(0.14, 10, 6).scale(1, 0.25, 1), LIME, CX + 0.5, G + 0.05, WZ + 0.95, { delay: 1.55 });

  motes(16, GLOW, 0.025, [CX - 1.0, G + 0.6, WZ + 0.3], [CX + 1.4, G + 3.2, WZ + 1.9], 1.2);
  const glowA = eyes.color.clone();
  const glowB = eyes.color.clone().set(0x8aff40);
  tick((t) => {
    // The eyes pulse, the claws twitch.
    eyes.color.lerpColors(glowA, glowB, (Math.sin(t * 2.5) + 1) / 2);
    fingers.forEach(({ part, base }, i) => (part.rotation.x = base[0] + Math.sin(t * 2 + i) * 0.08));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
