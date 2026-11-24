import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, lamp, puddle } from "@/lib/diorama-props";

/**
 * Lure (P118): at night in the container yard the living bait in her orange hi-vis jacket runs
 * towards us grinning, smeared with glowing bait, while a colossus's clawed foot comes down on the
 * wet concrete right behind her, again and again. The radio she dropped lies blinking behind her:
 * she doesn't do gadgets (TEC 1), she just runs, and can't stop.
 */
export function lure(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const GOO = 0xc6ff3a;
  const HIDE = 0x2e3440;
  const F = octagonBase(kit, 0x1a1d26);
  const G = floor(kit, F, 0.06, 0x2a2f3a, 0x1c2029, 0.5);

  // The yard: stacked containers, a lamp, puddles.
  [0x1f6f8c, 0x7a2f55, 0x2a3a4a].forEach((color, i) => {
    const container = box(1.3, 0.6, 0.6, color, -1.4 + (i === 2 ? 0.08 : 0), G + i * 0.6, -0.75, { delay: 0.1 + i * 0.05, rotation: [0, 0.4 + (i === 1 ? 0.06 : 0), 0] });
    decorate(container, new BoxGeometry(0.03, 0.52, 0.01), INK, Array.from({ length: 9 }, (_, k) => [-0.56 + k * 0.14, 0.3, 0.305] as Point));
  });
  [0x2a3a4a, 0x1f6f8c].forEach((color, i) => {
    const container = box(1.2, 0.6, 0.6, color, 1.7, G + i * 0.6, 0.35 + i * 0.05, { delay: 0.2 + i * 0.05, rotation: [0, -1.3 + i * 0.1, 0] });
    decorate(container, new BoxGeometry(0.03, 0.52, 0.01), INK, Array.from({ length: 8 }, (_, k) => [-0.5 + k * 0.14, 0.3, 0.305] as Point));
  });
  const light = lamp(kit, 1.55, -0.95, G, 0.3, 2.5, 0xd8f4ff);
  puddle(kit, 0.65, 0.75, G, 0.4, 0.42, CYAN);
  puddle(kit, -1.15, 1.25, G, 0.45, 0.32, MAGENTA);

  // The colossus's foot and shin, out of the top of the picture.
  const T = 0.25;
  const fat = (lx: number, ly: number, lz: number): Point => [0.5 + lx * Math.cos(T) + lz * Math.sin(T), G + ly, -0.85 - lx * Math.sin(T) + lz * Math.cos(T)];
  const shadow = add(new CylinderGeometry(0.85, 0.85, 0.005, 20).scale(1, 1, 0.8), 0x101218, ...fat(0, 0, 0.15), { delay: 0.5, flat: true, noInk: true });
  const foot = [
    add(new SphereGeometry(0.6, 18, 12).scale(1.25, 0.5, 1.1), HIDE, ...fat(0, 0, 0), { delay: 0.6, rotation: [0, T, 0] }),
    add(new CylinderGeometry(0.5, 0.58, 4.2, 14), HIDE, ...fat(0, 0.3, -0.15), { delay: 0.65 }),
    ...[-0.45, -0.15, 0.15, 0.45].flatMap((lx, k) => [
      ball(0.21, k % 2 ? HIDE : 0x353c4a, ...fat(lx, 0, 0.6 - Math.abs(lx) * 0.25), { delay: 0.7 + k * 0.03 }),
      add(new ConeGeometry(0.07, 0.24, 6).rotateX(Math.PI / 2), 0xd8d0b8, ...fat(lx, 0.06, 0.85 - Math.abs(lx) * 0.25), { delay: 0.8 + k * 0.03, rotation: [0.35, T, 0] }),
    ]),
  ];
  decorate(foot[1], new TorusGeometry(0.53, 0.04, 6, 18).rotateX(Math.PI / 2), 0x232833, [
    [0, 0.6, 0],
    [0, 1.3, 0],
    [0, 2.1, 0],
  ]);
  decorate(foot[1], new BoxGeometry(0.18, 0.14, 0.05), 0x3e4656, [
    [0.1, 0.9, 0.54],
    [-0.2, 1.6, 0.52],
    [0.25, 2.4, 0.5],
  ]);
  const stomp = new Group();
  foot[0].parent?.add(stomp);
  foot.forEach((part) => stomp.add(part));
  // Chips of concrete flung up when it lands.
  const chips = Array.from({ length: 8 }, (_, k) => ({ part: add(new DodecahedronGeometry(0.05 + (k % 3) * 0.02), 0x5d6680, 0, 0, 0, { delay: 0.9 }), angle: k * 0.8 + 0.3 }));

  // Lure, running for it, laughing.
  const runner = figure(kit, {
    x: -0.35,
    z: 0.95,
    y: G,
    facing: 0.1,
    height: 2.3,
    build: "slim",
    skin: 0xf0c8a8,
    hair: { style: "spiky", color: 0x1e1a1e },
    face: { mouth: "grin", brows: "raised", marks: 0xb07050 },
    top: { kind: "jacket", color: ORANGE, accent: 0xd8dde0 },
    bottom: { kind: "trousers", color: 0x2a3038 },
    shoes: 0x2a2622,
    arms: [
      [-0.2, 1.45, 0.42],
      [0.42, 1.05, -0.35],
    ],
    legs: "stride",
    delay: 1,
  });
  add(new TorusGeometry(0.265, 0.03, 6, 20).rotateX(Math.PI / 2).scale(1, 1, 0.74), 0xd8dde0, ...runner.at(0, 1.25, 0), { delay: 1.4, rotation: [0, 0.1, 0] });
  // Smeared with glowing bait.
  [
    [0.2, 1.55, 0.18, 0.06],
    [-0.12, 1.32, 0.22, 0.05],
    [0.1, 1.1, 0.24, 0.045],
    [-0.42, 1.45, 0.3, 0.04],
  ].forEach(([x, y, z, r], i) => ball(r, GOO, ...runner.at(x, y, z), { delay: 1.45 + i * 0.03, flat: true, noInk: true }));
  decorate(runner.headPart, new BoxGeometry(0.06, 0.08, 0.02), GOO, [[0.12, runner.headRadius * 0.95, runner.headRadius * 0.82]]);
  const drips = [
    [0.1, 1.05, 0.25],
    [-0.15, 0.95, 0.22],
  ].map(([x, y, z], i) => ({ part: ball(0.03, GOO, ...runner.at(x, y, z), { delay: 1.5 + i * 0.05, flat: true, noInk: true }), from: runner.at(x, y, z), phase: i * 0.5 }));
  const rest = runner.parts.map((part) => part.position.y);

  // The radio she dropped, blinking to nobody.
  box(0.1, 0.05, 0.22, 0x2a2a30, 0.35, G, 1.55, { delay: 1.6, rotation: [0, 0.6, 0] });
  limb(kit, [0.38, G + 0.03, 1.48], [0.55, G + 0.06, 1.3], 0.012, 0.012, INK, { delay: 1.65, noInk: true });
  const led = ball(0.025, CYAN, 0.33, G + 0.05, 1.58, { delay: 1.7, flat: true, noInk: true });

  tick((t) => {
    const p = (t / 3.2) % 1;
    const lift = p < 0.55 ? 0.55 + Math.sin(t * 2) * 0.03 : p < 0.62 ? 0.55 * (1 - ((p - 0.55) / 0.07) ** 2) : p < 0.8 ? 0 : 0.55 * ((p - 0.8) / 0.2);
    stomp.position.y = lift;
    shadow.children[0].scale.setScalar(1 - lift * 0.5);
    const after = p >= 0.62 && p < 0.85 ? (p - 0.62) / 0.23 : -1;
    chips.forEach(({ part, angle }, k) => {
      part.visible = after >= 0;
      const r = 0.7 + after * (0.6 + (k % 3) * 0.2);
      const [x, , z] = fat(Math.cos(angle) * r, 0, 0.1 + Math.sin(angle) * r * 0.8);
      part.position.set(x, G + Math.max(0, after * (1 - after) * 2.4), z);
      part.rotation.set(after * 9 + k, after * 5, 0);
    });
    colorOf(light).setHex(after >= 0 && after < 0.15 ? 0x6a8a90 : 0xd8f4ff);
    const bounce = Math.abs(Math.sin(t * 6)) * 0.04 + (after >= 0 && after < 0.1 ? 0.03 : 0);
    runner.parts.forEach((part, i) => (part.position.y = rest[i] + bounce));
    drips.forEach(({ part, from, phase }) => {
      const u = (t * 1.2 + phase) % 1;
      part.position.set(from[0], from[1] - u * u * (from[1] - G) + bounce, from[2] + u * 0.05);
    });
    led.visible = Math.floor(t * 2) % 2 === 0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.75 };
}
