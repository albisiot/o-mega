import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, volcanoBackdrop } from "@/lib/diorama-props";

/**
 * Virata (P242): the rebels' fighter ace on an ash airstrip on the volcano's flank, in front of
 * her parked fighter with its engine idling orange and five targets painted under the cockpit.
 * Smirking under her leather flying helmet, goggles up and scarf streaming in the wind, she
 * points at the biggest target there is: an imperial battleship high in the sky, its escort of
 * little fighters circling it, while the runway lights run in turn along the strip.
 */
export function virata(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const HULL = 0x4a5670;
  const HULL_DARK = 0x323a50;
  const DARK = 0x1e2030;
  const BRASS = 0xb08d3c;
  const F = octagonBase(kit, 0x221f2c);
  const G = floor(kit, F, 0.06, 0x2a2834, 0x1c1a24, 0.5);

  // The volcano behind, the dark runway with its dashes, and its lights along the front edge.
  volcanoBackdrop(kit, -0.35, -1.78, G, 0.1, 1.6);
  const strip = box(3.6, 0.008, 0.85, 0x1f1d28, 0, G, 0.95, { delay: 0.08, noInk: true });
  decorate(
    strip,
    new BoxGeometry(0.32, 0.004, 0.05),
    0x8a8a9a,
    [-1.4, -0.7, 0, 0.7, 1.4].map((x) => [x, 0.009, 0] as Point),
  );
  const lights = Array.from({ length: 7 }, (_, k) => ball(0.05, CYAN, -1.5 + k * 0.5, G, 1.48, { delay: 0.14 + k * 0.02, flat: true }));

  // Her fighter, parked behind her with its nose to the left.
  const FX = 0.25;
  const FZ = -0.75;
  const FY = G + 0.4;
  [
    [-0.85, 0],
    [0.55, 0.3],
    [0.55, -0.3],
  ].forEach(([dx, dz], i) => {
    cylinder(0.03, 0.03, 0.34, DARK, FX + dx, G + 0.06, FZ + dz, { delay: 0.2 + i * 0.02 }, 6);
    ball(0.06, DARK, FX + dx, G, FZ + dz, { delay: 0.2 });
  });
  const wing = new Shape();
  wing.moveTo(-0.6, 0);
  wing.lineTo(0.45, 0.92);
  wing.lineTo(0.85, 0.92);
  wing.lineTo(0.7, 0);
  wing.lineTo(0.85, -0.92);
  wing.lineTo(0.45, -0.92);
  wing.closePath();
  const wings = add(new ExtrudeGeometry(wing, { depth: 0.06, bevelEnabled: false }).rotateX(-Math.PI / 2), HULL, FX, FY + 0.18, FZ, { delay: 0.26 });
  decorate(wings, new BoxGeometry(0.42, 0.02, 0.05), MAGENTA, [
    [0.65, 0.065, 0.9],
    [0.65, 0.065, -0.9],
  ]);
  const body = add(new CylinderGeometry(0.26, 0.3, 2.2, 14).rotateZ(Math.PI / 2), HULL, FX, FY, FZ, { delay: 0.3 });
  decorate(body, new BoxGeometry(2.1, 0.035, 0.01), MAGENTA, [[0.05, 0.2, 0.27]]);
  // Five targets downed, painted under the cockpit.
  decorate(
    body,
    new BoxGeometry(0.07, 0.07, 0.01),
    0xe8e2d0,
    [-0.75, -0.6, -0.45, -0.3, -0.15].map((x) => [x, 0.4, 0.27, Math.PI / 4] as [number, number, number, number]),
  );
  add(new ConeGeometry(0.26, 0.7, 14).rotateZ(Math.PI / 2), HULL_DARK, FX - 1.45, FY + 0.04, FZ, { delay: 0.34 });
  const canopy = add(new SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(2.2, 1, 1), 0x1f6f8f, FX - 0.5, FY + 0.5, FZ, { delay: 0.38 });
  decorate(canopy, new BoxGeometry(0.16, 0.04, 0.01), CYAN, [[-0.12, 0.12, 0.15, 0.3]]);
  const fin = new Shape();
  fin.moveTo(0, 0);
  fin.lineTo(0.45, 0);
  fin.lineTo(0.72, 0.55);
  fin.lineTo(0.52, 0.55);
  fin.closePath();
  add(new ExtrudeGeometry(fin, { depth: 0.05, bevelEnabled: false }).translate(0, 0, -0.025), HULL_DARK, FX + 0.5, FY + 0.5, FZ, { delay: 0.42 });
  add(new CylinderGeometry(0.22, 0.24, 0.3, 14).rotateZ(Math.PI / 2), DARK, FX + 1.25, FY + 0.06, FZ, { delay: 0.44 });
  add(new CylinderGeometry(0.17, 0.17, 0.03, 14).rotateZ(Math.PI / 2), ORANGE, FX + 1.41, FY + 0.13, FZ, { delay: 0.48, flat: true, noInk: true });
  const exhaust = add(new ConeGeometry(0.13, 0.42, 10).rotateZ(-Math.PI / 2).translate(0.21, 0, 0), YELLOW, FX + 1.42, FY + 0.17, FZ, { delay: 0.5, flat: true, noInk: true });
  // A boarding ladder up to the cockpit.
  [-0.1, 0.1].forEach((dx) => limb(kit, [FX - 0.5 + dx, G, -0.05], [FX - 0.5 + dx, FY + 0.5, -0.46], 0.02, 0.02, 0x8a93a3, { delay: 0.52 }));
  [0.15, 0.35, 0.55, 0.75].forEach((y, i) => box(0.22, 0.025, 0.025, 0x8a93a3, FX - 0.5, G + y, -0.05 - (y / 0.9) * 0.41, { delay: 0.54 + i * 0.02, noInk: true }));

  // The biggest target: an imperial battleship high in the sky, and its circling escort.
  const SX = 0.6;
  const SY = G + 3.05;
  const SZ = -1.3;
  const ship = add(new ConeGeometry(0.42, 1.7, 4).rotateZ(Math.PI / 2).scale(1, 0.4, 1), 0x3a3450, SX, SY, SZ, { delay: 0.5, rotation: [0, 0.25, 0.04] });
  decorate(ship, new BoxGeometry(0.02, 0.08, 0.12), CYAN, [
    [0.86, 0.17, 0.16],
    [0.86, 0.17, -0.16],
  ]);
  decorate(
    ship,
    new BoxGeometry(0.06, 0.025, 0.02),
    MAGENTA,
    [-0.4, -0.05, 0.3, 0.65].map((x) => [x, 0.17, (0.42 * (x + 0.85)) / 1.7 + 0.02] as Point),
  );
  box(0.26, 0.14, 0.12, 0x4a4466, SX + 0.45, SY + 0.26, SZ - 0.11, { delay: 0.56, rotation: [0, 0.25, 0] });
  const escorts = [0, 1, 2].map((k) => add(new ConeGeometry(0.06, 0.22, 3).rotateX(Math.PI / 2), MAGENTA, SX, SY, SZ, { delay: 0.6 + k * 0.04, flat: true }));

  // Virata, goggles up on her leather helmet, pointing up at the battleship.
  const ace = figure(kit, {
    x: -0.6,
    z: 0.75,
    y: G,
    facing: 0.35,
    height: 2.35,
    build: "slim",
    skin: 0xf0c8b0,
    hair: { style: "short", color: 0x2a1626 },
    face: { mouth: "smirk", brows: "raised" },
    headwear: { kind: "helmet", color: 0x7a4a2a, accent: BRASS },
    top: { kind: "jacket", color: 0x1f5560, accent: 0x2a6f7a },
    bottom: { kind: "trousers", color: 0x1a4048 },
    shoes: 0x2a2024,
    belt: 0x3a2a20,
    gloves: 0x5a3a28,
    scarf: 0xc8d0d4,
    arms: ["hip", [0.5, 2.55, 0.08]],
    delay: 0.8,
  });
  const R = ace.headRadius;
  const cy = R * 1.06;
  decorate(ace.headPart, new CylinderGeometry(0.058, 0.058, 0.05, 14).rotateX(Math.PI / 2), BRASS, [
    [-0.075, cy + 0.15, 0.17],
    [0.075, cy + 0.15, 0.17],
  ]);
  decorate(ace.headPart, new CylinderGeometry(0.04, 0.04, 0.02, 14).rotateX(Math.PI / 2), CYAN, [
    [-0.075, cy + 0.15, 0.2],
    [0.075, cy + 0.15, 0.2],
  ]);
  // The helmet's round ear pieces, and dark curls escaping under it.
  [-1, 1].forEach((side) => {
    const cup = add(new CylinderGeometry(0.075, 0.075, 0.05, 14).rotateZ(Math.PI / 2), 0x6a3e22, ...ace.at(side * (R * 1.17 + 0.02), ace.head[1] - G - 0.1, 0), { delay: 1.28, rotation: [0, 0.35, 0] });
    decorate(cup, new CylinderGeometry(0.04, 0.04, 0.052, 12).rotateZ(Math.PI / 2), BRASS, [[0, 0.075, 0]]);
    ball(0.065, 0x2a1626, ...ace.at(side * 0.17, 1.92, 0.08), { delay: 1.3 });
  });
  // A gloved finger pointing at the battleship.
  const [px, py, pz] = ace.hands[1];
  limb(kit, [px, py, pz], [px + 0.1, py + 0.13, pz - 0.04], 0.025, 0.022, 0x5a3a28, { delay: 1.35 });
  // Her scarf streaming out behind her in the wind.
  const scarf = add(new BoxGeometry(0.8, 0.04, 0.16).translate(-0.4, 0, 0), 0x3f6f7a, ...ace.at(-0.1, 1.76, -0.08), { delay: 1.4, rotation: [0, -0.5, 0.15] });

  const dim = new Color(0x0b4a60);
  const lit = new Color(CYAN);
  tick((t) => {
    scarf.rotation.z = 0.15 + Math.sin(t * 7) * 0.08;
    scarf.rotation.x = Math.sin(t * 5) * 0.25;
    exhaust.children.forEach((mesh) => mesh.scale.set(0.8 + Math.abs(Math.sin(t * 23)) * 0.3, 1, 1));
    // The runway lights run in turn, from left to right.
    const lead = Math.floor(t * 4) % lights.length;
    lights.forEach((light, k) => colorOf(light).copy(k === lead ? lit : dim));
    escorts.forEach((escort, k) => {
      const a = t * 0.9 + (k * Math.PI * 2) / 3;
      escort.position.set(SX + Math.cos(a) * 0.95, SY + 0.15 + Math.sin(a) * 0.25, SZ + Math.sin(a) * 0.5);
      escort.rotation.y = Math.atan2(-Math.sin(a) * 0.95, Math.cos(a) * 0.5);
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
