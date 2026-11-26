import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, floor, puddle } from "@/lib/diorama-props";

/** A die: a cube with dots on its faces, centred in a group so it can tumble about its middle. */
function die(kit: Kit, at: Point, size: number, color: number, dots: number, delay: number): Group {
  const holder = new Group();
  holder.position.set(...at);
  const cube = kit.box(size, size, size, color, 0, 0, 0, { delay });
  cube.parent?.add(holder);
  holder.add(cube);
  cube.position.set(0, -size / 2, 0);
  // One, two and three on the faces the camera sees; four, five and six on the others.
  const c = size / 2;
  const h = c + 0.003;
  const q = size * 0.26;
  kit.decorate(cube, new SphereGeometry(size * 0.09, 8, 6), dots, [
    [0, c, h],
    [-q, size + 0.003, -q],
    [q, size + 0.003, q],
    [h, c + q, -q],
    [h, c, 0],
    [h, c - q, q],
    ...([-q, q].flatMap((dy) => [-q, q].map((dz) => [-h, c + dy, dz])) as Point[]),
    ...([-q, 0, q].flatMap((dy) => [-q, q].map((dx) => [dx, c + dy, -h])) as Point[]),
    ...([-q, q].flatMap((dx) => [-q, q].map((dz) => [dx, -0.003, dz])) as Point[]),
    [0, -0.003, 0],
  ]);
  return holder;
}

/**
 * Dado (P308): on the wet quay below the neon casino of the Banco, the gambler lunges forward
 * with a grin and lets a golden die tumble off his palm. Luck does the rest: a steel girder
 * snapped off a crane is dropping out of the night just behind his head, and he never looks
 * up. The price of having no brains and no gadgets: over his head a thought bubble with no
 * plan in it, only another die.
 */
