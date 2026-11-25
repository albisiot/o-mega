import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, TorusGeometry } from "three";
import { CYAN, YELLOW, aim, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { floor, rubble, tree } from "@/lib/diorama-props";

/**
 * Mainstay (P183): on a mountainside the rock colossus, trees growing on his shoulders and head,
 * stands guard over a village on its spur: whitewashed houses with terracotta roofs, cypresses,
 * a bell tower and a well. Every few seconds he shifts his weight: dust puffs at his feet, the
 * water in the well drops and the bell swings in alarm. The price: a power line he never noticed
 * is snagged round his shin, its pole dragged over.
 */
export function mainstay(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const ROCK = 0x5a6070;
  const ROCK_DARK = 0x464c5c;
  const MOSS = 0x3f7a45;
  const WALL = 0xd8c8a6;
  const ROOF = 0xb0503a;
  const CYPRESS = 0x1f4a32;
  const DUST = 0x9a9488;
  const F = octagonBase(kit, 0x1c2420);
  const G = floor(kit, F, 0.06, 0x2e3a2c, 0x24302a, 0);
  rubble(kit, -1.6, 0.9, G, 0.1, 6, 0.5, ROCK_DARK);
  rubble(kit, 0.9, -1.3, G, 0.12, 5, 0.45, ROCK_DARK);

  // The colossus, in his own frame: feet, arched legs, a body of rock, arms hanging, a small head.
  const DF = 0.3;
  const X0 = -0.5;
  const Z0 = -0.45;
  const d = (lx: number, ly: number, lz: number): Point => [X0 + lx * Math.cos(DF) + lz * Math.sin(DF), G + ly, Z0 - lx * Math.sin(DF) + lz * Math.cos(DF)];
  const body: Group[] = [];
  const rock = (r: number, sx: number, sy: number, sz: number, at: Point, color: number, delay: number) =>
    body.push(add(new DodecahedronGeometry(r).scale(sx, sy, sz), color, at[0], at[1] - r * sy, at[2], { delay, rotation: [0.3, DF + 0.4, 0.2] }));
  const stone = (from: Point, to: Point, r1: number, r2: number, delay: number) => {
    const { length, rotation } = aim(from, to);
    body.push(add(new CylinderGeometry(r2, r1, length, 6), ROCK, ...from, { delay, rotation }));
  };
  [-1, 1].forEach((side, i) => {
    rock(0.3, 1.1, 0.6, 1.3, d(side * 0.55, 0.2, 0.08), ROCK_DARK, 0.3 + i * 0.03);
    stone(d(side * 0.55, 0.1, 0), d(side * 0.4, 1.55, -0.05), 0.34, 0.4, 0.34 + i * 0.03);
  });
  rock(0.72, 1.25, 1.15, 0.8, d(0, 2.25, -0.05), ROCK, 0.45);
  rock(0.42, 1.2, 0.8, 1, d(0, 1.6, 0), ROCK_DARK, 0.42);
  [-1, 1].forEach((side, i) => {
    rock(0.36, 1, 1, 1, d(side * 0.82, 2.72, 0), ROCK, 0.5 + i * 0.03);
    stone(d(side * 0.92, 2.6, 0.02), d(side * 1.08, 1.75, 0.2), 0.24, 0.22, 0.54 + i * 0.03);
    stone(d(side * 1.08, 1.8, 0.2), d(side * 0.98, 1.05, 0.32), 0.21, 0.19, 0.58 + i * 0.03);
    rock(0.22, 1.1, 1, 1, d(side * 0.98, 1.05, 0.32), ROCK_DARK, 0.62 + i * 0.03);
  });
  // The head, sunk between the shoulders, eyes glowing in a heavy brow.
  rock(0.3, 1, 1.1, 0.95, d(0, 3.3, 0.18), ROCK, 0.66);
  const brow = add(new BoxGeometry(0.5, 0.1, 0.2), ROCK_DARK, ...d(0, 3.2, 0.42), { delay: 0.7, rotation: [0, DF, 0] });
  decorate(brow, new BoxGeometry(0.11, 0.06, 0.01), CYAN, [
    [-0.12, -0.05, 0.101],
    [0.12, -0.05, 0.101],
  ]);
  body.push(brow);
  // Moss and trees: a little wood on his head and shoulders.
  [
    [0, 3.42, 0.05, 0.75],
    [-0.85, 3.0, -0.05, 0.6],
    [0.8, 3.0, 0.05, 0.55],
    [-0.3, 2.95, -0.25, 0.5],
    [0.4, 2.9, -0.3, 0.6],
  ].forEach(([lx, ly, lz, h], i) => body.push(...tree(kit, ...dxz(d(lx, 0, lz)), G + ly, 0.8 + i * 0.05, h, i % 2 ? MOSS : 0x2f6a3a)));
  [
    [-0.45, 2.1],
    [0.4, 2.5],
    [0.1, 1.75],
    [-0.2, 2.7],
  ].forEach(([lx, ly], i) => body.push(ball(0.16, MOSS, ...d(lx, ly - 0.16, 0.55 - Math.abs(lx) * 0.2), { delay: 0.75 + i * 0.03 })));

  // The village on its spur: houses, cypresses, a bell tower, a well in the little square.
  const VX = 1.15;
  const VZ = 0.95;
  cylinder(0.85, 0.95, 0.35, 0x4a5244, VX, G, VZ, { delay: 0.15, rotation: [0, 0.3, 0] }, 7);
  const V = G + 0.35;
  [
    [0.72, 1.3, 0.2],
    [1.08, 1.6, -0.1],
    [1.55, 1.15, 0.5],
    [0.62, 0.82, -0.3],
  ].forEach(([x, z, turn], i) => {
    const house = box(0.3, 0.24, 0.26, WALL, x, V, z, { delay: 0.2 + i * 0.04, rotation: [0, turn, 0] });
    decorate(house, new BoxGeometry(0.05, 0.06, 0.01), YELLOW, [
      [-0.07, 0.14, 0.131],
      [0.07, 0.14, 0.131],
    ]);
    add(new ConeGeometry(0.24, 0.13, 4).rotateY(Math.PI / 4), ROOF, x, V + 0.24, z, { delay: 0.24 + i * 0.04, rotation: [0, turn, 0] });
  });
  [
    [1.75, 0.65],
    [0.4, 1.5],
    [1.4, 1.7],
  ].forEach(([x, z], i) => add(new ConeGeometry(0.07, 0.5, 7), CYPRESS, x, V, z, { delay: 0.3 + i * 0.03 }));
  const TX = 1.5;
  const TZ = 0.55;
  const belfry = box(0.18, 0.75, 0.18, WALL, TX, V, TZ, { delay: 0.32 });
  decorate(belfry, new BoxGeometry(0.1, 0.12, 0.01), 0x2a2228, [[0, 0.6, 0.091]]);
  add(new ConeGeometry(0.15, 0.16, 4).rotateY(Math.PI / 4), ROOF, TX, V + 0.75, TZ, { delay: 0.36 });
  // The bell hangs from a pivot at its top, to swing.
  const bell = new Group();
  bell.position.set(TX, V + 0.66, TZ + 0.06);
  const cone = add(new ConeGeometry(0.04, 0.07, 10), 0xb08d3c, 0, -0.07, 0, { delay: 0.4 });
  cone.parent?.add(bell);
  bell.add(cone);
  const WX = 1.1;
  const WZ = 1.05;
  add(new CylinderGeometry(0.16, 0.16, 0.16, 14, 1, true), 0x8a8a80, WX, V, WZ, { delay: 0.38 });
  const water = cylinder(0.15, 0.15, 0.01, 0x1f8fb0, WX, V + 0.12, WZ, { delay: 0.42, flat: true, noInk: true }, 14);
  [-1, 1].forEach((side) => box(0.025, 0.3, 0.025, 0x5e4a3a, WX + side * 0.15, V + 0.16, WZ, { delay: 0.44, noInk: true }));
  box(0.36, 0.03, 0.03, 0x5e4a3a, WX, V + 0.46, WZ, { delay: 0.46, noInk: true });

  // The price: a power line snagged round his shin, its pole dragged over.
  const shin = d(0.5, 0.7, 0.05);
  add(new TorusGeometry(0.4, 0.015, 4, 20).rotateX(Math.PI / 2), 0x14121c, shin[0], shin[1], shin[2], { delay: 1.2, noInk: true });
  const PX = 0.35;
  const PZ = 0.85;
  cylinder(0.025, 0.03, 0.75, 0x5e4a3a, PX, G, PZ, { delay: 1.1, rotation: [-0.35, 0, 0.5] }, 6);
  const top: Point = [PX - Math.sin(0.5) * 0.7, G + 0.6, PZ - 0.25];
  cable(kit, [top, [(top[0] + shin[0]) / 2, G + 0.45, (top[2] + shin[2]) / 2], [shin[0] + 0.3, shin[1], shin[2] + 0.2]], 0.012, 0x14121c, 1.25);
  cable(kit, [top, [0.6, G + 0.5, 1.2], [0.72, V + 0.2, 1.3]], 0.01, 0x14121c, 1.25);

  // Dust round his feet: a puff each time he moves.
  const puffs = [d(-0.75, 0, 0.45), d(0.75, 0, 0.45), d(0, 0, 0.6)].map((p, i) => ball(0.2, 0xb8b0a0, p[0], G, p[2], { delay: 1 + i * 0.02, noInk: true }));
  motes(10, DUST, 0.03, [-1.3, G, -0.4], [0.5, G + 1.2, 0.6], 1.3);

  const rest = body.map((part) => part.position.clone());
  const restWater = water.position.y;
  tick((t) => {
    // A shift of weight every six seconds, then the village feels it.
    const p = t % 6;
    const lift = p < 1.2 ? Math.sin((p / 1.2) * Math.PI) : 0;
    const after = p < 1.2 ? 0 : Math.exp(-(p - 1.2) * 0.8);
    body.forEach((part, i) => {
      part.position.x = rest[i].x + lift * 0.05;
      part.position.y = rest[i].y + lift * 0.07;
    });
    water.position.y = restWater - (after + lift * 0.5) * 0.09;
    bell.rotation.z = Math.sin(t * 9) * 0.6 * after;
    puffs.forEach((puff, i) => {
      puff.visible = p >= 1.2 && p < 3;
      puff.children.forEach((mesh) => mesh.scale.setScalar(0.5 + (p - 1.2) * 0.6 + i * 0.1));
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}

/** A point's x and z, to place a prop under it. */
function dxz(p: Point): [number, number] {
  return [p[0], p[2]];
}
