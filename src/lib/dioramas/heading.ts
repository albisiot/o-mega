import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, aim, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Heading (P134): the metro's excavation engineer, hard hat with twin lamps and the plans rolled
 * under her arm, lays her gloved hand on the rock where the new tunnel breaks into an old
 * necropolis; from her palm glowing cracks spread to show where the rock will hold, past a
 * statue in its carved niche. Timber frames, rails and work lamps behind her. The price: the
 * site phone on the post is off the hook, its receiver swinging, and she isn't answering.
 */
export function heading(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const ROCK = 0x4a4250;
  const TIMBER = 0x6a4a32;
  const STONE = 0x8a8a96;
  const F = octagonBase(kit, 0x1e1a22);
  const G = floor(kit, F, 0.06, 0x3a3236, 0x2a2226, 0.45);

  // The rock face of the necropolis, running across the back right, with a carved niche.
  const N: [number, number] = [-0.6, 0.8];
  const A: [number, number] = [0.8, 0.6];
  const WX = 0.95;
  const WZ = -0.5;
  const wall = box(2.8, 2.7, 0.5, ROCK, WX, G, WZ, { delay: 0.1, rotation: [0, -Math.atan2(0.6, 0.8), 0], ink: 1.02 });
  decorate(wall, new BoxGeometry(0.5, 0.3, 0.01), 0x3a3442, [
    [-1.0, 2.2, 0.251, 0.3],
    [0.9, 2.35, 0.251, -0.2],
    [1.1, 0.6, 0.251, 0.5],
    [-0.2, 2.45, 0.251, 0.1],
    [0.2, 0.35, 0.251, -0.4],
  ]);
  const face = (along: number, up: number, out: number): Point => [WX + A[0] * along + N[0] * (0.25 + out), G + up, WZ + A[1] * along + N[1] * (0.25 + out)];
  [-1.15, -0.45, 0.25, 0.95].forEach((along, i) => {
    const [x, , z] = face(along, 0, -0.2);
    add(new DodecahedronGeometry(0.22 + (i % 2) * 0.06), i % 2 ? ROCK : 0x3e3846, x, G + 2.5, z, { delay: 0.15 + i * 0.03, rotation: [i, i * 2, 0] });
  });
  const NA = 0.85;
  decorate(wall, new BoxGeometry(0.62, 1.12, 0.01), 0x1c1820, [[NA, 1.15, 0.252]]);
  decorate(wall, new BoxGeometry(0.08, 1.1, 0.02), 0x9a9aa6, [
    [NA - 0.35, 1.15, 0.26],
    [NA + 0.35, 1.15, 0.26],
  ]);
  decorate(wall, new BoxGeometry(0.82, 0.08, 0.02), 0x9a9aa6, [[NA, 1.73, 0.26]]);
  decorate(wall, new CylinderGeometry(0.01, 0.46, 0.22, 3).rotateX(Math.PI / 2).rotateZ(Math.PI).scale(1, 1, 0.05), 0x9a9aa6, [[NA, 1.85, 0.26]]);
  // In the niche, an old statue in its robe.
  const [lx, , lz] = face(NA, 0, 0.12);
  box(0.62, 0.55, 0.3, 0x5a5262, lx, G, lz, { delay: 0.3, rotation: [0, -Math.atan2(0.6, 0.8), 0] });
  figure(kit, {
    x: lx,
    z: lz,
    y: G + 0.55,
    facing: Math.atan2(N[0], N[1]),
    height: 1.05,
    build: "slim",
    skin: STONE,
    hair: { style: "curly", color: 0x7a7a86 },
    face: { blank: true },
    top: { kind: "robe", color: STONE },
    barefoot: true,
    arms: ["down", [0.12, 0.7, 0.14]],
    delay: 0.35,
  });
  rubble(kit, 0.6, 1.0, G, 0.4, 5, 0.4, 0x3a3442);
  // A toolbox by the rails.
  const tools = box(0.5, 0.24, 0.26, ORANGE, -0.55, G, 1.25, { delay: 0.4, rotation: [0, 0.3, 0] });
  decorate(tools, new BoxGeometry(0.3, 0.04, 0.04), 0x23222b, [[0, 0.27, 0]]);

  // The tunnel: rails, two timber frames, a line of work lamps.
  [-1.55, -1.15].forEach((x, i) => box(0.05, 0.05, 3.4, 0x8a8f9e, x, G + 0.04, 0, { delay: 0.15 + i * 0.02 }));
  for (let k = 0; k < 9; k++) box(0.7, 0.04, 0.1, 0x3e3028, -1.35, G, -1.55 + k * 0.38, { delay: 0.12, noInk: true });
  const lamps = [-1.2, 0.1].flatMap((z, i) => {
    [-2.05, -0.65].forEach((x) => box(0.14, 2.4, 0.14, TIMBER, x, G, z, { delay: 0.2 + i * 0.05 }));
    box(1.6, 0.16, 0.18, TIMBER, -1.35, G + 2.4, z, { delay: 0.25 + i * 0.05 });
    return [-1.75, -0.95].map((x, k) => {
      box(0.01, 0.25, 0.01, 0x23222b, x, G + 2.15, z + 0.08, { delay: 0.3, noInk: true });
      return ball(0.07, ORANGE, x, G + 2.02, z + 0.08, { delay: 0.32 + k * 0.03, flat: true });
    });
  });
  cable(kit, [[-2.0, G + 2.38, -1.1], [-1.35, G + 2.3, -0.55], [-0.7, G + 2.38, 0.2]], 0.015, 0x23222b, 0.35);

  // The site phone on the front post, its receiver off the hook and hanging by the cord.
  const phone = box(0.24, 0.32, 0.12, 0x2f6a44, -2.05, G + 1.2, 0.23, { delay: 0.45 });
  decorate(phone, new BoxGeometry(0.07, 0.07, 0.01), MAGENTA, [[0.05, 0.23, 0.061]]);
  const callLight = phone.children[2];
  const cordFrom: Point = [-2.0, G + 1.24, 0.3];
  const cord = limb(kit, cordFrom, [-2.0, G + 0.74, 0.32], 0.012, 0.012, 0x14121c, { delay: 0.5, noInk: true });
  const receiver = box(0.08, 0.26, 0.08, 0x9aa0ab, -2.0, G + 0.48, 0.32, { delay: 0.52 });

  // Heading: hard hat with twin lamps, work suit with orange flashes, a hand on the rock.
  const engineer = figure(kit, {
    x: -0.05,
    z: -0.05,
    y: G,
    facing: 0.35,
    height: 2.35,
    build: "normal",
    skin: 0xd8a888,
    hair: { style: "ponytail", color: 0x3a2420 },
    face: { mouth: "neutral", brows: "calm", marks: 0x8a6a5a },
    headwear: { kind: "hardhat", color: 0xc8c8d0, accent: 0x9a9aa6 },
    top: { kind: "jacket", color: 0x4e4e58, accent: ORANGE },
    bottom: { kind: "trousers", color: 0x44444c },
    shoes: 0x2a2622,
    belt: 0x2a2622,
    gloves: 0x2e2e34,
    arms: [
      [-0.27, 1.33, 0.18],
      [0.78, 1.75, 0.15],
    ],
    delay: 0.7,
  });
  const at = engineer.at;
  [-1, 1].forEach((side) => {
    add(new CylinderGeometry(0.045, 0.045, 0.05, 12).rotateX(Math.PI / 2), YELLOW, ...at(side * 0.08, 2.2, 0.21), { delay: 1.3, rotation: [0, 0.35, 0], flat: true });
    kit.ball(0.07, 0x2e2e34, ...at(side * 0.17, 0.52, 0.06), { delay: 1.25 });
  });
  // The plans, rolled under her right arm.
  limb(kit, at(-0.45, 1.6, -0.08), at(-0.1, 1.05, 0.46), 0.075, 0.075, 0xe8e2d0, { delay: 1.3 });
  const rollTurn = aim(at(-0.45, 1.6, -0.08), at(-0.1, 1.05, 0.46)).rotation;
  [0.2, 0.75].forEach((u) => {
    const band = at(-0.45 + 0.35 * u, 1.6 - 0.55 * u, -0.08 + 0.54 * u);
    add(new TorusGeometry(0.077, 0.014, 4, 14).rotateX(Math.PI / 2), CYAN, ...band, { delay: 1.35, flat: true, noInk: true, rotation: rollTurn });
  });

  // Where her palm lies, cracks of light run through the rock: it holds.
  const [hx, hy, hz] = engineer.hands[1];
  const handAlong = (hx - WX) * A[0] + (hz - WZ) * A[1];
  const hand = { x: handAlong, y: hy - G };
  const glow = decorate(wall, new BoxGeometry(0.02, 0.4, 0.01), CYAN, [
    [hand.x - 0.22, hand.y + 0.18, 0.256, 0.9],
    [hand.x + 0.2, hand.y + 0.2, 0.256, -0.7],
    [hand.x - 0.1, hand.y - 0.3, 0.256, -0.3],
    [hand.x + 0.26, hand.y - 0.2, 0.256, 0.6],
    [hand.x - 0.45, hand.y + 0.42, 0.256, 0.2],
    [hand.x + 0.45, hand.y + 0.5, 0.256, -0.3],
    [hand.x - 0.18, hand.y - 0.65, 0.256, 0.4],
    [hand.x + 0.5, hand.y - 0.45, 0.256, 1.1],
  ]);
  decorate(wall, new TorusGeometry(0.16, 0.012, 4, 20), CYAN, [[hand.x, hand.y, 0.256]]);
  decorate(wall, new ConeGeometry(0.05, 0.3, 4).scale(1, 1, 0.1), MAGENTA, [[hand.x + 0.9, hand.y + 0.55, 0.256, 0.4]]);
  motes(8, 0xd8c8b0, 0.025, [-1.6, G + 0.4, -1.2], [-0.4, G + 2.2, 0.3], 1.2);

  const dim = new Color(0x0a5a78);
  const bright = new Color(CYAN);
  tick((t) => {
    // The cracks pulse from her hand; the receiver swings on its cord; one lamp flickers.
    glow.color.lerpColors(dim, bright, 0.5 + 0.5 * Math.cos(t * 2.4));
    const swing = Math.sin(t * 1.8) * 0.35;
    const end: Point = [cordFrom[0] + Math.sin(swing) * 0.5, cordFrom[1] - Math.cos(swing) * 0.5, cordFrom[2] + 0.02];
    cord.rotation.set(...aim(cordFrom, end).rotation);
    receiver.position.set(end[0], end[1] - 0.26, end[2]);
    receiver.rotation.z = swing * 0.5;
    lamps[2].visible = Math.floor(t * 8) % 11 !== 4;
    callLight.visible = Math.floor(t * 3) % 2 === 0;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
