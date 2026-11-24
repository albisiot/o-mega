import { BoxGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, ring } from "@/lib/diorama-props";

/**
 * Parabellum (P142): the eleven-metre gun on mantis legs stands chained to the floor of the
 * Banco's vault, between the wall of safe-deposit boxes and the round door. Its crown of twelve
 * lenses turns slowly; the console shows the target's name seventy per cent entered, so the
 * crosshair cannot choose and jumps from one tiny clerk to the other.
 */
export function parabellum(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x5a6478;
  const STEEL_DARK = 0x30344a;
  const SUIT = 0x24242f;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x2c2f3c, 0x1f212b, 0.6);

  // The vault: the back wall with the round door, the wall of safe-deposit boxes on the left.
  box(3.0, 3.4, 0.2, 0x2e2840, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  const boxes = box(0.2, 3.4, 2.1, 0x1f4f5e, -1.55, G, -0.4, { delay: 0.14, ink: 1.02 });
  const drawers: Point[] = [];
  for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) drawers.push([0.105, 0.35 + row * 0.42, -0.84 + col * 0.42]);
  decorate(boxes, new BoxGeometry(0.01, 0.34, 0.36), 0x2a6a7a, drawers);
  decorate(boxes, new BoxGeometry(0.012, 0.06, 0.04), INK, drawers.map(([x, y, z]) => [x + 0.004, y, z] as Point));
  const R = 0.85;
  add(new TorusGeometry(R + 0.04, 0.07, 8, 40), STEEL_DARK, 0.55, G + 0.28, -1.42, { delay: 0.2 });
  const door = add(new CylinderGeometry(R, R, 0.14, 32).rotateX(Math.PI / 2), 0x4a4f62, 0.55, G + 0.35, -1.38, { delay: 0.22 });
  decorate(door, new TorusGeometry(0.42, 0.035, 6, 24), STEEL_DARK, [[0, R, 0.09]]);
  decorate(door, new BoxGeometry(0.05, 0.84, 0.03), STEEL_DARK, [0, 1, 2].map((k) => [0, R, 0.09, (k * Math.PI) / 3] as [number, number, number, number]));
  decorate(door, new BoxGeometry(0.07, 0.07, 0.03), 0x8a93a3, Array.from({ length: 14 }, (_, k) => [Math.cos(k * 0.449) * 0.72, R + Math.sin(k * 0.449) * 0.72, 0.08] as Point));

  // The gun: plinth, housing, a long column with collars, the crown of lenses and the muzzle.
  const CX = 0.1;
  const CZ = -0.2;
  ring(kit, [CX, G + 0.005, CZ], 0.95, CYAN, 0.3);
  ring(kit, [CX, G + 0.005, CZ], 1.4, CYAN, 0.32);
  cylinder(0.6, 0.66, 0.14, STEEL_DARK, CX, G, CZ, { delay: 0.5 }, 16);
  cylinder(0.3, 0.38, 0.6, STEEL, CX, G + 0.14, CZ, { delay: 0.55 }, 12);
  const column = cylinder(0.2, 0.22, 2.3, STEEL, CX, G + 0.74, CZ, { delay: 0.6 }, 14);
  decorate(column, new TorusGeometry(0.215, 0.02, 6, 20).rotateX(Math.PI / 2), INK, [
    [0, 0.45, 0],
    [0, 1.45, 0],
  ]);
  cylinder(0.34, 0.34, 0.26, STEEL_DARK, CX, G + 1.66, CZ, { delay: 0.65 }, 12);
  cylinder(0.28, 0.28, 0.18, STEEL_DARK, CX, G + 2.45, CZ, { delay: 0.68 }, 12);
  const hub = cylinder(0.36, 0.3, 0.32, STEEL_DARK, CX, G + 2.9, CZ, { delay: 0.72 }, 12);
  cylinder(0.15, 0.17, 0.55, STEEL, CX, G + 3.22, CZ, { delay: 0.8 }, 12);
  const muzzle = cylinder(0.19, 0.19, 0.09, STEEL_DARK, CX, G + 3.7, CZ, { delay: 0.84 }, 12);
  decorate(muzzle, new CylinderGeometry(0.12, 0.12, 0.01, 12), INK, [[0, 0.095, 0]]);

  // Twelve lenses in a ring, turning together round the column.
  const crown = new Group();
  crown.position.set(CX, 0, CZ);
  hub.parent?.add(crown);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const lens = add(new CylinderGeometry(0.1, 0.12, 0.22, 12).rotateZ(-Math.PI / 2), STEEL_DARK, 0.46 * Math.cos(a), G + 2.94, -0.46 * Math.sin(a), {
      delay: 0.85 + k * 0.02,
      rotation: [0, a, 0],
    });
    decorate(lens, new CylinderGeometry(0.09, 0.09, 0.02, 12).rotateZ(Math.PI / 2), YELLOW, [[0.115, 0.12, 0]]);
    crown.add(lens);
  }

  // Four mantis legs, knees high, each foot shackled and chained to a ring in the floor.
  const right = [0.94, -0.34];
  const fwd = [0.34, 0.94];
  [
    [Math.PI * 0.25, 1.55, 0.95],
    [Math.PI * 0.75, 1.45, 0.95],
    [Math.PI * 1.25, 1.25, 0.85],
    [Math.PI * 1.75, 1.05, 0.8],
  ].forEach(([a, reach, kneeReach], i) => {
    const dx = Math.cos(a) * right[0] + Math.sin(a) * fwd[0];
    const dz = Math.cos(a) * right[1] + Math.sin(a) * fwd[1];
    const at = (r: number, y: number): Point => [CX + dx * r, G + y, CZ + dz * r];
    const d = 1.0 + i * 0.06;
    const hip = at(0.3, 1.8);
    const knee = at(kneeReach, 2.55);
    const ankle = at(reach, 0.22);
    limb(kit, hip, knee, 0.1, 0.085, STEEL, { delay: d });
    ball(0.13, STEEL_DARK, knee[0], knee[1] - 0.13, knee[2], { delay: d + 0.04 });
    const spur = at(kneeReach + 0.2, 2.85);
    limb(kit, knee, spur, 0.06, 0.01, STEEL_DARK, { delay: d + 0.06 });
    limb(kit, knee, ankle, 0.085, 0.06, STEEL, { delay: d + 0.08 });
    const foot = at(reach, 0);
    cylinder(0.1, 0.17, 0.14, STEEL_DARK, foot[0], G, foot[2], { delay: d + 0.1 }, 10);
    add(new TorusGeometry(0.1, 0.03, 6, 16).rotateX(Math.PI / 2), 0x8a93a3, ankle[0], ankle[1] - 0.06, ankle[2], { delay: d + 0.14 });
    const anchor = at(reach + 0.45, 0);
    cylinder(0.07, 0.09, 0.05, STEEL_DARK, anchor[0], G, anchor[2], { delay: d + 0.16 }, 10);
    for (let k = 0; k < 4; k++) {
      const u = (k + 0.5) / 4;
      add(new TorusGeometry(0.045, 0.014, 6, 12), 0x8a93a3, ankle[0] + (anchor[0] - ankle[0]) * u, G + 0.02 + 0.17 * (1 - u) ** 1.5, ankle[2] + (anchor[2] - ankle[2]) * u, {
        delay: d + 0.18 + k * 0.02,
        rotation: [0, Math.atan2(-dz, dx) + (k % 2 ? Math.PI / 2 : 0), 0],
      });
    }
  });

  // The console: two dials, and the name entered seven tenths of the way (the eighth blinks).
  const desk = box(0.5, 0.62, 0.32, STEEL_DARK, 0.55, G, 1.35, { delay: 1.4, rotation: [0, 0.35, 0] });
  decorate(desk, new CylinderGeometry(0.07, 0.07, 0.01, 16).rotateX(Math.PI / 2), 0xe8e2d0, [
    [-0.12, 0.48, 0.165],
    [0.12, 0.48, 0.165],
  ]);
  decorate(desk, new BoxGeometry(0.012, 0.06, 0.01), INK, [
    [-0.12, 0.5, 0.172, 0.6],
    [0.12, 0.5, 0.172, -0.9],
  ]);
  decorate(desk, new BoxGeometry(0.03, 0.06, 0.01), YELLOW, Array.from({ length: 7 }, (_, k) => [-0.2 + k * 0.044, 0.28, 0.165] as Point));
  decorate(desk, new BoxGeometry(0.03, 0.06, 0.01), 0x1a1c26, Array.from({ length: 2 }, (_, k) => [-0.2 + (k + 8) * 0.044, 0.28, 0.165] as Point));
  decorate(desk, new BoxGeometry(0.03, 0.06, 0.01), MAGENTA, [[-0.2 + 7 * 0.044, 0.28, 0.165]]);
  const cursor = desk.children[desk.children.length - 1];

  // Two tiny clerks of the Banco, either of whom might be the target.
  const clerkA = figure(kit, {
    x: 1.3,
    z: 1.0,
    y: G,
    facing: -0.1,
    height: 1.2,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "bun", color: 0x2a1e1c },
    face: { mouth: "frown", brows: "worried" },
    top: { kind: "suit", color: SUIT, accent: 0xe8e2d0, tie: MAGENTA },
    bottom: { kind: "skirt", color: SUIT },
    arms: [[-0.12, 0.72, 0.24], [0.12, 0.72, 0.24]],
    delay: 1.5,
  });
  const [la, lb] = clerkA.hands;
  const ledger = box(0.3, 0.03, 0.2, 0xe8e2d0, (la[0] + lb[0]) / 2, la[1] - 0.01, (la[2] + lb[2]) / 2, { delay: 1.8, rotation: [-0.5, -0.1, 0] });
  decorate(ledger, new BoxGeometry(0.01, 0.032, 0.2), INK, [[0, 0.016, 0]]);
  const clerkB = figure(kit, {
    x: -1.05,
    z: 0.6,
    y: G,
    facing: 0.6,
    height: 1.25,
    build: "normal",
    skin: 0xc89070,
    hair: { style: "bald", color: 0x2a1e1c },
    face: { mouth: "open", brows: "raised", glasses: "round" },
    top: { kind: "suit", color: SUIT, accent: 0xe8e2d0, tie: 0x23707e },
    bottom: { kind: "trousers", color: SUIT },
    arms: [[-0.14, 0.78, 0.28], "down"],
    delay: 1.55,
  });
  const sheet = clerkB.hands[0];
  box(0.18, 0.24, 0.01, 0xf2f0ea, sheet[0], sheet[1] - 0.06, sheet[2] + 0.03, { delay: 1.85, rotation: [-0.2, 0.6, 0] });

  // The crosshair and the beam from the crown: on the first clerk, then the second, and back.
  const source: Point = [CX, G + 3.06, CZ];
  const targets = [clerkA.head, clerkB.head];
  const beams = targets.map((target, i) => {
    const { length, rotation } = aim(source, target);
    return box(0.025, length - 0.25, 0.025, MAGENTA, ...source, { delay: 2.0 + i * 0.05, flat: true, noInk: true, rotation });
  });
  const reticle = add(new TorusGeometry(0.2, 0.018, 6, 32), MAGENTA, targets[0][0], targets[0][1] - 0.218, targets[0][2], {
    delay: 2.1,
    flat: true,
    noInk: true,
    rotation: [0, 0.35, 0],
  });
  decorate(reticle, new BoxGeometry(0.02, 0.1, 0.01), MAGENTA, [
    [0, 0.218 + 0.24, 0],
    [0, 0.218 - 0.24, 0],
    [0.24, 0.218, 0, Math.PI / 2],
    [-0.24, 0.218, 0, Math.PI / 2],
  ]);
  const circle = reticle.children[0];

  tick((t) => {
    crown.rotation.y = t * 0.35;
    // Four seconds on each clerk: slide over, close in, hold.
    const phase = (t / 4) % 2;
    const on = Math.floor(phase);
    const u = phase - on;
    const from = targets[on === 0 ? 1 : 0];
    const to = targets[on];
    const slide = t < 4 ? 1 : Math.min(1, u / 0.15);
    reticle.position.set(from[0] + (to[0] - from[0]) * slide, from[1] + (to[1] - from[1]) * slide - 0.218, from[2] + (to[2] - from[2]) * slide);
    const close = t < 4 ? 1 : Math.min(1, Math.max(0, (u - 0.15) / 0.3));
    circle.scale.setScalar(1.6 - 0.6 * close);
    beams.forEach((beam, i) => (beam.visible = i === on && slide >= 1));
    cursor.visible = Math.floor(t * 3) % 2 === 0;
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
