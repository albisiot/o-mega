import { BoxGeometry, ConeGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";

/**
 * Guado (P268): the boatwoman of the canals under the necropolis poles her punt through a
 * vaulted tunnel, burial niches with skulls and urns along the bank. Stern, in an ochre cloak
 * over a teal sweater, she has a lantern on the bow and her fare in the middle of the boat: a
 * box of lit candles. She has no sense for the other side: a little ghost circles her head
 * trying to get her attention, and she never notices it.
 */
export function guado(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0x3a3150;
  const BONE = 0xd8d0bc;
  const WOOD = 0x4a3a30;
  const FOAM = 0xcfeef7;
  const F = octagonBase(kit, 0x0e2a3e);

  // The bank on the left: a walkway and a wall of niches with skulls and urns.
  box(0.7, 0.25, 2.0, 0x4a4064, -1.7, F, -0.1, { delay: 0.1 });
  const wall = box(0.25, 2.3, 2.0, STONE, -1.95, F + 0.25, -0.1, { delay: 0.12, ink: 1.02 });
  const rows = [0.3, 1.2];
  const spots = [-0.75, 0, 0.75];
  decorate(wall, archMouth(0.24, 0.3).rotateY(Math.PI / 2), 0x120f1a, rows.flatMap((y) => spots.map((z) => [0.126, y, z] as Point)));
  rows.forEach((y, i) => box(0.16, 0.05, 1.9, 0x4a4064, -1.78, F + 0.25 + y - 0.05, -0.1, { delay: 0.16 + i * 0.03 }));
  [
    [0, 1.2, -0.85],
    [1, 1.2, 0.65],
    [0, 0.3, -0.1],
    [1, 0.3, -0.85],
  ].forEach(([kind, y, z], i) => {
    const at: Point = [-1.78, F + 0.25 + y, z];
    if (kind) {
      cylinder(0.08, 0.06, 0.2, 0x7a3a4a, ...at, { delay: 0.3 + i * 0.03 }, 10);
      ball(0.06, 0x7a3a4a, at[0], at[1] + 0.17, at[2], { delay: 0.32 + i * 0.03 });
      return;
    }
    const skull = ball(0.11, BONE, ...at, { delay: 0.3 + i * 0.03 });
    skull.rotation.y = Math.PI / 2;
    decorate(skull, new BoxGeometry(0.045, 0.04, 0.02), INK, [
      [-0.04, 0.12, 0.1],
      [0.04, 0.12, 0.1],
    ]);
  });

  // The vault the canal runs into, dark beyond.
  add(archedWall(3.0, 2.6, 0.35, { x: 0.25, half: 0.85, spring: 1.1 }), STONE, 0, F, -1.5, { delay: 0.2, ink: 1.02 });
  add(archMouth(0.85, 1.1), 0x0a0812, 0.25, F, -1.62, { delay: 0.22, flat: true, noInk: true });
  add(archMouth(0.55, 0.7), 0x1a1830, 0.25, F, -1.6, { delay: 0.24, flat: true, noInk: true });
  [
    [-1.2, 0.2, MAGENTA],
    [-1.05, -0.6, CYAN],
    [1.3, -0.9, MAGENTA],
    [1.5, 0.3, CYAN],
  ].forEach(([x, z, color], i) => box(0.06, 0.006, 0.5, color, x, F + 0.002, z, { delay: 0.3 + i * 0.03, flat: true, noInk: true }));

  // The punt, turned so we see its side, and what is on board.
  const hullShape = new Shape();
  hullShape.moveTo(-1.15, 0);
  hullShape.quadraticCurveTo(-0.95, -0.36, -0.5, -0.38);
  hullShape.lineTo(0.55, -0.38);
  hullShape.quadraticCurveTo(1.0, -0.36, 1.2, 0);
  hullShape.quadraticCurveTo(1.0, 0.36, 0.55, 0.38);
  hullShape.lineTo(-0.5, 0.38);
  hullShape.quadraticCurveTo(-0.95, 0.36, -1.15, 0);
  const BX = 0.25;
  const BZ = 0.3;
  const BT = 0.5;
  const onBoat = (lx: number, lz: number): [number, number] => [BX + lx * Math.cos(BT) + lz * Math.sin(BT), BZ - lx * Math.sin(BT) + lz * Math.cos(BT)];
  const boat: Group[] = [
    add(new ExtrudeGeometry(hullShape, { depth: 0.28, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2), 0x2a2238, BX, F - 0.08, BZ, { delay: 0.4, rotation: [0, BT, 0] }),
    add(new ExtrudeGeometry(hullShape, { depth: 0.02, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2).scale(0.9, 1, 0.82), 0x4a3a30, BX, F + 0.2, BZ, { delay: 0.44, rotation: [0, BT, 0], noInk: true }),
  ];
  const deck = F + 0.2;
  // The lantern on its post at the bow.
  const [px, pz] = onBoat(0.95, 0);
  boat.push(cylinder(0.025, 0.025, 0.55, WOOD, px, deck, pz, { delay: 0.5 }, 6));
  boat.push(box(0.2, 0.03, 0.03, WOOD, px + 0.06, deck + 0.53, pz - 0.04, { delay: 0.52, rotation: [0, BT, 0] }));
  const [lx, lz] = onBoat(1.04, 0);
  const lantern = box(0.14, 0.2, 0.14, 0xffb040, lx, deck + 0.24, lz, { delay: 0.56, flat: true });
  boat.push(lantern, box(0.18, 0.04, 0.18, 0x23222b, lx, deck + 0.44, lz, { delay: 0.58, rotation: [0, BT, 0] }));
  // The fare: a box of lit candles.
  const [cx, cz] = onBoat(0.25, 0.05);
  boat.push(box(0.36, 0.14, 0.24, 0x5e4a3a, cx, deck, cz, { delay: 0.6, rotation: [0, BT, 0] }));
  const flames = [-0.1, 0, 0.1].map((d, i) => {
    const [x, z] = onBoat(0.25 + d, 0.05 + (i % 2 ? 0.04 : -0.04));
    boat.push(cylinder(0.03, 0.03, 0.12, BONE, x, deck + 0.14, z, { delay: 0.64 + i * 0.02 }, 8));
    const fire = add(new ConeGeometry(0.03, 0.09, 6), 0xffd060, x, deck + 0.27, z, { delay: 0.66 + i * 0.02, flat: true, noInk: true });
    boat.push(fire);
    return fire;
  });

  // Guado at the stern, poling.
  const [gx, gz] = onBoat(-0.65, 0);
  const FACE = 0.35;
  const hands: [Point, Point] = [
    [-0.15, 1.75, 0.25],
    [0.05, 1.2, 0.38],
  ];
  const keeper = figure(kit, {
    x: gx,
    z: gz,
    y: deck,
    facing: FACE,
    height: 2.35,
    skin: 0xc8946a,
    hair: { style: "curly", color: 0x2a1a18 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "shirt", color: 0x1f4a52 },
    bottom: { kind: "trousers", color: 0x23222b },
    shoes: 0x1a1a20,
    cape: 0x8a6a2a,
    arms: hands,
    delay: 0.8,
  });
  const extra: Group[] = [
    add(new SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x8a6a2a, ...keeper.at(0, 1.62, -0.2), { delay: 1.3, rotation: [-0.5, FACE, 0] }),
    ...[-1, 1].map((side) => ball(0.025, 0xffd060, ...keeper.at(side * 0.21, 2.0, 0.02), { delay: 1.32, noInk: true })),
  ];
  const top = keeper.at(-0.52, 2.76, 0.01);
  const bottom = keeper.at(0.65, -0.45, 0.77);
  extra.push(limb(kit, top, bottom, 0.03, 0.03, 0x6a5040, { delay: 1.4 }));

  // Ripples where the pole enters the water and round the hull.
  const entry = keeper.at(0.56, -0.2, 0.71);
  const ripple = (x: number, z: number, radius: number, phase: number, delay: number) => {
    const wave = add(new TorusGeometry(radius, 0.016, 6, 32).rotateX(Math.PI / 2).scale(1, 1, 0.7), FOAM, x, F + 0.002, z, { delay, flat: true, noInk: true });
    tick((t) => {
      const u = ((t + phase) / 2.4) % 1;
      wave.children[0].scale.set(0.5 + u, 1, 0.5 + u);
      wave.children[0].visible = u < 0.85;
    });
  };
  ripple(entry[0], entry[2], 0.2, 0, 1.5);
  ripple(entry[0], entry[2], 0.2, 1.2, 1.5);
  ripple(BX, BZ, 1.0, 0.6, 0.8);

  // The ghost she cannot see, circling her head.
  const head = keeper.head;
  const ghost = new Group();
  ghost.position.set(head[0], head[1] + 0.15, head[2]);
  const wisp = [
    ball(0.12, 0xbfe8f0, 0.55, 0, 0, { delay: 1.8 }),
    add(new ConeGeometry(0.1, 0.26, 10).rotateX(Math.PI), 0xbfe8f0, 0.55, -0.12, 0, { delay: 1.82, rotation: [0, 0, 0.5] }),
  ];
  decorate(wisp[0], new BoxGeometry(0.03, 0.05, 0.02), INK, [
    [-0.04, 0.14, 0.11],
    [0.04, 0.14, 0.11],
  ]);
  wisp[0].parent?.add(ghost);
  wisp.forEach((part) => ghost.add(part));

  const moving = [...boat, ...keeper.parts, ...extra];
  const rest = moving.map((part) => part.position.y);
  tick((t) => {
    const bob = Math.sin(t * 1.5) * 0.025;
    moving.forEach((part, i) => (part.position.y = rest[i] + bob));
    ghost.rotation.y = t * 0.9;
    ghost.position.y = head[1] + 0.15 + bob + Math.sin(t * 2.3) * 0.06;
    wisp.forEach((part) => (part.rotation.y = -t * 0.9 + 0.35));
    flames.forEach((fire, i) => (fire.children[0].scale.y = 1 + 0.25 * Math.sin(t * (9 + i * 2) + i)));
    lantern.children[0].scale.y = 1 + 0.04 * Math.sin(t * 13);
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
