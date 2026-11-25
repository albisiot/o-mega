import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry } from "three";
import { CYAN, ORANGE, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Injunction (P179): on the building site the inspector of the Soprintendenza, white hard hat and
 * grey trench coat, holds up one hand and the excavator's bucket stops in mid-air over a Roman
 * mosaic just uncovered. The mosaic still pulses with light, rings spreading from its heart: it
 * is still on. Her only weapon is the stake with the sealed notice; the beacon on the cab blinks.
 */
export function injunction(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const RED = 0xb0283e;
  const STEEL = 0x3a3c46;
  const TESSERA = 0xd8ccb4;
  const WINE = 0x8a2232;
  const F = octagonBase(kit, 0x1e1a1e);
  const G = floor(kit, F, 0.06, 0x3e3632, 0x2c2624, 0);

  // Old foundations dug out at the back, stones and earth about.
  [
    [1.05, -1.3, -0.35, 1.0],
    [1.75, -0.55, 1.2, 0.8],
    [-0.15, -1.7, 0.1, 0.7],
  ].forEach(([x, z, turn, w], i) => {
    const wall = box(w, 0.36, 0.28, 0x6a6058, x, G, z, { delay: 0.1 + i * 0.04, rotation: [0, turn, 0] });
    decorate(wall, new BoxGeometry(w, 0.012, 0.01), 0x4a423c, [[0, 0.18, 0.141]]);
  });
  rubble(kit, 1.55, 0.25, G, 0.25, 5, 0.3, 0x5a524c);
  rubble(kit, -1.2, 1.25, G, 0.3, 4, 0.3, 0x5a524c);

  // The mosaic, just uncovered, still lit from below.
  const [MX, MZ] = [-0.2, 0.35];
  add(new TorusGeometry(1.0, 0.08, 6, 40).rotateX(Math.PI / 2), 0x2a2422, MX, G, MZ, { delay: 0.15, noInk: true });
  const disc = cylinder(0.95, 0.95, 0.03, TESSERA, MX, G, MZ, { delay: 0.2 }, 40);
  const flat = (r: number, w: number) => new TorusGeometry(r, w, 4, 48).rotateX(Math.PI / 2);
  decorate(disc, flat(0.86, 0.04), WINE, [[0, 0.031, 0]]);
  decorate(disc, flat(0.64, 0.03), 0x23202a, [[0, 0.031, 0]]);
  decorate(disc, flat(0.42, 0.04), WINE, [[0, 0.031, 0]]);
  decorate(disc, new BoxGeometry(0.06, 0.006, 0.06), WINE, Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2;
    return [Math.sin(a) * 0.75, 0.032, Math.cos(a) * 0.75] as Point;
  }));
  const heart = decorate(disc, flat(0.2, 0.035), CYAN, [[0, 0.033, 0]]);
  decorate(disc, new CylinderGeometry(0.08, 0.08, 0.006, 16), CYAN, [[0, 0.033, 0]]).color = heart.color;
  const pulse = add(flat(0.2, 0.02), CYAN, MX, G + 0.04, MZ, { delay: 0.6, flat: true, noInk: true });
  motes(8, CYAN, 0.025, [MX - 0.4, G + 0.1, MZ - 0.4], [MX + 0.4, G + 1.2, MZ + 0.4], 0.8);

  // The excavator at the back, its bucket stopped over the mosaic.
  const [EX, EZ] = [-1.1, -0.85];
  const psi = Math.atan2(MX - EX, MZ - EZ);
  const local = (x: number, y: number, z: number): Point => [EX + x * Math.cos(psi) + z * Math.sin(psi), G + y, EZ - x * Math.sin(psi) + z * Math.cos(psi)];
  const turn: Point = [0, psi, 0];
  [-1, 1].forEach((side, i) => {
    const track = box(0.26, 0.26, 1.15, 0x23222b, ...local(side * 0.36, 0, 0), { delay: 0.3 + i * 0.03, rotation: turn });
    decorate(track, new BoxGeometry(0.27, 0.2, 0.025), 0x3a3a44, Array.from({ length: 7 }, (_, k) => [0, 0.13, -0.48 + k * 0.16] as Point));
  });
  box(0.8, 0.42, 0.9, RED, ...local(0, 0.26, -0.05), { delay: 0.36, rotation: turn });
  box(0.8, 0.3, 0.25, 0x8a1e30, ...local(0, 0.68, -0.38), { delay: 0.4, rotation: turn });
  const cab = box(0.4, 0.55, 0.45, RED, ...local(-0.18, 0.68, 0.12), { delay: 0.42, rotation: turn });
  decorate(cab, new BoxGeometry(0.32, 0.3, 0.01), 0x1e5a72, [[0, 0.32, 0.226]]);
  decorate(cab, new BoxGeometry(0.01, 0.3, 0.32), 0x1e5a72, [[-0.201, 0.32, 0]]);
  const beacon = cylinder(0.06, 0.06, 0.1, ORANGE, ...local(-0.18, 1.23, 0.12), { delay: 0.6, flat: true }, 10);
  const beam = (from: Point, to: Point, w: number, color: number, delay: number) => add(new BoxGeometry(w, aim(from, to).length, w * 1.2), color, ...from, { delay, rotation: aim(from, to).rotation });
  const shoulder = local(0.18, 0.75, 0.3);
  const elbow = local(0.18, 2.0, 0.95);
  const wrist = local(0.18, 0.88, 1.62);
  beam(shoulder, elbow, 0.16, RED, 0.5);
  beam(elbow, wrist, 0.13, RED, 0.55);
  limb(kit, local(0.18, 0.95, 0.42), local(0.18, 1.75, 0.82), 0.03, 0.03, 0xc8ccd4, { delay: 0.58 });
  const bucket = box(0.42, 0.3, 0.34, STEEL, wrist[0], wrist[1] - 0.36, wrist[2], { delay: 0.65, rotation: [0.3, psi, 0] });
  decorate(bucket, new ConeGeometry(0.03, 0.1, 5).rotateX(Math.PI), 0xc8ccd4, [-0.15, -0.05, 0.05, 0.15].map((x) => [x, -0.04, 0.14] as Point));

  // The stake with her sealed notice.
  const [NX, NZ] = [-1.5, 0.45];
  cylinder(0.03, 0.03, 1.15, 0x6a4e38, NX, G, NZ, { delay: 0.7 }, 8);
  const notice = box(0.48, 0.36, 0.03, 0xe8e2d0, NX, G + 0.75, NZ + 0.02, { delay: 0.75, rotation: [0, 0.35, 0] });
  decorate(notice, new BoxGeometry(0.34, 0.015, 0.01), 0x8a8478, [0.27, 0.22, 0.17].map((y) => [0, y, 0.016] as Point));
  decorate(notice, new CylinderGeometry(0.055, 0.055, 0.02, 14).rotateX(Math.PI / 2), WINE, [[0.12, 0.09, 0.02]]);

  // Injunction: one hand up to stop the bucket, the other on her satchel's strap.
  const theta = 0.2;
  const her = figure(kit, {
    x: 1.0,
    z: 0.8,
    y: G,
    facing: theta,
    height: 2.35,
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "neutral", brows: "angry" },
    headwear: { kind: "hardhat", color: 0xe8e4dc, accent: 0xd0ccc4 },
    top: { kind: "coat", color: 0x5a5a62, accent: 0x46464e },
    bottom: { kind: "trousers", color: 0x34343c },
    belt: 0x46464e,
    shoes: 0x23202a,
    arms: [
      [-0.78, 1.85, 0.3],
      [0.12, 1.42, 0.28],
    ],
    delay: 1.0,
  });
  const at = her.at;
  const [palm] = her.hands;
  // Her open hand, palm towards the bucket: stop.
  const hand = box(0.16, 0.16, 0.05, 0xd8a888, palm[0], palm[1] - 0.04, palm[2], { delay: 1.45, rotation: [0, theta - 1.0, 0] });
  decorate(hand, new BoxGeometry(0.03, 0.1, 0.04), 0xd8a888, [-0.055, -0.018, 0.018, 0.055].map((x, k) => [x, 0.2 - Math.abs(k - 1.5) * 0.015, 0] as Point));
  decorate(hand, new BoxGeometry(0.03, 0.08, 0.04), 0xd8a888, [[-0.1, 0.08, 0, 0.6]]);
  const bag = box(0.4, 0.3, 0.12, 0x2a2622, ...at(0.38, 0.8, 0.12), { delay: 1.5, rotation: [0, theta, 0] });
  decorate(bag, new BoxGeometry(0.4, 0.12, 0.01), 0x3a342e, [[0, 0.24, 0.061]]);
  decorate(bag, new BoxGeometry(0.04, 0.06, 0.012), 0xa08850, [
    [-0.1, 0.17, 0.063],
    [0.1, 0.17, 0.063],
  ]);
  limb(kit, at(0.36, 1.1, 0.14), at(0.05, 1.48, 0.28), 0.025, 0.025, 0x2a2622, { delay: 1.52 });
  limb(kit, at(0.05, 1.48, 0.28), at(-0.3, 1.78, 0.1), 0.025, 0.025, 0x2a2622, { delay: 1.54 });

  const glowFrom = heart.color.clone();
  const glowTo = heart.color.clone().offsetHSL(0, 0, 0.3);
  const rest = bucket.position.y;
  tick((t) => {
    // The mosaic's heart throbs and sends out a ring; the beacon blinks; the bucket strains.
    const beat = (t * 0.6) % 1;
    heart.color.lerpColors(glowFrom, glowTo, Math.max(0, 1 - beat * 3));
    pulse.children[0].scale.set(1 + beat * 3.6, 1, 1 + beat * 3.6);
    pulse.visible = beat < 0.85;
    beacon.visible = Math.floor(t * 2.5) % 2 === 0;
    bucket.position.y = rest + (Math.sin(t * 0.9) > 0.5 ? Math.sin(t * 40) * 0.008 : 0);
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
