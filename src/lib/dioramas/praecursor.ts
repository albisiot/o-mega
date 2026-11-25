import { BoxGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, puddle } from "@/lib/diorama-props";

/**
 * Praecursor (P162): the rescuer of the Custodi runs down an old-town street in her scratched
 * white helmet and orange jacket, one hand reaching ahead: on a balcony a pot of flowers is
 * rocking on its edge right above a pram, and nothing has fallen yet. With no strength to catch
 * anything, she drags a mattress behind her on a rope, sweating, to put it under in time.
 */
export function praecursor(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WALL = 0x3a2f4e;
  const TERRACOTTA = 0xb0603a;
  const F = octagonBase(kit, 0x221e2a);
  const G = floor(kit, F, 0.06, 0x34303e, 0x24202c, 0.35);

  // The street: a house front with a balcony, its bracket cracked, and the pot rocking on the edge.
  const front = facade(kit, -0.1, -1.45, G, 0.1, { width: 3.0, height: 2.9, color: WALL, windows: 4, floors: 3, door: true, lit: ORANGE });
  decorate(front, new BoxGeometry(0.012, 0.3, 0.01), INK, [
    [0.75, 1.62, 0.156, 0.5],
    [0.88, 1.5, 0.156, -0.4],
  ]);
  box(0.95, 0.07, 0.42, 0x5d566e, 0.95, G + 1.85, -1.1, { delay: 0.3 });
  box(0.06, 0.2, 0.3, 0x5d566e, 0.6, G + 1.66, -1.16, { delay: 0.32 });
  box(0.06, 0.2, 0.3, 0x5d566e, 1.3, G + 1.62, -1.14, { delay: 0.32, rotation: [0, 0, 0.35] });
  const pot = cylinder(0.12, 0.085, 0.2, TERRACOTTA, 1.05, G + 1.92, -0.92, { delay: 0.4 }, 12);
  decorate(pot, new SphereGeometry(0.13, 10, 8).scale(1, 0.7, 1), 0x2f8f4f, [[0, 0.24, 0]]);
  decorate(pot, new SphereGeometry(0.04, 8, 6), MAGENTA, [
    [-0.08, 0.3, 0.05],
    [0.07, 0.31, 0.06],
    [0, 0.34, -0.02],
    [0.02, 0.28, 0.11],
  ]);

  // The pram right under it, a baby asleep under the hood.
  const PX = 0.95;
  const PZ = -0.5;
  box(0.55, 0.26, 0.32, MAGENTA, PX, G + 0.2, PZ, { delay: 0.45 });
  add(new SphereGeometry(0.2, 14, 8, -Math.PI / 2, Math.PI, 0, Math.PI / 2).scale(1, 1.1, 0.85), 0x8a1e44, PX - 0.12, G + 0.44, PZ, { delay: 0.5 });
  ball(0.075, 0xe8c0a0, PX - 0.06, G + 0.43, PZ, { delay: 0.55 });
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => add(new TorusGeometry(0.085, 0.022, 6, 16), INK, PX + sx * 0.19, G, PZ + sz * 0.17, { delay: 0.5, noInk: true })),
  );
  limb(kit, [PX + 0.26, G + 0.4, PZ], [PX + 0.42, G + 0.78, PZ], 0.02, 0.02, 0x23222b, { delay: 0.55 });
  box(0.04, 0.04, 0.3, 0x23222b, PX + 0.42, G + 0.76, PZ, { delay: 0.58 });
  puddle(kit, -0.9, 1.35, G, 0.4, 0.35, ORANGE);

  // Praecursor at a run, the mattress on a rope behind her.
  const theta = 0.85;
  const runner = figure(kit, {
    x: -0.35,
    z: 0.55,
    y: G,
    facing: theta,
    height: 2.35,
    build: "slim",
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "open", brows: "worried", marks: 0xb07a5a },
    headwear: { kind: "helmet", color: 0xe8e2d0, accent: 0x9aa0ab },
    top: { kind: "coat", color: ORANGE, accent: 0x1f1d24 },
    bottom: { kind: "trousers", color: 0x34363f },
    shoes: 0x23222b,
    gloves: 0x1f1d24,
    belt: 0x1f1d24,
    arms: [[-0.4, 1.0, -0.4], "forward"],
    legs: "stride",
    delay: 0.8,
  });
  const { at } = runner;
  const turn: Point = [0, theta, 0];
  // Backpack, straps and knee pads.
  const pack = box(0.42, 0.52, 0.2, 0x23222b, ...at(0, 1.2, -0.32), { delay: 1.2, rotation: turn });
  decorate(pack, new BoxGeometry(0.3, 0.08, 0.01), CYAN, [[0, 0.36, 0.101]]);
  [-1, 1].forEach((side) => limb(kit, at(side * 0.15, 1.3, 0.2), at(side * 0.17, 1.66, 0.12), 0.025, 0.025, 0x23222b, { delay: 1.25 }));
  ball(0.09, 0x23222b, ...at(-0.17, 0.52, 0.27), { delay: 1.28 });
  ball(0.09, 0x23222b, ...at(0.17, 0.5, -0.06), { delay: 1.28 });

  const mattress = box(1.0, 0.14, 0.62, 0xd8e4ee, -1.5, G, 0.25, { delay: 0.6, rotation: [0, 0.25, 0] });
  decorate(
    mattress,
    new BoxGeometry(1.0, 0.004, 0.05),
    CYAN,
    [-0.2, 0, 0.2].map((z) => [0, 0.141, z] as Point),
  );
  const [ropeHand] = runner.hands;
  cable(kit, [ropeHand, [-0.95, G + 0.45, 0.45], [-1.02, G + 0.1, 0.45]], 0.018, 0xd8cfb8, 1.5);

  // Sweat flying off her helmet.
  const drops = [0, 1].map((k) => ball(0.035, CYAN, ...at(-0.2 - k * 0.08, 2.35, -0.1 - k * 0.12), { delay: 1.6 + k * 0.05, flat: true, noInk: true }));
  const dropRest = drops.map((drop) => drop.position.clone());

  const rest = runner.parts.map((part) => part.position.y);
  const packY = pack.position.y;
  tick((t) => {
    // A runner's bounce, the pot rocking on the edge, the sweat flying.
    const bounce = Math.abs(Math.sin(t * 6)) * 0.03;
    runner.parts.forEach((part, i) => (part.position.y = rest[i] + bounce));
    pack.position.y = packY + bounce;
    pot.rotation.x = 0.12 + Math.sin(t * 3.2) * 0.12;
    drops.forEach((drop, k) => {
      const u = (t * 0.9 + k * 0.5) % 1;
      drop.position.set(dropRest[k].x - u * 0.25, dropRest[k].y + Math.sin(u * Math.PI) * 0.12, dropRest[k].z - u * 0.15);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
