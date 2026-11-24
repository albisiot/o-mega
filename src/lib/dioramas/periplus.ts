import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, type Mesh } from "three";
import { CYAN, INK, MAGENTA, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { rubble } from "@/lib/diorama-props";

/**
 * Periplus (P154): the masked cartographer at his field table on a headland over the sea, map
 * tubes on his back, goggles of three lenses, the dividers walking over a freshly stamped chart.
 * Out in the water an islet with a little town drifts along the coast, and the coastline drawn
 * on his map wriggles after it: by tonight the map will be a lie with a stamp on it.
 */
export function periplus(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WATER = 0x0e3a4e;
  const EARTH = 0x4a4438;
  const GRASS = 0x3a5a3a;
  const WOOD = 0x5e4a3a;
  const LEATHER = 0x6a3e26;
  const BRASS = 0xc8a040;
  const PAPER = 0xd8cfb0;
  const SAND = 0xd0bc90;
  const F = octagonBase(kit, WATER);

  // The headland: a slab of land over the front and left of the base, the sea behind it.
  const coast: [number, number][] = [
    [-2.2, 0.92],
    [-0.92, 2.2],
    [0.92, 2.2],
    [2.2, 0.92],
    [2.2, 0.4],
    [1.5, 0.05],
    [0.95, -0.5],
    [0.15, -0.78],
    [-0.75, -0.98],
    [-1.55, -0.88],
    [-2.2, -0.62],
  ];
  const shape = new Shape();
  coast.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  add(new ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: false }).rotateX(-Math.PI / 2), EARTH, 0, F, 0, { delay: 0.08, ink: 1.012 });
  const G = F + 0.32;
  rubble(kit, -1.55, -0.65, G - 0.05, 0.2, 4, 0.3, 0x5a5448);
  rubble(kit, 1.2, -0.05, G - 0.05, 0.22, 3, 0.25, 0x5a5448);
  [
    [-1.6, 0.6],
    [-0.9, 1.5],
    [1.5, 1.0],
    [0.7, 1.7],
    [-1.9, -0.2],
  ].forEach(([x, z], i) => add(new ConeGeometry(0.08, 0.26, 5), GRASS, x, G, z, { delay: 0.3 + i * 0.03, rotation: [0.25 * (i - 2), 0, 0.2] }));

  // Out at sea: an islet with its little town, which will not stay where it was drawn.
  const islet = [
    add(new SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.3, 0.35, 0.7), SAND, 1.0, F, -1.45, { delay: 0.3 }),
    box(0.16, 0.2, 0.16, 0xe0d8c4, 0.9, F + 0.1, -1.45, { delay: 0.36 }),
    box(0.14, 0.14, 0.14, 0xe0d8c4, 1.15, F + 0.1, -1.5, { delay: 0.38 }),
    add(new SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xb0603a, 1.15, F + 0.24, -1.5, { delay: 0.39 }),
    add(new ConeGeometry(0.06, 0.4, 8), 0x2f6a3a, 0.7, F + 0.08, -1.4, { delay: 0.4 }),
  ];
  const isletX = islet.map((part) => part.position.x);
  const foam = add(new TorusGeometry(0.52, 0.016, 6, 30).rotateX(Math.PI / 2).scale(1.05, 1, 0.65), 0xcfeef7, 1.0, F + 0.002, -1.45, { delay: 0.42, flat: true, noInk: true });

  // Periplus behind his field table, dividers in the right hand, the stamp just lifted in the left.
  const theta = 0.3;
  const maker = figure(kit, {
    x: -0.35,
    z: -0.12,
    y: G,
    facing: theta,
    height: 2.4,
    skin: 0xb08060,
    face: { brows: "none", mask: "lower", maskColor: 0xe8e4da, glasses: "goggles", glassesColor: 0x7a5a2a },
    headwear: { kind: "helmet", color: 0x5a3a28, accent: 0x3a2a1e },
    top: { kind: "coat", color: LEATHER, accent: 0x3a2a22 },
    bottom: { kind: "trousers", color: 0x3a2a22 },
    belt: 0x3a2a1e,
    gloves: 0x3a2a1e,
    scarf: 0x4a5a54,
    shoes: 0x2a2018,
    arms: [
      [-0.28, 1.02, 0.56],
      [0.34, 1.24, 0.58],
    ],
    delay: 0.9,
  });
  const at = maker.at;
  const turn: Point = [0, theta, 0];
  // Three brass lenses over the goggles.
  decorate(maker.headPart, new CylinderGeometry(0.042, 0.042, 0.03, 12).rotateX(Math.PI / 2), BRASS, [
    [-0.075, 0.262, 0.215],
    [0.075, 0.262, 0.215],
    [0, 0.33, 0.2],
  ]);
  decorate(maker.headPart, new CylinderGeometry(0.028, 0.028, 0.03, 12).rotateX(Math.PI / 2), CYAN, [
    [-0.075, 0.262, 0.226],
    [0.075, 0.262, 0.226],
    [0, 0.33, 0.211],
  ]);
  // The quiver of map tubes on his back.
  [
    [-0.12, -0.3, 2.3],
    [-0.28, -0.5, 2.18],
    [0.05, -0.1, 2.24],
    [-0.4, -0.68, 2.05],
  ].forEach(([x0, x1, top], i) => {
    limb(kit, at(x0, 1.05, -0.34), at(x1, top, -0.42), 0.06, 0.06, 0xc8b48a, { delay: 1.3 + i * 0.03 });
    const cap = at(x1, top, -0.42);
    ball(0.07, BRASS, cap[0], cap[1] - 0.07, cap[2], { delay: 1.4 + i * 0.03 });
  });
  limb(kit, at(-0.32, 1.72, 0.16), at(0.24, 1.08, 0.24), 0.03, 0.03, 0x3a2a1e, { delay: 1.35 });

  // The folding table, the chart on it with its coast in cyan, the compass and the stamp's mark.
  const table = box(1.15, 0.06, 0.66, WOOD, ...at(0, 0.84, 0.62), { delay: 0.5, rotation: turn });
  decorate(table, new BoxGeometry(1.15, 0.02, 0.02), 0x3e3028, [[0, 0.03, 0.335]]);
  [-1, 1].forEach((side) => {
    limb(kit, at(side * 0.45, 0, 0.38), at(side * 0.45, 0.84, 0.86), 0.025, 0.025, 0x3e3028, { delay: 0.45 });
    limb(kit, at(side * 0.45, 0, 0.86), at(side * 0.45, 0.84, 0.38), 0.025, 0.025, 0x3e3028, { delay: 0.47 });
  });
  const chart = box(1.0, 0.012, 0.56, PAPER, ...at(0, 0.9, 0.62), { delay: 0.6, rotation: turn, noInk: true });
  decorate(chart, new BoxGeometry(0.5, 0.004, 0.25), 0x9fc8d8, [[0.18, 0.012, -0.12]]);
  decorate(chart, new BoxGeometry(0.2, 0.006, 0.022), 0x1f6f9c, [
    [-0.4, 0.014, 0.03, 0],
    [-0.22, 0.014, 0.0, 0],
    [-0.04, 0.014, 0.04, 0],
    [0.14, 0.014, 0.0, 0],
    [0.32, 0.014, 0.05, 0],
  ]);
  const coastline = chart.children.slice(-5) as Mesh[];
  decorate(chart, new TorusGeometry(0.06, 0.012, 6, 20).rotateX(Math.PI / 2), MAGENTA, [[0.3, 0.014, 0.17]]);
  decorate(chart, new BoxGeometry(0.03, 0.006, 0.03), MAGENTA, [[0.3, 0.014, 0.17]]);
  const compass = cylinder(0.08, 0.08, 0.04, BRASS, ...at(-0.42, 0.9, 0.82), { delay: 0.7 }, 16);
  decorate(compass, new CylinderGeometry(0.065, 0.065, 0.01, 16), 0xf2f0ea, [[0, 0.04, 0]]);
  decorate(compass, new BoxGeometry(0.11, 0.012, 0.018), MAGENTA, [[0, 0.048, 0]]);
  const needle = compass.children[compass.children.length - 1];
  // The dividers in his right hand, their points on the chart.
  const [right, left] = maker.hands;
  [
    [-0.33, 0.66],
    [-0.18, 0.7],
  ].forEach(([x, z]) => limb(kit, at(x, 0.91, z), right, 0.006, 0.012, 0x9aa0ab, { delay: 1.5, noInk: true }));
  // The stamp in his left hand.
  cylinder(0.035, 0.045, 0.16, WOOD, left[0], left[1] - 0.03, left[2], { delay: 1.5 }, 10);
  cylinder(0.08, 0.08, 0.05, INK, left[0], left[1] - 0.08, left[2], { delay: 1.52, rotation: [0, theta + Math.PI / 4, 0] }, 4);
  cylinder(0.07, 0.07, 0.015, MAGENTA, left[0], left[1] - 0.095, left[2], { delay: 1.54, flat: true, noInk: true, rotation: [0, theta + Math.PI / 4, 0] }, 4);

  // His surveying scope on its tripod, trained on the islet.
  const [sx, sz] = [-1.25, 0.95];
  [0, 2.1, 4.2].forEach((angle) => limb(kit, [sx + Math.sin(angle) * 0.3, G, sz + Math.cos(angle) * 0.3], [sx, G + 1.05, sz], 0.02, 0.025, WOOD, { delay: 0.5 }));
  const aimAt = Math.atan2(1.0 - sx, -1.45 - sz);
  const scope = add(new CylinderGeometry(0.06, 0.08, 0.5, 12).rotateX(Math.PI / 2), BRASS, sx, G + 1.04, sz, { delay: 0.55, rotation: [0.08, aimAt, 0] });
  decorate(scope, new CylinderGeometry(0.065, 0.065, 0.02, 12).rotateX(Math.PI / 2), CYAN, [[0, 0.08, 0.26]]);

  tick((t) => {
    // The islet drifts along the coast and the drawn coast follows it, a little late.
    const drift = Math.sin(t * 0.5) * 0.35;
    islet.forEach((part, i) => (part.position.x = isletX[i] + drift));
    foam.position.x = 1.0 + drift;
    coastline.forEach((mesh, i) => (mesh.position.z = [0.03, 0.0, 0.04, 0.0, 0.05][i] + Math.sin(t * 0.5 - 0.6 + i * 0.9) * 0.05));
    needle.rotation.y = Math.sin(t * 1.3) * 0.5;
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
