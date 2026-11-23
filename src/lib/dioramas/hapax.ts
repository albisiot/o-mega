import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
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
 * Hapax (P048): the nearly blind street magician of the Lanterne, performing in a piazza of
 * Nuova Megara by its old fountain, inside a magenta chalk circle. Behind thick milky lenses he
 * smiles at nobody in particular while a stream of cards springs from one hand to the other,
 * and his spells, five glowing eyes, drift round him and look for him: at the cards, at the
 * coins in his upturned hat, at the pigeons, at us. His white cane hangs from his arm, and the
 * only audience left is a café chair and a cup of coffee going cold.
 */
export function hapax(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SLAB = 0x2b2c3a;
  const JOINT = 0x1d1e28;
  const STONE = 0x5a6074;
  const STONE_DARK = 0x444a5c;
  const RIM = 0x6f768a;
  const WATER = 0x1590b4;
  const JET = 0x7fe4ff;
  const FOAM = 0xd8f6ff;
  const METAL = 0x26242f;
  const SEAT = 0x2a6278;
  const CUP = 0xf0ece4;
  const HAT = 0x1b1923;
  const PIGEON = 0x85849c;
  const PIGEON_DARK = 0x5d5c72;
  const NECK = 0x3f8f8a;
  const FEET = 0xa85a7a;
  const COAT = 0x1f3b4b;
  const COAT_LIGHT = 0x2c5669;
  const TROUSERS = 0x262838;
  const SHOE = 0x17151d;
  const SCARF = 0x8c2f88;
  const SCARF_DARK = 0x6a2468;
  const SKIN = 0xd9b39c;
  const SKIN_DARK = 0xb98d76;
  const HAIR = 0x1d1726;
  const LENS = 0xf2eeff;
  const LENS_RING = 0xb4a2ea;
  const CANE = 0xf0eff4;
  const CARD = 0xf3efe8;
  const SCLERA = 0xf3edff;
  const VIOLET = 0x9b5cff;
  const LILAC = 0xcdb6ff;

  const F = octagonBase(kit, SLAB);

  // The piazza's big flags, laid on the diagonal.
  for (const sign of [1, -1]) {
    for (let k = -3; k <= 3; k++) {
      const c = k * 0.8;
      // Where the line x + sign * z = c stays inside the octagon.
      const from = Math.max(-2.2, c - 2.2, (c - 3.15) / 2);
      const to = Math.min(2.2, c + 2.2, (c + 3.15) / 2);
      if (to - from < 0.2) continue;
      const mid = (from + to) / 2;
      box((to - from) * Math.SQRT2, 0.006, 0.025, JOINT, mid, F, sign * (c - mid), {
        delay: 0.1 + (k + 3) * 0.01,
        flat: true,
        noInk: true,
        rotation: [0, (sign * Math.PI) / 4, 0],
      });
    }
  }

  // The fountain: a round basin, a column, a bowl on top, water spilling over in four streams.
  const FX = -0.95;
  const FZ = -0.8;
  cylinder(0.98, 1.0, 0.08, STONE_DARK, FX, F, FZ, { delay: 0.14, ink: 1.02 }, 22);
  cylinder(0.88, 0.9, 0.36, STONE, FX, F + 0.08, FZ, { delay: 0.18, ink: 1.03 }, 22);
  const pool = cylinder(0.8, 0.8, 0.02, WATER, FX, F + 0.44, FZ, { delay: 0.22, flat: true, noInk: true }, 24);
  add(new TorusGeometry(0.84, 0.055, 6, 36).rotateX(Math.PI / 2), RIM, FX, F + 0.415, FZ, { delay: 0.24 });
  cylinder(0.1, 0.14, 0.72, STONE, FX, F + 0.46, FZ, { delay: 0.28 });
  cylinder(0.16, 0.11, 0.08, RIM, FX, F + 1.18, FZ, { delay: 0.32 });
  cylinder(0.36, 0.14, 0.16, STONE, FX, F + 1.26, FZ, { delay: 0.36 }, 18);
  const bowl = cylinder(0.32, 0.32, 0.015, WATER, FX, F + 1.42, FZ, { delay: 0.4, flat: true, noInk: true }, 20);
  cylinder(0.04, 0.06, 0.16, RIM, FX, F + 1.42, FZ, { delay: 0.42 });
  ball(0.05, RIM, FX, F + 1.58, FZ, { delay: 0.44 });
  cylinder(0.014, 0.026, 0.24, JET, FX, F + 1.66, FZ, { delay: 0.46, flat: true });
  const streams = [0, 1, 2, 3].map((k) => {
    const angle = Math.PI / 4 + (k * Math.PI) / 2;
    const out = (r: number, y: number): Point => [FX + Math.cos(angle) * r, y, FZ + Math.sin(angle) * r];
    const points = [out(0.35, F + 1.41), out(0.46, F + 1.2), out(0.52, F + 0.47)];
    cable(kit, points, 0.016, JET, 0.5 + k * 0.03);
    return { curve: new CatmullRomCurve3(points.map((point) => new Vector3(...point))), splash: out(0.52, F + 0.461) };
  });
  const drops = streams.flatMap(({ curve }, k) =>
    [0, 0.5].map((phase) => {
      const at = curve.getPoint(phase);
      return { part: ball(0.026, FOAM, at.x, at.y, at.z, { delay: 0.7 + k * 0.03, flat: true, noInk: true }), curve, phase: phase + k * 0.21 };
    }),
  );
  const ripples = streams.map(({ splash }, k) => {
    const ring = add(new TorusGeometry(0.08, 0.01, 4, 20).rotateX(Math.PI / 2), FOAM, ...splash, { delay: 0.7 + k * 0.03, flat: true, noInk: true });
    return { mesh: ring.children[0], phase: k * 0.27 };
  });

  // The café's table and chair, left behind by the last onlooker, the coffee still on the table.
  const TX = 1.42;
  const TZ = -1.0;
  cylinder(0.16, 0.18, 0.03, METAL, TX, F, TZ, { delay: 0.3 });
  cylinder(0.025, 0.03, 0.68, METAL, TX, F + 0.03, TZ, { delay: 0.32 });
  const tableTop = cylinder(0.27, 0.27, 0.035, METAL, TX, F + 0.71, TZ, { delay: 0.34 }, 20);
  decorate(tableTop, new CylinderGeometry(0.24, 0.24, 0.004, 20), 0x3a3848, [[0, 0.036, 0]]);
  cylinder(0.07, 0.06, 0.012, CUP, TX - 0.08, F + 0.745, TZ + 0.06, { delay: 0.5 });
  const cup = cylinder(0.042, 0.032, 0.065, CUP, TX - 0.08, F + 0.757, TZ + 0.06, { delay: 0.52 });
  decorate(cup, new CylinderGeometry(0.036, 0.036, 0.004, 12), 0x2a160e, [[0, 0.062, 0]]);
  const CX = 1.72;
  const CZ = -0.36;
  const turn = -1.08;
  /** A point of the chair, given in its own frame (its seat facing +z). */
  const onChair = (x: number, y: number, z: number): Point => [CX + x * Math.cos(turn) + z * Math.sin(turn), F + y, CZ - x * Math.sin(turn) + z * Math.cos(turn)];
  [
    [-0.15, -0.15],
    [0.15, -0.15],
    [-0.15, 0.15],
    [0.15, 0.15],
  ].forEach(([x, z], i) => cylinder(0.018, 0.018, 0.42, METAL, ...onChair(x, 0, z), { delay: 0.36 + i * 0.02 }, 6));
  box(0.36, 0.04, 0.36, SEAT, ...onChair(0, 0.42, 0), { delay: 0.44, rotation: [0, turn, 0] });
  [-0.15, 0.15].forEach((x, i) => cylinder(0.018, 0.018, 0.4, METAL, ...onChair(x, 0.46, -0.16), { delay: 0.46 + i * 0.02 }, 6));
  box(0.36, 0.09, 0.03, SEAT, ...onChair(0, 0.78, -0.16), { delay: 0.5, rotation: [0, turn, 0] });

  // His top hat upside down on the flags, coins in it and a couple rolled out.
  const HX = -0.42;
  const HZ = 0.98;
  const crown = cylinder(0.145, 0.15, 0.26, HAT, HX, F, HZ, { delay: 0.5 }, 18);
  decorate(crown, new CylinderGeometry(0.148, 0.148, 0.05, 18), SCARF, [[0, 0.2, 0]]);
  add(new TorusGeometry(0.2, 0.035, 6, 28).rotateX(Math.PI / 2).scale(1, 0.6, 1), HAT, HX, F + 0.24, HZ, { delay: 0.54 });
  cylinder(0.13, 0.13, 0.01, 0x0a090e, HX, F + 0.255, HZ, { delay: 0.56, flat: true, noInk: true });
  [
    [-0.04, 0.03, 0.3],
    [0.05, -0.02, -0.2],
    [0.0, -0.06, 0.1],
    [-0.06, -0.04, -0.4],
  ].forEach(([dx, dz, tilt], i) =>
    cylinder(0.042, 0.042, 0.014, YELLOW, HX + dx, F + 0.262 + i * 0.006, HZ + dz, { delay: 0.6 + i * 0.03, ink: 1.12, rotation: [tilt, 0, tilt * 0.5] }),
  );
  [
    [-0.12, 1.22],
    [-0.7, 1.32],
  ].forEach(([x, z], i) => cylinder(0.042, 0.042, 0.014, YELLOW, x, F, z, { delay: 0.72 + i * 0.03, ink: 1.12 }));

  /** A pigeon facing along `yaw` (0 is +x); returns its head, to peck with. */
  const pigeon = (px: number, py: number, pz: number, yaw: number, delay: number) => {
    const at = (x: number, y: number, z: number): Point => [px + x * Math.cos(yaw) + z * Math.sin(yaw), py + y, pz - x * Math.sin(yaw) + z * Math.cos(yaw)];
    const turned = { rotation: [0, yaw, 0] as Point };
    [-0.03, 0.03].forEach((z, i) => box(0.012, 0.035, 0.012, FEET, ...at(0.01, 0, z), { delay: delay + i * 0.02, noInk: true }));
    const body = add(new SphereGeometry(0.085, 12, 10).scale(1.45, 0.9, 0.95), PIGEON, ...at(0, 0.03, 0), { delay: delay + 0.04, ...turned });
    decorate(body, new SphereGeometry(0.06, 10, 8).scale(1.5, 0.6, 0.5), PIGEON_DARK, [
      [-0.03, 0.1, 0.07],
      [-0.03, 0.1, -0.07],
    ]);
    box(0.12, 0.02, 0.08, PIGEON_DARK, ...at(-0.16, 0.09, 0), { delay: delay + 0.06, rotation: [0, yaw, 0.35] });
    ball(0.045, NECK, ...at(0.08, 0.1, 0), { delay: delay + 0.06, ...turned });
    const head = ball(0.05, PIGEON, ...at(0.11, 0.15, 0), { delay: delay + 0.08, ...turned });
    decorate(head, new BoxGeometry(0.045, 0.016, 0.016), 0x3a3640, [[0.06, 0.045, 0]]);
    decorate(head, new BoxGeometry(0.012, 0.016, 0.01), INK, [
      [0.025, 0.065, 0.045],
      [0.025, 0.065, -0.045],
    ]);
    return { head, rest: head.position.clone(), forward: new Vector3(Math.cos(yaw), 0, -Math.sin(yaw)) };
  };
  const pigeons = [pigeon(-0.57, F + 0.525, -0.05, -0.32, 0.8), pigeon(0.08, F, 1.28, Math.PI - 0.2, 0.86)];

  // The chalk circle he performs in, with its marks.
  const HX0 = 0.5;
  const HZ0 = 0.3;
  const circle = add(new TorusGeometry(0.8, 0.014, 4, 56).rotateX(Math.PI / 2), MAGENTA, HX0, F, HZ0, { delay: 0.6, flat: true, noInk: true });
  for (let k = 0; k < 12; k++) {
    const angle = (k / 12) * Math.PI * 2 + 0.13;
    box(0.09, 0.006, 0.02, MAGENTA, HX0 + Math.cos(angle) * 0.71, F, HZ0 + Math.sin(angle) * 0.71, {
      delay: 0.64 + k * 0.01,
      flat: true,
      noInk: true,
      rotation: [0, -angle, 0],
    });
  }

  // Hapax: tall and thin, a long coat, a purple scarf, palms up.
  const x0 = HX0;
  const z0 = HZ0;
  const G = F;
  const D = 0.95;
  [-1, 1].forEach((side, i) => {
    box(0.17, 0.1, 0.3, SHOE, x0 + side * 0.16, G, z0 + 0.05, { delay: D + i * 0.02 });
    cylinder(0.1, 0.11, 0.5, TROUSERS, x0 + side * 0.15, G + 0.08, z0, { delay: D + 0.04 + i * 0.02 });
  });
  add(new CylinderGeometry(0.33, 0.44, 0.7, 18).scale(1, 1, 0.72), COAT, x0, G + 0.42, z0, { delay: D + 0.08 });
  const torso = add(new CylinderGeometry(0.37, 0.32, 0.66, 18).scale(1, 1, 0.7), COAT, x0, G + 1.1, z0, { delay: D + 0.12 });
  decorate(torso, new BoxGeometry(0.24, 0.5, 0.01), 0x141c26, [[0, 0.38, 0.245]]);
  [-1, 1].forEach((side, i) => {
    box(0.2, 0.26, 0.05, COAT_LIGHT, x0 + side * 0.14, G + 1.6, z0 - 0.08, { delay: D + 0.16 + i * 0.02, rotation: [-0.2, 0, side * -0.35] });
    ball(0.15, COAT, x0 + side * 0.33, G + 1.46, z0, { delay: D + 0.18 + i * 0.02 });
  });
  // The scarf round his neck, its two ends hanging down the front, frayed.
  add(new TorusGeometry(0.13, 0.065, 8, 18).rotateX(Math.PI / 2), SCARF, x0, G + 1.68, z0, { delay: D + 0.22 });
  const ends: [number, number, number, number][] = [
    [-0.08, 0.74, SCARF, 0.06],
    [0.07, 0.54, SCARF_DARK, -0.05],
  ];
  ends.forEach(([dx, length, color, lean], i) => {
    const end = box(0.13, length, 0.04, color, x0 + dx, G + 1.72 - length, z0 + 0.27, { delay: D + 0.24 + i * 0.02, rotation: [-0.06, 0, lean] });
    decorate(
      end,
      new BoxGeometry(0.02, 0.07, 0.04),
      color,
      [-0.045, -0.015, 0.015, 0.045].map((x, k) => [x, -0.03 - (k % 2) * 0.015, 0] as Point),
    );
  });

  // The arms: elbows out, forearms forward, both palms up.
  const hands: Point[] = [];
  const forearms: [Point, Point][] = [];
  [-1, 1].forEach((side, i) => {
    const shoulder: Point = [x0 + side * 0.36, G + 1.6, z0];
    const elbow: Point = [x0 + side * 0.62, G + 1.28, z0 + 0.1];
    const wrist: Point = [x0 + side * 0.5, G + 1.4, z0 + 0.38];
    limb(kit, shoulder, elbow, 0.105, 0.095, COAT, { delay: D + 0.26 + i * 0.02 });
    ball(0.095, COAT_LIGHT, elbow[0], elbow[1] - 0.095, elbow[2], { delay: D + 0.28 + i * 0.02 });
    limb(kit, elbow, wrist, 0.095, 0.105, COAT, { delay: D + 0.3 + i * 0.02 });
    const { rotation } = aim(elbow, wrist);
    add(new CylinderGeometry(0.115, 0.115, 0.05, 14), COAT_LIGHT, ...wrist, { delay: D + 0.32 + i * 0.02, rotation, noInk: true });
    const palm: Point = [wrist[0] - side * 0.03, wrist[1] + 0.02, wrist[2] + 0.1];
    add(new SphereGeometry(0.07, 12, 8).scale(1.1, 0.5, 1.35), SKIN, palm[0], palm[1] - 0.035, palm[2], { delay: D + 0.36 + i * 0.02 });
    // Long fingers, open and curling up.
    [-0.045, -0.015, 0.015, 0.045].forEach((dx, k) => {
      const root: Point = [palm[0] + dx, palm[1], palm[2] + 0.08 - Math.abs(dx) * 0.6];
      limb(kit, root, [root[0] + dx * 0.6, root[1] + 0.07, root[2] + 0.06], 0.017, 0.014, SKIN, { delay: D + 0.4 + k * 0.01 });
    });
    limb(kit, [palm[0] - side * 0.07, palm[1], palm[2] - 0.02], [palm[0] - side * 0.11, palm[1] + 0.06, palm[2] + 0.03], 0.019, 0.016, SKIN, { delay: D + 0.42 });
    hands.push(palm);
    forearms.push([elbow, wrist]);
  });

  // His white cane hangs by its crook from his left forearm.
  const [elbowL, wristL] = forearms[1];
  const hook: Point = [
    elbowL[0] + (wristL[0] - elbowL[0]) * 0.42,
    elbowL[1] + (wristL[1] - elbowL[1]) * 0.42,
    elbowL[2] + (wristL[2] - elbowL[2]) * 0.42,
  ];
  add(new TorusGeometry(0.12, 0.018, 6, 14, Math.PI), CANE, hook[0], hook[1] - 0.018, hook[2], { delay: D + 0.5 });
  cylinder(0.018, 0.018, hook[1] - G - 0.12, CANE, hook[0] + 0.12, G + 0.12, hook[2], { delay: D + 0.52 }, 8);
  cylinder(0.022, 0.022, 0.12, MAGENTA, hook[0] + 0.12, G + 0.2, hook[2], { delay: D + 0.54, noInk: true }, 8);

  // His head, tilted towards us: a long face, a wide smile, thick round milky lenses, black curls.
  cylinder(0.065, 0.07, 0.2, SKIN, x0, G + 1.72, z0, { delay: D + 0.36 });
  const YAW = 0.25;
  const cos = Math.cos(YAW);
  const sin = Math.sin(YAW);
  const ry = 0.185 * 1.1;
  const origin: Point = [x0, G + 2.1 - ry, z0 + 0.03];
  /** A point of the head, given in the head's own frame (face towards +z). */
  const onHead = (x: number, y: number, z: number): Point => [origin[0] + x * cos + z * sin, origin[1] + y, origin[2] - x * sin + z * cos];
  const faced = { rotation: [0, YAW, 0] as Point };
  const head = add(new SphereGeometry(0.185, 18, 14).scale(0.9, 1.1, 0.95), SKIN, ...origin, { delay: D + 0.4, ...faced });
  decorate(head, new SphereGeometry(0.035, 8, 6), SKIN_DARK, [
    [-0.165, ry + 0.01, 0],
    [0.165, ry + 0.01, 0],
  ]);
  decorate(head, new BoxGeometry(0.04, 0.075, 0.04), SKIN_DARK, [[0, ry - 0.03, 0.175]]);
  decorate(head, new TorusGeometry(0.058, 0.013, 6, 14, Math.PI).rotateZ(Math.PI), INK, [[0.005, ry - 0.08, 0.152]]);
  decorate(head, new CylinderGeometry(0.068, 0.068, 0.02, 20).rotateX(Math.PI / 2), LENS, [
    [-0.075, ry + 0.03, 0.172],
    [0.075, ry + 0.03, 0.172],
  ]);
  decorate(head, new TorusGeometry(0.07, 0.012, 6, 24), INK, [
    [-0.075, ry + 0.03, 0.178],
    [0.075, ry + 0.03, 0.178],
  ]);
  decorate(head, new TorusGeometry(0.036, 0.008, 6, 18), LENS_RING, [
    [-0.075, ry + 0.03, 0.184],
    [0.075, ry + 0.03, 0.184],
  ]);
  decorate(head, new BoxGeometry(0.04, 0.014, 0.014), INK, [[0, ry + 0.045, 0.178]]);
  decorate(head, new BoxGeometry(0.012, 0.012, 0.17), INK, [
    [-0.158, ry + 0.045, 0.09],
    [0.158, ry + 0.045, 0.09],
  ]);
  ball(0.19, HAIR, ...onHead(0, ry - 0.16, -0.06), { delay: D + 0.44, ...faced });
  [
    [-0.12, 0.17, 0.02, 0.09],
    [0, 0.21, 0.0, 0.1],
    [0.12, 0.17, 0.03, 0.09],
    [-0.17, 0.07, -0.02, 0.08],
    [0.17, 0.08, -0.03, 0.08],
    [-0.08, 0.19, -0.12, 0.09],
    [0.09, 0.2, -0.1, 0.09],
    [-0.07, 0.17, 0.12, 0.06],
    [0.07, 0.16, 0.13, 0.055],
    [0.16, -0.03, -0.08, 0.07],
    [-0.16, -0.03, -0.08, 0.07],
  ].forEach(([x, y, z, r], i) => ball(r, HAIR, ...onHead(x, ry + y - r, z), { delay: D + 0.46 + i * 0.015, ink: 1.1, ...faced }));

  // The stream of cards, springing from his right hand over to his left.
  const [handR, handL] = hands;
  const arc = (u: number): Point => [
    handR[0] + (handL[0] - handR[0]) * u,
    handR[1] + 0.04 + Math.sin(Math.PI * u) * 0.5,
    handR[2] + 0.02 + Math.sin(Math.PI * u) * 0.3,
  ];
  const cards = Array.from({ length: 11 }, (_, i) => {
    const card = box(0.12, 0.17, 0.008, CARD, ...arc(i / 11), { delay: D + 0.6 + i * 0.03 });
    decorate(card, new BoxGeometry(0.096, 0.146, 0.004), MAGENTA, [[0, 0.085, 0.005]]);
    decorate(card, new BoxGeometry(0.036, 0.036, 0.004), CYAN, [[0, 0.085, -0.005, Math.PI / 4]]);
    return card;
  });

  // The spells: five eyes drifting round him, each looking for him at something of its own. Each
  // is a glowing ball with a violet iris, and two magenta rims draw an almond eye on its front.
  const eyes = [
    { angle: -0.9, reach: 0.95, height: 2.0, size: 0.15, look: [x0 + 2.5, 1.7, z0 + 8] as Point },
    { angle: 1.55, reach: 0.97, height: 1.84, size: 0.14, look: [HX, F + 0.3, HZ] as Point },
    { angle: 2.65, reach: 0.88, height: 2.5, size: 0.13, look: [0.08, F + 0.15, 1.28] as Point },
    { angle: -1.95, reach: 0.92, height: 2.42, size: 0.135, look: [x0, G + 1.8, z0 + 0.5] as Point },
    { angle: 3.75, reach: 0.55, height: 2.8, size: 0.12, look: [x0 + 1.5, 1.4, z0 + 8] as Point },
  ].map((eye, i) => {
    const r = eye.size;
    const part = add(new SphereGeometry(r, 16, 12), SCLERA, x0, G + eye.height, z0, { delay: 1.7 + i * 0.06, flat: true, ink: 1.1 });
    decorate(part, new SphereGeometry(r * 1.012, 16, 6, 0, Math.PI * 2, 0, 0.55).rotateX(Math.PI / 2), VIOLET, [[0, r, 0]]);
    decorate(part, new SphereGeometry(r * 1.024, 12, 4, 0, Math.PI * 2, 0, 0.24).rotateX(Math.PI / 2), INK, [[0, r, 0]]);
    decorate(part, new TorusGeometry(r * 1.03, 0.017, 6, 20, Math.PI).rotateX(Math.PI / 2 - 0.5), MAGENTA, [[0, r, 0]]);
    decorate(part, new TorusGeometry(r * 1.03, 0.017, 6, 20, Math.PI).rotateX(Math.PI / 2 + 0.5), MAGENTA, [[0, r, 0]]);
    const [iris, pupil, upper, lower] = part.children.slice(2);
    return { ...eye, part, iris, pupil, upper, lower };
  });
  motes(12, MAGENTA, 0.02, [x0 - 0.9, G + 1.3, z0 - 0.7], [x0 + 0.9, G + 3, z0 + 0.7], 1.9);
  motes(6, LILAC, 0.016, [x0 - 0.5, G + 1.5, z0 + 0.3], [x0 + 0.5, G + 2.2, z0 + 0.7], 2);

  const glowFrom = new Color(SCLERA);
  const glowTo = new Color(LILAC);
  const chalkFrom = new Color(MAGENTA);
  const chalkTo = new Color(VIOLET);
  const waterFrom = new Color(WATER);
  const waterTo = new Color(0x22b4d8);
  const centre = new Vector3();
  tick((elapsed) => {
    // The first frame can start a moment before the diorama opened.
    const t = Math.max(0, elapsed);
    // The cards fly along the arc, lying along it and wobbling, every other one face up.
    cards.forEach((card, i) => {
      const u = (i / cards.length + t * 0.3) % 1;
      const [x, y, z] = arc(u);
      card.position.set(x, y - 0.085, z);
      card.rotation.set(0, Math.sin(u * Math.PI * 2) * 0.5 + (i % 2) * Math.PI, Math.cos(Math.PI * u) * (i % 2 ? 0.9 : -0.9));
    });
    // The eyes drift round him and keep turning to look at what they are watching.
    eyes.forEach((eye, i) => {
      const angle = eye.angle + t * 0.2;
      centre.set(x0 + Math.sin(angle) * eye.reach, G + eye.height + Math.sin(t * 1.1 + i * 1.7) * 0.06, z0 + Math.cos(angle) * eye.reach);
      const dx = eye.look[0] - centre.x;
      const dy = eye.look[1] - centre.y;
      const dz = eye.look[2] - centre.z;
      const yaw = Math.atan2(dx, dz) + Math.sin(t * 0.8 + i * 2.3) * 0.25 - Math.sin(i * 2.3) * 0.25;
      const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
      eye.part.rotation.set(pitch, yaw, 0, "YXZ");
      const r = eye.size;
      eye.part.position.set(
        centre.x - r * Math.sin(pitch) * Math.sin(yaw),
        centre.y - r * Math.cos(pitch),
        centre.z - r * Math.sin(pitch) * Math.cos(yaw),
      );
      colorOf(eye.part).lerpColors(glowFrom, glowTo, (Math.sin(t * 2 + i) + 1) / 2);
      // Now and then an eye blinks.
      const blink = Math.max(0, Math.sin(t * 1.4 + i * 1.9 - Math.PI / 2) - 0.97) / 0.03;
      eye.upper.rotation.x = blink * 0.5;
      eye.lower.rotation.x = -blink * 0.5;
      eye.iris.visible = eye.pupil.visible = blink < 0.5;
    });
    colorOf(circle).lerpColors(chalkFrom, chalkTo, (Math.sin(t * 1.3) + 1) / 2);
    const shimmer = (Math.sin(t * 1.6) + 1) / 2;
    colorOf(pool).lerpColors(waterFrom, waterTo, shimmer * 0.6);
    colorOf(bowl).lerpColors(waterFrom, waterTo, (1 - shimmer) * 0.6);
    // Drops slide down the streams; rings spread where they fall in.
    for (const drop of drops) drop.part.position.copy(drop.curve.getPoint((t * 0.7 + drop.phase) % 1));
    for (const ripple of ripples) {
      const u = (t * 0.6 + ripple.phase) % 1;
      ripple.mesh.scale.set(0.6 + u * 1.4, 1, 0.6 + u * 1.4);
      ripple.mesh.visible = u < 0.85;
    }
    // The pigeons peck now and then.
    pigeons.forEach(({ head, rest, forward }, i) => {
      const peck = Math.max(0, Math.sin(t * 2.6 + Math.PI + i * 1.3)) ** 4;
      head.position.copy(rest).addScaledVector(forward, peck * 0.06);
      head.position.y -= peck * (i === 1 ? 0.12 : 0.05);
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.65 };
}
