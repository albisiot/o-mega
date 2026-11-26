import { BoxGeometry, Color, MeshBasicMaterial, TorusGeometry } from "three";
import { CYAN, MAGENTA, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Seppia (P335): the Lete saboteur peeling herself off a brick wall in a back alley at night. Her
 * trailing arm and leg still wear the wall, bricks, mortar and all, and the spots of her cuttlefish
 * skin ripple magenta and cyan as she takes her own colour back; the alley lantern flickers on a
 * puddle. Her price hangs over her head: she could not hack the camera, so she put a bag over it.
 */
export function seppia(kit: Kit): Framing {
  const { box, cylinder, ball, decorate, tick } = kit;
  const MORTAR = 0x2a2236;
  const BRICKS = [0x6a2a4e, 0x2a3a5e, 0x4a2a5a];
  const SUIT = 0x2c2e3a;
  const F = octagonBase(kit, 0x1c1a24);
  const G = floor(kit, F, 0.06, 0x2a2834, 0x1c1a26, 0.4);

  // The alley wall: bricks in three shades, a drainpipe, a lantern, the bagged camera.
  const WZ = -0.75;
  const wall = box(3.4, 2.7, 0.3, MORTAR, -0.1, G, WZ, { delay: 0.1, ink: 1.02 });
  const rows: Point[][] = [[], [], []];
  for (let r = 0; r < 15; r++)
    for (let c = 0; c < 11; c++) {
      const x = -1.7 + (r % 2 ? 0.17 : 0) + c * 0.34;
      if (x > 1.55) continue;
      rows[(r * 5 + c * 7) % 3].push([x + 0.17 - 0.17 * (r % 2), 0.1 + r * 0.18, 0.152]);
    }
  rows.forEach((spots, k) => decorate(wall, new BoxGeometry(0.3, 0.14, 0.01), BRICKS[k], spots));
  cylinder(0.05, 0.05, 2.7, 0x3a3f4e, -1.5, G, WZ + 0.22, { delay: 0.2 }, 10);
  const light = wallLantern(kit, 0.95, WZ + 0.15, G + 2.25, 0.3);
  puddle(kit, 0.75, 1.0, G, 0.4, 0.45, 0xffa630);
  puddle(kit, -0.9, 0.9, G, 0.45, 0.3, MAGENTA);
  // The camera on its bracket, a paper bag pulled over it.
  box(0.05, 0.05, 0.3, 0x3a3f4e, -0.95, G + 2.25, WZ + 0.3, { delay: 0.5, noInk: true });
  box(0.16, 0.14, 0.3, 0x2a2a34, -0.95, G + 2.12, WZ + 0.48, { delay: 0.55, rotation: [0.3, 0.4, 0] });
  const bag = box(0.24, 0.26, 0.24, 0xb08a5a, -0.93, G + 1.98, WZ + 0.62, { delay: 0.6, rotation: [0.3, 0.4, 0.1] });
  decorate(bag, new BoxGeometry(0.25, 0.02, 0.25), 0x8a6a40, [[0, 0.05, 0]]);
  decorate(bag, new BoxGeometry(0.06, 0.08, 0.01), 0x8a6a40, [[0.05, 0.16, 0.121, 0.4]]);

  // Seppia, stepping out of the wall.
  const sep = figure(kit, {
    x: 0.0,
    z: -0.15,
    y: G,
    facing: 0.3,
    height: 2.4,
    build: "slim",
    skin: 0xe8c4a8,
    hair: { style: "ponytail", color: 0x1a1418 },
    face: { mouth: "neutral", brows: "angry", eyes: 0x2a5a5a },
    top: { kind: "shirt", color: SUIT },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x1c1c24,
    arms: [[-0.5, 1.35, 0.55], [0.62, 1.25, -0.62]],
    legs: "stride",
    delay: 0.8,
  });

  // Her trailing arm and leg still wear the wall: brick sleeves with mortar lines.
  const spots: MeshBasicMaterial[] = [];
  const brickLimb = (from: Point, to: Point, r0: number, r1: number, delay: number) => {
    const part = limb(kit, from, to, r0, r1, BRICKS[0], { delay });
    const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const r = (r0 + r1) / 2 + 0.003;
    const lines: Point[] = [];
    for (let y = 0.09; y < length - 0.02; y += 0.1) lines.push([0, y, 0]);
    decorate(part, new TorusGeometry(r, 0.008, 4, 16).rotateX(Math.PI / 2), MORTAR, lines);
    const joints: [number, number, number][] = [];
    for (let k = 0; k * 0.1 + 0.04 < length; k++) for (let j = 0; j < 4; j++) joints.push([((j + (k % 2) * 0.5) * Math.PI) / 2, 0.04 + k * 0.1, 0]);
    decorate(part, new BoxGeometry(0.012, 0.1, 0.006), MORTAR, joints.map(([a, y]) => [Math.sin(a) * r, y, Math.cos(a) * r]));
    part.children.slice(-joints.length).forEach((mesh, k) => (mesh.rotation.y = joints[k][0]));
    // Cuttlefish spots, flickering as her skin changes.
    const dots = (
      [
        [0.4, 0.15],
        [1.2, 0.32],
        [2.3, 0.22],
        [3.4, 0.4],
        [5.2, 0.12],
      ] as [number, number][]
    ).filter(([, y]) => y < length);
    const material = decorate(part, new BoxGeometry(0.05, 0.05, 0.008), CYAN, dots.map(([a, y]) => [Math.sin(a) * (r + 0.004), y, Math.cos(a) * (r + 0.004)]));
    part.children.slice(-dots.length).forEach((mesh, k) => (mesh.rotation.y = dots[k][0]));
    spots.push(material);
    return part;
  };
  const shoulder = sep.at(0.34, 1.72, 0);
  const [elbow, hand] = [sep.elbows[1], sep.hands[1]];
  ball(0.13, BRICKS[0], shoulder[0], shoulder[1] - 0.13, shoulder[2], { delay: 1.3 });
  brickLimb(shoulder, elbow, 0.106, 0.1, 1.32);
  brickLimb(elbow, hand, 0.096, 0.09, 1.34);
  ball(0.095, BRICKS[1], hand[0], hand[1] - 0.095, hand[2], { delay: 1.36 });
  brickLimb(sep.at(0.17, 1.08, 0), sep.at(0.17, 0.59, -0.12), 0.118, 0.106, 1.38);
  brickLimb(sep.at(0.17, 0.59, -0.12), sep.at(0.17, 0.22, -0.42), 0.1, 0.09, 1.4);
  // Spots creeping up her side and onto her cheek.
  const torso = sep.parts[7];
  const patch: [number, number][] = [
    [0.06, 0.18],
    [0.16, 0.3],
    [0.1, 0.45],
    [0.2, 0.55],
    [0.04, 0.6],
    [0.22, 0.15],
    [0.14, 0.05],
  ];
  const onTorso = patch.map(([x, y]) => {
    const r = 0.25 + (0.05 * y) / 0.7;
    return [x, y, 0.72 * Math.sqrt(r * r - x * x) + 0.006] as Point;
  });
  spots.push(decorate(torso, new BoxGeometry(0.05, 0.05, 0.008), MAGENTA, onTorso));
  torso.children.slice(-onTorso.length).forEach((mesh, k) => (mesh.rotation.y = Math.atan2(onTorso[k][0], onTorso[k][2])));
  spots.push(
    decorate(sep.headPart, new BoxGeometry(0.04, 0.04, 0.01), MAGENTA, [
      [0.15, 0.2, 0.15],
      [0.12, 0.13, 0.17],
      [0.17, 0.27, 0.1],
      [0.09, 0.32, 0.17],
      [0.19, 0.12, 0.09],
    ]),
  );

  const colours = [new Color(MAGENTA), new Color(CYAN), new Color(0x9b5cff), new Color(BRICKS[0])];
  const mix = new Color();
  tick((t) => {
    // Waves of colour run over her skin; the lantern sputters.
    spots.forEach((material, k) => {
      const v = (t * 0.8 + k * 0.37) % 1;
      const i = Math.floor(v * colours.length);
      material.color.copy(mix.lerpColors(colours[i], colours[(i + 1) % colours.length], (v * colours.length) % 1));
    });
    light.visible = Math.floor(t * 6) % 17 !== 9;
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
