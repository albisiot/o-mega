import { BoxGeometry, CylinderGeometry, DodecahedronGeometry, Group, TorusGeometry, Vector3 } from "three";
import { MAGENTA, ORANGE, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Impetus (P121): he has just burst out of a metro tunnel through the tiled wall that closed it and
 * charges down the tracks at us, leaning in, fist first, in dark padded armour and an old leather
 * helmet with orange straps, a whirl of orange momentum round him and tiles flying everywhere. A
 * flattened stop sign lies behind him: he doesn't stop, and doesn't think to (INT 1).
 */
export function impetus(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const TILE = 0xd8ccb0;
  const GROUT = 0x8a8270;
  const F = octagonBase(kit, 0x1e1c26);
  const G = floor(kit, F, 0.06, 0x2a2834, 0x1e1c26, 0.5);
  const T = 0.15;
  const tat = (lx: number, ly: number, lz: number): Point => [lx * Math.cos(T) + lz * Math.sin(T), G + ly, -lx * Math.sin(T) + lz * Math.cos(T)];

  // The tiled wall, the arch it used to close smashed open, the dark of the tunnel behind.
  const wall = add(archedWall(3.4, 2.9, 0.35, { x: 0, half: 0.85, spring: 1.25 }), TILE, ...tat(0, 0, -1.25), { delay: 0.1, rotation: [0, T, 0], ink: 1.02 });
  add(archMouth(0.85, 1.25), 0x0a0910, ...tat(0, 0, -1.44), { delay: 0.12, rotation: [0, T, 0], noInk: true });
  // Grout lines: each row of tiles stops at the edge of the hole.
  for (let row = 1; row < 15; row++) {
    const y = row * 0.2;
    const open = y < 1.25 ? 0.85 : y < 2.1 ? Math.sqrt(0.85 ** 2 - (y - 1.25) ** 2) : 0;
    const w = 1.7 - open;
    const spots: Point[] = open ? [-1, 1].map((s) => [s * (open + w / 2), y, 0.18]) : [[0, y, 0.18]];
    decorate(wall, new BoxGeometry(open ? w : 3.4, 0.015, 0.01), GROUT, spots);
  }
  decorate(wall, new BoxGeometry(0.015, 2.9, 0.01), GROUT, [-1.45, -1.15, 1.15, 1.45].map((x) => [x, 1.45, 0.18] as Point));
  decorate(wall, new BoxGeometry(0.015, 0.75, 0.01), GROUT, [-0.6, -0.3, 0, 0.3, 0.6].map((x) => [x, 2.52, 0.18] as Point));
  decorate(wall, new BoxGeometry(3.4, 0.12, 0.02), MAGENTA, [[0, 2.62, 0.185]]);
  // Shards of the wall still clinging round the hole.
  [
    [-0.8, 0.5, 0.4],
    [0.78, 0.8, -0.5],
    [-0.62, 1.75, 0.9],
    [0.45, 1.98, -0.3],
    [-0.15, 2.07, 0.2],
  ].forEach(([x, y, a], i) => box(0.26, 0.22, 0.06, TILE, ...tat(x, y, -1.05), { delay: 0.2 + i * 0.03, rotation: [0.2, T, a] }));

  // The track out of the tunnel.
  const bed = box(1.3, 0.03, 3.25, 0x24222c, ...tat(0, 0, 0.225), { delay: 0.15, noInk: true, rotation: [0, T, 0] });
  decorate(bed, new BoxGeometry(1.05, 0.05, 0.14), 0x4a3a30, Array.from({ length: 10 }, (_, k) => [0, 0.05, -1.45 + k * 0.32] as Point));
  [-0.35, 0.35].forEach((lx) => box(0.07, 0.07, 3.25, 0x8a93a3, ...tat(lx, 0.06, 0.225), { delay: 0.25, rotation: [0, T, 0] }));

  // Impetus, charging, leaning into it.
  const [hx, , hz] = tat(0, 0, 0.5);
  const hero = figure(kit, {
    x: hx,
    z: hz,
    y: G + 0.06,
    facing: 0.3,
    height: 2.5,
    build: "broad",
    skin: 0xc89070,
    face: { mouth: "frown", brows: "angry", beard: "full", beardColor: 0x2a1e1a },
    headwear: { kind: "helmet", color: 0x3a3a44, accent: ORANGE },
    top: { kind: "armor", color: 0x34343c, accent: 0x4a4a56 },
    bottom: { kind: "trousers", color: 0x2a2a32 },
    belt: ORANGE,
    gloves: 0x2a2a32,
    shoes: 0x1e1c22,
    arms: [
      [-0.15, 1.75, 0.72],
      [0.5, 1.2, -0.45],
    ],
    legs: "stride",
    delay: 0.9,
  });
  const extra = [-1, 1].map((s) => box(0.07, 0.75, 0.03, ORANGE, ...hero.at(s * 0.12, 1.2, 0.38), { delay: 1.3, rotation: [0, 0.3, s * 0.55], noInk: true }));
  const swirl = [0.7, 1.4, 2.1].map((h, k) =>
    add(new TorusGeometry(0.7 + k * 0.12, 0.024, 5, 40, 4.2).rotateX(Math.PI / 2), ORANGE, ...hero.at(0, h, -0.1), { delay: 1.5 + k * 0.05, flat: true, noInk: true }),
  );
  // Leaning forward: the whole figure tips about its feet.
  const lean = new Group();
  lean.position.set(hx, G, hz);
  hero.parts[0].parent?.add(lean);
  [...hero.parts, ...extra, ...swirl].forEach((part) => {
    part.position.sub(lean.position);
    lean.add(part);
  });
  const axis = new Vector3(Math.cos(0.3), 0, -Math.sin(0.3));

  // Orange streaks of momentum trailing back into the tunnel.
  const streaks = [
    [-0.5, 1.3],
    [0.45, 1.0],
    [0.1, 2.0],
    [-0.25, 0.6],
  ].map(([lx, y], i) => box(0.03, 0.03, 1.3, i % 2 ? ORANGE : 0xffb060, ...tat(lx, y, -0.55), { delay: 1.6 + i * 0.04, flat: true, noInk: true, rotation: [0, T, 0] }));

  // Tiles and stones flying out of the hole.
  const debris = Array.from({ length: 14 }, (_, k) => {
    const tile = k % 3 !== 0;
    const part = tile
      ? box(0.17, 0.17, 0.03, TILE, 0, 0, 0, { delay: 1.2 })
      : add(new DodecahedronGeometry(0.07 + (k % 2) * 0.03), 0x4a4652, 0, 0, 0, { delay: 1.2 });
    if (tile) decorate(part, new BoxGeometry(0.17, 0.012, 0.01), GROUT, [[0, 0.085, 0.016]]);
    const angle = (k / 14) * Math.PI * 2;
    return { part, x: Math.cos(angle) * 0.75, y: 1.2 + Math.sin(angle) * 0.85, phase: (k * 0.37) % 1 };
  });

  // The stop sign he went through, flattened.
  limb(kit, [-1.3, G, 0.95], [-1.28, G + 0.42, 0.97], 0.025, 0.025, 0x23222b, { delay: 0.5 });
  limb(kit, [-1.28, G + 0.42, 0.97], [-0.98, G + 0.12, 1.42], 0.025, 0.025, 0x23222b, { delay: 0.55 });
  const disc = add(new CylinderGeometry(0.18, 0.18, 0.03, 20), MAGENTA, -0.88, G, 1.55, { delay: 0.6, rotation: [0.25, 0, -0.1] });
  decorate(disc, new TorusGeometry(0.15, 0.02, 6, 20).rotateX(Math.PI / 2), 0xf4f0e6, [[0, 0.03, 0]]);

  tick((t) => {
    const surge = 0.3 + Math.sin(t * 5) * 0.03;
    lean.quaternion.setFromAxisAngle(axis, surge);
    swirl.forEach((ring, k) => (ring.rotation.y = t * (3 + k) + k * 2));
    streaks.forEach((streak, i) => (streak.visible = Math.floor(t * 8 + i * 3) % 4 !== 3 || t === 0));
    debris.forEach(({ part, x, y, phase }, k) => {
      const u = (t / 2.2 + phase) % 1;
      const s = u * 1.3;
      const [px, , pz] = tat(x * (1 + s * 1.3), 0, -1.0 + s * 1.5);
      const py = G + y + s * 0.9 - s * s * 1.6;
      part.position.set(px, Math.max(G, py), pz);
      part.rotation.set(s * 7 + k, s * 5, k);
      part.visible = py > G;
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.7 };
}
