import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, lamp, puddle, skyline } from "@/lib/diorama-props";

/**
 * Blotter (P150): the crime reporter on the night quay, camel trench coat and long red scarf
 * whipping in the wind, stands in front of the police tape with her old bellows camera raised
 * at us. Behind her, a chalk outline on the wet stones, a dropped hat, boats' masts and the old
 * town over the water; the flash goes off in our face: what do you remember too well?
 */
export function blotter(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const CHALK = 0xe8f0f4;
  const COAT = 0x9a6a3a;
  const SCARF = 0xb8203a;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x2c2a38, 0x1c1a24, 0.3);

  // The water behind the quay's kerb, two boats' masts, the old town on the far shore.
  const water = new Shape();
  water.moveTo(-1.88, 1.2);
  water.lineTo(1.88, 1.2);
  water.lineTo(0.9, 2.18);
  water.lineTo(-0.9, 2.18);
  water.closePath();
  add(new ExtrudeGeometry(water, { depth: 0.02, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x14303f, 0, G, 0, { delay: 0.08, flat: true, noInk: true });
  box(3.76, 0.1, 0.14, 0x5d6680, 0, G, -1.2, { delay: 0.1 });
  skyline(kit, -2.1, G, 0.12, [0x2a2f4a, 0x3a2a4a, 0x22344a], -0.85, 0.85);
  [
    [-0.55, -1.65, 2.3],
    [0.55, -1.85, 1.9],
  ].forEach(([x, z, h], i) => {
    box(0.7, 0.18, 0.26, i ? 0x2f5866 : 0x3a2f4e, x, G, z, { delay: 0.2 + i * 0.05 });
    cylinder(0.022, 0.03, h, 0x8a93a3, x, G + 0.18, z, { delay: 0.25 + i * 0.05 }, 6);
    box(0.5, 0.025, 0.025, 0x8a93a3, x, G + h * 0.75, z, { delay: 0.28 + i * 0.05, noInk: true });
  });

  // The crime scene: a lamp, a post, the striped tape between them, the chalk outline, a hat.
  const light = lamp(kit, 1.55, -0.55, G, 0.3, 2.3);
  cylinder(0.04, 0.05, 1.0, 0x2a2a34, -1.6, G, -0.25, { delay: 0.35 }, 8);
  ball(0.06, MAGENTA, -1.6, G + 1.0, -0.25, { delay: 0.37 });
  const from: Point = [-1.6, G + 0.92, -0.25];
  const to: Point = [1.52, G + 0.95, -0.55];
  const tape: Group[] = [];
  const n = 14;
  for (let k = 0; k < n; k++) {
    const point = (u: number): Point => [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u - Math.sin(u * Math.PI) * 0.22, from[2] + (to[2] - from[2]) * u];
    const a = point(k / n);
    const b = point((k + 1) / n);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const piece = box(length + 0.01, 0.07, 0.01, k % 2 ? CHALK : MAGENTA, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.035, (a[2] + b[2]) / 2, { delay: 0.4 + k * 0.015, noInk: true });
    piece.rotation.order = "YXZ";
    piece.rotation.set(0, Math.atan2(-(b[2] - a[2]), b[0] - a[0]), Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])));
    tape.push(piece);
  }
  const OX = 0.65;
  const OZ = -0.7;
  const outline = add(new BoxGeometry(0.001, 0.001, 0.001), CHALK, OX, G, OZ, { delay: 0.5, flat: true, noInk: true });
  decorate(outline, new TorusGeometry(0.13, 0.018, 6, 20).rotateX(Math.PI / 2), CHALK, [[-0.55, 0.004, -0.05]]);
  decorate(outline, new BoxGeometry(0.03, 0.004, 0.36), CHALK, [
    [-0.25, 0.004, -0.15, 0],
    [-0.25, 0.004, 0.13, 0],
  ]);
  const lines: [number, number, number, number][] = [
    [-0.08, -0.17, 0.4, 0.2],
    [-0.08, 0.15, 0.4, -0.3],
    [0.28, -0.1, 0.45, 0.15],
    [0.28, 0.1, 0.45, -0.25],
    [-0.35, -0.3, 0.3, 0.9],
    [-0.3, 0.3, 0.32, -1.1],
  ];
  lines.forEach(([x, z, length, turn]) => {
    box(length, 0.006, 0.03, CHALK, OX + x, G + 0.002, OZ + z, { delay: 0.52, flat: true, noInk: true, rotation: [0, turn, 0] });
  });
  cylinder(0.2, 0.2, 0.025, 0x3a3040, -0.3, G, -0.65, { delay: 0.55 }, 16);
  cylinder(0.11, 0.12, 0.1, 0x3a3040, -0.3, G + 0.02, -0.65, { delay: 0.56 }, 14);
  box(0.1, 0.12, 0.08, YELLOW, 1.2, G, -0.95, { delay: 0.58, rotation: [0, 0.5, 0] });
  puddle(kit, -0.9, 0.9, G, 0.5, 0.45, CYAN);
  puddle(kit, 1.0, 1.1, G, 0.55, 0.32, MAGENTA);

  // Blotter, camera up at us; her scarf blowing.
  const facing = 0.3;
  const reporter = figure(kit, {
    x: -0.3,
    z: 0.6,
    y: G,
    facing,
    height: 2.4,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "wild", color: 0x3a2018 },
    face: { mouth: "neutral", brows: "angry", marks: 0xb07050 },
    top: { kind: "coat", color: COAT, accent: 0x2a2a30 },
    bottom: { kind: "trousers", color: 0x3a3040 },
    shoes: 0x23222b,
    scarf: SCARF,
    arms: [[-0.14, 1.48, 0.38], [0.14, 1.48, 0.38]],
    delay: 0.8,
  });
  const at = reporter.at;
  const turn: Point = [0, facing, 0];
  const body = box(0.28, 0.2, 0.14, 0x1a1a22, ...at(0, 1.42, 0.44), { delay: 1.3, rotation: turn });
  decorate(body, new BoxGeometry(0.06, 0.04, 0.01), 0x8a93a3, [[-0.08, 0.16, 0.071]]);
  const bellows = box(0.2, 0.18, 0.14, 0x2a2a30, ...at(0, 1.43, 0.58), { delay: 1.35, rotation: turn });
  decorate(bellows, new BoxGeometry(0.205, 0.012, 0.012), 0x4a4a54, [0, 1, 2, 3].map((k) => [0, 0.03 + k * 0.04, 0.03] as Point));
  add(new CylinderGeometry(0.06, 0.07, 0.08, 14).rotateX(Math.PI / 2), 0x1a1a22, ...at(0, 1.46, 0.69), { delay: 1.4, rotation: turn });
  add(new CylinderGeometry(0.045, 0.045, 0.01, 14).rotateX(Math.PI / 2), 0x3a6a8a, ...at(0, 1.475, 0.735), { delay: 1.42, flat: true, noInk: true, rotation: turn });
  add(new CylinderGeometry(0.14, 0.04, 0.08, 16).rotateX(-Math.PI / 2), 0xc8ccd4, ...at(0.2, 1.62, 0.5), { delay: 1.45, rotation: turn });
  const flash = add(new CylinderGeometry(0.3, 0.3, 0.01, 20).rotateX(Math.PI / 2), 0xffffff, ...at(0.2, 1.48, 0.56), { delay: 1.5, flat: true, noInk: true, rotation: turn });
  decorate(flash, new BoxGeometry(0.04, 0.9, 0.01), 0xfff4c0, [0, 1, 2, 3].map((k) => [0, 0.3, 0.01, (k * Math.PI) / 4] as [number, number, number, number]));
  // The scarf's two tails, streaming out to her left.
  const neck = at(0.08, 1.8, 0.16);
  const tails = [0, 1].map((k) => {
    const pivot = new Group();
    pivot.position.set(...neck);
    const tail = box(0.09, 1.0 - k * 0.18, 0.025, SCARF, ...neck, { delay: 1.2 + k * 0.03, rotation: [0, facing, 0] });
    tail.parent?.add(pivot);
    tail.position.set(0, -(1.0 - k * 0.18), k * 0.03);
    pivot.add(tail);
    return pivot;
  });

  tick((t) => {
    tails.forEach((pivot, k) => {
      pivot.rotation.z = 0.5 + k * 0.2 + Math.sin(t * 6 + k) * 0.1;
      pivot.rotation.x = Math.sin(t * 4.3 + k * 2) * 0.08;
    });
    flash.visible = t > 0 && t % 3.2 < 0.12;
    light.visible = Math.floor(t * 7) % 19 !== 11;
    tape.forEach((piece, k) => (piece.rotation.x = Math.sin(t * 5 + k) * 0.25));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
