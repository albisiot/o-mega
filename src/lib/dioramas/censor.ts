import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { car, column, facade, floor } from "@/lib/diorama-props";

/**
 * Censor (P094): the traffic robot of the Custodi stands on his striped podium on the zebra
 * crossing of the piazza, white helmet on his traffic-light head, one white glove raised to stop
 * the world while the other writes a fine. The superhero who landed on the crossing waits for it,
 * caped and ashamed; a fine already sits under the wiper of a car behind, and the lights in his
 * face go red, green and amber.
 */
export function censor(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const NAVY = 0x1e3348;
  const WHITE = 0xe8e2d0;
  const SLIP = 0xf4f0e6;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2a2c36, 0x22242c, 0);

  // The piazza: a palazzo, the column, cars waiting with their lights on, the zebra crossing.
  facade(kit, 0.2, -1.75, G, 0.1, { width: 2.6, height: 2.6, color: 0x3a2f4e, windows: 4, floors: 3, depth: 0.2 });
  column(kit, -1.55, -0.95, G, 0.2, 3.0, false, 0x6d7f9a);
  const [body] = car(kit, 0.75, -1.2, G, 0.3, 0x3a4a7a, 0);
  decorate(body, new BoxGeometry(0.01, 0.07, 0.12), YELLOW, [
    [0.655, 0.2, 0.2],
    [0.655, 0.2, -0.2],
  ]);
  decorate(body, new BoxGeometry(0.01, 0.06, 0.12), MAGENTA, [
    [-0.655, 0.2, 0.2],
    [-0.655, 0.2, -0.2],
  ]);
  // A fine under its wiper.
  box(0.1, 0.012, 0.14, SLIP, 1.02, G + 0.55, -1.2, { delay: 0.6, rotation: [0, 0, -0.5] });
  for (let k = 0; k < 6; k++) box(0.24, 0.012, 1.3, 0xd8d4c8, -1.35 + k * 0.42, G, 0.25, { delay: 0.2 + k * 0.03, flat: true, noInk: true });

  // His podium, striped like a barber's pole.
  const podium = cylinder(0.36, 0.4, 0.32, WHITE, 0.4, G, 0.0, { delay: 0.4 }, 18);
  decorate(podium, new TorusGeometry(0.385, 0.035, 6, 24).rotateX(Math.PI / 2), 0x2a6fb0, [
    [0, 0.08, 0],
    [0, 0.22, 0],
  ]);
  const P = G + 0.32;

  // Censor: a traffic warden's uniform, white gloves and cuffs, a white belt and a whistle.
  const FACE = 0.2;
  const robot = figure(kit, {
    x: 0.4,
    z: 0.0,
    y: P,
    facing: FACE,
    height: 2.35,
    build: "broad",
    skin: 0x3a4a52,
    hair: { style: "bald", color: 0x3a4a52 },
    face: { blank: true },
    top: { kind: "uniform", color: NAVY, accent: WHITE },
    bottom: { kind: "trousers", color: NAVY },
    shoes: 0x14121c,
    belt: WHITE,
    gloves: WHITE,
    arms: [[-0.3, 1.3, 0.42], "wave"],
    delay: 0.8,
  });
  const turn: Point = [0, FACE, 0];
  const u = 2.35 / 2.4;
  // White cuffs over the forearms, as the wardens wear them.
  ([[-0.3, 1.3, 0.42], [0.5 * u + 0.4 * u, 1.72 * u + 0.56 * u, 0.1 * u]] as Point[]).forEach((hand, i) => {
    const side = i ? 1 : -1;
    const shoulder: Point = [side * 0.5 * u, 1.72 * u, 0];
    const elbow: Point =
      i === 0
        ? [(shoulder[0] + hand[0]) / 2 + side * 0.14 * u, (shoulder[1] + hand[1]) / 2 - 0.1 * u, (shoulder[2] + hand[2]) / 2 - 0.04 * u]
        : [side * (0.5 + 0.32) * u, (1.72 + 0.1) * u, 0.04];
    const from = robot.at(...([0, 1, 2].map((k) => elbow[k] + (hand[k] - elbow[k]) * 0.3) as Point));
    limb(kit, from, robot.at(...([0, 1, 2].map((k) => elbow[k] + (hand[k] - elbow[k]) * 0.88) as Point)), 0.16, 0.13, WHITE, { delay: 1.1 + i * 0.03 });
  });
  // The raised hand: an open white glove, palm out.
  const [penHand, stopHand] = robot.hands;
  const palm = box(0.2, 0.26, 0.06, WHITE, stopHand[0], stopHand[1] - 0.05, stopHand[2], { delay: 1.2, rotation: turn });
  decorate(palm, new BoxGeometry(0.035, 0.12, 0.05), WHITE, [-0.07, -0.025, 0.02, 0.07].map((x) => [x, 0.3, 0] as Point));
  // The notepad and the pen.
  const pad = box(0.22, 0.03, 0.28, SLIP, penHand[0] + 0.04, penHand[1] - 0.1, penHand[2] + 0.05, { delay: 1.2, rotation: [0.5, FACE, 0] });
  decorate(pad, new BoxGeometry(0.16, 0.005, 0.01), 0x8a93a3, [
    [0, 0.032, -0.05],
    [0, 0.032, 0.0],
    [0, 0.032, 0.05],
  ]);
  box(0.02, 0.2, 0.02, MAGENTA, penHand[0] + 0.12, penHand[1] - 0.06, penHand[2] + 0.12, { delay: 1.25, rotation: [0.6, 0, -0.5] });
  // The whistle on its cord.
  const chest = robot.at(0.12, 1.42, 0.3);
  limb(kit, robot.at(-0.12, 1.7, 0.22), chest, 0.01, 0.01, WHITE, { delay: 1.3, noInk: true });
  add(new CylinderGeometry(0.035, 0.035, 0.1, 10).rotateZ(Math.PI / 2), 0xc8ccd4, chest[0], chest[1] - 0.06, chest[2], { delay: 1.32, rotation: turn });

  // The head: a traffic light under a white helmet, a speaker at each side.
  const [hx, hy, hz] = robot.head;
  const lamp = box(0.34, 0.66, 0.3, 0x2f5a52, hx, hy - 0.3, hz, { delay: 1.3, rotation: turn });
  const lamps = [0.53, 0.33, 0.13].map((y, i) => {
    const at = robot.at(0, hy - P - 0.3 + y, 0.16);
    const glass = add(new CylinderGeometry(0.09, 0.09, 0.03, 16).rotateX(Math.PI / 2), 0x3a1020, at[0], at[1] - 0.09, at[2], { delay: 1.36 + i * 0.03, rotation: turn, flat: true });
    const hood = robot.at(0, hy - P - 0.3 + y, 0.2);
    add(new CylinderGeometry(0.1, 0.1, 0.08, 12, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).scale(1, 1, 0.6), 0x14121c, hood[0], hood[1], hood[2], { delay: 1.4 + i * 0.03, rotation: turn });
    return glass;
  });
  void lamp;
  [-1, 1].forEach((side) => {
    const ear = robot.at(side * 0.19, hy - P + 0.05, 0);
    add(new CylinderGeometry(0.08, 0.08, 0.05, 14).rotateZ(Math.PI / 2), 0x8a93a3, ear[0], ear[1] - 0.08, ear[2], { delay: 1.42, rotation: turn });
  });
  const crown = robot.at(0, hy - P + 0.36, 0);
  add(new SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1), WHITE, crown[0], crown[1], crown[2], { delay: 1.45, rotation: turn });
  cylinder(0.36, 0.36, 0.03, WHITE, crown[0], crown[1] - 0.02, crown[2], { delay: 1.47, rotation: turn }, 20);
  ball(0.04, WHITE, crown[0], crown[1] + 0.2, crown[2], { delay: 1.5 });

  // The superhero who landed on the crossing, cape and all, holding his fine.
  const hero = figure(kit, {
    x: -0.95,
    z: 0.75,
    y: G,
    facing: 1.0,
    height: 2.35,
    build: "broad",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x2a1e1c },
    face: { mouth: "frown", brows: "worried", mask: "eyes", maskColor: 0x14121c },
    top: { kind: "shirt", color: 0x2a7fc0 },
    bottom: { kind: "trousers", color: 0x2a7fc0 },
    shoes: MAGENTA,
    belt: 0x14121c,
    cape: MAGENTA,
    gloves: MAGENTA,
    arms: [[-0.12, 1.45, 0.38], [0.2, 2.12, -0.12]],
    delay: 0.6,
  });
  const [slipHand] = hero.hands;
  const fine = box(0.12, 0.18, 0.01, SLIP, slipHand[0], slipHand[1] - 0.02, slipHand[2] + 0.05, { delay: 1.6, rotation: [0, 1.0, 0.1] });
  decorate(fine, new BoxGeometry(0.08, 0.008, 0.005), 0x8a93a3, [
    [0, 0.13, 0.006],
    [0, 0.1, 0.006],
  ]);
  decorate(hero.parts[7], new BoxGeometry(0.2, 0.16, 0.02), CYAN, [[0, 0.45, 0.33]]);

  // A fresh fine fluttering down from the pad.
  const falling = box(0.1, 0.012, 0.14, SLIP, penHand[0], penHand[1] - 0.2, penHand[2] + 0.2, { delay: 1.7 });
  const lit = [MAGENTA, YELLOW, 0x20d0a0];
  const dim = [0x7a2a40, 0x7a6a2a, 0x1f6a55];
  tick((t) => {
    // Red, then green, then amber, and red again: red is on when he opens.
    const phase = Math.floor(t / 1.4) % 3;
    const on = phase === 0 ? 0 : phase === 1 ? 2 : 1;
    lamps.forEach((glass, i) => colorOf(glass).set(i === on ? lit[i] : dim[i]));
    palm.rotation.z = Math.sin(t * 2.2) * 0.06;
    const u2 = (t * 0.35) % 1;
    falling.position.set(penHand[0] - u2 * 0.4, penHand[1] - 0.2 - u2 * (penHand[1] - 0.2 - G), penHand[2] + 0.2 + u2 * 0.3);
    falling.rotation.set(Math.sin(t * 5) * 0.6, t * 2, Math.cos(t * 4) * 0.5);
    falling.visible = u2 < 0.96;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
