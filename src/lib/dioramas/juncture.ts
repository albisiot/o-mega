import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import {
  YELLOW,
  ORANGE,
  CYAN,
  INK,
  colorOf,
  octagonBase,
  aim,
  limb,
  zigzag,
  crawl,
  cable,
  archedWall,
  archMouth,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/**
 * Juncture (P028): the old electrician of the Lanterne mends a live cable with his bare hands
 * on the platform at a metro tunnel's mouth, under his work lantern, and the sparks run up his
 * arm. A train's lights grow in the dark of the tunnel.
 */
export function juncture(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x2a2f3c;
  const BALLAST = 0x3a3742;
  const SLEEPER = 0x4a3a32;
  const RAIL = 0x9aa3b3;
  const CONCRETE = 0x46505f;
  const JOINT = 0x2c323e;
  const BRICK = 0x6e3550;
  const BRICK_LIGHT = 0x8a4766;
  const MORTAR = 0x2a1622;
  const NIGHT = 0x08070d;
  const DIM = 0x0b3d50;
  const POLE = 0x4b3a30;
  const STEEL = 0x6c7686;
  const TOOLBOX = 0x2c6e8a;
  const CABLE = 0x17161d;
  const COPPER = 0xd9822b;
  const SKIN = 0xd9a07a;
  const SKIN_DARK = 0xb27a58;
  const HAIR = 0xc4beb4;
  const SHIRT = 0x2f6f86;
  const SHIRT_LIGHT = 0x4a8ea5;
  const DENIM = 0x23364d;
  const LEATHER = 0x6b4a2a;
  const BOOT = 0x33261f;

  const F = octagonBase(kit, SLAB);

  // The track out of the tunnel: ballast, sleepers, two rails, and the third rail under its yellow cover.
  const TRACK = -0.6;
  box(1.45, 0.06, 3.2, BALLAST, TRACK, F, 0.1, { delay: 0.1, ink: 1.02 });
  for (let i = 0; i < 9; i++) {
    box(1.05, 0.05, 0.16, SLEEPER, TRACK, F + 0.06, -1.38 + i * 0.37, { delay: 0.14 + i * 0.02, noInk: true });
  }
  [-0.3, 0.3].forEach((dx, i) => box(0.07, 0.08, 3.2, RAIL, TRACK + dx, F + 0.11, 0.1, { delay: 0.32 + i * 0.04, ink: 1.04 }));
  for (let i = 0; i < 5; i++) box(0.06, 0.07, 0.06, STEEL, 0.02, F + 0.06, -1.1 + i * 0.6, { delay: 0.36, noInk: true });
  box(0.1, 0.06, 3, 0xc99a1c, 0.02, F + 0.13, 0.15, { delay: 0.4 });

  // The platform, with its yellow edge line and the joints of its slabs.
  const platform = box(1.7, 0.16, 2.35, CONCRETE, 1.05, F, 0.025, { delay: 0.12, ink: 1.02 });
  decorate(platform, new BoxGeometry(1.7, 0.004, 0.012), JOINT, [
    [0, 0.162, -0.55],
    [0, 0.162, 0.2],
    [0, 0.162, 0.85],
  ]);
  const G = F + 0.16;
  box(0.07, 0.006, 2.35, YELLOW, 0.3, G, 0.025, { delay: 0.42, flat: true, noInk: true });

  // The brick wall with the tunnel's arch, dark inside, and the train's two lamps far in.
  const WALL_X = 0.025;
  const arch = { x: TRACK - WALL_X, half: 0.6, spring: 1.1 };
  const wall = add(archedWall(3.45, 2.3, 0.36, arch), BRICK, WALL_X, F, -1.3, { delay: 0.2, ink: 1.02 });
  const front = 0.185;
  decorate(
    wall,
    new BoxGeometry(0.5, 0.018, 0.01),
    MORTAR,
    [0.28, 0.56, 0.84, 1.12, 1.4].map((y) => [-1.475, y, front] as Point),
  );
  decorate(
    wall,
    new BoxGeometry(1.72, 0.018, 0.01),
    MORTAR,
    [0.28, 0.56, 0.84, 1.12, 1.4].map((y) => [0.86, y, front] as Point),
  );
  decorate(wall, new BoxGeometry(3.4, 0.018, 0.01), MORTAR, [
    [0, 1.92, front],
    [0, 2.16, front],
  ]);
  decorate(
    wall,
    new BoxGeometry(0.018, 0.26, 0.01),
    MORTAR,
    [
      [-1.55, 0.14], [0.3, 0.14], [1.1, 0.14], [-1.35, 0.42], [0.65, 0.42], [1.45, 0.42],
      [-1.6, 0.7], [0.25, 0.7], [1.2, 0.7], [-1.3, 0.98], [0.75, 0.98], [1.5, 0.98],
      [-1.5, 1.26], [0.4, 1.26], [1.05, 1.26], [-1.2, 2.04], [-0.3, 2.04], [0.9, 2.04],
    ].map(([x, y]) => [x, y, front] as Point),
  );
  add(new TorusGeometry(0.66, 0.06, 6, 24, Math.PI), BRICK_LIGHT, TRACK, F + arch.spring - 0.06, -1.12, { delay: 0.3, noInk: true });
  add(archMouth(arch.half, arch.spring), NIGHT, TRACK, F, -1.47, { delay: 0.22, flat: true, noInk: true });
  const lamps = [-0.25, 0.25].map((dx, i) =>
    box(0.16, 0.1, 0.02, CYAN, TRACK + dx, F + 0.4, -1.44, { delay: 0.5 + i * 0.03, flat: true, noInk: true }),
  );

  // The pole: insulators, a transformer, the wires to the wall, and his work lantern.
  const PX = 1.45;
  const PZ = -0.6;
  cylinder(0.07, 0.09, 2.9, POLE, PX, G, PZ, { delay: 0.5 }, 8);
  box(1, 0.08, 0.08, POLE, PX, G + 2.62, PZ, { delay: 0.6 });
  [-0.4, 0, 0.4].forEach((dx, i) => cylinder(0.035, 0.05, 0.1, CYAN, PX + dx, G + 2.7, PZ, { delay: 0.66 + i * 0.03 }));
  cylinder(0.16, 0.16, 0.42, STEEL, PX + 0.2, G + 1.75, PZ, { delay: 0.62 });
  cylinder(0.17, 0.17, 0.04, CABLE, PX + 0.2, G + 2.17, PZ, { delay: 0.66 });
  cable(kit, [[PX - 0.4, G + 2.8, PZ], [0.2, G + 2.38, -0.95], [-1.4, F + 2.3, -1.25]], 0.018, CABLE, 0.85);
  cable(kit, [[PX, G + 2.8, PZ], [0.95, G + 2.48, -0.95], [0.4, F + 2.3, -1.25]], 0.018, CABLE, 0.9);
  cable(kit, [[PX + 0.4, G + 2.8, PZ], [1.62, G + 2.5, -0.92], [1.55, F + 2.3, -1.25]], 0.018, CABLE, 0.95);
  box(0.34, 0.04, 0.04, POLE, PX - 0.22, G + 2.2, PZ, { delay: 0.7 });
  box(0.012, 0.18, 0.012, INK, PX - 0.36, G + 2.04, PZ, { delay: 0.72, noInk: true });
  const lantern = box(0.15, 0.2, 0.15, YELLOW, PX - 0.36, G + 1.84, PZ, { delay: 0.74, flat: true });
  cylinder(0.02, 0.11, 0.07, CABLE, PX - 0.36, G + 2.04, PZ, { delay: 0.76 });
  // A coil of spare cable by the pole and his toolbox.
  [0, 0.07].forEach((y, i) =>
    add(new TorusGeometry(0.17, 0.035, 6, 20).rotateX(Math.PI / 2), CABLE, 1.55, G + y, 0.05, {
      delay: 0.78 + i * 0.04,
      noInk: true,
    }),
  );
  const toolbox = box(0.42, 0.2, 0.24, TOOLBOX, 0.48, G, 1.0, { delay: 0.8, rotation: [0, 0.3, 0] });
  decorate(toolbox, new BoxGeometry(0.24, 0.04, 0.04), YELLOW, [[0, 0.24, 0]]);

  // Juncture: an old man in a shirt with rolled sleeves and overalls, his tool belt round his belly.
  const x0 = 0.85;
  const z0 = 0.4;
  const D = 1;
  [-1, 1].forEach((side, i) => {
    box(0.2, 0.13, 0.32, BOOT, x0 + side * 0.16, G, z0 + 0.06, { delay: D + i * 0.02 });
    cylinder(0.13, 0.14, 0.7, DENIM, x0 + side * 0.16, G + 0.08, z0, { delay: D + 0.04 + i * 0.02 });
  });
  add(new CylinderGeometry(0.36, 0.34, 0.2, 16).scale(1, 1, 0.8), DENIM, x0, G + 0.66, z0, { delay: D + 0.08 });
  add(new SphereGeometry(0.37, 18, 14).scale(1.05, 0.95, 0.85), DENIM, x0, G + 0.78, z0 + 0.06, { delay: D + 0.1 });
  add(new CylinderGeometry(0.42, 0.4, 0.6, 16).scale(1, 1, 0.8), SHIRT, x0, G + 1.08, z0, { delay: D + 0.14 });
  box(0.42, 0.36, 0.07, DENIM, x0, G + 1.16, z0 + 0.33, { delay: D + 0.18 });
  [-1, 1].forEach((side, i) => {
    const strap = aim([x0 + side * 0.16, G + 1.5, z0 + 0.37], [x0 + side * 0.2, G + 1.7, z0 + 0.22]);
    box(0.06, strap.length, 0.03, DENIM, x0 + side * 0.16, G + 1.5, z0 + 0.37, { delay: D + 0.2, rotation: strap.rotation, ink: 1.1 });
    ball(0.03, YELLOW, x0 + side * 0.16, G + 1.47, z0 + 0.38, { delay: D + 0.24 + i * 0.02, noInk: true });
  });
  add(new CylinderGeometry(0.38, 0.38, 0.09, 16).scale(1, 1, 0.84), LEATHER, x0, G + 0.7, z0, { delay: D + 0.22 });
  [-1, 1].forEach((side, i) => box(0.15, 0.17, 0.09, LEATHER, x0 + side * 0.3, G + 0.56, z0 + 0.24, { delay: D + 0.26 + i * 0.02 }));
  [
    [-0.33, 0.68, 0.24],
    [-0.27, 0.7, 0.25],
    [0.3, 0.68, 0.24],
  ].forEach(([dx, y, dz], i) => cylinder(0.022, 0.022, 0.17, YELLOW, x0 + dx, G + y, z0 + dz, { delay: D + 0.3 + i * 0.02 }));

  // The right arm hangs; the left holds the cable up in front of him.
  [-1, 1].forEach((side, i) => ball(0.16, SHIRT, x0 + side * 0.4, G + 1.4, z0, { delay: D + 0.24 + i * 0.02 }));
  const shoulderR: Point = [x0 - 0.44, G + 1.55, z0];
  const elbowR: Point = [x0 - 0.5, G + 1.12, z0 + 0.04];
  limb(kit, shoulderR, elbowR, 0.12, 0.11, SHIRT, { delay: D + 0.28 });
  cylinder(0.12, 0.12, 0.07, SHIRT_LIGHT, x0 - 0.5, G + 1.06, z0 + 0.04, { delay: D + 0.3 });
  limb(kit, [x0 - 0.5, G + 1.08, z0 + 0.04], [x0 - 0.49, G + 0.72, z0 + 0.12], 0.095, 0.08, SKIN, { delay: D + 0.32 });
  ball(0.085, SKIN, x0 - 0.49, G + 0.6, z0 + 0.13, { delay: D + 0.34 });
  const shoulderL: Point = [x0 + 0.44, G + 1.55, z0];
  const elbowL: Point = [x0 + 0.58, G + 1.18, z0 + 0.12];
  const hand: Point = [x0 + 0.42, G + 1.5, z0 + 0.55];
  limb(kit, shoulderL, elbowL, 0.12, 0.11, SHIRT, { delay: D + 0.28 });
  ball(0.115, SHIRT_LIGHT, elbowL[0], elbowL[1] - 0.115, elbowL[2], { delay: D + 0.3 });
  limb(kit, elbowL, hand, 0.1, 0.085, SKIN, { delay: D + 0.32 });
  ball(0.1, SKIN, hand[0], hand[1] - 0.1, hand[2], { delay: D + 0.36 });

  // His head: grey hair, a big moustache, a smile.
  cylinder(0.09, 0.1, 0.12, SKIN, x0, G + 1.62, z0, { delay: D + 0.36 });
  const head = add(new SphereGeometry(0.21, 18, 14).scale(0.95, 1.05, 0.95), SKIN, x0, G + 1.7, z0 + 0.02, { delay: D + 0.4 });
  const cy = 0.2205;
  decorate(head, new BoxGeometry(0.05, 0.03, 0.02), INK, [
    [-0.075, cy + 0.04, 0.19],
    [0.075, cy + 0.04, 0.19],
  ]);
  decorate(head, new BoxGeometry(0.08, 0.025, 0.03), HAIR, [
    [-0.075, cy + 0.085, 0.18],
    [0.075, cy + 0.085, 0.18],
  ]);
  decorate(head, new BoxGeometry(0.06, 0.08, 0.06), SKIN_DARK, [[0, cy - 0.005, 0.2]]);
  decorate(head, new BoxGeometry(0.22, 0.055, 0.07), HAIR, [[0, cy - 0.065, 0.185]]);
  decorate(head, new BoxGeometry(0.08, 0.012, 0.01), INK, [[0, cy - 0.11, 0.175]]);
  decorate(head, new SphereGeometry(0.04, 8, 6), SKIN_DARK, [
    [-0.195, cy, 0],
    [0.195, cy, 0],
  ]);
  ball(0.2, HAIR, x0, G + 1.75, z0 - 0.03, { delay: D + 0.44 });
  [
    [-0.12, 0.17, -0.06],
    [0.12, 0.17, -0.06],
    [0, 0.2, 0.04],
  ].forEach(([dx, dy, dz], i) => ball(0.07, HAIR, x0 + dx, G + 1.92 + dy - 0.07, z0 + dz, { delay: D + 0.48 + i * 0.02, ink: 1.1 }));

  // The live cable from the transformer, through his hand, frayed and sparking past it.
  const end: Point = [hand[0] - 0.1, hand[1] + 0.19, hand[2] + 0.05];
  cable(kit, [[PX + 0.2, G + 1.78, PZ + 0.05], [1.6, G + 0.45, 0], [1.45, G + 0.9, 0.7], hand, end], 0.04, CABLE, 1.5);
  [
    [-0.08, 0.06, 0.03],
    [-0.02, 0.1, 0.05],
    [0.04, 0.08, 0.06],
    [-0.1, 0, 0.06],
  ].forEach(([dx, dy, dz], i) => zigzag(kit, [end, [end[0] + dx, end[1] + dy, end[2] + dz]], 0.018, COPPER, 1.6 + i * 0.02));
  // Two sparks winding up his arm, from the frayed end to the shoulder.
  const arm: Point[] = [end, hand, elbowL, shoulderL];
  const sparkA = zigzag(kit, crawl(arm, 3, 0.19, 0), 0.035, YELLOW, 1.7);
  const sparkB = zigzag(kit, crawl(arm, 3, 0.2, Math.PI), 0.035, YELLOW, 1.72);
  motes(6, YELLOW, 0.03, [end[0] - 0.12, end[1] - 0.05, end[2] - 0.08], [end[0] + 0.18, end[1] + 0.35, end[2] + 0.12], 1.8);

  const lanternFrom = new Color(YELLOW);
  const lanternTo = new Color(ORANGE);
  const lampFrom = new Color(DIM);
  const lampTo = new Color(CYAN);
  tick((t) => {
    colorOf(lantern).lerpColors(lanternFrom, lanternTo, ((Math.sin(t * 1.4) + 1) / 2) * 0.5);
    // The train's lamps brighten slowly, then the tunnel is dark again.
    const near = ((t * 0.25) % 1) ** 2;
    for (const lamp of lamps) colorOf(lamp).lerpColors(lampFrom, lampTo, near);
    // The sparks crackle: the first goes out one beat in five, the second comes and goes.
    const beat = Math.floor(t * 12);
    const noise = Math.sin(beat * 12.9898) * 43758.5453;
    const a = beat % 5 !== 4;
    const b = noise - Math.floor(noise) > 0.5;
    for (const part of sparkA) part.visible = a;
    for (const part of sparkB) part.visible = b;
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
