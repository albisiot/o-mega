import { BoxGeometry, CylinderGeometry, type Group } from "three";
import { MAGENTA, ORANGE, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure, type FigureSpec } from "@/lib/diorama-figure";
import { flame, floor } from "@/lib/diorama-props";

/**
 * Wirepuller (P132): the old puppeteer of the Figli dell'Ultima looms over his little puppet
 * theatre, top hat and black cloak, his wooden fingers hanging over the curtains; threads of
 * light run down to three living puppets (a policeman, a shopper, a caped hero) and now and then
 * he tugs one up. The price: the seats in front are empty but for his script, and one of his
 * brittle wooden fingers has snapped off on the boards.
 */
export function wirepuller(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WOOD = 0xc8935e;
  const JOINT = 0x8a5a34;
  const VELVET = 0x8e1840;
  const GOLD = 0xc9a040;
  const F = octagonBase(kit, 0x221a26);
  const G = floor(kit, F, 0.06, 0x2e2230, 0x1e1620, 0.35);

  // The theatre: a low stage with gilt trim, red curtains, a valance, a backdrop of the volcano.
  const SX = 0.1;
  const SZ = 0.45;
  const S = G + 0.32;
  const stage = box(2.6, 0.32, 1.3, 0x2a1c22, SX, G, SZ, { delay: 0.1 });
  decorate(stage, new BoxGeometry(2.6, 0.035, 0.01), GOLD, [
    [0, 0.27, 0.655],
    [0, 0.05, 0.655],
  ]);
  const boards = box(2.6, 0.02, 1.3, 0x4a3030, SX, S, SZ, { delay: 0.14, noInk: true });
  decorate(boards, new BoxGeometry(2.6, 0.004, 0.012), 0x2e1e20, [-0.4, -0.13, 0.14, 0.41].map((z) => [0, 0.021, z] as Point));
  const backdrop = box(2.2, 1.3, 0.05, 0x1f2e4e, SX, S, SZ - 0.6, { delay: 0.2 });
  decorate(backdrop, new CylinderGeometry(0.08, 0.6, 0.62, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.03), 0x3a2a48, [[0.3, 0.62, 0.03]]);
  decorate(backdrop, new BoxGeometry(0.14, 0.04, 0.01), ORANGE, [[0.3, 0.92, 0.05]]);
  decorate(backdrop, new BoxGeometry(0.16, 0.24, 0.01), 0x2a2238, [-0.9, -0.7, -0.5, -0.25, 0.7, 0.9].map((x, i) => [x, 0.12 + (i % 2) * 0.05, 0.03] as Point));
  [-1, 1].forEach((side, i) => {
    const curtain = add(new CylinderGeometry(0.2, 0.3, 1.5, 10).scale(1, 1, 0.5), VELVET, SX + side * 1.12, S, SZ - 0.45, { delay: 0.25 + i * 0.03 });
    decorate(curtain, new BoxGeometry(0.02, 1.3, 0.01), 0x5a0e28, [-0.12, 0, 0.12].map((x) => [x, 0.7, 0.14] as Point));
    cylinder(0.05, 0.05, 0.08, GOLD, SX + side * 1.12, S + 0.55, SZ - 0.32, { delay: 0.3 }, 8);
  });
  const valance = box(2.6, 0.24, 0.12, VELVET, SX, S + 1.45, SZ - 0.45, { delay: 0.34 });
  decorate(valance, new BoxGeometry(2.6, 0.04, 0.01), GOLD, [[0, 0.03, 0.065]]);
  // Footlights in brass shells along the front edge.
  const flames: Group[] = [];
  [-0.95, -0.3, 0.5, 1.15].forEach((x, i) => {
    cylinder(0.09, 0.05, 0.06, GOLD, SX + x, S, SZ + 0.55, { delay: 0.4 + i * 0.03 }, 10);
    flames.push(...flame(kit, SX + x, SZ + 0.55, S + 0.05, 0.45 + i * 0.03, 0.35));
  });

  // Wirepuller behind it all: gaunt, pale eyes lit, arms out over the valance.
  const puppeteer = figure(kit, {
    x: SX,
    z: -1.05,
    y: G,
    facing: 0.15,
    height: 3.3,
    build: "slim",
    skin: 0xdcc4ac,
    hair: { style: "wild", color: 0xd8d8e2 },
    face: { mouth: "smirk", brows: "angry", eyes: 0x9fefff, glow: true, marks: 0x9a7a6a },
    headwear: { kind: "tophat", color: 0x1a1822, accent: 0x5a1830 },
    top: { kind: "coat", color: 0x2a2436, accent: 0xb8b0c0 },
    cape: 0x3a2440,
    gloves: WOOD,
    arms: [
      [-0.55, 2.58, 1.12],
      [0.55, 2.58, 1.12],
    ],
    delay: 0.6,
  });

  // His wooden fingers, jointed in brass, hanging down; the threads hang from their tips.
  const tips: Point[] = [];
  [-0.55, 0.55].forEach((hx, h) =>
    [-0.1, -0.035, 0.035, 0.1].forEach((dx, k) => {
      const knuckle = puppeteer.at(hx + dx, 2.54, 1.17);
      const middle = puppeteer.at(hx + dx * 1.3, 2.42, 1.28);
      const tip = puppeteer.at(hx + dx * 1.4, 2.25, 1.26);
      const o = { delay: 1.1 + h * 0.05 + k * 0.02 };
      limb(kit, knuckle, middle, 0.03, 0.027, WOOD, o);
      ball(0.034, JOINT, middle[0], middle[1] - 0.034, middle[2], o);
      limb(kit, middle, tip, 0.027, 0.022, WOOD, o);
      tips.push(tip);
    }),
  );

  // Three puppets on the boards, all on threads.
  const puppet = (x: number, facing: number, delay: number, look: Omit<FigureSpec, "x" | "z" | "y">): Figure =>
    figure(kit, { x, z: SZ + 0.1, y: S + 0.05, facing, height: 0.85, ...look, delay });
  const cop = puppet(SX - 0.72, 0.3, 0.8, {
    skin: 0xe0b08f,
    face: { mouth: "open", brows: "raised" },
    headwear: { kind: "cap", color: 0x1f2a4a, accent: 0x14182a },
    top: { kind: "uniform", color: 0x1f2a4a, accent: 0xc9a040 },
    bottom: { kind: "trousers", color: 0x1a2238 },
    arms: [[-0.28, 0.72, 0.1], "out"],
    legs: "stride",
  });
  const shopper = puppet(SX + 0.05, 0.1, 0.85, {
    skin: 0xe8bfa0,
    hair: { style: "long", color: 0x3a2020 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "coat", color: 0xb08a5a, accent: 0x7a2f55 },
    bottom: { kind: "skirt", color: 0x7a2f55 },
    arms: [[-0.26, 0.42, 0.08], [0.3, 0.6, 0.1]],
  });
  const hero = puppet(SX + 0.82, -0.2, 0.9, {
    skin: 0xd8a888,
    hair: { style: "short", color: 0x1f1b22 },
    face: { mouth: "grin", mask: "eyes", maskColor: 0x14121c },
    top: { kind: "suit", color: 0x2a3a7a, accent: 0x2a3a7a, tie: 0x2a3a7a },
    bottom: { kind: "trousers", color: 0x22305e },
    cape: MAGENTA,
    belt: 0xc9a040,
    arms: ["out", [0.26, 0.7, 0.12]],
    legs: "wide",
  });
  [shopper.hands[0], shopper.hands[1]].forEach((hand, i) => box(0.1, 0.12, 0.05, i ? MAGENTA : 0x23404b, hand[0], hand[1] - 0.15, hand[2], { delay: 1.2 }));

  // The threads: fingertip to a puppet's head or hand.
  const anchors: [Figure, Point][] = [
    [cop, [cop.head[0], cop.top, cop.head[2]]],
    [cop, cop.hands[0]],
    [cop, cop.hands[1]],
    [shopper, [shopper.head[0], shopper.top, shopper.head[2]]],
    [shopper, shopper.hands[1]],
    [hero, [hero.head[0], hero.top, hero.head[2]]],
    [hero, hero.hands[0]],
    [hero, hero.hands[1]],
  ];
  const threads = anchors.map(([, to], i) => {
    const thread = limb(kit, tips[i], to, 0.009, 0.009, 0x9fefff, { delay: 1.4 + i * 0.03, flat: true, noInk: true });
    return { thread, length: aim(tips[i], to).length };
  });

  // What it costs: an empty audience row, the script on a seat, a snapped finger on the boards.
  [-1.55, -1.05].forEach((x, i) => {
    box(0.42, 0.16, 0.4, VELVET, x, G + 0.12, 1.5, { delay: 0.5 + i * 0.04 });
    box(0.42, 0.3, 0.08, VELVET, x, G + 0.12, 1.74, { delay: 0.52 + i * 0.04 });
    [-0.16, 0.16].forEach((dx) => box(0.04, 0.12, 0.3, GOLD, x + dx, G, 1.55, { delay: 0.5, noInk: true }));
  });
  const script = box(0.24, 0.06, 0.3, 0xe8e2d0, -1.05, G + 0.28, 1.47, { delay: 0.7, rotation: [0, 0.4, 0] });
  decorate(script, new BoxGeometry(0.23, 0.02, 0.03), MAGENTA, [[0, 0.04, -0.1]]);
  limb(kit, [SX - 0.35, S + 0.04, SZ + 0.42], [SX - 0.15, S + 0.03, SZ + 0.5], 0.024, 0.02, WOOD, { delay: 1.3 });

  // Now and then he tugs a puppet up by its threads; the footlights flicker.
  const puppets = [cop, shopper, hero];
  const rests = puppets.map((p) => p.parts.map((part) => part.position.y));
  tick((t) => {
    const beat = t / 1.6;
    const which = Math.floor(beat) % 3;
    const u = beat % 1;
    const lifts = puppets.map((_, k) => (k === which && u < 0.6 ? Math.sin((u / 0.6) * Math.PI) * 0.18 : 0));
    puppets.forEach((p, k) => p.parts.forEach((part, i) => (part.position.y = rests[k][i] + lifts[k])));
    anchors.forEach(([owner, to], i) => {
      const lift = lifts[puppets.indexOf(owner)];
      const { length, rotation } = aim(tips[i], [to[0], to[1] + lift, to[2]]);
      threads[i].thread.rotation.set(...rotation);
      threads[i].thread.children[0].scale.y = length / threads[i].length;
    });
    flames.forEach((part, i) => (part.children[0].scale.y = 1 + Math.sin(t * 9 + i * 1.7) * 0.15));
  });

  return { width: 4.9, height: 4.6, lookY: 1.85 };
}
