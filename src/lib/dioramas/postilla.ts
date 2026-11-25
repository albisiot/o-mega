import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bin, column, facade, floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Postilla (P270): the chancellor who kept the Seal for a year stands in a wet alley of the old
 * town, washing hung between a house and a column. Gaunt, wild-haired, his eyes gone pale and
 * glowing, he clutches the Seal's empty case and keeps opening it to look again. He could not
 * stop himself: red wax seals are stamped on everything round him, the washing, the wall, the
 * column, the bin, a pigeon, and on his own cheeks, neck and hands.
 */
export function postilla(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WAX = 0xc81e3a;
  const WAX_DARK = 0x6a0a1a;
  const F = octagonBase(kit, 0x1c1c28);
  const G = floor(kit, F, 0.06, 0x2a2a3a, 0x1c1c28, 0.3);

  /** Red wax seals stuck on a part, facing +z (or up, `flat`), at its own spots. */
  const stamp = (part: Group, spots: Point[], size = 0.06, flat = false, turn = 0) => {
    const disc = new CylinderGeometry(size, size, 0.015, 14);
    const ring = new TorusGeometry(size * 0.55, size * 0.14, 6, 14);
    if (!flat) disc.rotateX(Math.PI / 2).rotateY(turn);
    else ring.rotateX(Math.PI / 2);
    ring.rotateY(turn);
    decorate(part, disc, WAX, spots);
    const out: Point = flat ? [0, 0.009, 0] : [Math.sin(turn) * 0.009, 0, Math.cos(turn) * 0.009];
    decorate(
      part,
      ring,
      WAX_DARK,
      spots.map(([x, y, z]) => [x + out[0], y + out[1], z + out[2]] as Point),
    );
  };

  // The alley: a house front, a column, the lantern, a bin, a puddle; all stamped.
  const wall = facade(kit, -0.75, -1.4, G, 0.1, { width: 1.6, height: 2.8, color: 0x2e3450, windows: 2, floors: 3, door: true });
  stamp(wall, [
    [-0.55, 0.45, 0.152],
    [0.5, 1.2, 0.152],
    [-0.15, 2.3, 0.152],
  ]);
  const shaft = column(kit, 1.3, -0.95, G, 0.2, 2.8, false, 0x5a6a84)[1];
  stamp(shaft, [[0, 1.0, 0.2]]);
  const light = wallLantern(kit, -1.3, -1.25, G + 1.95, 0.3);
  const can = bin(kit, -1.4, 0.35, G, 0.4)[0];
  stamp(can, [[0, 0.25, 0.165]], 0.05);
  puddle(kit, 0.9, 1.15, G, 0.4, 0.35, CYAN);
  const cobble = box(0.24, 0.02, 0.18, 0x3a3a4a, -0.9, G, 1.2, { delay: 0.45, rotation: [0, 0.4, 0] });
  stamp(cobble, [[0, 0.02, 0]], 0.06, true);

  // The washing line from the house to the column, every piece of washing sealed.
  const from: Point = [-0.4, G + 2.5, -1.24];
  const to: Point = [1.3, G + 2.5, -0.78];
  cable(kit, [from, [0.45, G + 2.3, -1.0], to], 0.01, 0xd8d2c4, 0.5);
  const washing: Group[] = [];
  [
    [0.05, 0.38, 0.5, 0x7a9ab8],
    [0.45, 0.32, 0.4, 0xd8d2c4],
    [0.85, 0.26, 0.55, 0x8a4a7a],
  ].forEach(([u, w, h, color], i) => {
    const x = from[0] + (to[0] - from[0]) * (u + 0.25);
    const z = from[2] + (to[2] - from[2]) * (u + 0.25);
    const y = G + 2.33 + Math.abs(u - 0.4) * 0.22;
    const pivot = new Group();
    pivot.position.set(x, y, z);
    const cloth = box(w, h, 0.02, color, x, y - h, z, { delay: 0.55 + i * 0.04, rotation: [0, 0.27, 0] });
    stamp(cloth, [[0, h * 0.5, 0.012]], 0.055);
    cloth.parent?.add(pivot);
    cloth.position.sub(pivot.position);
    pivot.add(cloth);
    washing.push(pivot);
  });

  // A pigeon on the cobbles, sealed too, pecking.
  const PX = 1.15;
  const PZ = 0.55;
  const body = add(new SphereGeometry(0.11, 12, 10).scale(1.4, 0.9, 0.9), 0x8a8a9a, PX, G + 0.04, PZ, { delay: 0.6, rotation: [0, -0.6, 0] });
  stamp(body, [[0, 0.1, 0.095]], 0.035);
  cylinder(0.008, 0.008, 0.05, 0xd06a50, PX, G, PZ, { delay: 0.6 }, 4);
  const pigeonHead = ball(0.06, 0x6a6a7a, PX - 0.12, G + 0.2, PZ - 0.08, { delay: 0.65 });
  decorate(pigeonHead, new BoxGeometry(0.05, 0.02, 0.02), YELLOW, [[-0.05, 0.05, 0.02]]);

  // Postilla, gaunt in a torn dark robe, the empty case in both hands.
  const FACE = 0.35;
  const clerk = figure(kit, {
    x: -0.1,
    z: 0.35,
    y: G,
    facing: FACE,
    height: 2.45,
    build: "slim",
    skin: 0xd8b8a0,
    hair: { style: "wild", color: 0x2a2226 },
    face: { mouth: "frown", brows: "worried", eyes: 0x9ff4ff, glow: true },
    top: { kind: "robe", color: 0x1e2a3a },
    shoes: 0x1a1a20,
    scarf: 0xd8d2c4,
    arms: [
      [-0.12, 1.36, 0.46],
      [0.12, 1.3, 0.46],
    ],
    delay: 0.8,
  });
  const r = clerk.headRadius;
  stamp(clerk.headPart, [[0.12, r * 1.06 - 0.07, 0.155]], 0.045, false, 0.6);
  stamp(clerk.headPart, [[-0.13, r * 1.06 - 0.02, 0.155]], 0.04, false, -0.6);
  const o = (delay: number): { delay: number; rotation: [number, number, number] } => ({ delay, rotation: [0, FACE, 0] });
  const neck = box(0.01, 0.01, 0.01, 0x1e2a3a, ...clerk.at(0.05, 1.83, 0.1), { ...o(1.3), noInk: true });
  stamp(neck, [[0, 0, 0]], 0.04);
  clerk.hands.forEach((hand, i) => {
    const dot = box(0.01, 0.01, 0.01, 0xd8b8a0, hand[0], hand[1] - 0.05, hand[2], { ...o(1.32 + i * 0.02), noInk: true });
    stamp(dot, [[0, 0, 0.08]], 0.035);
  });
  // The tattered hem of the robe.
  [-0.3, -0.1, 0.12, 0.3].forEach((lx, i) => box(0.12, 0.1, 0.02, 0x1e2a3a, ...clerk.at(lx, 0.06, 0.4 - Math.abs(lx) * 0.3), { delay: 1.1 + i * 0.02, rotation: [0, FACE, i % 2 ? 0.6 : -0.5] }));

  // The empty case of the Seal, its lid opening and shutting.
  const mid = clerk.at(0, 1.26, 0.5);
  const tin = cylinder(0.15, 0.15, 0.12, 0x5a6070, ...mid, { delay: 1.4 }, 18);
  decorate(tin, new CylinderGeometry(0.13, 0.13, 0.01, 18), 0x14121c, [[0, 0.121, 0]]);
  const hinge = clerk.at(0, 1.38, 0.36);
  const lid = new Group();
  lid.position.set(...hinge);
  const cover = cylinder(0.155, 0.155, 0.03, 0x6a7080, hinge[0], hinge[1], hinge[2], { delay: 1.45 }, 18);
  cover.parent?.add(lid);
  cover.position.set(0, 0, 0.14);
  lid.add(cover);
  lid.rotation.order = "YXZ";

  tick((t) => {
    const open = Math.min(1, Math.max(0, Math.sin(t * 1.2) * 1.6 + 0.6));
    lid.rotation.set(-open * 1.7, FACE, 0);
    washing.forEach((pivot, i) => (pivot.rotation.x = Math.sin(t * 1.4 + i * 1.1) * 0.1));
    pigeonHead.position.y = G + 0.2 - (Math.sin(t * 3) > 0.6 ? 0.08 : 0);
    light.visible = Math.floor(t * 6) % 19 !== 3;
  });

  return { width: 4.9, height: 4.3, lookY: 1.5 };
}
