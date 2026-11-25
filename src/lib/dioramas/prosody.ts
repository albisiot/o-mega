import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, SphereGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { shade } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Prosody (P216): the living bas-relief along a metro tunnel wall, a row of angular stone
 * figures with calm closed-eyed faces, the tallest lit gold from behind; the frieze glitches,
 * faces jumping aside in magenta and cyan. By the tracks it has started to conjugate a ticket
 * machine into stone: the top half is already facets, the dead screen cracked. The price: it
 * is the wall, and a wall goes nowhere.
 */
export function prosody(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const STONE = 0x8a7c66;
  const STONE_DARK = 0x5e5446;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2a2630, 0x1c1a22, 0);

  // The track bed: sleepers and two rails running along the wall.
  const along = (s: number, dz: number): Point => [s * Math.cos(0.2) + dz * Math.sin(0.2), G, 0.75 - s * Math.sin(0.2) + dz * Math.cos(0.2)];
  for (let k = 0; k < 8; k++) box(0.22, 0.05, 0.95, 0x3e3330, ...along(-1.55 + k * 0.44, 0), { delay: 0.1 + k * 0.015, rotation: [0, 0.2, 0] });
  [-0.3, 0.3].forEach((dz, i) => box(3.5, 0.06, 0.05, 0x8f98a8, ...along(0, dz).map((v, j) => (j === 1 ? v + 0.05 : v)) as Point, { delay: 0.25 + i * 0.03, noInk: true, rotation: [0, 0.2, 0] }));

  // The wall, in its own frame.
  const R = 0.2;
  const W: Point = [-0.1, G, -1.3];
  const wl = (lx: number, ly: number, lz: number): Point => [W[0] + lx * Math.cos(R) + lz * Math.sin(R), W[1] + ly, W[2] - lx * Math.sin(R) + lz * Math.cos(R)];
  const turn: Point = [0, R, 0];
  const wall = box(4.0, 3.0, 0.4, 0x4a4250, ...wl(0, 0, -0.1), { delay: 0.12, ink: 1.02, rotation: turn });
  decorate(wall, new BoxGeometry(4.0, 0.04, 0.01), 0x3a3440, [0.4, 0.5].map((y) => [0, y, 0.205] as Point));
  // The zigzag band at the foot.
  const tri = new ConeGeometry(0.22, 0.32, 3).scale(1, 1, 0.12);
  decorate(wall, tri, STONE_DARK, Array.from({ length: 10 }, (_, k) => [-1.8 + k * 0.4, 0.2, 0.21] as Point));
  decorate(wall, tri.clone().rotateZ(Math.PI), STONE, Array.from({ length: 9 }, (_, k) => [-1.6 + k * 0.4, 0.22, 0.215] as Point));
  // The gold glow behind the tallest face, and lamps along the vault.
  add(new SphereGeometry(0.6, 20, 12).scale(1, 1.15, 0.05), 0xd8a03a, ...wl(0.15, 1.9, 0.11), { delay: 0.2, flat: true, noInk: true, rotation: turn });
  const lamps = [-1.6, -0.6, 0.9, 1.7].map((lx, i) => box(0.14, 0.1, 0.1, YELLOW, ...wl(lx, 2.75, 0.18), { delay: 0.3 + i * 0.03, flat: true, rotation: turn }));

  // The relief figures: a faceted cloak, a veil, a calm face with closed eyes.
  const pieces: Group[] = [];
  const tints: Color[] = [];
  const keep = (part: Group, color: number) => (pieces.push(part), tints.push(new Color(color)), part);
  const relief = (lx: number, s: number, delay: number) => {
    const foot = 0.55;
    // The cloak: three tall folds, then the shoulders, wide at the top.
    [
      [0, 0.45, 1.05, STONE, 0],
      [-0.26, 0.24, 0.8, STONE_DARK, 0.2],
      [0.26, 0.24, 0.8, shade(STONE, 1.15), -0.2],
    ].forEach(([dx, r, h, color, lean], i) =>
      keep(add(new ConeGeometry(r * s, h * s, 4).rotateY(Math.PI / 4).scale(1, 1, 0.3), color, ...wl(lx + dx * s, foot, 0.18 + i * 0.04), { delay: delay + i * 0.02, rotation: [0, R, lean] }), color),
    );
    const sy = foot + 0.8 * s;
    keep(add(new ConeGeometry(0.46 * s, 0.62 * s, 4).rotateY(Math.PI / 4).rotateX(Math.PI).scale(1, 1, 0.34), shade(STONE, 1.08), ...wl(lx, sy, 0.24), { delay: delay + 0.05, rotation: turn }), shade(STONE, 1.08));
    // The veil behind the head, a flat hexagon, and the head with closed eyes.
    const hb = sy + 0.62 * s;
    keep(add(new CylinderGeometry(0.33 * s, 0.33 * s, 0.08, 6).rotateX(Math.PI / 2), STONE_DARK, ...wl(lx, hb + 0.22 * s - 0.33 * s, 0.2), { delay: delay + 0.07, rotation: turn }), STONE_DARK);
    const head = keep(add(new SphereGeometry(0.19 * s, 12, 10).scale(0.85, 1.15, 0.75), shade(STONE, 1.2), ...wl(lx, hb, 0.3), { delay: delay + 0.09, rotation: turn }), shade(STONE, 1.2));
    const cy = 0.22 * s;
    decorate(head, new BoxGeometry(0.075 * s, 0.014 * s, 0.01), INK, [
      [-0.065 * s, cy + 0.03 * s, 0.14 * s, -0.15],
      [0.065 * s, cy + 0.03 * s, 0.14 * s, 0.15],
    ]);
    decorate(head, new BoxGeometry(0.04 * s, 0.1 * s, 0.05 * s), shade(STONE, 0.95), [[0, cy - 0.02 * s, 0.13 * s]]);
    decorate(head, new BoxGeometry(0.08 * s, 0.016 * s, 0.01), shade(STONE, 0.55), [[0, cy - 0.11 * s, 0.13 * s]]);
  };
  relief(-1.55, 0.75, 0.4);
  relief(-0.75, 0.9, 0.5);
  relief(0.15, 1.3, 0.6);
  relief(1.0, 0.9, 0.7);
  relief(1.68, 0.72, 0.8);

  // The ticket machine by the track, being conjugated: metal below, stone facets above, a gold seam between.
  const M: Point = [1.55, G, 0.15];
  const yaw: Point = [0, -0.25, 0];
  const body = box(0.5, 0.62, 0.38, 0x2f6f86, ...M, { delay: 1.1, rotation: yaw });
  decorate(body, new BoxGeometry(0.16, 0.04, 0.01), INK, [[0.08, 0.4, 0.195]]);
  const seam = box(0.53, 0.05, 0.41, YELLOW, M[0], G + 0.62, M[2], { delay: 1.15, flat: true, noInk: true, rotation: yaw });
  const top = box(0.5, 0.7, 0.38, STONE, M[0], G + 0.67, M[2], { delay: 1.2, rotation: yaw });
  keep(top, STONE);
  decorate(top, new ConeGeometry(0.12, 0.22, 3).scale(1, 1, 0.1), STONE_DARK, [
    [-0.12, 0.62, 0.195],
    [0.12, 0.12, 0.195, Math.PI],
    [0.1, 0.6, 0.195, Math.PI],
  ]);
  decorate(top, new ConeGeometry(0.12, 0.22, 3).scale(1, 1, 0.1), shade(STONE, 1.2), [
    [-0.12, 0.12, 0.196, Math.PI],
    [0.14, 0.36, 0.196],
  ]);
  const screen = box(0.3, 0.2, 0.03, 0x141a26, ...[M[0] - 0.05, G + 0.3, M[2] + 0.2] as Point, { delay: 1.35, rotation: yaw });
  decorate(screen, new BoxGeometry(0.13, 0.012, 0.01), CYAN, [
    [-0.06, 0.12, 0.016, 0.5],
    [0.07, 0.07, 0.016, 0.9],
  ]);
  kit.motes(12, YELLOW, 0.025, [M[0] - 0.35, G + 0.6, M[2] - 0.25], [M[0] + 0.35, G + 1.7, M[2] + 0.25], 1.4);

  const rest = pieces.map((part) => part.position.clone());
  const glitch = [new Color(MAGENTA), new Color(CYAN)];
  tick((t) => {
    // The glitch: now and then a piece of the frieze jumps sideways and flashes.
    const beat = Math.floor(t * 9);
    pieces.forEach((part, i) => {
      const noise = Math.sin(beat * 12.9898 + i * 78.233) * 43758.5453;
      const hit = t > 2 && noise - Math.floor(noise) > 0.93;
      part.position.x = rest[i].x + (hit ? (i % 2 ? 0.08 : -0.08) : 0);
      colorOf(part).copy(hit ? glitch[i % 2] : tints[i]);
    });
    seam.visible = Math.floor(t * 4) % 6 !== 5;
    lamps.forEach((lamp, i) => (lamp.visible = Math.floor(t * 5 + i * 4) % 17 !== 0));
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
