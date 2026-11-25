import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { YELLOW, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Brina (P271): the mountain guide takes a party up the volcano at night. On the black slope, a
 * glowing crater and a river of lava behind her, she turns to look back at us: short white hair,
 * a grey coat with a magenta fur collar, a coil of rope at her side, an oil lantern held high
 * and swinging, a stick in her other fist. Below her the roped party climbs the rocks in single
 * file, each with a little light; up there she gives the orders.
 */
export function brina(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const ROCK = 0x2e2a3a;
  const ROCK_LIGHT = 0x3e3850;
  const ROPE = 0xb02a5a;
  const LAVA = 0xff8a00;
  const F = octagonBase(kit, 0x1c1a24);
  const G = floor(kit, F, 0.06, 0x2a2632, 0x1e1a26, 0);

  // The slope: big black rocks rising to the back, ledges the party climbs.
  const rock = (x: number, z: number, y: number, r: number, scale: [number, number, number], delay: number, color = ROCK) =>
    add(new DodecahedronGeometry(r).scale(...scale), color, x, y, z, { delay, rotation: [0.3, x * 2, 0.2] });
  rock(-1.35, -1.05, G - 0.2, 0.8, [1.2, 0.9, 0.8], 0.1);
  rock(-0.35, -1.45, G - 0.15, 0.6, [1.3, 0.8, 0.7], 0.14, ROCK_LIGHT);
  rock(-1.85, 0.35, G - 0.1, 0.45, [1, 0.8, 1], 0.18);
  rock(-0.9, 1.45, G - 0.1, 0.3, [1.2, 0.7, 1], 0.2, ROCK_LIGHT);
  const ledges: [number, number, number][] = [
    [-0.62, -0.2, 0.2],
    [-1.12, -0.66, 0.5],
    [-1.65, -0.3, 0.85],
  ];
  ledges.forEach(([x, z, h], i) => cylinder(0.32, 0.38, h, i % 2 ? ROCK_LIGHT : ROCK, x, G, z, { delay: 0.22 + i * 0.04, rotation: [0, i, 0] }, 7));

  // The crater at the back, glowing, and the river of lava running down from it.
  const CX = 0.95;
  const CZ = -1.05;
  cylinder(0.42, 0.68, 0.4, ROCK, CX, G, CZ, { delay: 0.25 }, 10);
  const crater = cylinder(0.36, 0.36, 0.02, LAVA, CX, G + 0.39, CZ, { delay: 0.3, flat: true, noInk: true }, 16);
  [0.18, 0.26, 0.2].forEach((r, i) => ball(r, 0x3a2a48, CX + 0.1 * i - 0.05, G + 0.65 + i * 0.3, CZ - 0.05 * i, { delay: 0.35 + i * 0.05, noInk: true }));
  const course: Point[] = [
    [CX + 0.35, G + 0.005, CZ + 0.3],
    [1.55, G + 0.005, -0.3],
    [1.75, G + 0.005, 0.25],
    [1.6, G + 0.005, 0.8],
    [1.25, G + 0.005, 1.3],
  ];
  const lava = course.slice(1).flatMap((to, i) => {
    const from = course[i];
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const length = Math.hypot(dx, dz);
    const rotation: Point = [0, Math.atan2(dx, dz), 0];
    box(0.42 - i * 0.03, 0.05, length + 0.1, ROCK_LIGHT, from[0] + dx / 2, G, from[2] + dz / 2, { delay: 0.38 + i * 0.04, rotation });
    return [0.25, 0.75].map((k) =>
      box(0.28 - i * 0.03, 0.012, length * 0.5 + 0.06, LAVA, from[0] + dx * k, G + 0.05, from[2] + dz * k, { delay: 0.4 + i * 0.04, flat: true, noInk: true, rotation }),
    );
  });
  course.slice(1, 4).forEach(([x, , z], i) => rock(x + 0.32, z - 0.1, G - 0.06, 0.16, [1.2, 0.6, 1], 0.5 + i * 0.03));
  motes(14, LAVA, 0.025, [0.6, G + 0.2, -1.3], [1.8, G + 2.6, 1.0], 0.8);

  // The party, roped together, climbing in single file, each with a small light.
  const lights: Group[] = [];
  const hikers = ledges.map(([x, z, h], i) => {
    const hiker = figure(kit, {
      x,
      z,
      y: G + h,
      facing: 0.9,
      height: 1.25,
      skin: 0xc8a080,
      face: { mouth: "frown", brows: "worried" },
      headwear: { kind: "hood", color: [0x3a4a6a, 0x5a2a5a, 0x2a5a5a][i] },
      top: { kind: "coat", color: [0x3a4a6a, 0x5a2a5a, 0x2a5a5a][i] },
      bottom: { kind: "trousers", color: 0x23222b },
      arms: ["forward", "down"],
      delay: 1.0 + i * 0.1,
    });
    const [hand] = hiker.hands;
    lights.push(box(0.07, 0.09, 0.07, 0xffc040, hand[0], hand[1] - 0.12, hand[2], { delay: 1.4 + i * 0.1, flat: true }));
    return hiker.at(0, 0.6, 0);
  });

  // Brina, looking back over her shoulder.
  const FACE = 0.35;
  const guide = figure(kit, {
    x: 0.45,
    z: 0.4,
    y: G,
    facing: FACE,
    height: 2.4,
    skin: 0xe0b8a0,
    hair: { style: "short", color: 0xe8e8f0 },
    face: { mouth: "frown", brows: "angry", eyes: 0x3a4a6a },
    top: { kind: "coat", color: 0x6a7a90, accent: 0x4a5668 },
    bottom: { kind: "trousers", color: 0x3a4050 },
    shoes: 0x2a2a30,
    gloves: 0x2a2a34,
    belt: 0x2a2a30,
    scarf: 0xc83a7a,
    arms: [
      [-0.48, 1.22, 0.36],
      [0.5, 2.1, 0.3],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const o = (delay: number, roll = 0): { delay: number; rotation: [number, number, number] } => ({ delay, rotation: [0, FACE, roll] });
  // Her fur-lined hood down on her back, the coil of rope at her side.
  add(new SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xc83a7a, ...guide.at(0, 1.62, -0.22), { delay: 1.25, rotation: [-0.6, FACE, 0] });
  add(new TorusGeometry(0.3, 0.06, 8, 24).rotateY(Math.PI / 2), ROPE, ...guide.at(-0.55, 0.95, -0.02), o(1.3, 0.2));
  add(new TorusGeometry(0.26, 0.05, 8, 24).rotateY(Math.PI / 2), ROPE, ...guide.at(-0.58, 1.0, 0.04), o(1.32, 0.35));
  // A few tousled locks, the rope from her coil to the party.
  [-0.12, 0, 0.12].forEach((lx, i) => add(new ConeGeometry(0.045, 0.13, 5), 0xe8e8f0, ...guide.at(lx, 2.32, 0.15), { delay: 1.28 + i * 0.02, rotation: [1.45, FACE, lx * 2] }));
  cable(kit, [guide.at(-0.55, 1.05, -0.1), [-0.45, G + 0.55, 0.15], hikers[0]], 0.022, ROPE, 1.6);
  cable(kit, [hikers[0], [-0.95, G + 0.7, -0.5], hikers[1]], 0.02, ROPE, 1.65);
  cable(kit, [hikers[1], [-1.4, G + 1.0, -0.5], hikers[2]], 0.02, ROPE, 1.7);
  // The stick in her right fist.
  const [stickHand, lampHand] = guide.hands;
  const foot = guide.at(-0.58, 0, 0.66);
  const tip: Point = [foot[0] + (stickHand[0] - foot[0]) * 1.2, foot[1] + (stickHand[1] - foot[1]) * 1.2, foot[2] + (stickHand[2] - foot[2]) * 1.2];
  limb(kit, foot, tip, 0.028, 0.022, 0x23222b, { delay: 1.4 });

  // The oil lantern, held high, swinging from her left hand.
  const pivot = new Group();
  pivot.position.set(...lampHand);
  const lamp = [
    add(new TorusGeometry(0.07, 0.012, 6, 14), 0x23222b, lampHand[0], lampHand[1] - 0.16, lampHand[2], o(1.45)),
    add(new ConeGeometry(0.12, 0.1, 8), 0x23222b, lampHand[0], lampHand[1] - 0.24, lampHand[2], { delay: 1.47 }),
    add(new CylinderGeometry(0.09, 0.09, 0.2, 8), 0xffb040, lampHand[0], lampHand[1] - 0.45, lampHand[2], { delay: 1.5, flat: true }),
    cylinder(0.12, 0.12, 0.04, 0x23222b, lampHand[0], lampHand[1] - 0.49, lampHand[2], { delay: 1.52 }),
  ];
  decorate(lamp[2], new BoxGeometry(0.02, 0.2, 0.2), 0x23222b, [[0, 0.1, 0]]);
  decorate(lamp[2], new BoxGeometry(0.2, 0.2, 0.02), 0x23222b, [[0, 0.1, 0]]);
  lamp[0].parent?.add(pivot);
  lamp.forEach((part) => {
    part.position.sub(pivot.position);
    pivot.add(part);
  });

  const cool = new Color(0xc8401a);
  const hot = new Color(YELLOW);
  tick((t) => {
    const wave = (t * 1.2) % 1;
    lava.forEach((piece, i) => colorOf(piece).lerpColors(cool, hot, Math.max(0, 1 - Math.abs(((i / lava.length - wave + 1) % 1) - 0.5) * 3)));
    colorOf(crater).lerpColors(cool, hot, (Math.sin(t * 2) + 1) / 2);
    pivot.rotation.z = Math.sin(t * 1.6) * 0.12;
    pivot.rotation.x = Math.sin(t * 1.1) * 0.06;
    lights.forEach((light, i) => (light.visible = Math.floor(t * 4 + i * 1.7) % 9 !== 4));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
