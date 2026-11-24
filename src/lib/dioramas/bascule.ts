import { BoxGeometry, CircleGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { MAGENTA, ORANGE, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, puddle } from "@/lib/diorama-props";

/**
 * Bascule (P133): the old bridge-mistress of the port stands on the wet quay in the rain, in her
 * navy oilskin with red ear defenders round her neck, the brass bridge key held across her body;
 * behind her the steel leaf of the bridge creeps up while the winch's cog turns. The price,
 * slowness: on the bridge tower a blank dial marks out the nine minutes the lift takes, its hand
 * crawling through them.
 */
export function bascule(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STEEL = 0x3a4660;
  const STEEL_DARK = 0x262c40;
  const BRASS = 0xc9a040;
  const F = octagonBase(kit, 0x0e3a4e);

  // The quay: the front of the octagon raised in stone, its edge on the water at the back.
  const outline: [number, number][] = [
    [-2.25, -0.25],
    [2.25, -0.25],
    [2.25, 0.95],
    [0.95, 2.25],
    [-0.95, 2.25],
    [-2.25, 0.95],
  ];
  const shape = new Shape();
  outline.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  const quay = add(new ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x3e4458, 0, F - 0.02, 0, { delay: 0.06, ink: 1.01 });
  const G = F + 0.28;
  [0.3, 0.85, 1.4, 1.95].forEach((z) => decorate(quay, new BoxGeometry(2 * Math.min(2.2, 3.15 - z), 0.006, 0.014), 0x2a2e3c, [[0, 0.301, z]]));
  decorate(quay, new BoxGeometry(0.014, 0.006, 0.55), 0x2a2e3c, [-1.9, -1.1, -0.3, 0.5, 1.3, 1.9, -1.5, -0.7, 0.1, 0.9, 1.7].map((x, i) => [x, 0.301, i < 6 ? 0.57 : 1.12] as Point));
  box(4.5, 0.08, 0.16, 0x50586e, 0, G, -0.17, { delay: 0.1 });
  bollard(kit, -0.6, -0.05, G + 0.08, 0.2);
  puddle(kit, -1.3, 1.25, G, 0.3, 0.32, ORANGE);
  puddle(kit, 0.9, 1.6, G, 0.32, 0.28, MAGENTA);
  // A lifebuoy on its post at the quay's corner.
  cylinder(0.035, 0.04, 1.0, 0x23222b, 1.45, G, 0.75, { delay: 0.35 }, 8);
  const buoy = add(new TorusGeometry(0.2, 0.06, 8, 20), 0xe8e2d0, 1.45, G + 0.5, 0.82, { delay: 0.4, rotation: [0, -0.4, 0] });
  decorate(buoy, new BoxGeometry(0.14, 0.13, 0.13), MAGENTA, [
    [0, 0.06, 0],
    [0, 0.46, 0],
    [-0.2, 0.26, 0],
    [0.2, 0.26, 0],
  ]);

  // The bridge tower on its pier, a lit cabin on top and a dial with no numbers on its face.
  const TX = -1.6;
  const TZ = -1.05;
  cylinder(0.5, 0.55, 0.3, 0x2c3040, TX, F - 0.1, TZ, { delay: 0.12 }, 8);
  const tower = box(0.62, 2.7, 0.62, 0x2a3048, TX, F + 0.2, TZ, { delay: 0.16 });
  decorate(tower, new BoxGeometry(0.012, 0.5, 0.01), 0x1a1e2e, [0.45, 0.95, 1.45].flatMap((y) => [[-0.15, y, 0.315, 0.6], [0.15, y, 0.315, -0.6]] as [number, number, number, number][]));
  const cabin = box(0.8, 0.45, 0.78, 0x3a4058, TX, F + 2.9, TZ, { delay: 0.22 });
  decorate(cabin, new BoxGeometry(0.22, 0.2, 0.01), ORANGE, [
    [-0.2, 0.24, 0.395],
    [0.2, 0.24, 0.395],
  ]);
  box(0.9, 0.06, 0.88, STEEL_DARK, TX, F + 3.35, TZ, { delay: 0.25 });
  const lights = [-1, 1].map((side) => box(0.07, 0.07, 0.07, YELLOW, TX + side * 0.42, F + 3.41, TZ + 0.42, { delay: 0.3, flat: true, noInk: true }));
  const DY = F + 1.95;
  const DZ = TZ + 0.32;
  add(new CylinderGeometry(0.3, 0.3, 0.04, 24).rotateX(Math.PI / 2), 0xe8e2d0, TX, DY - 0.3, DZ, { delay: 0.3 });
  // The nine minutes of the lift, a wedge from the top; a rim with twelve notches.
  add(new CircleGeometry(0.26, 24, Math.PI / 2 - (Math.PI * 2 * 9) / 60, (Math.PI * 2 * 9) / 60), MAGENTA, TX, DY, DZ + 0.025, { delay: 0.34, flat: true, noInk: true });
  add(new TorusGeometry(0.27, 0.012, 4, 12), 0x2a3048, TX, DY - 0.282, DZ + 0.03, { delay: 0.34, flat: true, noInk: true });
  const hand = add(new BoxGeometry(0.03, 0.24, 0.02).translate(0, 0.12, 0), 0x14121c, TX, DY, DZ + 0.04, { delay: 0.36, flat: true, noInk: true });

  // The bascule leaf, hinged at the quay's edge: a deck with lattice girders, rising over the water.
  const HX = 0.95;
  const HZ = -0.22;
  const leafParts = [
    box(1.15, 0.1, 2.15, STEEL, 0, 0, -1.08, { delay: 0.4 }),
    ...[-1, 1].map((side) => box(0.07, 0.36, 2.15, STEEL_DARK, side * 0.54, 0.1, -1.08, { delay: 0.44 })),
    box(1.15, 0.36, 0.12, STEEL_DARK, 0, 0.1, -2.1, { delay: 0.46 }),
  ];
  [1, 2].forEach((i) =>
    [0.68, -0.68].forEach((lean) =>
      decorate(leafParts[i], new BoxGeometry(0.075, 0.03, 0.46).rotateX(lean), 0x4f5b78, Array.from({ length: 5 }, (_, k) => [0, 0.18, -0.86 + k * 0.43] as Point)),
    ),
  );
  decorate(leafParts[0], new BoxGeometry(0.9, 0.006, 0.03), YELLOW, [[0, 0.101, -0.05]]);
  const leaf = new Group();
  leaf.position.set(HX, G, HZ);
  leafParts[0].parent?.add(leaf);
  leafParts.forEach((part) => leaf.add(part));
  // The winch beside the hinge: a housing and a cog that turns as the leaf rises.
  box(0.36, 0.5, 0.5, STEEL_DARK, HX - 0.85, G, HZ + 0.35, { delay: 0.5 });
  const cogGeometry = new CylinderGeometry(0.28, 0.28, 0.07, 16).rotateZ(Math.PI / 2);
  const cog = add(cogGeometry, BRASS, HX - 0.62, G + 0.22, HZ + 0.35, { delay: 0.55 });
  cogGeometry.translate(0, -0.28, 0);
  cog.position.y = G + 0.5;
  decorate(cog, new BoxGeometry(0.075, 0.1, 0.08), BRASS, Array.from({ length: 10 }, (_, k) => [0, Math.cos((k / 10) * Math.PI * 2) * 0.3, Math.sin((k / 10) * Math.PI * 2) * 0.3] as Point));
  decorate(cog, new BoxGeometry(0.08, 0.36, 0.06), 0x8a6a2a, [[0, 0, 0]]);

  // Bascule: stocky, grey curls, navy oilskin, the bridge key across her body.
  const keeper = figure(kit, {
    x: -0.15,
    z: 0.85,
    y: G,
    facing: 0.3,
    height: 2.3,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "curly", color: 0xa8a8b4 },
    face: { mouth: "smirk", brows: "calm", marks: 0xa87a62 },
    top: { kind: "coat", color: 0x23407a, accent: 0x2f5a9a },
    bottom: { kind: "trousers", color: 0x1c2a4a },
    shoes: 0x2a2622,
    arms: [
      [-0.2, 1.34, 0.42],
      [0.12, 0.86, 0.44],
    ],
    delay: 0.7,
  });
  const at = keeper.at;
  // Brass buttons, and the red ear defenders round her neck.
  [1.42, 1.18, 0.94].forEach((y, i) => kit.ball(0.035, BRASS, ...at(0.13, y - 0.035, 0.36), { delay: 1.2 + i * 0.02 }));
  [-1, 1].forEach((side) => kit.ball(0.085, 0xe02a40, ...at(side * 0.17, 1.62, 0.04), { delay: 1.25 }));
  add(new TorusGeometry(0.17, 0.025, 6, 16, Math.PI).rotateX(-0.3), 0x2a2622, ...at(0, 1.66, 0.0), { delay: 1.27, rotation: [0, 0.3, 0] });
  // The key: a long brass shaft with a T-handle.
  const top: Point = at(-0.3, 1.6, 0.42);
  const foot: Point = at(0.34, 0.3, 0.47);
  limb(kit, top, foot, 0.035, 0.035, BRASS, { delay: 1.3 });
  limb(kit, at(-0.5, 1.5, 0.42), at(-0.1, 1.72, 0.42), 0.04, 0.04, BRASS, { delay: 1.32 });
  kit.box(0.08, 0.1, 0.08, 0x8a6a2a, foot[0], foot[1] - 0.06, foot[2], { delay: 1.34 });

  // Rain, falling all the time.
  const drops = Array.from({ length: 34 }, (_, k) => [-2 + ((k * 37) % 40) / 10, -1.9 + ((k * 23) % 38) / 10, k] as Point)
    .filter(([x, z]) => Math.abs(x) + Math.abs(z) < 3.1)
    .map(([x, z, k]) => {
      const part = box(0.012, 0.22, 0.012, 0x9fd8ff, x, G + 3, z, { delay: 0.6, flat: true, noInk: true });
      return { part, phase: (k * 0.37) % 1, ground: z > -0.25 ? G : F };
    });

  tick((t) => {
    // The leaf creeps up and settles back; the cog turns with it; the dial's hand crawls.
    const angle = 0.72 + 0.25 * Math.sin(t * 0.25);
    leaf.rotation.x = angle;
    cog.rotation.x = angle * 6;
    hand.rotation.z = -(Math.PI * 2 * (7 + 2 * Math.sin(t * 0.25))) / 60;
    drops.forEach(({ part, phase, ground }) => (part.position.y = ground + (1 - ((t * 1.4 + phase) % 1)) * 3));
    lights.forEach((light, i) => (light.visible = Math.floor(t * 2 + i) % 3 !== 0));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
