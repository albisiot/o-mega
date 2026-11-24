import { BoxGeometry, Color, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, orb, table } from "@/lib/diorama-props";

/**
 * Kelvin (P003): the frail genius of the Lanterne in his attic workshop. A blackboard behind him
 * is covered in glowing diagrams, the gadget in his right hand hums with a little sun inside;
 * in his left, the price of having no strength at all: a jar of jam he cannot open.
 */
export function kelvin(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const F = octagonBase(kit, 0x24202c);
  const G = floor(kit, F, 0.06, 0x3a3040, 0x2a2230, 0.32);

  // The blackboard, chalked with diagrams (shapes only, no writing).
  const board = box(2.8, 1.6, 0.08, 0x1c2a2a, 0, G + 0.9, -1.45, { delay: 0.1, ink: 1.02 });
  box(2.95, 0.08, 0.14, 0x5e4a3a, 0, G + 0.86, -1.42, { delay: 0.14 });
  [-1.3, 1.3].forEach((x) => box(0.08, 2.5, 0.08, 0x5e4a3a, x, G, -1.5, { delay: 0.12 }));
  const chalk = 0x9fefff;
  decorate(board, new TorusGeometry(0.28, 0.012, 6, 30), chalk, [
    [-0.8, 0.85, 0.045],
    [0.7, 1.0, 0.045],
  ]);
  decorate(board, new TorusGeometry(0.14, 0.01, 6, 24), chalk, [[0.7, 1.0, 0.045]]);
  decorate(board, new BoxGeometry(0.9, 0.012, 0.01), chalk, [
    [-0.15, 0.4, 0.045, 0.3],
    [0.2, 0.6, 0.045, -0.5],
    [-0.5, 1.3, 0.045, 0.1],
  ]);
  decorate(board, new BoxGeometry(0.012, 0.5, 0.01), chalk, [
    [0.05, 1.05, 0.045, 0.6],
    [-1.1, 0.55, 0.045, -0.2],
  ]);

  // His bench: a lamp, bits of gadgets, a stack of notebooks.
  const bench = table(kit, 1.25, -0.4, G, 0.3, false, 0x5e4a3a);
  decorate(bench, new BoxGeometry(0.22, 0.05, 0.3), 0xe8e2d0, [
    [-0.25, 0.08, -0.1],
    [-0.25, 0.13, -0.08],
  ]);
  cylinder(0.04, 0.06, 0.45, 0x2a2a34, 1.5, G + 0.8, -0.5, { delay: 0.45 }, 8);
  const bulb = add(new CylinderGeometry(0.12, 0.05, 0.14, 10).rotateZ(0.6), 0x2a2a34, 1.42, G + 1.2, -0.45, { delay: 0.5 });
  decorate(bulb, new BoxGeometry(0.08, 0.04, 0.08), YELLOW, [[-0.05, 0.02, 0]]);
  [
    [1.0, -0.35, 0x8a93a3],
    [1.12, -0.25, 0xb0603a],
  ].forEach(([x, z, color], i) => box(0.12, 0.08, 0.1, color, x, G + 0.8, z, { delay: 0.55 + i * 0.03, rotation: [0, i, 0] }));

  // Kelvin: thin, stooped, in a huge cardigan, looking hard at the jar.
  const inventor = figure(kit, {
    x: -0.2,
    z: 0.4,
    y: G,
    facing: 0.25,
    height: 2.35,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "wild", color: 0xc8ccd4 },
    face: { mouth: "frown", brows: "worried", glasses: "round", glassesColor: 0x8a93a3, beard: "stubble", beardColor: 0xc8ccd4 },
    top: { kind: "coat", color: 0x2c3f5c, accent: 0xd8d2c4 },
    bottom: { kind: "trousers", color: 0x3a3040 },
    shoes: 0x3a2c22,
    arms: [[-0.35, 1.55, 0.5], [0.3, 1.62, 0.55]],
    delay: 0.8,
  });
  const [gadgetHand, jarHand] = inventor.hands;
  // The gadget: a brass cage with a small sun inside, and rings turning round it.
  const cage = add(new CylinderGeometry(0.1, 0.1, 0.18, 8), 0xb08d3c, gadgetHand[0], gadgetHand[1] - 0.02, gadgetHand[2] + 0.06, { delay: 1.4 });
  const sun = orb(kit, [gadgetHand[0], gadgetHand[1] + 0.13, gadgetHand[2] + 0.06], 0.07, YELLOW, 1.45);
  const rings = [0, 1].map((k) =>
    add(new TorusGeometry(0.16 + k * 0.04, 0.008, 6, 24), k ? CYAN : YELLOW, gadgetHand[0], gadgetHand[1] + 0.06, gadgetHand[2] + 0.06, {
      delay: 1.5 + k * 0.05,
      flat: true,
      noInk: true,
      rotation: [0.6 + k, 0.3, 0],
    }),
  );
  // The jar, lid on tight.
  const jarAt: Point = [jarHand[0] + 0.02, jarHand[1] - 0.08, jarHand[2] + 0.08];
  cylinder(0.1, 0.1, 0.24, 0x7a1e3a, ...jarAt, { delay: 1.4 }, 14);
  cylinder(0.105, 0.105, 0.06, 0xd8d2c4, jarAt[0], jarAt[1] + 0.24, jarAt[2], { delay: 1.45 }, 14);
  void cage;

  const sunFrom = new Color(YELLOW);
  const sunTo = new Color(0xffffff);
  tick((t) => {
    rings.forEach((ring, k) => (ring.rotation.y = 0.3 + t * (k ? -1.6 : 1.2)));
    colorOf(sun).lerpColors(sunFrom, sunTo, (Math.sin(t * 5) + 1) / 2);
    // He strains at the lid now and then: the jar hand trembles.
    inventor.headPart.rotation.z = Math.sin(t * 0.8) > 0.7 ? Math.sin(t * 30) * 0.03 : 0;
  });

  return { width: 4.9, height: 4.2, lookY: 1.4 };
}
