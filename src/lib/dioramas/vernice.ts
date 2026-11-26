import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, lamp } from "@/lib/diorama-props";

/**
 * Vernice (P299): the writer of the Figli dell'Ultima in the metro depot at night. On the side
 * of a parked carriage she has already sprayed the last hour, a clock of solid yellow paint whose
 * minute hand ticks towards midnight; now the jet from her can sets hard in the air, loops over
 * the tracks and rises from the gravel as a giant grasping hand.
 */
export function vernice(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const F = octagonBase(kit, 0x1a1a26);
  const G = floor(kit, F, 0.06, 0x2a2a34, 0x1f1f28, 0);
  const RAIL = 0x8a93a3;
  const PAINT = YELLOW;

  // The tracks: one under the carriage, one in front with its sleepers.
  [-0.82, -1.38].forEach((z) => box(3.0, 0.05, 0.05, RAIL, 0, G, z, { delay: 0.1, noInk: true }));
  for (let k = 0; k < 8; k++) box(0.12, 0.04, 0.72, 0x3e3028, -1.4 + k * 0.4, G, 1.22, { delay: 0.1 + k * 0.02 });
  [1.0, 1.44].forEach((z) => box(3.2, 0.05, 0.05, RAIL, 0, G + 0.04, z, { delay: 0.2, noInk: true }));

  // The carriage, windows lit magenta at one end, the painted clock at the other.
  [-1.0, 1.0].forEach((x) => box(0.9, 0.24, 0.7, 0x1c1c24, x, G + 0.05, -1.1, { delay: 0.15 }));
  const car = box(3.2, 1.45, 0.85, 0x2a3550, 0, G + 0.28, -1.1, { delay: 0.2 });
  decorate(car, new BoxGeometry(0.38, 0.36, 0.012), 0xff4f9a, [0.35, 0.85, 1.35].map((x) => [x, 0.95, 0.43] as Point));
  decorate(car, new BoxGeometry(0.012, 1.1, 0.012), INK, [
    [0.1, 0.6, 0.431],
    [0.6, 0.6, 0.431],
  ]);
  decorate(car, new SphereGeometry(0.08, 8, 6).scale(1, 1, 0.1), MAGENTA, [
    [-1.3, 0.3, 0.43],
    [-0.2, 1.2, 0.43],
    [0.05, 0.25, 0.43],
  ]);
  box(3.1, 0.1, 0.75, 0x232c44, 0, G + 1.73, -1.1, { delay: 0.25 });
  const CX = -0.7;
  const CY = G + 0.98;
  const CZ = -0.64;
  const dial = add(new TorusGeometry(0.5, 0.05, 8, 40), PAINT, CX, CY - 0.55, CZ, { delay: 0.5 });
  decorate(
    dial,
    new BoxGeometry(0.04, 0.1, 0.03),
    PAINT,
    Array.from({ length: 12 }, (_, k) => [Math.sin((k * Math.PI) / 6) * 0.38, 0.55 + Math.cos((k * Math.PI) / 6) * 0.38, 0, (-k * Math.PI) / 6] as [number, number, number, number]),
  );
  box(0.07, 0.28, 0.05, PAINT, CX, CY, CZ, { delay: 0.6, rotation: [0, 0, 0.1] });
  const minute = box(0.05, 0.42, 0.05, PAINT, CX, CY, CZ + 0.03, { delay: 0.65 });
  ball(0.06, PAINT, CX, CY - 0.06, CZ + 0.03, { delay: 0.66 });
  [
    [-0.25, 0.22],
    [-0.05, 0.36],
    [0.2, 0.16],
  ].forEach(([dx, length], i) => {
    box(0.03, length, 0.03, PAINT, CX + dx, CY - 0.48 - length + Math.abs(dx) * 0.3, CZ, { delay: 0.7 + i * 0.03, noInk: true });
  });

  // An old column of the necropolis and a depot lamp.
  column(kit, -1.9, -0.3, G, 0.2, 2.6);
  lamp(kit, 1.75, -0.35, G, 0.3, 2.2, MAGENTA);

  // Vernice, spraying, her bandolier of cans and the gas mask round her neck.
  const H = 2.3;
  const u = H / 2.4;
  const writer = figure(kit, {
    x: 0.6,
    z: 0.25,
    y: G,
    facing: 0.2,
    height: H,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "short", color: 0xc8e83a },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "hoodie", color: 0x1d2433, accent: 0x2c3a50 },
    bottom: { kind: "trousers", color: 0x252b3c },
    shoes: 0x15151c,
    gloves: 0x15151c,
    arms: [[-0.85, 1.75, 0.3], [0.7, 1.45, -0.25]],
    legs: "stride",
    delay: 0.9,
  });
  const torso = writer.parts[7];
  const lean = 0.65;
  const mid = 0.36 * u;
  decorate(torso, new BoxGeometry(0.07, 0.75 * u, 0.02), 0x3a2a24, [[0, mid, 0.2, lean]]);
  [MAGENTA, CYAN, ORANGE, MAGENTA].forEach((color, k) => {
    const s = (k - 1.5) * 0.13;
    decorate(torso, new CylinderGeometry(0.035, 0.035, 0.13, 8), color, [[-Math.sin(lean) * s, mid + Math.cos(lean) * s, 0.23, lean]]);
  });
  ball(0.09, 0x1c1c24, ...writer.at(0, 1.66 * u, 0.17), { delay: 1.4 });
  [-1, 1].forEach((side) => add(new CylinderGeometry(0.05, 0.05, 0.08, 10).rotateZ(Math.PI / 2), PAINT, ...writer.at(side * 0.12, 1.7 * u, 0.2), { delay: 1.45 }));

  // The can, and the jet of paint setting solid as it flies.
  const [hand] = writer.hands;
  cylinder(0.05, 0.05, 0.2, MAGENTA, hand[0], hand[1] - 0.1, hand[2], { delay: 1.5 }, 10);
  cylinder(0.035, 0.05, 0.05, 0xeeeae0, hand[0], hand[1] + 0.1, hand[2], { delay: 1.52 }, 10);
  const nozzle: Point = [hand[0] - 0.06, hand[1] + 0.13, hand[2]];
  const W: Point = [-1.0, G + 0.62, 0.85];
  const elbow: Point = [-0.75, G + 0.3, 1.0];
  cable(kit, [nozzle, [-0.3, G + 2.1, 0.95], [-0.33, G + 1.1, 1.05], [-0.52, G + 0.36, 1.05], elbow], 0.07, PAINT, 1.55);
  [
    [-0.3, G + 2.1, 0.95, 0.1],
    [-0.33, G + 1.35, 1.05, 0.09],
    [-0.47, G + 0.5, 1.05, 0.1],
  ].forEach(([x, y, z, r], i) => ball(r, PAINT, x, y - r, z, { delay: 1.6 + i * 0.04 }));
  add(new CylinderGeometry(0.32, 0.32, 0.01, 12), PAINT, -0.65, G, 1.05, { delay: 1.5, flat: true, noInk: true });

  // The jet ends in a giant hand of paint, fingers spread and hooked, reaching for us.
  limb(kit, elbow, [W[0], W[1] + 0.08, W[2]], 0.09, 0.12, PAINT, { delay: 1.65 });
  const hand3d: Group[] = [box(0.5, 0.48, 0.15, PAINT, W[0], W[1], W[2], { delay: 1.7 })];
  const palmTop = W[1] + 0.46;
  [
    [-0.19, -0.35, 0.2],
    [-0.065, -0.12, 0.26],
    [0.065, 0.1, 0.25],
    [0.19, 0.32, 0.19],
  ].forEach(([dx, a, length], i) => {
    const knuckle: Point = [W[0] + dx, palmTop, W[2]];
    const joint: Point = [knuckle[0] + Math.sin(a) * length, palmTop + Math.cos(a) * length, W[2] + 0.04];
    const tip: Point = [joint[0] + Math.sin(a) * 0.12, joint[1] + 0.08, W[2] + 0.2];
    hand3d.push(ball(0.065, PAINT, knuckle[0], knuckle[1] - 0.065, knuckle[2], { delay: 1.72 + i * 0.03 }));
    hand3d.push(limb(kit, knuckle, joint, 0.065, 0.058, PAINT, { delay: 1.75 + i * 0.03 }));
    hand3d.push(limb(kit, joint, tip, 0.058, 0.045, PAINT, { delay: 1.8 + i * 0.03 }));
    hand3d.push(ball(0.05, PAINT, tip[0], tip[1] - 0.05, tip[2], { delay: 1.85 + i * 0.03 }));
  });
  const thumbJoint: Point = [W[0] + 0.42, W[1] + 0.28, W[2] + 0.06];
  const thumbTip: Point = [W[0] + 0.5, W[1] + 0.44, W[2] + 0.2];
  hand3d.push(
    limb(kit, [W[0] + 0.22, W[1] + 0.12, W[2]], thumbJoint, 0.07, 0.062, PAINT, { delay: 1.9 }),
    limb(kit, thumbJoint, thumbTip, 0.062, 0.05, PAINT, { delay: 1.92 }),
  );
  const grasp = new Group();
  grasp.position.set(...W);
  hand3d[0].parent?.add(grasp);
  hand3d.forEach((part) => {
    part.position.sub(grasp.position);
    grasp.add(part);
  });
  grasp.rotation.order = "YXZ";
  // A wrapper, not a part: scaling it leaves the parts' pop-in alone.
  grasp.scale.setScalar(1.3);

  motes(8, PAINT, 0.025, [-1.1, G + 0.3, 0.6], [-0.3, G + 2.0, 1.1], 1.6);
  motes(6, MAGENTA, 0.025, [-1.2, G + 0.3, 0.4], [-0.6, G + 1.6, 1.0], 1.7);
  const drip = ball(0.035, PAINT, CX + 0.2, CY - 0.5, CZ, { delay: 1.0, noInk: true });

  tick((t) => {
    // The minute hand ticks towards midnight, then starts the last hour again.
    minute.rotation.z = 0.52 - (Math.floor(t) % 15) * 0.035;
    grasp.rotation.set(0.12 + Math.sin(t * 1.5) * 0.08, 0.35, 0.2 + Math.sin(t * 0.8) * 0.04);
    const v = (t * 0.6) % 1;
    drip.position.y = CY - 0.5 - v * (CY - 0.5 - G);
  });

  return { width: 4.9, height: 4.3, lookY: 1.5 };
}
