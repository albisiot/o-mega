import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  SphereGeometry,
  TorusGeometry,
} from "three";
import {
  YELLOW,
  CYAN,
  MAGENTA,
  INK,
  octagonBase,
  aim,
  limb,
  zigzag,
  jag,
  type Point,
  type Kit,
  type Framing,
} from "@/lib/diorama-kit";

/**
 * Absentia (P058): the perfect armour that guards the city every night, with no one inside.
 * It walks its round along a wet quay at night under a harbour crane, the lights of the bay far
 * off; its chest and helmet are open on nothing, wires hang loose in the dark, sparks crackle
 * where a body should be, and the empty helmet turns slowly, watching.
 */
export function absentia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WATER = 0x0e2a3a;
  const QUAY = 0x262a35;
  const KERB = 0x343a48;
  const CRANE = 0x3a5a78;
  const CRANE_DARK = 0x2a4058;
  const TEAL = 0x2f9fb0;
  const TEAL_DARK = 0x23707e;
  const JOINT = 0x1e2630;
  const HOLLOW = 0x040507;
  const WIRE = 0xe0325a;
  const SPARK = 0xd8fbff;

  const F = octagonBase(kit, WATER);

  // The quay jutting into the bay, wet, with puddles that catch the crane's lights.
  box(3.2, 0.2, 2.1, QUAY, 0, F, 0.5, { delay: 0.1, ink: 1.02 });
  const G = F + 0.2;
  box(3.2, 0.04, 0.08, KERB, 0, G, -0.51, { delay: 0.14, noInk: true });
  [-0.9, 0.4].forEach((x, i) => {
    cylinder(0.08, 0.1, 0.16, KERB, x, G, -0.42, { delay: 0.16 + i * 0.03 });
    cylinder(0.12, 0.12, 0.04, KERB, x, G + 0.16, -0.42, { delay: 0.18 + i * 0.03 });
  });
  const shimmer: Group[] = [];
  [
    [0.55, 0.95, 0.42, MAGENTA],
    [-1.2, 1.2, 0.3, CYAN],
    [1.1, 0.35, 0.26, MAGENTA],
  ].forEach(([x, z, radius, color], i) => {
    add(new CylinderGeometry(radius, radius, 0.006, 20).scale(1, 1, 0.6), 0x14303f, x, G, z, { delay: 0.2 + i * 0.03, flat: true, noInk: true });
    shimmer.push(box(radius * 0.15, 0.008, radius * 0.9, color, x, G + 0.002, z, { delay: 0.24 + i * 0.03, flat: true, noInk: true }));
  });
  // The lights of the far side of the bay.
  for (let k = 0; k < 11; k++) {
    const color = k % 3 === 0 ? YELLOW : k % 3 === 1 ? MAGENTA : CYAN;
    box(0.05, 0.05 + (k % 4) * 0.03, 0.03, color, -1.5 + k * 0.3, F, -1.75 - (k % 2) * 0.12, { delay: 0.3 + k * 0.02, flat: true, noInk: true });
  }

  // The harbour crane: a portal on the quay, the turning cabin, the lattice jib over the water.
  const CX = 1.05;
  const CZ = -0.2;
  [
    [-0.3, -0.25],
    [0.3, -0.25],
    [-0.3, 0.25],
    [0.3, 0.25],
  ].forEach(([dx, dz], i) => box(0.1, 0.9, 0.1, CRANE, CX + dx, G, CZ + dz, { delay: 0.4 + i * 0.03 }));
  box(0.75, 0.12, 0.65, CRANE_DARK, CX, G + 0.9, CZ, { delay: 0.5 });
  const cabin = box(0.55, 0.45, 0.5, CRANE, CX + 0.05, G + 1.02, CZ, { delay: 0.54 });
  decorate(cabin, new BoxGeometry(0.3, 0.12, 0.01), CYAN, [[-0.05, 0.3, 0.255]]);
  const foot: Point = [CX - 0.2, G + 1.3, CZ];
  const tip: Point = [-0.25, G + 3, -0.95];
  [-0.08, 0.08].forEach((dz, i) => {
    const from: Point = [foot[0], foot[1], foot[2] + dz];
    const to: Point = [tip[0], tip[1], tip[2] + dz];
    const { length, rotation } = aim(from, to);
    box(0.05, length, 0.05, CRANE, ...from, { delay: 0.6 + i * 0.03, rotation });
  });
  zigzag(kit, jag(foot, tip, 10, 0.06, 1), 0.025, CRANE_DARK, 0.66);
  box(0.012, 1.3, 0.012, INK, tip[0], tip[1] - 1.3, tip[2], { delay: 0.8, noInk: true });
  box(0.08, 0.1, 0.06, YELLOW, tip[0], tip[1] - 1.42, tip[2], { delay: 0.84 });
  const warnings = [
    box(0.07, 0.07, 0.07, MAGENTA, tip[0], tip[1] + 0.03, tip[2], { delay: 0.86, flat: true, noInk: true }),
    box(0.07, 0.07, 0.07, MAGENTA, CX + 0.05, G + 1.47, CZ, { delay: 0.88, flat: true, noInk: true }),
  ];

  // Absentia, mid-stride towards us: plates of teal and yellow over nothing.
  const x0 = -0.55;
  const z0 = 0.6;
  const D = 0.95;
  const leg = (hip: Point, knee: Point, ankle: Point, toe: number, wait: number) => {
    limb(kit, hip, knee, 0.16, 0.14, TEAL, { delay: D + wait });
    ball(0.11, YELLOW, knee[0], knee[1] - 0.11, knee[2] + 0.04, { delay: D + wait + 0.04 });
    const shin = limb(kit, knee, ankle, 0.14, 0.12, TEAL, { delay: D + wait + 0.06 });
    decorate(shin, new BoxGeometry(0.12, 0.3, 0.03), YELLOW, [[0, 0.24, 0.13]]);
    box(0.2, 0.12, 0.34, TEAL_DARK, ankle[0], ankle[1] - 0.12, ankle[2] + 0.06, { delay: D + wait + 0.1, rotation: [toe, 0, 0] });
  };
  leg([x0 + 0.17, G + 1.1, z0], [x0 + 0.2, G + 0.62, z0 + 0.25], [x0 + 0.2, G + 0.14, z0 + 0.32], 0, 0);
  leg([x0 - 0.17, G + 1.1, z0], [x0 - 0.2, G + 0.62, z0 - 0.12], [x0 - 0.2, G + 0.26, z0 - 0.42], -0.6, 0.02);
  const hips = box(0.5, 0.25, 0.34, JOINT, x0, G + 0.98, z0, { delay: D + 0.12 });
  decorate(hips, new BoxGeometry(0.3, 0.08, 0.02), YELLOW, [[0, 0.17, 0.175]]);
  // The chest: a shell open down the middle, dark inside, wires hanging loose.
  add(new CylinderGeometry(0.38, 0.3, 0.72, 16).scale(1, 1, 0.66), TEAL_DARK, x0, G + 1.2, z0, { delay: D + 0.16 });
  box(0.14, 0.56, 0.02, HOLLOW, x0, G + 1.3, z0 + 0.235, { delay: D + 0.2, flat: true, noInk: true });
  [-1, 1].forEach((side, i) => {
    const plate = box(0.3, 0.62, 0.1, TEAL, x0 + side * 0.19, G + 1.26, z0 + 0.2, { delay: D + 0.22 + i * 0.03, rotation: [0.05, side * -0.3, 0] });
    decorate(plate, new BoxGeometry(0.03, 0.6, 0.02), YELLOW, [[-side * 0.135, 0.31, 0.055]]);
    const pauldron = add(new SphereGeometry(0.22, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), TEAL, x0 + side * 0.46, G + 1.78, z0, {
      delay: D + 0.26 + i * 0.03,
      rotation: [0, 0, side * -0.35],
    });
    decorate(pauldron, new TorusGeometry(0.21, 0.02, 6, 20).rotateX(Math.PI / 2), YELLOW, [[0, 0.02, 0]]);
  });
  [
    [-0.03, 0.22],
    [0.04, 0.32],
  ].forEach(([dx, length], i) =>
    limb(kit, [x0 + dx, G + 1.82, z0 + 0.22], [x0 + dx * 2, G + 1.82 - length, z0 + 0.26], 0.012, 0.012, WIRE, { delay: D + 0.3 + i * 0.03, noInk: true }),
  );
  add(new TorusGeometry(0.17, 0.05, 8, 20).rotateX(Math.PI / 2), JOINT, x0, G + 1.92, z0, { delay: D + 0.32 });
  // The arms swing against the legs; the gauntlets are clenched.
  const arm = (side: number, elbow: Point, fist: Point, wait: number) => {
    const shoulder: Point = [x0 + side * 0.46, G + 1.78, z0];
    limb(kit, shoulder, elbow, 0.12, 0.11, TEAL, { delay: D + wait });
    ball(0.09, JOINT, elbow[0], elbow[1] - 0.09, elbow[2], { delay: D + wait + 0.03 });
    const forearm = limb(kit, elbow, fist, 0.12, 0.11, TEAL, { delay: D + wait + 0.05 });
    decorate(forearm, new BoxGeometry(0.1, 0.22, 0.03), YELLOW, [[0, 0.18, 0.11]]);
    ball(0.12, TEAL_DARK, fist[0], fist[1] - 0.12, fist[2], { delay: D + wait + 0.08 });
  };
  arm(-1, [x0 - 0.56, G + 1.4, z0 + 0.2], [x0 - 0.5, G + 1.05, z0 + 0.38], 0.34);
  arm(1, [x0 + 0.56, G + 1.4, z0 - 0.18], [x0 + 0.52, G + 1.08, z0 - 0.3], 0.36);
  // The helmet: open where the face should be, nothing inside, a yellow crest.
  const hc = G + 2.2;
  const shell = add(new SphereGeometry(0.24, 18, 12, Math.PI / 2 + 0.7, Math.PI * 2 - 1.4), TEAL, x0, hc - 0.24, z0, { delay: D + 0.4 });
  const inside = add(new SphereGeometry(0.21, 14, 10), HOLLOW, x0, hc - 0.21, z0 - 0.02, { delay: D + 0.38, noInk: true });
  const crest = box(0.1, 0.06, 0.46, YELLOW, x0, hc + 0.17, z0 - 0.02, { delay: D + 0.44 });
  const ears = [-1, 1].map((side) =>
    add(new CylinderGeometry(0.06, 0.06, 0.05, 12).rotateZ(Math.PI / 2), YELLOW, x0 + side * 0.24, hc - 0.06, z0, { delay: D + 0.46 }),
  );
  const watching = [shell, inside, crest, ...ears];
  const watchRest = watching.map((part) => part.position.clone());

  // Sparks where a body should be: in the chest and inside the helmet.
  const arcs = [
    zigzag(kit, jag([x0, G + 1.78, z0 + 0.24], [x0, G + 1.32, z0 + 0.25], 6, 0.035, 1), 0.016, SPARK, D + 0.5),
    zigzag(kit, jag([x0 - 0.02, G + 1.72, z0 + 0.25], [x0 + 0.02, G + 1.36, z0 + 0.24], 5, 0.045, 2), 0.016, CYAN, D + 0.52),
    zigzag(kit, jag([x0 - 0.1, hc - 0.02, z0 + 0.12], [x0 + 0.1, hc + 0.03, z0 + 0.12], 4, 0.03, 3), 0.014, SPARK, D + 0.54),
  ];
  tick((t) => {
    const beat = Math.floor(t * 10);
    arcs.forEach((arc, i) => {
      // The first spark in the chest is nearly always there; the others come and go.
      const noise = Math.sin(beat * 12.9898 + i * 78.233) * 43758.5453;
      const on = i === 0 ? beat % 4 !== 3 : noise - Math.floor(noise) > 0.45;
      for (const piece of arc) piece.visible = on;
    });
    // The empty helmet turns slowly left and right, watching the quay.
    const look = Math.sin(t * 0.5) * 0.5;
    const cos = Math.cos(look);
    const sin = Math.sin(look);
    watching.forEach((part, i) => {
      const dx = watchRest[i].x - x0;
      const dz = watchRest[i].z - z0;
      part.position.set(x0 + dx * cos + dz * sin, watchRest[i].y, z0 - dx * sin + dz * cos);
      part.rotation.y = look;
    });
    warnings.forEach((light, i) => (light.visible = Math.floor(t * 1.5 + i * 0.5) % 2 === 0));
    shimmer.forEach((streak, i) => (streak.scale.x = 1 + Math.sin(t * 2 + i) * 0.4));
  });

  return { width: 4.9, height: 4.5, lookY: 1.7 };
}
