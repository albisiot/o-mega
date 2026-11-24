import { BoxGeometry, CylinderGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, wallLantern } from "@/lib/diorama-props";

/**
 * Latchkey (P021): the old-school burglar in flat cap, long coat and red scarf at the doors of an
 * old-town palazzo at night, a lockpick raised by his face, winking. The carved wooden door with
 * its brass keyhole swings open for him, warm light inside; the steel door beside it, with an
 * electronic keypad, still blinks red, a bent pick and scratches round it: technology beats him.
 */
export function latchkey(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STONE = 0x3a2f4e;
  const STONE_LIGHT = 0x4e4066;
  const WOOD = 0x5a2a3a;
  const BRASS = 0xd9a030;
  const SKIN = 0xd8a088;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2c2a38, 0x1c1a24, 0.4);

  // The palazzo front, two doorways in it.
  const WZ = -1.05;
  const wall = box(3.5, 2.9, 0.25, STONE, 0, G, WZ, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(3.5, 0.03, 0.01), 0x2a2238, [0.6, 1.2, 1.8, 2.4].map((y) => [0, y, 0.126] as Point));
  const face = WZ + 0.125;

  // The old door: a stone frame, the lit hall behind, the carved leaf swung open on its hinge.
  const HX = -1.45;
  decorate(wall, new BoxGeometry(0.8, 1.7, 0.01), 0xffb030, [[HX + 0.4, 0.85, 0.127]]);
  box(0.12, 1.85, 0.12, STONE_LIGHT, HX - 0.06, G, face + 0.04, { delay: 0.2 });
  box(0.12, 1.85, 0.12, STONE_LIGHT, HX + 0.86, G, face + 0.04, { delay: 0.2 });
  box(1.1, 0.16, 0.14, STONE_LIGHT, HX + 0.4, G + 1.8, face + 0.05, { delay: 0.22 });
  // The leaf hangs on its right-hand hinge and swings out towards us.
  const leaf = add(new BoxGeometry(0.8, 1.7, 0.07).translate(-0.4, 0, 0), WOOD, HX + 0.8, G, face + 0.06, { delay: 0.3, rotation: [0, 1.15, 0] });
  decorate(leaf, new BoxGeometry(0.28, 0.6, 0.01), 0x3e1a28, [
    [-0.22, 0.45, 0.036],
    [-0.58, 0.45, 0.036],
    [-0.22, 1.2, 0.036],
    [-0.58, 1.2, 0.036],
  ]);
  decorate(leaf, new BoxGeometry(0.11, 0.24, 0.012), BRASS, [[-0.7, 0.85, 0.04]]);
  decorate(leaf, new BoxGeometry(0.03, 0.07, 0.014), INK, [[-0.7, 0.83, 0.046]]);
  wallLantern(kit, 0.0, face, G + 2.25, 0.4);

  // The steel door, shut, and its keypad: blinking red, scratched all round, a pick bent below.
  const steel = box(0.85, 1.75, 0.06, 0x3a4a5a, 0.85, G, face + 0.03, { delay: 0.3 });
  decorate(steel, new BoxGeometry(0.75, 0.02, 0.01), 0x2a3440, [
    [0, 0.6, 0.031],
    [0, 1.2, 0.031],
  ]);
  decorate(steel, new BoxGeometry(0.04, 0.2, 0.02), 0x8a93a3, [[-0.33, 0.9, 0.04]]);
  const pad = box(0.18, 0.26, 0.05, 0x1a1f28, 1.5, G + 1.0, face + 0.025, { delay: 0.5 });
  decorate(
    pad,
    new BoxGeometry(0.035, 0.03, 0.01),
    0x8a93a3,
    [0, 1, 2].flatMap((r) => [-0.05, 0, 0.05].map((x) => [x, 0.05 + r * 0.045, 0.026] as Point)),
  );
  const led = box(0.05, 0.035, 0.02, MAGENTA, 1.5, G + 1.2, face + 0.055, { delay: 0.55, flat: true, noInk: true });
  decorate(wall, new BoxGeometry(0.006, 0.12, 0.01), 0x8a93a3, [
    [1.36, 1.15, 0.127, 0.6],
    [1.64, 1.05, 0.127, -0.5],
    [1.4, 0.92, 0.127, -0.9],
    [1.62, 1.3, 0.127, 0.4],
  ]);
  box(0.16, 0.01, 0.012, 0x8a93a3, 1.45, G, face + 0.35, { delay: 0.6, noInk: true, rotation: [0, 0.4, 0] });
  box(0.1, 0.01, 0.012, 0x8a93a3, 1.53, G, face + 0.4, { delay: 0.6, noInk: true, rotation: [0, -0.7, 0] });

  // His tool roll open on the pavement.
  const roll = box(0.5, 0.02, 0.28, 0x5a3a2a, -0.95, G, 0.85, { delay: 0.7, rotation: [0, 0.3, 0] });
  decorate(roll, new BoxGeometry(0.012, 0.012, 0.2), 0xc8ccd4, [-0.18, -0.1, -0.02, 0.06, 0.14].map((x) => [x, 0.016, 0] as Point));

  // Latchkey: flat cap, pencil moustache, long dark coat, red scarf, black gloves.
  const thief = figure(kit, {
    x: -0.1,
    z: 0.3,
    y: G,
    facing: 0.45,
    height: 2.4,
    build: "slim",
    skin: SKIN,
    hair: { style: "short", color: 0x1a1418 },
    face: { mouth: "smirk", brows: "raised", beard: "moustache", beardColor: 0x1a1418 },
    headwear: { kind: "cap", color: 0x2a2c3a, accent: 0x23252f },
    top: { kind: "coat", color: 0x23263a, accent: 0x2e3250 },
    bottom: { kind: "trousers", color: 0x1c1e2a },
    scarf: 0x9a1f3a,
    gloves: 0x16161c,
    shoes: 0x1a1418,
    arms: ["hip", [0.3, 1.95, 0.42]],
    delay: 0.8,
  });
  // A wink: one eye shut.
  const RH = thief.headRadius;
  const cy = RH * 1.06;
  const fz = RH * 0.9;
  decorate(thief.headPart, new BoxGeometry(0.06, 0.045, 0.02), SKIN, [[0.08, cy + 0.03, fz + 0.008]]);
  decorate(thief.headPart, new BoxGeometry(0.065, 0.014, 0.02), INK, [[0.08, cy + 0.025, fz + 0.016]]);
  // The lockpick held up, and a ring of old keys at his hip.
  const [, hand] = thief.hands;
  const pick = cylinder(0.008, 0.008, 0.32, 0xc8ccd4, hand[0], hand[1] + 0.04, hand[2] + 0.02, { delay: 1.5, noInk: true, rotation: [0, 0, 0.25] }, 5);
  const keys = thief.at(0.33, 0.88, 0.12);
  add(new TorusGeometry(0.06, 0.01, 6, 16), BRASS, keys[0], keys[1], keys[2], { delay: 1.5, rotation: [0, 0.45, 0] });
  [-0.04, 0, 0.04].forEach((dx, k) =>
    add(new CylinderGeometry(0.01, 0.01, 0.12, 5), YELLOW, keys[0] + dx, keys[1] - 0.12, keys[2] + 0.02, { delay: 1.55 + k * 0.02, rotation: [0, 0, dx * 4] }),
  );

  tick((t) => {
    leaf.rotation.y = 1.15 + Math.sin(t * 0.8) * 0.1;
    led.visible = Math.floor(t * 3) % 2 === 0;
    pick.rotation.z = 0.25 + Math.sin(t * 9) * 0.06;
  });

  return { width: 4.9, height: 4.3, lookY: 1.5 };
}
