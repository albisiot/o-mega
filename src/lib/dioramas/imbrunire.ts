import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry } from "three";
import { ORANGE, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, volcanoBackdrop } from "@/lib/diorama-props";

/**
 * Imbrunire (P276): the last light of evening, one of Nomina's Cancellati, rises like a giant
 * over the roofs of the old town at sunset, the sun sinking into the bay behind her and the
 * volcano smoking. Her violet dress unravels into smoke that creeps between the houses, her
 * hair floats up. She has no switch for the street lamps, so she pinches them out like candle
 * wicks, one by one: a curl of smoke rises from the one between her fingers.
 */
export function imbrunire(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const LIGHT = 0xffa630;
  const DARK_LIGHT = 0x3a2a30;
  const ROOF = 0x7a3a3a;
  const F = octagonBase(kit, 0x1d1a28);
  const G = floor(kit, F, 0.06, 0x2a2434, 0x1e1a28, 0.3);

  // The bay at the back, the sun going down into it, the volcano across the water.
  box(2.4, 0.03, 0.4, 0x12304a, 0, G, -1.75, { delay: 0.08, noInk: true });
  add(new CylinderGeometry(0.42, 0.42, 0.04, 24, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), ORANGE, 0.5, G + 0.03, -1.88, { delay: 0.15, flat: true });
  [0.32, 0.22, 0.12].forEach((w, k) => box(w, 0.01, 0.03, LIGHT, 0.5, G + 0.03, -1.72 + k * 0.08, { delay: 0.2 + k * 0.03, flat: true, noInk: true }));
  volcanoBackdrop(kit, 1.45, -1.3, G, 0.2, 1.1);

  // The old town: houses with pitched roofs and lit windows, a domed church.
  const house = (x: number, z: number, w: number, h: number, color: number, turn: number, delay: number) => {
    const d = 0.45;
    const wall = box(w, h, d, color, x, G, z, { delay, rotation: [0, turn, 0] });
    const roof = new Shape();
    roof.moveTo(-w / 2 - 0.05, 0);
    roof.lineTo(w / 2 + 0.05, 0);
    roof.lineTo(0, 0.22);
    roof.closePath();
    add(new ExtrudeGeometry(roof, { depth: d + 0.08, bevelEnabled: false }).translate(0, 0, -(d + 0.08) / 2), ROOF, x, G + h, z, { delay: delay + 0.05, rotation: [0, turn, 0] });
    const lit: Point[] = [];
    const dark: Point[] = [];
    for (let row = 0; row < Math.floor((h - 0.1) / 0.24); row++)
      for (let col = 0; col < Math.max(1, Math.floor(w / 0.22)); col++) {
        const spot: Point = [-w / 2 + (w / Math.max(1, Math.floor(w / 0.22))) * (col + 0.5), 0.16 + row * 0.24, d / 2 + 0.005];
        ((row * 3 + col * 5 + Math.round(x * 7)) % 3 ? lit : dark).push(spot);
      }
    if (lit.length) decorate(wall, new BoxGeometry(0.07, 0.1, 0.01), LIGHT, lit);
    if (dark.length) decorate(wall, new BoxGeometry(0.07, 0.1, 0.01), 0x161a28, dark);
  };
  house(-1.2, 0.6, 0.55, 0.85, 0x3a2f4e, 0.3, 0.2);
  house(1.65, 0.45, 0.55, 0.6, 0x2f3550, -0.3, 0.24);
  house(0.1, 1.35, 0.7, 0.5, 0x3a3048, 0.15, 0.28);
  house(-0.75, 1.4, 0.5, 0.62, 0x353050, 0.4, 0.32);
  house(-1.75, -0.4, 0.5, 0.75, 0x2f2a44, 0.55, 0.36);
  house(1.7, -0.65, 0.5, 0.8, 0x34304c, -0.6, 0.4);
  const church = cylinder(0.3, 0.3, 0.6, 0x3a3450, -1.2, G, -1.25, { delay: 0.3 }, 14);
  decorate(church, new BoxGeometry(0.07, 0.14, 0.01), LIGHT, [-0.6, 0.3].map((a) => [Math.sin(a) * 0.3, 0.38, Math.cos(a) * 0.3] as Point));
  add(new SphereGeometry(0.31, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x2e3854, -1.2, G + 0.6, -1.25, { delay: 0.34 });
  cylinder(0.06, 0.07, 0.16, 0x3a3450, -1.2, G + 0.9, -1.25, { delay: 0.38 }, 8);
  add(new ConeGeometry(0.07, 0.12, 8), 0x2e3854, -1.2, G + 1.06, -1.25, { delay: 0.4 });

  // Imbrunire: a giant rising out of her own smoke, dress and hair the violet of dusk.
  const dusk = figure(kit, {
    x: 0,
    z: -0.55,
    y: G - 0.5,
    facing: 0.35,
    height: 3.4,
    build: "slim",
    skin: 0xf2a074,
    hair: { style: "long", color: 0x8a2a9a },
    face: { mouth: "neutral", brows: "calm", eyes: 0x4a1a4a },
    top: { kind: "dress", color: 0x4a2a7a, accent: 0x6a3a9a },
    arms: [
      [-0.8, 1.55, 0.55],
      [0.8, 1.6, 0.5],
    ],
    delay: 0.7,
  });
  // Her hair floating up and out round her head like smoke; the dress unravels into puffs along the streets.
  const strands = [
    [0.15, 0.5, 0.2],
    [0.45, 0.55, 0.19],
    [0.75, 0.6, 0.17],
    [1.05, 0.55, 0.2],
    [1.35, 0.6, 0.18],
    [1.65, 0.6, 0.2],
    [1.95, 0.6, 0.18],
    [2.25, 0.55, 0.2],
    [2.55, 0.6, 0.17],
    [2.9, 0.5, 0.19],
    [3.25, 0.62, 0.15],
    [-0.15, 0.62, 0.15],
  ].map(([a, r, size], k) => {
    const p = dusk.at(Math.cos(a) * r * 1.15, 3.0 + Math.sin(a) * r * 0.9, -0.28 - (k % 2) * 0.1);
    return ball(size, [0x8a2a9a, 0xa83aa8, 0x6a2a8a][k % 3], p[0], p[1] - size, p[2], { delay: 1.3 + k * 0.03 });
  });
  const floating = strands.map((strand) => strand.position.y);
  const puffs: { part: Group; phase: number }[] = [];
  [
    [[0.45, -0.25], [0.85, 0.15], [0.7, 0.65], [0.95, 1.15]],
    [[-0.45, -0.25], [-0.8, 0.15], [-0.5, 0.75], [-0.25, 1.05]],
    [[0.5, -0.85], [1.0, -1.0], [1.3, -0.45], [1.3, 0.05]],
    [[-0.5, -0.85], [-1.0, -0.85], [-1.35, 0.0], [-1.7, 0.3]],
    [[0.05, 0.0], [0.3, 0.55], [-0.05, 1.0], [0.2, 1.65]],
  ].forEach((path, p) => {
    for (let k = 0; k < 7; k++) {
      const along = (k / 6) * (path.length - 1);
      const i = Math.min(path.length - 2, Math.floor(along));
      const f = along - i;
      const x = path[i][0] + (path[i + 1][0] - path[i][0]) * f;
      const z = path[i][1] + (path[i + 1][1] - path[i][1]) * f;
      const r = 0.18 - k * 0.019;
      const part = add(new SphereGeometry(r, 12, 8).scale(1, 0.55, 1), [0x5a2a8a, 0x7a3a9a, 0x3e2a6a][(k + p) % 3], x, G - 0.02, z, { delay: 0.55 + p * 0.05 + k * 0.03 });
      puffs.push({ part, phase: p * 1.3 + k * 0.8 });
    }
  });
  motes(14, 0x9a4ab0, 0.035, [-1.1, G + 0.2, -1.0], [1.1, G + 2.6, 0.4], 1.0);

  // The street lamps; the one in her left hand already snuffed, an ember between her fingers.
  const lamps = [
    [0.92, -0.35, 0.9],
    [-0.56, 0.24, 0.72],
    [1.1, 1.05, 0.62],
    [-1.5, 1.2, 0.66],
    [0.55, 0.65, 0.5],
  ].map(([x, z, h], k) => {
    cylinder(0.018, 0.024, h, 0x23222b, x, G, z, { delay: 0.45 + k * 0.03 }, 6);
    if (k) add(new ConeGeometry(0.07, 0.06, 6), 0x23222b, x, G + h + 0.09, z, { delay: 0.5 + k * 0.03 });
    return box(0.08, 0.09, 0.08, LIGHT, x, G + h, z, { delay: 0.48 + k * 0.03, flat: true });
  });
  const pinch = dusk.at(0.8, 1.5, 0.62);
  const ember = ball(0.04, ORANGE, pinch[0], pinch[1] - 0.04, pinch[2], { delay: 1.6, flat: true, noInk: true });
  motes(5, 0x8a8494, 0.025, [0.86, G + 1.0, -0.4], [0.98, G + 1.9, -0.3], 1.6);

  tick((t) => {
    // The lamps go out one by one, each for a while, the first one at the start.
    lamps.forEach((light, k) => {
      const u = (((t / 10 - k / 5) % 1) + 1) % 1;
      colorOf(light).setHex(u < 0.16 ? DARK_LIGHT : LIGHT);
    });
    ember.visible = Math.floor(t * 8) % 7 !== 3;
    strands.forEach((strand, k) => (strand.position.y = floating[k] + Math.sin(t * 1.1 + k * 0.9) * 0.04));
    puffs.forEach(({ part, phase }) => (part.position.y = G - 0.02 + Math.sin(t * 1.4 + phase) * 0.025));
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