export function dado(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WATER = 0x0e2a3e;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2a2c3a, 0x1c1e28, 0.42);

  // The harbour on the right: dark water, the quay edge, a bollard, a moored yacht.
  const sea = new Shape();
  ([
    [1.1, -1.6],
    [1.62, -1.6],
    [2.22, -1.0],
    [2.22, 1.0],
    [1.62, 1.6],
    [1.1, 1.6],
  ] as [number, number][]).forEach(([x, z], i) => (i ? sea.lineTo(x, z) : sea.moveTo(x, z)));
  add(new ExtrudeGeometry(sea, { depth: 0.02, bevelEnabled: false }).rotateX(Math.PI / 2), WATER, 0, G, 0, { delay: 0.05, flat: true, noInk: true });
  box(0.12, 0.08, 3.2, 0x5d6680, 1.06, G, 0, { delay: 0.08 });
  bollard(kit, 0.9, 1.15, G, 0.15);
  const hull = box(0.42, 0.3, 1.3, 0xe8e4dc, 1.75, G - 0.05, -0.5, { delay: 0.2 });
  decorate(hull, new BoxGeometry(0.43, 0.04, 1.31), CYAN, [[0, 0.2, 0]]);
  box(0.3, 0.22, 0.5, 0xc8c4bc, 1.75, G + 0.25, -0.6, { delay: 0.24 });
  box(0.02, 1.5, 0.02, 0xb0b8c4, 1.75, G + 0.47, -0.45, { delay: 0.28, noInk: true });
  const ripples = [0, 1].map((k) => add(new TorusGeometry(0.2, 0.012, 4, 24).rotateX(Math.PI / 2), 0x5aa8c8, 1.7, G + 0.025, 0.65 + k * 0.3, { delay: 0.3, flat: true, noInk: true }));

  // The casino on the left: a round tower ringed in neon, a dome, a canopy of bulbs.
  const CX = -1.25;
  const CZ = -1.15;
  const tower = cylinder(0.75, 0.75, 2.6, 0x2a2240, CX, G, CZ, { delay: 0.1 }, 20);
  decorate(tower, new BoxGeometry(0.14, 0.3, 0.01), YELLOW, [0, 0.6, 1.2].flatMap((a) => [1.0, 1.6, 2.2].map((y) => [Math.sin(a) * 0.76, y, Math.cos(a) * 0.76] as Point)));
  const neon = [0.85, 1.45, 2.05, 2.6].map((y, i) => add(new TorusGeometry(0.78, 0.03, 6, 32).rotateX(Math.PI / 2), i % 2 ? CYAN : MAGENTA, CX, G + y, CZ, { delay: 0.2 + i * 0.03, flat: true, noInk: true }));
  add(new SphereGeometry(0.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x3a2a5a, CX, G + 2.6, CZ, { delay: 0.3 });
  cylinder(0.02, 0.05, 0.5, MAGENTA, CX, G + 3.3, CZ, { delay: 0.35, flat: true, noInk: true });
  add(new CylinderGeometry(0.72, 0.72, 0.1, 20, 1, false, 0, Math.PI).rotateY(-Math.PI / 2), 0x3a2a5a, CX + 0.2, G + 1.8, CZ + 0.55, { delay: 0.36, rotation: [0, 0.6, 0] });
  const bulbs: Group[] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 8) * Math.PI - Math.PI / 2 + 0.6;
    bulbs.push(ball(0.035, YELLOW, CX + 0.2 + Math.sin(a) * 0.73, G + 1.77, CZ + 0.55 + Math.cos(a) * 0.73, { delay: 0.4 + k * 0.02, flat: true, noInk: true }));
  }
  puddle(kit, -0.8, 0.9, G, 0.3, 0.45, MAGENTA);

  // The girder dropping out of the night behind him, a snapped chain on it, its shadow below.
  const A: Point = [-0.25, G + 3.05, -0.8];
  const B: Point = [1.25, G + 2.05, -0.25];
  const girder = aim(A, B);
  const beam = box(0.26, girder.length, 0.12, 0x5a6478, ...A, { delay: 0.6, rotation: girder.rotation });
  decorate(beam, new BoxGeometry(0.28, girder.length, 0.02), 0x46506a, [
    [0, girder.length / 2, 0.06],
    [0, girder.length / 2, -0.06],
  ]);
  decorate(
    beam,
    new SphereGeometry(0.02, 6, 4),
    0x8a93a3,
    [0.3, 0.65, 1.0, 1.35, 1.7].flatMap((y) => [[-0.09, y, 0.075] as Point, [0.09, y, 0.075] as Point]),
  );
  [0, 1, 2].forEach((k) =>
    add(new TorusGeometry(0.06, 0.018, 6, 12), 0x8a93a3, A[0] - 0.02, A[1] + 0.04 + k * 0.1, A[2] + 0.02, { delay: 0.7 + k * 0.02, rotation: [0, k % 2 ? Math.PI / 2 : 0, 0] }),
  );
  add(new CylinderGeometry(0.85, 0.85, 0.004, 18).scale(1, 1, 0.18), 0x14121c, (A[0] + B[0]) / 2, G, (A[2] + B[2]) / 2 + 0.1, { delay: 0.55, flat: true, noInk: true, rotation: [0, -0.33, 0] });
  (
    [
      [0.1, 3.25, -0.7, MAGENTA],
      [0.55, 2.95, -0.55, CYAN],
      [1.0, 2.6, -0.4, MAGENTA],
    ] as [number, number, number, number][]
  ).forEach(([x, y, z, color], i) => box(0.025, 0.55, 0.025, color, x, G + y, z, { delay: 0.8 + i * 0.03, flat: true, noInk: true }));

  // Dado, lunging, his right palm up and open.
  const gambler = figure(kit, {
    x: -0.15,
    z: 0.2,
    y: G,
    facing: 0.35,
    height: 2.45,
    skin: 0xd8a888,
    hair: { style: "short", color: 0x1e1a1c },
    face: { mouth: "grin", brows: "raised" },
    top: { kind: "coat", color: 0x1f5a48, accent: 0xe8e4dc },
    bottom: { kind: "trousers", color: 0x1e2228 },
    shoes: 0x16141c,
    arms: [[-0.72, 1.55, 0.45], "back"],
    legs: "stride",
    delay: 0.9,
  });
  const palm = gambler.hands[0];
  const thrown = die(kit, [palm[0] + 0.05, palm[1] + 0.3, palm[2] + 0.12], 0.16, 0xffc21a, INK, 1.6);
  const sparkle = [0, 1, 2, 3].map((k) =>
    box(0.03, 0.03, 0.03, YELLOW, palm[0] + Math.cos(k * 1.6) * 0.2, palm[1] + 0.3 + Math.sin(k * 1.6) * 0.16, palm[2] + 0.12, { delay: 1.7 + k * 0.03, flat: true, noInk: true, rotation: [0.6, 0.6, 0] }),
  );

  // The thought bubble: no plan, just another die.
  const think: Point = gambler.at(-0.6, 2.95, 0.1);
  [0.05, 0.08].forEach((r, i) => ball(r, 0xf4f0e6, ...gambler.at(-0.22 - i * 0.16, 2.5 + i * 0.16, 0.05), { delay: 1.8 + i * 0.05 }));
  const cloud = add(new SphereGeometry(0.3, 16, 10).scale(1.25, 0.9, 0.4), 0xf4f0e6, think[0], think[1] - 0.27, think[2], { delay: 1.9, rotation: [0, 0.35, 0] });
  const idea = die(kit, [think[0], think[1], think[2] + 0.12], 0.17, 0xffc21a, INK, 2.0);
  idea.rotation.set(0.5, 0.7, 0.2);
  void cloud;

  tick((t) => {
    // The die tumbles over his palm; the casino bulbs chase round the canopy.
    thrown.rotation.set(t * 3.1 + 0.4, t * 2.3 + 0.7, t * 1.7);
    thrown.position.y = palm[1] + 0.3 + Math.abs(Math.sin(t * 2.2)) * 0.12;
    sparkle.forEach((s, k) => (s.visible = Math.floor(t * 6 + k) % 3 !== 0 || t === 0));
    bulbs.forEach((bulb, k) => (bulb.visible = (k + Math.floor(t * 5)) % 3 !== 2 || t === 0));
    neon.forEach((ring, i) => (ring.visible = i !== 1 || Math.floor(t * 7) % 19 !== 4));
    idea.rotation.y = 0.7 + Math.sin(t * 0.8) * 0.4;
    beam.position.y = A[1] - Math.abs(Math.sin(t * 1.5)) * 0.04;
    ripples.forEach((ring, k) => {
      const r = (t * 0.5 + k * 0.5) % 1;
      ring.children[0].scale.set(0.5 + r * 1.5, 1, 0.5 + r * 1.5);
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
