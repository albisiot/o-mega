import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  MathUtils,
  SphereGeometry,
} from "three";
import {
  YELLOW,
  ORANGE,
  CYAN,
  INK,
  colorOf,
  octagonBase,
  limb,
  zigzag,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/**
 * Gantry (P001): at the port they call him when the crane breaks down, which is often. In the
 * container yard the gantry crane has broken again (a snapped cable sparking, the spreader
 * hanging crooked, smoke from the trolley, the beacon flashing) and he carries the container
 * on his shoulder himself, smiling under his hard hat.
 */
export function gantry(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const ASPHALT = 0x2a2d36;
  const STEEL = 0x8a93a3;
  const CRANE = 0x2f6f86;
  const CRANE_LIGHT = 0x3f8aa3;
  const SMOKE = 0x4a4553;
  const RIB = 0x1b1820;
  const CONE_WHITE = 0xeeeae0;
  const SKIN = 0xcf9a78;
  const SKIN_DARK = 0xa8735a;
  const BROW = 0x2a1e1c;
  const TANK = 0x1e2128;
  const TROUSERS = 0x2c3646;
  const BELT = 0x3a2c22;
  const BOOT = 0x2a2622;
  const GLOVE = 0x3a3d45;
  const HAT = 0x7c93a6;
  const HAT_DARK = 0x5f7385;

  const F = octagonBase(kit, ASPHALT);
  const G = F;

  // The quay: yellow lane lines and the crane's rails.
  [0.05, 1.35].forEach((z, i) => box(3.6, 0.004, 0.05, YELLOW, 0, G, z, { delay: 0.1 + i * 0.03, flat: true, noInk: true }));
  [-1.3, 1.3].forEach((x, i) => box(0.06, 0.03, 3, STEEL, x, G, -0.3, { delay: 0.12 + i * 0.03, noInk: true }));

  // Containers stacked under the crane.
  const container = (w: number, color: number, x: number, y: number, z: number, delay: number, turn = 0) => {
    const part = box(w, 0.48, 0.48, color, x, y, z, { delay, rotation: [0, turn, 0] });
    decorate(
      part,
      new BoxGeometry(0.012, 0.42, 0.01),
      RIB,
      Array.from({ length: Math.round(w / 0.12) - 1 }, (_, k) => [-w / 2 + 0.12 * (k + 1), 0.24, 0.245] as Point),
    );
    return part;
  };
  container(1.1, 0x1f7f9c, -0.55, G, -0.95, 0.2);
  container(1.1, 0xcfc6b0, -0.5, G + 0.48, -0.95, 0.26, 0.05);
  container(1.1, 0x3a4a7a, 0.95, G, -0.95, 0.3);

  // The gantry crane: four legs on the rails, two girders, the trolley with its beacon.
  [-1.3, 1.3].forEach((x, i) => {
    [-1.35, -0.55].forEach((z, k) => box(0.16, 2.4, 0.16, CRANE, x, G + 0.14, z, { delay: 0.34 + i * 0.05 + k * 0.03 }));
    box(0.22, 0.14, 1, CRANE_LIGHT, x, G, -0.95, { delay: 0.32 + i * 0.05 });
    box(0.08, 0.08, 0.8, CRANE_LIGHT, x, G + 1.25, -0.95, { delay: 0.42 + i * 0.05 });
    box(0.2, 0.2, 0.96, CRANE_LIGHT, x * 1.08, G + 2.5, -0.95, { delay: 0.5 + i * 0.03 });
  });
  [-1.35, -0.55].forEach((z, i) => box(3, 0.2, 0.16, CRANE, 0, G + 2.5, z, { delay: 0.48 + i * 0.04 }));
  const trolley = box(0.5, 0.26, 0.95, CRANE_LIGHT, 0.25, G + 2.7, -0.95, { delay: 0.56 });
  decorate(trolley, new BoxGeometry(0.3, 0.1, 0.01), CYAN, [[0, 0.14, 0.48]]);
  const beacon = box(0.1, 0.1, 0.1, YELLOW, 0.25, G + 2.96, -0.95, { delay: 0.62, flat: true });
  // One hoist cable holds the spreader by a corner; the other has snapped and sparks.
  box(0.012, 1.4, 0.012, INK, 0.05, G + 1.3, -0.75, { delay: 0.64, noInk: true });
  const spreader = add(new BoxGeometry(0.9, 0.1, 0.35).translate(0.45, 0, 0), YELLOW, 0.05, G + 1.3, -0.75, {
    delay: 0.68,
    rotation: [0, 0, -0.85],
  });
  decorate(spreader, new BoxGeometry(0.06, 0.12, 0.37), RIB, [
    [0.15, 0.05, 0],
    [0.75, 0.05, 0],
  ]);
  const snapped: Point = [0.45, G + 2.15, -0.75];
  box(0.012, 0.55, 0.012, INK, snapped[0], snapped[1], snapped[2], { delay: 0.66, noInk: true });
  zigzag(kit, [snapped, [snapped[0] - 0.05, snapped[1] - 0.06, snapped[2]]], 0.01, 0xd9822b, 0.7);
  zigzag(kit, [snapped, [snapped[0] + 0.04, snapped[1] - 0.07, snapped[2] + 0.02]], 0.01, 0xd9822b, 0.72);
  motes(6, YELLOW, 0.025, [snapped[0] - 0.12, snapped[1] - 0.15, snapped[2] - 0.1], [snapped[0] + 0.12, snapped[1] + 0.2, snapped[2] + 0.1], 0.9);
  const puffs = [0, 1, 2].map((i) => ball(0.13 + i * 0.03, SMOKE, 0.4, G + 2.96, -1.1, { delay: 0.8 + i * 0.05, noInk: true }));
  const beaconOn = new Color(YELLOW);
  const beaconOff = new Color(0x4a3f10);
  tick((t) => {
    spreader.rotation.z = -0.85 + Math.sin(t * 1.3) * 0.08;
    colorOf(beacon).copy(Math.floor(t * 2.5) % 2 ? beaconOff : beaconOn);
    puffs.forEach((puff, i) => {
      const u = (t * 0.2 + i / puffs.length) % 1;
      puff.position.set(0.4 - u * 0.35, G + 2.96 + u * 0.9, -1.1 - u * 0.1);
      puff.children[0].scale.setScalar(0.5 + u * 0.9);
      puff.visible = u < 0.9;
    });
  });
  // Traffic cones round the trouble.
  [
    [0.85, 0.35],
    [1.45, 0.7],
  ].forEach(([x, z], i) => {
    box(0.22, 0.03, 0.22, ORANGE, x, G, z, { delay: 0.9 + i * 0.04 });
    const cone = add(new ConeGeometry(0.09, 0.32, 12), ORANGE, x, G + 0.03, z, { delay: 0.92 + i * 0.04 });
    decorate(cone, new CylinderGeometry(0.058, 0.07, 0.06, 12), CONE_WHITE, [[0, 0.14, 0]]);
  });

  // Gantry: hard hat, black vest, gloves, and a container on his left shoulder.
  const x0 = -0.45;
  const z0 = 0.55;
  const D = 1;
  [-1, 1].forEach((side, i) => {
    box(0.24, 0.16, 0.38, BOOT, x0 + side * 0.19, G, z0 + 0.06, { delay: D + i * 0.02 });
    cylinder(0.17, 0.19, 0.72, TROUSERS, x0 + side * 0.19, G + 0.12, z0, { delay: D + 0.04 + i * 0.02 });
  });
  add(new CylinderGeometry(0.42, 0.4, 0.28, 16).scale(1, 1, 0.78), TROUSERS, x0, G + 0.74, z0, { delay: D + 0.08 });
  const belt = add(new CylinderGeometry(0.43, 0.43, 0.08, 16).scale(1, 1, 0.8), BELT, x0, G + 0.96, z0, { delay: D + 0.1 });
  decorate(belt, new BoxGeometry(0.1, 0.07, 0.02), STEEL, [[0, 0.04, 0.345]]);
  add(new CylinderGeometry(0.46, 0.42, 0.92, 18).scale(1, 1, 0.7), TANK, x0, G + 1, z0, { delay: D + 0.12 });
  add(new SphereGeometry(0.34, 16, 12).scale(1.3, 0.75, 0.6), TANK, x0, G + 1.42, z0 + 0.14, { delay: D + 0.16 });
  add(new CylinderGeometry(0.24, 0.4, 0.18, 16).scale(1, 1, 0.7), SKIN, x0, G + 1.78, z0, { delay: D + 0.18 });
  [-1, 1].forEach((side, i) => {
    ball(0.22, SKIN, x0 + side * 0.5, G + 1.56, z0, { delay: D + 0.2 + i * 0.03 });
    box(0.1, 0.05, 0.6, TANK, x0 + side * 0.2, G + 1.86, z0, { delay: D + 0.22, rotation: [0, 0, side * 0.35], ink: 1.1 });
  });
  // The right arm hangs, gloved; the left holds the container up on his shoulder.
  const elbowR: Point = [x0 - 0.74, G + 1.3, z0 + 0.03];
  const wristR: Point = [x0 - 0.72, G + 0.88, z0 + 0.12];
  limb(kit, [x0 - 0.56, G + 1.8, z0], elbowR, 0.17, 0.15, SKIN, { delay: D + 0.26 });
  limb(kit, elbowR, wristR, 0.14, 0.12, SKIN, { delay: D + 0.3 });
  cylinder(0.14, 0.14, 0.12, GLOVE, wristR[0], wristR[1] - 0.06, wristR[2], { delay: D + 0.32 });
  ball(0.14, GLOVE, wristR[0], wristR[1] - 0.26, wristR[2] + 0.01, { delay: D + 0.34 });
  const elbowL: Point = [x0 + 0.9, G + 1.45, z0 + 0.12];
  const hand: Point = [x0 + 0.85, G + 1.95, z0 + 0.28];
  limb(kit, [x0 + 0.56, G + 1.8, z0], elbowL, 0.17, 0.15, SKIN, { delay: D + 0.26 });
  limb(kit, elbowL, hand, 0.14, 0.12, SKIN, { delay: D + 0.3 });
  const cuff: Point = [
    MathUtils.lerp(elbowL[0], hand[0], 0.7),
    MathUtils.lerp(elbowL[1], hand[1], 0.7),
    MathUtils.lerp(elbowL[2], hand[2], 0.7),
  ];
  limb(kit, cuff, hand, 0.145, 0.14, GLOVE, { delay: D + 0.32 });
  ball(0.13, GLOVE, hand[0], hand[1] - 0.13, hand[2], { delay: D + 0.34 });

  // His head: a square jaw, a broad smile, the hard hat.
  cylinder(0.15, 0.17, 0.2, SKIN, x0, G + 1.9, z0, { delay: D + 0.3 });
  const head = add(new SphereGeometry(0.23, 18, 14).scale(0.95, 1.05, 0.95), SKIN, x0, G + 2.1, z0 + 0.03, { delay: D + 0.38 });
  const cy = 0.2415;
  decorate(head, new BoxGeometry(0.05, 0.028, 0.02), INK, [
    [-0.08, cy + 0.03, 0.205],
    [0.08, cy + 0.03, 0.205],
  ]);
  decorate(head, new BoxGeometry(0.09, 0.03, 0.03), BROW, [
    [-0.08, cy + 0.075, 0.195, 0.1],
    [0.08, cy + 0.075, 0.195, -0.1],
  ]);
  decorate(head, new BoxGeometry(0.06, 0.09, 0.06), SKIN_DARK, [[0, cy - 0.02, 0.22]]);
  const jaw = box(0.3, 0.16, 0.26, SKIN, x0, G + 2.11, z0 + 0.06, { delay: D + 0.4 });
  decorate(jaw, new BoxGeometry(0.13, 0.016, 0.01), INK, [[0, 0.1, 0.131]]);
  decorate(jaw, new BoxGeometry(0.04, 0.016, 0.01), INK, [
    [-0.08, 0.112, 0.131, 0.5],
    [0.08, 0.112, 0.131, -0.5],
  ]);
  add(new SphereGeometry(0.255, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), HAT, x0, G + 2.45, z0 + 0.01, { delay: D + 0.46, rotation: [-0.1, 0, 0] });
  cylinder(0.3, 0.3, 0.03, HAT_DARK, x0, G + 2.44, z0 + 0.03, { delay: D + 0.48 }, 20);
  box(0.05, 0.05, 0.46, HAT_DARK, x0, G + 2.66, z0 + 0.01, { delay: D + 0.5, rotation: [-0.1, 0, 0] });

  // The container on his left shoulder, held by its edge: the one the crane dropped.
  container(1.4, 0xb03a74, x0 + 1, G + 2, z0, D + 0.6);

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
