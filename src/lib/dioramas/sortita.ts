import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, type Object3D, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, ring } from "@/lib/diorama-props";

/**
 * Sortita (P236): the interceptor pilot lifting off a Lete landing pad, searchlights sweeping
 * the sky and the volcano glowing behind. Her little fighter is already bolting away, the engine
 * roaring cyan, but she looks back over her shoulder, eyes wide and mouth open, sweat flying off
 * her leather helmet; panic comes first, so a white flag already flutters from the antenna.
 */
export function sortita(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const HULL = 0x2a3a5a;
  const HULL_LIGHT = 0x3a4e72;
  const DARK = 0x1e2030;
  const BRASS = 0xb08d3c;
  const F = octagonBase(kit, 0x22212e);
  const G = floor(kit, F, 0.06, 0x2c2c3c, 0x202030, 0.5);

  // The landing pad on a Lete roof: a magenta ring, a cyan one inside, lights round its rim.
  ring(kit, [0, G + 0.003, 0.15], 1.6, MAGENTA, 0.1);
  ring(kit, [0, G + 0.003, 0.15], 0.7, CYAN, 0.12);
  const lights = Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4;
    return ball(0.05, CYAN, Math.sin(a) * 1.85, G, 0.15 + Math.cos(a) * 1.85, { delay: 0.14 + k * 0.02, flat: true });
  });

  // The volcano behind, its lava magenta.
  const volcano = add(new CylinderGeometry(0.16, 1.4, 1.4, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.06), 0x3a2a48, 0.15, G, -1.95, { delay: 0.1 });
  decorate(volcano, new BoxGeometry(0.3, 0.06, 0.02), MAGENTA, [[0, 1.37, 0.06]]);
  decorate(volcano, new BoxGeometry(0.03, 0.5, 0.01), MAGENTA, [
    [-0.2, 1.02, 0.07, -0.5],
    [0.16, 0.96, 0.07, 0.45],
  ]);
  ball(0.16, 0x5a2148, 0.2, G + 1.42, -1.95, { delay: 0.2, noInk: true });
  ball(0.22, 0x5a2148, 0.34, G + 1.68, -1.95, { delay: 0.24, noInk: true });

  // Two searchlights sweeping the sky.
  const beams = [
    [-1.55, -0.85, -0.25],
    [1.5, -0.95, 0.25],
  ].map(([x, z, lean], i) => {
    box(0.3, 0.22, 0.3, DARK, x, G, z, { delay: 0.3 + i * 0.04 });
    add(new CylinderGeometry(0.14, 0.11, 0.2, 12), 0x3a3f50, x, G + 0.22, z, { delay: 0.33 + i * 0.04, rotation: [-0.25, 0, lean] });
    const beam = add(new CylinderGeometry(0.15, 0.06, 2.5, 12), 0xfff0a0, x, G + 0.36, z, { delay: 0.5 + i * 0.05, flat: true, noInk: true, rotation: [-0.25, 0, lean] });
    return { beam, lean };
  });

  // The fighter, built along x with its nose at −x, then turned and lifted as one.
  const root = volcano.parent as Object3D;
  const before = new Set(root.children);
  const C = new Vector3(0.1, G + 1.0, 0.1);
  const S = (x: number, y: number, z: number): Point => [C.x + x, C.y + y, C.z + z];
  const mid = add(new CylinderGeometry(0.36, 0.36, 1.2, 18).rotateZ(Math.PI / 2), HULL, ...S(-0.1, -0.36, 0), { delay: 0.6 });
  decorate(mid, new TorusGeometry(0.365, 0.03, 6, 22).rotateY(Math.PI / 2), MAGENTA, [
    [0.42, 0.36, 0],
    [-0.52, 0.36, 0],
  ]);
  decorate(
    mid,
    new SphereGeometry(0.018, 6, 4),
    0x5a6a8a,
    [-0.3, -0.1, 0.1, 0.3].flatMap((x) => [[x, 0.2, 0.33], [x, 0.2, -0.33]] as Point[]),
  );
  add(new ConeGeometry(0.36, 0.9, 18).rotateZ(Math.PI / 2), HULL_LIGHT, ...S(-1.15, -0.36, 0), { delay: 0.64 });
  add(new CylinderGeometry(0.2, 0.36, 0.7, 18).rotateZ(-Math.PI / 2), HULL, ...S(0.85, -0.36, 0), { delay: 0.66 });
  add(new CylinderGeometry(0.22, 0.2, 0.16, 14).rotateZ(-Math.PI / 2), DARK, ...S(1.28, -0.22, 0), { delay: 0.68 });
  const flames = [0.75, 0.42].map((length, k) =>
    add(new ConeGeometry(0.17 - k * 0.05, length, 12).rotateZ(-Math.PI / 2), k ? 0xe8fbff : CYAN, ...S(1.36 + length / 2, -0.17 + k * 0.05, 0), { delay: 0.9, flat: true, noInk: true }),
  );
  const wing = new Shape();
  wing.moveTo(-0.45, 0);
  wing.lineTo(0.4, -1.05);
  wing.lineTo(0.72, -1.05);
  wing.lineTo(0.55, 0);
  wing.lineTo(0.72, 1.05);
  wing.lineTo(0.4, 1.05);
  wing.closePath();
  const wings = add(new ExtrudeGeometry(wing, { depth: 0.05, bevelEnabled: false }).rotateX(Math.PI / 2), HULL_LIGHT, ...S(0, -0.22, 0), { delay: 0.7 });
  decorate(wings, new BoxGeometry(0.3, 0.012, 0.14), MAGENTA, [
    [0.56, 0.055, -0.95],
    [0.56, 0.055, 0.95],
  ]);
  [-0.55, 0.55].forEach((z, i) => add(new CylinderGeometry(0.04, 0.04, 0.7, 8).rotateZ(Math.PI / 2), DARK, ...S(0.05, -0.3, z), { delay: 0.74 + i * 0.02 }));
  const fin = new Shape();
  fin.moveTo(0.45, 0);
  fin.lineTo(1.2, 0);
  fin.lineTo(1.28, 0.62);
  fin.lineTo(1.0, 0.62);
  fin.closePath();
  add(new ExtrudeGeometry(fin, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02), HULL_LIGHT, ...S(0, 0.2, 0), { delay: 0.72 });
  add(new TorusGeometry(0.3, 0.05, 8, 22).rotateX(Math.PI / 2).scale(1.25, 1, 1), DARK, ...S(-0.25, 0.27, 0), { delay: 0.76 });
  box(0.04, 0.3, 0.5, 0x2a8fb0, ...S(-0.68, 0.24, 0), { delay: 0.78, flat: true, rotation: [0, 0, -0.55] });
  box(0.02, 0.75, 0.02, DARK, ...S(0.35, 0.3, 0), { delay: 0.8, noInk: true });
  const flag = add(new BoxGeometry(0.34, 0.22, 0.015).translate(0.17, 0, 0), 0xf4f0e6, ...S(0.36, 0.8, 0), { delay: 1.6 });
  [
    [0.32, 0.05, MAGENTA],
    [0.08, -0.12, CYAN],
    [-0.12, 0.12, 0xf4f0e6],
  ].forEach(([y, z, color], i) => box(0.6 - i * 0.1, 0.025, 0.025, color, ...S(1.95 + i * 0.1, y, z), { delay: 1.2 + i * 0.04, flat: true, noInk: true }));

  // Sortita, seated facing the nose, her head turned right round to look back.
  const u = 2.1 / 2.4;
  const drop = 1.08 * u * 0.38;
  const pilot = figure(kit, {
    x: C.x - 0.22,
    z: C.z,
    y: C.y - 0.38,
    facing: -Math.PI / 2,
    height: 2.1,
    build: "slim",
    skin: 0xe8bea6,
    hair: { style: "bob", color: 0x3a2216 },
    face: { mouth: "open", brows: "worried", eyes: 0x1f5f8a },
    headwear: { kind: "helmet", color: 0x6b4a30, accent: 0x4a3220 },
    top: { kind: "jacket", color: 0xd8cfb4, accent: 0xeee6d0 },
    bottom: { kind: "trousers", color: 0x4a4a5a },
    gloves: 0x5a3a28,
    arms: ["forward", [0.42, 0.8, 0.05]],
    legs: "sit",
    delay: 0.9,
  });
  const RH = pilot.headRadius;
  const headY = 2.14 * u - drop;
  const goggles = [-1, 1].flatMap((side) => {
    const at = pilot.at(side * 0.08, headY + RH * 0.62, RH * 0.8);
    const parts = [
      add(new TorusGeometry(0.055, 0.02, 6, 14), BRASS, at[0], at[1] - 0.075, at[2], { delay: 1.45 }),
      add(new CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(Math.PI / 2), 0x3fb0d0, at[0], at[1] - 0.05, at[2], { delay: 1.47, flat: true }),
    ];
    parts.forEach((part) => {
      part.rotation.order = "YXZ";
      part.rotation.set(-0.45, -Math.PI / 2, 0);
    });
    return parts;
  });
  cable(kit, [pilot.at(0.19, 1.06, 0.1), pilot.at(0.12, 0.9, 0.2), pilot.at(-0.04, 0.78, 0.21), pilot.at(-0.17, 0.86, 0.15)], 0.022, YELLOW, 1.4);
  [-1, 1].forEach((side) => cable(kit, [pilot.at(side * 0.12, 1.16, -0.02), pilot.at(side * 0.1, 1.0, 0.2), pilot.at(side * 0.05, 0.62, 0.21)], 0.03, 0x5a2f7a, 1.38));
  const sweat = [0, 1, 2].map(() => add(new SphereGeometry(0.035, 8, 6).scale(1, 1.4, 1), 0xbfefff, ...pilot.head, { delay: 1.7, flat: true, noInk: true }));

  const neck = new Vector3(...pilot.at(0, 1.84 * u - drop, 0));
  const head = new Group();
  head.position.copy(neck);
  root.add(head);
  [...pilot.parts.filter((part) => part.position.y > pilot.head[1] - RH * 1.3), ...goggles].forEach((part) => {
    part.position.sub(neck);
    head.add(part);
  });
  head.rotation.y = 1.25;

  const ship = new Group();
  ship.position.copy(C);
  ship.rotation.order = "YXZ";
  ship.rotation.set(0, 0.6, -0.08);
  root.children.filter((child) => !before.has(child)).forEach((part) => {
    part.position.sub(C);
    ship.add(part);
  });
  root.add(ship);
  const headLocal = new Vector3(...pilot.head).sub(C);

  tick((t) => {
    ship.position.y = C.y + Math.sin(t * 2.2) * 0.06;
    ship.rotation.x = Math.sin(t * 3.1) * 0.05;
    ship.rotation.z = -0.08 + Math.sin(t * 2.3) * 0.03;
    flames[0].children[0].scale.x = Math.floor(t * 12) % 2 ? 0.8 : 1;
    flag.rotation.y = Math.sin(t * 9) * 0.35;
    beams.forEach(({ beam, lean }, i) => (beam.rotation.z = lean + Math.sin(t * 0.6 + i * 2) * 0.18));
    lights.forEach((light, k) => (light.visible = (Math.floor(t * 4) + k) % 8 !== 4));
    sweat.forEach((drop, k) => {
      const s = (t * 1.4 + k / 3) % 1;
      const a = 0.6 + k * 0.9;
      drop.position.set(headLocal.x + Math.cos(a) * (0.22 + s * 0.3), headLocal.y + 0.15 + 0.2 * s - 0.45 * s * s, headLocal.z + Math.sin(a) * (0.22 + s * 0.3));
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
