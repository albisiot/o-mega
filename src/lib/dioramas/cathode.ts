import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, type Group } from "three";
import { INK, MAGENTA, YELLOW, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, lamp } from "@/lib/diorama-props";

/**
 * Cathode (P033): the gentle giant of the Lanterne at the gate of the power plant where he used
 * to work, smiling and holding out his hand while electricity crackles all over him. He can't
 * throw a punch, and doesn't need to: in front of him, all that is left of the last man who
 * shook it is a pair of smoking shoes and a cap on a scorch mark.
 */
export function cathode(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const IRON = 0x2f4a5a;
  const SMOKE = 0x4a4458;
  const F = octagonBase(kit, 0x1a1d24);
  const G = floor(kit, F, 0.06, 0x2c323c, 0x20252e, 0.55);

  // The plant behind the fence: a block with lit windows and two chimneys breathing smoke.
  facade(kit, 0.35, -1.75, G, 0.1, { width: 2.0, height: 1.9, color: 0x2a3040, windows: 3, floors: 2 });
  const stacks: [number, number, number][] = [
    [-1.0, -1.65, 3.4],
    [-0.45, -1.95, 2.9],
  ];
  const puffs: { part: Group; x: number; y: number; phase: number }[] = [];
  stacks.forEach(([x, z, h], i) => {
    const stack = cylinder(0.15, 0.21, h, 0x3a3f4e, x, G, z, { delay: 0.14 + i * 0.05 }, 14);
    decorate(stack, new CylinderGeometry(0.17, 0.17, 0.08, 14), i ? MAGENTA : 0xd8d2c4, [[0, h - 0.3, 0], [0, h - 0.55, 0]]);
    [0, 1, 2].forEach((k) => puffs.push({ part: ball(0.13 + k * 0.04, SMOKE, x, G + h, z, { delay: 0.5 + k * 0.05, noInk: true }), x, y: G + h, phase: k / 3 + i * 0.15 }));
  });

  // The iron palisade, a high-voltage sign (a bolt, no words) and a lamp.
  const rail = box(3.5, 0.06, 0.06, IRON, 0, G + 0.3, -1.1, { delay: 0.2 });
  box(3.5, 0.06, 0.06, IRON, 0, G + 1.62, -1.1, { delay: 0.22 });
  const bars = Array.from({ length: 19 }, (_, k) => -1.62 + k * 0.18);
  decorate(rail, new BoxGeometry(0.04, 1.85, 0.04), IRON, bars.map((x) => [x, 0.62, 0.03] as Point));
  decorate(rail, new ConeGeometry(0.04, 0.12, 4), IRON, bars.map((x) => [x, 1.6, 0.03] as Point));
  const warning = add(new CylinderGeometry(0.24, 0.24, 0.03, 3).rotateX(-Math.PI / 2), YELLOW, 0.95, G + 1.05, -1.04, { delay: 0.4 });
  decorate(warning, new BoxGeometry(0.03, 0.13, 0.01), INK, [[0.02, 0.22, 0.02, -0.5], [-0.01, 0.14, 0.02, 1.1], [-0.03, 0.08, 0.02, -0.5]]);
  const light = lamp(kit, 1.7, -0.35, G, 0.3, 2.35);

  // The last handshake: a scorch mark, a pair of smoking shoes and a fallen cap.
  cylinder(0.42, 0.42, 0.008, 0x121016, -0.3, G, 1.45, { delay: 0.5, flat: true, noInk: true }, 18);
  // The shoes face him, toes towards his hand, still laced.
  [-0.12, 0.12].forEach((dx, i) => {
    const x = -0.3 + dx;
    box(0.15, 0.07, 0.3, 0x4a3022, x, G, 1.5, { delay: 0.55 + i * 0.03 });
    ball(0.075, 0x4a3022, x, G, 1.36, { delay: 0.56 + i * 0.03 });
    const collar = box(0.15, 0.09, 0.13, 0x5a3a28, x, G + 0.07, 1.58, { delay: 0.58 + i * 0.03 });
    decorate(collar, new BoxGeometry(0.1, 0.01, 0.08), 0x15131a, [[0, 0.09, 0]]);
    decorate(collar, new BoxGeometry(0.11, 0.012, 0.01), 0xe8e2d0, [[0, 0.03, -0.066], [0, 0.06, -0.066]]);
  });
  add(new SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x5a1a3a, 0.35, G, 1.25, { delay: 0.6, rotation: [0.3, 0, 0.5] });
  box(0.18, 0.02, 0.12, 0x45142e, 0.48, G + 0.02, 1.38, { delay: 0.62, rotation: [0, 0.4, 0.2] });
  motes(10, 0x8a8494, 0.035, [-0.5, G + 0.1, 1.35], [-0.1, G + 1.3, 1.6], 1.0);

  // Cathode: a big bearded man in work dungarees, smiling, his hand held out.
  const giant = figure(kit, {
    x: -0.2,
    z: 0.15,
    y: G,
    facing: 0.3,
    height: 2.8,
    build: "broad",
    skin: 0xd4a284,
    hair: { style: "curly", color: 0x4a3020 },
    face: { mouth: "smile", brows: "worried", beard: "stubble", beardColor: 0x4a3020 },
    top: { kind: "apron", color: 0x4a6a7a, accent: 0x23465a, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x23465a },
    shoes: 0x2a2622,
    arms: [[-0.9, 1.72, 0.62], "down"],
    delay: 0.8,
  });
  // His brown hair over the crown (the figure's own cap sits too low and lets the scalp show).
  const RH = giant.headRadius;
  ball(RH * 1.03, 0x4a3020, ...giant.at(0, giant.head[1] - G + RH * 0.14 - RH * 1.03, -RH * 0.16), { delay: 1.2 });
  const [hand] = giant.hands;
  // Electricity all over him: two sets of sparks that take turns.
  const paths: [Point, Point][] = [
    [giant.at(-0.62, 2.05, 0.05), hand],
    [giant.at(-0.72, 1.75, -0.05), giant.at(-0.55, 0.3, 0.05)],
    [giant.at(0.72, 2.05, -0.05), giant.at(0.6, 0.35, 0.05)],
    [giant.at(0.35, 2.15, -0.1), giant.at(0.75, 1.1, 0.1)],
    [giant.at(-0.25, 2.95, -0.05), giant.at(-0.8, 2.15, 0)],
    [giant.at(0.25, 2.95, -0.05), giant.at(0.8, 2.15, 0)],
  ];
  const sparks = [0, 1].map((set) => [
    ...paths.flatMap(([from, to], k) => zigzag(kit, jag(from, to, 7, 0.1, k + set * 7), 0.035, set ? 0xfff2a0 : YELLOW, 1.4 + k * 0.05)),
    ...[0, 2, 4].flatMap((k) => {
      const angle = k + set * 1.2;
      const tip: Point = [hand[0] + Math.cos(angle) * 0.3, hand[1] + Math.sin(angle) * 0.3, hand[2] + 0.1];
      return zigzag(kit, jag(hand, tip, 3, 0.05, k + set), 0.03, YELLOW, 1.6);
    }),
  ]);

  tick((t) => {
    const flash = Math.floor(t * 8) % 2;
    sparks.forEach((set, k) => set.forEach((part) => (part.visible = flash === k)));
    for (const { part, x, y, phase } of puffs) {
      const u = (t * 0.18 + phase) % 1;
      part.position.set(x + u * 0.5, y + u * 0.9, part.position.z);
    }
    light.visible = Math.floor(t * 5) % 23 !== 7;
  });

  return { width: 4.9, height: 4.6, lookY: 1.65 };
}
