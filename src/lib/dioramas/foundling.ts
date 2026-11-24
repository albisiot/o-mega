import { BoxGeometry } from "three";
import { MAGENTA, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, facade, floor, lamp, puddle, stall } from "@/lib/diorama-props";

/**
 * Foundling (P002): the pickpocket with a boy's face dashes down the market alley at night,
 * grinning over his shoulder, a stolen wallet held up for us to see; behind him the stalls are
 * closing, an apple rolls out of a knocked crate and the lamp flickers.
 */
export function foundling(kit: Kit): Framing {
  const { box, ball, decorate, tick } = kit;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2c2a38, 0x1c1a24, 0.4);

  // The alley: a house front, a closing stall with fruit, crates, a lamp and a puddle.
  facade(kit, -0.4, -1.35, G, 0.12, { width: 3.2, height: 2.4, color: 0x3a2f4e, windows: 4, floors: 2, door: true });
  const desk = stall(kit, 1.1, -0.55, G, 0.3, 1.4, [MAGENTA, 0x23707e]);
  decorate(desk, new BoxGeometry(0.12, 0.12, 0.12), 0xe0402a, [
    [-0.45, 0.81, 0.05],
    [-0.3, 0.81, 0.1],
    [-0.15, 0.81, 0],
    [0.2, 0.81, 0.08],
    [0.35, 0.81, -0.02],
  ]);
  crate(kit, 1.55, 0.45, G, 0.5, 0.4, 0x5e4a3a, 0.3);
  crate(kit, 1.6, 0.45, G + 0.4, 0.55, 0.36, 0x6b5442, -0.2);
  const tipped = crate(kit, 0.9, 0.75, G, 0.6, 0.36, 0x5e4a3a, 0.9);
  tipped.rotation.z = 0.5;
  const apple = ball(0.07, 0xe0402a, 0.45, G, 0.95, { delay: 0.7 });
  const light = lamp(kit, -1.55, -0.6, G, 0.4, 2.1);
  puddle(kit, -0.5, 1.15, G, 0.5, 0.4, MAGENTA);

  // Foundling, mid-dash, the wallet up in his right hand.
  const thief = figure(kit, {
    x: -0.2,
    z: 0.35,
    y: G,
    facing: -0.5,
    height: 2.2,
    build: "slim",
    skin: 0xe0b08f,
    hair: { style: "short", color: 0x5a3020 },
    face: { mouth: "grin", brows: "raised", marks: 0xc08060 },
    headwear: { kind: "cap", color: 0x2a3a5a, accent: 0x2a3a5a },
    top: { kind: "hoodie", color: 0x23404b, accent: 0x2f5866 },
    bottom: { kind: "trousers", color: 0x1f2a3a },
    shoes: 0xe0dccf,
    arms: [[-0.55, 2.25, 0.35], "back"],
    legs: "stride",
    delay: 0.8,
  });
  const [hand] = thief.hands;
  const wallet = box(0.2, 0.14, 0.04, 0x5a2a1e, hand[0], hand[1] - 0.02, hand[2] + 0.06, { delay: 1.4, rotation: [0, -0.5, 0.25] });
  decorate(wallet, new BoxGeometry(0.06, 0.03, 0.01), 0xd8c25a, [[0.05, 0.1, 0.022]]);
  // Speed lines behind him.
  [
    [-1.2, 1.6, 0.6, 0.9],
    [-1.3, 1.2, 0.3, 0.7],
    [-1.1, 2.0, 0.45, 0.6],
  ].forEach(([x, y, z, length], i) => box(length, 0.02, 0.02, i === 1 ? 0x16c8ff : MAGENTA, x, G + y - 0.6, z, { delay: 1.5 + i * 0.05, flat: true, noInk: true }));

  const rest = thief.parts.map((part) => part.position.y);
  tick((t) => {
    // A runner's bounce, the apple rolling away, the lamp catching.
    const bounce = Math.abs(Math.sin(t * 6)) * 0.03;
    thief.parts.forEach((part, i) => (part.position.y = rest[i] + bounce));
    const u = (t * 0.25) % 1;
    apple.position.set(0.45 - u * 0.9, G, 0.95 + u * 0.4);
    apple.rotation.z = u * 12;
    light.visible = Math.floor(t * 7) % 13 !== 6;
  });

  return { width: 4.9, height: 4.2, lookY: 1.35 };
}
