import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from "three";
import {
  YELLOW,
  ORANGE,
  CYAN,
  INK,
  octagonBase,
  aim,
  limb,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/**
 * Mongibello (P060): he holds a volcano inside, and the volcano behind him is erupting. He stands
 * on the lava field above Nuova Megara, one rock fist clenched, the lava glowing in the cracks of
 * his forearms. In his other hand the price of his gift: the phone he cannot use, held the wrong
 * way round, melting drop by drop onto the ground.
 */
export function mongibello(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const ROCK = 0x2e2629;
  const ROCK_LIGHT = 0x3d3237;
  const CONE = 0x3a2b31;
  const LAVA = 0xff5a1f;
  const SMOKE = 0x5a2148;
  const SKIN = 0xc98d6c;
  const SKIN_DARK = 0xa06a4e;
  const STUBBLE = 0x6b4f45;
  const STONE_SKIN = 0x5d4c50;
  const HAIR = 0x2a1e1c;
  const SHIRT = 0x34455a;
  const SHIRT_LIGHT = 0x46596f;
  const TEE = 0x8f8c88;
  const TROUSERS = 0x2c3a4a;
  const TROUSERS_LIGHT = 0x3a4b5e;
  const BOOT = 0x3a2c26;
  const PHONE = 0x5a6474;

  const F = octagonBase(kit, ROCK);
  const glowing: MeshBasicMaterial[] = [];
  const glow = (part: Group) => {
    glowing.push((part.children[0] as Mesh).material as MeshBasicMaterial);
    return part;
  };

  // The lava field: dark rocks, and a lava flow from the volcano's foot towards the front.
  [
    [-1.7, 0.6, 0.2],
    [-1.3, 1.3, 0.16],
    [0.3, 1.55, 0.14],
    [-1.9, -0.4, 0.24],
    [1.9, 0.35, 0.18],
    [-0.7, -1.35, 0.22],
    [0.1, -0.55, 0.15],
    [-1.35, -1.05, 0.13],
  ].forEach(([x, z, size], i) =>
    add(new DodecahedronGeometry(size), i % 2 ? ROCK_LIGHT : CONE, x, F - size * 0.3, z, { delay: 0.1 + i * 0.03, rotation: [i, i * 2, 0] }),
  );
  const flow = (points: [number, number][], width: number, color: number, y: number, delay: number) =>
    points.slice(1).map(([x, z], i) => {
      const [px, pz] = points[i];
      const length = Math.hypot(x - px, z - pz) + width * 0.6;
      return glow(
        box(width, 0.012, length, color, (x + px) / 2, y, (z + pz) / 2, {
          delay: delay + i * 0.06,
          flat: true,
          noInk: true,
          rotation: [0, Math.atan2(x - px, z - pz), 0],
        }),
      );
    });
  const river: [number, number][] = [
    [1.25, 0.05],
    [1.05, 0.55],
    [1.3, 1.05],
    [1.55, 1.45],
  ];
  flow(river, 0.34, LAVA, F, 0.7);
  flow(river, 0.11, YELLOW, F + 0.004, 0.76);

  // The volcano: lava down its flanks, the crater glowing, smoke and fire above it.
  const VX = 0.95;
  const VZ = -0.9;
  const R0 = 1;
  const R1 = 0.28;
  const H = 2;
  cylinder(R1, R0, H, CONE, VX, F, VZ, { delay: 0.3 }, 9);
  glow(cylinder(R1 - 0.03, R1 - 0.03, 0.03, ORANGE, VX, F + H, VZ, { delay: 0.5, flat: true, noInk: true }));
  glow(cylinder(R1 * 0.55, R1 * 0.55, 0.04, YELLOW, VX, F + H + 0.005, VZ, { delay: 0.52, flat: true, noInk: true }));
  [
    [0.3, 0.16],
    [-0.45, 0.1],
    [0.95, 0.12],
  ].forEach(([angle, width], i) => {
    // On the flank at height h and at an angle round the cone, a little out from it.
    const flank = (h: number, turn: number): Point => {
      const radius = R0 + (R1 - R0) * (h / H) + 0.05;
      return [VX + radius * Math.sin(angle + turn), F + h, VZ + radius * Math.cos(angle + turn)];
    };
    const path = [flank(0, 0.1), flank(H * 0.5, -0.1), flank(H, 0)];
    path.slice(1).forEach((to, k) => {
      const { length, rotation } = aim(path[k], to);
      const wait = 0.56 + i * 0.05 + (1 - k) * 0.04;
      glow(box(width, length + 0.04, 0.02, LAVA, ...path[k], { delay: wait, flat: true, noInk: true, rotation }));
      glow(box(width * 0.35, length + 0.04, 0.025, YELLOW, ...path[k], { delay: wait + 0.03, flat: true, noInk: true, rotation }));
    });
  });
  const puffs = [0, 1, 2, 3, 4].map((i) => ball(0.16 + (i % 3) * 0.03, SMOKE, VX, F + H, VZ, { delay: 0.7 + i * 0.05, noInk: true }));
  tick((t) =>
    puffs.forEach((puff, i) => {
      const u = (t * 0.16 + i / puffs.length) % 1;
      const sway = Math.sin(i * 2.4) * 0.12;
      puff.position.set(VX + u * 0.45 + sway * u, F + H + 0.02 + u * 1.15, VZ - u * 0.1 + sway * 0.5);
      puff.children[0].scale.setScalar(0.5 + u * 0.8);
      puff.visible = u < 0.92;
    }),
  );
  motes(14, ORANGE, 0.04, [VX - 0.22, F + H, VZ - 0.22], [VX + 0.22, F + H + 0.95, VZ + 0.22], 1);
  motes(8, YELLOW, 0.03, [VX - 0.15, F + H, VZ - 0.15], [VX + 0.15, F + H + 0.7, VZ + 0.15], 1.1);

  // Mongibello, standing on ground his heat has cracked.
  const x0 = -0.45;
  const z0 = 0.45;
  const G = F;
  const D = 0.9;
  [0.2, 1.1, 2.1, 3.2, 4.3, 5.4].forEach((angle, i) => {
    const length = 0.4 + (i % 3) * 0.12;
    const reach = 0.42 + length / 2;
    glow(
      box(length, 0.008, 0.035, LAVA, x0 + Math.cos(angle) * reach, G, z0 + 0.05 + Math.sin(angle) * reach * 0.8, {
        delay: D + 1 + i * 0.05,
        flat: true,
        noInk: true,
        rotation: [0, -angle, 0],
      }),
    );
  });
  [-1, 1].forEach((side, i) => {
    box(0.26, 0.2, 0.42, BOOT, x0 + side * 0.22, G, z0 + 0.08, { delay: D + i * 0.02 });
    cylinder(0.2, 0.25, 0.85, TROUSERS, x0 + side * 0.22, G + 0.18, z0, { delay: D + 0.04 + i * 0.02 });
    cylinder(0.255, 0.255, 0.09, TROUSERS_LIGHT, x0 + side * 0.22, G + 0.17, z0, { delay: D + 0.06 + i * 0.02 });
  });
  add(new CylinderGeometry(0.44, 0.44, 0.3, 16).scale(1, 1, 0.8), TROUSERS, x0, G + 0.9, z0, { delay: D + 0.08 });
  add(new CylinderGeometry(0.48, 0.5, 0.14, 16).scale(1, 1, 0.76), SHIRT, x0, G + 1.08, z0, { delay: D + 0.12 });
  add(new CylinderGeometry(0.56, 0.46, 0.85, 16).scale(1, 1, 0.72), SHIRT, x0, G + 1.15, z0, { delay: D + 0.14 });
  const tee = box(0.26, 0.42, 0.03, TEE, x0, G + 1.55, z0 + 0.36, { delay: D + 0.18, noInk: true, rotation: [0.12, 0, 0] });
  glowing.push(
    decorate(tee, new BoxGeometry(0.012, 0.12, 0.01), LAVA, [
      [-0.06, 0.34, 0.016, 0.5],
      [0.05, 0.3, 0.016, -0.4],
    ]),
  );

  // His arms: shirt sleeves rolled up, forearms of rock with lava in the cracks.
  const seams = (part: Group, radius: number) =>
    glowing.push(
      decorate(part, new BoxGeometry(0.02, 0.14, 0.02), LAVA, [
        [0, 0.06, radius, 0.5],
        [0.06, 0.17, radius - 0.01, -0.6],
        [-0.05, 0.27, radius - 0.01, 0.4],
        [0.05, 0.36, radius - 0.02, -0.3],
        [radius, 0.12, 0.02, 0.8],
        [radius - 0.02, 0.3, -0.06, -0.5],
        [-radius, 0.2, 0.02, -0.7],
        [-radius + 0.02, 0.36, -0.05, 0.6],
      ]),
    );
  const arm = (side: number, elbow: Point, hand: Point, wait: number) => {
    ball(0.25, SHIRT, x0 + side * 0.56, G + 1.64, z0, { delay: D + wait });
    limb(kit, [x0 + side * 0.62, G + 1.86, z0], elbow, 0.17, 0.16, SHIRT, { delay: D + wait + 0.04 });
    ball(0.165, SHIRT_LIGHT, elbow[0], elbow[1] - 0.165, elbow[2], { delay: D + wait + 0.06 });
    seams(limb(kit, elbow, hand, 0.16, 0.14, STONE_SKIN, { delay: D + wait + 0.08 }), 0.15);
  };
  const fist: Point = [x0 - 0.4, G + 1.6, z0 + 0.48];
  arm(-1, [x0 - 0.8, G + 1.42, z0 + 0.12], fist, 0.22);
  const knuckles = ball(0.15, STONE_SKIN, fist[0], fist[1] - 0.15, fist[2], { delay: D + 0.34 });
  glowing.push(
    decorate(knuckles, new BoxGeometry(0.012, 0.1, 0.012), LAVA, [
      [0.04, 0.15, 0.15, 0.6],
      [-0.05, 0.2, 0.13, -0.5],
    ]),
  );
  const hand: Point = [x0 + 0.68, G + 1.3, z0 + 0.58];
  arm(1, [x0 + 0.8, G + 1.38, z0 + 0.14], hand, 0.25);
  ball(0.13, STONE_SKIN, hand[0], hand[1] - 0.13, hand[2], { delay: D + 0.4 });

  // The phone, held the wrong way round: its screen shows the world, and it is melting.
  const phone = box(0.15, 0.27, 0.03, PHONE, hand[0] - 0.02, hand[1] - 0.04, hand[2] + 0.14, { delay: D + 0.44, rotation: [-0.35, 0.3, 0] });
  const screen = decorate(phone, new BoxGeometry(0.12, 0.22, 0.005), CYAN, [[0, 0.135, 0.017]]);
  [
    [-0.04, 0.16],
    [0.05, 0.1],
  ].forEach(([dx, length], i) => {
    glow(cylinder(0.012, 0.02, length, LAVA, hand[0] - 0.02 + dx, hand[1] - 0.03 - length, hand[2] + 0.15, { delay: D + 0.5 + i * 0.04, flat: true, noInk: true }));
  });
  glow(cylinder(0.13, 0.13, 0.01, LAVA, hand[0] - 0.02, G, hand[2] + 0.15, { delay: D + 0.56, flat: true, noInk: true }));
  glow(cylinder(0.06, 0.06, 0.012, YELLOW, hand[0] - 0.02, G + 0.002, hand[2] + 0.15, { delay: D + 0.58, flat: true, noInk: true }));
  const drop = glow(ball(0.025, LAVA, hand[0] - 0.06, hand[1] - 0.23, hand[2] + 0.15, { delay: D + 0.6, flat: true, noInk: true }));
  const dropTop = hand[1] - 0.23;
  const cyanFrom = new Color(CYAN);
  const dead = new Color(0x0b2a36);
  tick((t) => {
    const u = (t * 0.9) % 1;
    drop.position.y = dropTop - (dropTop - G) * u * u;
    drop.visible = u < 0.97;
    // A broken screen: on, with now and then a dead flicker.
    const beat = Math.floor(t * 9);
    screen.color.copy(beat % 7 === 3 || beat % 11 === 5 ? dead : cyanFrom);
  });

  // His head: messy hair, stubble, a sheepish smile, a crack of lava on his cheek.
  cylinder(0.14, 0.16, 0.16, SKIN, x0, G + 1.95, z0, { delay: D + 0.36 });
  const head = add(new SphereGeometry(0.24, 18, 14).scale(0.95, 1.05, 0.95), SKIN, x0, G + 2.05, z0 + 0.01, { delay: D + 0.42 });
  add(new SphereGeometry(0.243, 18, 8, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44).scale(0.95, 1.05, 0.95), STUBBLE, x0, G + 2.05, z0 + 0.02, {
    delay: D + 0.44,
    noInk: true,
  });
  const cy = 0.252;
  decorate(head, new BoxGeometry(0.055, 0.03, 0.02), INK, [
    [-0.08, cy + 0.04, 0.215],
    [0.08, cy + 0.04, 0.215],
  ]);
  decorate(head, new BoxGeometry(0.09, 0.028, 0.03), HAIR, [
    [-0.08, cy + 0.085, 0.2, 0.15],
    [0.08, cy + 0.085, 0.2, -0.15],
  ]);
  decorate(head, new BoxGeometry(0.06, 0.09, 0.06), SKIN_DARK, [[0, cy - 0.01, 0.23]]);
  decorate(head, new BoxGeometry(0.1, 0.014, 0.01), INK, [[0.02, cy - 0.1, 0.205, 0.15]]);
  glowing.push(
    decorate(head, new BoxGeometry(0.012, 0.1, 0.012), LAVA, [
      [0.15, cy - 0.04, 0.17, 0.4],
      [-0.17, cy - 0.08, 0.15, -0.5],
    ]),
  );
  ball(0.23, HAIR, x0, G + 2.13, z0 - 0.05, { delay: D + 0.46 });
  [
    [-0.12, 0.28, 0.06, 0.4],
    [0.02, 0.31, 0.08, -0.2],
    [0.14, 0.27, 0.02, -0.5],
    [-0.04, 0.3, -0.08, 0.2],
  ].forEach(([dx, dy, dz, lean], i) =>
    add(new ConeGeometry(0.07, 0.16, 6), HAIR, x0 + dx, G + 2.05 + dy, z0 + dz, { delay: D + 0.5 + i * 0.02, rotation: [0.3, 0, lean] }),
  );

  // Embers rise off him all the time.
  motes(14, ORANGE, 0.03, [x0 - 0.7, G + 0.3, z0 - 0.3], [x0 + 0.7, G + 2.7, z0 + 0.6], 1.6);

  const lavaFrom = new Color(LAVA);
  const lavaTo = new Color(YELLOW);
  const colors = glowing.map((material) => material.color.clone());
  tick((t) => {
    const k = ((Math.sin(t * 2.1) + 1) / 2) * 0.55;
    glowing.forEach((material, i) => {
      // Lava throbs towards yellow; the yellow cores stay as they are.
      if (colors[i].equals(lavaFrom)) material.color.lerpColors(lavaFrom, lavaTo, k);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
