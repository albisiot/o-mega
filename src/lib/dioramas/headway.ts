import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor, towerCrane } from "@/lib/diorama-props";

/**
 * Headway (P062): the girl with a backpack of fire extinguishers shoots across a building
 * site at night, arms out and teeth clenched, a white-and-yellow plume behind her. She can start
 * but not stop: ahead of her the brick wall she always brakes on already bears her spread-eagle
 * dent and its cracks, and someone has leant a mattress under it.
 */
export function headway(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SUIT = 0xc8285e;
  const PATCH = 0x6a6f80;
  const TANK = 0xd0203a;
  const DARK = 0x23222b;
  const BRICK = 0x5a3a52;
  const F = octagonBase(kit, 0x1c1c26);
  const G = floor(kit, F, 0.06, 0x2a2c36, 0x1e2029, 0);
  // Lane dashes on the asphalt.
  [-1.3, -0.6, 0.1, 0.8, 1.5].forEach((x, i) => box(0.36, 0.006, 0.06, 0x8a93a3, x, G, 1.2 - x * 0.18, { delay: 0.1 + i * 0.02, flat: true, noInk: true, rotation: [0, 0.18, 0] }));

  // The wall she stops on, slanted to face both her and us.
  const WT = 1.15;
  const WX = -1.6;
  const WZ = -0.5;
  const wallAt = (lx: number, ly: number, lz: number): Point => [WX + lx * Math.cos(WT) + lz * Math.sin(WT), G + ly, WZ - lx * Math.sin(WT) + lz * Math.cos(WT)];
  const wall = box(2.2, 2.7, 0.22, BRICK, WX, G, WZ, { delay: 0.12, ink: 1.02, rotation: [0, WT, 0] });
  const face = 0.115;
  const rows: Point[] = [];
  for (let k = 1; k < 15; k++) rows.push([0, k * 0.18, face]);
  decorate(wall, new BoxGeometry(2.2, 0.02, 0.01), shade(BRICK, 0.6), rows);
  const joints: Point[] = [];
  for (let k = 0; k < 14; k++) for (let j = 0; j < 5; j++) if ((k * 3 + j) % 4 !== 1) joints.push([-0.9 + j * 0.42 + (k % 2) * 0.21, 0.09 + k * 0.18, face]);
  decorate(wall, new BoxGeometry(0.02, 0.17, 0.01), shade(BRICK, 0.6), joints);
  // Her dent: a spread-eagle hollow with cracks round it; an older, smaller star of cracks.
  const DENT = shade(BRICK, 0.45);
  const dent: [number, number, number, number?][] = [
    [-0.4, 1.55, face + 0.004],
    [-0.82, 1.9, face + 0.004, -0.9],
    [0.02, 1.9, face + 0.004, 0.9],
    [-0.53, 1.0, face + 0.004, -0.25],
    [-0.27, 1.0, face + 0.004, 0.25],
  ];
  decorate(wall, new BoxGeometry(0.38, 0.62, 0.01), DENT, [dent[0]]);
  decorate(wall, new BoxGeometry(0.12, 0.62, 0.01), DENT, dent.slice(1));
  decorate(wall, new CylinderGeometry(0.17, 0.17, 0.01, 16).rotateX(Math.PI / 2), DENT, [[-0.4, 2.05, face + 0.004]]);
  const crack = (cx: number, cy: number, r: number, n: number, seed: number): [number, number, number, number][] =>
    Array.from({ length: n }, (_, k) => {
      const a = seed + (k / n) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, face + 0.006, a + Math.PI / 2];
    });
  decorate(wall, new BoxGeometry(0.02, 0.32, 0.01), INK, crack(-0.4, 1.65, 0.62, 9, 0.3));
  decorate(wall, new BoxGeometry(0.016, 0.18, 0.01), INK, crack(0.6, 2.2, 0.16, 6, 0.1));
  // A mattress propped under it, by someone kind, and the empty extinguishers of earlier trips.
  const mattress = box(0.85, 1.25, 0.16, 0xe8e2d0, ...wallAt(-0.4, 0, face + 0.36), { delay: 0.3, rotation: [-0.2, WT, 0] });
  [
    [-1.0, 1.05, 0.5],
    [0.75, 1.45, -1.1],
  ].forEach(([x, z, turn], i) => {
    const spent = add(new CylinderGeometry(0.11, 0.11, 0.6, 12).rotateZ(Math.PI / 2), TANK, x, G, z, { delay: 0.4 + i * 0.04, rotation: [0, turn, 0] });
    decorate(spent, new CylinderGeometry(0.05, 0.08, 0.1, 10).rotateZ(Math.PI / 2), DARK, [[0.33, 0.11, 0]]);
  });
  mattress.rotation.order = "YXZ";
  decorate(mattress, new BoxGeometry(0.06, 1.25, 0.01), CYAN, [-0.3, -0.1, 0.1, 0.3].map((x) => [x, 0.625, 0.085] as Point));
  // The building site behind: a crane with its blinking light, a striped barrier.
  const beacon = towerCrane(kit, 1.55, -1.5, G, 0.2, 3.3, -1.3, 0x3a4a6a);
  [-1, 1].forEach((side) => box(0.05, 0.6, 0.05, DARK, 0.75 + side * 0.45, G, -1.0, { delay: 0.34, noInk: true }));
  const bar = box(1.1, 0.16, 0.05, 0xe8e2d0, 0.75, G + 0.42, -0.98, { delay: 0.38 });
  decorate(bar, new BoxGeometry(0.12, 0.16, 0.01), MAGENTA, [-0.4, -0.13, 0.14, 0.41].map((x) => [x, 0.08, 0.03, 0.5] as [number, number, number, number]));

  // Headway, built standing and then laid out in flight.
  const Y0 = -1.25;
  const flyer = figure(kit, {
    x: 0,
    z: 0,
    y: Y0,
    height: 2.35,
    build: "slim",
    skin: 0xe8b896,
    hair: { style: "bald", color: 0x4a2a20 },
    face: { mouth: "grin", brows: "worried", eyes: 0x2a6a9a },
    top: { kind: "uniform", color: SUIT, accent: PATCH },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x3a2c22,
    arms: [[-0.8, 2.3, 0.3], [0.85, 2.15, 0.25]],
    delay: 0.7,
  });
  const at = flyer.at;
  const D = 1.3;
  const pack: Group[] = [];
  // Grey patches on the knees, the harness over the shoulders, the visor pushed up.
  [-1, 1].forEach((side) => pack.push(box(0.14, 0.14, 0.04, PATCH, ...at(side * 0.17, 0.56, 0.1), { delay: D, noInk: true })));
  [-1, 1].forEach((side) => pack.push(limb(kit, at(side * 0.17, 1.78, 0.16), at(side * 0.12, 1.25, 0.24), 0.03, 0.03, DARK, { delay: D + 0.02 })));
  pack.push(box(0.32, 0.05, 0.05, DARK, ...at(0, 1.4, 0.24), { delay: D + 0.04 }));
  // An open-face helmet (the kit's helmet would cover her face) with its visor pushed up.
  const head = flyer.head;
  const R = flyer.headRadius;
  pack.push(add(new SphereGeometry(R * 1.18, 18, 10, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.62), SUIT, head[0], head[1] - R * 0.45, head[2] - 0.01, { delay: D + 0.04 }));
  pack.push(add(new SphereGeometry(R * 1.18, 18, 6, 0, Math.PI * 2, 0, Math.PI * 0.3), SUIT, head[0], head[1] + R * 0.72, head[2] - 0.01, { delay: D + 0.05 }));
  pack.push(box(0.46, 0.03, 0.3, 0x8fc4d8, head[0], head[1] + R * 1.1, head[2] + 0.12, { delay: D + 0.06, rotation: [-0.9, 0, 0] }));
  // Two extinguishers on her back, nozzles down.
  [-1, 1].forEach((side, i) => {
    const tank = cylinder(0.12, 0.12, 0.72, TANK, ...at(side * 0.14, 1.02, -0.36), { delay: D + 0.08 + i * 0.03 }, 14);
    decorate(tank, new CylinderGeometry(0.05, 0.05, 0.01, 12).rotateX(Math.PI / 2), 0xf4f0e6, [[side * 0.05, 0.5, -0.115]]);
    decorate(tank, new BoxGeometry(0.24, 0.05, 0.24), DARK, [[0, 0.2, 0], [0, 0.55, 0]]);
    pack.push(tank);
    pack.push(cylinder(0.05, 0.08, 0.1, DARK, ...at(side * 0.14, 1.74, -0.36), { delay: D + 0.12 }));
    pack.push(box(0.04, 0.04, 0.22, DARK, ...at(side * 0.14, 1.82, -0.3), { delay: D + 0.14, rotation: [0.3, 0, 0] }));
    pack.push(add(new ConeGeometry(0.06, 0.12, 8).rotateX(Math.PI), DARK, ...at(side * 0.14, 0.9, -0.36), { delay: D + 0.14 }));
  });
  // The plume: white outside, yellow in the core, from the nozzles back past her feet.
  const nozzle = at(0, 0.92, -0.38);
  const plumeEnd = at(0.05, -0.75, -0.75);
  const coreEnd = at(0.08, -1.1, -0.95);
  const outer = add(new ConeGeometry(0.42, aim(plumeEnd, nozzle).length, 12), YELLOW, ...plumeEnd, { delay: D + 0.2, flat: true, noInk: true, rotation: aim(plumeEnd, nozzle).rotation });
  const core = add(new ConeGeometry(0.3, aim(coreEnd, nozzle).length, 10), 0xfff6d8, ...coreEnd, { delay: D + 0.24, flat: true, noInk: true, rotation: aim(coreEnd, nozzle).rotation });
  pack.push(outer, core);

  const pivot = new Group();
  flyer.parts[0].parent?.add(pivot);
  [...flyer.parts, ...pack].forEach((part) => pivot.add(part));
  const PX = 0.2;
  const PY = G + 2.0;
  const PZ = 0.25;
  pivot.position.set(PX, PY, PZ);
  pivot.rotation.set(0, 0.2, 1.12, "YXZ");

  // Puffs drifting off the end of the plume.
  const from: Point = [1.45, G + 1.25, 0.2];
  const to: Point = [2.05, G + 0.45, 0.75];
  const puffs = [0, 1, 2, 3].map((k) => ball(0.12 + k * 0.03, k % 2 ? 0xf4f0e6 : 0xd8d2c4, from[0], from[1], from[2], { delay: D + 0.3 + k * 0.04, noInk: true }));

  tick((t) => {
    pivot.position.set(PX + Math.sin(t * 13) * 0.012, PY + Math.sin(t * 2.2) * 0.05, PZ);
    pivot.rotation.z = 1.12 + Math.sin(t * 17) * 0.015;
    outer.children[0].scale.set(1 + Math.sin(t * 31) * 0.08, 1 + Math.sin(t * 23) * 0.06, 1 + Math.sin(t * 29) * 0.08);
    core.children[0].scale.set(1, 1 + Math.sin(t * 37) * 0.12, 1);
    puffs.forEach((puff, k) => {
      const u = (t * 0.6 + k / puffs.length) % 1;
      puff.position.set(from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u);
      puff.children[0].scale.setScalar(0.6 + u * 0.9);
    });
    beacon.visible = Math.floor(t * 1.5) % 2 === 0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
