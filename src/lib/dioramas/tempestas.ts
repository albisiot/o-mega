import { CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { CYAN, MAGENTA, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, lamp, railing } from "@/lib/diorama-props";

/**
 * Tempestas (P074): the wind hero is already taking off from the seafront on his own whirlwind,
 * fist to the sky, scarf cracking in the gale, while the old lady he has just saved holds up a
 * tray of pastries to thank the empty air; her hat, the papers and the leaves go round him in
 * the gust. He can't stand still: his boots never touch the ground.
 */
export function tempestas(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const SEA = 0x0e2f48;
  const WAVE = 0x1f6f9a;
  const FOAM = 0xcfeef7;
  const SUIT = 0x2a6fa8;
  const LEATHER = 0x23506e;
  const F = octagonBase(kit, 0x1b2030);
  const G = floor(kit, F, 0.06, 0x343848, 0x22252f, 0.45);

  // The sea beyond the promenade's wall: waves with white crests rolling under the railing.
  const sea = new Shape([[-2.25, 0.4], [2.25, 0.4], [2.25, 1.0], [1.0, 2.25], [-1.0, 2.25], [-2.25, 1.0]].map(([x, s]) => new Vector2(x, s)));
  add(new ExtrudeGeometry(sea, { depth: 0.012, bevelEnabled: false }).rotateX(-Math.PI / 2), SEA, 0, G, 0, { delay: 0.08, noInk: true });
  box(4.3, 0.12, 0.12, 0x5d6680, 0, G, -0.36, { delay: 0.1 });
  railing(kit, [-2.0, -0.36], [2.0, -0.36], G + 0.12, 0.14, 0.5);
  const waves = [
    [-1.5, -0.85, 1.0],
    [-0.3, -1.25, 1.2],
    [0.9, -0.8, 0.9],
    [1.55, -1.1, 0.8],
    [-1.0, -1.65, 0.9],
    [0.4, -1.85, 0.8],
  ].map(([x, z, size], i) => {
    const crest = add(new SphereGeometry(0.22 * size, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.9, 0.75, 0.8), WAVE, x, G, z, { delay: 0.15 + i * 0.03 });
    decorate(crest, new SphereGeometry(0.12 * size, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(2.2, 0.55, 0.9), FOAM, [[0, 0.1 * size, 0.02]]);
    return crest;
  });
  lamp(kit, -1.85, 0.05, G, 0.3, 2.0);

  // The old lady, smiling up at where he was, holding out her tray of pastries.
  const lady = figure(kit, {
    x: -1.3, z: 0.95, y: G, facing: 1.0, height: 1.95, build: "heavy",
    skin: 0xe0b090,
    hair: { style: "bun", color: 0xd8d8e0 },
    face: { mouth: "smile", brows: "raised", glasses: "round", glassesColor: 0x8a93a3 },
    top: { kind: "coat", color: 0x5a3a6a, accent: 0x7a5a8a },
    bottom: { kind: "trousers", color: 0x3a2a4a },
    shoes: 0x2a2026,
    arms: [[-0.14, 1.28, 0.5], [0.14, 1.28, 0.5]],
    delay: 0.6,
  });
  const tray = box(0.46, 0.03, 0.3, 0xd8d2c4, ...lady.at(0, 1.3, 0.55), { delay: 1.1, rotation: [0, 1.0, 0] });
  decorate(tray, new CylinderGeometry(0.045, 0.05, 0.06, 8), 0xe8a040, [
    [-0.14, 0.06, -0.05],
    [0, 0.06, 0.06],
    [0.14, 0.06, -0.04],
    [-0.06, 0.06, -0.1],
    [0.08, 0.06, 0.1],
  ]);

  // The whirlwind he rides: tilted rings spinning from the paving up to his boots.
  const X = 0.55;
  const Z = 0.25;
  const lift = 0.75;
  const funnel = [0, 1, 2, 3, 4].map((k) => {
    const r = 0.2 + k * 0.1;
    const ring = add(new TorusGeometry(r, 0.025, 6, 30).rotateX(Math.PI / 2), [CYAN, 0xe8f4ff, MAGENTA][k % 3], X, G + 0.06 + k * 0.15, Z, { delay: 0.9 + k * 0.04, flat: true, noInk: true });
    ring.rotation.order = "YXZ";
    return ring;
  });

  // Tempestas: blue suit, white chest, white gloves, leather flying helmet with goggles up.
  const facing = 0.4;
  const hero = figure(kit, {
    x: X, z: Z, y: G + lift, facing, height: 2.4,
    skin: 0xe8b890,
    hair: { style: "bald", color: 0x4a3020 },
    face: { mouth: "grin", brows: "raised" },
    top: { kind: "shirt", color: SUIT },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x1f3550,
    gloves: 0xf2f2f2,
    scarf: MAGENTA,
    arms: ["fist", [0.6, 1.05, -0.25]],
    legs: "stride",
    delay: 1.0,
  });
  const rot: Point = [0, facing, 0];
  const worn: Group[] = [];
  const wear = (part: Group) => (worn.push(part), part);
  wear(add(new CylinderGeometry(0.32, 0.5, 1.45, 16).scale(1, 1, 0.3), 0xc0245a, ...hero.at(0, 0.35, -0.2), { delay: 1.05, rotation: rot }));
  wear(box(0.3, 0.52, 0.06, 0xeef2f6, ...hero.at(0, 1.05, 0.21), { delay: 1.3, rotation: [-0.08, facing, 0] }));
  const [cx, cy, cz] = hero.head;
  const R = hero.headRadius;
  wear(add(new SphereGeometry(R * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), LEATHER, cx, cy + R * 0.2, cz, { delay: 1.45, rotation: rot }));
  [-1, 1].forEach((side) => {
    wear(ball(R * 0.42, LEATHER, ...hero.at(side * R * 0.95, 2.14 - R * 0.25 - R * 0.42, -0.02), { delay: 1.48 }));
    const goggle = hero.at(side * 0.1, 2.14 + R * 0.9, R * 0.86);
    const lens = wear(add(new TorusGeometry(0.065, 0.022, 6, 16), 0xd8dce4, goggle[0], goggle[1] - 0.087, goggle[2], { delay: 1.52, rotation: [-0.75, facing, 0] }));
    decorate(lens, new CylinderGeometry(0.055, 0.055, 0.01, 12).rotateX(Math.PI / 2), CYAN, [[0, 0.087, 0]]);
  });

  // The free end of the scarf, streaming in the wind.
  const knot = hero.at(-0.1, 1.82, -0.12);
  const tail = box(0.12, 0.75, 0.025, MAGENTA, ...knot, { delay: 1.6, rotation: [0, facing, 1.4] });
  tail.rotation.order = "YXZ";

  // Wind ribbons spiralling round him, and her hat, papers and leaves caught in the gust.
  const centre: Point = [X, G + lift + 1.2, Z];
  const ribbons = Array.from({ length: 9 }, (_, k) => box(0.45, 0.03, 0.07, k % 2 ? CYAN : MAGENTA, ...centre, { delay: 1.7 + k * 0.03, flat: true, noInk: true }));
  const flying: { part: Group; r: number; y: number; speed: number; phase: number }[] = [
    { part: add(new CylinderGeometry(0.16, 0.16, 0.025, 14), 0x5a3a6a, ...centre, { delay: 1.8 }), r: 1.05, y: 2.75, speed: 1.1, phase: 0.5 },
    { part: box(0.16, 0.01, 0.2, 0xe8e2d0, ...centre, { delay: 1.82 }), r: 1.15, y: 1.6, speed: 1.4, phase: 2.2 },
    { part: box(0.16, 0.01, 0.2, 0xe8e2d0, ...centre, { delay: 1.84 }), r: 0.95, y: 0.9, speed: 1.6, phase: 4.0 },
    { part: box(0.1, 0.01, 0.07, 0x2f8f4f, ...centre, { delay: 1.86 }), r: 0.9, y: 2.2, speed: 1.9, phase: 3.1 },
    { part: box(0.1, 0.01, 0.07, 0xd88a30, ...centre, { delay: 1.88 }), r: 1.2, y: 1.2, speed: 1.3, phase: 5.3 },
  ];
  decorate(flying[0].part, new CylinderGeometry(0.09, 0.1, 0.09, 12), 0x5a3a6a, [[0, 0.06, 0]]);

  const body = [...hero.parts, ...worn];
  const heroRest = body.map((part) => part.position.y);
  const hang = new Vector3();
  tick((t) => {
    // He bobs and can't keep still; the wind spins, the waves roll.
    const bob = Math.sin(t * 2.2) * 0.06 + Math.sin(t * 7.3) * 0.012;
    body.forEach((part, i) => (part.position.y = heroRest[i] + bob));
    funnel.forEach((ring, k) => ring.rotation.set(0.22, t * (4 + k), 0));
    tail.rotation.z = 1.35 + Math.sin(t * 9) * 0.12;
    hang.set(0, 0.75, 0).applyEuler(tail.rotation);
    tail.position.set(knot[0] - hang.x, knot[1] + bob - hang.y, knot[2] - hang.z);
    ribbons.forEach((ribbon, k) => {
      const a = t * 2.4 + k * 0.75;
      const r = 0.55 + k * 0.05;
      ribbon.position.set(X + Math.cos(a) * r, G + lift - 0.55 + k * 0.32, Z + Math.sin(a) * r);
      ribbon.rotation.set(0.15, -a, 0.2);
    });
    for (const { part, r, y, speed, phase } of flying) {
      const a = t * speed + phase;
      part.position.set(X + Math.cos(a) * r, G + y + Math.sin(t * 1.7 + phase) * 0.15, Z + Math.sin(a) * r);
      part.rotation.set(t * 2 + phase, -a, t * 1.3);
    }
    waves.forEach((wave, i) => (wave.position.y = G - 0.04 + Math.sin(t * 1.6 + i * 1.3) * 0.04));
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
