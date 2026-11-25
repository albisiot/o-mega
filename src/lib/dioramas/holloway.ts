import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry } from "three";
import { CYAN, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { bench, floor } from "@/lib/diorama-props";

/**
 * Holloway (P177): on the platform of the line closed since the Ora Zero, a tower of commuters in
 * raincoats and hats, umbrellas open, stands on each other's shoulders and sways like one body;
 * on top a departure board glows in place of a face, its rows announcing the next stop over and
 * over. The old train waits with its doors open; the platform clock stopped long ago.
 */
export function holloway(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const TILE = 0x2f5a58;
  const COATS = [0x4a5a52, 0x5a665c, 0x3e4c48];
  const HAT = 0x262a2c;
  const SKIN = 0xb8b0a0;
  const BROLLY = 0x2a2a36;
  const F = octagonBase(kit, 0x1a1e20);
  const G = floor(kit, F, 0.06, 0x2e3a3c, 0x1e2828, 0.4);

  // The tiled wall with the stopped clock, a pillar with a strip light, a bench.
  const wall = box(2.4, 2.7, 0.18, TILE, 0.25, G, -1.6, { delay: 0.08, ink: 1.02 });
  decorate(wall, new BoxGeometry(2.4, 0.012, 0.01), 0x447a74, Array.from({ length: 12 }, (_, k) => [0, 0.2 + k * 0.2, 0.091] as Point));
  decorate(wall, new BoxGeometry(0.012, 2.7, 0.01), 0x447a74, Array.from({ length: 8 }, (_, k) => [-1.05 + k * 0.3, 1.35, 0.092] as Point));
  decorate(wall, new BoxGeometry(2.4, 0.5, 0.012), 0x1e3e3c, [[0, 0.25, 0.093]]);
  decorate(wall, new BoxGeometry(0.5, 0.35, 0.012), 0x6a4a3a, [
    [-0.7, 1.35, 0.094],
    [0.35, 0.8, 0.094],
  ]);
  box(1.1, 0.06, 0.06, CYAN, 0.25, G + 2.45, -1.48, { delay: 0.2, flat: true });
  box(0.05, 0.35, 0.05, 0x23222b, 0.85, G + 2.05, -1.45, { delay: 0.22 });
  const clock = add(new CylinderGeometry(0.24, 0.24, 0.07, 22).rotateX(Math.PI / 2), 0xe8e2d0, 0.85, G + 1.6, -1.42, { delay: 0.25 });
  decorate(clock, new BoxGeometry(0.025, 0.17, 0.01), 0x14121c, [[-0.05, 0.3, 0.04, 0.6]]);
  decorate(clock, new BoxGeometry(0.02, 0.12, 0.01), 0x14121c, [[0.035, 0.27, 0.04, -0.8]]);
  decorate(clock, new BoxGeometry(0.03, 0.03, 0.012), 0x14121c, [[0, 0.24, 0.042]]);
  const pillar = box(0.42, 2.7, 0.42, TILE, 1.75, G, 0.2, { delay: 0.12 });
  decorate(pillar, new BoxGeometry(0.43, 0.012, 0.43), 0x447a74, [0.5, 1.0, 1.5, 2.0].map((y) => [0, y, 0] as Point));
  const strip = box(0.07, 0.8, 0.03, CYAN, 1.75, G + 1.5, 0.42, { delay: 0.2, flat: true });
  bench(kit, 1.0, 1.25, G, 0.3, -0.45);

  // The track bed, the yellow platform edge and the old train with its doors open.
  box(1.0, 0.02, 2.2, 0x16161c, -1.6, G, 0, { delay: 0.1, noInk: true });
  box(0.08, 0.025, 2.6, YELLOW, -0.98, G, 0, { delay: 0.14, flat: true, noInk: true });
  const train = box(0.85, 1.35, 2.1, 0x2a5a5a, -1.6, G + 0.18, 0, { delay: 0.3 });
  box(0.8, 0.08, 2.05, 0x22484a, -1.6, G + 1.53, 0, { delay: 0.34 });
  [-0.6, 0.6].forEach((z, i) => box(0.6, 0.18, 0.5, 0x1e2226, -1.6, G, z, { delay: 0.28 + i * 0.03 }));
  // Windows and the open door along the platform side, a windscreen and lamps at the front.
  decorate(train, new BoxGeometry(0.01, 0.4, 0.38), 0x14262c, [
    [0.426, 0.85, -0.72],
    [0.426, 0.85, 0.72],
  ]);
  decorate(train, new BoxGeometry(0.01, 0.4, 0.38), 0x3a7a7a, [[0.426, 0.85, -0.25]]);
  decorate(train, new BoxGeometry(0.01, 1.05, 0.44), 0x0e1416, [[0.426, 0.55, 0.25]]);
  decorate(train, new BoxGeometry(0.012, 0.12, 0.2), 0x6a4a3a, [
    [0.427, 0.2, -0.6],
    [0.427, 1.2, 0.85],
  ]);
  decorate(train, new BoxGeometry(0.86, 0.06, 2.11), 0x1e4444, [[0, 0.35, 0]]);
  decorate(train, new BoxGeometry(0.3, 0.38, 0.01), 0x14262c, [
    [-0.18, 0.88, 1.051],
    [0.18, 0.88, 1.051],
  ]);
  decorate(train, new BoxGeometry(0.1, 0.07, 0.01), 0xe8e2d0, [
    [-0.26, 0.28, 1.052],
    [0.26, 0.28, 1.052],
  ]);

  // Holloway: commuters standing on each other's shoulders, umbrellas out, a board for a head.
  const X = -0.1;
  const Z = -0.3;
  const levels: Group[][] = [];
  const commuter = (x: number, y: number, z: number, out: number, k: number, delay: number): Group[] => [
    add(new CylinderGeometry(0.1, 0.19, 0.5, 10).scale(1, 1, 0.8), COATS[k % 3], x, y, z, { delay, rotation: [0, out, 0] }),
    ball(0.085, SKIN, x, y + 0.48, z, { delay: delay + 0.02 }),
    cylinder(0.14, 0.14, 0.02, HAT, x, y + 0.6, z, { delay: delay + 0.04 }, 12),
    cylinder(0.08, 0.09, 0.1, HAT, x, y + 0.61, z, { delay: delay + 0.05 }, 10),
  ];
  for (let L = 0; L < 7; L++) {
    const y = G + 0.32 + L * 0.42;
    const r = [0.13, 0.22, 0.28, 0.32, 0.3, 0.24, 0.15][L];
    const count = L === 0 || L === 6 ? 2 : L >= 2 && L <= 4 ? 4 : 3;
    const parts: Group[] = [];
    for (let j = 0; j < count; j++) {
      const a = L * 0.9 + (j * Math.PI * 2) / count;
      const [x, z] = [X + Math.sin(a) * r, Z + Math.cos(a) * r];
      parts.push(...commuter(x, y, z, a, L + j, 0.6 + L * 0.08 + j * 0.02));
      if (L === 0) [-0.06, 0.06].forEach((dx) => parts.push(cylinder(0.04, 0.035, 0.32, 0x2a2e30, x + dx, G, z, { delay: 0.55 }, 8)));
      // Umbrellas held out from the middle of the tower.
      if (L >= 2 && L <= 5 && (j + L) % 2 === 0) {
        const hand: Point = [x + Math.sin(a) * 0.12, y + 0.3, z + Math.cos(a) * 0.12];
        const top: Point = [x + Math.sin(a) * 0.42, y + 0.72, z + Math.cos(a) * 0.42];
        parts.push(limb(kit, hand, top, 0.012, 0.012, HAT, { delay: 1.1 + L * 0.03, noInk: true }));
        const canopy = add(new SphereGeometry(0.32, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.38), BROLLY, ...top, { delay: 1.15 + L * 0.03, rotation: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5] });
        decorate(canopy, new ConeGeometry(0.015, 0.08, 5), HAT, [[0, 0.15, 0]]);
        parts.push(canopy);
      }
    }
    levels.push(parts);
  }
  // The board on top, glowing; its rows repeat the same announcement.
  const head = G + 0.32 + 6 * 0.42 + 0.72;
  const turn: Point = [0, 0.3, 0];
  const frame = box(0.64, 0.5, 0.26, 0x23262a, X, head, Z, { delay: 1.5, rotation: turn });
  const screen = box(0.54, 0.4, 0.02, 0xfff2c8, X + Math.sin(0.3) * 0.135, head + 0.05, Z + Math.cos(0.3) * 0.135, { delay: 1.55, rotation: turn, flat: true, noInk: true });
  decorate(screen, new BoxGeometry(0.4, 0.045, 0.01), 0xb8a878, [0.08, 0.19, 0.3].map((y) => [-0.02, y, 0.012] as Point));
  const cursor = box(0.07, 0.06, 0.01, 0x3a3018, 0, head, 0, { delay: 1.6, flat: true, noInk: true, rotation: turn });
  levels.push([frame, screen]);
  box(0.05, 0.12, 0.05, 0x23262a, X, head - 0.1, Z, { delay: 1.45 });

  const rest = levels.map((parts) => parts.map((part) => part.position.x));
  const restZ = levels.map((parts) => parts.map((part) => part.position.z));
  tick((t) => {
    // The tower sways like one body, more at the top.
    levels.forEach((parts, L) => {
      const dx = Math.sin(t * 0.9 - L * 0.35) * 0.012 * L;
      const dz = Math.cos(t * 0.7 - L * 0.3) * 0.008 * L;
      parts.forEach((part, i) => {
        part.position.x = rest[L][i] + dx;
        part.position.z = restZ[L][i] + dz;
      });
    });
    // The board's cursor runs along one row after another, and starts again.
    const step = Math.floor(t * 3) % 15;
    const row = Math.floor(step / 5);
    const col = step % 5;
    const sx = X + Math.sin(0.3) * 0.145;
    const sz = Z + Math.cos(0.3) * 0.145;
    const along = -0.18 + col * 0.08;
    cursor.position.set(sx + along * Math.cos(0.3), head + 0.05 + 0.3 - row * 0.11 - 0.03, sz - along * Math.sin(0.3));
    cursor.position.x += frame.position.x - rest[7][0];
    cursor.position.z += frame.position.z - restZ[7][0];
    // A strip light buzzes.
    strip.visible = Math.floor(t * 8) % 23 !== 11;
  });

  return { width: 4.9, height: 4.7, lookY: 1.95 };
}
