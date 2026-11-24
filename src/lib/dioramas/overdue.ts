import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry, Vector2 } from "three";
import { INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Overdue (P126): the red-haired guard of the last steam train of the night has stepped down
 * onto the platform from the cab, one glove on the open door's rail, frowning at her pocket
 * watch while the engine puffs and its wheels turn. The station clock has long given up on
 * her, and the passenger on the bench has grown a long white beard waiting.
 */
export function overdue(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const NAVY = 0x1e2a4a;
  const BRASS = 0xd8a840;
  const DARK = 0x23222b;
  const STEAM = 0xe8eef2;
  const WHEEL = 0x8a1e3c;
  const F = octagonBase(kit, 0x1e1c26);
  const G = floor(kit, F, 0.06, 0x2a2632, 0x1e1a26, 0);

  // The track: sleepers and two rails along the back.
  const TZ = -0.95;
  const bed = box(0.001, 0.001, 0.001, DARK, 0, G, TZ, { delay: 0.1, noInk: true });
  decorate(bed, new BoxGeometry(0.16, 0.05, 0.9), 0x3e3028, Array.from({ length: 11 }, (_, k) => [-1.6 + k * 0.32, 0.025, 0] as Point));
  [-0.25, 0.25].forEach((dz, i) => box(3.7, 0.06, 0.06, 0x8a90a0, 0, G + 0.05, TZ + dz, { delay: 0.12 + i * 0.02 }));

  // The platform: the front of the octagon, cut along its edge, with a yellow safety line.
  const EDGE = -0.3;
  const P = G + 0.32;
  const corners = Array.from({ length: 8 }, (_, k) => [2.3 * Math.sin(Math.PI / 8 + (k * Math.PI) / 4), 2.3 * Math.cos(Math.PI / 8 + (k * Math.PI) / 4)]);
  const outline: Vector2[] = [];
  corners.forEach((p, k) => {
    const q = corners[(k + 1) % 8];
    if (p[1] >= EDGE) outline.push(new Vector2(p[0], -p[1]));
    if (p[1] >= EDGE !== q[1] >= EDGE) outline.push(new Vector2(p[0] + ((q[0] - p[0]) * (EDGE - p[1])) / (q[1] - p[1]), -EDGE));
  });
  const platform = add(new ExtrudeGeometry(new Shape(outline), { depth: P - G, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x3e4252, 0, G, 0, { delay: 0.15, ink: 1.01 });
  decorate(platform, new BoxGeometry(3.9, 0.004, 0.06), YELLOW, [[0, P - G + 0.002, EDGE + 0.1]]);
  decorate(platform, new BoxGeometry(0.012, 0.004, 1.5), 0x3a3e4e, [-1.2, -0.6, 0, 0.6, 1.2].map((x) => [x, P - G + 0.002, 0.65] as Point));

  // The engine, nose to the left: wheels on pivots so they turn, boiler, chimney, cab.
  const spin = (x: number, z: number, r: number, delay: number) => {
    const hub = new Group();
    const wheel = add(new CylinderGeometry(r, r, 0.07, 18).rotateX(Math.PI / 2), WHEEL, 0, -r, 0, { delay });
    decorate(wheel, new BoxGeometry(0.03, r * 1.8, 0.075), DARK, [0, 1, 2].map((k) => [0, r, 0, (k * Math.PI) / 3] as [number, number, number, number]));
    decorate(wheel, new CylinderGeometry(r * 0.25, r * 0.25, 0.08, 10).rotateX(Math.PI / 2), BRASS, [[0, r, 0]]);
    wheel.parent?.add(hub);
    hub.add(wheel);
    hub.position.set(x, G + 0.08 + r, z);
    return hub;
  };
  const wheels = [-0.6, 0.1, 0.8].flatMap((x, i) => [-1, 1].map((side) => spin(x, TZ + side * 0.44, 0.3, 0.3 + i * 0.03)));
  wheels.push(...[-1, 1].map((side) => spin(-1.4, TZ + side * 0.4, 0.17, 0.3)));
  box(3.1, 0.1, 0.84, DARK, -0.2, G + 0.5, TZ, { delay: 0.35 });
  box(0.08, 0.2, 0.7, MAGENTA, -1.78, G + 0.36, TZ, { delay: 0.36 });
  const boiler = add(new CylinderGeometry(0.37, 0.37, 1.85, 20).rotateZ(Math.PI / 2), NAVY, -0.55, G + 0.6, TZ, { delay: 0.4 });
  decorate(boiler, new TorusGeometry(0.375, 0.02, 6, 24).rotateY(Math.PI / 2), BRASS, [-0.7, -0.1, 0.5].map((x) => [x, 0.37, 0] as Point));
  const smokebox = add(new CylinderGeometry(0.39, 0.39, 0.3, 20).rotateZ(Math.PI / 2), DARK, -1.6, G + 0.58, TZ, { delay: 0.44 });
  decorate(smokebox, new CylinderGeometry(0.28, 0.28, 0.02, 20).rotateZ(Math.PI / 2), 0x34323e, [[-0.16, 0.39, 0]]);
  box(0.12, 0.12, 0.12, YELLOW, -1.72, G + 1.02, TZ, { delay: 0.5, flat: true });
  cylinder(0.11, 0.09, 0.42, DARK, -1.3, G + 1.3, TZ, { delay: 0.48 });
  cylinder(0.16, 0.12, 0.1, DARK, -1.3, G + 1.72, TZ, { delay: 0.5 });
  ball(0.16, BRASS, -0.6, G + 1.18, TZ, { delay: 0.5 });
  const cab = box(0.95, 1.3, 0.9, NAVY, 0.68, G + 0.5, TZ, { delay: 0.45 });
  decorate(cab, new BoxGeometry(0.42, 0.95, 0.01), 0x0e0d14, [[-0.12, 0.5, 0.452]]);
  decorate(cab, new BoxGeometry(0.22, 0.2, 0.01), YELLOW, [[0.3, 0.95, 0.452]]);
  decorate(cab, new BoxGeometry(0.01, 0.2, 0.2), YELLOW, [[-0.477, 0.98, 0]]);
  box(1.1, 0.07, 1.04, DARK, 0.68, G + 1.8, TZ, { delay: 0.5 });
  // The cab door, swung open towards the platform, with its brass rail.
  box(0.04, 0.95, 0.42, NAVY, 0.2, G + 0.55, TZ + 0.66, { delay: 0.55 });
  cylinder(0.022, 0.022, 0.9, BRASS, 0.2, G + 0.6, TZ + 0.86, { delay: 0.58 }, 8);
  const rod = box(1.45, 0.04, 0.03, 0xa0a8b8, 0.1, G + 0.36, TZ + 0.5, { delay: 0.6 });

  // Overdue: red curls, navy greatcoat with brass buttons, white gloves, the watch up to her eyes.
  const facing = 0.3;
  const guard = figure(kit, {
    x: 0.62,
    z: -0.02,
    y: P,
    facing,
    height: 2.3,
    build: "slim",
    skin: 0xf0c8a8,
    hair: { style: "curly", color: 0xc84a20 },
    face: { mouth: "frown", brows: "angry", marks: 0xd08a70 },
    top: { kind: "coat", color: NAVY, accent: 0x16203a },
    bottom: { kind: "trousers", color: NAVY },
    gloves: 0xf2f0ea,
    shoes: 0x14121c,
    arms: [
      [-0.38, 1.45, -0.22],
      [0.16, 1.88, 0.4],
    ],
    delay: 0.8,
  });
  const u = 2.3 / 2.4;
  const mark = box(0.001, 0.001, 0.001, NAVY, ...guard.at(0, 0, 0), { delay: 1.0, noInk: true, rotation: [0, facing, 0] });
  decorate(
    mark,
    new SphereGeometry(0.022, 8, 6),
    BRASS,
    [1.22, 1.34, 1.46, 1.58].flatMap((y) => [-0.08, 0.08].map((x) => [x, y * u, 0.215] as Point)),
  );
  decorate(mark, new BoxGeometry(0.17, 0.04, 0.15), BRASS, [
    [-0.31, 1.7 * u, 0],
    [0.31, 1.7 * u, 0],
  ]);
  limb(kit, guard.at(-0.1, 1.58 * u, 0.22), guard.at(0.02, 1.32 * u, 0.24), 0.008, 0.008, BRASS, { delay: 1.3 });
  cylinder(0.025, 0.02, 0.09, BRASS, ...guard.at(0.02, 1.24 * u, 0.25), { delay: 1.32 });
  // Her cap: a navy kepi with a brass band and a black peak.
  const capY = guard.top - 0.03;
  const [hx, , hz] = guard.head;
  cylinder(0.25, 0.2, 0.15, NAVY, hx, capY, hz, { delay: 1.35 }, 20);
  cylinder(0.205, 0.205, 0.045, BRASS, hx, capY, hz, { delay: 1.37 }, 20);
  box(0.3, 0.025, 0.14, 0x14121c, ...guard.at(0, capY - P, 0.24), { delay: 1.38, rotation: [0.3, facing, 0] });
  // The pocket watch, on its chain.
  const [wx, wy, wz] = guard.hands[1];
  const watch = add(new CylinderGeometry(0.08, 0.08, 0.03, 18).rotateX(Math.PI / 2), BRASS, wx, wy - 0.02, wz + 0.04, { delay: 1.4, rotation: [0, facing, 0] });
  decorate(watch, new CylinderGeometry(0.065, 0.065, 0.01, 18).rotateX(Math.PI / 2), 0xf2efe6, [[0, 0.08, 0.016]]);
  const tickHand = box(0.008, 0.055, 0.006, INK, wx + 0.02 * Math.sin(facing), wy + 0.06, wz + 0.04 + 0.022, { delay: 1.45, flat: true, noInk: true, rotation: [0, facing, 0] });
  limb(kit, [wx, wy - 0.06, wz + 0.04], guard.at(0.12, 1.15 * u, 0.24), 0.008, 0.008, BRASS, { delay: 1.42 });

  // The station clock on its post, its hands racing.
  const KX = 1.55;
  const KZ = 0.7;
  const KY = P + 1.75;
  cylinder(0.04, 0.05, 1.55, DARK, KX, P, KZ, { delay: 0.6 }, 8);
  const clock = add(new CylinderGeometry(0.26, 0.26, 0.07, 24).rotateX(Math.PI / 2), 0xf2efe6, KX, KY - 0.26, KZ, { delay: 0.65, rotation: [0, 0.35, 0] });
  decorate(clock, new TorusGeometry(0.26, 0.03, 6, 24), DARK, [[0, 0.26, 0]]);
  decorate(clock, new BoxGeometry(0.02, 0.05, 0.01), INK, Array.from({ length: 12 }, (_, k) => {
    const a = (k * Math.PI) / 6;
    return [Math.sin(a) * 0.2, 0.26 + Math.cos(a) * 0.2, 0.037, -a] as [number, number, number, number];
  }));
  const face = (len: number, width: number, delay: number) =>
    box(width, len, 0.01, INK, KX + 0.045 * Math.sin(0.35), KY, KZ + 0.045 * Math.cos(0.35), { delay, flat: true, noInk: true, rotation: [0, 0.35, 0] });
  const minute = face(0.19, 0.018, 0.7);
  const hour = face(0.12, 0.026, 0.72);

  // The bench, and the passenger who waited: asleep, a long white beard, cobwebs on his hat.
  const BX = -1.05;
  const BZ = 1.0;
  const BF = 0.4;
  const seatY = 0.6;
  [-0.42, 0.42].forEach((dx) => box(0.06, seatY, 0.36, DARK, BX + dx * Math.cos(BF), P, BZ - dx * Math.sin(BF), { delay: 0.5, rotation: [0, BF, 0] }));
  box(1.0, 0.06, 0.4, 0x5e4a3a, BX, P + seatY - 0.06, BZ, { delay: 0.55, rotation: [0, BF, 0] });
  box(1.0, 0.5, 0.05, 0x5e4a3a, BX - 0.2 * Math.sin(BF), P + seatY, BZ - 0.2 * Math.cos(BF), { delay: 0.57, rotation: [-0.12, BF, 0] });
  const sleeper = figure(kit, {
    x: BX - 0.04 * Math.sin(BF),
    z: BZ - 0.04 * Math.cos(BF),
    y: P,
    facing: BF,
    height: 2.2,
    build: "normal",
    skin: 0xd8b090,
    hair: { style: "short", color: 0xd8d8de },
    face: { mouth: "open", brows: "calm", eyes: 0xd8b090, beard: "long", beardColor: 0xe8e8ee },
    headwear: { kind: "hat", color: 0x3a3a46 },
    top: { kind: "coat", color: 0x3a4a5a },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    arms: ["crossed", "crossed"],
    legs: "sit",
    delay: 0.9,
  });
  decorate(sleeper.headPart, new BoxGeometry(0.06, 0.012, 0.02), INK, [
    [-0.075, 0.245, 0.2],
    [0.075, 0.245, 0.2],
  ]);
  const hatTop = sleeper.top + 0.2;
  [
    [-0.35, 0.05],
    [0.35, -0.05],
  ].forEach(([dx, dy]) => limb(kit, sleeper.at(dx * 0.4, hatTop - P - 0.05, -0.05), sleeper.at(dx, seatY + 0.5 + dy, -0.22), 0.005, 0.005, 0xc8ccd4, { delay: 1.5, noInk: true }));
  const bubble = ball(0.05, 0xbfe8f4, ...sleeper.at(0.04, sleeper.head[1] - P - 0.07, 0.27), { delay: 1.6, flat: true });
  box(0.36, 0.26, 0.14, 0x6a2a3a, ...sleeper.at(0.45, 0, 0.6), { delay: 1.0, rotation: [0, BF + 0.3, 0] });

  // Steam from the chimney and the cylinders.
  const puffs = Array.from({ length: 6 }, (_, k) => ({
    part: ball(0.14 + (k % 2) * 0.04, STEAM, 0, 0, 0, { delay: 1.0 }),
    phase: k / 6,
    low: k >= 4,
  }));

  tick((t) => {
    // The engine idles forward: wheels turn, the rod goes round, steam rises and drifts back.
    wheels.forEach((hub) => (hub.rotation.z = t * 1.6));
    rod.position.set(0.1 + Math.cos(t * 1.6) * 0.1, G + 0.36 + Math.sin(t * 1.6) * 0.1, TZ + 0.5);
    for (const p of puffs) {
      const v = (t * 0.25 + p.phase) % 1;
      if (p.low) p.part.position.set(-1.45 + v * 0.3, G + 0.15 + v * 0.3, TZ + 0.55 + v * 0.5);
      else p.part.position.set(-1.3 + v * 1.4, G + 1.75 + v * 1.3, TZ - v * 0.2);
      p.part.children.forEach((mesh) => mesh.scale.setScalar(0.6 + v * 1.4));
      p.part.visible = v < 0.92;
    }
    // The clock races; her watch ticks; the sleeper's bubble swells and pops.
    minute.rotation.z = -t * 2.5;
    hour.rotation.z = -t * 0.2 - 1.2;
    tickHand.rotation.z = -Math.floor(t) * 0.5;
    const b = (t * 0.4) % 1;
    bubble.children.forEach((mesh) => mesh.scale.setScalar(0.5 + b * 1.6));
    bubble.visible = b < 0.9;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
