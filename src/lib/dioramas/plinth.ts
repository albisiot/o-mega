import { BoxGeometry, CylinderGeometry, Group, SphereGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { flame, floor, rubble } from "@/lib/diorama-props";

/**
 * Plinth (P112): in a collapsed building the oldest living column of the city holds the fallen
 * floor up with its two upper arms and props the beams with the lower ones, a blank board hung
 * round its neck instead of words, while a rescuer leads a child out underneath. Roots and cracks
 * at its foot say it has not moved in ages; grit falls, a bare bulb swings, a torch flickers.
 */
export function plinth(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0xd8c8a4;
  const STONE_DARK = 0xa8987c;
  const WOOD = 0x5e4a3a;
  const CONCRETE = 0x4a4f64;
  const F = octagonBase(kit, 0x25232e);
  const G = floor(kit, F, 0.06, 0x34323f, 0x23212b, 0.45);

  // The column's own frame, turned to look at us.
  const T = 0.28;
  const at = (lx: number, ly: number, lz: number): Point => [lx * Math.cos(T) + lz * Math.sin(T), G + ly, -0.45 - lx * Math.sin(T) + lz * Math.cos(T)];
  const turn: [number, number, number] = [0, T, 0];

  // The shaft, fluted, flaring at the foot like a robe.
  const shaftGeometry = new CylinderGeometry(0.36, 0.56, 2.5, 64, 1);
  const position = shaftGeometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const k = 1 + 0.05 * Math.cos(Math.atan2(position.getZ(i), position.getX(i)) * 16);
    position.setX(i, position.getX(i) * k);
    position.setZ(i, position.getZ(i) * k);
  }
  shaftGeometry.computeVertexNormals();
  add(shaftGeometry, STONE, ...at(0, 0, 0), { delay: 0.5, rotation: turn });
  // The crown: a capital pierced with a ring of holes; the two in front are its eyes.
  const crown = cylinder(0.45, 0.37, 0.42, STONE, ...at(0, 2.48, 0), { delay: 0.6, rotation: turn }, 20);
  const holes: [number, number, number][] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + Math.PI / 14;
    if (Math.abs(Math.sin(a / 2)) < 0.2) continue;
    holes.push([Math.sin(a) * 0.42, 0.24, Math.cos(a) * 0.42]);
  }
  decorate(crown, new SphereGeometry(0.05, 10, 8), 0x1a1820, holes);
  decorate(crown, new SphereGeometry(0.075, 12, 8), 0x1a1820, [
    [-0.11, 0.22, 0.39],
    [0.11, 0.22, 0.39],
  ]);
  decorate(crown, new SphereGeometry(0.032, 10, 8), CYAN, [
    [-0.11, 0.22, 0.45],
    [0.11, 0.22, 0.45],
  ]);
  decorate(crown, new CylinderGeometry(0.39, 0.39, 0.02, 20), 0x1a1820, [[0, 0.41, 0]]);

  // Four stone arms: the upper pair up under the slab, the lower pair bracing the props.
  const arm = (shoulder: Point, elbow: Point, hand: Point, delay: number) => {
    limb(kit, at(...shoulder), at(...elbow), 0.14, 0.13, STONE, { delay });
    ball(0.15, STONE_DARK, ...below(at(...elbow), 0.15), { delay: delay + 0.04 });
    limb(kit, at(...elbow), at(...hand), 0.13, 0.12, STONE, { delay: delay + 0.06 });
    ball(0.15, STONE, ...below(at(...hand), 0.15), { delay: delay + 0.1 });
  };
  [-1, 1].forEach((s, i) => {
    arm([s * 0.3, 2.22, 0], [s * 0.82, 2.62, 0.12], [s * 0.66, 3.22, 0.08], 0.7 + i * 0.04);
    arm([s * 0.42, 1.7, 0], [s * 0.9, 1.78, 0.06], [s * 1.28, 1.95, 0.06], 0.8 + i * 0.04);
    box(0.18, 3.36, 0.18, WOOD, ...at(s * 1.46, 0, 0.06), { delay: 0.2 + i * 0.04, rotation: turn });
  });

  // The fallen floor, rebar poking out of its broken edge.
  const slab = box(3, 0.3, 1.8, CONCRETE, ...at(0, 3.36, 0), { delay: 0.3, rotation: [0.04, T, -0.03] });
  decorate(slab, new BoxGeometry(0.6, 0.012, 0.02), INK, [
    [-0.7, 0.04, 0.91, 0.3],
    [0.5, 0.06, 0.91, -0.2],
  ]);
  [
    [-1.3, 0.75, -1.55, 0.95],
    [-0.4, 0.88, -0.25, 1.15],
    [1.1, 0.82, 1.4, 1.05],
  ].forEach(([x0, z0, x1, z1], i) => limb(kit, at(x0, 3.5, z0), at(x1, 3.3 - i * 0.05, z1), 0.02, 0.02, 0x7a3a2a, { delay: 0.4 + i * 0.03, noInk: true }));
  // What is left of the floor above, and a chunk about to fall.
  box(1.4, 0.35, 0.18, 0x5a5468, ...at(-0.5, 3.62, -0.7), { delay: 0.45, rotation: [0, T, 0.06] });
  box(0.6, 0.25, 0.18, 0x5a5468, ...at(0.75, 3.62, -0.72), { delay: 0.48, rotation: [0, T + 0.2, -0.12] });
  box(0.5, 0.22, 0.35, CONCRETE, ...at(-1.35, 3.12, 0.72), { delay: 0.5, rotation: [0.3, T, 0.4] });

  // The board it wears instead of speaking: blank, nailed, on a rope.
  const board = box(0.62, 0.34, 0.05, WOOD, ...at(0, 1.2, 0.52), { delay: 1.2, rotation: [-0.08, T, 0.03] });
  decorate(board, new BoxGeometry(0.03, 0.03, 0.01), INK, [
    [-0.25, 0.28, 0.03],
    [0.25, 0.28, 0.03],
  ]);
  [-1, 1].forEach((s) => limb(kit, at(s * 0.25, 1.5, 0.53), at(s * 0.3, 2.46, 0.27), 0.014, 0.014, 0x8a6a40, { delay: 1.25, noInk: true }));

  // Its price, VEL 1 and TEC 0: rooted where it stands, the floor cracked round its foot.
  [0.7, 2.3, -0.7, -2.4].forEach((a, i) =>
    cable(kit, [at(Math.sin(a) * 0.5, 0.25, Math.cos(a) * 0.5), at(Math.sin(a) * 0.78, 0.07, Math.cos(a) * 0.78), at(Math.sin(a) * 1.08, -0.01, Math.cos(a) * 1.08)], 0.045, 0x4a3a2e, 0.9 + i * 0.03),
  );
  [0.2, 1.5, -1.1].forEach((a, i) => box(0.5, 0.008, 0.02, INK, ...at(Math.sin(a) * 0.85, 0, Math.cos(a) * 0.85), { delay: 0.95 + i * 0.02, flat: true, noInk: true, rotation: [0, T + a + Math.PI / 2, 0] }));
  [0.4, -0.9].forEach((a, i) => ball(0.07, 0x2f6f60, ...at(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6), { delay: 1 + i * 0.03 }));

  // The rubble, a torch stuck in it, and a bare bulb hanging from the slab on its cord.
  rubble(kit, -1.55, 0.05, G, 0.3, 6, 0.5);
  rubble(kit, 1.15, 1.2, G, 0.35, 5, 0.4);
  box(0.5, 0.18, 0.3, CONCRETE, 0.55, G, 1.5, { delay: 0.4, rotation: [0, 0.4, 0.15] });
  cylinder(0.03, 0.03, 1.1, WOOD, 1.55, G, 0.6, { delay: 0.45, rotation: [0, 0, -0.1] }, 8);
  const torch = flame(kit, 1.66, 0.6, G + 1.08, 0.55, 0.8);
  const hook = at(1.05, 3.36, 0.55);
  const cord = box(0.012, 0.7, 0.012, INK, hook[0], hook[1] - 0.7, hook[2], { delay: 0.6, noInk: true });
  const bulb = ball(0.08, ORANGE, hook[0], hook[1] - 0.86, hook[2], { delay: 0.65, flat: true });
  const swing = new Group();
  swing.position.set(...hook);
  cord.parent?.add(swing);
  [cord, bulb].forEach((part) => {
    part.position.sub(swing.position);
    swing.add(part);
  });

  // The rescuer leads a child out from under the slab by the hand.
  const rescuer = figure(kit, {
    x: -0.85,
    z: 1.0,
    y: G,
    facing: 0.15,
    height: 2.25,
    skin: 0xc89878,
    face: { mouth: "open", brows: "worried", beard: "stubble", beardColor: 0x3a2a22 },
    headwear: { kind: "hardhat", color: ORANGE },
    top: { kind: "jacket", color: 0x2a3f52, accent: 0x9fe8ff },
    bottom: { kind: "trousers", color: 0x2a2c36 },
    belt: 0x3a2c22,
    gloves: 0x3a3a40,
    arms: [[-0.42, 1.1, 0.12], "down"],
    legs: "stride",
    delay: 1.4,
  });
  decorate(rescuer.headPart, new BoxGeometry(0.09, 0.06, 0.04), 0xf4f0e6, [[0, 0.46, 0.18]]);
  const child = figure(kit, {
    x: -1.436,
    z: 1.139,
    y: G,
    facing: 0.15,
    height: 1.3,
    build: "child",
    skin: 0xe0b090,
    hair: { style: "short", color: 0x3a2418 },
    face: { mouth: "frown", brows: "worried", marks: 0x9a6a5a },
    top: { kind: "hoodie", color: MAGENTA, accent: 0xff6a98 },
    bottom: { kind: "trousers", color: 0x2a3a5a },
    shoes: 0xe0dccf,
    arms: ["down", [0.18, 1.1, 0.07]],
    legs: "stride",
    delay: 1.6,
  });
  const walkers = [...rescuer.parts, ...child.parts];
  const rest = walkers.map((part) => part.position.y);

  // Grit trickling from the slab's edge.
  const grit = [
    [-0.6, 0.8],
    [0.3, 0.86],
    [1.25, 0.6],
    [-1.15, 0.5],
  ].map(([lx, lz], i) => ({ part: box(0.05, 0.05, 0.05, STONE_DARK, ...at(lx, 3.2, lz), { delay: 0.8 + i * 0.05, noInk: true }), phase: i * 0.27 }));

  tick((t) => {
    swing.rotation.z = Math.sin(t * 1.4) * 0.12;
    swing.rotation.x = Math.sin(t * 1.1) * 0.05;
    torch.forEach((part, i) => (part.children[0].scale.y = 1 + Math.sin(t * 13 + i * 2) * 0.12));
    const bounce = Math.abs(Math.sin(t * 4.5)) * 0.025;
    walkers.forEach((part, i) => (part.position.y = rest[i] + bounce));
    grit.forEach(({ part, phase }) => {
      const u = (t * 0.7 + phase) % 1;
      part.position.y = G + 3.2 - u * u * 3.2;
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.85 };
}

function below(p: Point, r: number): Point {
  return [p[0], p[1] - r, p[2]];
}
