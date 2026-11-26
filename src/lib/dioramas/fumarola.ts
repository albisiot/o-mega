import { BoxGeometry, ConeGeometry, DodecahedronGeometry, SphereGeometry, TorusGeometry, type Material, type Mesh } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Fumarola (P289): the old dragon of the Marche at his nest among the fumaroles of the
 * volcano, the lights of the port far below. Tall as a heron, a long neck and beak, swept
 * horns, wings folded like a cloak, his dark hide cracked with glowing lava; smoke curls from
 * his nostrils and he looks down, unhurried, at the Banco clerk who has climbed up with the
 * rent. Steam rises from the vents; the coins pile up at his feet. Nothing in him is in a
 * hurry, and nothing in him is a machine: he is paid in gold, by hand.
 */
export function fumarola(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const ROCK = 0x2e2632;
  const HIDE = 0x3c3f4c;
  const HIDE_DARK = 0x24262e;
  const GOLD = 0xe0b030;
  const F = octagonBase(kit, 0x1a1620);
  const G = floor(kit, F, 0.06, 0x2a2230, 0x1c1622, 0);

  // Lava cracks in the ground, and the port far below at the back edge.
  const ground = add(new BoxGeometry(0.001, 0.001, 0.001), ROCK, 0, G, 0, { delay: 0.1, noInk: true });
  const cracks = [
    decorate(ground, new BoxGeometry(0.45, 0.006, 0.03).rotateY(0.6), ORANGE, [
      [0.15, 0.004, 1.25],
      [1.45, 0.004, 0.25],
      [-0.45, 0.004, 0.75],
    ]),
    decorate(ground, new BoxGeometry(0.4, 0.006, 0.03).rotateY(-0.5), ORANGE, [
      [-0.95, 0.004, 1.15],
      [0.55, 0.004, 1.6],
      [-0.2, 0.004, 1.0],
    ]),
  ];
  box(3.2, 0.04, 0.35, 0x123048, 0, G, -1.85, { delay: 0.12, flat: true, noInk: true });
  [
    [-1.3, 0.16],
    [-1.05, 0.26],
    [-0.8, 0.12],
    [-0.5, 0.3],
    [-0.2, 0.18],
    [0.4, 0.22],
    [0.7, 0.14],
    [1.0, 0.28],
  ].forEach(([x, h], k) => {
    const block = box(0.22, h, 0.12, k % 2 ? 0x2a2f4a : 0x3a2a4a, x, G, -1.62, { delay: 0.15 + k * 0.02 });
    decorate(block, new BoxGeometry(0.04, 0.04, 0.01), k % 3 ? YELLOW : CYAN, [[0, h * 0.6, 0.065]]);
  });
  [0.1, 1.3].forEach((x, k) => {
    box(0.04, 0.5, 0.04, MAGENTA, x, G, -1.75, { delay: 0.3 + k * 0.05, noInk: true });
    box(0.4, 0.04, 0.04, MAGENTA, x - 0.12, G + 0.48, -1.75, { delay: 0.32 + k * 0.05, noInk: true });
  });

  // The nest rock and the vents.
  add(new DodecahedronGeometry(0.75, 0).scale(1.2, 0.6, 1), ROCK, -0.75, G - 0.1, -0.35, { delay: 0.2 });
  const perch = G + 0.68;
  [
    [-1.7, 0.4, 0.3],
    [0.7, -1.1, 0.25],
    [1.6, 0.6, 0.22],
  ].forEach(([x, z, r], k) => add(new DodecahedronGeometry(r, 0).scale(1.2, 0.7, 1), shade(ROCK, 1.15), x, G - 0.05, z, { delay: 0.25 + k * 0.03 }));
  const vents: Point[] = [
    [-1.45, G, 1.05],
    [0.15, G, -1.05],
  ];
  vents.forEach(([x, y, z], k) => {
    cylinder(0.08, 0.22, 0.18, ROCK, x, y, z, { delay: 0.3 + k * 0.04 }, 9);
    cylinder(0.08, 0.08, 0.02, ORANGE, x, y + 0.18, z, { delay: 0.34 + k * 0.04, flat: true, noInk: true }, 9);
  });
  const steam = vents.flatMap(([x, y, z], k) =>
    [0, 1, 2, 3].map((j) => {
      const part = ball(0.09, j % 2 ? 0xc89ad8 : 0xa8d8f0, x, y + 0.2, z, { delay: 0.5 + k * 0.05, noInk: true });
      const mesh = part.children[0] as Mesh;
      (mesh.material as Material).transparent = true;
      return { part, mesh, x, y, z, phase: j / 4 + k * 0.13 };
    }),
  );

  // Fumarola, in his own frame: facing the clerk, the beak along +z.
  const theta = 1.3;
  const S = 1.2;
  const at = (lx: number, ly: number, lz: number): Point => [-0.65 + S * (lx * Math.cos(theta) + lz * Math.sin(theta)), perch + S * ly, -0.4 + S * (-lx * Math.sin(theta) + lz * Math.cos(theta))];
  const D = 0.8;
  // Legs, bent back like a heron's, talons on the rock.
  [-1, 1].forEach((side, i) => {
    const hip = at(side * 0.14, 1.0, -0.05);
    const knee = at(side * 0.15, 0.55, -0.22);
    const ankle = at(side * 0.15, 0.1, 0.02);
    limb(kit, hip, knee, 0.075, 0.05, HIDE, { delay: D + i * 0.02 });
    limb(kit, knee, ankle, 0.045, 0.04, HIDE, { delay: D + 0.03 + i * 0.02 });
    [-0.5, 0, 0.5].forEach((spread) => limb(kit, ankle, at(side * 0.15 + Math.sin(spread) * 0.14, 0.0, 0.02 + Math.cos(spread) * 0.16), 0.025, 0.01, 0x14121c, { delay: D + 0.06 }));
  });
  // The tail down the back of the rock.
  limb(kit, at(0, 1.0, -0.25), at(0, 0.5, -0.65), 0.12, 0.08, HIDE, { delay: D + 0.05 });
  limb(kit, at(0, 0.5, -0.65), at(0.15, -0.1, -0.95), 0.08, 0.02, HIDE, { delay: D + 0.08 });
  // The body, leaning up.
  const body = add(new SphereGeometry(0.3 * S, 16, 12).scale(0.9, 1.45, 1.05), HIDE, ...at(0, 0.82, -0.02), { delay: D + 0.08, rotation: [0, theta, 0] });
  body.rotation.order = "YXZ";
  body.rotation.set(0.25, theta, 0);
  const skin = (x: number, y: number): number => 0.378 * Math.sqrt(Math.max(0, 1 - (x / 0.324) ** 2 - ((y - 0.522) / 0.522) ** 2)) + 0.004;
  cracks.push(
    decorate(
      body,
      new BoxGeometry(0.02, 0.2, 0.02),
      ORANGE,
      [
        [0.1, 0.42, 0.4],
        [-0.1, 0.6, -0.3],
        [0.03, 0.25, 0.2],
        [0.18, 0.7, -0.5],
        [-0.16, 0.32, 0.6],
      ].map(([x, y, lean]) => [x, y, skin(x, y), lean] as [number, number, number, number]),
    ),
  );
  // Wings folded like a cloak: long dark blades from the shoulders to the rock.
  [-1, 1].forEach((side, i) => {
    const wing = add(new ConeGeometry(0.28 * S, 1.6 * S, 4).scale(1, 1, 0.18).rotateX(Math.PI), HIDE_DARK, ...at(side * 0.3, 0.12, -0.12), { delay: D + 0.12 + i * 0.03 });
    wing.rotation.order = "YXZ";
    wing.rotation.set(-0.14, theta + side * 0.12 + Math.PI / 2, side * 0.08);
    cracks.push(
      decorate(wing, new BoxGeometry(0.018, 0.38, 0.16), ORANGE, [
        [0.05, 0.55, 0, 0.2],
        [-0.1, 0.95, 0, -0.3],
        [0.04, 1.35, 0, 0.1],
        [0.14, 1.7, 0, 0.5],
      ]),
    );
    add(new ConeGeometry(0.04, 0.22, 6), HIDE_DARK, ...at(side * 0.3, 1.72, -0.12), { delay: D + 0.2, rotation: [0, 0, side * -0.3] });
  });
  // The long neck, a curve up and forward, and the head with its beak and swept horns.
  const neck: Point[] = [at(0, 1.45, 0.08), at(0, 1.85, 0.12), at(0, 2.2, 0.06), at(0, 2.45, 0.16)];
  neck.slice(1).forEach((to, k) => limb(kit, neck[k], to, 0.12 - k * 0.02, 0.1 - k * 0.02, HIDE, { delay: D + 0.2 + k * 0.03 }));
  const head = add(new SphereGeometry(0.12 * S, 14, 10).scale(0.9, 0.85, 1.5), HIDE, ...at(0, 2.38, 0.22), { delay: D + 0.3, rotation: [0, theta, 0] });
  const beakFrom = at(0, 2.47, 0.36);
  const beakTo = at(0, 2.32, 0.82);
  limb(kit, beakFrom, beakTo, 0.06, 0.008, HIDE, { delay: D + 0.33 });
  [-1, 1].forEach((side) => {
    limb(kit, at(side * 0.06, 2.55, 0.18), at(side * 0.12, 2.68, -0.18), 0.03, 0.006, 0x8a8a94, { delay: D + 0.36 });
    limb(kit, at(side * 0.08, 2.5, 0.12), at(side * 0.16, 2.52, -0.12), 0.022, 0.004, 0x8a8a94, { delay: D + 0.37 });
  });
  decorate(head, new BoxGeometry(0.07, 0.02, 0.02), YELLOW, [
    [0.105, 0.12, 0.06],
    [-0.105, 0.12, 0.06],
  ]);
  // Smoke from his nostrils.
  const smoke = [0, 1, 2, 3].map((k) => ball(0.04 + k * 0.012, 0x7a6a8a, ...beakFrom, { delay: D + 0.5, noInk: true }));

  // The coins of rent paid, piled at his feet, and the clerk with this month's.
  [
    [0.2, 0.25, 0.32],
    [0.38, 0.1, 0.22],
    [0.42, 0.38, 0.14],
    [0.05, 0.45, 0.1],
    [0.25, -0.05, 0.08],
  ].forEach(([x, z, h], k) => {
    const stack = cylinder(0.08, 0.08, h, GOLD, x, G, z, { delay: 1.2 + k * 0.03 }, 14);
    decorate(stack, new TorusGeometry(0.08, 0.006, 4, 16).rotateX(Math.PI / 2), shade(GOLD, 0.7), Array.from({ length: Math.floor(h / 0.05) }, (_, j) => [0, 0.04 + j * 0.05, 0] as Point));
  });
  [
    [0.6, 0.5],
    [0.0, 0.7],
    [0.55, 0.1],
  ].forEach(([x, z], k) => cylinder(0.08, 0.08, 0.015, GOLD, x, G, z, { delay: 1.3 + k * 0.02, rotation: [0.1 * k, 0, 0.15] }, 14));
  const clerk = figure(kit, {
    x: 1.25,
    z: 0.55,
    y: G,
    facing: -1.45,
    height: 2.2,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried", glasses: "round" },
    headwear: { kind: "hat", color: 0x1e2028, accent: shade(GOLD, 0.8) },
    top: { kind: "suit", color: 0x24404a, accent: 0xe8e2d0, tie: GOLD },
    bottom: { kind: "trousers", color: 0x1e2e36 },
    shoes: 0x1a1414,
    arms: [
      [-0.16, 1.55, 0.55],
      [0.16, 1.55, 0.55],
    ],
    legs: "kneel",
    delay: 1.0,
  });
  const [r, l] = clerk.hands;
  const chest = box(0.38, 0.22, 0.26, 0x5a3a22, (r[0] + l[0]) / 2, r[1] - 0.12, (r[2] + l[2]) / 2, { delay: 1.5, rotation: [0, -1.45, 0] });
  decorate(chest, new BoxGeometry(0.4, 0.03, 0.27), shade(GOLD, 0.8), [
    [0, 0.05, 0],
    [0, 0.18, 0],
  ]);
  decorate(chest, new BoxGeometry(0.34, 0.03, 0.22), GOLD, [[0, 0.225, 0]]);
  const sweat = ball(0.025, 0x9fe8ff, ...clerk.at(0.17, clerk.head[1] - G + 0.12, 0.12), { delay: 1.6, flat: true, noInk: true });

  const rest = clerk.parts.map((part) => part.position.x);
  const sweatY = sweat.position.y;
  tick((t) => {
    // Smoke curls from his beak; steam rises from the vents; the lava pulses; the clerk trembles.
    smoke.forEach((puff, k) => {
      const s = (t * 0.35 + k / 4) % 1;
      puff.position.set(beakFrom[0] + s * 0.35 + Math.sin(s * 6 + k) * 0.06, beakFrom[1] - 0.04 + s * 0.55, beakFrom[2] - s * 0.2);
    });
    steam.forEach(({ part, mesh, x, y, z, phase }) => {
      const s = (t * 0.22 + phase) % 1;
      part.position.set(x + Math.sin(s * 5 + phase * 9) * 0.12, y + 0.15 + s * 1.7, z);
      mesh.scale.setScalar(0.6 + s * 1.6);
      (mesh.material as Material).opacity = 0.85 * (1 - s);
    });
    const pulse = (Math.sin(t * 1.6) + 1) / 2;
    cracks.forEach((crack) => crack.color.setRGB(1, 0.45 + pulse * 0.25, 0.05 * pulse));
    const shiver = Math.sin(t * 40) * 0.006;
    clerk.parts.forEach((part, i) => (part.position.x = rest[i] + shiver));
    sweat.position.y = sweatY - ((t * 0.6) % 1) * 0.35;
    head.rotation.y = theta + Math.sin(t * 0.5) * 0.06;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
