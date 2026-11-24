import { BoxGeometry, Color, TorusGeometry, type Group } from "three";
import { MAGENTA, YELLOW, colorOf, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, lamp, puddle, steps } from "@/lib/diorama-props";

/**
 * Vigil (P012): the volunteer of the Lanterne in a blacked-out street of tenements: every window
 * dark, the street lamp dead, the outside stair lit only by her lantern. Hood up, magenta scarf,
 * patched parka, she holds the lantern high and knocks at a door with a bag of candles at her
 * feet; after the knocks, a window lights up above.
 */
export function vigil(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const DARK_WINDOW = 0x141a26;
  const STONE = 0x464a62;
  const F = octagonBase(kit, 0x1c1e2a);
  const G = floor(kit, F, 0.06, 0x2a2c3c, 0x1c1e2a, 0.45);

  // The tenement: a dark front, a door, and the outside stair climbing to the left.
  const house = facade(kit, 0, -1.3, G, 0.1, { width: 3.3, height: 2.9, color: 0x2c3046, windows: 4, floors: 3, lit: DARK_WINDOW });
  decorate(house, new BoxGeometry(0.48, 1.62, 0.01), 0x1a1c28, [[0.825, 0.81, 0.152]]);
  decorate(house, new BoxGeometry(0.4, 1.54, 0.01), 0x5a2a3a, [[0.825, 0.77, 0.158]]);
  decorate(house, new BoxGeometry(0.05, 0.05, 0.02), YELLOW, [[0.69, 0.8, 0.165]]);
  const answered = box(0.16, 0.24, 0.02, YELLOW, 1.24, G + 1.43, -1.14, { delay: 0.4, flat: true, noInk: true });
  steps(kit, -0.35, -0.8, G, 0.2, { width: 0.6, count: 6, color: STONE, facing: Math.PI / 2 });
  // Its iron rail: posts on every step and the sloping bar.
  for (let k = 0; k < 6; k++) box(0.025, 0.55, 0.025, 0x16171e, -0.49 - k * 0.28, G + 0.16 * (k + 1), -0.53, { delay: 0.35 + k * 0.02, noInk: true });
  limb(kit, [-0.4, G + 0.7, -0.53], [-1.95, G + 1.58, -0.53], 0.018, 0.018, 0x16171e, { delay: 0.5, noInk: true });

  // The dead street lamp, a bin, a puddle with the lantern in it.
  puddle(kit, 0.55, 0.95, G, 0.5, 0.42, YELLOW);
  lamp(kit, 1.45, 0.25, G, 0.3, 2.3, 0x2a2c3a);
  box(0.36, 0.5, 0.36, 0x2f4f50, -1.5, G, 0.65, { delay: 0.4 });

  // Vigil: hood up over dark curls, freckles, the magenta scarf, patches on her parka.
  const X = 0.35;
  const Z = -0.6;
  const FACE = 0.3;
  const girl = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: FACE,
    height: 2.3,
    build: "slim",
    skin: 0xd8a888,
    face: { mouth: "neutral", brows: "calm", marks: 0xb07050 },
    headwear: { kind: "hood", color: 0x2a4a5e },
    top: { kind: "coat", color: 0x2a4a5e, accent: 0x223c4e },
    bottom: { kind: "trousers", color: 0x1e2230 },
    shoes: 0x2a1e1a,
    scarf: 0xb02a5a,
    arms: [[-0.4, 2.45, 0.2], [0.55, 1.45, -0.3]],
    delay: 0.8,
  });
  const u = 2.3 / 2.4;
  [-0.1, 0, 0.1].forEach((dx, i) => kit.ball(0.06 * u, 0x2a1e1a, ...girl.at(dx * u, 2.28 * u, 0.15 * u), { delay: 1.3 + i * 0.02 }));
  [
    [0.12, 1.35, 0xc8a070],
    [-0.1, 1.0, MAGENTA],
  ].forEach(([dx, y, color], i) => box(0.12, 0.12, 0.02, color, ...girl.at(dx, y * u, 0.25), { delay: 1.35 + i * 0.03, rotation: [0, FACE, 0.2] }));
  // Her knocks on the door.
  const [hand, fist] = girl.hands;
  const knocks = [0, 1, 2].map((k) => {
    const a = -0.8 + k * 0.8;
    const at: Point = [fist[0] + 0.08, fist[1] + 0.05, -1.12];
    return zigzag(kit, [at, [at[0] + Math.sin(a) * 0.18, at[1] + Math.cos(a) * 0.18, at[2] + 0.04]], 0.025, YELLOW, 1.5 + k * 0.03)[0];
  });

  // The lantern up in her right hand, lighting the stair.
  const lantern: Group[] = [
    add(new TorusGeometry(0.07, 0.012, 6, 14), 0x23222b, hand[0], hand[1] - 0.1, hand[2], { delay: 1.5, rotation: [0, 0.3, 0] }),
    cylinder(0.1, 0.13, 0.06, 0x23222b, hand[0], hand[1] - 0.16, hand[2], { delay: 1.52 }, 10),
    cylinder(0.1, 0.1, 0.22, 0xffe08a, hand[0], hand[1] - 0.38, hand[2], { delay: 1.55, flat: true }, 10),
    cylinder(0.13, 0.13, 0.05, 0x23222b, hand[0], hand[1] - 0.43, hand[2], { delay: 1.58 }, 10),
  ];
  decorate(lantern[2], new BoxGeometry(0.02, 0.22, 0.02), 0x23222b, [
    [0.1, 0.11, 0],
    [-0.1, 0.11, 0],
    [0, 0.11, 0.1],
  ]);
  motes(8, YELLOW, 0.02, [hand[0] - 0.3, hand[1] - 0.6, hand[2] - 0.3], [hand[0] + 0.3, hand[1] + 0.3, hand[2] + 0.3], 1.6);
  // A pool of warm light on the ground under it.
  cylinder(0.75, 0.75, 0.004, 0x5a4a2a, X - 0.15, G + 0.002, Z + 0.25, { delay: 1.4, flat: true, noInk: true }, 20);

  // Her bag of candles at her feet.
  const bag = box(0.34, 0.3, 0.2, 0xc8b490, -0.35, G, 0.05, { delay: 1.2, rotation: [0, -0.3, 0] });
  decorate(bag, new BoxGeometry(0.34, 0.03, 0.01), MAGENTA, [[0, 0.2, 0.101]]);
  [-0.08, 0, 0.08].forEach((dx, i) => cylinder(0.03, 0.03, 0.22, 0xf4f0e6, -0.35 + dx, G + 0.2, 0.05 + (i - 1) * 0.02, { delay: 1.25 + i * 0.02 }, 8));

  const warm = new Color(0xffe08a);
  const hot = new Color(YELLOW);
  tick((t) => {
    // Three knocks, a pause, then the window above the door lights up for a while.
    const u2 = (t / 4) % 1;
    knocks.forEach((knock) => (knock.visible = u2 < 0.3 && Math.floor(t * 8) % 2 === 0));
    answered.visible = u2 > 0.45 && u2 < 0.95;
    colorOf(lantern[2]).lerpColors(warm, hot, (Math.sin(t * 6) + 1) / 2);
    lantern.forEach((part) => (part.rotation.z = Math.sin(t * 1.3) * 0.04));
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
