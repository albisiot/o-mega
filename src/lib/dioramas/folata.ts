import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, type Group } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, limb, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { column, floor, ring, rubble } from "@/lib/diorama-props";

/**
 * Folata (P244): the scout tears past the temple ruins on his hover bike, grinning, goggles
 * up, his camouflage poncho flapping, the orange headlamp blazing and a magenta dust trail
 * behind him. He leaves first and thinks later: the signpost he just clipped is still spinning,
 * its arrows pointing every way, and his map has flown out of his pocket and tumbles in the air.
 */
export function folata(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0x5d6680;
  const BIKE = 0x3a4458;
  const BIKE_DARK = 0x262c3a;
  const PONCHO = 0x2e3a3e;
  const F = octagonBase(kit, 0x221f2c);
  const G = floor(kit, F, 0.06, 0x3a3044, 0x2a2232, 0.5);

  // The temple on the hill: a stylobate, three columns, the architrave and the pediment.
  box(2.0, 0.15, 0.7, shade(STONE, 1.15), 0.2, G, -1.5, { delay: 0.08 });
  [-0.55, 0.2, 0.95].forEach((x, i) => column(kit, x, -1.5, G + 0.15, 0.12 + i * 0.04, 1.9, false, 0x6a7a96));
  box(2.0, 0.16, 0.55, STONE, 0.2, G + 2.05, -1.5, { delay: 0.3 });
  const gable = new Shape();
  gable.moveTo(-1.0, 0);
  gable.lineTo(1.0, 0);
  gable.lineTo(0, 0.4);
  gable.closePath();
  add(new ExtrudeGeometry(gable, { depth: 0.45, bevelEnabled: false }).translate(0, 0, -0.225), STONE, 0.2, G + 2.21, -1.5, { delay: 0.34 });
  rubble(kit, 1.55, 0.35, G, 0.3, 5, 0.4);

  // The signpost he clipped: three blank arrows, spinning.
  cylinder(0.035, 0.045, 1.95, 0x4b3a30, -1.3, G, 1.0, { delay: 0.2 }, 8);
  const arrow = new Shape();
  arrow.moveTo(0, -0.06);
  arrow.lineTo(0.38, -0.06);
  arrow.lineTo(0.38, -0.11);
  arrow.lineTo(0.55, 0);
  arrow.lineTo(0.38, 0.11);
  arrow.lineTo(0.38, 0.06);
  arrow.lineTo(0, 0.06);
  arrow.closePath();
  const arrows = [
    [1.3, CYAN, 0.4],
    [1.55, MAGENTA, 2.6],
    [1.8, 0xd8d2c4, -1.7],
  ].map(([y, color, turn], i) =>
    add(new ExtrudeGeometry(arrow, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015), color, -1.3, G + y, 1.0, { delay: 0.26 + i * 0.04, rotation: [0, turn, 0] }),
  );
  const turns = [0.4, 2.6, -1.7];

  // Folata on his hover bike, grinning, leaning on the handlebar.
  const H = 1.0;
  const B = G + 0.4;
  const rider = figure(kit, {
    x: -0.5,
    z: 0.05,
    y: B,
    facing: H,
    height: 2.3,
    build: "slim",
    skin: 0xe8b898,
    hair: { style: "wild", color: 0x2a1a20 },
    face: { mouth: "grin", brows: "raised" },
    top: { kind: "coat", color: PONCHO },
    bottom: { kind: "trousers", color: 0x2a2a30 },
    shoes: 0x1e1e24,
    gloves: 0x1e1e24,
    arms: ["forward", "forward"],
    legs: "sit",
    delay: 0.8,
  });
  const P = rider.at;
  const turned: [number, number, number] = [0, H, 0];
  const cy = rider.headRadius * 1.06;
  decorate(rider.headPart, new BoxGeometry(0.3, 0.05, 0.03), 0x1e1e24, [[0, cy + 0.14, 0.17]]);
  decorate(rider.headPart, new CylinderGeometry(0.05, 0.05, 0.04, 12).rotateX(Math.PI / 2), CYAN, [
    [-0.075, cy + 0.14, 0.19],
    [0.075, cy + 0.14, 0.19],
  ]);
  // The camouflage poncho over his shoulders, and the hood down on his back.
  const poncho = add(new CylinderGeometry(0.27, 0.52, 0.8, 16).scale(1, 1, 0.85), PONCHO, ...P(0, 0.56, -0.02), { delay: 1.3, rotation: turned });
  const blob = new SphereGeometry(0.075, 8, 6);
  const spots: [number, number, number][][] = [[], []];
  for (let k = 0; k < 18; k++) {
    const phi = k * 2.4;
    const h = 0.1 + ((k * 7) % 5) * 0.15;
    const r = 0.52 - 0.25 * (h / 0.8) - 0.02;
    spots[k % 2].push([Math.sin(phi) * r, h, Math.cos(phi) * r * 0.85]);
  }
  decorate(poncho, blob, 0x7a2a5a, spots[0]);
  decorate(poncho, blob, 0x2a6a66, spots[1]);
  const hood = ball(0.15, PONCHO, ...P(0, 1.22, -0.22), { delay: 1.34 });

  // The bike: engine pod, side fairings, seat, neck, fork, footpegs, glowing pads, headlamp.
  const pod = box(0.5, 0.42, 0.62, BIKE, ...P(0, -0.02, -0.62), { delay: 0.5, rotation: turned });
  decorate(pod, new BoxGeometry(0.32, 0.06, 0.01), MAGENTA, [[0, 0.32, -0.312]]);
  const bike: Group[] = [
    pod,
    box(0.16, 0.12, 0.75, BIKE_DARK, ...P(0, 0.3, -0.05), { delay: 0.54, rotation: turned }),
    box(0.3, 0.08, 0.45, 0x4a2a3a, ...P(0, 0.4, -0.12), { delay: 0.56, rotation: turned }),
    limb(kit, P(0, 0.38, 0.3), P(0, 0.78, 0.95), 0.08, 0.08, BIKE, { delay: 0.58 }),
    add(new CylinderGeometry(0.2, 0.22, 0.38, 14).rotateX(Math.PI / 2), BIKE, ...P(0, 0.58, 1.02), { delay: 0.6, rotation: turned }),
    add(new CylinderGeometry(0.16, 0.16, 0.03, 14).rotateX(Math.PI / 2), ORANGE, ...P(0, 0.64, 1.22), { delay: 0.64, rotation: turned, flat: true }),
    add(new CylinderGeometry(0.08, 0.08, 0.02, 12).rotateX(Math.PI / 2), YELLOW, ...P(0, 0.72, 1.24), { delay: 0.66, rotation: turned, flat: true, noInk: true }),
    limb(kit, P(0, 0.9, 0.98), P(0, 1.1, 0.66), 0.03, 0.03, BIKE_DARK, { delay: 0.66 }),
    box(0.8, 0.05, 0.05, BIKE_DARK, ...P(0, 1.08, 0.64), { delay: 0.68, rotation: turned }),
  ];
  [-1, 1].forEach((side) => {
    const fairing = box(0.08, 0.26, 1.05, BIKE, ...P(side * 0.34, 0.06, 0.02), { delay: 0.6, rotation: turned });
    decorate(fairing, new BoxGeometry(0.01, 0.04, 0.95), MAGENTA, [[side * 0.041, 0.19, 0]]);
    bike.push(
      fairing,
      limb(kit, P(side * 0.1, 0.72, 0.98), P(side * 0.1, 0.02, 1.12), 0.03, 0.03, BIKE_DARK, { delay: 0.62 }),
      box(0.22, 0.04, 0.24, BIKE_DARK, ...P(side * 0.2, -0.05, 0.6), { delay: 0.64, rotation: turned }),
    );
  });
  [
    [-0.62, 0.24],
    [1.12, 0.2],
  ].forEach(([z, r], i) => {
    bike.push(cylinder(r, r - 0.03, 0.08, BIKE_DARK, ...P(0, -0.1, z), { delay: 0.7 + i * 0.02 }, 14));
    bike.push(cylinder(r - 0.05, r - 0.05, 0.02, CYAN, ...P(0, -0.12, z), { delay: 0.72 + i * 0.02, flat: true, noInk: true }, 14));
  });
  const glow = ring(kit, [P(0, 0, 0.25)[0], G + 0.004, P(0, 0, 0.25)[2]], 0.6, CYAN, 0.75);

  // The magenta dust trail behind him.
  const dust = [0.3, 0.24, 0.18, 0.13].map((r, k) => {
    const [x, , z] = P(0.05 * (k % 2 ? 1 : -1), 0, -1.05 - k * 0.24);
    return ball(r, k % 2 ? 0xc0286a : MAGENTA, x, G, z, { delay: 0.8 + k * 0.04, flat: true, noInk: true });
  });

  // His map, flown out of his pocket, tumbling in the air behind him.
  const map = box(0.42, 0.012, 0.3, 0xe8e2d0, -1.35, G + 2.2, -0.35, { delay: 1.6, rotation: [0.8, 0.3, 0.4] });
  decorate(map, new BoxGeometry(0.3, 0.004, 0.02), MAGENTA, [[0, 0.013, -0.05]]);
  decorate(map, new BoxGeometry(0.02, 0.004, 0.22), 0x2a6a8a, [[0.08, 0.013, 0]]);
  decorate(map, new BoxGeometry(0.12, 0.004, 0.1), 0x8ab09a, [[-0.1, 0.013, 0.07]]);

  const riding = [...rider.parts, ...bike, poncho, hood];
  const rest = riding.map((part) => part.position.y);
  tick((t) => {
    const bob = Math.sin(t * 2.4) * 0.04;
    riding.forEach((part, i) => (part.position.y = rest[i] + bob));
    glow.children[0].scale.setScalar(1 + Math.sin(t * 2.4) * 0.08);
    arrows.forEach((a, i) => (a.rotation.y = turns[i] + t * (1.4 - i * 0.9)));
    dust.forEach((puff, k) => puff.children[0].scale.setScalar(0.8 + 0.25 * Math.sin(t * 5 - k * 1.3)));
    map.rotation.set(0.8 + Math.sin(t * 2.2) * 0.5, 0.3 + t * 0.6, 0.4 + Math.sin(t * 1.7) * 0.3);
    map.position.y = G + 2.2 + Math.sin(t * 1.3) * 0.1;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
