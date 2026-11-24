import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, Vector3, type Group } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Lamprey (P090): the vampire director of the Compagnia Lete on the roof terrace of the Lete
 * tower, pale and smiling, cape with a magenta collar, reading the open ledger whose red threads
 * run out to the lit windows of the city, drops of blood sliding along them in instalments. Bats
 * circle the spire. The price: dawn is coming up behind the parapet, and its beam creeps across
 * the terrace towards him; where it touches the hem of his cape, it smokes.
 */
export function lamprey(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const PALE = 0xcfd0e0;
  const CAPE = 0x17151f;
  const F = octagonBase(kit, 0x18142a);
  const G = floor(kit, F, 0.06, 0x2a2840, 0x1c1a2c, 0.5);

  // The terrace: a parapet, the tower's spire, a building behind with one lit window.
  box(3.0, 0.5, 0.2, 0x34304a, 0, G, -1.4, { delay: 0.1 });
  const TX = -1.1;
  const tower = box(0.9, 2.4, 0.8, 0x1e2440, TX, G, -1.15, { delay: 0.15 });
  decorate(tower, new BoxGeometry(0.04, 2.0, 0.01), CYAN, [-0.3, -0.1, 0.1, 0.3].map((x) => [x, 1.2, 0.401] as Point));
  decorate(tower, new BoxGeometry(0.11, 0.13, 0.01), YELLOW, [
    [0.2, 1.7, 0.402],
    [-0.2, 1.1, 0.402],
    [0.0, 2.05, 0.402],
    [0.2, 0.7, 0.402],
  ]);
  box(0.6, 0.6, 0.55, 0x242a4a, TX, G + 2.4, -1.15, { delay: 0.2 });
  add(new ConeGeometry(0.24, 0.8, 4), 0x2a3256, TX, G + 3.0, -1.15, { delay: 0.25, rotation: [0, Math.PI / 4, 0] });
  const block = box(0.7, 1.5, 0.4, 0x2a2440, 0.2, G, -1.75, { delay: 0.12 });
  decorate(block, new BoxGeometry(0.12, 0.14, 0.01), YELLOW, [[0.1, 1.1, 0.201]]);
  decorate(block, new BoxGeometry(0.12, 0.14, 0.01), 0x141a26, [
    [-0.15, 1.1, 0.201],
    [-0.15, 0.7, 0.201],
    [0.1, 0.7, 0.201],
  ]);

  // Dawn coming up behind the parapet, and its beam across the floor.
  const sun = add(new CylinderGeometry(0.45, 0.45, 0.04, 28).rotateX(Math.PI / 2), ORANGE, 1.15, G + 0.3, -1.55, { delay: 0.3, flat: true, rotation: [0, 0.35, 0] });
  decorate(sun, new BoxGeometry(0.05, 0.2, 0.01), YELLOW, [0.6, 1.05, 1.57, 2.1, 2.55].map((a) => [Math.cos(a) * 0.58, 0.45 + Math.sin(a) * 0.58, -0.02, a - Math.PI / 2] as [number, number, number, number]));
  const beamFrom: Point = [1.0, G + 0.002, -1.2];
  const BEAM = 1.5;
  const ray = new Shape();
  ray.moveTo(-0.14, 0);
  ray.lineTo(0.14, 0);
  ray.lineTo(0.4, BEAM);
  ray.lineTo(-0.4, BEAM);
  ray.closePath();
  const beam = add(new ExtrudeGeometry(ray, { depth: 0.006, bevelEnabled: false }).rotateX(Math.PI / 2), 0xffc85a, ...beamFrom, { delay: 0.4, flat: true, noInk: true, rotation: [0, -0.53, 0] });
  motes(10, 0x9a9aaa, 0.03, [0.1, G + 0.1, -0.12], [0.42, G + 0.9, 0.15], 1.6);

  // Lamprey: slick black hair, pointed ears, a smirk with fangs, black suit and cape.
  const FACE = 0.3;
  const turn: [number, number, number] = [0, FACE, 0];
  const vamp = figure(kit, {
    x: -0.2,
    z: 0.3,
    y: G,
    facing: FACE,
    height: 2.55,
    build: "slim",
    skin: PALE,
    hair: { style: "short", color: 0x16141e },
    face: { mouth: "smirk", brows: "raised", eyes: 0x8a1a2a },
    top: { kind: "suit", color: 0x22243a, accent: 0xe8e4ec },
    bottom: { kind: "trousers", color: 0x1e2034 },
    shoes: 0x111111,
    cape: CAPE,
    arms: [[-0.38, 1.95, 0.42], [0.26, 1.35, 0.5]],
    delay: 0.6,
  });
  const at = vamp.at;
  box(0.06, 0.42, 0.02, 0x14121c, ...at(0, 1.38, 0.255), { delay: 1.0, rotation: turn });
  const collar = new CylinderGeometry(0.42, 0.24, 0.5, 14, 1, true, Math.PI / 2 + 0.45, Math.PI - 0.9);
  add(collar.clone().scale(-0.97, 1, 0.97), MAGENTA, ...at(0, 1.8, -0.02), { delay: 1.05, rotation: turn, noInk: true });
  add(collar, CAPE, ...at(0, 1.8, -0.02), { delay: 1.05, rotation: turn });
  const RH = vamp.headRadius;
  const headY = vamp.head[1] - G;
  [-1, 1].forEach((side) => {
    const ear = add(new ConeGeometry(0.045, 0.16, 5), PALE, ...at(side * RH * 0.92, headY - 0.04, -0.02), { delay: 1.1 });
    ear.rotation.order = "YXZ";
    ear.rotation.set(-0.3, FACE, -side * 0.9);
  });
  const cy = RH * 1.06;
  decorate(vamp.headPart, new BoxGeometry(0.08, 0.08, 0.01), 0x16141e, [[0, cy + 0.13, 0.192, Math.PI / 4]]);
  decorate(vamp.headPart, new ConeGeometry(0.012, 0.045, 4).rotateX(Math.PI), 0xf4f0e6, [
    [-0.035, cy - 0.137, 0.2],
    [0.035, cy - 0.137, 0.2],
  ]);

  // The ledger, open, its pages glowing red.
  const T = 0.6;
  const bk = (px: number, py: number, pz: number): Point => at(0.1 + px, 1.33 + py * Math.cos(T) - pz * Math.sin(T), 0.6 + py * Math.sin(T) + pz * Math.cos(T));
  const tilt = (part: Group, z: number) => {
    part.rotation.order = "YXZ";
    part.rotation.set(T, FACE, z);
    return part;
  };
  tilt(box(0.58, 0.03, 0.42, 0x3a1a2a, ...bk(0, 0, 0), { delay: 1.2 }), 0);
  [-1, 1].forEach((side) => {
    const page = tilt(box(0.26, 0.05, 0.38, 0xe8dcc8, ...bk(side * 0.135, 0.03, 0), { delay: 1.25 }), side * 0.1);
    decorate(page, new BoxGeometry(0.18, 0.004, 0.014), MAGENTA, [-0.12, -0.06, 0, 0.06, 0.12].map((z) => [0, 0.051, z] as Point));
  });

  // The red threads: from the page to his fingers, and out to the city's windows.
  const page = bk(0.12, 0.1, 0);
  const [pull] = vamp.hands;
  cable(kit, [page, [(page[0] + pull[0]) / 2, Math.max(page[1], pull[1]) + 0.08, (page[2] + pull[2]) / 2], pull], 0.01, MAGENTA, 1.4);
  const windows: Point[] = [
    [TX + 0.2, G + 1.75, -0.74],
    [0.3, G + 1.17, -1.54],
  ];
  const threads = windows.map((w, k) => {
    const points: Point[] = [w, [(w[0] + page[0]) / 2, G + 2.3 - k * 0.3, (w[2] + page[2]) / 2], page];
    cable(kit, points, 0.01, MAGENTA, 1.45 + k * 0.05);
    return new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
  });
  const drops = threads.flatMap((_, k) => [0, 1].map((j) => ball(0.032, 0xff4a7a, 0, 0, 0, { delay: 1.6 + k * 0.05 + j * 0.02, flat: true, noInk: true })));

  // Two bats round the spire.
  const bats = [0, 1].map((k) => {
    const body = ball(0.05, 0x14121c, 0, 0, 0, { delay: 1.7 + k * 0.05 });
    const wings = [-1, 1].map((side) => add(new BoxGeometry(0.17, 0.01, 0.08).translate(side * 0.085, 0, 0), 0x2a2238, 0, 0, 0, { delay: 1.72 + k * 0.05 }));
    return { body, wings };
  });

  const point = new Vector3();
  tick((t) => {
    // Blood slides down the threads, the bats circle, the dawn creeps forward.
    threads.forEach((curve, k) =>
      [0, 1].forEach((j) => {
        curve.getPoint((t * 0.25 + j * 0.5 + k * 0.2) % 1, point);
        drops[k * 2 + j].position.set(point.x, point.y - 0.032, point.z);
      }),
    );
    bats.forEach(({ body, wings }, k) => {
      const a = t * 1.1 + k * Math.PI;
      const x = TX + Math.cos(a) * 0.5;
      const y = G + 3.25 + Math.sin(a * 2) * 0.1 + k * 0.2;
      const z = -1.0 + Math.sin(a) * 0.4;
      body.position.set(x, y - 0.05, z);
      wings.forEach((wing, side) => {
        wing.position.set(x, y, z);
        wing.rotation.set(0, -a, (side ? 1 : -1) * Math.sin(t * 12 + k) * 0.6);
      });
    });
    beam.children[0].scale.z = 0.92 + (Math.sin(t * 0.7) + 1) * 0.05;
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
