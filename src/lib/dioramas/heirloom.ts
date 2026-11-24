import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, facade, floor } from "@/lib/diorama-props";

/**
 * Heirloom (P085): the old household robot of the Lanterne cooks in the courtyard under the
 * washing lines, a pot of soup steaming in one hand, a dripping ladle in the other, his round
 * eyes glowing. Half the block grew up on his soup, and a kid on a crate is already eating; but
 * he still follows the recipe from the fat manual open on the stand beside him.
 */
export function heirloom(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STEEL = 0x5f7f9a;
  const STEEL_LIGHT = 0x7090aa;
  const STEEL_DARK = 0x3a4a5e;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2c2a3a, 0x1c1a26, 0.3);

  // The courtyard: a tenement with lit kitchen windows, a washing line from it to a pole.
  facade(kit, 0, -1.5, G, 0.1, { width: 3.0, height: 3.1, color: 0x2a2840, windows: 3, floors: 3, door: true, lit: YELLOW, shutters: 0x23404b });
  cylinder(0.04, 0.05, 2.7, 0x3a3440, 1.55, G, -0.25, { delay: 0.2 }, 8);
  const from: Point = [-1.4, G + 2.75, -1.33];
  const to: Point = [1.55, G + 2.62, -0.25];
  cable(kit, [from, [0.05, G + 2.45, -0.8], to], 0.01, 0x8a8a9a, 0.25);
  const clothes: Group[] = [];
  const yaw = Math.atan2(-(to[2] - from[2]), to[0] - from[0]);
  [
    [0.12, 0.22, 0.3, MAGENTA],
    [0.3, 0.3, 0.36, 0xd8c8d8],
    [0.5, 0.18, 0.26, 0x2f6f86],
    [0.7, 0.26, 0.34, 0x7a2f55],
    [0.86, 0.2, 0.22, 0xd8c8d8],
  ].forEach(([u, w, h, color], i) => {
    const sag = Math.sin(Math.PI * u) * 0.25;
    const part = box(w, h, 0.02, color, from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u - sag - 0.01, from[2] + (to[2] - from[2]) * u, { delay: 0.3 + i * 0.04, noInk: true });
    part.rotation.order = "YXZ";
    part.rotation.set(Math.PI, yaw, 0);
    clothes.push(part);
  });

  // The manual on its stand: thick, tabbed, open at the page with the soup.
  const LX = -1.4;
  const LZ = -0.35;
  cylinder(0.04, 0.07, 0.95, 0x3a3440, LX, G, LZ, { delay: 0.35 }, 8);
  box(0.36, 0.04, 0.3, 0x3a3440, LX, G, LZ, { delay: 0.33 });
  const desk = box(0.62, 0.04, 0.44, 0x3a3440, LX, G + 0.95, LZ, { delay: 0.4 });
  desk.rotation.order = "YXZ";
  desk.rotation.set(0.55, 0.75, 0);
  const book = box(0.56, 0.06, 0.4, 0xe8e2d0, LX, G + 0.99, LZ + 0.02, { delay: 0.45 });
  book.rotation.order = "YXZ";
  book.rotation.set(0.55, 0.75, 0);
  decorate(book, new BoxGeometry(0.01, 0.062, 0.4), 0x8a8270, [[0, 0.001, 0]]);
  decorate(book, new BoxGeometry(0.2, 0.004, 0.012), 0x2f6f86, [
    [-0.15, 0.062, -0.12],
    [-0.15, 0.062, -0.06],
    [0.15, 0.062, -0.1],
    [0.15, 0.062, 0.02],
  ]);
  decorate(book, new TorusGeometry(0.06, 0.008, 4, 16).rotateX(Math.PI / 2), MAGENTA, [[-0.15, 0.063, 0.08]]);
  decorate(book, new BoxGeometry(0.05, 0.03, 0.06), YELLOW, [[0.29, 0.03, -0.1]]);
  decorate(book, new BoxGeometry(0.05, 0.03, 0.06), CYAN, [[0.29, 0.03, 0.05]]);

  // Heirloom: a steel body under a stained apron, a round head with lamp eyes and an antenna.
  const FACE = 0.5;
  const turn: [number, number, number] = [0, FACE, 0];
  const bot = figure(kit, {
    x: -0.3,
    z: 0.1,
    y: G,
    facing: FACE,
    height: 2.35,
    build: "broad",
    skin: STEEL,
    hair: { style: "bald", color: STEEL },
    face: { blank: true },
    top: { kind: "apron", color: STEEL, accent: 0xe6d6cc },
    bottom: { kind: "trousers", color: 0x4e6a84 },
    shoes: STEEL_DARK,
    gloves: STEEL_LIGHT,
    arms: [[-0.28, 1.72, 0.5], [0.42, 1.26, 0.5]],
    delay: 0.6,
  });
  const at = bot.at;
  [
    [0.12, 1.45, 0.05],
    [-0.1, 1.15, 0.07],
    [0.15, 0.95, 0.04],
  ].forEach(([x, y, r], i) => add(new CylinderGeometry(r, r, 0.01, 10).rotateX(Math.PI / 2), 0xc0407a, ...at(x, y, 0.33), { delay: 1.0 + i * 0.03, rotation: turn, flat: true, noInk: true }));
  const [hx, hy, hz] = bot.head;
  cylinder(0.2, 0.25, 0.12, STEEL_DARK, hx, hy - 0.36, hz, { delay: 1.1 });
  const dome = ball(0.34, 0x6a8aa6, hx, hy - 0.3, hz, { delay: 1.15, rotation: turn });
  decorate(dome, new CylinderGeometry(0.085, 0.085, 0.02, 18).rotateX(Math.PI / 2), YELLOW, [
    [-0.12, 0.38, 0.325],
    [0.12, 0.38, 0.325],
  ]);
  decorate(dome, new TorusGeometry(0.09, 0.02, 6, 18), STEEL_DARK, [
    [-0.12, 0.38, 0.322],
    [0.12, 0.38, 0.322],
  ]);
  decorate(dome, new CylinderGeometry(0.025, 0.025, 0.02, 10).rotateX(Math.PI / 2), 0x6a4a10, [
    [-0.12, 0.38, 0.338],
    [0.12, 0.38, 0.338],
  ]);
  decorate(dome, new TorusGeometry(0.1, 0.012, 4, 12, Math.PI).rotateZ(Math.PI), INK, [[0, 0.3, 0.335]]);
  decorate(dome, new TorusGeometry(0.342, 0.008, 4, 32).rotateY(Math.PI / 2), 0x3a5068, [[0, 0.34, 0]]);
  [-1, 1].forEach((side) => add(new CylinderGeometry(0.11, 0.11, 0.1, 14).rotateZ(Math.PI / 2), STEEL_DARK, ...at(side * 0.35, hy - G - 0.07, 0.01), { delay: 1.2, rotation: turn }));
  cylinder(0.014, 0.014, 0.3, STEEL_DARK, hx, hy + 0.33, hz, { delay: 1.25 }, 6);
  const bulb = ball(0.05, MAGENTA, hx, hy + 0.6, hz, { delay: 1.3, flat: true });

  // The pot of soup in his left hand, steaming; the ladle in his right, dripping.
  const pot = at(0.06, 1.1, 0.68);
  const potPart = cylinder(0.27, 0.23, 0.26, 0x4a6a86, ...pot, { delay: 1.3 }, 18);
  decorate(potPart, new TorusGeometry(0.27, 0.02, 6, 24).rotateX(Math.PI / 2), STEEL_LIGHT, [[0, 0.26, 0]]);
  cylinder(0.25, 0.25, 0.02, YELLOW, pot[0], pot[1] + 0.21, pot[2], { delay: 1.35, flat: true, noInk: true }, 18);
  [-1, 1].forEach((side) => box(0.12, 0.04, 0.06, 0x3a5068, ...at(0.06 + side * 0.31, 1.3, 0.68), { delay: 1.35, rotation: turn }));
  motes(10, 0xe0a0d8, 0.035, [pot[0] - 0.18, pot[1] + 0.3, pot[2] - 0.15], [pot[0] + 0.18, pot[1] + 1.2, pot[2] + 0.15], 1.6);
  const [ladleHand] = bot.hands;
  const scoop: Point = at(0.02, 1.58, 0.72);
  limb(kit, ladleHand, scoop, 0.018, 0.018, 0x9ab0c4, { delay: 1.4 });
  add(new SphereGeometry(0.09, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0x9ab0c4, scoop[0], scoop[1] - 0.09, scoop[2], { delay: 1.42 });
  cylinder(0.08, 0.08, 0.01, YELLOW, scoop[0], scoop[1] - 0.012, scoop[2], { delay: 1.45, flat: true, noInk: true }, 12);
  const drop = ball(0.025, YELLOW, scoop[0], scoop[1] - 0.14, scoop[2], { delay: 1.5, flat: true });

  // A kid from the block on a crate, already eating.
  crate(kit, 1.15, 0.55, G, 0.5, 0.36, 0x5e4a3a, -0.3);
  const kid = figure(kit, {
    x: 1.15,
    z: 0.6,
    y: G,
    facing: -0.3,
    height: 1.45,
    build: "child",
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x3a2420 },
    face: { mouth: "grin", brows: "raised" },
    top: { kind: "hoodie", color: 0x7a2f55, accent: 0x8a3a66 },
    bottom: { kind: "shorts", color: 0x23404b },
    shoes: 0xe0dccf,
    arms: [[-0.08, 0.66, 0.3], [0.1, 0.62, 0.28]],
    legs: "sit",
    delay: 1.0,
  });
  const bowlAt = kid.at(0.01, 0.6, 0.31);
  const bowl = cylinder(0.13, 0.08, 0.09, 0xe8e2d0, ...bowlAt, { delay: 1.6 }, 14);
  decorate(bowl, new TorusGeometry(0.11, 0.012, 4, 18).rotateX(Math.PI / 2), CYAN, [[0, 0.045, 0]]);
  cylinder(0.11, 0.11, 0.01, YELLOW, bowlAt[0], bowlAt[1] + 0.085, bowlAt[2], { delay: 1.62, flat: true, noInk: true }, 14);

  tick((t) => {
    // Soup drips from the ladle, the antenna blinks, the washing sways.
    const u = (t * 0.9) % 1;
    drop.position.y = scoop[1] - 0.14 - u * (scoop[1] - 0.14 - (pot[1] + 0.21));
    bulb.visible = Math.floor(t * 2) % 4 !== 3;
    clothes.forEach((part, i) => part.rotation.set(Math.PI + Math.sin(t * 1.4 + i) * 0.12, yaw, 0));
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
