import { BoxGeometry, ConeGeometry, SphereGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Dogwatch (P009): the Custodi's night shift, no Segno and no powers, only patience: in a wet
 * cobbled lane under a buzzing wall lantern, by his sentry box with the light on, he stands in
 * his yellow sash with a steaming cup of coffee and an ordinary torch, and a stray dog sleeps at
 * his feet, wagging and twitching in its dreams.
 */
export function dogwatch(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const BOOTH = 0x2a4a5a;
  const DOG = 0x8a6a4a;
  const DOG_DARK = 0x5e4632;
  const F = octagonBase(kit, 0x1c1f2a);
  const G = floor(kit, F, 0.06, 0x2a2e3e, 0x181c28, 0.26);

  // The lane: a house front with a lantern on its wall, puddles catching the light.
  facade(kit, 0.55, -1.4, G, 0.1, { width: 2.2, height: 2.8, color: 0x2e2a40, windows: 3, floors: 2, door: true, lit: 0x141a26 });
  const lantern = wallLantern(kit, 1.15, -1.25, G + 2.15, 0.4, YELLOW);
  puddle(kit, 1.35, 0.15, G, 0.5, 0.36, YELLOW);
  puddle(kit, -0.6, 1.2, G, 0.55, 0.3, MAGENTA);

  // His sentry box, light on inside, the thermos on its ledge.
  const booth = box(0.8, 1.95, 0.8, BOOTH, -1.3, G, -0.65, { delay: 0.2 });
  decorate(booth, new BoxGeometry(0.5, 0.45, 0.01), YELLOW, [[0, 1.35, 0.401]]);
  decorate(booth, new BoxGeometry(0.56, 0.04, 0.02), 0x1a2e38, [
    [0, 1.12, 0.405],
    [0, 1.58, 0.405],
  ]);
  decorate(booth, new BoxGeometry(0.03, 1.0, 0.01), 0x1a2e38, [[0.27, 0.5, 0.401]]);
  box(0.98, 0.08, 0.98, 0x1a2e38, -1.3, G + 1.95, -0.65, { delay: 0.3 });
  add(new ConeGeometry(0.62, 0.3, 4), 0x1a2e38, -1.3, G + 2.03, -0.65, { delay: 0.34, rotation: [0, Math.PI / 4, 0] });
  box(0.7, 0.05, 0.2, 0x1a2e38, -1.3, G + 1.0, -0.17, { delay: 0.36 });
  const flask = cylinder(0.07, 0.07, 0.3, 0x2f6f86, -1.45, G + 1.05, -0.17, { delay: 0.45 }, 12);
  decorate(flask, new BoxGeometry(0.15, 0.04, 0.15), 0x1a2e38, [[0, 0.3, 0]]);

  // Dogwatch: cap, grey stubble, dark coat, the yellow sash; coffee in one hand, torch in the other.
  const X = 0.2;
  const Z = 0.3;
  const FACE = 0.35;
  const guard = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: FACE,
    height: 2.45,
    skin: 0xd2a080,
    hair: { style: "short", color: 0x4a4444 },
    face: { mouth: "neutral", brows: "calm", beard: "stubble", beardColor: 0x8a8a8a },
    headwear: { kind: "cap", color: 0x23303a },
    top: { kind: "jacket", color: 0x234a4e, accent: 0x1a3a3e },
    bottom: { kind: "trousers", color: 0x1f2a30 },
    shoes: 0x16171e,
    arms: [[-0.12, 1.45, 0.4], "down"],
    delay: 0.8,
  });
  box(0.1, 0.84, 0.03, YELLOW, ...guard.at(-0.26, 1.1, 0.245), { delay: 1.3, rotation: [0, FACE, -0.72] });
  box(0.1, 0.84, 0.03, YELLOW, ...guard.at(-0.26, 1.1, -0.245), { delay: 1.32, rotation: [0, FACE, -0.72] });
  const [cupHand, torchHand] = guard.hands;
  cylinder(0.065, 0.055, 0.14, 0x2f6f86, cupHand[0], cupHand[1] - 0.02, cupHand[2] + 0.05, { delay: 1.4 }, 12);
  motes(8, 0xd8dce6, 0.025, [cupHand[0] - 0.05, cupHand[1] + 0.14, cupHand[2]], [cupHand[0] + 0.05, cupHand[1] + 0.7, cupHand[2] + 0.1], 1.6);
  cylinder(0.04, 0.05, 0.24, 0x23222b, torchHand[0], torchHand[1] - 0.2, torchHand[2] + 0.02, { delay: 1.4 }, 8);
  cylinder(0.05, 0.05, 0.02, YELLOW, torchHand[0], torchHand[1] - 0.22, torchHand[2] + 0.02, { delay: 1.45, flat: true, noInk: true }, 10);
  add(new SphereGeometry(0.3, 16, 6).scale(1, 0.01, 0.7), YELLOW, torchHand[0] + 0.15, G + 0.002, torchHand[2] + 0.35, { delay: 1.5, flat: true, noInk: true });

  // The stray asleep at his feet, curled up, tail going.
  const DX = -0.55;
  const DZ = 0.95;
  add(new SphereGeometry(0.24, 14, 10).scale(1.3, 0.7, 0.9), DOG, DX, G, DZ, { delay: 1.0 });
  const head = ball(0.13, DOG, DX + 0.3, G + 0.02, DZ + 0.12, { delay: 1.1 });
  decorate(head, new BoxGeometry(0.1, 0.07, 0.12), DOG_DARK, [[0.08, 0.08, 0.06]]);
  decorate(head, new BoxGeometry(0.06, 0.012, 0.01), 0x14121c, [
    [0.02, 0.15, 0.125],
    [0.1, 0.15, 0.11],
  ]);
  const ears = [-0.07, 0.07].map((dz, i) => add(new ConeGeometry(0.05, 0.1, 6), DOG_DARK, DX + 0.27, G + 0.22, DZ + 0.12 + dz, { delay: 1.15 + i * 0.02, rotation: [dz * 4, 0, 0.3] }));
  const tail = cylinder(0.025, 0.035, 0.3, DOG_DARK, DX - 0.3, G + 0.08, DZ - 0.05, { delay: 1.2, rotation: [0, 0, 1.2] }, 6);
  box(0.12, 0.04, 0.12, CYAN, DX + 0.5, G, DZ - 0.2, { delay: 1.25, rotation: [0, 0.5, 0] });

  tick((t) => {
    // The lantern buzzes, the dog's tail wags and an ear twitches.
    lantern.visible = Math.floor(t * 8) % 23 !== 11;
    tail.rotation.set(Math.sin(t * 5) * 0.5, 0, 1.2);
    ears[0].rotation.z = 0.3 + (Math.sin(t * 0.9) > 0.85 ? 0.5 : 0);
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
