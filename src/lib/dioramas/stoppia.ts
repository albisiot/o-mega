import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, aim, archMouth, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, flame, floor } from "@/lib/diorama-props";

/**
 * Stoppia (P262): the company's cook feeds the refugees in the necropolis. Before a wall of
 * burial niches lit by candles she stirs a cauldron of soup over the fire with a long wooden
 * spoon, a copper pot strapped to her back, while a hooded child waits with a bowl. The world can
 * wait: a sword stuck in the floor serves as a hook for her ladle and dish towel, and a book of
 * Sillabe she cannot read is her chopping board.
 */
export function stoppia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x3a3150;
  const BONE = 0xd8d0bc;
  const WOOD = 0x6b4a30;
  const POT = 0x24222c;
  const SOUP = 0xd88a2a;
  const COPPER = 0xb0603a;
  const STEEL = 0x8a93a3;
  const F = octagonBase(kit, 0x221e2c);
  const G = floor(kit, F, 0.06, 0x2e2a3a, 0x1e1a28, 0.45);

  // The necropolis wall: two rows of arched niches on ledges, candles in some, a skull in one.
  const wall = box(3.0, 2.5, 0.3, STONE, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  const rows = [0.35, 1.3];
  const columns = [-1.05, -0.35, 0.35, 1.05];
  decorate(wall, archMouth(0.24, 0.3), 0x120f1a, rows.flatMap((y) => columns.map((x) => [x, y, 0.151] as Point)));
  rows.forEach((y, i) => box(2.9, 0.05, 0.16, 0x4a4064, 0, G + y - 0.05, -1.3, { delay: 0.16 + i * 0.03 }));
  const candles = [
    [-1.05, 1.3],
    [0.35, 1.3],
    [1.12, 1.3],
    [-0.35, 0.35],
    [1.05, 0.35],
  ].map(([x, y], i) => {
    cylinder(0.035, 0.035, 0.14, BONE, x, G + y, -1.32, { delay: 0.3 + i * 0.03 }, 8);
    return add(new ConeGeometry(0.035, 0.1, 6), 0xffd060, x, G + y + 0.15, -1.32, { delay: 0.34 + i * 0.03, flat: true, noInk: true });
  });
  const skull = ball(0.12, BONE, -0.4, G + 1.3, -1.36, { delay: 0.4 });
  decorate(skull, new BoxGeometry(0.05, 0.045, 0.02), INK, [
    [-0.045, 0.13, 0.11],
    [0.045, 0.13, 0.11],
  ]);

  // The fire, the cauldron on its three legs, the soup.
  const PX = 0.8;
  const PZ = 0.6;
  [0.4, -0.6, 1.6].forEach((turn, i) => add(new CylinderGeometry(0.05, 0.05, 0.62, 8).rotateZ(Math.PI / 2), WOOD, PX, G, PZ, { delay: 0.3 + i * 0.03, rotation: [0, turn, 0] }));
  const fire = flame(kit, PX, PZ, G + 0.06, 0.4, 0.75);
  [0, 2.1, 4.2].forEach((angle, i) => cylinder(0.025, 0.03, 0.48, POT, PX + Math.cos(angle) * 0.3, G, PZ + Math.sin(angle) * 0.3, { delay: 0.42 + i * 0.02 }, 6));
  const bottom = G + 0.36;
  add(new SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0.75, Math.PI - 0.75).scale(1, 0.85, 1), POT, PX, bottom, PZ, { delay: 0.5 });
  const brim = bottom + 0.736;
  cylinder(0.345, 0.345, 0.03, SOUP, PX, brim - 0.04, PZ, { delay: 0.56, noInk: true }, 20);
  add(new TorusGeometry(0.345, 0.045, 8, 24).rotateX(Math.PI / 2), POT, PX, brim - 0.045, PZ, { delay: 0.58 });
  [-1, 1].forEach((side) => add(new TorusGeometry(0.08, 0.02, 6, 12), POT, PX + side * 0.5, bottom + 0.48, PZ, { delay: 0.6, rotation: [0, Math.PI / 2, 0] }));
  const bubbles = [
    [0.12, 0.1],
    [-0.15, -0.05],
    [0.05, -0.18],
  ].map(([dx, dz], i) => ball(0.04, 0xf0b050, PX + dx, brim - 0.03, PZ + dz, { delay: 0.62 + i * 0.02, noInk: true }));
  motes(10, 0xcfe8f0, 0.035, [PX - 0.25, brim + 0.1, PZ - 0.25], [PX + 0.25, brim + 1.3, PZ + 0.25], 1);

  // Stoppia: short and stout, a green headscarf, an ochre quilted jacket, a patched apron.
  const X = -0.4;
  const Z = 0.2;
  const FACE = 0.45;
  const c = Math.cos(FACE);
  const s = Math.sin(FACE);
  const at = (lx: number, ly: number, lz: number): Point => [X + lx * c + lz * s, G + ly, Z - lx * s + lz * c];
  const local = (p: Point): Point => [(p[0] - X) * c - (p[2] - Z) * s, p[1] - G, (p[0] - X) * s + (p[2] - Z) * c];
  const grip = at(-0.02, 1.48, 0.3);
  const stir: Point = [PX - 0.08, brim - 0.12, PZ + 0.02];
  const along = (k: number): Point => [grip[0] + (stir[0] - grip[0]) * k, grip[1] + (stir[1] - grip[1]) * k, grip[2] + (stir[2] - grip[2]) * k];
  figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: FACE,
    height: 1.95,
    build: "heavy",
    skin: 0xe8b090,
    hair: { style: "curly", color: 0x6a3a26 },
    face: { mouth: "smile", brows: "raised", marks: 0xc87a5a },
    headwear: { kind: "bandana", color: 0x4a6a52 },
    top: { kind: "apron", color: 0x9a7a30, accent: 0xb8a890, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x2a2838 },
    shoes: 0x3a2a22,
    arms: [local(along(0.1)), local(along(0.4))],
    delay: 0.8,
  });
  const turn = (part: ReturnType<typeof box>, tilt = 0) => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt, FACE, 0);
    return part;
  };
  // Her long skirt and the patched apron over it.
  turn(add(new CylinderGeometry(0.39, 0.56, 0.78, 18).scale(1, 1, 0.8), 0x2a2838, ...at(0, 0.1, 0), { delay: 0.86 }));
  const apron = turn(box(0.52, 0.62, 0.03, 0xb8a890, ...at(0, 0.2, 0.44), { delay: 0.9 }), -0.16);
  decorate(apron, new BoxGeometry(0.13, 0.13, 0.01), MAGENTA, [[-0.1, 0.36, 0.02, 0.2]]);
  decorate(apron, new BoxGeometry(0.12, 0.12, 0.01), 0x2f6f7a, [[0.1, 0.18, 0.02, -0.3]]);
  // The copper pot on her back, peeking over her shoulder, and its straps.
  turn(cylinder(0.24, 0.21, 0.78, COPPER, ...at(-0.2, 1.02, -0.36), { delay: 1.2 }, 14));
  turn(cylinder(0.25, 0.25, 0.05, 0x7a3a22, ...at(-0.2, 1.79, -0.36), { delay: 1.24 }, 14));
  [-0.2, 0.2].forEach((dx) => turn(box(0.06, 0.46, 0.03, 0x3a2a22, ...at(dx, 1.0, 0.26), { delay: 1.28 }), -0.1));

  // The long spoon, pivoting at her grip, stirring.
  const top: Point = along(-0.18);
  const length = aim(top, stir).length;
  const spoon = limb(kit, top, stir, 0.028, 0.028, WOOD, { delay: 1.4 });
  decorate(spoon, new SphereGeometry(0.07, 10, 8).scale(1, 1.5, 0.5), WOOD, [[0, length, 0]]);

  // A hooded child waiting with a bowl.
  const child = figure(kit, {
    x: -1.4,
    z: 0.95,
    y: G,
    facing: 1.15,
    height: 1.35,
    build: "child",
    skin: 0xd8a888,
    face: { mouth: "open", brows: "worried" },
    headwear: { kind: "hood", color: 0x4a3a5a },
    top: { kind: "robe", color: 0x3a3450 },
    arms: [
      [-0.07, 0.86, 0.34],
      [0.07, 0.86, 0.34],
    ],
    delay: 1.3,
  });
  const bowlAt = child.at(0, 0.82, 0.36);
  cylinder(0.12, 0.07, 0.08, WOOD, ...bowlAt, { delay: 1.7 }, 12);

  // The world can wait: a sword stuck in the floor, hung with her ladle and a dish towel.
  const SX = 1.55;
  const SZ = -0.55;
  box(0.08, 0.95, 0.02, STEEL, SX, G - 0.05, SZ, { delay: 0.6, rotation: [0, -0.4, 0.06] });
  box(0.36, 0.05, 0.07, 0x5a4a3a, SX + 0.06, G + 0.88, SZ, { delay: 0.64, rotation: [0, -0.4, 0.06] });
  cylinder(0.03, 0.03, 0.22, 0x3a2a22, SX + 0.06, G + 0.92, SZ, { delay: 0.66 }, 8);
  ball(0.045, 0x5a4a3a, SX + 0.07, G + 1.13, SZ, { delay: 0.68 });
  const towel = box(0.2, 0.42, 0.02, 0xd8d2c4, SX - 0.06, G + 0.5, SZ + 0.08, { delay: 0.7, rotation: [0, -0.4, 0] });
  decorate(towel, new BoxGeometry(0.2, 0.04, 0.01), CYAN, [
    [0, 0.08, 0.012],
    [0, 0.16, 0.012],
  ]);
  cylinder(0.015, 0.015, 0.5, STEEL, SX + 0.22, G + 0.42, SZ - 0.04, { delay: 0.72 }, 6);
  add(new SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), STEEL, SX + 0.22, G + 0.35, SZ - 0.04, { delay: 0.74 });

  // A book of Sillabe she cannot read, used as a chopping board.
  crate(kit, -1.45, -0.7, G, 0.4, 0.5, 0x5e4a3a, 0.3);
  const book = box(0.46, 0.05, 0.34, 0x5a2148, -1.45, G + 0.5, -0.7, { delay: 0.5, rotation: [0, 0.3, 0] });
  decorate(book, new BoxGeometry(0.42, 0.02, 0.3), 0xe8e2d0, [[0, 0.05, 0]]);
  decorate(book, new BoxGeometry(0.012, 0.022, 0.3), INK, [[0, 0.06, 0]]);
  decorate(book, new BoxGeometry(0.12, 0.024, 0.012), 0x2a6a8a, [
    [-0.12, 0.06, -0.08],
    [-0.12, 0.06, 0.0],
    [0.12, 0.06, -0.06],
  ]);
  [-0.08, 0.0, 0.08].forEach((dz, i) => add(new ConeGeometry(0.03, 0.16, 6).rotateZ(Math.PI / 2), 0xff8a00, -1.38, G + 0.58, -0.65 + dz, { delay: 0.56 + i * 0.02 }));
  box(0.22, 0.015, 0.04, STEEL, -1.6, G + 0.58, -0.68, { delay: 0.6, rotation: [0, 0.8, 0] });

  const fireRest = fire.map((part) => part.children.map((mesh) => mesh.scale.y));
  tick((t) => {
    const target: Point = [stir[0] + Math.cos(t * 2.2) * 0.1, stir[1], stir[2] + Math.sin(t * 2.2) * 0.1];
    spoon.rotation.set(...aim(top, target).rotation);
    fire.forEach((part, i) => part.children.forEach((mesh, k) => (mesh.scale.y = fireRest[i][k] * (1 + 0.15 * Math.sin(t * (13 + i * 4))))));
    candles.forEach((candle, i) => (candle.children[0].scale.y = 1 + 0.25 * Math.sin(t * (9 + i * 1.7) + i)));
    bubbles.forEach((bubble, i) => (bubble.visible = (t * 1.3 + i * 0.37) % 1 < 0.6));
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
