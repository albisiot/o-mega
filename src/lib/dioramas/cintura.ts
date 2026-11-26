import { BoxGeometry, CylinderGeometry, Group, TorusGeometry, Vector3, type Material, type Mesh } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, ring } from "@/lib/diorama-props";

/**
 * Cintura (P345): the unbeaten champion of the Banco's arena in the octagon cage, cornrow braids,
 * a black fight suit striped in yellow and the gold title belt round her waist, throwing a high
 * kick with a grin: you and her, no tricks. The kick snaps and a trail sweeps behind it. The
 * price: outside the ring she can do nothing else, and in her corner her phone rings and rings
 * on the stool, its screen cracked, a call she will never manage to answer.
 */
export function cintura(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const SUIT = 0x1a1d2a;
  const GOLD = 0xf2b632;
  const POST = 0x2a2c3a;
  const F = octagonBase(kit, 0x1a1828);
  const G = floor(kit, F, 0.06, 0x23253a, 0x1a1c2c, 0);
  ring(kit, [0, G + 0.003, 0], 1.45, MAGENTA, 0.12);
  ring(kit, [0, G + 0.003, 0], 0.55, CYAN, 0.14);

  // The cage: five sides of wire round the back, padded posts at the corners, the front open.
  const a = 2.12;
  const b = 0.878;
  const corners: [number, number][] = [[-a, b], [-a, -b], [-b, -a], [b, -a], [a, -b], [a, b]];
  corners.forEach(([x, z], i) => {
    cylinder(0.06, 0.07, 1.55, POST, x, G, z, { delay: 0.1 + i * 0.03 }, 10);
    cylinder(0.1, 0.1, 0.22, MAGENTA, x, G + 1.35, z, { delay: 0.14 + i * 0.03 }, 10);
  });
  corners.slice(1).forEach(([x2, z2], i) => {
    const [x1, z1] = corners[i];
    const length = Math.hypot(x2 - x1, z2 - z1);
    const turn: Point = [0, Math.atan2(-(z2 - z1), x2 - x1), 0];
    const panel = box(length - 0.1, 1.25, 0.02, 0x2a3048, (x1 + x2) / 2, G + 0.08, (z1 + z2) / 2, { delay: 0.2 + i * 0.04, rotation: turn, noInk: true });
    const glass = (panel.children[0] as Mesh).material as Material;
    glass.transparent = true;
    glass.opacity = 0.35;
    glass.depthWrite = false;
    const mesh: [number, number, number][] = [];
    for (let k = 1; k < 10; k++) mesh.push([-length / 2 + (k * length) / 10, 0.625, 0.012]);
    decorate(panel, new BoxGeometry(0.012, 1.25, 0.012), 0x5a6480, mesh);
    decorate(panel, new BoxGeometry(length - 0.1, 0.012, 0.012), 0x5a6480, [0.2, 0.42, 0.64, 0.86, 1.08].map((y) => [0, y, 0.012] as Point));
    box(length - 0.1, 0.08, 0.08, MAGENTA, (x1 + x2) / 2, G + 1.33, (z1 + z2) / 2, { delay: 0.24 + i * 0.04, rotation: turn });
  });

  // Two light masts at the back corners, their beams falling on her.
  const beams = [corners[2], corners[3]].map(([x, z], k) => {
    cylinder(0.035, 0.045, 1.65, POST, x, G + 1.55, z, { delay: 0.3 + k * 0.04 }, 8);
    const lampAt: Point = [x * 0.92, G + 3.05, z * 0.95];
    const head = cylinder(0.11, 0.15, 0.22, POST, ...lampAt, { delay: 0.36 + k * 0.04, rotation: [-0.7, 0, k ? -0.3 : 0.3] }, 12);
    decorate(head, new CylinderGeometry(0.13, 0.13, 0.02, 12), k ? 0xfff2c0 : 0xffd0e8, [[0, 0.01, 0]]);
    const foot: Point = [-0.05 + (k ? 0.25 : -0.25), G + 0.01, 0.3];
    const { length, rotation } = aim(foot, lampAt);
    const beam = add(new CylinderGeometry(0.05, 0.55, length, 16, 1, true), k ? 0xfff2c0 : 0xffb0d8, ...foot, { delay: 0.4, flat: true, noInk: true, rotation });
    const material = (beam.children[0] as Mesh).material as Material;
    material.transparent = true;
    material.opacity = 0.1;
    material.depthWrite = false;
    return beam;
  });

  // Her corner: the stool with a towel, a water bottle, a bucket, and the ringing phone.
  const [SX, SZ] = [1.3, -1.0];
  [0, 2.1, 4.2].forEach((angle, i) => limb(kit, [SX + Math.sin(angle) * 0.17, G, SZ + Math.cos(angle) * 0.17], [SX, G + 0.55, SZ], 0.022, 0.022, POST, { delay: 0.4 + i * 0.02 }));
  cylinder(0.22, 0.22, 0.05, 0x3a3f56, SX, G + 0.55, SZ, { delay: 0.46 }, 16);
  box(0.2, 0.04, 0.32, 0xe8e2d0, SX + 0.08, G + 0.6, SZ - 0.04, { delay: 0.5, rotation: [0, 0.5, 0] });
  const phone = box(0.1, 0.018, 0.18, INK, SX - 0.08, G + 0.6, SZ + 0.06, { delay: 0.52, rotation: [0, 0.3, 0] });
  const screen = decorate(phone, new BoxGeometry(0.085, 0.004, 0.16), CYAN, [[0, 0.02, 0]]);
  decorate(phone, new BoxGeometry(0.08, 0.006, 0.008), 0xf4f0e6, [[0.005, 0.023, 0.02]]);
  decorate(phone, new BoxGeometry(0.008, 0.006, 0.07), 0xf4f0e6, [[-0.02, 0.023, -0.03]]);
  const buzz = [0, 1].map((k) => add(new TorusGeometry(0.1 + k * 0.06, 0.008, 4, 20, Math.PI * 0.6).rotateZ(Math.PI * 0.2), CYAN, SX - 0.08, G + 0.7 + k * 0.02, SZ + 0.06, { delay: 0.6, flat: true, noInk: true, rotation: [0, 0.35, 0] }));
  cylinder(0.04, 0.045, 0.24, 0x2f8fb0, SX + 0.3, G, SZ + 0.25, { delay: 0.55 }, 10);
  cylinder(0.17, 0.13, 0.3, 0x5a6480, SX - 0.35, G, SZ - 0.15, { delay: 0.56 }, 14);

  // Cintura: she kicks high with her right leg, leaning away from it, the guard up.
  const facing = 0.3;
  const H = 2.55;
  const u = H / 2.4;
  const fighter = figure(kit, {
    x: -0.05,
    z: 0.25,
    y: G,
    facing,
    height: H,
    skin: 0x8a5a3c,
    hair: { style: "braids", color: 0x16141a },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "shirt", color: SUIT },
    bottom: { kind: "trousers", color: SUIT },
    shoes: SUIT,
    gloves: 0x2a2f45,
    belt: GOLD,
    arms: [
      [-0.16, 1.95, 0.32],
      [0.68, 1.55, -0.12],
    ],
    delay: 0.8,
  });
  const parts = [...fighter.parts];
  const torso = parts[7];
  decorate(torso, new BoxGeometry(0.05, 0.72, 0.02), YELLOW, [[0.03 * u, 0.4 * u, 0.265 * u, 0.55]]);
  // Yellow stripes down her forearms.
  [11, 16].forEach((index, side) => {
    const length = new Vector3(...fighter.hands[side]).distanceTo(new Vector3(...fighter.elbows[side]));
    decorate(parts[index], new BoxGeometry(0.03, length * 0.85, 0.03), YELLOW, [
      [0, length / 2, 0.1 * u],
      [0, length / 2, -0.1 * u],
    ]);
  });
  const plate = box(0.28, 0.2, 0.05, GOLD, ...fighter.at(0, 1.0 * u, 0.24 * u), { delay: 1.3, rotation: [0, facing, 0] });
  decorate(plate, new CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(Math.PI / 2), MAGENTA, [[0, 0.1, 0.03]]);
  parts.push(plate);
  // The kicking leg replaces the standing one the figure drew.
  parts.slice(0, 3).forEach((part) => (part.visible = false));
  const RL = 0.1 * u;
  const hip = fighter.at(-0.17 * u, 1.08 * u, 0);
  const knee = fighter.at(-0.6 * u, 1.42 * u, 0.12);
  const ankle = fighter.at(-1.04 * u, 1.74 * u, 0.22);
  const toe: Point = [ankle[0] + (ankle[0] - knee[0]), ankle[1] + (ankle[1] - knee[1]), ankle[2] + (ankle[2] - knee[2])];
  const kick = [
    limb(kit, hip, knee, RL * 1.25, RL * 1.12, SUIT, { delay: 1.0 }),
    limb(kit, knee, ankle, RL * 1.08, RL * 0.95, SUIT, { delay: 1.04 }),
    kit.box(0.2 * u, 0.3 * u, 0.13 * u, SUIT, ...ankle, { delay: 1.08, rotation: aim(ankle, toe).rotation }),
  ];
  [0, 1].forEach((k) => {
    const length = new Vector3(...(k ? ankle : knee)).distanceTo(new Vector3(...(k ? knee : hip)));
    decorate(kick[k], new BoxGeometry(0.035, length * 0.9, 0.035), YELLOW, [
      [0, length / 2, RL * 1.08],
      [0, length / 2, -RL * 1.08],
    ]);
  });
  // Trails of the kick sweeping up behind the foot.
  const trails = [0.95, 1.12].map((radius, k) => {
    const arc = new TorusGeometry(radius * u, 0.022, 4, 24, 0.9).rotateZ(2.68);
    arc.computeBoundingBox();
    return add(arc, k ? YELLOW : MAGENTA, hip[0], hip[1] + (arc.boundingBox?.min.y ?? 0), hip[2], { delay: 1.5 + k * 0.05, flat: true, noInk: true, rotation: [0, facing, 0] });
  });

  // Lean the whole fighter away from the kick, about her standing foot; the leg snaps from the hip.
  const root = parts[0].parent;
  const forward = new Vector3(Math.sin(facing), 0, Math.cos(facing));
  const pivot = new Vector3(...fighter.at(0.17 * u, 0, 0.03));
  const lean = new Group();
  lean.position.copy(pivot);
  root?.add(lean);
  parts.forEach((part) => {
    part.position.sub(pivot);
    lean.add(part);
  });
  const hipAt = new Vector3(...hip).sub(pivot);
  const swing = new Group();
  swing.position.copy(hipAt);
  lean.add(swing);
  [...kick, ...trails].forEach((part) => {
    part.position.sub(pivot).sub(hipAt);
    swing.add(part);
  });
  lean.quaternion.setFromAxisAngle(forward, -0.2);

  tick((t) => {
    const s = (t * 0.7) % 1;
    swing.quaternion.setFromAxisAngle(forward, s < 0.15 ? Math.sin((s / 0.15) * Math.PI) * 0.35 : 0);
    screen.color.setHex(Math.floor(t * 3) % 2 ? 0x0e3a4a : CYAN);
    beams.forEach((beam, k) => (beam.visible = Math.floor(t * 2 + k * 3) % 9 !== 4));
    buzz.forEach((arc, k) => (arc.visible = Math.floor(t * 3) % 2 === 0 && (k === 0 || Math.floor(t * 6) % 2 === 0)));
  });

  return { width: 4.9, height: 4.2, lookY: 1.45 };
}
