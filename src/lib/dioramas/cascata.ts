import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, type Material, type Mesh } from "three";
import { CYAN, MAGENTA, YELLOW, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/** Moves parts into one group turning about `pivot` (in their parent's frame), to tilt them as one. */
function rig(parts: Group[], pivot: Point): Group {
  const group = new Group();
  group.position.set(...pivot);
  parts[0].parent?.add(group);
  for (const part of parts) {
    part.position.sub(group.position);
    group.add(part);
  }
  return group;
}

/**
 * Cascata (P306): on a studio backlot by the port the stuntwoman has just burst through the
 * sugar-glass window of a fake house front, propped up from behind by beams and sandbags, and
 * dives smiling towards the crash mat, glass shards turning round her in the spotlight's yellow
 * beam. She has no Segno: on the director's chair wait the cape and mask of the Segnato she is
 * falling for, the one who gets the close-up.
 */
export function cascata(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WALL = 0x4a3a5a;
  const WOOD = 0x6b5442;
  const SUIT = 0xa8402a;
  const BLACK = 0x22202a;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2a2a34, 0x1c1c24, 0.6);

  // The fake front: four flats round a window hole, a frame with teeth of glass left in it.
  const Z = -1.2;
  [
    [-0.925, 0, 0.95, 2.9],
    [0.925, 0, 0.95, 2.9],
    [0, 0, 0.9, 1.0],
    [0, 2.1, 0.9, 0.8],
  ].forEach(([x, y, w, h], i) => {
    const flat = box(w, h, 0.1, WALL, x, G + y, Z, { delay: 0.1 + i * 0.03, ink: 1.02 });
    if (i < 2) decorate(flat, new BoxGeometry(0.36, 0.5, 0.01), 0x1c2436, [[0, 1.6, 0.055], [0, 2.4, 0.055]]);
  });
  [
    [0, G + 1.0, 0.98, 0.06],
    [0, G + 2.06, 0.98, 0.06],
  ].forEach(([x, y, w, h]) => box(w, h, 0.14, 0x8a6a5a, x, y, Z, { delay: 0.25 }));
  [-0.47, 0.47].forEach((x) => box(0.06, 1.12, 0.14, 0x8a6a5a, x, G + 1.0, Z, { delay: 0.25 }));
  (
    [
      [-0.38, 1.06, 0.18, 0.3],
      [0.36, 1.06, 0.14, -0.2],
      [-0.35, 1.98, 0.16, 2.9],
      [0.3, 2.0, 0.2, 3.3],
    ] as [number, number, number, number][]
  ).forEach(([x, y, size, turn]) => add(new CylinderGeometry(size, size, 0.012, 3).rotateX(Math.PI / 2), 0x9fe8ff, x, G + y, Z, { delay: 0.3, rotation: [0, 0, turn] }));
  // Its back: two raking braces and their sandbags.
  [-0.9, 0.9].forEach((x) => {
    const from: Point = [x, G, Z - 0.95];
    const to: Point = [x, G + 2.5, Z - 0.06];
    const { length, rotation } = aim(from, to);
    box(0.09, length, 0.09, WOOD, ...from, { delay: 0.32, rotation });
    add(new SphereGeometry(0.16, 10, 8).scale(1.3, 0.6, 1), 0x8a7a5a, x, G, Z - 0.95, { delay: 0.36 });
  });

  // The crash mat.
  const mat = box(2.3, 0.55, 1.5, 0x1f6f8a, 0, G, 0.35, { delay: 0.4 });
  decorate(mat, new BoxGeometry(2.32, 0.04, 1.52), 0x16506a, [[0, 0.28, 0]]);
  decorate(mat, new BoxGeometry(0.06, 0.4, 0.01), MAGENTA, [
    [-0.8, 0.28, 0.755],
    [0, 0.28, 0.755],
    [0.8, 0.28, 0.755],
  ]);

  // The director's chair with the Segnato's cape over its back and his mask on the seat.
  const CX = -1.6;
  const CZ = 0.55;
  [-1, 1].forEach((side) =>
    [-1, 1].forEach((lean) => box(0.035, 0.75, 0.035, WOOD, CX + side * 0.22, G, CZ, { delay: 0.5, rotation: [lean * 0.5, 0.4, 0], noInk: true })),
  );
  box(0.5, 0.04, 0.4, MAGENTA, CX, G + 0.64, CZ, { delay: 0.55, rotation: [0, 0.4, 0] });
  [-1, 1].forEach((side) => box(0.035, 0.75, 0.035, WOOD, CX + side * 0.24 * Math.cos(0.4) - 0.2 * Math.sin(0.4), G + 0.64, CZ + side * -0.24 * Math.sin(0.4) - 0.2 * Math.cos(0.4), { delay: 0.56, noInk: true }));
  const back = box(0.52, 0.22, 0.03, MAGENTA, CX - 0.2 * Math.sin(0.4), G + 1.1, CZ - 0.2 * Math.cos(0.4), { delay: 0.58, rotation: [0, 0.4, 0] });
  void back;
  add(new CylinderGeometry(0.22, 0.34, 0.85, 12, 1, true, Math.PI / 2, Math.PI).scale(1, 1, 0.4), 0x2a3a8a, CX - 0.24 * Math.sin(0.4), G + 0.5, CZ - 0.24 * Math.cos(0.4), {
    delay: 0.62,
    rotation: [0, 0.4 + Math.PI, 0],
  });
  const mask = box(0.24, 0.07, 0.04, 0x2a3a8a, CX + 0.05, G + 0.68, CZ + 0.05, { delay: 0.66, rotation: [-1.4, 0.4, 0] });
  decorate(mask, new BoxGeometry(0.06, 0.035, 0.045), 0x14121c, [
    [-0.06, 0.035, 0],
    [0.06, 0.035, 0],
  ]);

  // The spotlight on its tripod, and its beam on her.
  const SX = 1.65;
  const SZ = -0.35;
  [0, 2.1, 4.2].forEach((a) => box(0.035, 1.5, 0.035, 0x2a2a34, SX + Math.cos(a) * 0.18, G, SZ + Math.sin(a) * 0.18, { delay: 0.5, rotation: [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12], noInk: true }));
  const lamp: Point = [SX, G + 1.52, SZ];
  const target: Point = [0.0, G + 1.2, -0.1];
  const ray = aim(lamp, target);
  const along = (k: number): Point => [lamp[0] + ((target[0] - lamp[0]) * k) / ray.length, lamp[1] + ((target[1] - lamp[1]) * k) / ray.length, lamp[2] + ((target[2] - lamp[2]) * k) / ray.length];
  cylinder(0.17, 0.2, 0.4, 0x2a2a34, ...lamp, { delay: 0.55, rotation: ray.rotation });
  cylinder(0.17, 0.17, 0.03, YELLOW, ...along(0.4), { delay: 0.6, rotation: ray.rotation, flat: true });
  const beam = add(new ConeGeometry(0.6, ray.length - 0.45, 20, 1, true).rotateX(Math.PI), YELLOW, ...along(0.43), { delay: 0.65, rotation: ray.rotation, flat: true, noInk: true });
  const glow = (beam.children[0] as Mesh).material as Material;
  glow.transparent = true;
  glow.opacity = 0.2;
  glow.depthWrite = false;

  // Cascata mid-dive, built upright, then tipped forward about her hips.
  const facing = 0.3;
  const u = 2.35 / 2.4;
  const stunt = figure(kit, {
    x: 0.05,
    z: -0.3,
    y: G + 0.75,
    facing,
    height: 2.35,
    skin: 0xe8b898,
    hair: { style: "curly", color: 0x3a2218 },
    face: { mouth: "smile", brows: "raised" },
    top: { kind: "armor", color: SUIT, accent: BLACK },
    bottom: { kind: "trousers", color: SUIT },
    shoes: BLACK,
    gloves: BLACK,
    arms: [
      [-0.3, 1.9, 0.55],
      [0.55, 1.25, -0.35],
    ],
    legs: "stride",
    delay: 0.9,
  });
  // A plaster on her cheek; black pads on knees and elbows.
  decorate(stunt.headPart, new BoxGeometry(0.07, 0.03, 0.02), 0xf0e0c8, [[0.11, 0.2, 0.17, 0.4]]);
  const pads = [
    stunt.at(-0.17 * u, 0.62 * u, 0.24 * u),
    stunt.at(0.17 * u, 0.6 * u, -0.08 * u),
    ...stunt.elbows,
  ].map((p, i) => add(new SphereGeometry(0.12, 12, 8).scale(1, 0.9, 0.8), BLACK, p[0], p[1] - 0.1, p[2], { delay: 1.5 + i * 0.03, rotation: [0, facing, 0] }));
  const hips = stunt.at(0, 1.08 * u, 0);
  const dive = rig([...stunt.parts, ...pads], hips);
  dive.rotation.x = 0.95;
  const head = stunt.parts.indexOf(stunt.headPart);
  const neck = stunt.at(0, 1.66 * u, 0);
  rig(stunt.parts.slice(head - 1), [neck[0] - hips[0], neck[1] - hips[1], neck[2] - hips[2]]).rotation.x = -0.8;

  // Glass shards in an arc from the window to the mat.
  const shards = Array.from({ length: 11 }, (_, k) => {
    const a = (k / 10) * Math.PI * 1.1 - 0.3;
    const r = 0.95 + (k % 3) * 0.15;
    return add(new CylinderGeometry(0.07 + (k % 3) * 0.03, 0.07 + (k % 3) * 0.03, 0.012, 3).rotateX(Math.PI / 2), k % 4 ? 0x9fe8ff : CYAN, 0.05 + Math.cos(a) * r, G + 1.3 + Math.sin(a) * r * 0.75, -0.55 + (k % 2) * 0.35, {
      delay: 1.6 + k * 0.03,
      rotation: [k, k * 2, 0],
    });
  });
  const restY = dive.position.y;

  tick((t) => {
    shards.forEach((shard, k) => {
      shard.rotation.x = k + t * (0.6 + (k % 3) * 0.3);
      shard.rotation.y = k * 2 + t * 0.4;
    });
    dive.position.y = restY + Math.sin(t * 1.6) * 0.05;
    glow.opacity = 0.2 + Math.sin(t * 2.3) * 0.04;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
