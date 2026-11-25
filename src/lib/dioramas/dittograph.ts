import { BoxGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, type Mesh, type MeshBasicMaterial } from "three";
import { CYAN, MAGENTA, ORANGE, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Dittograph (P225): the back room of an old apothecary, split down the middle like the woman in
 * it. On her right, a mage's half: violet robe and tassels, a white half-mask, an altar of
 * candles in a stone niche, and a sigil turning over her raised hand. On her left, a chemist's
 * half: white lab coat and glove, tiled wall, burner and glassware, a round flask fuming in her
 * fist. The sigil and the flask take turns to glow: one of the two is answering.
 */
export function dittograph(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const ROBE = 0x5a2a7a;
  const VIOLET = 0xb040ff;
  const COAT = 0xe8e6e0;
  const STONE = 0x3a2448;
  const TILE = 0xaeb4c2;
  const F = octagonBase(kit, 0x1c1824);
  const G = floor(kit, F, 0.06, 0x2a2034, 0x1e1828, 0.4);
  add(new CylinderGeometry(2.36, 2.36, 0.034, 4, 1, false, 0, Math.PI), 0x8e94a4, 0, F, 0, { delay: 0.07, noInk: true, rotation: [0, Math.PI / 8, 0] });

  // The back walls, square to the camera: violet stone on the left, white tiles on the right.
  const T = 0.35;
  const turn: Point = [0, T, 0];
  const dir = [Math.cos(T), -Math.sin(T)];
  const normal = [Math.sin(T), Math.cos(T)];
  const spot = (along: number, out: number): [number, number] => [-1.5 * normal[0] + along * dir[0] + out * normal[0], -1.5 * normal[1] + along * dir[1] + out * normal[1]];
  const left = box(1.5, 2.7, 0.12, STONE, ...xz(spot(-0.75, 0), G), { delay: 0.1, ink: 1.02, rotation: turn });
  decorate(left, new BoxGeometry(0.5, 0.75, 0.01), 0x160c1c, [[-0.05, 1.2, 0.061]]);
  decorate(left, new CircleGeometry(0.25, 16, 0, Math.PI), 0x160c1c, [[-0.05, 1.575, 0.061]]);
  decorate(left, new BoxGeometry(0.03, 2.6, 0.01), MAGENTA, [[0.72, 1.3, 0.062]]);
  const right = box(1.5, 2.7, 0.12, TILE, ...xz(spot(0.75, 0), G), { delay: 0.12, ink: 1.02, rotation: turn });
  decorate(right, new BoxGeometry(1.5, 0.012, 0.01), 0x7a8090, Array.from({ length: 9 }, (_, k) => [0, 0.3 * (k + 1), 0.061] as Point));
  decorate(right, new BoxGeometry(0.012, 2.7, 0.01), 0x7a8090, Array.from({ length: 4 }, (_, k) => [-0.6 + k * 0.3, 1.35, 0.061] as Point));
  // A shelf of jars on the tiles.
  const [sx, sz] = spot(0.9, 0.14);
  const shelf = box(1.0, 0.05, 0.22, 0x5e4a3a, sx, G + 1.75, sz, { delay: 0.3, rotation: turn });
  [CYAN, VIOLET, 0x2fae7a, CYAN].forEach((c, k) => {
    const jar = cylinder(0.07, 0.07, 0.2, 0xdfe8ee, sx + dir[0] * (k * 0.22 - 0.33), G + 1.8, sz + dir[1] * (k * 0.22 - 0.33), { delay: 0.34 + k * 0.03 }, 10);
    decorate(jar, new CylinderGeometry(0.072, 0.072, 0.11, 10), c, [[0, 0.06, 0]]);
  });
  void shelf;

  // The altar in the niche: three candles, their flames flickering.
  const [ax, az] = spot(-0.85, 0.42);
  box(0.8, 0.72, 0.42, 0x2a1834, ax, G, az, { delay: 0.25, rotation: turn });
  const flames = [-0.25, 0, 0.25].map((d, k) => {
    const cx = ax + dir[0] * d;
    const cz = az + dir[1] * d;
    const h = 0.18 + (k % 2) * 0.1;
    cylinder(0.035, 0.035, h, 0xece4cc, cx, G + 0.72, cz, { delay: 0.4 + k * 0.03 }, 8);
    return add(new ConeGeometry(0.03, 0.09, 6), ORANGE, cx, G + 0.72 + h + 0.01, cz, { delay: 0.45 + k * 0.03, flat: true, noInk: true });
  });

  // The lab bench: a cabinet, a burner with its blue flame, a rack of test tubes.
  const [bx, bz] = spot(0.75, 0.5);
  const bench = box(1.0, 0.8, 0.46, 0x3a3e4c, bx, G, bz, { delay: 0.28, rotation: turn });
  decorate(bench, new BoxGeometry(0.02, 0.6, 0.01), 0x262a36, [[0, 0.38, 0.232]]);
  cylinder(0.06, 0.08, 0.16, 0x4a4f5c, bx + dir[0] * 0.25, G + 0.8, bz + dir[1] * 0.25, { delay: 0.5 }, 10);
  const burner = add(new ConeGeometry(0.05, 0.16, 8), CYAN, bx + dir[0] * 0.25, G + 0.96, bz + dir[1] * 0.25, { delay: 0.55, flat: true, noInk: true });
  [-0.3, -0.22, -0.14, -0.06].forEach((d, k) =>
    cylinder(0.025, 0.025, 0.22, k % 2 ? VIOLET : 0x2fae7a, bx + dir[0] * d, G + 0.82, bz + dir[1] * d, { delay: 0.5 + k * 0.02, noInk: true }, 6),
  );
  box(0.36, 0.04, 0.1, 0x5e4a3a, bx + dir[0] * -0.18, G + 0.92, bz + dir[1] * -0.18, { delay: 0.56, rotation: turn });

  // Dittograph: one body, two women.
  const woman = figure(kit, {
    x: 0,
    z: 0.2,
    y: G,
    facing: T,
    height: 2.4,
    build: "slim",
    skin: 0xe0b092,
    hair: { style: "long", color: 0x1a1420 },
    face: { mouth: "neutral", brows: "calm" },
    top: { kind: "coat", color: COAT, accent: 0x1a1a22 },
    bottom: { kind: "trousers", color: 0x1a1a22 },
    belt: 0x4a3028,
    shoes: 0x14121c,
    arms: [[-0.58, 1.78, 0.36], [0.46, 1.82, 0.34]],
    delay: 0.8,
  });
  const at = woman.at;
  // The mage's half: a violet robe over her right side and a wide sleeve on her right arm.
  add(new CylinderGeometry(0.36, 0.52, 1.6, 16, 1, false, Math.PI, Math.PI).scale(1, 1, 0.78), ROBE, ...at(-0.005, 0.12, 0), { delay: 1.1, rotation: turn });
  const shoulder = at(-0.34, 1.72, 0);
  const [castHand, flaskHand] = woman.hands;
  const elbow = woman.elbows[0];
  limb(kit, shoulder, elbow, 0.13, 0.12, ROBE, { delay: 1.15 });
  const cuff: Point = [elbow[0] + (castHand[0] - elbow[0]) * 0.8, elbow[1] + (castHand[1] - elbow[1]) * 0.8, elbow[2] + (castHand[2] - elbow[2]) * 0.8];
  limb(kit, elbow, cuff, 0.12, 0.17, ROBE, { delay: 1.18 });
  // Tassels and a knot hanging down the robe, a magenta trim along its edge.
  [
    [-0.18, 0.85],
    [-0.3, 0.6],
  ].forEach(([lx, ly], k) => {
    cylinder(0.012, 0.012, 0.5, 0x8a2a8a, ...at(lx, ly, 0.36 - k * 0.04), { delay: 1.25 + k * 0.03, noInk: true }, 5);
    add(new ConeGeometry(0.05, 0.16, 6), 0x8a2a8a, ...at(lx, ly - 0.16, 0.36 - k * 0.04), { delay: 1.28 + k * 0.03 });
  });
  add(new TorusGeometry(0.05, 0.015, 6, 12), MAGENTA, ...at(-0.16, 1.32, 0.33), { delay: 1.3, rotation: turn });
  box(0.025, 1.5, 0.02, MAGENTA, ...at(-0.02, 0.14, 0.35), { delay: 1.3, rotation: [-0.1, T, 0], noInk: true });
  // The white half-mask over the right side of her face, with its eye slit.
  const RH = woman.headRadius;
  const mask = new SphereGeometry(RH * 1.05, 14, 10, 0, Math.PI / 2, Math.PI * 0.27, Math.PI * 0.5).scale(0.95, 1.06, 0.95);
  decorate(woman.headPart, mask, 0xf4f0e6, [[0, RH * 1.06, 0]]);
  decorate(woman.headPart, new BoxGeometry(0.07, 0.02, 0.02), 0x14121c, [[-0.085, RH * 1.06 + 0.035, RH * 0.97, -0.25]]);
  // The chemist's half: a white glove, a tool belt with pens and scissors, the flask.
  ball(0.095, 0xf4f0e6, flaskHand[0], flaskHand[1] - 0.095, flaskHand[2], { delay: 1.3 });
  const pouch = box(0.2, 0.22, 0.1, 0x4a3028, ...at(0.22, 0.86, 0.26), { delay: 1.32, rotation: turn });
  decorate(pouch, new CylinderGeometry(0.012, 0.012, 0.22, 5), 0xd8d8e0, [
    [-0.06, 0.26, 0],
    [-0.02, 0.28, 0.01],
    [0.03, 0.25, 0],
  ]);
  decorate(pouch, new TorusGeometry(0.025, 0.008, 5, 10), 0x9aa0ab, [[0.07, 0.27, 0]]);
  const F0: Point = [flaskHand[0] + 0.02, flaskHand[1] + 0.12, flaskHand[2] + 0.06];
  const liquid = ball(0.13, VIOLET, F0[0], F0[1] - 0.13, F0[2], { delay: 1.4, flat: true, noInk: true });
  const bulb = ball(0.17, 0xe4dcf4, F0[0], F0[1] - 0.17, F0[2], { delay: 1.42, noInk: true });
  const glass = (bulb.children[0] as Mesh).material as MeshBasicMaterial;
  glass.transparent = true;
  glass.opacity = 0.35;
  glass.depthWrite = false;
  cylinder(0.04, 0.045, 0.2, 0xe4dcf4, F0[0], F0[1] + 0.14, F0[2], { delay: 1.45 }, 10);
  motes(8, 0xd070ff, 0.035, [F0[0] - 0.12, F0[1] + 0.35, F0[2] - 0.1], [F0[0] + 0.15, F0[1] + 1.1, F0[2] + 0.1], 1.6);

  // The sigil, turning over her right hand in the plane facing us.
  const sigil = new Group();
  sigil.position.set(castHand[0] - 0.12, castHand[1] + 0.12, castHand[2] + 0.22);
  sigil.rotation.order = "YXZ";
  const glyph = [
    add(new TorusGeometry(0.26, 0.016, 6, 36), MAGENTA, 0, -0.26, 0, { delay: 1.5, flat: true, noInk: true }),
    add(new TorusGeometry(0.1, 0.014, 6, 24), VIOLET, 0, -0.1, 0, { delay: 1.55, flat: true, noInk: true }),
    box(0.62, 0.016, 0.01, MAGENTA, 0, -0.008, 0, { delay: 1.58, flat: true, noInk: true }),
    box(0.016, 0.62, 0.01, MAGENTA, 0, -0.31, 0, { delay: 1.58, flat: true, noInk: true }),
    ball(0.035, 0xffc8f0, 0, -0.035, 0, { delay: 1.6, flat: true, noInk: true }),
  ];
  glyph[0].parent?.add(sigil);
  sigil.add(...glyph);

  const hot = new Color(0xffffff);
  const cool = new Color(VIOLET);
  const pink = new Color(MAGENTA);
  tick((t) => {
    sigil.rotation.set(0, T, t * 0.8);
    // Every few seconds the other one takes over: the sigil blazes, then the flask.
    const k = (Math.sin(t * 0.9) + 1) / 2;
    colorOf(glyph[0]).lerpColors(pink, hot, k * 0.7);
    colorOf(liquid).lerpColors(cool, hot, (1 - k) * 0.6);
    flames.forEach((flame, i) => (flame.children[0].scale.y = 0.85 + 0.3 * Math.abs(Math.sin(t * 7 + i * 2))));
    burner.children[0].scale.y = 0.9 + 0.2 * Math.abs(Math.sin(t * 11));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}

/** A point on the ground at height y. */
function xz([x, z]: [number, number], y: number): [number, number, number] {
  return [x, y, z];
}
