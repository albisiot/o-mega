import { BoxGeometry, CatmullRomCurve3, Color, CylinderGeometry, DodecahedronGeometry, TorusGeometry, TubeGeometry, Vector3, type Group } from "three";
import { CYAN, INK, MAGENTA, ORANGE, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Katabatic (P122): the wind that runs down the volcano, sold to the city by the Compagnia Lete,
 * stands on a ledge of black lava with her arms spread, gusts curling round her grey coat and
 * pouring down the slope from the glowing crater behind; beside her the Compagnia's meter
 * spins its needle and spits out bill after bill, and the wind carries them off down the hill.
 */
export function katabatic(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const ROCK = 0x2c2632;
  const ROCK_LIGHT = 0x3b3344;
  const WIND = 0xcfeef7;
  const COAT = 0x4b4f5c;
  const PAPER = 0xf2efe6;
  const F = octagonBase(kit, 0x1d1a22);
  const G = floor(kit, F, 0.06, 0x27222e, 0x1c1822, 0);

  // The volcano behind her: a rugged cone, lava down the face we see, a glowing crater, a plume.
  const VX = -0.9;
  const VZ = -1.2;
  const VH = 2.7;
  add(new CylinderGeometry(0.28, 0.8, VH, 9), 0x2e2236, VX, G, VZ, { delay: 0.1 });
  const crater = cylinder(0.25, 0.25, 0.03, ORANGE, VX, G + VH, VZ, { delay: 0.2, flat: true, noInk: true }, 9);
  // Two lava streams wandering down the face we see.
  const lava = [0.15, 0.85].flatMap((a, i) => {
    const at = (h: number, bend: number): Point => {
      const r = 0.28 + (0.8 - 0.28) * (1 - h) + 0.03;
      return [VX + r * Math.sin(a + bend), G + VH * h, VZ + r * Math.cos(a + bend)];
    };
    const points = [at(1, 0), at(0.7, 0.12), at(0.4, -0.06), at(0.02, 0.1)];
    return points.slice(1).map((to, k) => limb(kit, points[k], to, 0.022 + k * 0.008, 0.03 + k * 0.008, ORANGE, { delay: 0.25 + i * 0.05 + k * 0.03, flat: true, noInk: true }));
  });
  [
    [0, 0.15, 0.2],
    [0.18, 0.45, 0.26],
    [0.05, 0.8, 0.3],
  ].forEach(([dx, dy, r], i) => kit.ball(r, 0x4a2448, VX + dx, G + VH + dy, VZ, { delay: 0.35 + i * 0.05, noInk: true }));
  motes(8, 0x9a8fa0, 0.03, [VX - 0.25, G + VH, VZ - 0.2], [VX + 0.35, G + VH + 1.3, VZ + 0.2], 1.2);

  // Black rocks down the slope, and the ledge she stands on, cracked with lava.
  [
    [-1.85, 0.35, 0.34, 0.2],
    [1.55, -0.95, 0.4, 1.1],
    [1.35, 1.05, 0.26, 0.6],
    [-1.05, 1.35, 0.22, 2.1],
    [0.55, -1.55, 0.3, 1.7],
  ].forEach(([x, z, s, turn], i) =>
    add(new DodecahedronGeometry(s).scale(1.25, 0.7, 1), i % 2 ? ROCK : ROCK_LIGHT, x, G, z, { delay: 0.15 + i * 0.03, rotation: [0, turn, 0] }),
  );
  const ledge = add(new CylinderGeometry(0.72, 0.86, 0.24, 7), ROCK_LIGHT, 0.3, G, 0.3, { delay: 0.3 });
  decorate(ledge, new BoxGeometry(0.4, 0.004, 0.025), ORANGE, [
    [-0.35, 0.242, 0.35],
    [0.4, 0.242, -0.3],
  ]);
  const L = G + 0.24;

  // The Compagnia's meter, needle running, a bill coming out of the slot.
  const MX = -1.3;
  const MZ = 0.75;
  const TURN = 0.45;
  cylinder(0.045, 0.06, 0.95, 0x23222b, MX, G, MZ, { delay: 0.5 }, 8);
  const head = box(0.36, 0.42, 0.24, MAGENTA, MX, G + 0.95, MZ, { delay: 0.55, rotation: [0, TURN, 0] });
  decorate(head, new CylinderGeometry(0.12, 0.12, 0.01, 20).rotateX(Math.PI / 2), CYAN, [[0, 0.26, 0.122]]);
  decorate(head, new BoxGeometry(0.2, 0.025, 0.01), INK, [[0, 0.07, 0.122]]);
  const face = (ahead: number, up: number): Point => [MX + ahead * Math.sin(TURN), G + 0.95 + up, MZ + ahead * Math.cos(TURN)];
  const needle = box(0.014, 0.1, 0.01, INK, ...face(0.135, 0.26), { delay: 0.65, flat: true, noInk: true, rotation: [0, TURN, 0] });

  // Katabatic: silver bob, black polo neck, the long grey coat, arms spread to the wind.
  figure(kit, {
    x: 0.3,
    z: 0.3,
    y: L,
    facing: 0.3,
    height: 2.45,
    build: "slim",
    skin: 0xe6dcd6,
    hair: { style: "bob", color: 0xe4e6ee },
    face: { mouth: "neutral", brows: "calm", eyes: 0x16c8ff, glow: true },
    top: { kind: "coat", color: COAT, accent: 0x17151d },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    shoes: 0x1a1a22,
    cape: COAT,
    arms: ["out", "out"],
    delay: 0.8,
  });
  // The wind curling round her legs.
  const curls = [0.25, 0.75, 1.2].map((h, k) =>
    add(new TorusGeometry(0.62 - k * 0.08, 0.02, 4, 28, 4.4).rotateX(Math.PI / 2), k % 2 ? CYAN : WIND, 0.3, L + h, 0.3, { delay: 1.25 + k * 0.05, flat: true, noInk: true }),
  );

  // The gusts: pale streams down the slope, with dashes and bills running along them.
  const paths: Point[][] = [
    [[-0.7, G + 2.0, -0.85], [-0.55, G + 1.45, -0.15], [-0.55, G + 0.9, 0.6], [0.2, G + 0.5, 1.35], [1.3, G + 0.3, 1.55]],
    [[-0.45, G + 2.15, -1.0], [0.35, G + 2.0, -0.55], [1.2, G + 1.35, -0.1], [1.65, G + 0.7, 0.65], [1.55, G + 0.3, 1.4]],
    [[-1.75, G + 0.55, -0.35], [-1.15, G + 0.3, 0.55], [-0.2, G + 0.22, 1.35], [0.85, G + 0.2, 1.8]],
  ];
  const curves = paths.map((points) => new CatmullRomCurve3(points.map((p) => new Vector3(...p))));
  curves.forEach((curve, i) => {
    const tube = new TubeGeometry(curve, 48, 0.018, 5);
    tube.computeBoundingBox();
    add(tube, WIND, 0, tube.boundingBox?.min.y ?? 0, 0, { delay: 1.0 + i * 0.08, flat: true, noInk: true });
  });
  type Runner = { part: Group; curve: CatmullRomCurve3; speed: number; phase: number; tumble: number };
  const runners: Runner[] = [];
  curves.forEach((curve, i) =>
    [0, 1, 2, 3].forEach((k) =>
      runners.push({ part: box(0.045, 0.36, 0.045, k % 2 ? CYAN : WIND, 0, 0, 0, { delay: 1.2, flat: true, noInk: true }), curve, speed: 0.22 + i * 0.03, phase: k / 4 + i * 0.1, tumble: 0 }),
    ),
  );
  const billPath = new CatmullRomCurve3([face(0.2, 0.0), [-0.75, G + 0.75, 1.25], [0.35, G + 0.95, 1.65], [1.3, G + 0.7, 1.4], [1.9, G + 0.35, 0.85]].map((p) => new Vector3(...p)));
  [0, 1, 2].forEach((k) => {
    const bill = box(0.16, 0.01, 0.11, PAPER, 0, 0, 0, { delay: 1.4, ink: 1.15 });
    decorate(bill, new BoxGeometry(0.1, 0.012, 0.012), 0x9aa0ab, [
      [0, 0.002, -0.02],
      [0, 0.002, 0.02],
    ]);
    runners.push({ part: bill, curve: billPath, speed: 0.16, phase: k / 3, tumble: 1 });
  });

  const hot = new Color(ORANGE);
  const glow = new Color(0xffc040);
  tick((t) => {
    for (const r of runners) {
      const u = (t * r.speed + r.phase) % 1;
      const p = r.curve.getPointAt(u);
      const q = r.curve.getPointAt(Math.min(1, u + 0.03));
      r.part.position.copy(p);
      if (r.tumble) r.part.rotation.set(t * 3 + r.phase * 5, t * 2, t * 4 + r.phase);
      else r.part.rotation.set(...aim([p.x, p.y, p.z], [q.x, q.y, q.z]).rotation);
      r.part.visible = u < 0.95;
    }
    curls.forEach((curl, k) => (curl.rotation.y = -t * (2.2 + k * 0.6) - k * 2));
    // The bill meter never stops; the crater breathes.
    needle.rotation.z = -t * 4;
    const k = (Math.sin(t * 2) + 1) / 2;
    colorOf(crater).lerpColors(hot, glow, k);
    lava.forEach((streak) => colorOf(streak).lerpColors(hot, glow, k * 0.6));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
