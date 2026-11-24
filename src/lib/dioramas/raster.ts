import { BoxGeometry, ConeGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { MAGENTA, ORANGE, YELLOW, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, puddle } from "@/lib/diorama-props";

/**
 * Raster (P095): the rookie in the blue hoodie stands on the corner under a water tower, one
 * hand at her round glasses, and fires the lasers from her eyes at a street sign, which they
 * slice in two in a spray of sparks. Her lenses smoke; on the low wall beside her lie the three
 * pairs of glasses she has already burnt, still smoking, because she sees very little.
 */
export function raster(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const BRICK = 0x5a2a3a;
  const HOODIE = 0x2b4fa8;
  const SMOKE = 0x8a8f9c;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x343846, 0x24262f, 0.5);

  // The corner: a brick house with a water tower on its roof, a low wall, a puddle.
  facade(kit, -0.4, -1.6, G, 0.1, { width: 2.2, height: 2.3, color: BRICK, windows: 3, floors: 2, depth: 0.2, door: true, shutters: 0x23404b });
  const roof = G + 2.3;
  [-0.25, 0.25].forEach((dx) => [-0.2, 0.2].forEach((dz) => box(0.05, 0.5, 0.05, 0x3e3028, -0.9 + dx, roof, -1.6 + dz, { delay: 0.3, noInk: true })));
  const tank = cylinder(0.34, 0.34, 0.5, 0x5e4a3a, -0.9, roof + 0.5, -1.6, { delay: 0.35 }, 14);
  decorate(tank, new TorusGeometry(0.345, 0.012, 4, 20).rotateX(Math.PI / 2), 0x3e3028, [
    [0, 0.15, 0],
    [0, 0.35, 0],
  ]);
  add(new ConeGeometry(0.38, 0.24, 14), 0x3e3028, -0.9, roof + 1.0, -1.6, { delay: 0.4 });
  const wall = box(1.0, 0.45, 0.35, BRICK, -1.4, G, 0.85, { delay: 0.25, rotation: [0, 0.6, 0] });
  decorate(wall, new BoxGeometry(1.0, 0.012, 0.36), 0x3e1e2a, [
    [0, 0.15, 0],
    [0, 0.3, 0],
  ]);
  box(1.04, 0.05, 0.39, 0x6d7f9a, -1.4, G + 0.45, 0.85, { delay: 0.28, rotation: [0, 0.6, 0] });
  puddle(kit, -0.15, 1.35, G, 0.3, 0.38, MAGENTA);

  // The three pairs she has already burnt, charred and smoking on the wall.
  const smoke: { puff: Group; from: Point; phase: number }[] = [];
  [-0.32, 0, 0.32].forEach((d, i) => {
    const x = -1.4 + d * Math.cos(0.6);
    const z = 0.85 - d * Math.sin(0.6);
    const y = G + 0.5;
    const pair = add(new TorusGeometry(0.06, 0.014, 6, 14), 0x2a2622, x, y, z, { delay: 0.5 + i * 0.05, rotation: [-1.2, 0.6 + i * 0.4, 0.2 * i] });
    decorate(pair, new TorusGeometry(0.06, 0.014, 6, 14), 0x2a2622, [[0.15, 0.074, 0]]);
    decorate(pair, new BoxGeometry(0.05, 0.014, 0.014), 0x2a2622, [[0.075, 0.09, 0]]);
    decorate(pair, new BoxGeometry(0.08, 0.06, 0.01), 0x5a3010, [[0.0, 0.074, 0]]);
    const from: Point = [x + 0.05, y + 0.05, z];
    smoke.push({ puff: ball(0.05, SMOKE, ...from, { delay: 0.8, noInk: true }), from, phase: i * 0.33 });
  });

  // The street sign, sliced along a diagonal: the top half slips off the cut.
  const SX = 1.25;
  const SZ = 1.2;
  cylinder(0.04, 0.04, 2.15, 0x4a4f5c, SX, G, SZ, { delay: 0.3 }, 8);
  const triangle = (points: [number, number][]) => {
    const shape = new Shape();
    shape.moveTo(...points[0]);
    points.slice(1).forEach((p) => shape.lineTo(...p));
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02);
  };
  const plate = new Group();
  const low = add(triangle([[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3]]), 0x2a5a9a, 0, -0.3, 0, { delay: 0.45 });
  low.parent?.add(plate);
  plate.add(low);
  const high = add(triangle([[0.3, -0.27], [0.3, 0.3], [-0.27, 0.3]]), 0x2a5a9a, 0, -0.27, 0, { delay: 0.5 });
  plate.add(high);
  decorate(low, new BoxGeometry(0.5, 0.025, 0.01), 0xd8d4c8, [[0, 0.04, 0.022]]);
  decorate(high, new BoxGeometry(0.025, 0.5, 0.01), 0xd8d4c8, [[0.26, 0.3, 0.022]]);
  // The glowing cut.
  const cut = add(new BoxGeometry(0.84, 0.03, 0.05), ORANGE, 0, -0.015, 0.0, { delay: 0.55, flat: true, noInk: true, rotation: [0, 0, -Math.PI / 4] });
  plate.add(cut);
  plate.position.set(SX + 0.03, G + 1.95, SZ + 0.07);
  plate.rotation.y = 0.35;
  const hit: Point = [SX + 0.02, G + 1.95, SZ + 0.08];

  // Raster, a hand at her glasses, firing at the sign.
  const FACE = 0.93;
  const rookie = figure(kit, {
    x: -0.5,
    z: -0.1,
    y: G,
    facing: FACE,
    height: 2.3,
    build: "slim",
    skin: 0xe8b898,
    hair: { style: "curly", color: 0x9a3a1e },
    face: { mouth: "open", brows: "angry", eyes: YELLOW, glow: true, glasses: "round", glassesColor: 0x8a93a3, marks: 0xc08060 },
    top: { kind: "hoodie", color: HOODIE, accent: 0x3a64c8 },
    bottom: { kind: "trousers", color: 0x1e2a4a },
    shoes: 0xe0dccf,
    arms: ["hip", [0.24, 1.98, 0.14]],
    legs: "wide",
    delay: 0.8,
  });
  const u = 2.3 / 2.4;
  const beams = [-1, 1].map((side, i) => {
    const eye = rookie.at(side * 0.08 * u, 2.14 * u + 0.03 * u, 0.22 * u * 0.9 + 0.03);
    const { length, rotation } = aim(eye, hit);
    const glow = box(0.07, length, 0.07, ORANGE, ...eye, { delay: 1.4 + i * 0.03, flat: true, noInk: true, rotation });
    box(0.025, length, 0.025, 0xfff1a8, ...eye, { delay: 1.45 + i * 0.03, flat: true, noInk: true, rotation });
    return glow;
  });
  // Her lenses smoke too.
  const lens = rookie.at(0, 2.14 * u + 0.12, 0.25);
  smoke.push({ puff: ball(0.06, SMOKE, ...lens, { delay: 1.5, noInk: true }), from: lens, phase: 0.5 });
  smoke.push({ puff: ball(0.045, SMOKE, ...lens, { delay: 1.5, noInk: true }), from: lens, phase: 0 });

  // Sparks spraying off the cut.
  const sparks = [0.4, 1.3, 2.2, 3.4, 4.4, 5.4].map((a, k) =>
    box(0.025, 0.18 + (k % 3) * 0.06, 0.025, k % 2 ? YELLOW : 0xfff1a8, ...hit, { delay: 1.6 + k * 0.02, flat: true, noInk: true, rotation: [Math.cos(a) * 1.2, 0, Math.sin(a) * 1.4 + 0.6] }),
  );
  motes(10, ORANGE, 0.025, [SX - 0.4, G + 1.4, SZ - 0.2], [SX + 0.3, G + 2.4, SZ + 0.3], 1.6);

  tick((t) => {
    // The beams buzz; the cut half slides off and falls, and the next one starts.
    beams.forEach((beam, i) => beam.children[0].scale.set(1 + Math.sin(t * 40 + i) * 0.25, 1, 1 + Math.sin(t * 40 + i) * 0.25));
    const u2 = (t * 0.35) % 1;
    const slide = 0.02 + u2 * 0.22;
    high.position.set(-slide * 0.5, -0.27 - slide * 0.5 - u2 * u2 * 1.2, 0);
    high.rotation.z = u2 * u2 * 1.4;
    high.visible = u2 < 0.8;
    sparks.forEach((spark, k) => (spark.visible = Math.floor(t * 12 + k * 3) % 4 !== 0));
    for (const { puff, from, phase } of smoke) {
      const p = (t * 0.5 + phase) % 1;
      puff.position.set(from[0] + Math.sin(p * 6) * 0.05, from[1] + p * 0.7, from[2]);
      puff.children[0].scale.setScalar(0.6 + p);
    }
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
