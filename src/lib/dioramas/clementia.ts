import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, YELLOW, archedWall, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Clementia (P214): the old founding heroine sits in a carved armchair in a loggia, wrapped to
 * the chin in a vast gold-patterned blanket, hands folded, the sun on the city through the arch.
 * Her two guards in bicornes have let their muskets droop and one has dropped his: a flower
 * grows from its barrel. Calm spreads from her chair in rings, and the little storm cloud over
 * her head keeps dissolving: she only let the bad weather pass. Too tired to stand, she never
 * leaves the chair.
 */
export function clementia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const NAVY = 0x23304a;
  const GOLD = 0xd8a840;
  const STONE = 0x5d6680;
  const WOOD = 0x3e2a24;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x4a4a5a, 0x34343f, 0.45);

  // The loggia: a wall with an arch, the sunlit city beyond.
  add(new BoxGeometry(1.7, 2.3, 0.04), 0xffc860, 0, G, -1.85, { delay: 0.08, flat: true, noInk: true });
  [
    [-0.55, 0.5, 0.28],
    [-0.25, 0.75, 0.26],
    [0.05, 0.6, 0.3],
    [0.35, 0.95, 0.2],
    [0.6, 0.55, 0.3],
  ].forEach(([x, h, w], i) => box(w, h, 0.03, i % 2 ? 0xd88a5a : 0xe0a070, x, G, -1.8, { delay: 0.1 + i * 0.02, flat: true, noInk: true }));
  box(0.08, 0.3, 0.03, 0xd88a5a, 0.35, G + 0.95, -1.8, { delay: 0.2, flat: true, noInk: true });
  add(archedWall(3.6, 2.9, 0.3, { x: 0, half: 0.68, spring: 1.55 }), STONE, 0, G, -1.6, { delay: 0.12, ink: 1.02 });
  [-0.78, 0.78].forEach((x, i) => cylinder(0.11, 0.13, 1.55, 0x7c9cb4, x, G, -1.42, { delay: 0.18 + i * 0.03 }, 10));

  // Calm spreading from her chair.
  const calm = [0, 1].map((k) => add(new TorusGeometry(0.95, 0.012, 4, 40).rotateX(Math.PI / 2), CYAN, 0, G + 0.005, 0.1, { delay: 0.6 + k * 0.05, flat: true, noInk: true }));

  // The armchair: a tall carved back, two arms, gold trim.
  const turn = 0.3;
  const at = (lx: number, ly: number, lz: number): Point => [lx * Math.cos(turn) + lz * Math.sin(turn), G + ly, 0.05 - lx * Math.sin(turn) + lz * Math.cos(turn)];
  const back = box(1.0, 1.75, 0.2, WOOD, ...at(0, 0, -0.45), { delay: 0.4, rotation: [0, turn, 0] });
  decorate(back, new BoxGeometry(0.8, 1.05, 0.01), 0x2a3a5a, [[0, 1.05, 0.105]]);
  decorate(back, new BoxGeometry(0.8, 0.04, 0.012), GOLD, [
    [0, 1.6, 0.106],
    [0, 0.52, 0.106],
  ]);
  ball(0.08, GOLD, ...at(-0.45, 1.75, -0.45), { delay: 0.45 });
  ball(0.08, GOLD, ...at(0.45, 1.75, -0.45), { delay: 0.47 });
  box(1.0, 0.5, 0.75, WOOD, ...at(0, 0, -0.05), { delay: 0.42, rotation: [0, turn, 0] });
  [-1, 1].forEach((side, i) => box(0.14, 0.82, 0.75, WOOD, ...at(side * 0.55, 0, -0.05), { delay: 0.44 + i * 0.02, rotation: [0, turn, 0] }));

  // Clementia, under the blanket.
  figure(kit, {
    x: at(0, 0, 0)[0],
    z: at(0, 0, 0)[2],
    y: G,
    facing: turn,
    height: 2.25,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "wild", color: 0xb8bcc4 },
    face: { mouth: "smile", brows: "calm", marks: 0xb08070 },
    top: { kind: "dress", color: NAVY },
    cape: NAVY,
    shoes: 0x2a2228,
    arms: [
      [-0.06, 0.92, 0.42],
      [0.06, 0.94, 0.44],
    ],
    legs: "sit",
    delay: 0.7,
  });
  // The blanket, from her lap to the floor, patterned and fringed in gold.
  const drape = add(new CylinderGeometry(0.42, 0.78, 0.82, 18).scale(1.05, 1, 0.82), NAVY, ...at(0, 0, 0.32), { delay: 1.2, rotation: [0, turn, 0] });
  const spots: [number, number, number, number][] = [];
  [-0.9, -0.45, 0, 0.45, 0.9].forEach((a, i) =>
    [0.2, 0.45, 0.68].forEach((y, j) => {
      const r = 0.78 - (0.36 * y) / 0.82;
      if ((i + j) % 2 === 0) spots.push([Math.sin(a) * r * 1.05, y, Math.cos(a) * r * 0.82 + 0.01, Math.PI / 4]);
    }),
  );
  decorate(drape, new BoxGeometry(0.1, 0.1, 0.012), GOLD, spots);
  add(new TorusGeometry(0.78, 0.035, 6, 30).rotateX(Math.PI / 2).scale(1.05, 1, 0.82), GOLD, ...at(0, 0, 0.32), { delay: 1.25, rotation: [0, turn, 0] });
  add(new SphereGeometry(0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.05, 0.5, 0.95), NAVY, ...at(0, 0.8, 0.28), { delay: 1.22, rotation: [0, turn, 0] });

  /** A guard in a bicorne, white cross-belts, musket lowered. */
  const guard = (x: number, z: number, facing: number, delay: number, armed: boolean): Figure => {
    const man = figure(kit, {
      x,
      z,
      y: G,
      facing,
      height: 2.45,
      skin: 0xc89070,
      hair: { style: "short", color: 0x2a201c },
      face: { mouth: "neutral", brows: "calm", beard: "moustache" },
      top: { kind: "uniform", color: 0x2a3a5e, accent: GOLD },
      bottom: { kind: "trousers", color: 0xd8d2c4 },
      shoes: INK,
      gloves: 0xf0ece0,
      arms: armed ? [[-0.35, 1.0, 0.3], "down"] : ["down", "down"],
      delay,
    });
    [-1, 1].forEach((side) => box(0.07, 0.72, 0.03, 0xf0ece0, ...man.at(side * 0.22, 1.05, 0.27), { delay: delay + 0.3, rotation: [0, facing, side * 0.62] }));
    const crown = man.top + 0.02;
    add(new CylinderGeometry(0.34, 0.34, 0.1, 18, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), INK, man.head[0], crown - 0.12, man.head[2], { delay: delay + 0.45, rotation: [0, facing, 0] });
    add(new ConeGeometry(0.06, 0.22, 6), YELLOW, ...man.at(0.24, crown - G - 0.1, 0), { delay: delay + 0.5, rotation: [0, facing, -0.4] });
    if (armed) {
      const [hand] = man.hands;
      box(0.05, 1.3, 0.05, WOOD, hand[0], G + 0.05, hand[2] + 0.05, { delay: delay + 0.5, rotation: [0.25, facing, 0.1] });
    }
    return man;
  };
  const left = guard(-1.45, -0.55, 0.55, 0.9, true);
  const right = guard(1.45, -0.7, -0.1, 1.0, false);

  // The dropped musket, a flower in its barrel.
  const musket = box(1.25, 0.06, 0.07, WOOD, 0.9, G, 1.05, { delay: 1.4, rotation: [0, 0.5, 0] });
  decorate(musket, new BoxGeometry(0.5, 0.05, 0.075), 0x8a93a3, [[0.38, 0.01, 0]]);
  cylinder(0.008, 0.008, 0.28, 0x2f8f4f, 1.4, G + 0.06, 0.75, { delay: 1.5, noInk: true }, 6);
  const flower = ball(0.08, 0xff6fa0, 1.4, G + 0.3, 0.75, { delay: 1.55 });
  decorate(flower, new SphereGeometry(0.03, 8, 6), YELLOW, [[0, 0.06, 0.05]]);

  // The storm cloud over her, falling apart.
  const cloud: Group[] = [
    [0, 0, 0.22],
    [0.25, -0.05, 0.17],
    [-0.24, -0.04, 0.18],
    [0.1, 0.12, 0.16],
  ].map(([dx, dy, r], i) => ball(r, 0x5a6070, 0.2 + dx, G + 3.15 + dy, -0.2, { delay: 1.6 + i * 0.03 }));
  const bolt = box(0.04, 0.3, 0.03, YELLOW, 0.2, G + 2.75, -0.18, { delay: 1.75, flat: true, noInk: true, rotation: [0, 0, 0.3] });

  const sway = [left, right].map((man) => man.parts.map((part) => part.position.x));
  const cloudRest = cloud.map((part) => part.position.clone());
  tick((t) => {
    calm.forEach((band, k) => {
      const u = (t * 0.3 + k / 2) % 1;
      band.children[0].scale.set(1 + u * 1.2, 1, 1 + u * 1.2);
      band.visible = u < 0.85;
    });
    // Every five seconds the cloud thins out, drifts apart, and gathers again.
    const u = (t % 5) / 5;
    const apart = u < 0.6 ? 0 : (u - 0.6) / 0.4;
    cloud.forEach((part, i) => {
      part.position.x = cloudRest[i].x + (i % 2 ? 1 : -1) * apart * 0.9 * (i + 1) * 0.4;
      part.position.y = cloudRest[i].y + apart * 0.3;
      part.visible = apart < 0.85;
    });
    bolt.visible = u > 0.1 && u < 0.18;
    // The guards nod off on their feet.
    [left, right].forEach((man, j) => man.parts.forEach((part, i) => (part.position.x = sway[j][i] + Math.sin(t * 0.8 + j * 2) * 0.015)));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
