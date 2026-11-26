import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, type Material, type Mesh, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor } from "@/lib/diorama-props";

/**
 * Imbonitore (P303): the barker of the covered market stands on a fruit crate under the iron
 * arch, finger pointed straight at us, the bullhorn hanging from his other hand, spirals turning
 * in his eyes. On the crate beside him the goods: the last hour of the world, an hourglass
 * running out, with a stack of instalment coupons; a shopper in front already holds out her
 * purse, a spiral turning over her head. The price: no stamina and no fight in him, so a folding
 * stool with a cushion and a thermos waits close at hand.
 */
export function imbonitore(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const IRON = 0x24404e;
  const WOOD = 0x6b5442;
  const PLAID = 0xd8a41a;
  const F = octagonBase(kit, 0x221c2c);
  const G = floor(kit, F, 0.06, 0x2a2a36, 0x1c1c26, 0.45);

  // The market hall: a glazed end wall, an iron arch in front of it, lamps hanging from the arch.
  const glass = box(3.6, 2.7, 0.08, 0x1a2a3c, 0, G, -1.6, { delay: 0.1, ink: 1.02 });
  decorate(glass, new BoxGeometry(0.03, 2.6, 0.01), IRON, [-1.2, -0.6, 0, 0.6, 1.2].map((x) => [x, 1.35, 0.045] as Point));
  decorate(glass, new BoxGeometry(3.5, 0.03, 0.01), IRON, [0.7, 1.4, 2.1].map((y) => [0, y, 0.045] as Point));
  decorate(glass, new BoxGeometry(0.5, 0.55, 0.01), 0x2a4a6a, [
    [-0.9, 1.75, 0.04],
    [0.3, 1.05, 0.04],
    [0.9, 2.4, 0.04],
  ]);
  [-1.7, 1.7].forEach((x) => box(0.12, 1.0, 0.12, IRON, x, G, -1.35, { delay: 0.16 }));
  add(new TorusGeometry(1.7, 0.06, 6, 40, Math.PI), IRON, 0, G + 0.94, -1.35, { delay: 0.2 });
  const lamps = [-0.95, 0, 0.95].map((x, i) => {
    const hang = G + 0.94 + Math.sqrt(1.7 * 1.7 - x * x);
    box(0.012, 0.55, 0.012, INK, x, hang - 0.55, -1.35, { delay: 0.3 + i * 0.04, noInk: true });
    add(new ConeGeometry(0.2, 0.16, 12), MAGENTA, x, hang - 0.71, -1.35, { delay: 0.34 + i * 0.04 });
    return box(0.24, 0.02, 0.24, 0xffb8d0, x, hang - 0.73, -1.35, { delay: 0.38 + i * 0.04, flat: true, noInk: true });
  });

  // Crates of apples and plums along the front.
  [
    [-1.05, 0.85, 0.2, 0xc8304a],
    [-0.25, 1.2, -0.1, 0x7a3a9a],
    [0.55, 1.25, 0.15, 0xc8304a],
  ].forEach(([x, z, turn, fruit], i) => {
    const c = box(0.66, 0.3, 0.44, WOOD, x, G, z, { delay: 0.4 + i * 0.05, rotation: [0, turn, 0] });
    decorate(c, new BoxGeometry(0.64, 0.04, 0.01), 0x3e3028, [
      [0, 0.1, 0.225],
      [0, 0.2, 0.225],
    ]);
    decorate(
      c,
      new SphereGeometry(0.085, 10, 8),
      fruit,
      [-0.22, -0.07, 0.08, 0.23].flatMap((dx, k) => [[dx, 0.31, -0.09 + (k % 2) * 0.05] as Point, [dx + 0.06, 0.32, 0.1 - (k % 2) * 0.04] as Point]),
    );
  });

  // The soapbox crate he stands on, and the crate of goods beside it.
  crate(kit, -0.15, -0.35, G, 0.5, 0.62, WOOD, 0.1);
  const goods = box(0.7, 0.62, 0.5, WOOD, -1.1, G, -0.2, { delay: 0.55, rotation: [0, 0.3, 0] });
  decorate(goods, new BoxGeometry(0.68, 0.05, 0.01), 0x3e3028, [
    [0, 0.2, 0.255],
    [0, 0.42, 0.255],
  ]);
  // The hourglass: wooden ends, three posts, sand running from the top bulb to the bottom one.
  const hx = -1.2;
  const hz = -0.17;
  const hy = G + 0.62;
  cylinder(0.19, 0.19, 0.05, 0x3e3028, hx, hy, hz, { delay: 0.7 }, 12);
  cylinder(0.19, 0.19, 0.05, 0x3e3028, hx, hy + 0.62, hz, { delay: 0.8 }, 12);
  [0, 2.1, 4.2].forEach((a) => box(0.025, 0.57, 0.025, 0x3e3028, hx + Math.cos(a) * 0.16, hy + 0.05, hz + Math.sin(a) * 0.16, { delay: 0.74, noInk: true }));
  // The glass is see-through, so the sand shows.
  [
    [new CylinderGeometry(0.14, 0.025, 0.28, 14), 0.33],
    [new CylinderGeometry(0.025, 0.14, 0.28, 14), 0.05],
  ].forEach(([geometry, dy]) => {
    const bulb = add(geometry as CylinderGeometry, 0xcff4ff, hx, hy + (dy as number), hz, { delay: 0.76, flat: true, noInk: true });
    const material = (bulb.children[0] as Mesh).material as Material;
    material.transparent = true;
    material.opacity = 0.35;
    material.depthWrite = false;
  });
  const topSand = add(new CylinderGeometry(0.075, 0.022, 0.14, 12), YELLOW, hx, hy + 0.33, hz, { delay: 0.82, flat: true, noInk: true });
  const lowSand = add(new ConeGeometry(0.12, 0.14, 12), YELLOW, hx, hy + 0.05, hz, { delay: 0.84, flat: true, noInk: true });
  box(0.012, 0.28, 0.012, YELLOW, hx, hy + 0.05, hz, { delay: 0.86, flat: true, noInk: true });
  // Instalment coupons, a pile of them.
  [0, 1, 2, 3].forEach((k) => {
    const slip = box(0.2, 0.025, 0.12, 0xf0ead8, -0.88 + (k % 2) * 0.02, G + 0.62 + k * 0.026, -0.3, { delay: 0.9 + k * 0.02, rotation: [0, k * 0.2, 0] });
    decorate(slip, new BoxGeometry(0.05, 0.005, 0.12), MAGENTA, [[-0.06, 0.026, 0]]);
  });

  // The price, close at hand: a folding stool with a cushion, and his thermos.
  [-1, 1].forEach((side) => box(0.035, 0.62, 0.035, 0x8a93a3, 1.65 + side * 0.15, G, -0.3, { delay: 0.6, rotation: [0, 0.4, side * 0.5], noInk: true }));
  box(0.42, 0.04, 0.34, 0x2f6f86, 1.65, G + 0.54, -0.3, { delay: 0.64, rotation: [0, 0.4, 0] });
  add(new SphereGeometry(0.17, 12, 8).scale(1.1, 0.35, 0.9), 0xb02a5a, 1.6, G + 0.57, -0.32, { delay: 0.7 });
  const thermos = cylinder(0.06, 0.06, 0.3, 0x3a6a5a, 1.83, G + 0.58, -0.2, { delay: 0.72 }, 12);
  decorate(thermos, new CylinderGeometry(0.065, 0.065, 0.06, 12), 0xd8d2c4, [[0, 0.27, 0]]);

  // The barker on his crate: lanky, wild grey hair, plaid jacket, finger out, bullhorn down.
  const facing = 0.35;
  const barker = figure(kit, {
    x: -0.15,
    z: -0.35,
    y: G + 0.62,
    facing,
    height: 2.45,
    skin: 0xe8c0a8,
    hair: { style: "wild", color: 0xc8ccd4 },
    face: { mouth: "grin", brows: "raised", marks: 0xc89880 },
    top: { kind: "suit", color: PLAID, accent: 0x5a2a7a, tie: 0x5a2a7a },
    bottom: { kind: "trousers", color: 0x1f3a48 },
    shoes: 0x16141c,
    arms: [
      [-0.55, 1.95, 0.6],
      [0.5, 1.0, 0.2],
    ],
    delay: 0.9,
  });
  // The plaid: dark bands round the jacket and bars down its front.
  const u = 2.45 / 2.4;
  const torso = barker.parts[7];
  const chest = 0.7 * u;
  [0.18, 0.4, 0.6].forEach((y) => {
    const r = (0.3 + (0.05 * y) / chest) * u * 1.03;
    decorate(torso, new CylinderGeometry(r, r, 0.03, 18, 1, true).scale(1, 1, 0.72), 0x3a2a1a, [[0, y, 0]]);
  });
  decorate(
    torso,
    new BoxGeometry(0.025, chest * 0.85, 0.02),
    0x3a2a1a,
    [-0.24, -0.12, 0.12, 0.24].map((x) => [x, chest * 0.45, 0.72 * Math.sqrt(0.33 * 0.33 * u * u - x * x) + 0.008] as Point),
  );
  const [point, hornHand] = barker.hands;
  // The pointing finger.
  const tip: Point = barker.at(-0.64, 2.0, 0.86);
  const finger = aim(point, tip);
  cylinder(0.03, 0.036, finger.length, 0xe8c0a8, ...point, { delay: 1.5, rotation: finger.rotation });
  // The bullhorn, hanging mouth down and forward from his left hand.
  const hornEnd: Point = [hornHand[0] + 0.12, hornHand[1] - 0.5, hornHand[2] + 0.25];
  const horn = aim(hornHand, hornEnd);
  const bell = cylinder(0.2, 0.05, horn.length, 0x2f6f86, ...hornHand, { delay: 1.5, rotation: horn.rotation });
  decorate(bell, new TorusGeometry(0.19, 0.02, 6, 18).rotateX(Math.PI / 2), MAGENTA, [[0, horn.length, 0]]);
  decorate(bell, new CylinderGeometry(0.17, 0.17, 0.01, 16), 0x3a1030, [[0, horn.length - 0.01, 0]]);

  // Spirals in his eyes: magenta discs with a turning bar.
  const spirals = [-1, 1].map((side) => {
    const centre = barker.at(side * 0.08 * u, 2.17 * u, 0.22 * u * 0.9 + 0.035);
    const holder = new Group();
    holder.position.set(...centre);
    holder.rotation.order = "YXZ";
    holder.rotation.set(0, facing, 0);
    const disc = add(new CylinderGeometry(0.042, 0.042, 0.012, 16).rotateX(Math.PI / 2), MAGENTA, 0, 0, 0, { delay: 1.7, flat: true, noInk: true });
    disc.parent?.add(holder);
    holder.add(disc);
    disc.position.set(0, -0.042, 0);
    decorate(disc, new BoxGeometry(0.07, 0.01, 0.004), INK, [[0, 0.042, 0.008]]);
    decorate(disc, new TorusGeometry(0.022, 0.005, 4, 16), INK, [[0, 0.042, 0.008]]);
    return holder;
  });

  // The shopper, her back to us, holding out her purse, a spiral over her head.
  const buyer = figure(kit, {
    x: 1.35,
    z: 0.7,
    y: G,
    facing: -2.18,
    height: 1.9,
    build: "heavy",
    skin: 0xd8b098,
    hair: { style: "bun", color: 0x8a8e98 },
    face: { mouth: "open", brows: "raised" },
    top: { kind: "coat", color: 0x2f6f60 },
    bottom: { kind: "skirt", color: 0x2a3040 },
    arms: ["forward", "down"],
    delay: 1.1,
  });
  const purse = buyer.hands[0];
  box(0.16, 0.12, 0.08, 0x7a2a4a, purse[0], purse[1] - 0.04, purse[2], { delay: 1.8, rotation: [0, -2.18, 0] });
  const halo = [0.22, 0.13].map((r, k) => {
    const ring = add(new TorusGeometry(r, 0.014, 4, 28).rotateX(Math.PI / 2), k ? MAGENTA : CYAN, buyer.head[0], buyer.top + 0.28 + k * 0.03, buyer.head[2], { delay: 1.9, flat: true, noInk: true });
    decorate(ring, new SphereGeometry(0.03, 8, 6), k ? MAGENTA : CYAN, [[r, 0.014, 0]]);
    return ring;
  });
  const sway = buyer.parts.map((part) => part.position.x);

  tick((t) => {
    spirals.forEach((holder, k) => (holder.rotation.z = (k ? -1 : 1) * t * 4));
    // The sand runs out over six seconds, then the glass is full again.
    const u6 = (t / 6) % 1;
    topSand.children[0].scale.set(1, 1 - u6 * 0.85, 1);
    lowSand.children[0].scale.set(0.6 + u6 * 0.4, 0.4 + u6 * 0.6, 0.6 + u6 * 0.4);
    halo.forEach((ring, k) => (ring.rotation.y = t * (k ? -2 : 1.5)));
    buyer.parts.forEach((part, i) => (part.position.x = sway[i] + Math.sin(t * 1.4) * 0.03));
    lamps.forEach((light, i) => (light.visible = i !== 2 || Math.floor(t * 6) % 17 !== 9));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
