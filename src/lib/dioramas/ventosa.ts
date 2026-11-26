import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, YELLOW, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Ventosa (P293): the window cleaner of the high quarter hangs by one palm stuck to the glass of
 * a skyscraper, high over a toy-sized city and its volcano, a squeegee in her other hand. The
 * streak she has wiped shines, the rest of the glass is grimy; above her the cleaning cradle
 * she has no energy to run hangs crooked, its plug dangling, its lamp giving a last weak flicker.
 */
export function ventosa(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const F = octagonBase(kit, 0x1b1d2c);
  const G = floor(kit, F, 0.06, 0x1a1e2e, 0x3a2a4e, 0.42);
  const STEEL = 0x8a93a3;

  // The city far below: toy blocks with lit windows, a little temple, the volcano.
  const blocks: [number, number, number, number, number][] = [
    [-1.65, -0.35, 0.4, 0.4, 0.6],
    [-1.75, 0.45, 0.35, 0.45, 0.4],
    [-1.05, 0.25, 0.3, 0.3, 0.3],
    [-1.25, 1.15, 0.45, 0.35, 0.5],
    [-0.45, 0.85, 0.3, 0.3, 0.25],
    [-0.5, 1.6, 0.35, 0.35, 0.35],
    [0.35, 1.25, 0.4, 0.3, 0.45],
    [0.55, 0.45, 0.3, 0.3, 0.2],
    [1.15, 0.9, 0.35, 0.4, 0.35],
    [1.05, 1.65, 0.3, 0.3, 0.25],
    [-1.1, -0.65, 0.35, 0.3, 0.45],
  ];
  blocks.forEach(([x, z, w, d, h], k) => {
    const block = box(w, h, d, [0x2a2f4a, 0x3a2a4a, 0x22344a][k % 3], x, G, z, { delay: 0.1 + k * 0.03 });
    const lit: Point[] = [];
    for (let r = 0; r < Math.floor(h / 0.12); r++) for (let c = 0; c < 2; c++) if ((r + c + k) % 3 !== 0) lit.push([(c - 0.5) * w * 0.5, 0.08 + r * 0.12, d / 2 + 0.004]);
    if (lit.length) decorate(block, new BoxGeometry(0.05, 0.05, 0.008), [CYAN, YELLOW, MAGENTA][k % 3], lit);
  });
  box(0.5, 0.05, 0.3, 0xb8c0d8, -0.2, G, 0.2, { delay: 0.45 });
  [-0.38, -0.27, -0.13, -0.02].forEach((x, i) => cylinder(0.025, 0.025, 0.2, 0xb8c0d8, x, G + 0.05, 0.28, { delay: 0.47 + i * 0.02 }, 8));
  add(new ConeGeometry(0.34, 0.12, 4).rotateY(Math.PI / 4).scale(1, 1, 0.6), 0xb8c0d8, -0.2, G + 0.25, 0.2, { delay: 0.55 });
  add(new ConeGeometry(0.5, 0.6, 7), 0x3a2a40, 1.65, G, 0.05, { delay: 0.3 });
  cylinder(0.1, 0.1, 0.02, ORANGE, 1.65, G + 0.53, 0.05, { delay: 0.4, flat: true, noInk: true }, 7);
  ball(0.07, 0x5a2148, 1.7, G + 0.62, 0.05, { delay: 0.45, noInk: true });

  // The glass tower: rows of panes, a clean streak where she has wiped, grime everywhere else.
  const TZ = -1.55;
  const TD = 0.8;
  const TH = 4.2;
  const GLASS = TZ + TD / 2;
  const tower = box(2.4, TH, TD, 0x16263a, -0.1, G, TZ, { delay: 0.2, ink: 1.015 });
  const panes: Point[] = [];
  const dirty: Point[] = [];
  const clean: Point[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 6; c++) {
      const spot: Point = [-1.0 + c * 0.4, 0.42 + r * 0.5, TD / 2 + 0.005];
      if ((c === 3 || c === 4) && r >= 2 && r <= 6) clean.push(spot);
      else if ((r * 5 + c * 3) % 4 === 1) dirty.push(spot);
      else panes.push(spot);
    }
  const pane = new BoxGeometry(0.34, 0.44, 0.01);
  decorate(tower, pane, 0x2a5f80, panes);
  decorate(tower, pane, 0x4e5658, dirty);
  decorate(tower, pane, 0x9fe8ff, clean);
  decorate(
    tower,
    new CylinderGeometry(0.05, 0.05, 0.006, 8).rotateX(Math.PI / 2),
    0x3a322c,
    dirty.flatMap(([x, y, z]) => [
      [x - 0.07, y + 0.08, z + 0.004],
      [x + 0.08, y - 0.1, z + 0.004],
    ] as Point[]),
  );
  decorate(tower, new BoxGeometry(0.03, 0.32, 0.008), 0xeafcff, clean.map(([x, y, z]) => [x - 0.05, y, z + 0.004, 0.6] as [number, number, number, number]));
  // The suction rings her palms left on the way up.
  decorate(tower, new TorusGeometry(0.045, 0.01, 6, 14), 0xbff4ff, [
    [-0.25, 0.9, TD / 2 + 0.012],
    [-0.1, 1.5, TD / 2 + 0.012],
    [-0.28, 2.1, TD / 2 + 0.012],
    [-0.12, 2.7, TD / 2 + 0.012],
  ]);
  box(2.5, 0.1, 0.9, 0x2a3a50, -0.1, G + TH, TZ, { delay: 0.3 });

  // The cradle, out of power: hanging crooked on its cables, the plug dangling.
  [0.55, 1.15].forEach((x, i) => {
    box(0.07, 0.07, 0.5, STEEL, x, G + TH + 0.1, GLASS + 0.2, { delay: 0.35 + i * 0.03 });
    limb(kit, [x, G + TH + 0.1, GLASS + 0.42], [x, G + 3.62 - i * 0.12, GLASS + 0.32], 0.01, 0.01, INK, { delay: 0.4, noInk: true });
  });
  const cradle = box(0.66, 0.1, 0.3, STEEL, 0.85, G + 3.5, GLASS + 0.32, { delay: 0.45, rotation: [0, 0, -0.2] });
  decorate(cradle, new BoxGeometry(0.66, 0.2, 0.02), 0x5a6070, [[0, 0.2, 0.14]]);
  box(0.18, 0.16, 0.16, 0x3a4050, 1.0, G + 3.54, GLASS + 0.3, { delay: 0.5, rotation: [0, 0, -0.2] });
  const dead = box(0.07, 0.07, 0.07, 0x3a3a44, 1.0, G + 3.7, GLASS + 0.3, { delay: 0.55, flat: true });
  cable(kit, [[1.12, G + 3.44, GLASS + 0.34], [1.42, G + 3.15, GLASS + 0.42], [1.5, G + 2.75, GLASS + 0.4]], 0.014, INK, 0.6);
  const plug = box(0.08, 0.1, 0.05, 0xe8e4da, 1.5, G + 2.65, GLASS + 0.4, { delay: 0.65 });
  decorate(plug, new BoxGeometry(0.012, 0.05, 0.012), STEEL, [
    [-0.02, -0.02, 0],
    [0.02, -0.02, 0],
  ]);

  // Ventosa, her back to the glass, hanging from her right palm, the squeegee in her left.
  const H = 2.3;
  const u = H / 2.4;
  const HY = G + 1.3;
  const worker = figure(kit, {
    x: 0.2,
    z: -0.76,
    y: HY,
    facing: 0.3,
    height: H,
    build: "slim",
    skin: 0xe8b898,
    hair: { style: "short", color: 0xeceaf2 },
    face: { mouth: "smirk", brows: "raised", marks: 0xc8906a },
    top: { kind: "jacket", color: 0x2a8fd0, accent: 0xe8eef2 },
    bottom: { kind: "trousers", color: 0x2a8fd0 },
    shoes: 0x1c1c24,
    gloves: 0x1c1c24,
    belt: 0x1c1c24,
    arms: [[-0.32, 2.62, -0.36], [0.72, 1.45, 0.12]],
    legs: "stride",
    delay: 0.9,
  });
  const torso = worker.parts[7];
  decorate(torso, new BoxGeometry(0.05, 0.62 * u, 0.02), 0x1c1c24, [
    [-0.12 * u, 0.36 * u, 0.2],
    [0.12 * u, 0.36 * u, 0.2],
  ]);
  decorate(torso, new BoxGeometry(0.16 * u, 0.12 * u, 0.02), 0xe8eef2, [[0.16 * u, 0.5 * u, 0.19]]);
  decorate(torso, new TorusGeometry(0.035, 0.01, 6, 12), YELLOW, [
    [-0.1, 0.05, 0.21],
    [0.08, 0.04, 0.21],
  ]);
  const [palm, grip] = worker.hands;
  const glow = add(new TorusGeometry(0.11, 0.014, 6, 20), CYAN, palm[0], palm[1] - 0.11, GLASS + 0.012, { delay: 1.6, flat: true, noInk: true });
  // The squeegee: a yellow handle and a rubber blade on the glass.
  const blade: Point = [grip[0] + 0.32, grip[1] - 0.12, GLASS + 0.06];
  const kitParts: Group[] = [
    limb(kit, grip, blade, 0.025, 0.025, YELLOW, { delay: 1.5 }),
    box(0.07, 0.46, 0.06, 0xc8d0dc, blade[0], blade[1] - 0.23, blade[2], { delay: 1.55 }),
    // Her platinum fringe, swept over to one side.
    add(new SphereGeometry(0.12, 12, 8).scale(1.5, 0.5, 0.9), 0xeceaf2, ...worker.at(-0.05, 2.14 * u + 0.09, 0.1), { delay: 1.3, rotation: [0, 0.3, 0.3] }),
    limb(kit, worker.at(0.04, 2.14 * u + 0.17, 0.12), worker.at(-0.19, 2.14 * u + 0.05, 0.15), 0.07, 0.035, 0xeceaf2, { delay: 1.32 }),
  ];
  const hip = worker.at(-0.33, 0.62, 0.08);
  kitParts.push(cylinder(0.11, 0.09, 0.2, 0x5a6a80, ...hip, { delay: 1.55 }), ball(0.09, 0xf4f6f8, hip[0], hip[1] + 0.12, hip[2], { delay: 1.6 }));

  // She swings gently from the stuck palm.
  const swing = new Group();
  swing.position.set(...palm);
  const hanging = [...worker.parts, ...kitParts];
  hanging[0].parent?.add(swing);
  hanging.forEach((part) => {
    part.position.sub(swing.position);
    swing.add(part);
  });

  // Suds dripping off the bucket and the blade, all the way down.
  const drops = [0, 1, 2].map((k) => ball(0.035, 0x9fe8ff, hip[0] + k * 0.25, hip[1], hip[2] + 0.05, { delay: 1.7 + k * 0.05, flat: true }));
  const deadColor = colorOf(dead).clone();
  tick((t) => {
    swing.rotation.z = Math.sin(t * 1.3) * 0.05;
    drops.forEach((drop, k) => {
      const v = (t * 0.7 + k / 3) % 1;
      drop.position.y = hip[1] - v * (hip[1] - G - 0.1);
    });
    const s = 1 + Math.sin(t * 3) * 0.12;
    glow.children[0].scale.set(s, s, 1);
    glow.children[0].position.y = 0.124 * (1 - s);
    // A last weak flicker now and then, then dark again.
    const blink = t % 5 > 4.2 && Math.floor(t * 9) % 2 === 0;
    colorOf(dead).set(blink ? 0x8a7a3a : deadColor);
  });

  return { width: 4.9, height: 4.6, lookY: 2.0 };
}
