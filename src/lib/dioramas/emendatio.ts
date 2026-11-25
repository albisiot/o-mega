import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type BufferGeometry, type Group } from "three";
import { MAGENTA, archMouth, archedWall, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Emendatio (P209): the double that reality keeps trying to strike out like a typo, in the
 * collation hall of the university at sunset. In her long green coat lined with rows of
 * correction scrolls, horn-peaked cap on her head, red pen raised in her inky right hand, she
 * lays her left hand on a marble bust: the correction meant for her comes down out of the air in
 * a dashed line, turns at her hand and strikes the bust through, which flickers and slips out
 * of true. A tower of scrolls and proofs pinned to the wall, every one crossed out.
 */
export function emendatio(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const PAPER = 0xe8dcc0;
  const PAPER_DARK = 0xc8b898;
  const COAT = 0x24382e;
  const MARBLE = 0xd8d4cc;
  const RED = MAGENTA;
  const F = octagonBase(kit, 0x1d1c26);
  const G = floor(kit, F, 0.06, 0x3c3a48, 0x2a2834, 0.4);

  /** Moves a part's geometry back round its middle, so it turns about its centre. */
  const centred = (part: Group, geometry: BufferGeometry) => {
    const lift = -(geometry.boundingBox?.min.y ?? 0);
    geometry.translate(0, -lift, 0);
    part.position.y += lift;
    return part;
  };

  // The hall: an arch on the old town at sunset, proofs pinned to the wall, each struck through.
  const wall = add(archedWall(2.8, 3.1, 0.3, { x: 0.55, half: 0.45, spring: 1.5 }), 0x3a3448, 0, G, -1.6, { delay: 0.1, ink: 1.02 });
  const view = add(archMouth(0.45, 1.5), 0xffc860, 0.55, G, -1.8, { delay: 0.14, flat: true, noInk: true });
  decorate(view, new BoxGeometry(0.9, 0.32, 0.01), 0x6a3a50, [[0, 0.16, 0.026]]);
  decorate(view, new BoxGeometry(0.12, 0.9, 0.01), 0x5a3048, [[0.14, 0.45, 0.025]]);
  decorate(view, new ConeGeometry(0.08, 0.2, 4), 0x5a3048, [[0.14, 0.98, 0.025]]);
  const sheets: [number, number, number][] = [
    [-0.95, 2.25, 0.08],
    [-0.5, 2.45, -0.06],
    [-0.7, 1.6, -0.1],
    [1.1, 2.35, 0.05],
  ];
  decorate(
    wall,
    new BoxGeometry(0.3, 0.4, 0.01),
    PAPER,
    sheets.map(([x, y, lean]) => [x, y, 0.16, lean] as [number, number, number, number]),
  );
  decorate(
    wall,
    new BoxGeometry(0.22, 0.015, 0.01),
    0x8a8a96,
    sheets.flatMap(([x, y, lean]) => [
      [x, y + 0.1, 0.17, lean],
      [x, y - 0.1, 0.17, lean],
    ] as [number, number, number, number][]),
  );
  decorate(
    wall,
    new BoxGeometry(0.34, 0.025, 0.01),
    RED,
    sheets.map(([x, y, lean]) => [x, y, 0.175, lean + 0.35] as [number, number, number, number]),
  );

  // The tower of scroll bundles, round ends showing, a proof pinned to it.
  const TX = -1.5;
  const TZ = -0.5;
  for (let k = 0; k < 11; k++) {
    const top = 0.4 - (k % 3) * 0.03;
    const bottom = 0.42 - (k % 2) * 0.03;
    const rr = (top + bottom) / 2;
    const disc = cylinder(top, bottom, 0.2, k % 2 ? PAPER : PAPER_DARK, TX, G + k * 0.2, TZ, { delay: 0.2 + k * 0.03, rotation: [0, 0.35 + (k % 3) * 0.12, 0] }, 14);
    decorate(
      disc,
      new CylinderGeometry(0.035, 0.035, 0.02, 10).rotateX(Math.PI / 2),
      0x8a7458,
      [-0.2, 0.02, 0.21].map((x) => [x, 0.1, Math.sqrt(rr * rr - x * x)] as Point),
    );
  }
  const proof = box(0.28, 0.36, 0.01, PAPER, TX + Math.sin(0.6) * 0.42, G + 1.15, TZ + Math.cos(0.6) * 0.42, { delay: 0.6, noInk: true, rotation: [0, 0.6, 0.08] });
  decorate(proof, new BoxGeometry(0.32, 0.025, 0.01), RED, [[0, 0.18, 0.01, -0.3]]);

  // The marble bust on its pedestal, struck through.
  const PX = 0.78;
  const PZ = 0.02;
  const BT = 0.35;
  const pedestal = box(0.44, 0.95, 0.44, 0x5d6680, PX, G, PZ, { delay: 0.4 });
  decorate(pedestal, new BoxGeometry(0.48, 0.06, 0.48), 0x7c8aa4, [
    [0, 0.92, 0],
    [0, 0.05, 0],
  ]);
  const head = ball(0.13, MARBLE, PX, G + 1.18, PZ, { delay: 0.49 });
  decorate(head, new BoxGeometry(0.035, 0.012, 0.01), 0x9a968e, [
    [-0.045, 0.15, 0.12],
    [0.045, 0.15, 0.12],
  ]);
  const bust = [
    box(0.42, 0.16, 0.22, MARBLE, PX, G + 0.95, PZ, { delay: 0.45, rotation: [0, BT, 0] }),
    cylinder(0.05, 0.06, 0.1, MARBLE, PX, G + 1.1, PZ, { delay: 0.47 }, 10),
    head,
    add(new SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xc4c0b6, PX, G + 1.3, PZ - 0.01, { delay: 0.5 }),
  ];
  const strike = box(0.56, 0.05, 0.03, RED, PX + Math.sin(BT) * 0.18, G + 1.14, PZ + Math.cos(BT) * 0.18, { delay: 1.9, flat: true, noInk: true, rotation: [0, BT, 0.4] });

  // Emendatio: green coat to the ankles, sleeves rolled, ink to the wrists, pen up.
  const X = -0.15;
  const Z = 0.45;
  const T = 0.55;
  const variant = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: T,
    height: 2.35,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "bun", color: 0x3a2a22 },
    face: { mouth: "smirk", brows: "raised", marks: 0xb07050 },
    headwear: { kind: "cap", color: 0x2f4a3a, accent: 0x5a4a32 },
    top: { kind: "coat", color: COAT, accent: 0x1a2a22, sleeves: "short" },
    bottom: { kind: "long-skirt", color: COAT },
    shoes: 0x1a1612,
    gloves: 0x2a2a40,
    arms: [
      [-0.26, 1.6, 0.4],
      [0.82, 1.14, 0.1],
    ],
    delay: 0.8,
  });
  const at = variant.at;
  const r: Point = [0, T, 0];
  // Rows of correction scrolls in pockets down her coat, standing up like scales.
  const u = 2.35 / 2.4;
  const waist = 1.08 * u;
  const shoulder = 1.72 * u;
  const surface = (y: number, lx: number) => {
    const torso = y > waist;
    const radius = torso ? 0.25 * u + (0.05 * u * (y - waist)) / (shoulder - waist) : 0.26 * u + (0.135 * u * (waist - y)) / (waist - 0.12 * u);
    return radius * (torso ? 0.72 : 0.8) * Math.sqrt(Math.max(0, 1 - (lx / radius) ** 2));
  };
  [1.28, 0.98, 0.7, 0.42].forEach((y, row) =>
    [-0.16, -0.055, 0.055, 0.16].forEach((lx, k) => {
      if (row === 0 && (k === 0 || k === 3)) return;
      const z = surface(y + 0.08, lx) + 0.012;
      box(0.075, 0.16, 0.025, 0x162420, ...at(lx, y, z), { delay: 1.3 + (row * 4 + k) * 0.01, rotation: r });
      cylinder(0.024, 0.024, 0.08, PAPER, ...at(lx, y + 0.14, z + 0.005), { delay: 1.35 + (row * 4 + k) * 0.01 }, 8);
    }),
  );
  // The red pen.
  limb(kit, at(-0.36, 1.54, 0.34), at(-0.08, 1.76, 0.54), 0.016, 0.016, RED, { delay: 1.5 });
  const nib = at(-0.08, 1.76, 0.54);
  ball(0.02, 0x14121c, nib[0], nib[1] - 0.02, nib[2], { delay: 1.52 });

  // The correction meant for her: a dashed line down out of the air, turned at her hand onto the bust.
  const [, palm] = variant.hands;
  const path: Point[] = [[-1.3, G + 3.4, 1.1], at(0.1, 2.75, 0.2), palm, [PX, G + 1.3, PZ + 0.05]];
  const dashes: Group[] = [];
  for (let s = 0; s < path.length - 1; s++) {
    const [a, b] = [path[s], path[s + 1]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(2, Math.round(length / 0.16));
    for (let i = 0; i < n; i++) {
      const p = i / n;
      const q = p + 0.55 / n;
      const lerp = (w: number): Point => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
      dashes.push(...zigzag(kit, [lerp(p), lerp(q)], 0.022, RED, 1.7 + dashes.length * 0.01));
    }
  }
  // Proofreader's loops floating about the hall, turning slowly.
  const arcs = [
    [-0.85, 2.7, 0.2, 0.22],
    [0.35, 3.0, -0.4, 0.28],
    [1.55, 2.2, -0.55, 0.24],
    [-1.15, 1.3, 1.0, 0.18],
  ].map(([x, y, z, radius], k) => {
    const geometry = new TorusGeometry(radius, 0.014, 4, 28, 2.4);
    const arc = add(geometry, RED, x, G + y, z, { delay: 1.8 + k * 0.05, flat: true, noInk: true, rotation: [0, 0.35, k] });
    return centred(arc, geometry);
  });

  const restX = bust.map((part) => part.position.x);
  tick((t) => {
    // The correction flows down to her hand and on; the bust glitches out of the text now and then.
    const cycle = t % 3.2;
    const glitch = cycle > 2.4 && cycle < 2.9;
    bust.forEach((part, i) => {
      part.position.x = restX[i] + (glitch ? (i % 2 ? 0.06 : -0.05) * Math.sign(Math.sin(t * 30 + i)) : 0);
      part.visible = !(glitch && Math.sin(t * 25 + i * 2) > 0.6);
    });
    strike.visible = !glitch || Math.sin(t * 40) > 0;
    const step = Math.floor(t * 8);
    dashes.forEach((dash, i) => (dash.visible = (((i - step) % 3) + 3) % 3 !== 0));
    arcs.forEach((arc, k) => (arc.rotation.z = k + t * (k % 2 ? -0.5 : 0.4)));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
