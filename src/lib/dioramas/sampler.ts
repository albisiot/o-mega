import { BoxGeometry, Color, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, archMouth, archedWall, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Sampler (P199): the old seamstress of the Lanterne in her tailor's shop, racks of cloaks behind
 * her and the harbour glowing through the arch. Wrapped in her rose-patterned shawl with its row of
 * big buttons, an old domino mask pushed up on her head, she sews the first hero costume on its
 * dress form, and her golden thread binds her to it. Her cane leans on the work table: she no
 * longer gets anywhere fast.
 */
export function sampler(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SHAWL = 0x4a3446;
  const ROSE = 0xd87890;
  const WOOD = 0x5e4a3a;
  const SUIT = 0x1f5a6a;
  const F = octagonBase(kit, 0x1e1a24);
  const G = floor(kit, F, 0.06, 0x3e3436, 0x2a2224, 0.3);

  // The shop's wall, the arch on the harbour at sunset.
  add(archedWall(2.8, 2.7, 0.2, { x: -0.4, half: 0.38, spring: 1.45 }), 0x2e2a3a, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  const view = add(archMouth(0.38, 1.45), ORANGE, -0.4, G, -1.88, { delay: 0.14, flat: true, noInk: true });
  decorate(view, new BoxGeometry(0.76, 0.35, 0.01), 0x3a3048, [[0, 0.5, 0.025]]);
  decorate(view, new BoxGeometry(0.12, 0.3, 0.01), 0x3a3048, [[0.12, 0.8, 0.025]]);
  decorate(view, new BoxGeometry(0.76, 0.32, 0.01), 0x0e3a4e, [[0, 0.16, 0.03]]);

  // A rack of cloaks on hangers along the side wall.
  [-1.15, 0.05].forEach((z) => box(0.05, 2.05, 0.05, 0x23222b, -1.8, G, z, { delay: 0.2 }));
  box(0.04, 0.04, 1.25, 0x23222b, -1.8, G + 2.0, -0.55, { delay: 0.22, noInk: true });
  [0x7a3a5a, 0x2f5866, 0x5a5866, 0x4a3a5a].forEach((color, k) => {
    const z = -1.0 + k * 0.3;
    add(new TorusGeometry(0.04, 0.008, 5, 10, Math.PI), 0x8a93a3, -1.8, G + 2.0, z, { delay: 0.25 + k * 0.03, noInk: true, rotation: [0, Math.PI / 2, 0] });
    add(new CylinderGeometry(0.11, 0.21, 1.05, 12).scale(0.45, 1, 1), color, -1.8, G + 0.92, z, { delay: 0.27 + k * 0.03 });
  });

  // The work table: spools, a pincushion, the scissors, a bolt of cloth, and her cane.
  const bench = table(kit, 1.25, -0.95, G, 0.3, false, WOOD, 0.8);
  void bench;
  const H = G + 0.85;
  [
    [1.0, -1.05, MAGENTA],
    [1.13, -1.12, CYAN],
    [1.05, -0.88, 0xe8e2d0],
  ].forEach(([x, z, color], i) => cylinder(0.05, 0.05, 0.13, color, x, H, z, { delay: 0.4 + i * 0.02 }, 10));
  ball(0.08, MAGENTA, 1.38, H, -0.75, { delay: 0.46 });
  add(new CylinderGeometry(0.12, 0.12, 0.6, 14).rotateZ(Math.PI / 2), 0x2f5866, 1.45, H, -1.12, { delay: 0.44 });
  [0.4, -0.4].forEach((turn) => box(0.2, 0.012, 0.025, 0x8a93a3, 1.3, H, -0.9, { delay: 0.48, noInk: true, rotation: [0, turn, 0] }));
  limb(kit, [0.78, G, -0.35], [0.86, G + 0.95, -0.52], 0.025, 0.025, 0x3a2a22, { delay: 0.5 });
  add(new TorusGeometry(0.07, 0.022, 6, 12, Math.PI), 0x3a2a22, 0.8, G + 0.94, -0.52, { delay: 0.52, rotation: [0, 0.4, 0] });

  // The dress form wearing the first costume: suit, sash, mask and a cape that stirs.
  const MX = 1.05;
  const MZ = 0.5;
  [0, 2.1, 4.2].forEach((a) => limb(kit, [MX + Math.sin(a) * 0.28, G, MZ + Math.cos(a) * 0.28], [MX, G + 0.4, MZ], 0.022, 0.022, 0x23222b, { delay: 0.5 }));
  cylinder(0.03, 0.03, 0.9, 0x23222b, MX, G + 0.4, MZ, { delay: 0.52 }, 8);
  const torso = add(new CylinderGeometry(0.29, 0.22, 0.68, 16).scale(1, 1, 0.75), SUIT, MX, G + 1.12, MZ, { delay: 0.55, rotation: [0, -0.3, 0] });
  decorate(torso, new BoxGeometry(0.08, 0.72, 0.02), MAGENTA, [[0, 0.36, 0.19, 0.55]]);
  add(new CylinderGeometry(0.22, 0.25, 0.08, 16).scale(1, 1, 0.75), MAGENTA, MX, G + 1.12, MZ, { delay: 0.57 });
  cylinder(0.06, 0.07, 0.12, 0xd8cfc0, MX, G + 1.8, MZ, { delay: 0.58 }, 10);
  const head = add(new SphereGeometry(0.15, 14, 10).scale(0.9, 1.1, 0.9), 0xd8cfc0, MX, G + 1.9, MZ, { delay: 0.6 });
  decorate(head, new BoxGeometry(0.26, 0.07, 0.04), CYAN, [[0.03, 0.18, 0.12]]);
  const capeGeometry = new CylinderGeometry(0.3, 0.5, 1.15, 16, 1, true, Math.PI / 2 + 0.2, Math.PI - 0.4).scale(1, 1, 0.6);
  const cape = add(capeGeometry, MAGENTA, MX, G + 0.65, MZ, { delay: 0.62, rotation: [0, -0.3, 0] });
  const lining = add(capeGeometry.clone().scale(-0.97, 1, 0.97), 0xb02050, MX, G + 0.65, MZ, { delay: 0.62, rotation: [0, -0.3, 0], noInk: true });
  const swing = new Group();
  swing.position.set(MX, G + 1.8, MZ);
  swing.rotation.order = "YXZ";
  swing.rotation.y = -0.3;
  cape.parent?.add(swing);
  [cape, lining].forEach((part) => {
    swing.add(part);
    part.position.set(0, -1.15, 0);
    part.rotation.set(0, 0, 0);
  });

  // Sampler, small and bent, sewing.
  const theta = 0.45;
  const lady = figure(kit, {
    x: -0.3,
    z: 0.45,
    y: G,
    facing: theta,
    height: 2.15,
    build: "slim",
    skin: 0xd8a890,
    hair: { style: "long", color: 0xc8c4c0 },
    face: { mouth: "smile", brows: "calm", marks: 0xa87860 },
    headwear: { kind: "hood", color: SHAWL },
    top: { kind: "robe", color: 0x2a2630 },
    cape: SHAWL,
    arms: [
      [-0.12, 1.5, 0.4],
      [0.18, 1.18, 0.42],
    ],
    delay: 0.9,
  });
  const at = lady.at;
  // The shawl's fronts: roses, and the row of big buttons.
  [-1, 1].forEach((side, i) => {
    const panel = box(0.17, 1.62, 0.03, SHAWL, ...at(side * 0.27, 0.12, 0.31), { delay: 1.3 + i * 0.02 });
    panel.rotation.order = "YXZ";
    panel.rotation.set(-0.08, theta, side * 0.05);
    decorate(
      panel,
      new CylinderGeometry(0.045, 0.045, 0.01, 10).rotateX(Math.PI / 2),
      ROSE,
      [0.25, 0.6, 0.95, 1.3].map((y, k) => [side * 0.02 * (k % 2 ? 1 : -1), y, 0.016] as Point),
    );
    decorate(
      panel,
      new CylinderGeometry(0.03, 0.03, 0.012, 10).rotateX(Math.PI / 2),
      0xa8a8b0,
      [0.15, 0.42, 0.78, 1.12, 1.45].map((y) => [-side * 0.06, y, 0.02] as Point),
    );
  });
  // The old mask, pushed up on her head.
  const mask = box(0.3, 0.08, 0.04, 0xc8ccd4, ...at(0, 2.07, 0.19), { delay: 1.4 });
  mask.rotation.order = "YXZ";
  mask.rotation.set(-0.35, theta, 0);
  decorate(mask, new BoxGeometry(0.07, 0.03, 0.01), 0x23222b, [
    [-0.07, 0.04, 0.021],
    [0.07, 0.04, 0.021],
  ]);
  // The needle, and the golden thread from it to the cape.
  const [needleHand] = lady.hands;
  const needle = cylinder(0.006, 0.008, 0.16, 0xd8dee8, needleHand[0], needleHand[1] + 0.02, needleHand[2], { delay: 1.45, noInk: true }, 6);
  const needleRest = needle.position.y;
  const eye: Point = [needleHand[0], needleHand[1] + 0.17, needleHand[2]];
  const hem: Point = [MX - 0.35, G + 1.0, MZ + 0.05];
  const thread = cable(kit, [eye, [(eye[0] + hem[0]) / 2, G + 1.15, (eye[2] + hem[2]) / 2 + 0.1], hem], 0.008, YELLOW, 1.5);

  const gold = new Color(YELLOW);
  const bright = new Color(0xfff6c8);
  tick((t) => {
    // Stitch after stitch: the needle goes up and down, the thread glows, the cape stirs.
    needle.position.y = needleRest + Math.abs(Math.sin(t * 2.5)) * 0.05;
    colorOf(thread).lerpColors(gold, bright, (Math.sin(t * 3) + 1) / 2);
    swing.rotation.x = Math.sin(t * 1.4) * 0.05;
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
