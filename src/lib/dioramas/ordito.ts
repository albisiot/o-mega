import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Ordito (P185): in her mountain haberdashery, shelves of spools behind her and a window on the
 * peaks, the old owner sits by her tall loom in a black blouse and a grey apron, fingers
 * bandaged, one hand among the warp threads and big shears snipping in the other; one thread of
 * the warp hangs cut. Glowing threads come down from above to her hands and are tugged now and
 * then, as if someone worked her too. Her price: the electric sewing machine on the side table,
 * its cord cut with the same shears.
 */
export function ordito(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const WOOD = 0x4a3a30;
  const WOOD_DARK = 0x3a2c24;
  const WARP = 0xe8dcc0;
  const STEEL = 0xc0c4cc;
  const F = octagonBase(kit, 0x1e1a22);
  const G = floor(kit, F, 0.06, 0x3e3028, 0x2e241e, 0.3);

  // The back wall, a window on the peaks and a village tower, and the shelves of spools.
  const wall = box(3.1, 3.1, 0.2, 0x2c2632, 0, G, -1.62, { delay: 0.08, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.8, 1.0, 0.01), 0x2a4060, [[0.85, 1.85, 0.101]]);
  decorate(wall, new ConeGeometry(0.4, 0.5, 3), 0x1c2638, [[0.75, 1.6, 0.104]]);
  decorate(wall, new BoxGeometry(0.06, 0.2, 0.01), 0x1c2638, [[1.0, 1.55, 0.104]]);
  decorate(wall, new BoxGeometry(0.03, 0.03, 0.01), YELLOW, [[1.0, 1.6, 0.106]]);
  decorate(wall, new BoxGeometry(0.05, 1.05, 0.02), WOOD, [[0.85, 1.85, 0.11]]);
  decorate(wall, new BoxGeometry(0.85, 0.05, 0.02), WOOD, [
    [0.85, 1.85, 0.11],
    [0.85, 2.35, 0.11],
    [0.85, 1.35, 0.11],
  ]);
  box(1.25, 2.5, 0.06, WOOD_DARK, -0.85, G, -1.48, { delay: 0.12 });
  const shelves = box(0.001, 0.001, 0.001, WOOD, -0.85, G, -1.3, { delay: 0.2, flat: true, noInk: true });
  const spools = new Map<number, Point[]>();
  [0.35, 0.95, 1.55, 2.1].forEach((y, row) => {
    box(1.25, 0.05, 0.36, WOOD, -0.85, G + y, -1.3, { delay: 0.14 + row * 0.03 });
    for (let k = 0; k < 6; k++) {
      const color = [MAGENTA, CYAN, WARP, 0x7a2f55][(row + k * 3) % 4];
      spools.set(color, [...(spools.get(color) ?? []), [-0.5 + k * 0.2, y + 0.125, (k % 2) * 0.06]]);
    }
  });
  spools.forEach((spots, color) => decorate(shelves, new CylinderGeometry(0.07, 0.07, 0.15, 10), color, spots));

  // The side table and the sewing machine she never uses, its cord snipped.
  box(0.55, 0.6, 0.5, WOOD, -1.55, G, 0.55, { delay: 0.3 });
  const machine = box(0.4, 0.06, 0.22, 0x2a2a34, -1.55, G + 0.6, 0.55, { delay: 0.34, rotation: [0, 0.5, 0] });
  decorate(machine, new BoxGeometry(0.08, 0.24, 0.12), 0x2a2a34, [[0.13, 0.15, 0]]);
  decorate(machine, new BoxGeometry(0.34, 0.08, 0.12), 0x2a2a34, [[0.0, 0.3, 0]]);
  decorate(machine, new BoxGeometry(0.02, 0.1, 0.02), STEEL, [[-0.14, 0.21, 0]]);
  decorate(machine, new BoxGeometry(0.06, 0.02, 0.122), YELLOW, [[0.0, 0.3, 0]]);
  cable(kit, [[-1.4, G + 0.62, 0.42], [-1.28, G + 0.3, 0.55], [-1.2, G + 0.02, 0.8]], 0.015, 0x14121c, 0.4);
  cable(kit, [[-1.05, G + 0.02, 0.95], [-0.8, G + 0.02, 1.1], [-0.55, G + 0.02, 1.35]], 0.015, 0x14121c, 0.42);

  // The loom: uprights, beams, the warp, the cloth woven so far, one thread cut.
  const LT = 0.35;
  const LX = 0.85;
  const LZ = -0.25;
  const l = (lx: number, ly: number, lz: number): Point => [LX + lx * Math.cos(LT) + lz * Math.sin(LT), G + ly, LZ - lx * Math.sin(LT) + lz * Math.cos(LT)];
  const rot: [number, number, number] = [0, LT, 0];
  [-1, 1].forEach((side, i) => {
    box(0.1, 2.75, 0.1, WOOD, ...l(side * 0.72, 0, 0), { delay: 0.4 + i * 0.03, rotation: rot });
    box(0.12, 0.08, 0.7, WOOD_DARK, ...l(side * 0.72, 0, 0), { delay: 0.38, rotation: rot });
  });
  const top = box(1.6, 0.12, 0.14, WOOD, ...l(0, 2.55, 0), { delay: 0.46, rotation: rot });
  box(1.55, 0.1, 0.16, WOOD, ...l(0, 0.42, 0.02), { delay: 0.46, rotation: rot });
  box(1.5, 0.06, 0.06, WOOD_DARK, ...l(0, 1.45, 0.06), { delay: 0.48, rotation: rot });
  const xs = Array.from({ length: 25 }, (_, k) => -0.6 + k * 0.05);
  decorate(
    top,
    new BoxGeometry(0.009, 2.05, 0.009),
    WARP,
    xs.filter((_, k) => k !== 4).map((x) => [x, -1.02, 0] as Point),
  );
  decorate(top, new BoxGeometry(0.009, 0.75, 0.009), WARP, [[xs[4], -0.38, 0]]);
  decorate(top, new BoxGeometry(0.009, 0.7, 0.009), WARP, [[xs[4], -1.7, 0, 0.15]]);
  const cloth = box(1.3, 0.45, 0.03, 0x7a2f55, ...l(0, 0.52, 0), { delay: 0.52, rotation: rot });
  decorate(
    cloth,
    new BoxGeometry(1.3, 0.04, 0.01),
    MAGENTA,
    [0.08, 0.2, 0.32].map((y) => [0, y, 0.016] as Point),
  );

  // Ordito on her chair, the shears in her right hand, her left among the threads.
  const SX = -0.35;
  const SZ = 0.25;
  const chair: Point[] = [
    [-0.2, -0.2],
    [0.2, -0.2],
    [-0.2, 0.2],
    [0.2, 0.2],
  ].map(([dx, dz]) => [SX + dx, G, SZ - 0.05 + dz]);
  chair.forEach((p, i) => box(0.05, 0.56, 0.05, WOOD_DARK, ...p, { delay: 0.6 + i * 0.01, noInk: true }));
  box(0.5, 0.05, 0.5, WOOD, SX, G + 0.56, SZ - 0.05, { delay: 0.64, rotation: [0, 0.3, 0] });
  box(0.46, 0.9, 0.05, WOOD, SX - 0.07, G + 0.6, SZ - 0.32, { delay: 0.66, rotation: [-0.08, 0.3, 0] });
  const owner = figure(kit, {
    x: SX,
    z: SZ,
    y: G,
    facing: 0.3,
    height: 2.3,
    skin: 0xd0a088,
    hair: { style: "wild", color: 0x9a9aa2 },
    face: { mouth: "neutral", brows: "calm", marks: 0xa07a68 },
    top: { kind: "apron", color: 0x26242a, accent: 0x8a8070, sleeves: "long" },
    bottom: { kind: "long-skirt", color: 0x1c1a20 },
    shoes: 0x2a2226,
    arms: [
      [-0.16, 0.92, 0.46],
      [0.68, 1.18, -0.04],
    ],
    legs: "sit",
    delay: 0.8,
  });
  // The apron over her lap, and plasters round her fingers.
  box(0.5, 0.04, 0.5, 0x8a8070, ...owner.at(0, 0.7, 0.26), { delay: 1.1, rotation: [0, 0.3, 0] });
  owner.hands.forEach((hand, i) => add(new TorusGeometry(0.07, 0.022, 6, 14), 0xf0ece0, hand[0], hand[1] - 0.09, hand[2], { delay: 1.2 + i * 0.03, rotation: [0.4, 0.3 + i, 0] }));

  // The shears: two blades on a pivot, brass rings.
  const [hand] = owner.hands;
  const pivot = new Group();
  pivot.position.set(hand[0], hand[1] - 0.03, hand[2] + 0.04);
  const blades = [-1, 1].map((side, i) => {
    const blade = add(new BoxGeometry(0.06, 0.42, 0.014), STEEL, 0, 0, 0, { delay: 1.25 + i * 0.03 });
    decorate(blade, new TorusGeometry(0.06, 0.016, 6, 14), 0xb08d3c, [[side * 0.05, -0.04, 0]]);
    blade.parent?.add(pivot);
    pivot.add(blade);
    return blade;
  });
  pivot.rotation.order = "YXZ";
  pivot.rotation.set(0.85, 0.9, 0);

  // The threads from above: to her hands and the loom's top, tugged now and then.
  const targets: Point[] = [owner.hands[1], [hand[0], hand[1] + 0.05, hand[2]], owner.at(0, 2.32, 0), l(-0.4, 2.67, 0), l(0.45, 2.67, 0)];
  const strings = targets.map((p, i) => limb(kit, [p[0] + 0.05 * (i - 2), G + 4.2, p[2] - 0.1], p, 0.008, 0.008, MAGENTA, { delay: 1.5 + i * 0.04, flat: true, noInk: true }));
  const rest = strings.map((s) => s.position.y);

  tick((t) => {
    // The shears snip; every few seconds the threads are tugged.
    const snip = Math.max(0, Math.sin(t * 3));
    blades.forEach((blade, i) => (blade.rotation.z = (i ? 1 : -1) * (0.3 - snip * 0.26)));
    const p = t % 4;
    const tug = p > 2.8 && p < 3.4 ? Math.sin(((p - 2.8) / 0.6) * Math.PI) : 0;
    strings.forEach((s, i) => (s.position.y = rest[i] + tug * (0.1 + (i % 2) * 0.05)));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
