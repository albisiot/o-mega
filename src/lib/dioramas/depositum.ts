import { BoxGeometry, Color, ConeGeometry, OctahedronGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, archMouth, archedWall, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Depositum (P192): the keeper of the Banco's store of indestructible things, in a vaulted cellar
 * lined with iron racks of glowing jars. Hooded in fur against the cold, keys at his belt and
 * the lantern in his left hand, he gives the egg-stone on its plinth its scheduled turn (the
 * plinth is chalked with the tally); he moves so little that a spider has hung its web from
 * his shoulder to the rack.
 */
export function depositum(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const IRON = 0x3a3f4c;
  const GLASS = 0x1d3a48;
  const BRASS = 0xb08d3c;
  const FUR = 0xd8d2c6;
  const WEB = 0xcfd8e4;
  const F = octagonBase(kit, 0x1c1f2a);
  const G = floor(kit, F, 0.06, 0x363a48, 0x262934, 0.45);

  // The vault: a stone wall with an arch on a dark corridor, a cold glint far inside.
  add(archedWall(2.8, 3.0, 0.3, { x: 0.25, half: 0.55, spring: 1.25 }), 0x343048, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  add(archMouth(0.55, 1.25), 0x0c1a24, 0.25, G, -1.93, { delay: 0.14, flat: true, noInk: true });
  motes(5, CYAN, 0.025, [0, G + 0.2, -1.85], [0.5, G + 1.4, -1.8], 0.6);

  /** An iron rack facing `facing`, `width` wide, with three shelves of jars, each holding a glowing thing. */
  const rack = (cx: number, cz: number, facing: number, width: number, delay: number) => {
    const c = Math.cos(facing);
    const s = Math.sin(facing);
    const p = (dx: number, y: number, dz: number): Point => [cx + dx * c + dz * s, G + y, cz - dx * s + dz * c];
    const turn: Point = [0, facing, 0];
    [-1, 1].forEach((side) => [-0.17, 0.17].forEach((dz) => box(0.05, 2.45, 0.05, IRON, ...p((side * width) / 2, 0, dz), { delay, rotation: turn })));
    const things = [new SphereGeometry(0.055, 10, 8), new OctahedronGeometry(0.07), new TorusGeometry(0.05, 0.018, 6, 12)];
    [0.12, 0.82, 1.52, 2.22].forEach((y, k) => {
      box(width + 0.06, 0.04, 0.4, IRON, ...p(0, y, 0), { delay: delay + 0.04 + k * 0.02, rotation: turn });
      if (k === 3) return;
      const n = Math.round(width / 0.42);
      for (let j = 0; j < n; j++) {
        const dx = -width / 2 + (width / n) * (j + 0.5);
        const tall = 0.26 + ((j + k) % 2) * 0.08;
        const jar = cylinder(0.11, 0.12, tall, GLASS, ...p(dx, y + 0.04, 0), { delay: delay + 0.1 + (k * n + j) * 0.015, rotation: turn }, 12);
        decorate(jar, things[(j + k * 2) % 3], (j + k) % 3 === 0 ? MAGENTA : (j + k) % 3 === 1 ? CYAN : 0xb48cff, [[0, tall * 0.45, 0.09]]);
        cylinder(0.08, 0.08, 0.05, BRASS, ...p(dx, y + 0.04 + tall, 0), { delay: delay + 0.12 + (k * n + j) * 0.015 }, 10);
      }
    });
  };
  rack(-1.78, -0.3, Math.PI / 2, 1.5, 0.2);
  rack(1.3, -1.0, -0.8, 1.2, 0.3);

  // Depositum, hooded in fur, at the plinth of the egg-stone.
  const X = -0.05;
  const Z = 0.25;
  const theta = 0.3;
  const local = (lx: number, ly: number, lz: number): Point => [X + lx * Math.cos(theta) + lz * Math.sin(theta), G + ly, Z - lx * Math.sin(theta) + lz * Math.cos(theta)];
  const eggAt = local(-0.62, 0, 0.55);
  const plinth = cylinder(0.24, 0.28, 0.72, 0x5d6680, ...eggAt, { delay: 0.6 }, 10);
  // Chalk tallies of every turn it has had.
  decorate(
    plinth,
    new BoxGeometry(0.012, 0.12, 0.01),
    0xe8e2d0,
    [0, 1, 2, 3, 5, 6, 7, 8].map((k) => [-0.12 + k * 0.03, 0.42 + (k > 3 ? -0.18 : 0), 0.25] as Point),
  );
  decorate(plinth, new BoxGeometry(0.15, 0.012, 0.01), 0xe8e2d0, [[-0.065, 0.42, 0.255, 0.5]]);
  add(new TorusGeometry(0.2, 0.025, 6, 20).rotateX(Math.PI / 2), IRON, eggAt[0], eggAt[1] + 0.72, eggAt[2], { delay: 0.65 });
  const egg = add(new SphereGeometry(0.22, 18, 14).scale(1, 1.3, 1), 0x2c2838, eggAt[0], eggAt[1] + 0.72, eggAt[2], { delay: 0.7 });
  decorate(egg, new BoxGeometry(0.02, 0.22, 0.02), MAGENTA, [
    [0.1, 0.25, 0.19, 0.4],
    [-0.12, 0.33, 0.17, -0.3],
    [0.2, 0.3, -0.05, 0.2],
    [-0.08, 0.3, -0.2, -0.5],
  ]);

  const keeper = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: theta,
    height: 2.4,
    build: "heavy",
    skin: 0xd8a88e,
    hair: { style: "short", color: 0xc8c4bc },
    face: { mouth: "neutral", brows: "calm", beard: "full", beardColor: 0xa8a49c },
    headwear: { kind: "hood", color: 0x7a7468 },
    top: { kind: "coat", color: 0x6a6e7a, accent: 0x8a8e98 },
    bottom: { kind: "trousers", color: 0x464a56 },
    belt: 0x4a3426,
    gloves: 0x4a3a30,
    shoes: 0x2a2622,
    scarf: FUR,
    arms: [
      [-0.6, 1.42, 0.52],
      [0.62, 1.12, 0.36],
    ],
    delay: 0.8,
  });
  const at = keeper.at;
  // Fur round the hood's face.
  add(new TorusGeometry(0.24, 0.065, 8, 22).scale(1, 1.15, 1), FUR, ...at(0, 2.14 - 0.305 * 1.15, 0.12), { delay: 1.3, rotation: [0, theta, 0] });

  // The lantern, hanging from his left hand.
  const [, lanternHand] = keeper.hands;
  const [lx, ly, lz] = lanternHand;
  add(new TorusGeometry(0.06, 0.012, 6, 14), BRASS, lx, ly - 0.1, lz, { delay: 1.4, rotation: [0, theta, 0] });
  add(new ConeGeometry(0.12, 0.1, 8), BRASS, lx, ly - 0.2, lz, { delay: 1.42 });
  const light = box(0.16, 0.22, 0.16, YELLOW, lx, ly - 0.42, lz, { delay: 1.44, flat: true, rotation: [0, theta, 0] });
  decorate(light, new BoxGeometry(0.018, 0.22, 0.17), BRASS, [
    [-0.08, 0, 0],
    [0.08, 0, 0],
  ]);
  cylinder(0.11, 0.1, 0.05, BRASS, lx, ly - 0.47, lz, { delay: 1.46 }, 8);

  // The keys, on a big ring at his belt.
  const ring = at(0.28, 0.98, 0.42);
  add(new TorusGeometry(0.08, 0.014, 6, 16), BRASS, ...ring, { delay: 1.5, rotation: [0, theta, 0] });
  [-0.06, -0.02, 0.02, 0.06].forEach((dx, k) => {
    const key = box(0.025, 0.2, 0.012, BRASS, ...at(0.28 + dx, 0.82 - (k % 2) * 0.03, 0.44), { delay: 1.52 + k * 0.02, rotation: [0, theta, dx * 2] });
    decorate(key, new BoxGeometry(0.05, 0.025, 0.014), BRASS, [[0.015, 0.03, 0]]);
  });

  // The web, from his right shoulder to the rack, and its spider.
  const hub: Point = [-1.15, G + 1.95, 0.02];
  const web = ball(0.015, WEB, hub[0], hub[1] - 0.015, hub[2], { delay: 1.6, flat: true, noInk: true, rotation: [0, 0.35, 0] });
  decorate(
    web,
    new BoxGeometry(0.006, 0.8, 0.004),
    WEB,
    [0, 1, 2, 3].map((k) => [0, 0.015, 0, (k * Math.PI) / 4] as [number, number, number, number]),
  );
  [0.12, 0.24, 0.36].forEach((r) => decorate(web, new TorusGeometry(r, 0.004, 3, 8), WEB, [[0, 0.015, 0, Math.PI / 8]]));
  const shoulder = at(-0.5, 1.82, 0);
  limb(kit, [hub[0] + 0.38, hub[1] - 0.05, hub[2] + 0.13], shoulder, 0.006, 0.006, WEB, { delay: 1.65, flat: true, noInk: true });
  limb(kit, [-1.58, G + 2.3, -0.1], [hub[0] - 0.3, hub[1] + 0.22, hub[2] - 0.1], 0.006, 0.006, WEB, { delay: 1.65, flat: true, noInk: true });
  limb(kit, [-1.58, G + 1.55, 0.2], [hub[0] - 0.3, hub[1] - 0.22, hub[2] - 0.1], 0.006, 0.006, WEB, { delay: 1.65, flat: true, noInk: true });
  const threadLength = 0.5;
  const thread = box(0.006, threadLength, 0.006, WEB, hub[0], hub[1] - threadLength, hub[2] + 0.02, { delay: 1.7, flat: true, noInk: true });
  const spider = ball(0.045, 0x14121c, hub[0], hub[1] - threadLength - 0.09, hub[2] + 0.02, { delay: 1.72 });
  decorate(spider, new BoxGeometry(0.16, 0.01, 0.01), 0x14121c, [
    [0, 0.05, 0, 0.3],
    [0, 0.05, 0, -0.3],
  ]);

  const warm = new Color(YELLOW);
  const hot = new Color(ORANGE);
  tick((t) => {
    // The egg-stone turns, slowly, under his glove; the lantern breathes; the spider rides its thread.
    egg.rotation.y = t * 0.35;
    colorOf(light).lerpColors(warm, hot, (Math.sin(t * 7) * Math.sin(t * 2.3) + 1) / 4);
    const drop = 0.25 + Math.sin(t * 0.9) * 0.12;
    spider.position.y = hub[1] - drop - 0.09;
    thread.position.y = hub[1] - drop;
    thread.children.forEach((mesh) => (mesh.scale.y = drop / threadLength));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
