import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, SphereGeometry, type Group } from "three";
import { MAGENTA, YELLOW, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { flame, floor } from "@/lib/diorama-props";

/**
 * Inhumer (P211): the old gravedigger of the hillside cemetery at sunset, low and enormously wide
 * in three wool skirts and a crossed shawl, headscarf knotted under her chin, the short spade with
 * its triangular blade on her shoulder. Beside her a fresh grave, two spadefuls already thrown,
 * and a pale hand pushing up through the earth, flexing its fingers: the headstone is blank,
 * nobody gave her the true name, so the dead will not stay down. Cypresses behind, a grave candle
 * flickering, her bucket of flowers for sale.
 */
export function inhumer(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const EARTH = 0x5a4030;
  const STONE = 0x7a8090;
  const WOOL = 0x3a2a22;
  const F = octagonBase(kit, 0x1f1c22);
  const G = floor(kit, F, 0.06, 0x3a3028, 0x2e261f, 0);

  // Cypresses, an old stone cross and headstones along the back, a low wall.
  [
    [-1.6, -0.85, 2.7],
    [-0.95, -1.55, 3.0],
    [1.65, -1.05, 2.2],
  ].forEach(([x, z, h], k) => {
    cylinder(0.06, 0.08, 0.3, 0x4a3628, x, G, z, { delay: 0.1 + k * 0.04 }, 8);
    add(new ConeGeometry(0.34, h, 10), k % 2 ? 0x24563a : 0x1f4a32, x, G + 0.25, z, { delay: 0.14 + k * 0.04 });
  });
  box(2.2, 0.5, 0.25, 0x4a4652, 0.6, G, -1.75, { delay: 0.12 });
  box(0.1, 0.85, 0.1, STONE, -0.2, G, -1.35, { delay: 0.2 });
  box(0.42, 0.1, 0.1, STONE, -0.2, G + 0.58, -1.35, { delay: 0.22 });
  [
    [0.45, -1.3, 0.1],
    [1.15, -1.25, -0.1],
  ].forEach(([x, z, turn], k) => {
    box(0.4, 0.5, 0.1, STONE, x, G, z, { delay: 0.24 + k * 0.03, rotation: [0, turn, 0] });
    add(new CylinderGeometry(0.2, 0.2, 0.1, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), STONE, x, G + 0.5, z, { delay: 0.26 + k * 0.03, rotation: [0, turn, 0] });
  });
  // A grave candle on the nearer one.
  cylinder(0.05, 0.05, 0.12, 0xc83a3a, 1.15, G, -1.05, { delay: 0.4 }, 10);
  const candle = flame(kit, 1.15, -1.05, G + 0.12, 0.45, 0.35);
  // Tufts of dry grass.
  [
    [-1.4, 0.9],
    [-0.6, 1.6],
    [1.7, 0.6],
    [0.2, -0.6],
    [-1.9, 0.0],
  ].forEach(([x, z], k) => add(new ConeGeometry(0.06, 0.16, 5), 0x6a6a3a, x, G, z, { delay: 0.3 + k * 0.02 }));

  // The fresh grave: the pit, the heap of earth, two spadefuls thrown, the blank headstone.
  const GX = 0.85;
  const GZ = 0.4;
  const GR = 0.35;
  const c = Math.cos(GR);
  const s = Math.sin(GR);
  const pp = (lx: number, lz: number): Point => [GX + lx * c + lz * s, G, GZ - lx * s + lz * c];
  box(0.62, 0.01, 1.3, 0x120e0c, ...pp(0, 0), { delay: 0.5, flat: true, noInk: true, rotation: [0, GR, 0] });
  [-1, 1].forEach((side) => box(0.08, 0.06, 1.38, EARTH, ...pp(side * 0.35, 0), { delay: 0.52, rotation: [0, GR, 0] }));
  [-1, 1].forEach((side) => box(0.7, 0.06, 0.08, EARTH, ...pp(0, side * 0.69), { delay: 0.53, rotation: [0, GR, 0] }));
  add(new SphereGeometry(0.42, 14, 10).scale(1, 0.55, 1.4), EARTH, ...pp(0.82, -0.05), { delay: 0.55, rotation: [0, GR, 0] });
  [
    [0.02, 0.42],
    [-0.1, 0.2],
  ].forEach(([lx, lz], k) => add(new SphereGeometry(0.16, 10, 8).scale(1, 0.45, 1), 0x6a4a36, ...pp(lx, lz), { delay: 0.58 + k * 0.03 }));
  const head = pp(0, -0.86);
  box(0.46, 0.62, 0.1, STONE, ...head, { delay: 0.6, rotation: [0, GR, 0] });
  add(new CylinderGeometry(0.23, 0.23, 0.1, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), STONE, head[0], G + 0.62, head[2], { delay: 0.62, rotation: [0, GR, 0] });

  // The hand coming back up through the earth.
  const PALE = 0xa8b4a0;
  const root = pp(-0.05, -0.2);
  const wrist = cylinder(0.06, 0.07, 0.3, PALE, root[0], G - 0.05, root[2], { delay: 1.6 }, 10);
  const palm = box(0.17, 0.16, 0.07, PALE, root[0], G + 0.22, root[2], { delay: 1.65, rotation: [0, GR, 0] });
  const fingers: Group[] = [-0.06, -0.02, 0.02, 0.06].map((dx, k) =>
    box(0.035, 0.14 - Math.abs(k - 1.5) * 0.02, 0.04, PALE, root[0] + dx * c, G + 0.38, root[2] - dx * s, { delay: 1.7 + k * 0.02, rotation: [0, GR, 0] }),
  );
  const thumb = box(0.035, 0.1, 0.04, PALE, root[0] - 0.1 * c, G + 0.26, root[2] + 0.1 * s, { delay: 1.78, rotation: [0, GR, 0.6] });
  const rising = [wrist, palm, ...fingers, thumb];

  // Her bucket of flowers, for selling at the gate.
  const bucket = cylinder(0.17, 0.13, 0.32, 0x8a93a3, -1.35, G, 0.95, { delay: 0.7 }, 14);
  decorate(bucket, new CylinderGeometry(0.175, 0.175, 0.02, 14), 0x6a7280, [[0, 0.3, 0]]);
  [
    [-0.06, 0.05, MAGENTA],
    [0.05, -0.03, YELLOW],
    [0.0, 0.08, 0xf0ece0],
    [0.08, 0.06, MAGENTA],
    [-0.08, -0.06, 0xf0ece0],
  ].forEach(([dx, dz, color], k) => {
    const tip: Point = [-1.35 + dx * 2.2, G + 0.62 + (k % 2) * 0.08, 0.95 + dz * 2.2];
    limb(kit, [-1.35 + dx, G + 0.3, 0.95 + dz], tip, 0.012, 0.012, 0x2f8f4f, { delay: 0.74, noInk: true });
    ball(0.055, color, tip[0], tip[1] - 0.04, tip[2], { delay: 0.78 + k * 0.02 });
  });

  // Inhumer: three skirts, the shawl, the knotted headscarf.
  const X = -0.4;
  const Z = 0.42;
  const T = 0.45;
  const digger = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: T,
    height: 2.2,
    build: "heavy",
    skin: 0xc8a080,
    face: { mouth: "frown", brows: "angry", marks: 0x9a7058 },
    headwear: { kind: "hood", color: 0x2a2420 },
    top: { kind: "shirt", color: WOOL },
    bottom: { kind: "long-skirt", color: WOOL },
    shoes: 0x1a1a1a,
    arms: [[-0.3, 1.6, 0.3], "down"],
    delay: 0.9,
  });
  const at = digger.at;
  const r: Point = [0, T, 0];
  [
    [0.5, 0.62, 0.42, 0.98, 0x30241e],
    [0.62, 0.76, 0.42, 0.12, 0x45332a],
  ].forEach(([top, bottom, h, y, color], k) => {
    const tier = add(new CylinderGeometry(top, bottom, h, 20).scale(1, 1, 0.8), color, ...at(0, y - (k ? 0 : h), 0), { delay: 1.3 + k * 0.04, rotation: r });
    decorate(tier, new CylinderGeometry(bottom + 0.005, bottom + 0.005, 0.03, 20).scale(1, 1, 0.8), 0x241a16, [[0, 0.04, 0]]);
  });
  const shawl = add(new CylinderGeometry(0.42, 0.6, 0.55, 20).scale(1, 1, 0.78), 0x2e2420, ...at(0, 1.12, 0), { delay: 1.4, rotation: r });
  decorate(shawl, new BoxGeometry(0.06, 0.48, 0.02), 0x3e3028, [
    [-0.12, 0.28, 0.41, 0.5],
    [0.12, 0.28, 0.41, -0.5],
  ]);
  decorate(
    shawl,
    new BoxGeometry(0.02, 0.09, 0.02),
    0x241a16,
    Array.from({ length: 9 }, (_, k) => {
      const a = -1.1 + k * 0.275;
      return [Math.sin(a) * 0.6, -0.04, Math.cos(a) * 0.6 * 0.78] as Point;
    }),
  );
  // Grey hair under the scarf, and its knot under her chin.
  [
    [-0.1, 2.12, 0.12],
    [0, 2.15, 0.14],
    [0.1, 2.12, 0.12],
  ].forEach(([lx, ly, lz]) => {
    const p = at(lx, ly, lz);
    ball(0.045, 0xc8c4c0, p[0], p[1] - 0.045, p[2], { delay: 1.5 });
  });
  const knot = at(0, 1.66, 0.17);
  ball(0.06, 0x2a2420, knot[0], knot[1] - 0.06, knot[2], { delay: 1.52 });

  // The spade on her shoulder: a short handle, the triangular blade above her head.
  const [grip] = digger.hands;
  const high = at(-0.52, 2.35, -0.32);
  const low: Point = [grip[0] + (grip[0] - high[0]) * 0.4, grip[1] + (grip[1] - high[1]) * 0.4, grip[2] + (grip[2] - high[2]) * 0.4];
  limb(kit, low, high, 0.035, 0.03, 0x8a6a48, { delay: 1.55 });
  const tip = at(-0.62, 2.8, -0.5);
  const { rotation } = aim(high, tip);
  const blade = add(new ConeGeometry(0.28, 0.46, 3).scale(1, 1, 0.12), 0x8a8a90, ...high, { delay: 1.6, rotation });
  decorate(blade, new BoxGeometry(0.12, 0.08, 0.05), 0x8a5a40, [
    [0.08, 0.06, 0],
    [-0.1, 0.12, 0],
  ]);
  cylinder(0.05, 0.05, 0.1, 0x5a5a62, ...high, { delay: 1.58, rotation });

  const gold = new Color(YELLOW);
  const orange = new Color(0xff8a00);
  const rest = rising.map((part) => part.position.y);
  tick((t) => {
    // The hand pushes up and sinks back, fingers flexing; the grave candle flickers.
    const lift = (Math.sin(t * 0.9) + 1) * 0.04;
    rising.forEach((part, i) => (part.position.y = rest[i] + lift));
    fingers.forEach((finger, k) => (finger.rotation.x = Math.sin(t * 3 + k * 0.7) * 0.35));
    colorOf(candle[1]).lerpColors(gold, orange, (Math.sin(t * 9) + 1) / 2);
    candle[0].rotation.z = Math.sin(t * 7) * 0.08;
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
