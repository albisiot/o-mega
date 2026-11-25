import { BoxGeometry, DodecahedronGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, archMouth, archedWall, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, crate } from "@/lib/diorama-props";

/**
 * Franchigia (P255): the smuggler captain at a sea cave under the cliffs, the hidden mooring
 * nobody else knows. His launch noses into the dark arch, crates of glowing contraband aboard;
 * on the rock ledge he looks back at us with a grin, lantern in hand, in his mustard oilskin,
 * beard braided with beads. The compass on a crate spins wildly (his routes are the odd ones)
 * and smoke puffs from the pipe he never manages to give up.
 */
export function franchigia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const ROCK = 0x3e3a52;
  const ROCK_LIGHT = 0x4a4560;
  const HULL = 0x2a2238;
  const BRASS = 0xb08d3c;
  const F = octagonBase(kit, 0x0e3448);

  // The cliff and the cave's arch at the back, its mouth dark with a glint of goods inside.
  add(archedWall(3.2, 2.7, 0.4, { x: -0.45, half: 0.8, spring: 1.0 }), ROCK, 0, F, -1.45, { delay: 0.08, ink: 1.02 });
  const mouth = add(archMouth(0.8, 1.0), 0x070a12, -0.45, F, -1.66, { delay: 0.1, flat: true, noInk: true });
  decorate(mouth, new BoxGeometry(0.06, 0.06, 0.01), CYAN, [
    [-0.3, 0.35, 0.03],
    [0.2, 0.55, 0.03],
    [0.4, 0.3, 0.03],
  ]);
  [
    [-1.3, 2.55, -1.45, 0.42],
    [-0.45, 2.65, -1.5, 0.38],
    [0.55, 2.55, -1.45, 0.42],
    [1.35, 2.25, -1.4, 0.4],
    [-1.65, 0, -0.95, 0.45],
    [1.7, 0, -0.9, 0.42],
    [1.35, 0.6, -1.2, 0.35],
  ].forEach(([x, y, z, r], k) => add(new DodecahedronGeometry(r), k % 2 ? ROCK_LIGHT : 0x332f45, x, F + y, z, { delay: 0.14 + k * 0.03, rotation: [k, k * 2, 0] }));

  // The rock ledge he stands on, front right.
  cylinder(0.95, 1.05, 0.35, ROCK_LIGHT, 1.05, F, 0.45, { delay: 0.2, rotation: [0, 0.3, 0] }, 7);
  const L = F + 0.35;
  bollard(kit, 0.32, 0.1, L, 0.3);
  crate(kit, 1.55, -0.15, L, 0.32, 0.42, 0x5e4a3a, 0.3);
  cylinder(0.12, 0.12, 0.05, BRASS, 1.55, L + 0.42, -0.15, { delay: 0.4 }, 16);
  cylinder(0.1, 0.1, 0.012, 0xe8e2d0, 1.55, L + 0.47, -0.15, { delay: 0.42, flat: true, noInk: true }, 16);
  const needle = add(new BoxGeometry(0.17, 0.012, 0.025), MAGENTA, 1.55, L + 0.482, -0.15, { delay: 0.45, flat: true, noInk: true });
  add(new SphereGeometry(0.05, 10, 8).scale(1, 1, 2.6), 0x2f6f60, 0.55, L, 1.0, { delay: 0.44, rotation: [0, 0.8, 0] });

  // The launch, nosing into the cave, crates of glowing goods aboard.
  const hull = new Shape();
  hull.moveTo(-0.55, -0.27);
  hull.lineTo(0.2, -0.27);
  hull.quadraticCurveTo(0.55, -0.22, 0.72, 0);
  hull.quadraticCurveTo(0.55, 0.22, 0.2, 0.27);
  hull.lineTo(-0.55, 0.27);
  hull.closePath();
  const H = 1.3;
  const BX = -0.8;
  const BZ = 0.45;
  const launch = [
    add(new ExtrudeGeometry(hull, { depth: 0.3, bevelEnabled: false }).rotateX(-Math.PI / 2).rotateY(H), HULL, BX, F - 0.06, BZ, { delay: 0.5 }),
    add(new ExtrudeGeometry(hull, { depth: 0.05, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(1.03, 1, 1.03).rotateY(H), MAGENTA, BX, F + 0.19, BZ, { delay: 0.54, flat: true, noInk: true }),
  ];
  const onBoat = (u: number, v = 0): [number, number] => [BX + u * Math.cos(H) + v * Math.sin(H), BZ - u * Math.sin(H) + v * Math.cos(H)];
  [
    [-0.25, 0, 0.32, 0.1],
    [0.15, 0.02, 0.28, -0.2],
  ].forEach(([u, v, size, turn], k) => {
    const goods = crate(kit, ...onBoat(u, v), F + 0.24, 0.6 + k * 0.05, size, 0x6b5442, H + turn);
    decorate(goods, new BoxGeometry(size * 0.6, 0.04, size * 0.6), CYAN, [[0, size + 0.01, 0]]);
    launch.push(goods);
  });
  launch.push(cylinder(0.08, 0.1, 0.18, 0x3a3f50, ...onBoat(-0.45), F + 0.24, { delay: 0.7 }));
  const stern = onBoat(-0.5);
  cable(kit, [[0.32, L + 0.15, 0.1], [-0.1, F + 0.12, 0.45], [stern[0], F + 0.3, stern[1]]], 0.022, 0xc9a46a, 0.9);

  // Rings spreading round the launch.
  const ripples = [0.9, 1.0].map((delay) => add(new TorusGeometry(0.5, 0.016, 6, 36).rotateX(Math.PI / 2), 0xcfeef7, BX, F + 0.002, BZ, { delay, flat: true, noInk: true }));

  // Franchigia, on the ledge, turning back to us with a grin.
  const captain = figure(kit, {
    x: 0.95,
    z: 0.55,
    y: L,
    facing: -0.25,
    skin: 0xd8a080,
    hair: { style: "wild", color: 0x9a9aa6 },
    face: { mouth: "grin", brows: "raised", beard: "full", beardColor: 0x9a9aa6, marks: 0xa87058 },
    top: { kind: "coat", color: 0xc8952a, accent: 0x2a2622 },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    shoes: 0x2a2218,
    scarf: 0x2a2e3a,
    arms: ["hip", [0.5, 1.15, 0.22]],
    delay: 0.8,
  });
  const at = captain.at;
  [-1, 1].forEach((side) => {
    limb(kit, at(side * 0.07, 1.82, 0.2), at(side * 0.08, 1.58, 0.24), 0.028, 0.022, 0x9a9aa6, { delay: 1.2 });
    ball(0.035, side < 0 ? MAGENTA : YELLOW, ...at(side * 0.08, 1.53, 0.24), { delay: 1.25 });
  });
  // The pipe in the corner of his mouth.
  limb(kit, at(0.06, 2.02, 0.22), at(0.16, 1.98, 0.38), 0.014, 0.014, 0x3a2a20, { delay: 1.3 });
  const bowl: Point = at(0.17, 1.95, 0.4);
  cylinder(0.04, 0.035, 0.09, 0x5a3a28, ...bowl, { delay: 1.32 }, 10);
  cylinder(0.03, 0.03, 0.01, YELLOW, bowl[0], bowl[1] + 0.09, bowl[2], { delay: 1.34, flat: true, noInk: true }, 10);
  const puffs = [0, 1, 2, 3].map((k) => add(new SphereGeometry(0.06 + k * 0.015, 10, 8), 0x9a94b0, bowl[0], bowl[1] + 0.15, bowl[2], { delay: 1.5, flat: true, noInk: true }));
  // The lantern in his left hand.
  const [, hand] = captain.hands;
  box(0.02, 0.08, 0.02, 0x23222b, hand[0], hand[1] - 0.12, hand[2], { delay: 1.3, noInk: true });
  const lantern = box(0.15, 0.2, 0.15, 0x23222b, hand[0], hand[1] - 0.32, hand[2], { delay: 1.32 });
  const glow = decorate(lantern, new BoxGeometry(0.16, 0.13, 0.12), YELLOW, [[0, 0.1, 0]]);

  const rest = launch.map((part) => part.position.y);
  tick((t) => {
    launch.forEach((part, k) => (part.position.y = rest[k] + Math.sin(t * 1.9) * 0.02));
    ripples.forEach((ring, k) => {
      const u = (t * 0.4 + k * 0.5) % 1;
      ring.children[0].scale.set(0.8 + u * 0.8, 1, 0.8 + u * 0.8);
      ring.visible = u < 0.85;
    });
    // The needle never settles: it swings, then spins right round.
    needle.rotation.y = 0.6 + Math.sin(t * 1.3) * 0.8 + Math.max(0, Math.sin(t * 0.5)) * t * 2;
    // Smoke rising from the bowl and drifting off behind him, clear of his face.
    puffs.forEach((puff, k) => {
      const u = (t * 0.35 + k * 0.25 + 0.1) % 1;
      const p = at(0.24 + u * 0.6, 1.95 + u * 1.0, 0.36 - u * 0.65);
      puff.position.set(p[0], p[1], p[2]);
      puff.visible = u > 0.2 && u < 0.92;
    });
    glow.color.setHex(Math.floor(t * 8) % 23 === 5 ? 0xffa630 : YELLOW);
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
