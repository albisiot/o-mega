import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { barrel, floor, rubble } from "@/lib/diorama-props";

/**
 * Limatura (P338): the scrap dealer who commands iron, in her yard under a heap of wrecks. Her
 * gloved hands spin a whirlwind of filings, and a rusty girder hangs in the air beside her, bent
 * as if it were wire; on a drum her cash tin and an auction bell wait for the best offer.
 * Nothing iron can stay quiet near her: bolts creep across the ground to her boots.
 */
export function limatura(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const RUST = 0xa0502a;
  const SCRAP = [0x4a5266, 0x5a4a48, 0x3a4458];
  const F = octagonBase(kit, 0x1c1a22);
  const G = floor(kit, F, 0.06, 0x2e2a30, 0x201c22, 0);

  // The heap: a crushed car, tyres, drums, a car door and girders, a crane beyond.
  // A stack of crushed cars, the top one tipped.
  [
    [0.95, -1.15, 0, 0x6a3a5a, 0.2],
    [0.98, -1.12, 0.5, 0x2f5866, -0.15],
    [0.9, -1.2, 1.0, 0x5a5a6a, 0.5],
  ].forEach(([x, z, y, color, turn], k) => {
    const car = box(0.7, 0.5, 0.6, color, x, G + y, z, { delay: 0.1 + k * 0.05, rotation: [0, turn, k === 2 ? 0.2 : 0.03] });
    decorate(car, new BoxGeometry(0.3, 0.1, 0.01), 0x16303e, [[0.12, 0.32, 0.301]]);
  });
  const cube = box(0.75, 0.6, 0.65, 0x3a4a7a, -0.95, G, -1.2, { delay: 0.2, rotation: [0, 0.4, 0.05] });
  decorate(cube, new BoxGeometry(0.76, 0.05, 0.66), 0x2a3458, [
    [0, 0.18, 0],
    [0, 0.42, 0],
  ]);
  decorate(cube, new BoxGeometry(0.3, 0.12, 0.01), 0x16303e, [[0.1, 0.3, 0.33]]);
  box(0.6, 0.5, 0.55, 0x6a3a3a, -0.75, G + 0.6, -1.3, { delay: 0.3, rotation: [0.1, -0.3, 0.12] });
  [
    [0.15, -1.45, 0],
    [0.3, -1.35, 0.25],
  ].forEach(([x, z, y], k) => add(new TorusGeometry(0.22, 0.09, 8, 18), 0x1f1f26, x, G + y, z, { delay: 0.35 + k * 0.04, rotation: [0.2 + k * 1.2, 0.3, 0] }));
  barrel(kit, 1.6, -0.45, G, 0.4, 0x2f5a6a);
  add(new CylinderGeometry(0.2, 0.2, 0.5, 14).rotateZ(Math.PI / 2), 0x5a3a48, 1.55, G, 0.05, { delay: 0.45, rotation: [0, 0.6, 0] });
  box(0.08, 1.4, 0.16, RUST, -0.25, G, -1.5, { delay: 0.5, rotation: [0.2, 0, -0.5] });
  rubble(kit, -0.2, -0.95, G, 0.55, 9, 0.6, SCRAP[0]);

  // Her stall: a drum with the cash tin and a bell for the bidding.
  barrel(kit, -1.45, 0.55, G, 0.6, 0x3a4458);
  const tin = box(0.34, 0.12, 0.24, 0x2f5a4a, -1.45, G + 0.5, 0.55, { delay: 0.7, rotation: [0, 0.4, 0] });
  decorate(tin, new BoxGeometry(0.28, 0.02, 0.18), 0x7ad8a8, [[0, 0.12, 0]]);
  decorate(tin, new CylinderGeometry(0.035, 0.035, 0.015, 10), YELLOW, [
    [-0.08, 0.135, 0.03],
    [0.06, 0.14, -0.02],
  ]);
  add(new ConeGeometry(0.07, 0.12, 12), 0xb08d3c, -1.55, G + 0.5, 0.25, { delay: 0.75 });
  ball(0.025, 0x5e4a3a, -1.55, G + 0.62, 0.25, { delay: 0.78 });

  // Limatura: wild black curls, a rust leather apron over a dark jacket, heavy gloves.
  const smith = figure(kit, {
    x: 0.05,
    z: 0.25,
    y: G,
    facing: 0.3,
    height: 2.4,
    skin: 0xe0b8a0,
    hair: { style: "wild", color: 0x15121a },
    face: { mouth: "smirk", brows: "angry" },
    top: { kind: "apron", color: 0x2a3040, accent: RUST, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    shoes: 0x1a1a20,
    gloves: 0x5a4a42,
    arms: [[-0.5, 1.45, 0.62], [0.52, 1.5, 0.6]],
    legs: "wide",
    delay: 0.8,
  });
  const at = smith.at;
  box(0.52, 0.62, 0.03, RUST, ...at(0, 0.45, 0.24), { delay: 1.3, rotation: [0.12, 0.3, 0] });
  [0, 1].forEach((i) => limb(kit, smith.elbows[i], smith.hands[i], 0.12, 0.11, 0x5a4a42, { delay: 1.35 }));

  // The girder, bent in a V and floating in front of her.
  const girder = (length: number, angle: number) => {
    const s = new Shape();
    const [w, h, t, web] = [0.2, 0.24, 0.045, 0.04];
    s.moveTo(-w / 2, -h / 2);
    [
      [w / 2, -h / 2],
      [w / 2, -h / 2 + t],
      [web / 2, -h / 2 + t],
      [web / 2, h / 2 - t],
      [w / 2, h / 2 - t],
      [w / 2, h / 2],
      [-w / 2, h / 2],
      [-w / 2, h / 2 - t],
      [-web / 2, h / 2 - t],
      [-web / 2, -h / 2 + t],
      [-w / 2, -h / 2 + t],
    ].forEach(([x, y]) => s.lineTo(x, y));
    s.closePath();
    return new ExtrudeGeometry(s, { depth: length, bevelEnabled: false }).rotateY(Math.PI / 2).rotateZ(angle);
  };
  const J: Point = [1.32, G + 0.92, 0.62];
  const halves = [girder(0.8, Math.PI - 0.12), girder(0.7, 0.7)].map((geometry, k) => add(geometry, RUST, ...J, { delay: 1.5 + k * 0.05 }));
  const beam = new Group();
  halves[0].parent?.add(beam);
  beam.position.set(...J);
  beam.rotation.y = 0.35;
  halves.forEach((part) => {
    part.position.set(0, 0, 0);
    beam.add(part);
  });

  // The whirlwind of filings between her hands, and bolts creeping to her boots.
  const [rh, lh] = smith.hands;
  const V: Point = [(rh[0] + lh[0]) / 2 + 0.05, (rh[1] + lh[1]) / 2 - 0.05, (rh[2] + lh[2]) / 2 + 0.12];
  const flecks = Array.from({ length: 40 }, (_, k) => box(0.035, 0.035, 0.035, k % 4 ? 0x9aa0ab : MAGENTA, ...V, { delay: 1.6 + k * 0.01, flat: true, noInk: true }));
  const bolts = Array.from({ length: 5 }, (_, k) => {
    const part = cylinder(0.03, 0.03, 0.16, 0x8a8f9a, 0, G, 0, { delay: 1.7, rotation: [0, 0, Math.PI / 2] }, 6);
    decorate(part, new CylinderGeometry(0.05, 0.05, 0.04, 6), 0x5a6070, [[0, 0.16, 0]]);
    return { part, a: 0.6 + k * 0.55 };
  });
  const feet = at(0, 0, 0.1);

  tick((t) => {
    flecks.forEach((fleck, k) => {
      const ring = 0.16 + (k % 6) * 0.07;
      const a = t * (2.6 - (k % 6) * 0.25) + k * 2.4;
      fleck.position.set(V[0] + Math.cos(a) * ring, V[1] + Math.sin(a) * ring * 0.8 + Math.sin(k) * 0.05, V[2] + Math.sin(a) * ring * 0.35);
    });
    beam.position.y = J[1] + Math.sin(t * 1.4) * 0.06;
    beam.rotation.z = Math.sin(t * 0.9) * 0.08;
    halves[0].rotation.z = Math.sin(t * 1.1) * 0.05;
    bolts.forEach(({ part, a }, k) => {
      const v = (t * 0.25 + k / bolts.length) % 1;
      const r = 1.3 - v * 1.0;
      part.position.set(feet[0] + Math.cos(a) * r, G + 0.03, feet[2] + Math.sin(a) * r * 0.8);
      part.rotation.y = -a;
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
