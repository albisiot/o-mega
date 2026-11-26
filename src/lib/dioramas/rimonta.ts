import { BoxGeometry, Group, TorusGeometry } from "three";
import { MAGENTA, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, wallLantern } from "@/lib/diorama-props";

/**
 * Rimonta (P346): the old judo master of the Fosse in his dojo, bald with white tufts, barefoot in
 * a white judogi and a black belt, smiling while he throws an armoured brute twice his size over
 * his shoulder: the harder it pushed, the farther it goes. The brute rocks in mid-throw along a
 * magenta arc. Behind them the lit shoji windows and a warm lamp. The price: no gadgets for him,
 * his cassette player lies by the wall with its tape spilled out across the mats.
 */
export function rimonta(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const WOOD = 0x3a2a24;
  const WOOD_DARK = 0x241a16;
  const GI = 0xe8e4dc;
  const ARMOUR = 0x2a3048;
  const F = octagonBase(kit, 0x1e1a1a);
  const G = floor(kit, F, 0.06, 0x4e4a34, 0x2e2a1e, 0.7);

  // The dojo wall: dark wood, two shoji windows lit blue, a beam, the lamp.
  const wall = box(3.0, 2.6, 0.15, WOOD, 0, G, -1.6, { delay: 0.1, ink: 1.02 });
  [-0.8, 0.8].forEach((wx) => {
    decorate(wall, new BoxGeometry(1.0, 1.2, 0.01), WOOD_DARK, [[wx, 1.35, 0.08]]);
    const panes: Point[] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) panes.push([wx - 0.36 + c * 0.24, 0.9 + r * 0.29, 0.088]);
    decorate(wall, new BoxGeometry(0.21, 0.26, 0.01), 0x6a9ad8, panes);
  });
  decorate(wall, new BoxGeometry(3.0, 0.12, 0.04), WOOD_DARK, [
    [0, 2.15, 0.09],
    [0, 0.35, 0.09],
  ]);
  const light = wallLantern(kit, 1.25, -1.52, G + 2.35, 0.3, YELLOW);

  // The price: his cassette player by the wall, the tape spilled out over the mats.
  const radio = box(0.52, 0.28, 0.18, 0x3a3f4e, 1.1, G, -1.15, { delay: 0.4, rotation: [0, -0.3, 0] });
  decorate(radio, new TorusGeometry(0.07, 0.025, 6, 16), 0x1a1c22, [
    [-0.16, 0.14, 0.092],
    [0.16, 0.14, 0.092],
  ]);
  decorate(radio, new BoxGeometry(0.14, 0.09, 0.01), 0x1a1c22, [[0, 0.14, 0.092]]);
  box(0.4, 0.03, 0.03, 0x5a6070, 1.1, G + 0.3, -1.15, { delay: 0.42, rotation: [0, -0.3, 0] });
  cable(kit, [[1.08, G + 0.15, -1.05], [1.0, G + 0.02, -0.8], [1.35, G + 0.02, -0.55], [0.95, G + 0.02, -0.35], [1.3, G + 0.02, -0.1], [1.0, G + 0.02, 0.15], [1.25, G + 0.02, 0.35]], 0.014, 0x4a3020, 0.5);

  // Rimonta: wide stance, both hands at his right shoulder, gripping.
  const x0 = 0.25;
  const z0 = 0.5;
  const master = figure(kit, {
    x: x0,
    z: z0,
    y: G,
    facing: 0.3,
    height: 2.2,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "bald", color: 0xeeeeee },
    face: { mouth: "smile", brows: "calm", marks: 0xb08060 },
    top: { kind: "jacket", color: GI, accent: 0xd0ccc0 },
    bottom: { kind: "trousers", color: GI },
    barefoot: true,
    belt: 0x16141a,
    arms: [
      [-0.45, 1.92, -0.1],
      [-0.3, 1.72, 0.14],
    ],
    legs: "wide",
    delay: 0.8,
  });
  const u = 2.2 / 2.4;
  [-1, 1].forEach((side) => {
    const tuft = master.at(side * 0.19 * u, 2.1 * u, -0.06);
    ball(0.075, 0xf4f4f4, tuft[0], tuft[1] - 0.075, tuft[2], { delay: 1.25 });
  });
  const back = master.at(0, 2.05 * u, -0.17);
  ball(0.08, 0xf4f4f4, back[0], back[1] - 0.08, back[2], { delay: 1.26 });
  box(0.12, 0.08, 0.05, 0x16141a, ...master.at(0.04, 1.03 * u, 0.24 * u), { delay: 1.3, rotation: [0, 0.3, 0] });
  [-0.04, 0.06].forEach((dx, k) => box(0.05, 0.24, 0.02, 0x16141a, ...master.at(dx, 0.82 * u, 0.25 * u), { delay: 1.32, rotation: [0, 0.3, k ? -0.2 : 0.15] }));

  // The brute in armour, built standing round the origin, then turned head-down over his shoulder.
  const brute = figure(kit, {
    x: 0,
    z: 0,
    y: -1.35,
    height: 2.7,
    build: "broad",
    skin: 0x4a5070,
    face: { mouth: "none", mask: "visor", maskColor: MAGENTA },
    headwear: { kind: "helmet", color: ARMOUR, accent: MAGENTA },
    top: { kind: "armor", color: ARMOUR, accent: 0x3e4868 },
    bottom: { kind: "trousers", color: ARMOUR },
    shoes: 0x1e2232,
    gloves: 0x3e4868,
    belt: 0x3e4868,
    arms: ["up", "out"],
    legs: "stride",
    delay: 1.0,
  });
  const thrown = new Group();
  master.parts[0].parent?.add(thrown);
  thrown.position.set(x0 - 0.3, G + 1.9, z0 - 0.5);
  thrown.rotation.order = "YXZ";
  thrown.rotation.set(0, 0.3, 2.2);
  brute.parts.forEach((part) => thrown.add(part));
  // Plates down his thighs and shins: segmented armour.
  brute.parts.slice(0, 6).forEach((part, k) =>
    k % 3 !== 2 && decorate(part, new TorusGeometry(0.19, 0.03, 6, 14).rotateX(Math.PI / 2), 0x3e4868, [
      [0, 0.12, 0],
      [0, 0.3, 0],
    ]),
  );

  // The arc of the throw.
  const arcs = [1.55, 1.7].map((radius, k) => {
    const arc = new TorusGeometry(radius, 0.03, 4, 32, 2.2).rotateZ(0.5);
    arc.computeBoundingBox();
    return add(arc, k ? 0xc02060 : MAGENTA, x0 - 0.3, G + 1.9 + (arc.boundingBox?.min.y ?? 0), z0 - 0.75, { delay: 1.6 + k * 0.05, flat: true, noInk: true, rotation: [0, 0.3, 0] });
  });

  tick((t) => {
    const swing = Math.sin(t * 1.3) * 0.1;
    thrown.rotation.z = 2.2 + swing;
    thrown.position.y = G + 1.9 + Math.abs(swing) * 0.3;
    arcs.forEach((arc, k) => (arc.visible = Math.floor(t * 4 + k) % 5 !== 3));
    light.rotation.y = Math.sin(t * 0.9) * 0.15;
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
