import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry } from "three";
import { INK, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor } from "@/lib/diorama-props";

/**
 * Ceralacca (P265): Nomina's soldier waits on the misty quay of the port, a ship's masts behind
 * him and two more of his kind in line, all with a red wax seal on the brow. Bald, in red
 * lamellar armour with a grey sash and sleeves, he stands at attention with his halberd and does nothing
 * until the seal tells him to: a spider has spun its web between him and the halberd, and the
 * stamp that commands him lies unclaimed on a crate, glowing as his seal glows.
 */
export function ceralacca(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const ARMOUR = 0x9a2238;
  const ROBE = 0x6a6a78;
  const SASH = 0x8a8a98;
  const STEEL = 0x9aa4b4;
  const WOOD = 0x4a3a30;
  const WAX = 0xc81e3a;
  const F = octagonBase(kit, 0x1e2230);
  const G = floor(kit, F, 0.06, 0x2e3446, 0x1e2232, 0.5);

  // The quay's edge, the water, a ship with two masts in the mist.
  box(3.0, 0.08, 0.12, 0x4a4f5c, 0, G, -1.25, { delay: 0.1 });
  box(2.4, 0.01, 0.7, 0x0e3a4e, 0, G - 0.03, -1.65, { delay: 0.12, flat: true, noInk: true });
  const hull = box(1.2, 0.32, 0.34, 0x2a2238, 0.45, G - 0.06, -1.72, { delay: 0.2 });
  decorate(hull, new BoxGeometry(1.2, 0.04, 0.01), 0x5a2148, [[0, 0.24, 0.171]]);
  [
    [0.15, 2.5],
    [0.8, 2.0],
  ].forEach(([dx, h], i) => {
    cylinder(0.03, 0.035, h, WOOD, dx, G + 0.26, -1.72, { delay: 0.26 + i * 0.05 }, 8);
    box(0.8 - i * 0.2, 0.04, 0.04, WOOD, dx, G + 0.26 + h * 0.82, -1.72, { delay: 0.3 + i * 0.05 });
    box(0.7 - i * 0.2, 0.1, 0.06, 0x8a8478, dx, G + 0.26 + h * 0.82 - 0.1, -1.72, { delay: 0.32 + i * 0.05 });
    limb(kit, [dx, G + 0.26 + h, -1.72], [i ? 1.05 : -0.15, G + 0.26, -1.72], 0.006, 0.006, 0x8a8478, { delay: 0.36, noInk: true });
  });
  [
    [-1.4, -0.4],
    [1.5, -0.6],
    [-0.3, -1.05],
  ].forEach(([x, z], i) => add(new SphereGeometry(0.6, 12, 8).scale(1.3, 0.12, 0.6), 0x3a4a66, x, G + 0.02, z, { delay: 0.4 + i * 0.04, noInk: true }));
  motes(12, 0x8aa0c0, 0.03, [-1.8, G + 0.1, -1.4], [1.8, G + 1.6, 1.2], 0.6);

  /** A seal of wax on a brow: a red disc and a darker spiral ring, tilted with the forehead. */
  const seals: ReturnType<typeof decorate>[] = [];
  const sealOn = (head: ReturnType<typeof box>, radius: number) => {
    const cy = radius * 1.06;
    const rise = 0.54;
    seals.push(decorate(head, new CylinderGeometry(0.27 * radius, 0.27 * radius, 0.02, 16).rotateX(Math.PI / 2 - rise), WAX, [[0, cy + 0.54 * radius, 0.82 * radius]]));
    decorate(head, new TorusGeometry(0.14 * radius, 0.035 * radius, 6, 16).rotateX(-rise), 0x6a0a1a, [[0, cy + 0.55 * radius, 0.85 * radius]]);
  };

  /** One of Nomina's soldiers: red lamellar over grey, boots, bald, the seal on the brow. */
  const soldier = (x: number, z: number, facing: number, height: number, armour: number, delay: number, arms: Parameters<typeof figure>[1]["arms"]) => {
    const man = figure(kit, {
      x,
      z,
      y: G,
      facing,
      height,
      skin: 0xc8b0a0,
      hair: { style: "bald", color: 0x6a6070 },
      face: { mouth: "neutral", brows: "calm", beard: "stubble", beardColor: 0x6a6070 },
      top: { kind: "shirt", color: ROBE },
      bottom: { kind: "trousers", color: 0x4a4a58 },
      gloves: 0x5a5a66,
      shoes: 0x2a2a30,
      arms,
      delay,
    });
    const u = height / 2.4;
    const o = (wait: number): { delay: number; rotation: [number, number, number] } => ({ delay: delay + wait, rotation: [0, facing, 0] });
    // The lamellar: a fitted cuirass, shoulder plates, a grey sash, a skirt of plates to the knee.
    const cuirass = add(new CylinderGeometry(0.38 * u, 0.33 * u, 0.62 * u, 18).scale(1, 1, 0.78), armour, ...man.at(0, 1.1 * u, 0), o(0.15));
    const tasset = add(new CylinderGeometry(0.34 * u, 0.42 * u, 0.48 * u, 16).scale(1, 1, 0.8), armour, ...man.at(0, 0.6 * u, 0), o(0.1));
    add(new CylinderGeometry(0.365 * u, 0.365 * u, 0.1 * u, 18).scale(1, 1, 0.8), SASH, ...man.at(0, 1.03 * u, 0), o(0.17));
    box(0.08 * u, 0.24 * u, 0.02, SASH, ...man.at(0.12 * u, 0.82 * u, 0.32 * u), { ...o(0.18), rotation: [-0.15, facing, 0.1] });
    const lines = (part: typeof tasset, width: number, rows: [number, number][]) =>
      decorate(part, new BoxGeometry(width * u, 0.014 * u, 0.01), INK, rows.map(([y, zz]) => [0, y * u, zz * u + 0.004] as Point));
    lines(cuirass, 0.34, [
      [0.12, 0.265],
      [0.26, 0.274],
      [0.4, 0.282],
      [0.52, 0.29],
    ]);
    lines(tasset, 0.4, [
      [0.1, 0.323],
      [0.22, 0.307],
      [0.34, 0.29],
    ]);
    [-1, 1].forEach((side) => {
      const plate = add(new SphereGeometry(0.19 * u, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), armour, ...man.at(side * 0.42 * u, 1.64 * u, 0), o(0.2));
      plate.rotation.order = "YXZ";
      plate.rotation.set(0, facing, side * -0.45);
      // Boot shafts up the shins.
      cylinder(0.115 * u, 0.11 * u, 0.3 * u, 0x2a2a30, ...man.at(side * 0.17 * u, 0.06 * u, 0.03 * u), o(0.05), 12);
    });
    sealOn(man.headPart, man.headRadius);
    return man;
  };

  // Two more of them in line behind, their halberds up.
  [
    [-1.4, -0.6, 1.0],
    [-0.75, -1.05, 1.1],
  ].forEach(([x, z, delay]) => {
    const man = soldier(x, z, 0.3, 2.2, 0x6a1a2a, delay, [[-0.5, 1.3, 0.25], "down"]);
    const foot = man.at(-0.52, 0, 0.25);
    cylinder(0.022, 0.022, 2.7, WOOD, ...foot, { delay: delay + 0.5 }, 6);
    box(0.24, 0.3, 0.02, STEEL, foot[0] - 0.12, G + 2.2, foot[2], { delay: delay + 0.55, rotation: [0, 0.3, 0] });
  });

  // Ceralacca at attention, his halberd upright in his right fist.
  const FACE = 0.3;
  const guard = soldier(0.35, 0.4, FACE, 2.45, ARMOUR, 1.4, [[-0.62, 1.42, 0.3], "down"]);
  const o = (delay: number): { delay: number; rotation: [number, number, number] } => ({ delay, rotation: [0, FACE, 0] });
  const foot = guard.at(-0.64, 0, 0.3);
  cylinder(0.03, 0.03, 3.1, WOOD, ...foot, { delay: 1.9 }, 8);
  const blade = new Shape();
  blade.moveTo(0, -0.1);
  blade.quadraticCurveTo(0.18, -0.16, 0.28, -0.28);
  blade.quadraticCurveTo(0.35, 0, 0.28, 0.28);
  blade.quadraticCurveTo(0.18, 0.16, 0, 0.1);
  blade.closePath();
  add(new ExtrudeGeometry(blade, { depth: 0.03, bevelEnabled: false }).rotateY(Math.PI), 0x8a93a3, ...guard.at(-0.66, 2.5, 0.3), o(2.0));
  add(new ConeGeometry(0.05, 0.42, 4), STEEL, ...guard.at(-0.64, 3.1, 0.3), o(2.05));
  add(new ConeGeometry(0.035, 0.2, 4).rotateZ(-Math.PI / 2), STEEL, ...guard.at(-0.56, 2.72, 0.3), o(2.06));

  // The web: he has not moved in so long that a spider has tied him to the halberd.
  const web = 0xd8e0ea;
  const anchors = [2.5, 2.2, 1.95].map((y) => guard.at(-0.62, y, 0.3));
  const holds = [guard.at(-0.2, 2.24, 0.05), guard.at(-0.32, 1.95, 0.05), guard.at(-0.46, 1.8, 0.08)];
  anchors.forEach((a, i) => holds.forEach((h, k) => Math.abs(i - k) < 2 && limb(kit, a, h, 0.005, 0.005, web, { delay: 2.2 + (i + k) * 0.02, noInk: true })));
  const spider = ball(0.035, INK, ...guard.at(-0.4, 2.14, 0.12), { delay: 2.4 });

  // The stamp that commands him, lying on a crate by a stick of wax and a fresh seal.
  crate(kit, 1.35, 0.75, G, 0.5, 0.48, 0x5e4a3a, -0.3);
  const top = G + 0.48;
  cylinder(0.13, 0.13, 0.07, 0x4a4f5c, 1.28, top, 0.72, { delay: 0.7 }, 16);
  cylinder(0.04, 0.05, 0.22, WOOD, 1.28, top + 0.07, 0.72, { delay: 0.72 }, 10);
  ball(0.07, WOOD, 1.28, top + 0.27, 0.72, { delay: 0.74 });
  box(0.24, 0.04, 0.04, WAX, 1.45, top, 0.9, { delay: 0.76, rotation: [0, 0.7, 0] });
  const fresh = cylinder(0.08, 0.08, 0.02, WAX, 1.5, top, 0.6, { delay: 0.78, flat: true });
  decorate(fresh, new TorusGeometry(0.045, 0.012, 6, 16).rotateX(Math.PI / 2), 0x6a0a1a, [[0, 0.022, 0]]);
  const lit = [...seals.map((material) => material.color), colorOf(fresh)];

  const dull = new Color(0x9a1a2e);
  const glow = new Color(0xff4a6a);
  const spiderRest = spider.position.y;
  tick((t) => {
    const k = (Math.sin(t * 1.6) + 1) / 2;
    lit.forEach((color) => color.lerpColors(dull, glow, k));
    spider.position.y = spiderRest + Math.sin(t * 0.7) * 0.05;
  });

  return { width: 4.9, height: 4.6, lookY: 1.6 };
}
