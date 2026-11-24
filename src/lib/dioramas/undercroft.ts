import { BoxGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { CYAN, YELLOW, archMouth, archedWall, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, steps, wallLantern } from "@/lib/diorama-props";

/**
 * Undercroft (P145): the rescuer of the tunnels under the noble palazzi, a sturdy woman in a
 * green headscarf and apron, pushes her covered cage trolley through a brick undercroft. Behind
 * her the stairs climb to the lit palazzo and an old cage lift creaks up and down; the floor plan
 * on the wall stops short, but at her feet an open hatch glows: she works further down.
 */
export function undercroft(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const BRICK = 0x5a3040;
  const IRON = 0x2a2a34;
  const BRASS = 0xc8a040;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x3a3036, 0x261e24, 0.45);

  // The brick wall with its arch, stairs climbing to the lit palazzo behind.
  const AX = 0.45;
  const wall = add(archedWall(3.0, 3.0, 0.3, { x: AX, half: 0.6, spring: 1.3 }), BRICK, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  const bricks: Point[] = [];
  for (let row = 0; row < 11; row++)
    for (let col = 0; col < 7; col++) {
      const x = -1.35 + col * 0.42 + (row % 2) * 0.2;
      const y = 0.15 + row * 0.26;
      if (Math.abs(x - AX) < 0.75 && y < 2.0) continue;
      bricks.push([x, y, 0.152]);
    }
  decorate(wall, new BoxGeometry(0.3, 0.02, 0.01), 0x3a1e2a, bricks);
  add(archMouth(0.6, 1.3), YELLOW, AX, G + 0.6, -2.06, { delay: 0.15, flat: true, noInk: true });
  steps(kit, AX, -1.36, G, 0.2, { width: 1.1, count: 3, tread: 0.22, rise: 0.2, color: 0x5d5060 });
  [-1, 1].forEach((side) => box(0.1, 2.6, 0.44, BRICK, AX + side * 0.62, G, -1.86, { delay: 0.16 }));
  const light = wallLantern(kit, AX + 1.0, -1.35, G + 2.15, 0.3);

  // The floor plan pinned to the wall, ending short.
  const plan = box(0.62, 0.46, 0.02, 0x2a6a9a, -0.75, G + 1.35, -1.34, { delay: 0.3, rotation: [0, 0, 0.04] });
  decorate(plan, new BoxGeometry(0.5, 0.012, 0.005), 0xe8f4ff, [
    [0, 0.4, 0.012],
    [0, 0.25, 0.012],
    [0.05, 0.1, 0.012],
  ]);
  decorate(plan, new BoxGeometry(0.012, 0.3, 0.005), 0xe8f4ff, [
    [-0.25, 0.25, 0.012],
    [0.0, 0.32, 0.012],
    [0.25, 0.25, 0.012],
  ]);
  decorate(plan, new BoxGeometry(0.06, 0.06, 0.005), 0x9a2a4a, [[0.2, 0.03, 0.012]]);

  // The old cage lift: posts, bars, a pulley turning and the cabin going up and down.
  const LX = -1.35;
  const LZ = -0.6;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.07, 2.8, 0.07, IRON, LX + sx * 0.38, G, LZ + sz * 0.38, { delay: 0.35 })));
  box(0.84, 0.08, 0.84, IRON, LX, G + 2.8, LZ, { delay: 0.4 });
  for (let k = 1; k < 6; k++) {
    box(0.025, 2.8, 0.025, IRON, LX + 0.38, G, LZ - 0.38 + k * 0.127, { delay: 0.42, noInk: true });
    box(0.025, 2.8, 0.025, IRON, LX - 0.38 + k * 0.127, G, LZ + 0.38, { delay: 0.42, noInk: true });
  }
  const wheel = add(new TorusGeometry(0.2, 0.04, 6, 16).rotateY(Math.PI / 2), 0x4a4f5c, 0, 0, 0, { delay: 0.45 });
  decorate(wheel, new BoxGeometry(0.02, 0.38, 0.03), 0x4a4f5c, [
    [0, 0.24, 0],
    [0, 0.24, 0, Math.PI / 2],
  ]);
  const pulley = new Group();
  pulley.position.set(LX, G + 3.12, LZ);
  wheel.parent?.add(pulley);
  pulley.add(wheel);
  wheel.position.set(0, -0.24, 0);
  [-0.2, 0.2].forEach((dz) => box(0.012, 2.4, 0.012, 0xb09a70, LX, G + 0.7, LZ + dz, { delay: 0.5, noInk: true }));
  const cabin = [
    box(0.66, 0.05, 0.66, 0x5e4a3a, LX, G + 0.05, LZ, { delay: 0.5 }),
    box(0.66, 0.05, 0.66, IRON, LX, G + 0.95, LZ, { delay: 0.52 }),
    ...[-1, 1].map((s) => box(0.03, 0.9, 0.03, IRON, LX + s * 0.3, G + 0.05, LZ + 0.3, { delay: 0.54, noInk: true })),
  ];
  const cabinRest = cabin.map((part) => part.position.y);

  // An open hatch in the floor, glowing from below, its lid propped up.
  const HX = -0.75;
  const HZ = 1.1;
  box(0.7, 0.04, 0.7, 0x4a3a34, HX, G, HZ, { delay: 0.6 });
  box(0.56, 0.02, 0.56, 0x0e0c14, HX, G + 0.035, HZ, { delay: 0.62, flat: true, noInk: true });
  const glow = box(0.4, 0.02, 0.4, CYAN, HX, G + 0.04, HZ, { delay: 0.64, flat: true, noInk: true });
  [-0.16, 0.16].forEach((dx) => box(0.035, 0.5, 0.035, 0x6a5444, HX + dx, G, HZ - 0.24, { delay: 0.66, rotation: [-0.2, 0, 0] }));
  box(0.7, 0.04, 0.7, 0x5e4a3a, HX, G + 0.04, HZ - 0.38, { delay: 0.68, rotation: [-1.75, 0, 0] });

  // Undercroft behind her trolley.
  const facing = 0.3;
  const woman = figure(kit, {
    x: 0.4,
    z: 0.15,
    y: G,
    facing,
    height: 2.3,
    build: "heavy",
    skin: 0xd09a78,
    hair: { style: "bun", color: 0x5a4a44 },
    face: { mouth: "frown", brows: "calm" },
    headwear: { kind: "bandana", color: 0x2f7a5a },
    top: { kind: "apron", color: 0x234a3a, accent: 0xd8d0b8, sleeves: "short" },
    bottom: { kind: "long-skirt", color: 0x1f3a30 },
    shoes: 0x2a2622,
    arms: [[-0.3, 1.02, 0.5], [0.3, 1.02, 0.5]],
    delay: 0.9,
  });
  const at = woman.at;
  const turn: Point = [0, facing, 0];
  // The trolley: a bed on four wheels, a cage, a tarp tied down with rope, a handle and a lantern.
  box(0.8, 0.06, 0.78, 0x4a3a34, ...at(0, 0.16, 0.98), { delay: 1.2, rotation: turn });
  [-0.32, 0.32].forEach((dx) => [0.66, 1.3].forEach((dz) => add(new CylinderGeometry(0.08, 0.08, 0.06, 12).rotateZ(Math.PI / 2), IRON, ...at(dx, 0, dz), { delay: 1.22, rotation: turn })));
  const tarp = box(0.74, 0.5, 0.72, 0xb8b0a0, ...at(0, 0.22, 0.98), { delay: 1.28, rotation: turn });
  decorate(tarp, new BoxGeometry(0.76, 0.015, 0.015), 0x6a5a44, [
    [0, 0.15, 0.362, 0.5],
    [0, 0.15, 0.362, -0.5],
    [0, 0.4, 0.362],
  ]);
  [-0.38, 0.38].forEach((dx) => {
    limb(kit, at(dx, 0.2, 0.6), at(dx, 1.02, 0.5), 0.025, 0.025, IRON, { delay: 1.25 });
    limb(kit, at(dx, 0.2, 1.36), at(dx, 0.9, 1.36), 0.025, 0.025, IRON, { delay: 1.25 });
  });
  limb(kit, at(-0.4, 1.02, 0.5), at(0.4, 1.02, 0.5), 0.03, 0.03, IRON, { delay: 1.3 });
  const hook = at(0.38, 0.9, 1.36);
  box(0.16, 0.05, 0.16, IRON, hook[0], hook[1] - 0.06, hook[2], { delay: 1.35, rotation: turn });
  const lantern = box(0.12, 0.16, 0.12, YELLOW, hook[0], hook[1] - 0.22, hook[2], { delay: 1.38, flat: true, rotation: turn });

  // The apron's skirt, and her keys on a ring hung from the handle, swinging as she pushes.
  const apron = box(0.5, 0.72, 0.03, 0xd8d0b8, ...at(0, 0.3, 0.57), { delay: 1.15 });
  apron.rotation.order = "YXZ";
  apron.rotation.set(-0.24, facing, 0);
  const hip = at(0.46, 1.0, 0.5);
  const ring = add(new TorusGeometry(0.06, 0.012, 6, 16), BRASS, hip[0], hip[1] - 0.12, hip[2], { delay: 1.4, rotation: turn });
  const keys = [-0.04, 0, 0.04].map((dx, i) => box(0.025, 0.16, 0.012, BRASS, hip[0] + dx, hip[1] - 0.3, hip[2] + 0.01, { delay: 1.42 + i * 0.02, rotation: [0, facing, dx * 4] }));
  const swing = new Group();
  swing.position.set(...hip);
  ring.parent?.add(swing);
  [ring, ...keys].forEach((part) => {
    part.position.sub(swing.position);
    swing.add(part);
  });

  const glowColor = colorOf(glow).clone();
  tick((t) => {
    const lift = (1 - Math.cos(t * 0.5)) * 0.8;
    cabin.forEach((part, i) => (part.position.y = cabinRest[i] + lift));
    pulley.rotation.x = lift * 5;
    swing.rotation.z = Math.sin(t * 2.2) * 0.15;
    lantern.visible = Math.floor(t * 9) % 11 !== 4;
    light.visible = Math.floor(t * 6) % 17 !== 8;
    colorOf(glow).copy(glowColor).multiplyScalar(0.75 + 0.25 * Math.sin(t * 2));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
