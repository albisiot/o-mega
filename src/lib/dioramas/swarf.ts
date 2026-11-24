import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry, type Group } from "three";
import { INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Swarf (P036): the robot maker of the Compagnia in his workshop, smirking, a remote raised in
 * one hand. His grinning flying robot hovers at his shoulder with its rotor spinning and magenta
 * eyes, an industrial arm opens and closes its claw behind him and a half-built robot head waits
 * on the bench. Nothing here is quiet: an orange beacon turns on the arm, so he is never hidden.
 */
export function swarf(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x2a3440;
  const TEAL = 0x2f5a6a;
  const BOT = 0x2a3a4a;
  const TEETH = 0xf0ece0;
  const F = octagonBase(kit, 0x1a1c24);
  const G = floor(kit, F, 0.06, 0x2a2e38, 0x1c2028, 0.6);

  // A pegboard of tools at the back.
  const wall = box(3.2, 2.3, 0.1, 0x2a2430, -0.1, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.025, 0.025, 0.01), 0x1a1620, Array.from({ length: 60 }, (_, k) => [-1.45 + (k % 12) * 0.26, 0.4 + Math.floor(k / 12) * 0.38, 0.051] as Point));
  decorate(wall, new BoxGeometry(0.06, 0.5, 0.02), 0x8a93a3, [[-1.2, 1.4, 0.06, 0.3], [-0.95, 1.45, 0.06, -0.2], [-0.4, 1.5, 0.06, 0]]);
  decorate(wall, new TorusGeometry(0.16, 0.035, 6, 16), 0xa07a30, [[-1.35, 1.95, 0.07]]);

  // The industrial arm, reaching over the floor with its claw; a beacon turns on its base.
  const AX = 1.2;
  const AZ = -0.95;
  cylinder(0.38, 0.42, 0.25, STEEL, AX, G, AZ, { delay: 0.2 }, 16);
  cylinder(0.22, 0.27, 0.42, TEAL, AX, G + 0.25, AZ, { delay: 0.24 }, 14);
  const shoulder: Point = [AX, G + 0.8, AZ];
  const elbow: Point = [AX - 0.1, G + 2.1, AZ + 0.15];
  const wrist: Point = [0.75, G + 2.35, -0.45];
  ball(0.18, STEEL, shoulder[0], shoulder[1] - 0.18, shoulder[2], { delay: 0.28 });
  limb(kit, shoulder, elbow, 0.12, 0.1, TEAL, { delay: 0.32 });
  ball(0.14, STEEL, elbow[0], elbow[1] - 0.14, elbow[2], { delay: 0.36 });
  limb(kit, elbow, wrist, 0.09, 0.08, TEAL, { delay: 0.4 });
  ball(0.1, STEEL, wrist[0], wrist[1] - 0.12, wrist[2], { delay: 0.44 });
  const FINGER = 0.3;
  const fingers = [-1, 1].map((side) => ({ side, part: box(0.05, FINGER, 0.08, 0x8a93a3, wrist[0] + side * 0.07, wrist[1] - 0.1 - FINGER, wrist[2], { delay: 0.48 }) }));
  cylinder(0.08, 0.08, 0.12, ORANGE, AX + 0.25, G + 0.25, AZ + 0.2, { delay: 0.5, flat: true }, 12);
  const beam = box(0.42, 0.04, 0.04, 0xffc060, AX + 0.25, G + 0.31, AZ + 0.2, { delay: 0.55, flat: true, noInk: true });

  // The bench, with a robot head half built and a few tools.
  table(kit, -1.2, -0.55, G, 0.3, false, 0x3a3440, 0.78);
  const T = G + 0.83;
  const head = box(0.32, 0.28, 0.3, BOT, -1.25, T, -0.5, { delay: 0.6, rotation: [0, 0.4, 0] });
  decorate(head, new BoxGeometry(0.07, 0.07, 0.01), MAGENTA, [[-0.07, 0.18, 0.151], [0.07, 0.18, 0.151]]);
  decorate(head, new ConeGeometry(0.02, 0.05, 4).rotateX(Math.PI), TEETH, [-0.09, -0.03, 0.03, 0.09].map((x) => [x, 0.07, 0.152] as Point));
  box(0.32, 0.03, 0.06, 0x8a93a3, -0.95, T, -0.35, { delay: 0.64, rotation: [0, -0.5, 0] });
  cylinder(0.02, 0.02, 0.3, 0xa07a30, -1.5, T + 0.02, -0.4, { delay: 0.66, rotation: [Math.PI / 2, 0, 0.6] }, 6);

  // The flying robot: a round body, glowing eyes, a grin of teeth, a drill, claws and a rotor.
  const D: Point = [-0.95, G + 2.1, 0.25];
  const drone: Group[] = [];
  const body = ball(0.25, BOT, D[0], D[1], D[2], { delay: 1.2, rotation: [0, 0.35, 0] });
  decorate(body, new TorusGeometry(0.07, 0.018, 6, 14), INK, [[-0.09, 0.3, 0.25], [0.09, 0.3, 0.25]]);
  decorate(body, new CylinderGeometry(0.06, 0.06, 0.02, 12).rotateX(Math.PI / 2), MAGENTA, [[-0.09, 0.3, 0.255], [0.09, 0.3, 0.255]]);
  decorate(body, new ConeGeometry(0.022, 0.06, 4).rotateX(Math.PI), TEETH, [-0.11, -0.055, 0, 0.055, 0.11].map((x) => [x, 0.17, Math.sqrt(0.0561 - x * x) + 0.01] as Point));
  drone.push(body);
  drone.push(add(new ConeGeometry(0.08, 0.2, 8).rotateX(Math.PI), 0x8a93a3, D[0], D[1] - 0.17, D[2], { delay: 1.25 }));
  drone.push(cylinder(0.025, 0.025, 0.14, STEEL, D[0], D[1] + 0.48, D[2], { delay: 1.28 }, 6));
  const rotor = box(0.95, 0.02, 0.09, MAGENTA, D[0], D[1] + 0.62, D[2], { delay: 1.32, flat: true, noInk: true });
  drone.push(rotor);
  [-1, 1].forEach((side) => {
    const from: Point = [D[0] + side * 0.2, D[1] + 0.15, D[2]];
    const to: Point = [D[0] + side * 0.36, D[1] - 0.15, D[2] + 0.08];
    drone.push(limb(kit, from, to, 0.03, 0.025, STEEL, { delay: 1.3 }));
    drone.push(add(new TorusGeometry(0.06, 0.02, 6, 10, Math.PI * 1.4), 0x8a93a3, to[0], to[1] - 0.1, to[2], { delay: 1.34, rotation: [0, 0, side * 2.4] }));
  });

  // Swarf: blond slicked hair, black shirt, a dark apron, the remote held up.
  const maker = figure(kit, {
    x: 0.2,
    z: 0.35,
    y: G,
    facing: 0.25,
    height: 2.45,
    skin: 0xe0c4a8,
    hair: { style: "short", color: 0xe6cf7a },
    face: { mouth: "smirk", brows: "angry" },
    top: { kind: "apron", color: 0x1c1e28, accent: 0x4a2a3e, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x23252e },
    shoes: 0x15151a,
    arms: [[-0.5, 1.72, 0.38], "hip"],
    delay: 0.8,
  });
  // His slicked blond hair (the figure's own cap sits too low and lets the scalp show).
  const RH = maker.headRadius;
  ball(RH * 1.03, 0xe6cf7a, ...maker.at(0.02, maker.head[1] - G + RH * 0.16 - RH * 1.03, -RH * 0.15), { delay: 1.2 });
  const [hand] = maker.hands;
  const remote = box(0.12, 0.26, 0.07, 0x2a2a34, hand[0], hand[1] - 0.1, hand[2] + 0.05, { delay: 1.4 });
  decorate(remote, new CylinderGeometry(0.025, 0.025, 0.02, 10).rotateX(Math.PI / 2), MAGENTA, [[0, 0.19, 0.04]]);
  decorate(remote, new BoxGeometry(0.06, 0.03, 0.01), 0x8a93a3, [[0, 0.1, 0.036]]);
  cylinder(0.008, 0.012, 0.32, 0x8a93a3, hand[0] + 0.03, hand[1] + 0.16, hand[2] + 0.05, { delay: 1.45, rotation: [0, 0, -0.3] }, 5);
  const tip = ball(0.04, MAGENTA, hand[0] + 0.125, hand[1] + 0.44, hand[2] + 0.05, { delay: 1.5, flat: true });

  const rest = drone.map((part) => part.position.y);
  tick((t) => {
    const hover = Math.sin(t * 2) * 0.06;
    drone.forEach((part, i) => (part.position.y = rest[i] + hover));
    rotor.rotation.y = t * 18;
    body.rotation.y = 0.35 + Math.sin(t * 0.7) * 0.25;
    beam.rotation.y = t * 4;
    const open = 0.12 + Math.max(0, Math.sin(t * 1.1)) * 0.35;
    for (const { side, part } of fingers) {
      const a = side * open;
      part.rotation.z = a;
      part.position.set(wrist[0] + side * 0.07 + FINGER * Math.sin(a), wrist[1] - 0.1 - FINGER * Math.cos(a), wrist[2]);
    }
    tip.visible = Math.floor(t * 3) % 2 === 0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
