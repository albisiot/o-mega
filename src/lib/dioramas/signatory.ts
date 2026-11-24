import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, MathUtils, TorusGeometry, type Mesh } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Signatory (P156): the admiral on the bridge of her flagship, in a black double-breasted
 * uniform with gold buttons and cuffs, raising her fountain pen like an order; the nib glints.
 * Through the windows the port's hills and a grey warship; at her side the chart table, where
 * the pages of a thick dossier turn one by one under her reading glasses: she signs only what
 * she has read. A brass wheel rocks gently; no power, just paper.
 */
export function signatory(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const NAVY = 0x1c2638;
  const BRASS = 0xc8a040;
  const WOOD = 0x5e4a3a;
  const WOOD_DARK = 0x3e3028;
  const PAPER = 0xe0d8c4;
  const UNIFORM = 0x1a2030;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x4a3a30, 0x342820, 0.32);

  // Outside the windows: two hills with the old town lit on them, and a warship at anchor.
  [
    [-0.75, 1.3, 1.25, 0x33304a],
    [0.55, 1.0, 0.95, 0x3d3450],
  ].forEach(([x, w, h, color], i) => add(new CylinderGeometry(0.12, w, h, 4).scale(1, 1, 0.04), color, x, G + 0.9, -1.78 + i * 0.04, { delay: 0.1 + i * 0.04 }));
  [
    [-1.05, 1.15, 0.16, 0.2],
    [-0.85, 1.32, 0.14, 0.26],
    [-0.62, 1.5, 0.16, 0.22],
    [-0.42, 1.28, 0.13, 0.2],
  ].forEach(([x, y, w, h], i) => {
    const house = box(w, h, 0.05, 0xd8cdb4, x, G + y, -1.72, { delay: 0.18 + i * 0.03, noInk: true });
    decorate(house, new BoxGeometry(0.04, 0.05, 0.01), YELLOW, [[0, h * 0.55, 0.03]]);
  });
  const SHIP = 0x5a6278;
  box(1.0, 0.16, 0.1, SHIP, 0.45, G + 1.0, -1.64, { delay: 0.25 });
  box(0.34, 0.22, 0.08, SHIP, 0.4, G + 1.16, -1.64, { delay: 0.28 });
  cylinder(0.012, 0.012, 0.55, SHIP, 0.4, G + 1.38, -1.64, { delay: 0.3, noInk: true }, 6);
  const turret = box(0.16, 0.1, 0.08, SHIP, 0.78, G + 1.16, -1.64, { delay: 0.32 });
  decorate(turret, new BoxGeometry(0.22, 0.025, 0.025), SHIP, [[-0.15, 0.06, 0]]);

  // The bridge: the low front wall with its brass rail, the window posts and the roof beam.
  box(2.9, 0.95, 0.15, NAVY, -0.2, G, -1.45, { delay: 0.2, ink: 1.02 });
  box(2.9, 0.05, 0.22, BRASS, -0.2, G + 0.95, -1.42, { delay: 0.24 });
  [-1.6, -0.62, 0.36, 1.2].forEach((x, i) => box(0.1, 1.55, 0.14, NAVY, x, G + 1.0, -1.45, { delay: 0.26 + i * 0.02 }));
  box(2.9, 0.16, 0.2, NAVY, -0.2, G + 2.55, -1.45, { delay: 0.34 });

  // The wheel on its pedestal, turned to us, and the engine telegraph.
  box(0.24, 0.9, 0.24, WOOD_DARK, -1.3, G, -0.5, { delay: 0.4 });
  const wheelAt: Point = [-1.27, G + 1.22, -0.36];
  const wheel = add(new TorusGeometry(0.36, 0.035, 6, 28), BRASS, wheelAt[0], wheelAt[1] - 0.395, wheelAt[2], { delay: 0.45, rotation: [0, 0.35, 0] });
  decorate(wheel, new BoxGeometry(0.035, 1.0, 0.035), BRASS, [0, 1, 2, 3].map((k) => [0, 0.395, 0, (k * Math.PI) / 4] as [number, number, number, number]));
  const spokes = wheel.children.slice(-4) as Mesh[];
  decorate(wheel, new CylinderGeometry(0.07, 0.07, 0.06, 12).rotateX(Math.PI / 2), WOOD_DARK, [[0, 0.395, 0.02]]);
  cylinder(0.07, 0.09, 1.0, BRASS, 1.45, G, -0.65, { delay: 0.42 }, 12);
  const dial = add(new CylinderGeometry(0.16, 0.16, 0.08, 18).rotateX(Math.PI / 2), BRASS, 1.45, G + 1.0, -0.65, { delay: 0.46, rotation: [0, -0.3, 0] });
  decorate(dial, new CylinderGeometry(0.13, 0.13, 0.01, 18).rotateX(Math.PI / 2), 0xf2f0ea, [[0, 0.16, 0.042]]);
  decorate(dial, new BoxGeometry(0.02, 0.12, 0.01), MAGENTA, [[0.03, 0.2, 0.05, -0.5]]);

  // Signatory, pen raised, her left hand on the chart table.
  const theta = 0.3;
  const admiral = figure(kit, {
    x: -0.3,
    z: 0.25,
    y: G,
    facing: theta,
    height: 2.35,
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x8a7a6e },
    face: { mouth: "neutral", brows: "calm" },
    top: { kind: "suit", color: UNIFORM, accent: 0xe8e4da, tie: 0x0e0e14 },
    bottom: { kind: "trousers", color: UNIFORM },
    shoes: 0x14121c,
    arms: [
      [-0.3, 1.95, 0.28],
      [0.5, 0.98, 0.36],
    ],
    delay: 0.9,
  });
  const at = admiral.at;
  const turn: Point = [0, theta, 0];
  // Gold: two rows of buttons, shoulder boards, a band round each cuff.
  [1.18, 1.36, 1.54].forEach((y, k) => [-0.1, 0.1].forEach((x) => ball(0.026, YELLOW, ...at(x, y - 0.026, 0.212 + k * 0.01), { delay: 1.4, noInk: true })));
  [-1, 1].forEach((side) => box(0.18, 0.025, 0.12, BRASS, ...at(side * 0.39, 1.81, 0), { delay: 1.35, rotation: turn }));
  (
    [
      [
        [-0.483, 1.719, 0.101],
        [-0.3, 1.95, 0.28],
      ],
      [
        [0.573, 1.234, 0.141],
        [0.5, 0.98, 0.36],
      ],
    ] as [Point, Point][]
  ).forEach(([elbow, hand]) => {
    const e = at(...elbow);
    const h = at(...hand);
    const k = 0.74;
    add(new TorusGeometry(0.1, 0.016, 6, 18).rotateX(Math.PI / 2), YELLOW, MathUtils.lerp(e[0], h[0], k), MathUtils.lerp(e[1], h[1], k), MathUtils.lerp(e[2], h[2], k), {
      delay: 1.45,
      noInk: true,
      rotation: aim(e, h).rotation,
    });
  });
  // The fountain pen, nib up.
  const [penHand] = admiral.hands;
  cylinder(0.02, 0.024, 0.3, INK, penHand[0] + 0.01, penHand[1] - 0.04, penHand[2] + 0.02, { delay: 1.5 }, 10);
  const nib = add(new ConeGeometry(0.022, 0.09, 8), YELLOW, penHand[0] + 0.01, penHand[1] + 0.26, penHand[2] + 0.02, { delay: 1.55, flat: true });

  // The chart table: the chart, a dossier being read page by page, the glasses, a telescope.
  const tableAt = at(0.98, 0, 0.32);
  const table = box(0.95, 0.9, 0.62, WOOD, ...tableAt, { delay: 0.5, rotation: turn });
  decorate(table, new BoxGeometry(0.95, 0.05, 0.01), WOOD_DARK, [[0, 0.82, 0.312]]);
  const chart = box(0.82, 0.01, 0.5, PAPER, ...at(0.98, 0.9, 0.32), { delay: 0.6, rotation: turn, noInk: true });
  decorate(chart, new BoxGeometry(0.3, 0.006, 0.02), CYAN, [
    [-0.25, 0.012, -0.1, 0],
    [-0.05, 0.012, -0.05, 0],
  ]);
  const pile = box(0.28, 0.12, 0.36, PAPER, ...at(1.2, 0.91, 0.24), { delay: 0.65, rotation: [0, theta + 0.1, 0] });
  decorate(pile, new BoxGeometry(0.28, 0.006, 0.36), 0xb0a890, [
    [0, 0.04, 0.002],
    [0, 0.08, 0.002],
  ]);
  decorate(pile, new TorusGeometry(0.045, 0.008, 6, 14).rotateX(Math.PI / 2), INK, [
    [-0.06, 0.125, 0.05],
    [0.06, 0.125, 0.05],
  ]);
  const spine = at(0.8, 0.91, 0.42);
  box(0.36, 0.012, 0.24, 0x7a2a3a, ...spine, { delay: 0.7, rotation: turn });
  [-1, 1].forEach((side) => box(0.16, 0.01, 0.22, PAPER, ...at(0.8 + side * 0.085, 0.922, 0.42), { delay: 0.72, rotation: turn, noInk: true }));
  const page = add(new BoxGeometry(0.16, 0.006, 0.22).translate(0.08, 0, 0), 0xf2ede0, spine[0], spine[1] + 0.024, spine[2], { delay: 0.75, rotation: turn, noInk: true });
  page.rotation.order = "YXZ";
  page.rotation.set(0, theta, 0);
  add(new CylinderGeometry(0.035, 0.05, 0.5, 12).rotateZ(Math.PI / 2), BRASS, ...at(1.05, 0.91, 0.08), { delay: 0.78, rotation: [0, theta - 0.3, 0] });

  const nibFrom = new Color(YELLOW);
  const nibTo = new Color(0xffffff);
  tick((t) => {
    // A page turns now and then: she reads everything before she signs.
    const u = (t * 0.22) % 1;
    page.rotation.z = MathUtils.smoothstep(u, 0.15, 0.4) * Math.PI * 0.98;
    // The nib catches the light; the wheel rocks a little on the swell.
    colorOf(nib).lerpColors(nibFrom, nibTo, Math.max(0, Math.sin(t * 2.4)) ** 4);
    spokes.forEach((mesh, k) => (mesh.rotation.z = (k * Math.PI) / 4 + Math.sin(t * 0.7) * 0.35));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
