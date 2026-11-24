import { BoxGeometry, Color, CylinderGeometry, DodecahedronGeometry, ExtrudeGeometry, Shape, TorusGeometry, type Group } from "three";
import { MAGENTA, YELLOW, colorOf, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate } from "@/lib/diorama-props";

/**
 * Ferryman (P010): the old smuggler of the port stands in the stern of his boat on the black
 * water, lantern held high and a coil of rope in his hand, taking a hooded passenger with a
 * suitcase out past the lighthouse, whose beam sweeps the harbour. The passenger has no face:
 * it could be anyone, and whoever it is, the boat will come back without them.
 */
export function ferryman(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WATER = 0x0e2c40;
  const FOAM = 0xcfeef7;
  const HULL = 0x3e3028;
  const PLANK = 0x6b5442;
  const F = octagonBase(kit, WATER);

  // Rings spreading on the water round the boat.
  const ripples = [0, 1, 2].map((k) =>
    add(new TorusGeometry(1.5, 0.02, 6, 40).rotateX(Math.PI / 2).scale(1, 1, 0.55), FOAM, 0, F + 0.002, 0.15, { delay: 0.3 + k * 0.1, flat: true, noInk: true }),
  );

  // The lighthouse on its rock at the back, the beam turning.
  add(new DodecahedronGeometry(0.55), 0x2a2838, 1.15, F - 0.25, -1.45, { delay: 0.1, rotation: [0.3, 0.5, 0] });
  const tower = add(new CylinderGeometry(0.17, 0.26, 1.9, 14), 0xd8dce6, 1.15, F + 0.55, -1.45, { delay: 0.2 });
  decorate(tower, new CylinderGeometry(0.24, 0.25, 0.14, 14), MAGENTA, [
    [0, 0.4, 0],
    [0, 1.05, 0],
  ]);
  box(0.42, 0.06, 0.42, 0x23222b, 1.15, F + 2.45, -1.45, { delay: 0.3 });
  const lamp = cylinder(0.12, 0.12, 0.22, YELLOW, 1.15, F + 2.51, -1.45, { delay: 0.34, flat: true }, 10);
  add(new CylinderGeometry(0.02, 0.2, 0.18, 10), 0x23222b, 1.15, F + 2.73, -1.45, { delay: 0.36 });
  const beam = add(new BoxGeometry(1.7, 0.08, 0.3).translate(0.85, 0, 0), MAGENTA, 1.15, F + 2.58, -1.45, { delay: 0.5, flat: true, noInk: true });

  // The boat: a hull pointed at the bow, planks inside, two seats, cargo under the passenger.
  const outline = (s: number) => {
    const shape = new Shape();
    shape.moveTo(-1.3 * s, 0);
    shape.quadraticCurveTo(-0.7 * s, 0.5 * s, 0.2 * s, 0.5 * s);
    shape.lineTo(1.1 * s, 0.42 * s);
    shape.lineTo(1.1 * s, -0.42 * s);
    shape.lineTo(0.2 * s, -0.5 * s);
    shape.quadraticCurveTo(-0.7 * s, -0.5 * s, -1.3 * s, 0);
    return new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2);
  };
  const turn: [number, number, number] = [0, 0.25, 0];
  const BX = 0.05;
  const BZ = 0.15;
  const boat: Group[] = [
    add(outline(1).scale(1, 0.46, 1), HULL, BX, F - 0.06, BZ, { delay: 0.4, rotation: turn }),
    add(outline(1.015).scale(1, 0.05, 1), MAGENTA, BX, F + 0.3, BZ, { delay: 0.45, flat: true, noInk: true, rotation: turn }),
    add(outline(0.9).scale(1, 0.03, 1), PLANK, BX, F + 0.17, BZ, { delay: 0.48, noInk: true, rotation: turn }),
  ];
  /** A point on the boat: `d` along it towards the stern, `side` across it towards the camera. */
  const along = (d: number, side = 0): [number, number] => [BX + d * Math.cos(0.25) + side * Math.sin(0.25), BZ - d * Math.sin(0.25) + side * Math.cos(0.25)];
  [-0.2, 0.4].forEach((d, i) => {
    const [x, z] = along(d);
    boat.push(box(0.16, 0.05, 0.86, PLANK, x, F + 0.3, z, { delay: 0.5 + i * 0.03, rotation: turn }));
  });
  // The cargo in the bow: a big crate for the passenger to sit on, a smaller one beside it.
  const [cx, cz] = along(-0.8);
  const [kx, kz] = along(-0.45, -0.25);
  boat.push(crate(kit, cx, cz, F + 0.2, 0.55, 0.56, 0x5e4a3a, 0.25), crate(kit, kx, kz, F + 0.2, 0.58, 0.3, 0x6b5442, 0.6));

  // The passenger: hooded, faceless, a suitcase on the seat beside them.
  const passenger = figure(kit, {
    x: cx,
    z: cz,
    y: F + 0.2,
    facing: 1.3,
    height: 2.0,
    build: "slim",
    skin: 0x3a3448,
    face: { blank: true },
    headwear: { kind: "hood", color: 0x3a3a4e },
    top: { kind: "coat", color: 0x3a3a4e },
    bottom: { kind: "trousers", color: 0x2a2a38 },
    arms: ["crossed", "crossed"],
    legs: "sit",
    delay: 0.9,
  });
  boat.push(...passenger.parts);
  boat.push(box(0.36, 0.26, 0.12, 0x6a2a3a, kx, F + 0.5, kz, { delay: 1.2, rotation: [0, 0.6, 0] }));

  // Ferryman: flat cap, grey beard, dark pea coat; lantern up in one hand, rope in the other.
  const [fx, fz] = along(0.75);
  const old = figure(kit, {
    x: fx,
    z: fz,
    y: F + 0.2,
    facing: 0.3,
    height: 2.4,
    skin: 0xc8906a,
    hair: { style: "short", color: 0xa8a8b0 },
    face: { mouth: "smirk", brows: "raised", beard: "full", beardColor: 0xb8b8c0 },
    headwear: { kind: "cap", color: 0x1e2030, accent: 0x14121c },
    top: { kind: "coat", color: 0x1e2a44, accent: 0x2a3a5a },
    bottom: { kind: "trousers", color: 0x1a1e2c },
    shoes: 0x14121c,
    arms: [[-0.5, 2.35, 0.25], [0.48, 1.05, 0.2]],
    delay: 1.0,
  });
  boat.push(...old.parts);
  const [hand, ropeHand] = old.hands;
  const lantern: Group[] = [
    add(new TorusGeometry(0.07, 0.012, 6, 14), 0x23222b, hand[0], hand[1] - 0.1, hand[2], { delay: 1.5, rotation: [0, 0.3, 0] }),
    cylinder(0.1, 0.13, 0.06, 0x23222b, hand[0], hand[1] - 0.16, hand[2], { delay: 1.52 }, 10),
    cylinder(0.1, 0.1, 0.22, 0xfff0c0, hand[0], hand[1] - 0.38, hand[2], { delay: 1.55, flat: true }, 10),
    cylinder(0.13, 0.13, 0.05, 0x23222b, hand[0], hand[1] - 0.43, hand[2], { delay: 1.58 }, 10),
  ];
  decorate(lantern[2], new BoxGeometry(0.02, 0.22, 0.02), MAGENTA, [
    [0.1, 0.11, 0],
    [-0.1, 0.11, 0],
    [0, 0.11, 0.1],
  ]);
  const ROPE = 0xc9a46a;
  [0, 1, 2].forEach((k) =>
    lantern.push(add(new TorusGeometry(0.17 - k * 0.015, 0.035, 6, 18), ROPE, ropeHand[0] + k * 0.03, ropeHand[1] - 0.32, ropeHand[2] + 0.04, { delay: 1.5 + k * 0.03, rotation: [0, 0.3 + k * 0.3, 0.1] })),
  );
  boat.push(...lantern);

  const rest = boat.map((part) => part.position.y);
  const glowFrom = new Color(0xfff0c0);
  const glowTo = new Color(YELLOW);
  tick((t) => {
    // The boat rides the swell, the rings spread, the lantern breathes, the beam goes round.
    const swell = Math.sin(t * 1.6) * 0.03;
    boat.forEach((part, i) => (part.position.y = rest[i] + swell));
    ripples.forEach((ring, k) => {
      const u = (t * 0.25 + k / 3) % 1;
      ring.children[0].scale.set(0.75 + u * 0.45, 1, 0.75 + u * 0.45);
      ring.children[0].visible = u < 0.85;
    });
    colorOf(lantern[2]).lerpColors(glowFrom, glowTo, (Math.sin(t * 7) + 1) / 2);
    colorOf(lamp).lerpColors(glowTo, glowFrom, (Math.sin(t * 2) + 1) / 2);
    beam.rotation.y = 2.4 + t * 0.9;
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
