import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Path, Shape, SphereGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, archMouth, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, ring } from "@/lib/diorama-props";

/**
 * Interpres (P165): in the machine hall of the power plant the translator of the Custodi, grey
 * robe, gold disc collar and halo, holds two red ribbons: one is plugged into an old boiler
 * with a face of gauges, the other a puzzled engineer holds to his ear. The machine's lamp
 * blinks yes, but its gauges droop and it sighs steam: in its language yes means no choice.
 */
export function interpres(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x2e3440;
  const STEEL_DARK = 0x22262f;
  const RIBBON = 0xd8203c;
  const GOLD = 0xe0b030;
  const F = octagonBase(kit, 0x1e1c26);
  const G = floor(kit, F, 0.06, 0x2e3240, 0x20232e, 0.5);

  // The machine: a boiler with gauge eyes and a grille mouth, its socket on the side.
  const MX = -1.25;
  const MZ = -0.85;
  const body = box(1.3, 2.2, 0.9, STEEL, MX, G, MZ, { delay: 0.1 });
  decorate(body, new CylinderGeometry(0.2, 0.2, 0.03, 18).rotateX(Math.PI / 2), 0xe8e2d0, [
    [-0.3, 1.6, 0.46],
    [0.3, 1.6, 0.46],
  ]);
  decorate(body, new BoxGeometry(0.7, 0.05, 0.02), INK, [0.85, 0.97, 1.09].map((y) => [0, y, 0.455] as Point));
  decorate(
    body,
    new SphereGeometry(0.045, 8, 6),
    MAGENTA,
    [-0.5, -0.35, 0.35, 0.5].map((x) => [x, 0.45, 0.45] as Point),
  );
  decorate(body, new BoxGeometry(1.32, 0.06, 0.92), 0x3a4252, [
    [0, 0.25, 0],
    [0, 2.0, 0],
  ]);
  const needles = [-0.3, 0.3].map((dx, i) => box(0.025, 0.16, 0.01, INK, MX + dx, G + 1.6, MZ + 0.49, { delay: 0.5 + i * 0.03, flat: true, noInk: true }));
  const yes = ball(0.14, CYAN, MX, G + 2.2, MZ + 0.1, { delay: 0.4, flat: true });
  cylinder(0.05, 0.05, 0.35, STEEL_DARK, MX + 0.42, G + 2.2, MZ - 0.2, { delay: 0.42 }, 8);
  cylinder(0.08, 0.06, 0.1, 0x9aa0ab, MX + 0.42, G + 2.55, MZ - 0.2, { delay: 0.44 }, 8);
  const socket = box(0.06, 0.22, 0.22, STEEL_DARK, MX + 0.66, G + 0.95, MZ + 0.15, { delay: 0.46 });
  decorate(socket, new SphereGeometry(0.05, 8, 6), CYAN, [[0.03, 0.11, 0]]);
  const steam = [0, 1, 2].map((k) => ball(0.12, 0xd8e0e8, MX + 0.42, G + 2.65, MZ - 0.2, { delay: 0.6 + k * 0.05, flat: true, noInk: true }));

  // The hall: a back wall with tall windows, a pipe along it, a console of dials and lamps.
  const hall = box(2.6, 3.0, 0.2, 0x262a36, 0, G, -1.8, { delay: 0.05, ink: 1.02 });
  decorate(hall, archMouth(0.3, 1.5), 0x1f4a66, [
    [-0.75, 0.9, 0.101],
    [0.75, 0.9, 0.101],
  ]);
  decorate(hall, new BoxGeometry(0.6, 0.02, 0.01), 0x262a36, [
    [-0.75, 1.5, 0.125],
    [0.75, 1.5, 0.125],
  ]);
  add(new CylinderGeometry(0.12, 0.12, 2.6, 12).rotateZ(Math.PI / 2), 0x3a4252, 0, G + 2.55, -1.58, { delay: 0.2 });
  const console = box(1.0, 1.1, 0.5, STEEL_DARK, 1.2, G, -1.1, { delay: 0.25, rotation: [0, -0.3, 0] });
  decorate(console, new CylinderGeometry(0.1, 0.1, 0.02, 14).rotateX(Math.PI / 2), 0xe8e2d0, [
    [-0.25, 0.8, 0.26],
    [0.2, 0.8, 0.26],
  ]);
  decorate(console, new SphereGeometry(0.035, 8, 6), MAGENTA, [
    [-0.3, 0.45, 0.26],
    [-0.1, 0.45, 0.26],
    [0.3, 0.45, 0.26],
  ]);
  decorate(console, new SphereGeometry(0.035, 8, 6), CYAN, [[0.1, 0.45, 0.26]]);

  // Interpres in the middle, the gold disc round her neck and the halo behind her head.
  const theta = 0.3;
  const speaker = figure(kit, {
    x: 0.05,
    z: 0.3,
    y: G,
    facing: theta,
    height: 2.4,
    skin: 0xe0b898,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "neutral", brows: "calm", marks: 0xc09070 },
    top: { kind: "robe", color: 0x9a9aa2 },
    shoes: 0x2a2622,
    gloves: 0x1f1d24,
    arms: [
      [-0.45, 1.15, 0.3],
      [0.42, 1.15, 0.3],
    ],
    delay: 0.8,
  });
  const disc = new Shape().absarc(0, 0, 0.6, 0, Math.PI * 2, false);
  disc.holes.push(new Path().absarc(0, 0, 0.13, 0, Math.PI * 2, true));
  const collar = add(new ExtrudeGeometry(disc, { depth: 0.03, bevelEnabled: false, curveSegments: 32 }).rotateX(-Math.PI / 2), GOLD, ...speaker.at(0, 1.86, 0.02), {
    delay: 1.3,
    ink: 1.02,
  });
  collar.rotation.order = "YXZ";
  collar.rotation.set(0.42, theta, 0);
  const halo = ring(kit, speaker.at(0, speaker.head[1] - G - 0.37, -0.16), 0.34, YELLOW, 1.4, true);
  halo.rotation.y = theta;

  // The engineer, a ribbon to his ear, his clipboard of questions.
  const engineer = figure(kit, {
    x: 1.4,
    z: 0.6,
    y: G,
    facing: -0.95,
    height: 2.05,
    build: "heavy",
    skin: 0xc48a66,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "raised", beard: "moustache" },
    headwear: { kind: "hardhat", color: YELLOW },
    top: { kind: "uniform", color: 0x23404b, accent: 0x9aa0ab },
    bottom: { kind: "trousers", color: 0x23404b },
    shoes: 0x2a2622,
    arms: [[-0.3, 1.82, 0.02], [0.28, 1.15, 0.32]],
    delay: 1.0,
  });
  const [earHand, padHand] = engineer.hands;
  box(0.26, 0.34, 0.03, 0xd8d2c4, padHand[0], padHand[1] - 0.12, padHand[2], { delay: 1.5, rotation: [-0.4, -0.95, 0] });

  // The ribbons: one into the machine, one to the engineer, and their loose ends.
  const [right, left] = speaker.hands;
  cable(kit, [right, [-0.55, G + 0.55, 0.0], [MX + 0.72, G + 1.06, MZ + 0.15]], 0.022, RIBBON, 1.6);
  cable(kit, [left, [0.8, G + 0.6, 0.6], [1.15, G + 1.2, 0.75], earHand], 0.022, RIBBON, 1.65);
  cable(kit, [right, [right[0] - 0.05, G + 0.6, right[2] + 0.12], [right[0] + 0.05, G + 0.12, right[2] + 0.2]], 0.02, RIBBON, 1.7);
  cable(kit, [left, [left[0] + 0.05, G + 0.65, left[2] + 0.1], [left[0], G + 0.15, left[2] + 0.22]], 0.02, RIBBON, 1.72);

  const steamFrom: Point = [MX + 0.42, G + 2.62, MZ - 0.2];
  tick((t) => {
    // The lamp blinks its yes; the gauges sag; steam sighs out of the valve.
    yes.visible = Math.floor(t * 2.2) % 3 !== 2;
    needles.forEach((needle, i) => (needle.rotation.z = (i ? -1 : 1) * (1.9 + Math.sin(t * 0.8 + i) * 0.25)));
    steam.forEach((puff, k) => {
      const u = (t * 0.45 + k / 3) % 1;
      puff.position.set(steamFrom[0] + u * 0.45, steamFrom[1] + u * 0.7, steamFrom[2] + u * 0.35);
      puff.children[0].scale.setScalar(0.5 + u);
      puff.visible = u < 0.9;
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
