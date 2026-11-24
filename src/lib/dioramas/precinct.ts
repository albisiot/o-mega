import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group, type Mesh } from "three";
import { INK, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { car, column, floor, skyline } from "@/lib/diorama-props";

/**
 * Precinct (P086): the Custodi's traffic warden, a werewolf under the full moon, howls from his
 * striped podium in a piazza of the old town, cap still on, white belt, uniform torn by the fur,
 * claws up. Round him the night's work: a thief's slashed sack spilling coins and a dropped
 * beanie; and by the kerb the bill for the morning, a parked car with three claw gashes.
 */
export function precinct(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const FUR = 0x5a6890;
  const FUR_LIGHT = 0x7480a8;
  const CLAW = 0xe8e0d0;
  const F = octagonBase(kit, 0x18142a);
  const G = floor(kit, F, 0.06, 0x2a2638, 0x1a1828, 0.28);

  // The full moon behind the rooftops, a dome and a broken column.
  const moon = add(new CylinderGeometry(0.6, 0.6, 0.04, 32).rotateX(Math.PI / 2), 0xf0ead0, -0.85, G + 2.5, -1.7, { delay: 0.05, flat: true, rotation: [0, 0.35, 0] });
  decorate(moon, new CylinderGeometry(0.11, 0.11, 0.01, 14).rotateX(Math.PI / 2), 0xb8c8d8, [
    [0.15, 0.8, 0.022],
    [-0.22, 0.48, 0.022],
  ]);
  decorate(moon, new CylinderGeometry(0.06, 0.06, 0.01, 12).rotateX(Math.PI / 2), 0xb8c8d8, [
    [0.3, 0.42, 0.022],
    [-0.12, 0.88, 0.022],
    [0.05, 0.3, 0.022],
  ]);
  [
    [-0.25, 2.72, 0.55, 0x6a2058],
    [0.3, 2.6, 0.4, 0x8a2a6a],
  ].forEach(([dx, y, w, color], i) => add(new SphereGeometry(1, 14, 8).scale(w, 0.07, 0.05), color, -0.85 + dx, G + y, -1.64, { delay: 0.1 + i * 0.03, flat: true, noInk: true, rotation: [0, 0.35, 0] }));
  skyline(kit, -1.75, G, 0.12, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.4, 0.45);
  box(0.9, 1.5, 0.7, 0x2e2a46, 1.1, G, -1.25, { delay: 0.2 });
  cylinder(0.32, 0.34, 0.35, 0x3a3658, 1.1, G + 1.5, -1.25, { delay: 0.25 }, 16);
  add(new SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x5a2a5a, 1.1, G + 1.85, -1.25, { delay: 0.3 });
  cylinder(0.06, 0.08, 0.2, 0x3a3658, 1.1, G + 2.17, -1.25, { delay: 0.34 }, 8);
  column(kit, 1.7, -0.2, G, 0.3, 2.3, true, 0x5a7090);

  // The parked car, three gashes down its door.
  const [body] = car(kit, 1.15, 0.6, G, 0.35, 0x3a4a7a, 0.35);
  decorate(body, new BoxGeometry(0.035, 0.26, 0.012), CLAW, [-0.24, -0.1, 0.04].map((x) => [x, 0.16, 0.312, 0.55] as [number, number, number, number]));
  decorate(body, new BoxGeometry(0.015, 0.26, 0.012), INK, [-0.21, -0.07, 0.07].map((x) => [x, 0.16, 0.313, 0.55] as [number, number, number, number]));

  // What's left of the thief: a slashed sack spilling coins, a striped beanie.
  const sack = add(new SphereGeometry(0.25, 14, 10).scale(1, 0.72, 0.9), 0x6a5444, -1.3, G, 0.85, { delay: 0.5, rotation: [0, 0.4, 0.2] });
  decorate(sack, new BoxGeometry(0.02, 0.22, 0.01), INK, [
    [-0.06, 0.2, 0.22, 0.5],
    [0.03, 0.2, 0.225, 0.5],
    [0.12, 0.18, 0.21, 0.5],
  ]);
  [
    [-1.0, 1.05],
    [-0.88, 1.25],
    [-1.1, 1.3],
    [-0.75, 1.1],
    [-0.95, 1.5],
  ].forEach(([x, z], i) => cylinder(0.055, 0.055, 0.02, YELLOW, x, G, z, { delay: 0.55 + i * 0.03 }, 12));
  const beanie = add(new SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x23222b, -0.35, G, 1.55, { delay: 0.6, rotation: [0.3, 0, 0.5] });
  decorate(beanie, new TorusGeometry(0.115, 0.018, 4, 16).rotateX(Math.PI / 2), CLAW, [
    [0, 0.03, 0],
    [0, 0.08, 0],
  ]);

  // His podium, striped like a barber's pole.
  const PX = -0.35;
  const PZ = 0.2;
  const podium = cylinder(0.45, 0.5, 0.36, 0x23404b, PX, G, PZ, { delay: 0.4 }, 20);
  decorate(podium, new TorusGeometry(0.485, 0.03, 4, 28).rotateX(Math.PI / 2), CLAW, [
    [0, 0.1, 0],
    [0, 0.24, 0],
  ]);
  cylinder(0.47, 0.47, 0.04, 0x1a2a34, PX, G + 0.36, PZ, { delay: 0.45 }, 20);

  // Precinct: cap, uniform with brass buttons, white belt, fur bursting out, claws up.
  const FACE = 0.35;
  const wolf = figure(kit, {
    x: PX,
    z: PZ,
    y: G + 0.4,
    facing: FACE,
    height: 2.45,
    build: "broad",
    skin: FUR,
    hair: { style: "bald", color: 0x3a4468 },
    face: { mouth: "none", brows: "angry", eyes: YELLOW, glow: true },
    top: { kind: "uniform", color: 0x1f2a4a, accent: YELLOW },
    bottom: { kind: "trousers", color: 0x1a2240 },
    shoes: 0x16171e,
    belt: CLAW,
    gloves: FUR_LIGHT,
    arms: [[-0.74, 2.05, 0.32], [0.74, 2.05, 0.32]],
    delay: 0.7,
  });
  const at = wolf.at;
  const [cx, cy, cz] = wolf.head;
  const f: Point = [Math.sin(FACE), 0, Math.cos(FACE)];
  const s: Point = [Math.cos(FACE), 0, -Math.sin(FACE)];
  const along = (p: Point, d: Point, k: number): Point => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];

  // His head thrown back and turned to the moon: everything on it is placed in the head's own frame.
  const YAW = FACE - 0.7;
  const TILT = -0.45;
  const hp = (lx: number, ly: number, lz: number): Point => {
    const y = ly * Math.cos(TILT) - lz * Math.sin(TILT);
    const z = ly * Math.sin(TILT) + lz * Math.cos(TILT);
    return [cx + lx * Math.cos(YAW) + z * Math.sin(YAW), cy + y, cz - lx * Math.sin(YAW) + z * Math.cos(YAW)];
  };
  const onHead = (part: Group, x = 0, z = 0) => {
    part.rotation.order = "YXZ";
    part.rotation.set(TILT + x, YAW, z);
    return part;
  };
  const RH = wolf.headRadius;
  onHead(wolf.headPart).position.set(...hp(0, -RH * 1.06, 0));
  onHead(add(new SphereGeometry(RH * 1.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x1c2444, ...hp(0, RH * 0.5, -0.01), { delay: 1.2 }));
  onHead(box(RH * 1.5, 0.03, RH * 0.9, 0x10141f, ...hp(0, RH * 0.5, RH * 0.85), { delay: 1.22 }), -0.15);
  onHead(box(0.07, 0.07, 0.02, YELLOW, ...hp(0, RH * 0.5 + 0.08, RH * 1.02), { delay: 1.24 }));

  // The muzzle, jaw open, fangs; ears out from under the cap, ruffs of fur on the cheeks.
  const base = hp(0, -0.07, 0.15);
  const tip = hp(0, 0.0, 0.52);
  limb(kit, base, tip, 0.12, 0.065, FUR_LIGHT, { delay: 1.25 });
  ball(0.05, INK, tip[0], tip[1] - 0.05, tip[2], { delay: 1.3 });
  ball(0.075, 0x5a1a2a, ...along(hp(0, -0.13, 0.27), [0, 1, 0], -0.075), { delay: 1.28 });
  [-1, 1].forEach((side) => {
    onHead(add(new ConeGeometry(0.022, 0.08, 5).rotateX(Math.PI), CLAW, ...hp(side * 0.05, -0.15, 0.4), { delay: 1.32, noInk: true }));
    onHead(add(new ConeGeometry(0.08, 0.26, 6), FUR, ...hp(side * 0.17, 0.14, -0.04), { delay: 1.22 }), -0.1, -side * 0.45);
    const ruff = hp(side * 0.19, -0.1, 0.06);
    add(new ConeGeometry(0.06, 0.2, 5), FUR, ...ruff, { delay: 1.24, rotation: aim(ruff, hp(side * 0.45, -0.25, 0.0)).rotation });
  });
  const jawBase = hp(0, -0.15, 0.12);
  const jawTip = (open: number) => hp(0, -0.15 - open * 0.3, 0.44);
  const jaw = limb(kit, jawBase, jawTip(0.6), 0.08, 0.045, FUR, { delay: 1.3 });

  // Claws on both hands; fur bursting from the shoulders, the chest and the cuffs.
  wolf.hands.forEach((hand, i) => {
    const side = i ? 1 : -1;
    [-0.06, -0.02, 0.02, 0.06].forEach((k, j) => {
      const from = along(along(hand, f, k * 1.4), s, side * 0.03);
      const dir: Point = [s[0] * side * 0.5 + f[0] * 0.25, 0.85, s[2] * side * 0.5 + f[2] * 0.25];
      add(new ConeGeometry(0.03, 0.2, 5), CLAW, ...from, { delay: 1.35 + j * 0.02, rotation: aim(from, along(from, dir, 1)).rotation });
    });
  });
  const tuft = (p: Point, d: Point, size: number, delay: number) => add(new ConeGeometry(0.06 * size, 0.2 * size, 5), FUR, ...p, { delay, rotation: aim(p, along(p, d, 1)).rotation });
  tuft(at(-0.52, 1.72, 0.1), [-s[0] + 0.2 * f[0], 0.4, -s[2] + 0.2 * f[2]], 1, 1.4);
  tuft(at(0.52, 1.72, 0.1), [s[0] + 0.2 * f[0], 0.4, s[2] + 0.2 * f[2]], 1, 1.42);
  box(0.24, 0.24, 0.02, FUR, ...at(0, 1.5, 0.32), { delay: 1.1, rotation: [0, FACE, Math.PI / 4] });
  tuft(at(0, 1.52, 0.32), [f[0], 0.5, f[2]], 0.9, 1.44);
  [0.3, 1.1, 2.0, 2.85].forEach((a, k) => {
    const out: Point = [Math.cos(a), 0, Math.sin(a)];
    const p = at(out[0] * 0.2, 1.8, out[2] * 0.16);
    const q = at(out[0] * 0.6, 2.05, out[2] * 0.5);
    tuft(p, [q[0] - p[0], q[1] - p[1], q[2] - p[2]], 1.1, 1.45 + k * 0.02);
  });

  // The howl, in rings rising over his muzzle.
  const arcs = [0.16, 0.3, 0.44].map((r, k) =>
    add(new TorusGeometry(r, 0.02, 4, 16, 1.6).rotateZ(Math.PI / 2 - 0.8), YELLOW, tip[0] + f[0] * r * 0.4, tip[1] + 0.04 + r * Math.sin(Math.PI / 2 - 0.8), tip[2] + f[2] * r * 0.4, { delay: 1.5 + k * 0.05, flat: true, noInk: true, rotation: [0, 0.35, 0] }),
  );

  tick((t) => {
    // The jaw works through the howl and the rings pulse outwards.
    const open = 0.6 + Math.sin(t * 1.2) * 0.25;
    jaw.rotation.set(...aim(jawBase, jawTip(open)).rotation);
    arcs.forEach((arc, k) => {
      const mesh = arc.children[0] as Mesh;
      mesh.scale.setScalar(1 + Math.sin(t * 4 - k * 0.9) * 0.08);
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
