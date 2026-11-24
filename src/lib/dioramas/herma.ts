import { BoxGeometry, Color, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { YELLOW, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, lamp, puddle, tree } from "@/lib/diorama-props";

/**
 * Herma (P139): the living boundary stone stands where a garden wall meets the street at night,
 * a square mossy shaft topped by a classical head with lit eyes; the boundary runs as a line of
 * light along the wall and across the cobbles, and a passer-by in a flat cap is frozen with one
 * foot on it. On the wall, fresh tally marks of everyone it has stopped. The price: it never
 * moves, so ivy climbs it, moss covers it and a spider has strung a web from its shoulder.
 */
export function herma(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const LINE = 0x4dffa0;
  const STONE = 0x7a8078;
  const MOSS = 0x4a7a3a;
  const F = octagonBase(kit, 0x1a1e24);
  const G = floor(kit, F, 0.06, 0x2c3240, 0x20242f, 0.32);

  // The street: a house corner, a lamp, a tree behind the garden wall, puddles.
  facade(kit, -1.0, -1.4, G, 0.1, { width: 1.4, height: 3.0, color: 0x2a2c40, windows: 2, floors: 3, lit: YELLOW, shutters: 0x23404b });
  const light = lamp(kit, -1.85, 0.25, G, 0.2, 2.3);
  tree(kit, 1.5, -1.45, G, 0.25, 2.3, 0x2a5a3a);
  puddle(kit, -0.3, 1.35, G, 0.3, 0.4, LINE);
  puddle(kit, 0.9, 1.3, G, 0.32, 0.3, 0xff2e6c);

  // The garden wall, capped with tiles, running back from the stone along the boundary.
  const HX = 0.35;
  const HZ = -0.35;
  const A: [number, number] = [0.914, -0.406];
  const yaw = Math.atan2(-A[1], A[0]);
  const wall = box(1.5, 1.6, 0.3, 0x5a5e6a, HX + A[0] * 1.05, G, HZ + A[1] * 1.05, { delay: 0.15, rotation: [0, yaw, 0] });
  decorate(wall, new BoxGeometry(0.3, 0.2, 0.01), 0x4a4e5a, [
    [-0.5, 0.4, 0.151],
    [0.2, 1.1, 0.151],
    [0.55, 0.3, 0.151],
  ]);
  // Tally marks scratched in light: one group per person stopped.
  const marks: Point[] = [];
  [0, 1, 2].forEach((row) => [0, 1].forEach((group) => [0, 1, 2, 3].forEach((k) => marks.push([-0.55 + group * 0.38 + k * 0.06, 1.25 - row * 0.28, 0.152]))));
  const tallies = decorate(wall, new BoxGeometry(0.018, 0.16, 0.01), LINE, marks.slice(0, -2));
  decorate(wall, new BoxGeometry(0.018, 0.27, 0.01), LINE, [0, 1, 2].flatMap((row) => [0, 1].map((group) => [-0.46 + group * 0.38, 1.25 - row * 0.28 + 0.08, 0.153, 1.2] as [number, number, number, number])).slice(0, -1));
  const fresh = decorate(wall, new BoxGeometry(0.018, 0.16, 0.01), 0xffffff, marks.slice(-2));
  box(1.6, 0.1, 0.42, 0x6a3a34, HX + A[0] * 1.05, G + 1.6, HZ + A[1] * 1.05, { delay: 0.2, rotation: [0, yaw, 0] });

  // The boundary: a line of light under the wall, through the stone and on across the street.
  const L = 3.3;
  const line = box(L, 0.012, 0.05, LINE, HX - A[0] * (L / 2 - 1.6), G + 0.002, HZ - A[1] * (L / 2 - 1.6), { delay: 0.5, flat: true, noInk: true, rotation: [0, yaw, 0] });

  // Herma: a square shaft on a plinth, mossy, and the head on top.
  box(0.7, 0.16, 0.7, 0x5a5e66, HX, G, HZ, { delay: 0.3, rotation: [0, yaw, 0] });
  const shaft = add(new CylinderGeometry(0.27, 0.32, 2.2, 4, 1).rotateY(Math.PI / 4), STONE, HX, G + 0.16, HZ, { delay: 0.35, rotation: [0, yaw, 0] });
  decorate(shaft, new BoxGeometry(0.22, 0.3, 0.02), MOSS, [
    [-0.06, 0.4, 0.222],
    [0.08, 1.3, 0.21],
    [-0.04, 1.9, 0.2],
  ]);
  decorate(shaft, new BoxGeometry(0.035, 2.18, 0.02), LINE, [[-0.2, 1.1, 0.205]]);
  cylinder(0.12, 0.14, 0.22, STONE, HX, G + 2.33, HZ, { delay: 0.45 });
  const head = add(new SphereGeometry(0.27, 18, 14).scale(0.95, 1.08, 0.95), 0x9a9e94, HX, G + 2.45, HZ, { delay: 0.5, rotation: [0, 0.15, 0] });
  decorate(head, new BoxGeometry(0.07, 0.035, 0.02), LINE, [
    [-0.09, 0.33, 0.255],
    [0.09, 0.33, 0.255],
  ]);
  decorate(head, new BoxGeometry(0.09, 0.025, 0.02), 0x5a5e56, [
    [-0.09, 0.38, 0.248, 0.2],
    [0.09, 0.38, 0.248, -0.2],
  ]);
  decorate(head, new BoxGeometry(0.06, 0.11, 0.06), 0x8a8e84, [[0, 0.27, 0.26]]);
  decorate(head, new BoxGeometry(0.08, 0.014, 0.01), 0x5a5e56, [[0, 0.17, 0.238]]);
  [0.2, 0.75, 1.3, 1.85, 2.4, 2.95].forEach((angle, k) => {
    const r = 0.25;
    ball(0.085, 0x8a8e84, HX + Math.cos(angle) * r * 0.9, G + 2.45 + 0.42 + Math.sin(angle) * 0.12 - 0.085, HZ - 0.05 - Math.abs(Math.sin(angle)) * 0.08, { delay: 0.55 + k * 0.02 });
  });
  ball(0.16, 0x8a8e84, HX, G + 2.6, HZ - 0.12, { delay: 0.55 });
  // Ivy up its side and a spider's web from its shoulder to the wall.
  const ivy: Point[] = [
    [HX + 0.28, G + 0.15, HZ + 0.12],
    [HX + 0.3, G + 0.8, HZ + 0.05],
    [HX + 0.26, G + 1.4, HZ + 0.16],
    [HX + 0.24, G + 2.0, HZ + 0.1],
  ];
  cable(kit, ivy, 0.015, 0x2a5a2a, 0.6);
  ivy.slice(0, 3).forEach(([x, y, z], i) => box(0.12, 0.08, 0.1, MOSS, x + 0.03, y + 0.2, z, { delay: 0.62 + i * 0.03, rotation: [0.3, i, 0.5] }));
  const corner: Point = [HX + A[0] * 0.22, G + 1.72, HZ + A[1] * 0.22];
  const rim: Point[] = [0, 0.25, 0.5, 0.75, 1].map((u) => [HX + A[0] * (0.22 + 0.63 * u), G + 2.25 - 0.53 * u, HZ + A[1] * (0.22 + 0.63 * u)]);
  rim.forEach((p, i) => limb(kit, corner, p, 0.005, 0.005, 0xd8d8e0, { delay: 1.6 + i * 0.02, flat: true, noInk: true }));
  [0.45, 0.8].forEach((k) =>
    rim.slice(1).forEach((p, i) => {
      const from: Point = rim[i].map((v, j) => corner[j] + (v - corner[j]) * k) as Point;
      const to: Point = p.map((v, j) => corner[j] + (v - corner[j]) * k) as Point;
      limb(kit, from, to, 0.004, 0.004, 0xd8d8e0, { delay: 1.7, flat: true, noInk: true });
    }),
  );

  // The passer-by, frozen with his front foot on the line.
  const man = figure(kit, {
    x: -1.0,
    z: -0.15,
    y: G,
    facing: 0.3,
    height: 2.25,
    build: "normal",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried", beard: "moustache", beardColor: 0x3a2a22 },
    headwear: { kind: "cap", color: 0x3a3a44, accent: 0x2a2a32 },
    top: { kind: "coat", color: 0x4a3a30, accent: 0x5a4a3e },
    bottom: { kind: "trousers", color: 0x4a4250 },
    scarf: 0x23404b,
    arms: [
      [-0.26, 1.55, 0.36],
      [0.32, 1.62, 0.3],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const ankle = man.at(-0.16, 0.1, 0.28);
  const shackle = add(new TorusGeometry(0.13, 0.025, 6, 18).rotateX(Math.PI / 2), LINE, ankle[0], ankle[1], ankle[2], { delay: 1.5, flat: true, noInk: true });

  const lineFrom = new Color(0x1a8a5a);
  const lineTo = new Color(LINE);
  const rest = man.parts.map((part) => part.position.x);
  tick((t) => {
    // The line breathes; the newest tally flickers as it is scratched; the man shakes, stuck.
    const k = 0.5 + 0.5 * Math.cos(t * 2);
    colorOf(line).lerpColors(lineFrom, lineTo, 0.4 + 0.6 * k);
    tallies.color.lerpColors(lineFrom, lineTo, 0.6 + 0.4 * k);
    fresh.color.set(Math.floor(t * 9) % 4 === 3 ? LINE : 0xffffff);
    const shake = Math.sin(t * 40) * 0.008 * (Math.sin(t * 0.9) > 0 ? 1 : 0.3);
    man.parts.forEach((part, i) => (part.position.x = rest[i] + shake));
    shackle.children[0].scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    light.visible = Math.floor(t * 6) % 19 !== 7;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
