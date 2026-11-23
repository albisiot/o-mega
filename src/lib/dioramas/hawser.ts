import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from "three";
import {
  YELLOW,
  CYAN,
  MAGENTA,
  INK,
  colorOf,
  octagonBase,
  aim,
  limb,
  cable,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/**
 * Hawser (P013): the colossus of the port never moves, so the port uses him as a bollard. On
 * the pier under a crane, a tug strains at the hawser tied round his waist and churns the water,
 * and he stands with his fists on his hips, the tattoos on his forearms glowing. The price of
 * standing still shows: barnacles on his boots, seaweed on his coat, a gull asleep on his head.
 */
export function hawser(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WATER = 0x0e3a4e;
  const FOAM = 0xcfeef7;
  const WOOD = 0x5e4a3a;
  const WOOD_DARK = 0x3e3028;
  const PLANK = 0x2e241e;
  const STEEL = 0x4a4f5c;
  const DARK = 0x23222b;
  const HULL = 0x2a2238;
  const DECK = 0x4a4f5c;
  const CABIN = 0xe0dacb;
  const SKIN = 0xc48c68;
  const SKIN_DARK = 0x9e6a4c;
  const HAIR = 0x1f1b22;
  const COAT = 0x23404b;
  const COAT_LIGHT = 0x2f5866;
  const TROUSERS = 0x2b2f3a;
  const BOOT = 0x2a2622;
  const SHIRT = 0xd8d2c4;
  const STRIPE = 0x2c5a72;
  const ROPE = 0xc9a46a;
  const BARNACLE = 0xcfc9bb;
  const WEED = 0x2f8f4f;
  const VIOLET = 0x9b5cff;
  const GULL = 0xf2f0ea;
  const GULL_GREY = 0x9aa0ab;

  const F = octagonBase(kit, WATER);

  /** A ring spreading on the water, again and again. */
  const ripple = (x: number, z: number, radius: number, period: number, phase: number, delay: number) => {
    const ring = add(new TorusGeometry(radius, 0.018, 6, 36).rotateX(Math.PI / 2), FOAM, x, F + 0.002, z, {
      delay,
      flat: true,
      noInk: true,
    });
    const mesh = ring.children[0];
    tick((t) => {
      const u = ((Math.max(0, t - delay) + phase) / period) % 1;
      mesh.scale.set(0.4 + u, 1, 0.4 + u);
      mesh.visible = u < 0.85;
    });
  };

  // The pier: pilings in the water, the deck of planks, a bull rail along its edge and an idle bollard.
  [
    [-0.6, 1.1],
    [-0.6, 0.35],
    [-0.6, -0.4],
    [-0.6, -1.15],
    [0.4, 1.15],
    [1.2, 1.15],
  ].forEach(([x, z], i) => cylinder(0.08, 0.08, 0.3, WOOD_DARK, x, F, z, { delay: 0.1 + i * 0.02 }, 10));
  const deck = box(2.55, 0.12, 2.6, WOOD, 0.575, F + 0.28, -0.05, { delay: 0.16, ink: 1.02 });
  decorate(
    deck,
    new BoxGeometry(2.55, 0.006, 0.014),
    PLANK,
    Array.from({ length: 13 }, (_, i) => [0, 0.121, -1.2 + i * 0.2] as Point),
  );
  const G = F + 0.4;
  box(0.1, 0.1, 2.6, WOOD_DARK, -0.64, G, -0.05, { delay: 0.22 });
  cylinder(0.11, 0.13, 0.22, STEEL, -0.4, G, 0.95, { delay: 0.26 });
  cylinder(0.16, 0.16, 0.05, STEEL, -0.4, G + 0.22, 0.95, { delay: 0.28 });
  ripple(-0.6, 1.1, 0.16, 2.6, 0, 0.6);
  ripple(0.4, 1.15, 0.16, 2.6, 1.3, 0.6);

  // Containers at the back, and the crane over them with its hook.
  const containers: [number, number, number, number, number][] = [
    [-0.25, 0, -1.0, 0x1f7f9c, 0],
    [-0.2, 0.42, -1.0, 0xcfc6b0, 0.08],
    [0.55, 0, -1.05, 0x7a2f55, 0],
  ];
  containers.forEach(([x, y, z, color, turn], i) => {
    const container = box(0.75, 0.42, 0.42, color, x, G + y, z, { delay: 0.3 + i * 0.06, rotation: [0, turn, 0] });
    decorate(
      container,
      new BoxGeometry(0.012, 0.36, 0.01),
      PLANK,
      Array.from({ length: 6 }, (_, k) => [-0.3 + k * 0.12, 0.21, 0.215] as Point),
    );
  });
  const CX = 1.45;
  const CZ = -0.95;
  const tower = box(0.16, 3, 0.16, YELLOW, CX, G, CZ, { delay: 0.4 });
  decorate(
    tower,
    new BoxGeometry(0.012, 0.2, 0.012),
    INK,
    Array.from({ length: 9 }, (_, k) => [0, 0.25 + k * 0.3, 0.085, k % 2 ? 0.7 : -0.7] as [number, number, number, number]),
  );
  const cab = box(0.34, 0.26, 0.3, YELLOW, CX, G + 2.7, CZ + 0.05, { delay: 0.5 });
  decorate(cab, new BoxGeometry(0.22, 0.1, 0.01), CYAN, [[0, 0.16, 0.155]]);
  box(2.7, 0.1, 0.12, YELLOW, CX - 0.95, G + 3, CZ, { delay: 0.56 });
  box(0.3, 0.22, 0.2, STEEL, CX + 0.3, G + 2.78, CZ, { delay: 0.6 });
  box(0.012, 0.9, 0.012, INK, -0.35, G + 2.1, CZ, { delay: 0.64, noInk: true });
  box(0.16, 0.14, 0.14, DARK, -0.35, G + 1.96, CZ, { delay: 0.68 });

  // The tug, bow to the open water, straining at the line; foam churns at its stern.
  const hullShape = (scale: number) => {
    const shape = new Shape();
    shape.moveTo(0.68 * scale, -0.36 * scale);
    shape.lineTo(-0.25 * scale, -0.38 * scale);
    shape.quadraticCurveTo(-0.62 * scale, -0.32 * scale, -0.75 * scale, 0);
    shape.quadraticCurveTo(-0.62 * scale, 0.32 * scale, -0.25 * scale, 0.38 * scale);
    shape.lineTo(0.68 * scale, 0.36 * scale);
    shape.quadraticCurveTo(0.8 * scale, 0, 0.68 * scale, -0.36 * scale);
    return shape;
  };
  const hull = (scale: number, depth: number) =>
    new ExtrudeGeometry(hullShape(scale), { depth, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2);
  const TX = -1.5;
  const TZ = 0.3;
  const tug: Group[] = [
    add(hull(1, 0.32), HULL, TX, F - 0.04, TZ, { delay: 0.5 }),
    add(hull(1.03, 0.05), MAGENTA, TX, F + 0.2, TZ, { delay: 0.54, flat: true, noInk: true }),
    add(hull(0.88, 0.04), DECK, TX, F + 0.27, TZ, { delay: 0.56, noInk: true }),
  ];
  const cabin = box(0.52, 0.34, 0.44, CABIN, TX - 0.12, F + 0.3, TZ, { delay: 0.6 });
  decorate(cabin, new BoxGeometry(0.12, 0.09, 0.01), CYAN, [
    [-0.12, 0.22, 0.225],
    [0.12, 0.22, 0.225],
  ]);
  tug.push(
    cabin,
    box(0.6, 0.05, 0.5, HULL, TX - 0.12, F + 0.64, TZ, { delay: 0.64 }),
    cylinder(0.08, 0.1, 0.34, HULL, TX + 0.22, F + 0.3, TZ, { delay: 0.66 }),
    cylinder(0.105, 0.105, 0.06, CYAN, TX + 0.22, F + 0.52, TZ, { delay: 0.68, flat: true, noInk: true }),
    cylinder(0.05, 0.06, 0.14, STEEL, TX + 0.55, F + 0.3, TZ, { delay: 0.7 }),
    ...[-0.2, 0.25].map((dx, i) =>
      add(new TorusGeometry(0.07, 0.03, 6, 14), DARK, TX + dx, F + 0.08, TZ + 0.38, { delay: 0.72 + i * 0.03, noInk: true }),
    ),
  );
  const rest = tug.map((part) => part.position.y);
  tick((t) => tug.forEach((part, i) => (part.position.y = rest[i] + Math.sin(t * 2.4) * 0.025)));
  ripple(TX + 0.75, TZ, 0.28, 1.6, 0, 0.9);
  ripple(TX + 0.75, TZ, 0.28, 1.6, 0.8, 0.9);
  motes(10, FOAM, 0.03, [TX + 0.6, F, TZ - 0.25], [TX + 0.85, F + 0.25, TZ + 0.25], 1);

  // Hawser, a head taller than the crane's cab is wide, fists on his hips.
  const x0 = 0.75;
  const z0 = 0.3;
  const D = 0.95;
  [-1, 1].forEach((side, i) => {
    const boot = box(0.26, 0.16, 0.4, BOOT, x0 + side * 0.2, G, z0 + 0.06, { delay: D + i * 0.02 });
    decorate(boot, new ConeGeometry(0.035, 0.07, 6), BARNACLE, [
      [-0.07, 0.17, 0.12],
      [0.05, 0.17, 0.05],
      [0.09, 0.12, 0.2],
      [-0.1, 0.08, 0.2],
    ]);
    cylinder(0.17, 0.18, 0.75, TROUSERS, x0 + side * 0.2, G + 0.12, z0, { delay: D + 0.04 + i * 0.02 });
  });
  // Cracks in the planks under his weight.
  [
    [-0.55, 0.85, 0.6],
    [0.5, 0.9, -0.5],
    [0.05, 1.0, 0.1],
  ].forEach(([dx, dz, angle], i) =>
    box(0.36, 0.008, 0.022, INK, x0 + dx * 0.9, G, z0 + dz - 0.3, { delay: D + 0.06 + i * 0.03, flat: true, noInk: true, rotation: [0, angle, 0] }),
  );
  const skirt = add(new CylinderGeometry(0.5, 0.62, 0.9, 18).scale(1, 1, 0.75), COAT, x0, G + 0.55, z0, { delay: D + 0.1 });
  decorate(
    skirt,
    new BoxGeometry(0.03, 0.2, 0.01),
    WEED,
    [-0.9, -0.4, 0.2, 0.75, 1.3].map((angle, i) => [Math.sin(angle) * 0.6, -0.06, Math.cos(angle) * 0.46, i % 2 ? 0.25 : -0.2] as [number, number, number, number]),
  );
  add(new CylinderGeometry(0.66, 0.52, 0.8, 18).scale(1, 1, 0.72), COAT, x0, G + 1.4, z0, { delay: D + 0.16 });
  // A striped sailor's shirt where the coat is open.
  const shirt = box(0.34, 0.75, 0.03, SHIRT, x0, G + 1.42, z0 + 0.38, { delay: D + 0.2, rotation: [0.15, 0, 0], noInk: true });
  decorate(
    shirt,
    new BoxGeometry(0.34, 0.035, 0.01),
    STRIPE,
    Array.from({ length: 6 }, (_, k) => [0, 0.1 + k * 0.12, 0.016] as Point),
  );
  // The hawser, twice round his waist, and the line down to the tug's stern.
  add(new TorusGeometry(0.58, 0.05, 8, 36).rotateX(Math.PI / 2).scale(1, 1, 0.78), ROPE, x0, G + 1.15, z0, { delay: D + 0.24 });
  add(new TorusGeometry(0.6, 0.05, 8, 36).rotateX(Math.PI / 2).scale(1, 1, 0.78), ROPE, x0, G + 1.04, z0, { delay: D + 0.26 });
  const knot: Point = [x0 - 0.56, G + 1.2, z0 + 0.12];
  ball(0.075, ROPE, knot[0], knot[1] - 0.075, knot[2], { delay: D + 0.3 });
  cable(kit, [knot, [-0.38, 1.06, 0.36], [TX + 0.55, F + 0.44, TZ]], 0.04, ROPE, 1.55);

  // Arms: sleeves rolled to the elbow, fists on his hips, glowing rings tattooed round the forearms.
  const rings: Group[] = [];
  [-1, 1].forEach((side, i) => {
    ball(0.3, COAT, x0 + side * 0.62, G + 1.88, z0, { delay: D + 0.22 + i * 0.03 });
    const shoulder: Point = [x0 + side * 0.72, G + 2.12, z0];
    const elbow: Point = [x0 + side * 1.02, G + 1.72, z0 - 0.02];
    const fist: Point = [x0 + side * 0.62, G + 1.42, z0 + 0.14];
    limb(kit, shoulder, elbow, 0.2, 0.18, COAT, { delay: D + 0.28 });
    ball(0.19, COAT_LIGHT, elbow[0], elbow[1] - 0.19, elbow[2], { delay: D + 0.3 });
    limb(kit, elbow, fist, 0.17, 0.15, SKIN, { delay: D + 0.32 });
    ball(0.15, SKIN, fist[0], fist[1] - 0.15, fist[2], { delay: D + 0.36 });
    const { rotation } = aim(elbow, fist);
    [0.3, 0.52, 0.74].forEach((u, k) => {
      const at: Point = [
        MathUtils.lerp(elbow[0], fist[0], u),
        MathUtils.lerp(elbow[1], fist[1], u),
        MathUtils.lerp(elbow[2], fist[2], u),
      ];
      const radius = 0.17 - 0.02 * u + 0.008;
      rings.push(
        add(new TorusGeometry(radius, 0.017, 6, 24).rotateX(Math.PI / 2), MAGENTA, ...at, {
          delay: D + 0.5 + k * 0.05,
          flat: true,
          noInk: true,
          rotation,
        }),
      );
    });
  });
  const glowFrom = new Color(MAGENTA);
  const glowTo = new Color(VIOLET);
  tick((t) => {
    const k = (Math.sin(t * 1.8) + 1) / 2;
    for (const ring of rings) colorOf(ring).lerpColors(glowFrom, glowTo, k);
  });

  // His head: black curls, a full black beard, heavy brows.
  cylinder(0.15, 0.17, 0.18, SKIN, x0, G + 2.15, z0, { delay: D + 0.36 });
  add(new SphereGeometry(0.24, 16, 12).scale(1.05, 1.15, 0.85), HAIR, x0, G + 2.02, z0 + 0.1, { delay: D + 0.42 });
  const head = add(new SphereGeometry(0.25, 18, 14).scale(0.95, 1.05, 0.95), SKIN, x0, G + 2.25, z0, { delay: D + 0.4 });
  const cy = 0.2625;
  decorate(head, new BoxGeometry(0.06, 0.03, 0.02), INK, [
    [-0.085, cy + 0.04, 0.225],
    [0.085, cy + 0.04, 0.225],
  ]);
  decorate(head, new BoxGeometry(0.11, 0.04, 0.04), HAIR, [
    [-0.085, cy + 0.09, 0.21],
    [0.085, cy + 0.09, 0.21],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.1, 0.07), SKIN_DARK, [[0, cy - 0.01, 0.24]]);
  ball(0.235, HAIR, x0, G + 2.36, z0 - 0.05, { delay: D + 0.46 });
  [
    [-0.15, 0.2, -0.08],
    [0.15, 0.2, -0.08],
    [0, 0.24, 0.02],
    [-0.2, 0.05, -0.12],
    [0.2, 0.05, -0.12],
  ].forEach(([dx, dy, dz], i) => ball(0.08, HAIR, x0 + dx, G + 2.6 + dy - 0.08, z0 + dz, { delay: D + 0.5 + i * 0.02, ink: 1.1 }));

  // The gull asleep on his head, now and then looking round.
  const gy = G + 2.84;
  add(new SphereGeometry(0.1, 12, 10).scale(1.5, 0.85, 0.85), GULL, x0 + 0.03, gy, z0, { delay: 1.85 });
  [-1, 1].forEach((side) =>
    box(0.26, 0.03, 0.07, GULL_GREY, x0 + 0.06, gy + 0.1, z0 + side * 0.07, { delay: 1.9, rotation: [side * 0.25, 0, -0.1] }),
  );
  box(0.1, 0.03, 0.08, GULL_GREY, x0 + 0.2, gy + 0.1, z0, { delay: 1.92, rotation: [0, 0, 0.3] });
  const gullHead = ball(0.06, GULL, x0 - 0.12, gy + 0.1, z0, { delay: 1.95 });
  decorate(gullHead, new ConeGeometry(0.02, 0.08, 6).rotateZ(Math.PI / 2), YELLOW, [[-0.08, 0.055, 0]]);
  decorate(gullHead, new BoxGeometry(0.015, 0.015, 0.01), INK, [
    [-0.03, 0.075, 0.05],
    [-0.03, 0.075, -0.05],
  ]);
  tick((t) => {
    const look = Math.sin(t * 0.7);
    gullHead.rotation.y = look > 0.6 ? 0.9 : look < -0.6 ? -0.9 : 0;
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
