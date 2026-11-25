import { BoxGeometry, ConeGeometry, Group, TorusGeometry } from "three";
import { MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, lamp, puddle } from "@/lib/diorama-props";

/**
 * Insula (P223): the last tenant of an emptied council block, back from the shops, stands in the
 * wet street with his two paper bags, in hat and long grey coat. Every window of the tower behind
 * him is dark or boarded but one, high up, lit, with a geranium on its little balcony; the street
 * lamp is dead, a demolition crane's wrecking ball sways beside the block, waiting for him to go.
 * He can't fight it, and he won't.
 */
export function insula(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BLOCK = 0x3a3c4a;
  const COAT = 0x4a4c56;
  const PAPER = 0xc8b48e;
  const STEEL = 0x4a4f5c;
  const F = octagonBase(kit, 0x1c1c24);
  const G = floor(kit, F, 0.06, 0x2a2c36, 0x1e2028, 0.55);

  // The block: all windows dark, a few boarded up; one lit, with a balcony and a geranium.
  const WX = -0.3;
  const WZ = -1.25;
  const W = 3.0;
  const wall = facade(kit, WX, WZ, G, 0.1, { width: W, height: 3.5, color: BLOCK, windows: 5, floors: 4, door: true, lit: 0x141a26, shutters: 0x2a3040 });
  const front = 0.155;
  const col = (c: number) => -W / 2 + (W / 5) * (c + 0.5);
  const row = (f: number) => 0.75 + f * (3.0 / 4);
  decorate(wall, new BoxGeometry(0.24, 0.035, 0.01), 0x5e4a3a, [
    [col(0), row(1), front + 0.01, 0.6],
    [col(0), row(1), front + 0.012, -0.6],
    [col(3), row(0), front + 0.01, 0.6],
    [col(3), row(0), front + 0.012, -0.6],
    [col(1), row(3), front + 0.01, 0.6],
    [col(1), row(3), front + 0.012, -0.6],
  ]);
  decorate(wall, new BoxGeometry(0.3, 0.38, 0.01), 0x14121c, [[col(3), row(2), front + 0.006]]);
  const home = decorate(wall, new BoxGeometry(0.24, 0.32, 0.01), YELLOW, [[col(3), row(2), front + 0.009]]);
  decorate(wall, new BoxGeometry(0.02, 0.32, 0.01), 0x8a5a2a, [[col(3), row(2), front + 0.012]]);
  box(0.6, 0.05, 0.26, 0x2e3040, WX + col(3), G + row(2) - 0.24, WZ + 0.28, { delay: 0.4 });
  box(0.6, 0.16, 0.02, 0x14121c, WX + col(3), G + row(2) - 0.19, WZ + 0.4, { delay: 0.42, noInk: true });
  cylinder(0.08, 0.06, 0.14, 0xb0603a, WX + col(3) - 0.2, G + row(2) - 0.19, WZ + 0.3, { delay: 0.45 }, 10);
  ball(0.11, 0x2f8f4f, WX + col(3) - 0.2, G + row(2) - 0.08, WZ + 0.3, { delay: 0.48 });
  const bloom = ball(0.055, MAGENTA, WX + col(3) - 0.16, G + row(2) + 0.08, WZ + 0.38, { delay: 0.5 });

  // The demolition crane on the right: a crawler with a lattice boom, its ball hanging by the block.
  const CX = 1.5;
  const CZ = 0.3;
  const tip: Point = [0.95, G + 3.55, -0.75];
  const yaw = Math.atan2(tip[0] - CX, tip[2] - CZ);
  const head = [Math.sin(yaw), Math.cos(yaw)];
  const side = [Math.cos(yaw), -Math.sin(yaw)];
  const turn: Point = [0, yaw, 0];
  [-1, 1].forEach((s) => box(0.22, 0.24, 1.0, 0x1e1e26, CX + side[0] * s * 0.3, G, CZ + side[1] * s * 0.3, { delay: 0.18, rotation: turn }));
  box(0.64, 0.3, 0.86, 0x2e3240, CX, G + 0.24, CZ, { delay: 0.2, rotation: turn });
  box(0.6, 0.28, 0.24, 0x23262e, CX - head[0] * 0.34, G + 0.54, CZ - head[1] * 0.34, { delay: 0.22, rotation: turn });
  const cab = box(0.28, 0.42, 0.36, 0x3a4050, CX - side[0] * 0.17, G + 0.54, CZ - side[1] * 0.17, { delay: 0.24, rotation: turn });
  decorate(cab, new BoxGeometry(0.01, 0.2, 0.26), 0x16303e, [
    [0.141, 0.26, 0],
    [-0.141, 0.26, 0],
  ]);
  const foot: Point = [CX + head[0] * 0.25, G + 0.6, CZ + head[1] * 0.25];
  const boom = aim(foot, tip);
  const lattice = box(0.13, boom.length, 0.13, STEEL, ...foot, { delay: 0.3, rotation: boom.rotation });
  const braces = Array.from({ length: 9 }, (_, k) => [0, 0.2 + k * 0.38, 0, k % 2 ? 0.7 : -0.7] as [number, number, number, number]);
  decorate(lattice, new BoxGeometry(0.012, 0.18, 0.14), 0x14121c, braces);
  limb(kit, [CX - head[0] * 0.3, G + 0.82, CZ - head[1] * 0.3], tip, 0.01, 0.01, 0x14121c, { delay: 0.35, noInk: true });
  // The ball hangs from a pivot at the boom's tip, to sway.
  const swing = new Group();
  swing.position.set(...tip);
  const chain = box(0.025, 1.4, 0.025, 0x8a8f9c, 0, -1.4, 0, { delay: 0.5, noInk: true });
  const wreck = ball(0.26, 0x2a2a32, 0, -1.9, 0, { delay: 0.55 });
  chain.parent?.add(swing);
  swing.add(chain, wreck);

  // The street: a dead street lamp, puddles catching the one lit window.
  const dead = lamp(kit, -1.6, 0.45, G, 0.3, 2.3, 0x3a3a44);
  puddle(kit, 0.55, 1.15, G, 0.4, 0.45, YELLOW);
  puddle(kit, -1.0, 1.3, G, 0.42, 0.3, 0x16c8ff);
  void dead;

  // Insula: an old man in hat and long coat, a paper bag in each hand.
  const FACE = 0.4;
  const man = figure(kit, {
    x: -0.1,
    z: 0.45,
    y: G,
    facing: FACE,
    height: 2.45,
    skin: 0xdcb8a0,
    hair: { style: "short", color: 0xc8c8d0 },
    face: { mouth: "frown", brows: "calm", marks: 0xb08a78 },
    headwear: { kind: "hat", color: 0x34343c, accent: 0x22222a },
    top: { kind: "coat", color: COAT, accent: 0xe8e4da },
    bottom: { kind: "trousers", color: 0x34363e },
    shoes: 0x1a1818,
    arms: ["down", "down"],
    delay: 0.8,
  });
  const at = man.at;
  // His tie, and the coat's collar turned up.
  man.parts.push(box(0.05, 0.3, 0.02, 0x1a1a22, ...at(0, 1.47, 0.27), { delay: 1.15, rotation: [0.08, FACE, 0], noInk: true }));
  [-1, 1].forEach((side) => man.parts.push(box(0.14, 0.16, 0.05, COAT, ...at(side * 0.11, 1.68, 0.2), { delay: 1.2, rotation: [-0.2, FACE, side * 0.35] })));

  // The bags hang from his fists on pivots; a leek pokes out of one.
  const bags = man.hands.map((hand, i) => {
    const pivot = new Group();
    pivot.position.set(hand[0], hand[1] - 0.04, hand[2]);
    pivot.rotation.y = FACE;
    const bag = box(0.3, 0.4, 0.18, PAPER, 0, -0.48, 0, { delay: 1.4 + i * 0.05 });
    decorate(bag, new BoxGeometry(0.3, 0.03, 0.01), 0xa8946e, [[0, 0.36, 0.092]]);
    const handle = add(new TorusGeometry(0.07, 0.01, 4, 12, Math.PI), PAPER, 0, -0.08, 0, { delay: 1.45, noInk: true });
    const parts = [bag, handle];
    if (i === 1) parts.push(add(new ConeGeometry(0.035, 0.32, 6), 0x5fae5a, 0.07, -0.2, 0, { delay: 1.5, rotation: [0, 0, -0.2] }));
    bag.parent?.add(pivot);
    pivot.add(...parts);
    return pivot;
  });

  const rest = man.parts.map((part) => part.position.y);
  tick((t) => {
    // He breathes, the bags turn a little on their handles, the ball sways in the wind.
    const bob = Math.sin(t * 1.3) * 0.008;
    man.parts.forEach((part, i) => (part.position.y = rest[i] + bob));
    bags.forEach((pivot, i) => {
      pivot.rotation.x = Math.sin(t * 0.9 + i * Math.PI) * 0.05;
      pivot.position.y = man.hands[i][1] - 0.04 + bob;
    });
    swing.rotation.z = Math.sin(t * 0.7) * 0.06;
    swing.rotation.x = Math.sin(t * 0.5) * 0.04;
    // His window: steady, now and then the light of a television flickering behind it.
    home.color.setHex(Math.sin(t * 0.6) > 0.8 && Math.floor(t * 8) % 2 ? 0xfff0a0 : YELLOW);
    bloom.rotation.y = Math.sin(t) * 0.2;
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
