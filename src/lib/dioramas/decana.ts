import { BoxGeometry, CylinderGeometry, DoubleSide, type Mesh, type MeshToonMaterial, type Object3D, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor, orb } from "@/lib/diorama-props";

/**
 * Decana (P284): the headmistress of the Academy of Syllables, sold to the Compagnia Lete, in
 * her study at night with the Lete chimneys smoking beyond the window. Bald, gold glyphs on her
 * scalp, high-collared velvet, she conducts magenta threads of spell into the horn of a brass
 * machine; it punches the instalment plan into a paper tape that runs across the floor and
 * winds round the ankles of the student who bought one syllable. She has no strength at all:
 * even her book floats on a thread.
 */
export function decana(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const BRASS = 0xb08d3c;
  const VELVET = 0x3a1a3e;
  const PAPER = 0xe8e0cc;
  const F = octagonBase(kit, 0x1c1a24);
  const G = floor(kit, F, 0.06, 0x2a2230, 0x1e1824, 0.45);

  // The study wall: a tall window on the Lete works, a shelf of flasks.
  const wall = box(3.6, 3.0, 0.25, 0x221e30, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  const W = 0.55;
  const glass = 0.126;
  decorate(wall, new BoxGeometry(1.5, 1.8, 0.01), 0x1a2440, [[W, 1.85, glass]]);
  decorate(wall, new BoxGeometry(1.5, 0.05, 0.01), CYAN, [[W, 1.15, glass + 0.002]]);
  decorate(wall, new BoxGeometry(0.14, 0.7, 0.01), 0x2a2a3a, [
    [W - 0.45, 1.3, glass + 0.003],
    [W - 0.15, 1.42, glass + 0.003],
    [W + 0.1, 1.26, glass + 0.003],
  ]);
  decorate(wall, new BoxGeometry(0.15, 0.04, 0.01), MAGENTA, [
    [W - 0.45, 1.66, glass + 0.004],
    [W - 0.15, 1.78, glass + 0.004],
    [W + 0.1, 1.62, glass + 0.004],
  ]);
  decorate(wall, new CylinderGeometry(0.22, 0.32, 0.55, 12).scale(1, 1, 0.04), 0x34344a, [[W + 0.45, 1.2, glass + 0.003]]);
  decorate(wall, new BoxGeometry(0.06, 1.85, 0.03), INK, [
    [W - 0.76, 1.85, glass + 0.01],
    [W, 1.85, glass + 0.01],
    [W + 0.76, 1.85, glass + 0.01],
  ]);
  decorate(wall, new BoxGeometry(1.58, 0.06, 0.03), INK, [
    [W, 0.94, glass + 0.01],
    [W, 1.85, glass + 0.01],
    [W, 2.76, glass + 0.01],
  ]);
  // Smoke from the chimneys, rising in the glass.
  const smokeAt = wall.children.length;
  decorate(wall, new SphereGeometry(0.05, 8, 6).scale(1, 1, 0.2), 0x4a3450, Array.from({ length: 6 }, () => [0, 0, glass + 0.005] as Point));
  const smoke = wall.children.slice(smokeAt);
  const chimneys = [W - 0.45, W - 0.15, W + 0.1];
  const puff = (t: number) =>
    smoke.forEach((s: Object3D, k) => {
      const v = (t * 0.25 + k / 6) % 1;
      s.position.set(chimneys[k % 3] + v * 0.25, 1.7 + (k % 3 === 1 ? 0.12 : 0) + v * 0.75, glass + 0.005);
      s.scale.setScalar(0.7 + v);
    });
  puff(0);
  box(0.9, 0.05, 0.25, 0x3e3028, -1.15, G + 1.55, -1.25, { delay: 0.3 });
  [
    [-1.45, 0.07, 0.22, CYAN],
    [-1.25, 0.05, 0.3, MAGENTA],
    [-1.02, 0.08, 0.18, 0x9fe8ff],
    [-0.82, 0.05, 0.26, MAGENTA],
  ].forEach(([x, r, h, color], i) => {
    cylinder(r * 0.6, r, h, color, x, G + 1.6, -1.25, { delay: 0.35 + i * 0.03 }, 10);
    ball(r * 0.8, shade(color, 0.7), x, G + 1.6 + h - 0.02, -1.25, { delay: 0.38 + i * 0.03 });
  });

  // The brass machine: a cabinet that punches tape, its horn turned to her.
  const M: Point = [0.65, G, -0.4];
  const cabinet = box(0.6, 0.9, 0.45, 0x4a2e22, ...M, { delay: 0.4 });
  decorate(cabinet, new BoxGeometry(0.62, 0.06, 0.47), BRASS, [
    [0, 0.05, 0],
    [0, 0.86, 0],
  ]);
  decorate(cabinet, new TorusGeometry(0.08, 0.015, 6, 16), BRASS, [
    [-0.15, 0.6, 0.23],
    [0.15, 0.6, 0.23],
  ]);
  decorate(cabinet, new BoxGeometry(0.34, 0.03, 0.02), INK, [[0, 0.32, 0.23]]);
  cylinder(0.04, 0.05, 0.25, BRASS, M[0] + 0.1, G + 0.9, M[2], { delay: 0.5 }, 10);
  const horn = add(new CylinderGeometry(0.27, 0.035, 0.6, 18), BRASS, M[0] + 0.1, G + 1.12, M[2], { delay: 0.55, rotation: [0.25, 0, 0.95] });
  decorate(horn, new CylinderGeometry(0.22, 0.22, 0.02, 18), 0x2a1a10, [[0, 0.605, 0]]);
  decorate(horn, new TorusGeometry(0.27, 0.025, 6, 24).rotateX(Math.PI / 2), shade(BRASS, 1.2), [[0, 0.6, 0]]);
  const mouth: Point = [M[0] + 0.1 - 0.6 * Math.sin(0.95), G + 1.12 + 0.6 * Math.cos(0.95) * Math.cos(0.25), M[2] + 0.6 * Math.cos(0.95) * Math.sin(0.25)];

  // The tape: out of the slot, down to the floor, across to the student's feet.
  const slope = aim([M[0], G + 0.32, M[2] + 0.24], [M[0] + 0.05, G + 0.02, M[2] + 0.6]);
  add(new BoxGeometry(0.24, slope.length, 0.006), PAPER, M[0], G + 0.02, M[2] + 0.6, { delay: 0.7, rotation: slope.rotation, noInk: true });
  const S: Point = [1.45, G, 0.85];
  const run = aim([M[0] + 0.05, G + 0.01, M[2] + 0.6], [S[0], G + 0.01, S[2]]);
  const tape = add(new BoxGeometry(0.24, run.length, 0.006), PAPER, M[0] + 0.05, G + 0.005, M[2] + 0.6, { delay: 0.75, rotation: run.rotation, noInk: true });
  const holesAt = tape.children.length;
  decorate(tape, new BoxGeometry(0.025, 0.04, 0.004), INK, Array.from({ length: 14 }, (_, k) => [((k * 5) % 3 - 1) * 0.05, 0, 0.004] as Point));
  const holes = tape.children.slice(holesAt);
  const scroll = (t: number) => holes.forEach((hole, k) => (hole.position.y = ((k / holes.length + t * 0.12) % 1) * run.length));
  scroll(0);
  [0.12, 0.3, 0.48].forEach((y, k) => {
    const loop = add(new CylinderGeometry(0.27 - k * 0.03, 0.27 - k * 0.03, 0.12, 18, 1, true), PAPER, S[0], G + y - 0.08, S[2], { delay: 1.6 + k * 0.05, noInk: true, rotation: [0.15 * (k - 1), 0, 0.12] });
    ((loop.children[0] as Mesh).material as MeshToonMaterial).side = DoubleSide;
  });

  // Decana: bald, gold glyphs on her scalp, the high collar, a velvet robe with gold buttons.
  const facing = 0.3;
  const teacher = figure(kit, {
    x: -0.5,
    z: 0.15,
    y: G,
    facing,
    height: 2.45,
    build: "slim",
    skin: 0xe6c4ac,
    hair: { style: "bald", color: 0x8a6a5a },
    face: { mouth: "smirk", brows: "raised" },
    top: { kind: "robe", color: VELVET, accent: 0x5a2a5e },
    gloves: 0xe6c4ac,
    arms: [
      [-0.5, 1.25, 0.35],
      [0.38, 2.05, 0.38],
    ],
    delay: 0.8,
  });
  const u = 2.45 / 2.4;
  const R = teacher.headRadius;
  const cy = R * 1.06;
  [0.1, 0.15, 0.19].forEach((dy, row) => {
    const tilt = Math.asin(dy / R);
    decorate(
      teacher.headPart,
      new BoxGeometry(0.07, 0.012, 0.01).rotateX(-tilt),
      YELLOW,
      [-1, 0, 1].map((k) => [k * (0.07 - row * 0.015), cy + dy, Math.sqrt(R * R - dy * dy) * 0.93 + 0.005, (k + row) % 2 ? 0.5 : -0.4] as [number, number, number, number]),
    );
  });
  const collar = add(new CylinderGeometry(R * 1.25, R * 0.75, 0.34, 16, 1, true, 0.9, Math.PI * 2 - 1.8), 0x2a1030, ...teacher.at(0, 1.66 * u, -0.01), { delay: 1.3, noInk: true, rotation: [0, facing, 0] });
  ((collar.children[0] as Mesh).material as MeshToonMaterial).side = DoubleSide;
  [1.2, 1.32, 1.44, 1.56].forEach((y, i) => ball(0.025, YELLOW, ...teacher.at(0, y * u, (0.18 + (y - 1.08) * 0.06) * u + 0.01), { delay: 1.35 + i * 0.02 }));

  // The threads she draws into the horn, and the one holding up her book.
  const [low, high] = teacher.hands;
  const threads = [0, 1, 2].map((k) =>
    cable(
      kit,
      [high, [high[0] + 0.15 + k * 0.08, high[1] + 0.2 - k * 0.15, high[2] + 0.25], [mouth[0] - 0.1, mouth[1] + 0.25 - k * 0.12, mouth[2] + 0.3 - k * 0.1], mouth],
      0.012,
      MAGENTA,
      1.5 + k * 0.05,
    ),
  );
  const book = box(0.34, 0.08, 0.26, 0x6a1a2a, low[0], low[1] + 0.3, low[2], { delay: 1.6, rotation: [0.2, facing, 0.15] });
  decorate(book, new BoxGeometry(0.32, 0.05, 0.27), PAPER, [[0.01, 0.015, 0]]);
  cable(kit, [low, [low[0] + 0.02, low[1] + 0.15, low[2] + 0.05], [low[0], low[1] + 0.3, low[2]]], 0.01, MAGENTA, 1.65);
  motes(10, MAGENTA, 0.025, [high[0] - 0.1, mouth[1] - 0.1, mouth[2] - 0.1], [mouth[0] + 0.2, high[1] + 0.3, high[2] + 0.3], 1.8);

  // The student who bought one syllable, the tape round his ankles.
  const student = figure(kit, {
    x: S[0],
    z: S[2],
    y: G,
    facing: -0.1,
    height: 2.05,
    build: "slim",
    skin: 0xc89878,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "open", brows: "worried", glasses: "round" },
    top: { kind: "uniform", color: 0x24385a, accent: YELLOW },
    bottom: { kind: "trousers", color: 0x1e2a40 },
    shoes: 0x2a2622,
    arms: ["cast", "cast"],
    delay: 1.1,
  });
  const cupped: Point = [(student.hands[0][0] + student.hands[1][0]) / 2, student.hands[0][1] + 0.12, (student.hands[0][2] + student.hands[1][2]) / 2];
  const syllable = orb(kit, cupped, 0.07, YELLOW, 1.7);

  const restBook = book.position.y;
  tick((t) => {
    // The threads ripple into the horn; the tape runs; the book bobs; smoke rises; the syllable flickers.
    threads.forEach((thread, k) => (thread.rotation.x = Math.sin(t * 2.2 + k * 1.7) * 0.06));
    scroll(t);
    puff(t);
    book.position.y = restBook + Math.sin(t * 1.6) * 0.04;
    syllable.visible = Math.floor(t * 5) % 9 !== 4;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
