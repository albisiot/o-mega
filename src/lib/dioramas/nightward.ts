import { BoxGeometry, ConeGeometry, CylinderGeometry, Mesh, MeshBasicMaterial, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle, table, wallLantern } from "@/lib/diorama-props";

/**
 * Nightward (P038): the investigator of the Custodi kneeling on a wet street in the rain outside
 * a shuttered café, her torch on the trail of footprints that ends at a manhole. She has found
 * the culprit's way out but can't lift the cover: her crowbar is wedged under it and it has
 * barely moved. Behind her back, on the café table, a coffee steams that she never notices.
 */
export function nightward(kit: Kit): Framing {
  const { add, box, ball, cylinder, decorate, tick, motes } = kit;
  const WALL = 0x28323e;
  const AWNING = 0x1f5a66;
  const F = octagonBase(kit, 0x182028);
  const G = floor(kit, F, 0.06, 0x232e3a, 0x18202a, 0.3);

  // The café: a shutter pulled down, a scalloped awning, a lit window upstairs, a lantern.
  const wall = box(3.2, 2.9, 0.2, WALL, 0, G, -1.45, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.4, 0.45, 0.01), YELLOW, [[0.45, 2.35, 0.101]]);
  decorate(wall, new BoxGeometry(0.4, 0.45, 0.01), 0x141a26, [[-0.75, 2.35, 0.101]]);
  decorate(wall, new BoxGeometry(0.5, 1.4, 0.01), 0x1a222c, [[-0.95, 0.7, 0.101]]);
  const shutter = box(1.5, 1.35, 0.04, 0x4a5868, 0.45, G, -1.33, { delay: 0.16 });
  decorate(shutter, new BoxGeometry(1.5, 0.015, 0.01), 0x33404f, Array.from({ length: 9 }, (_, k) => [0, 0.12 + k * 0.14, 0.021] as Point));
  box(1.9, 0.04, 0.65, AWNING, 0.45, G + 1.62, -1.1, { delay: 0.2, rotation: [0.35, 0, 0] });
  const scallops = box(1.9, 0.12, 0.02, AWNING, 0.45, G + 1.42, -0.8, { delay: 0.24 });
  decorate(scallops, new CylinderGeometry(0.1, 0.1, 0.02, 12, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), AWNING, Array.from({ length: 9 }, (_, k) => [-0.84 + k * 0.21, 0.0, 0] as Point));
  decorate(scallops, new BoxGeometry(1.9, 0.025, 0.01), 0xd8d2c4, [[0, 0.08, 0.011]]);
  const light = wallLantern(kit, -1.3, -1.35, G + 2.0, 0.3, YELLOW);

  // The café table behind her, with the coffee she won't drink, and two chairs.
  table(kit, -1.15, -0.45, G, 0.3, true, 0x3a4250, 0.7);
  const T = G + 0.74;
  cylinder(0.1, 0.1, 0.015, 0xe8e2d0, -1.05, T, -0.35, { delay: 0.5 }, 16);
  cylinder(0.055, 0.045, 0.09, 0xf4f0e6, -1.05, T + 0.015, -0.35, { delay: 0.52 }, 14);
  add(new TorusGeometry(0.03, 0.01, 6, 10), 0xf4f0e6, -0.99, T + 0.04, -0.35, { delay: 0.54, noInk: true });
  motes(5, 0xe8eef4, 0.025, [-1.1, T + 0.12, -0.38], [-1.0, T + 0.6, -0.32], 0.9);
  [[-1.65, -0.2, 1.2], [-0.95, -1.0, 0.2]].forEach(([x, z, turn], i) => {
    const d = 0.6 + i * 0.04;
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.03, 0.42, 0.03, 0x23222b, x + sx * 0.15, G, z + sz * 0.15, { delay: d, noInk: true })));
    box(0.36, 0.04, 0.36, 0x3a4250, x, G + 0.42, z, { delay: d + 0.02, rotation: [0, turn, 0] });
    const back = Math.PI + turn;
    box(0.36, 0.4, 0.03, 0x3a4250, x + Math.sin(back) * 0.17, G + 0.46, z + Math.cos(back) * 0.17, { delay: d + 0.04, rotation: [0, turn, 0] });
  });

  // The trail: wet footprints from the shutter to the manhole, its cover barely lifted on a crowbar.
  const M: Point = [0.75, G, 1.25];
  [[0.5, -1.0], [0.62, -0.55], [0.5, -0.12], [0.72, 0.3], [0.6, 0.72]].forEach(([x, z], i) =>
    add(new CylinderGeometry(0.07, 0.07, 0.006, 10).scale(1, 1, 1.8), 0x6a8a9a, x + (i % 2 ? 0.06 : -0.06), G, z, { delay: 0.6 + i * 0.04, flat: true, noInk: true, rotation: [0, 0.2, 0] }),
  );
  const cover = cylinder(0.34, 0.34, 0.05, 0x30343c, M[0], G - 0.02, M[2], { delay: 0.5, rotation: [0, 0, 0.12] }, 20);
  decorate(cover, new BoxGeometry(0.5, 0.01, 0.025), 0x4a505c, [-0.16, -0.05, 0.05, 0.16].map((z) => [0, 0.052, z] as Point));
  limb(kit, [M[0] + 0.3, G + 0.04, M[2] - 0.05], [M[0] + 0.75, G + 0.42, M[2] - 0.2], 0.022, 0.022, 0x8a93a3, { delay: 0.6 });
  puddle(kit, -0.55, 1.2, G, 0.4, 0.38, MAGENTA);
  puddle(kit, 1.3, -0.3, G, 0.45, 0.3, CYAN);

  // Nightward: kneeling in her trench coat, dark hair in a low bun, the torch in her hand.
  const detective = figure(kit, {
    x: -0.05,
    z: 0.25,
    y: G,
    facing: 0.6,
    height: 2.35,
    build: "slim",
    skin: 0xe0b898,
    hair: { style: "bun", color: 0x241c22 },
    face: { mouth: "neutral", brows: "worried" },
    top: { kind: "jacket", color: 0x1e4a56, accent: 0x2a5e6a },
    cape: 0x1a424c,
    bottom: { kind: "trousers", color: 0x1a1e28 },
    shoes: 0x15151a,
    scarf: 0x15161f,
    arms: [[-0.12, 1.12, 0.52], [0.2, 0.66, 0.44]],
    legs: "kneel",
    delay: 0.8,
  });
  // Her dark hair over the crown (the figure's own cap sits too low and lets the scalp show).
  const RH = detective.headRadius;
  ball(RH * 1.05, 0x241c22, ...detective.at(0, detective.head[1] - G + RH * 0.12 - RH * 1.05, -RH * 0.15), { delay: 1.2 });
  const [hand] = detective.hands;
  const target: Point = [M[0] - 0.05, G + 0.02, M[2] - 0.1];
  const { length } = aim(hand, target);
  const along = (k: number): Point => [hand[0] + ((target[0] - hand[0]) * k) / length, hand[1] + ((target[1] - hand[1]) * k) / length, hand[2] + ((target[2] - hand[2]) * k) / length];
  limb(kit, along(-0.06), along(0.16), 0.045, 0.05, 0x23222b, { delay: 1.4 });
  const lens = along(0.17);
  cylinder(0.052, 0.052, 0.01, YELLOW, lens[0], lens[1], lens[2], { delay: 1.45, flat: true, noInk: true, rotation: aim(hand, target).rotation });
  const beam = add(new ConeGeometry(0.32, length - 0.17, 18, 1, true), 0xfff0a0, ...target, { delay: 1.5, flat: true, noInk: true, rotation: aim(target, lens).rotation });
  const glass = (beam.children[0] as Mesh).material as MeshBasicMaterial;
  glass.transparent = true;
  glass.opacity = 0.3;
  glass.depthWrite = false;

  // The rain.
  const rain = add(new BoxGeometry(0.001, 0.001, 0.001), 0x9fc8e0, 0, G, 0, { delay: 0.2, flat: true, noInk: true });
  const drops: Point[] = Array.from({ length: 40 }, (_, k) => {
    const a = k * 2.4;
    const r = 0.3 + (((k * 37) % 19) / 19) * 1.85;
    return [Math.cos(a) * r, (k * 0.53) % 3.6, Math.sin(a) * r];
  });
  decorate(rain, new BoxGeometry(0.012, 0.25, 0.012), 0x9fc8e0, drops);
  const streaks = rain.children.slice(1);

  tick((t) => {
    streaks.forEach((mesh, k) => (mesh.position.y = 3.85 - ((drops[k][1] + t * 3.2) % 3.6)));
    light.visible = Math.floor(t * 6) % 21 !== 9;
    beam.visible = Math.floor(t * 8) % 37 !== 20;
  });

  return { width: 4.9, height: 4.4, lookY: 1.4 };
}
