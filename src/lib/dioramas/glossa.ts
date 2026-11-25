import { BoxGeometry, type BufferGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type PartOptions, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor } from "@/lib/diorama-props";

/**
 * Glossa (P256): the court interpreter robot in the audience hall, on the red carpet between
 * two columns: jade joints, a tall hat hung with beads, a face that is a cluster of brass horns.
 * It holds a scroll and an abacus while balloons of glyphs float out of its horns to either side,
 * the same words in another language and then another. At its feet lies the ceremonial sword
 * it was handed for the duel, too heavy for it to lift.
 */
export function glossa(kit: Kit): Framing {
  const { add, box, ball, cylinder, decorate, tick } = kit;
  const JADE = 0x3f9a84;
  const ROBE = 0x1f5a54;
  const COPPER = 0xb06a3a;
  const BRASS = 0xc89a4a;
  const F = octagonBase(kit, 0x1e1a2a);
  const G = floor(kit, F, 0.06, 0x3a3450, 0x2a2440, 0.5);
  /** A geometry built round its centre, put with its centre at a point. */
  const put = (geometry: BufferGeometry, color: number, [x, y, z]: Point, options: PartOptions) => {
    geometry.computeBoundingBox();
    return add(geometry, color, x, y + (geometry.boundingBox?.min.y ?? 0), z, options);
  };

  // The hall: an arched wall, two columns, the red carpet.
  add(archedWall(3.0, 3.3, 0.3, { x: 0, half: 0.65, spring: 1.7 }), 0x2a2a48, 0, G, -1.6, { delay: 0.08, ink: 1.02 });
  add(archMouth(0.65, 1.7), 0x0c0a18, 0, G, -1.77, { delay: 0.1, flat: true, noInk: true });
  column(kit, -1.35, -1.05, G, 0.16, 3.0, false, 0x3a6a8a);
  column(kit, 1.35, -1.05, G, 0.2, 3.0, false, 0x3a6a8a);
  const carpet = box(0.95, 0.012, 2.8, 0x7a1e40, 0, G, 0.2, { delay: 0.12, noInk: true });
  decorate(carpet, new BoxGeometry(0.03, 0.004, 2.8), CYAN, [
    [-0.42, 0.013, 0],
    [0.42, 0.013, 0],
  ]);

  // The lectern with the dictionary of four hundred languages, and more tomes on the floor.
  cylinder(0.06, 0.12, 0.9, 0x3e3028, 1.3, G, 0.35, { delay: 0.3 }, 8);
  const desk = box(0.6, 0.06, 0.45, 0x5e4a3a, 1.3, G + 0.9, 0.35, { delay: 0.34, rotation: [0.3, -0.5, 0] });
  decorate(desk, new BoxGeometry(0.26, 0.07, 0.36), 0xe8e2d0, [
    [-0.14, 0.08, 0, 0.08],
    [0.14, 0.08, 0, -0.08],
  ]);
  [0x2f6f60, 0x7a1e40, 0x3a4a7a].forEach((color, k) => box(0.36 - k * 0.04, 0.1, 0.26, color, 1.55, G + k * 0.1, 0.9, { delay: 0.38 + k * 0.03, rotation: [0, 0.4 + k * 0.3, 0] }));

  // The ceremonial sword it was handed, lying where it slipped from its grip.
  const turn = 0.9;
  const along = (u: number): Point => [0.55 + u * Math.sin(turn), G + 0.012, 0.85 + u * Math.cos(turn)];
  box(0.08, 0.025, 0.85, 0xc8d0dc, ...along(0.45), { delay: 0.5, rotation: [0, turn, 0] });
  box(0.34, 0.05, 0.07, YELLOW, ...along(0), { delay: 0.52, rotation: [0, turn, 0] });
  box(0.045, 0.045, 0.2, 0x5a2a3a, ...along(-0.13), { delay: 0.54, rotation: [0, turn, 0] });
  ball(0.045, YELLOW, ...along(-0.25), { delay: 0.56 });

  // Glossa: tall and thin, jade limbs, a teal robe trimmed in copper.
  const f = 0.3;
  const robot = figure(kit, {
    x: -0.1,
    z: 0.1,
    y: G + 0.012,
    facing: f,
    height: 2.7,
    build: "slim",
    skin: JADE,
    face: { blank: true },
    headwear: { kind: "tophat", color: 0x2a7a6a, accent: COPPER },
    top: { kind: "robe", color: ROBE },
    shoes: 0x1a3a34,
    arms: [
      [-0.28, 1.2, 0.36],
      [0.1, 1.62, 0.34],
    ],
    delay: 0.8,
  });
  const at = robot.at;
  const RH = robot.headRadius;
  const headY = robot.head[1] - G - 0.012;
  robot.elbows.forEach((elbow) => ball(0.06, COPPER, elbow[0], elbow[1] - 0.06, elbow[2], { delay: 1.15 }));
  put(new BoxGeometry(0.1, 1.08, 0.02).rotateX(-0.113).rotateY(f), COPPER, at(0, 0.68, 0.31), { delay: 1.1 });
  [-1, 1].forEach((side) => put(new BoxGeometry(0.05, 0.45, 0.02).rotateZ(side * 0.4).rotateY(f), COPPER, at(side * 0.07, 1.72, 0.245), { delay: 1.12 }));
  add(new TorusGeometry(0.45, 0.025, 6, 30).rotateX(Math.PI / 2).scale(1, 1, 0.88), MAGENTA, ...at(0, 0.16, 0), { delay: 1.1, flat: true, noInk: true, rotation: [0, f, 0] });

  // The hat's boss and its strings of beads.
  ball(0.05, YELLOW, ...at(0, 2.66, RH * 0.82), { delay: 1.4 });
  [-1, 1].forEach((side) => {
    limb(kit, at(side * 0.32, 2.56, 0), at(side * 0.33, 2.3, 0.02), 0.01, 0.01, COPPER, { delay: 1.42, noInk: true });
    ball(0.035, MAGENTA, ...at(side * 0.33, 2.24, 0.02), { delay: 1.44 });
  });

  // The face: a cluster of brass horns, every one a mouth.
  [
    [0, 0.02, 0.058],
    [-0.1, 0.07, 0.045],
    [0.1, 0.07, 0.045],
    [-0.1, -0.06, 0.045],
    [0.1, -0.06, 0.045],
    [0, 0.14, 0.04],
    [0, -0.11, 0.045],
    [-0.18, 0.0, 0.035],
    [0.18, 0.0, 0.035],
  ].forEach(([ox, oy, r], k) => {
    const horn = put(new CylinderGeometry(r, r * 0.7, 0.14, 12).rotateX(Math.PI / 2), BRASS, at(ox, headY + oy, RH * 0.9 + 0.04 - Math.abs(ox) * 0.3), { delay: 1.3 + k * 0.02, rotation: [0, f, 0] });
    decorate(horn, new CylinderGeometry(r * 0.72, r * 0.72, 0.01, 12).rotateX(Math.PI / 2), 0x2a1a10, [[0, r, 0.071]]);
  });

  // What it holds: an abacus and a scroll.
  const [right, left] = robot.hands;
  const abacus = put(new BoxGeometry(0.42, 0.28, 0.05), 0x4a2a20, [right[0], right[1] + 0.02, right[2] + 0.04], { delay: 1.3, rotation: [0, f, 0] });
  [0.06, 0.12, 0.18, 0.24].forEach((y, row) => {
    decorate(abacus, new BoxGeometry(0.38, 0.012, 0.01), COPPER, [[0, y, 0.027]]);
    decorate(abacus, new SphereGeometry(0.022, 8, 6), row % 2 ? CYAN : MAGENTA, [-0.13, -0.08, 0.05 + row * 0.03, 0.12].map((x) => [x, y, 0.03] as Point));
  });
  const scroll = put(new CylinderGeometry(0.045, 0.045, 0.38, 12).rotateZ(Math.PI / 2), 0xd8c8a8, [left[0], left[1], left[2] + 0.03], { delay: 1.32, rotation: [0, f, 0.2] });
  decorate(scroll, new CylinderGeometry(0.055, 0.055, 0.02, 12).rotateZ(Math.PI / 2), COPPER, [
    [-0.195, 0.045, 0],
    [0.195, 0.045, 0],
  ]);

  // Balloons of glyphs floating out of its horns, to one side and then the other.
  const glyphs: [BufferGeometry, number][] = [
    [new TorusGeometry(0.05, 0.016, 6, 16), MAGENTA],
    [new ConeGeometry(0.065, 0.11, 3).scale(1, 1, 0.2), CYAN],
    [new BoxGeometry(0.08, 0.08, 0.02).rotateZ(Math.PI / 4), MAGENTA],
    [new TorusGeometry(0.045, 0.014, 3, 3), CYAN],
  ];
  const balloons = glyphs.map(([glyph, color], k) => {
    const balloon = add(new SphereGeometry(0.15, 14, 10).scale(1.35, 0.9, 0.4), 0xeef6f4, 0, 0, 0, { delay: 1.6 + k * 0.05, rotation: [0, 0.35, 0] });
    decorate(balloon, glyph, color, [[0, 0.135, 0.06]]);
    return balloon;
  });

  tick((t) => {
    balloons.forEach((balloon, k) => {
      const u = (t * 0.3 + k / 4 + 0.12) % 1;
      const side = k % 2 ? 1 : -1;
      const p = at(side * (0.25 + 0.75 * u), headY + 0.05 + 0.85 * u, 0.4 + 0.1 * u);
      balloon.position.set(p[0], p[1], p[2]);
      balloon.visible = u < 0.92;
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
