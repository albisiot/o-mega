import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, facade, floor, wallLantern } from "@/lib/diorama-props";

/**
 * Onorario (P196): the knife grinder who kills on written warrant, on the cobbled quay at
 * sunset, his old hand-pushed grinding cart beside him, the wet stone idly turning and dripping
 * into a pail. Leather apron, sleeves rolled: he tries his edge, as grinders do, on a sheet of
 * paper, and the paper is the warrant with your face on it; the lower half drops to the cobbles.
 */
export function onorario(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WOOD = 0x5e4a3a;
  const WOOD_DARK = 0x3e3028;
  const LEATHER = 0x6a4228;
  const PAPER = 0xe8e2d0;
  const STONE = 0x8a8a90;
  const F = octagonBase(kit, 0x1e1a24);
  const G = floor(kit, F, 0.06, 0x4a4048, 0x2e2830, 0.25);

  // The harbour at the back: water, the quay's kerb, a bollard, a moored boat and the setting sun.
  const water = new Shape();
  [
    [-1.58, 1.5],
    [0.35, 1.5],
    [0.35, 2.15],
    [-0.93, 2.15],
  ].forEach(([x, y], i) => (i ? water.lineTo(x, y) : water.moveTo(x, y)));
  water.closePath();
  add(new ExtrudeGeometry(water, { depth: 0.02, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x0e3a4e, 0, G, 0, { delay: 0.08, flat: true, noInk: true });
  box(1.95, 0.1, 0.12, 0x5d6680, -0.62, G, -1.44, { delay: 0.12 });
  bollard(kit, -1.0, -1.25, G, 0.16);
  add(new CylinderGeometry(0.42, 0.42, 0.03, 28).rotateX(Math.PI / 2), ORANGE, -0.3, G + 0.02, -2.1, { delay: 0.18, flat: true, noInk: true });
  [-0.5, -0.1, -0.3].forEach((x, k) => box(0.3 - k * 0.06, 0.006, 0.04, ORANGE, x, G + 0.022, -1.65 - k * 0.12, { delay: 0.22, flat: true, noInk: true }));
  box(0.6, 0.22, 0.28, 0x2a2238, 0.05, G, -1.78, { delay: 0.2 });
  cylinder(0.025, 0.03, 1.9, WOOD_DARK, 0.05, G + 0.2, -1.78, { delay: 0.24 }, 6);
  limb(kit, [-0.25, G + 0.55, -1.78], [0.4, G + 1.95, -1.78], 0.018, 0.018, WOOD_DARK, { delay: 0.26 });
  limb(kit, [0.05, G + 2.08, -1.78], [0.33, G + 0.22, -1.78], 0.006, 0.006, 0xd8d2c4, { delay: 0.28, noInk: true });

  // A house of the quay, its balcony and lantern.
  facade(kit, 1.2, -1.35, G, 0.2, { width: 1.1, height: 2.7, color: 0x3a3348, windows: 2, floors: 2, balcony: true, door: true });
  wallLantern(kit, 0.75, -1.2, G + 2.1, 0.3);

  // The grinding cart: frame, legs, the spoked wheel, the stone on its posts, the dripping trough.
  const CX = 1.2;
  const CZ = 0.25;
  box(0.95, 0.1, 0.5, WOOD, CX, G + 0.5, CZ, { delay: 0.4 });
  [-0.2, 0.2].forEach((dz) => box(0.06, 0.5, 0.06, WOOD_DARK, CX - 0.4, G, CZ + dz, { delay: 0.42 }));
  const wheel = add(new TorusGeometry(0.28, 0.035, 6, 24), WOOD_DARK, CX + 0.28, G, CZ + 0.3, { delay: 0.44 });
  [0, Math.PI / 3, (2 * Math.PI) / 3].forEach((angle) => decorate(wheel, new BoxGeometry(0.025, 0.56, 0.025), WOOD, [[0, 0.315, 0, angle]]));
  decorate(wheel, new CylinderGeometry(0.05, 0.05, 0.08, 10).rotateX(Math.PI / 2), WOOD_DARK, [[0, 0.315, 0]]);
  [-0.14, 0.14].forEach((dz) => box(0.06, 0.45, 0.05, WOOD_DARK, CX + 0.1, G + 0.6, CZ + dz, { delay: 0.46 }));
  box(0.5, 0.12, 0.3, 0x3a5a6a, CX + 0.1, G + 0.6, CZ, { delay: 0.48 });
  const stone = add(new CylinderGeometry(0.36, 0.36, 0.13, 24).rotateX(Math.PI / 2), STONE, CX + 0.1, G + 0.69, CZ, { delay: 0.5 });
  decorate(stone, new BoxGeometry(0.06, 0.03, 0.01), 0x5a5a60, [
    [0.2, 0.36, 0.068],
    [-0.15, 0.5, 0.068],
    [-0.1, 0.16, 0.068],
  ]);
  const spin = new Group();
  spin.position.set(CX + 0.1, G + 1.05, CZ);
  stone.parent?.add(spin);
  spin.add(stone);
  stone.position.set(0, -0.36, 0);
  cylinder(0.12, 0.1, 0.22, 0x5a6270, CX - 0.2, G, CZ + 0.42, { delay: 0.52 }, 12);
  const drop = add(new CylinderGeometry(0.02, 0.025, 0.05, 6), 0x9fe8ff, CX - 0.2, G + 0.45, CZ + 0.42, { delay: 0.6, flat: true, noInk: true });

  // Onorario, the knife in his right hand, the warrant in his left.
  const theta = 0.3;
  const turn: Point = [0, theta, 0];
  const grinder = figure(kit, {
    x: -0.6,
    z: 0.45,
    y: G,
    facing: theta,
    height: 2.45,
    skin: 0xc8946e,
    hair: { style: "short", color: 0x3a3634 },
    face: { mouth: "neutral", brows: "angry", beard: "stubble", beardColor: 0x6a6460 },
    top: { kind: "apron", color: 0xe0dcd0, accent: LEATHER, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x24232a },
    shoes: 0x1f1d22,
    arms: [
      [-0.2, 1.3, 0.53],
      [0.22, 1.5, 0.5],
    ],
    delay: 0.8,
  });
  const at = grinder.at;
  // The apron down to his knees, its straps, and the leather bracer.
  box(0.52, 0.75, 0.03, LEATHER, ...at(0, 0.36, 0.25), { delay: 1.3, rotation: turn });
  [-1, 1].forEach((side) => limb(kit, at(side * 0.17, 1.55, 0.25), at(side * 0.22, 1.8, 0.02), 0.025, 0.025, LEATHER, { delay: 1.32 }));
  const [knifeHand] = grinder.hands;
  const elbow = grinder.elbows[0];
  limb(kit, [elbow[0] + (knifeHand[0] - elbow[0]) * 0.25, elbow[1] + (knifeHand[1] - elbow[1]) * 0.25, elbow[2] + (knifeHand[2] - elbow[2]) * 0.25], [elbow[0] + (knifeHand[0] - elbow[0]) * 0.75, elbow[1] + (knifeHand[1] - elbow[1]) * 0.75, elbow[2] + (knifeHand[2] - elbow[2]) * 0.75], 0.13, 0.12, 0x3a2a22, { delay: 1.34 });
  // The knife: handle in his fist, blade across the paper.
  const knifeAt = at(-0.17, 1.29, 0.5);
  const knife = add(new BoxGeometry(0.44, 0.04, 0.008).translate(0.22, 0, 0), 0xd8dee8, ...knifeAt, { delay: 1.4, rotation: turn });
  decorate(knife, new BoxGeometry(0.14, 0.05, 0.035), 0x3a2a22, [[-0.04, 0.02, 0]]);
  // The warrant: a face, and the seal; cut in two along the blade.
  const top = box(0.34, 0.22, 0.008, PAPER, ...at(0.22, 1.31, 0.5), { delay: 1.45, rotation: turn });
  decorate(top, new CylinderGeometry(0.06, 0.06, 0.004, 16).rotateX(Math.PI / 2), 0x4a4440, [[0, 0.1, 0.005]]);
  decorate(top, new BoxGeometry(0.14, 0.045, 0.004), 0x4a4440, [[0, 0.18, 0.005]]);
  const lowAt = at(0.22, 1.05, 0.5);
  const low = box(0.34, 0.25, 0.008, PAPER, ...lowAt, { delay: 1.47, rotation: turn });
  decorate(low, new BoxGeometry(0.2, 0.1, 0.004), 0x4a4440, [[0, 0.19, 0.005]]);
  decorate(low, new CylinderGeometry(0.035, 0.035, 0.006, 14).rotateX(Math.PI / 2), MAGENTA, [[0.08, 0.06, 0.006]]);
  low.rotation.order = "YXZ";

  const dir: Point = [Math.cos(theta), 0, -Math.sin(theta)];
  tick((t) => {
    // The stone turns, dripping; the blade saws; the lower half of the warrant falls and lies on the cobbles.
    spin.rotation.z = -t * 0.8;
    drop.position.y = G + 0.45 - ((t * 0.9) % 1) * 0.2;
    const u = (t % 4) / 4;
    const saw = Math.sin(Math.min(u, 0.2) * Math.PI * 5) * 0.06;
    knife.position.set(knifeAt[0] + dir[0] * saw, knifeAt[1], knifeAt[2] + dir[2] * saw);
    const fall = Math.min(1, Math.max(0, (u - 0.2) / 0.2));
    low.position.set(lowAt[0] + dir[0] * fall * 0.15, lowAt[1] + (G + 0.01 - lowAt[1]) * fall * fall, lowAt[2] + 0.2 * fall);
    low.rotation.set(1.5 * fall, theta, 0.4 * fall);
  });

  return { width: 4.9, height: 4.4, lookY: 1.4 };
}
