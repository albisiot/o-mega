import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, Vector3, type Object3D } from "three";
import { CYAN, MAGENTA, YELLOW, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { barrel, column, floor, table, wallLantern } from "@/lib/diorama-props";

/**
 * Ostinato (P239): the alien musician of a harbour cellar, on his little stage under a brick
 * arch by an old column and a lantern. Long bone beak, shaggy violet plumage tipped with magenta,
 * eyes shut, he plays a long golden flute, and the same few notes circle round and round above
 * his head. His only listener sleeps at a café table, a bubble swelling at his nose, and the cap
 * at the musician's feet holds a single coin.
 */
export function ostinato(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BRICK = 0x4a3040;
  const BRICK_DARK = 0x3a2432;
  const PLUME = 0x8a76b0;
  const ROBE = 0x1f3d4a;
  const STOLE = 0x7a2850;
  const BONE = 0xe8e0cc;
  const FLUTE = 0xd8b060;
  const F = octagonBase(kit, 0x241c24);
  const G = floor(kit, F, 0.06, 0x3a2e34, 0x2a2026, 0.4);

  // The cellar: a brick wall with an arch onto the barrel store, an old column, a lantern.
  const wall = add(archedWall(3.0, 3.0, 0.25, { x: 0.75, half: 0.42, spring: 1.0 }), BRICK, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  const bricks: Point[] = [];
  for (let r = 0; r < 12; r++)
    for (let c = 0; c < 6; c++) {
      const x = -1.25 + c * 0.5 + (r % 2) * 0.25;
      const y = 0.15 + r * 0.24;
      if (Math.abs(x - 0.75) < 0.6 && y < 1.55) continue;
      if ((r * 7 + c * 3) % 3 === 0) bricks.push([x, y, 0.126]);
    }
  decorate(wall, new BoxGeometry(0.4, 0.17, 0.01), BRICK_DARK, bricks);
  add(archMouth(0.42, 1.0), 0x14121c, 0.75, G, -1.7, { delay: 0.14, flat: true, noInk: true });
  [-0.2, 0.2].forEach((dx, i) => add(new CylinderGeometry(0.17, 0.17, 0.3, 12).rotateX(Math.PI / 2), 0x5e4a3a, 0.75 + dx, G, -1.62, { delay: 0.16 + i * 0.03 }));
  column(kit, -1.45, -0.85, G, 0.2, 2.7, true, 0x6a6c90);
  const lantern = wallLantern(kit, -0.4, -1.43, G + 2.55, 0.3, YELLOW);
  barrel(kit, 1.55, -0.75, G, 0.3, 0x5e4a3a);
  barrel(kit, 1.75, -0.25, G, 0.33, 0x4e3c30);

  // His stage, and the cap at its edge with one coin in it.
  const stage = box(1.5, 0.15, 1.1, 0x5e4a3a, -0.3, G, 0.1, { delay: 0.4 });
  decorate(stage, new BoxGeometry(1.5, 0.006, 0.012), 0x3e3028, [-0.3, 0, 0.3].map((z) => [0, 0.151, z] as Point));
  const S = G + 0.15;
  const cap = cylinder(0.15, 0.13, 0.13, 0x2a2a36, 0.2, S, 0.48, { delay: 0.5 }, 14);
  decorate(cap, new CylinderGeometry(0.12, 0.12, 0.005, 14), 0x14121c, [[0, 0.131, 0]]);
  decorate(cap, new CylinderGeometry(0.035, 0.035, 0.01, 10), YELLOW, [[0.03, 0.136, 0.02]]);
  add(new TorusGeometry(0.17, 0.03, 6, 20).rotateX(Math.PI / 2), 0x2a2a36, 0.2, S + 0.1, 0.48, { delay: 0.52 });

  // Ostinato: a bird's long beak, violet plumage, eyes shut, a teal robe and a checked stole.
  const facing = 0.3;
  const player = figure(kit, {
    x: -0.3,
    z: 0.05,
    y: S,
    facing,
    height: 2.5,
    build: "slim",
    skin: 0x9890b0,
    hair: { style: "wild", color: PLUME },
    face: { mouth: "none", brows: "none" },
    top: { kind: "robe", color: ROBE },
    arms: [
      [-0.03, 1.25, 0.62],
      [0.03, 1.58, 0.65],
    ],
    delay: 0.8,
  });
  const turned = (part: Group, tilt: number, turn = 0) => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt, facing + turn, 0);
    return part;
  };
  // The ruff of feathers round his neck, magenta at the tips, and a crest.
  for (let k = 0; k < 10; k++) {
    const a = -2.2 + (k / 9) * 4.4;
    turned(add(new ConeGeometry(0.07, 0.36, 5), k % 2 ? MAGENTA : PLUME, ...player.at(Math.sin(a) * 0.24, 2.0, Math.cos(a) * 0.18), { delay: 1.2 + k * 0.01 }), Math.PI - 0.7, a);
  }
  [-0.5, -0.25, 0, 0.25, 0.5].forEach((a, k) => {
    turned(add(new ConeGeometry(0.05, 0.32, 5), k % 2 ? PLUME : MAGENTA, ...player.at(Math.sin(a) * 0.12, 2.36, -0.05), { delay: 1.3 + k * 0.01 }), -0.7, a);
  });
  // The stole: a checked strip down each side of the front.
  [-1, 1].forEach((side) =>
    [
      [1.18, 0.62, 0.24, 0],
      [0.22, 0.88, 0.3, -0.12],
    ].forEach(([y, h, z, lean], i) => {
      const strip = turned(add(new BoxGeometry(0.11, h, 0.03), STOLE, ...player.at(side * 0.13, y, z), { delay: 1.1 + i * 0.02 }), lean);
      decorate(
        strip,
        new BoxGeometry(0.055, 0.07, 0.01),
        0x3e1428,
        Array.from({ length: Math.floor(h / 0.14) }, (_, k) => [k % 2 ? 0.028 : -0.028, 0.04 + k * 0.14, 0.016] as Point),
      );
    }),
  );
  // The beak, and the long flute from its tip down through his hands.
  limb(kit, player.at(0, 2.19, 0.16), player.at(0, 1.9, 0.7), 0.075, 0.012, BONE, { delay: 1.25 });
  const flute = limb(kit, player.at(0, 1.86, 0.71), player.at(0, 0.95, 0.63), 0.03, 0.045, FLUTE, { delay: 1.3 });
  decorate(flute, new BoxGeometry(0.03, 0.035, 0.03), 0x3a2418, [0.12, 0.42, 0.56, 0.74].map((y) => [0, y, 0.035] as Point));

  // The notes of his one song, circling over his head.
  const root = stage.parent as Object3D;
  const before = new Set(root.children);
  const centre = new Vector3(...player.at(0, 2.95, 0));
  [0, 1, 2, 3, 4].forEach((k) => {
    const a = (k / 5) * Math.PI * 2;
    const x = centre.x + Math.sin(a) * 0.75;
    const z = centre.z + Math.cos(a) * 0.75;
    const y = centre.y + (k % 2) * 0.15;
    const color = k % 2 ? CYAN : MAGENTA;
    add(new SphereGeometry(0.07, 10, 8).scale(1.25, 0.9, 0.9), color, x, y, z, { delay: 1.6 + k * 0.06 });
    box(0.022, 0.26, 0.022, color, x + 0.075, y + 0.06, z, { delay: 1.62 + k * 0.06, noInk: true });
    box(0.1, 0.035, 0.022, color, x + 0.12, y + 0.28, z, { delay: 1.64 + k * 0.06, noInk: true, rotation: [0, 0, -0.5] });
  });
  const ringGroup = new Group();
  ringGroup.position.copy(centre);
  root.children
    .filter((child) => !before.has(child))
    .forEach((part) => {
      part.position.sub(centre);
      ringGroup.add(part);
    });
  root.add(ringGroup);

  // His only listener, asleep at a café table, head on his chest.
  table(kit, 1.26, 0.42, G, 0.6, true, 0x3a3040, 0.75);
  const mug = cylinder(0.07, 0.07, 0.16, 0x8a93a3, 1.36, G + 0.79, 0.5, { delay: 0.7 }, 12);
  decorate(mug, new CylinderGeometry(0.065, 0.065, 0.02, 12), 0xf4f0e6, [[0, 0.16, 0]]);
  cylinder(0.2, 0.2, 0.48, 0x2e2a3c, 1.45, G, -0.1, { delay: 0.62 }, 12);
  const sleeper = figure(kit, {
    x: 1.45,
    z: -0.1,
    y: G,
    facing: -0.35,
    height: 2.3,
    skin: 0xd8a888,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "calm" },
    headwear: { kind: "cap", color: 0x2a3a5a, accent: 0x1e2a44 },
    top: { kind: "jacket", color: 0x5a3a48, accent: 0x6a4858 },
    bottom: { kind: "trousers", color: 0x2e3440 },
    arms: [
      [-0.16, 0.86, 0.48],
      [0.14, 0.86, 0.5],
    ],
    legs: "sit",
    delay: 0.75,
  });
  const neck = new Vector3(...sleeper.at(0, 1.4, 0));
  const slump = new Group();
  slump.position.copy(neck);
  root.add(slump);
  sleeper.parts
    .filter((part) => part.position.y > sleeper.head[1] - sleeper.headRadius * 1.3)
    .forEach((part) => {
      part.position.sub(neck);
      slump.add(part);
    });
  slump.quaternion.setFromAxisAngle(new Vector3(Math.cos(-0.35), 0, -Math.sin(-0.35)), 0.38);
  const nose = new Vector3(...sleeper.head).sub(neck).add(new Vector3(Math.sin(-0.35) * 0.24, -0.08, Math.cos(-0.35) * 0.24)).applyQuaternion(slump.quaternion).add(neck);
  const bubble = ball(0.07, 0xbfefff, nose.x, nose.y - 0.07, nose.z, { delay: 1.8, flat: true });

  tick((t) => {
    ringGroup.rotation.y = t * 0.8;
    ringGroup.position.y = centre.y + Math.sin(t * 1.6) * 0.05;
    const swell = (t * 0.5) % 1;
    bubble.children[0].scale.setScalar(0.5 + swell * 0.9);
    bubble.visible = swell < 0.92;
    lantern.visible = Math.floor(t * 7) % 11 !== 5;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
