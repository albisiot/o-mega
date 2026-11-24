import { BoxGeometry, ConeGeometry, CylinderGeometry, Group } from "three";
import { MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { crate, floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Falx (P066): the punk with a magenta crest and a domino mask lunges down a brick alley, a
 * knife in each bandaged hand and home-made blades bolted along her forearms. Behind her the
 * grindstone she sharpens them on is still spinning and throwing sparks; plasters on her cheek
 * and hands, and a first-aid box spilling more, tell how often she cuts herself.
 */
export function falx(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const BRICK = 0x2e2a48;
  const JOINT = 0x1c1a30;
  const STEEL = 0xc8d0dc;
  const PLASTER = 0xe8c89a;
  const WOOD = 0x5e4a3a;
  const F = octagonBase(kit, 0x1a1824);
  const G = floor(kit, F, 0.06, 0x2a2838, 0x1a1824, 0.36);

  // The alley: a brick wall behind and one on the left, a lantern, a puddle.
  const brick = (w: number, h: number, x: number, z: number, turn: number, delay: number) => {
    const wall = box(w, h, 0.2, BRICK, x, G, z, { delay, ink: 1.02, rotation: [0, turn, 0] });
    const rows: Point[] = [];
    for (let k = 1; k < h / 0.2; k++) rows.push([0, k * 0.2, 0.105]);
    decorate(wall, new BoxGeometry(w, 0.02, 0.01), JOINT, rows);
    const joints: Point[] = [];
    for (let k = 0; k < h / 0.2 - 1; k++) for (let j = 0; j < w / 0.45; j++) if ((k + j * 2) % 3) joints.push([-w / 2 + 0.2 + j * 0.45 + (k % 2) * 0.22, 0.1 + k * 0.2, 0.105]);
    decorate(wall, new BoxGeometry(0.02, 0.19, 0.01), JOINT, joints);
    return wall;
  };
  brick(3.1, 2.8, -0.1, -1.5, 0, 0.1);
  brick(2.0, 2.8, -1.75, -0.4, Math.PI / 2, 0.14);
  const light = wallLantern(kit, 0.75, -1.4, G + 2.3, 0.3, YELLOW);
  puddle(kit, -0.9, 1.0, G, 0.4, 0.45, MAGENTA);

  // The grindstone on its trestle, a spare blade clamped against it, still spinning.
  const WX = 1.15;
  const WZ = -0.75;
  const WY = G + 0.95;
  box(0.9, 0.1, 0.4, WOOD, WX, G + 0.55, WZ, { delay: 0.3 });
  [-0.35, 0.35].forEach((dx) => box(0.08, 0.55, 0.3, shade(WOOD, 0.7), WX + dx, G, WZ, { delay: 0.32 }));
  [-0.12, 0.12].forEach((dz) => box(0.05, 0.42, 0.05, shade(WOOD, 0.7), WX, G + 0.65, WZ + dz, { delay: 0.34, noInk: true }));
  const hub = new Group();
  const stone = add(new CylinderGeometry(0.3, 0.3, 0.12, 20).rotateX(Math.PI / 2), 0x8a8f9c, 0, -0.3, 0, { delay: 0.4 });
  decorate(stone, new BoxGeometry(0.06, 0.12, 0.13), 0x5a5f6c, [0, 1, 2, 3, 4, 5].map((k) => [Math.cos(k) * 0.24, 0.3 + Math.sin(k) * 0.24, 0, k] as [number, number, number, number]));
  stone.parent?.add(hub);
  hub.add(stone);
  hub.position.set(WX, WY, WZ);
  cylinder(0.025, 0.025, 0.45, 0x4a4f5c, WX, WY, WZ - 0.22, { delay: 0.42, rotation: [Math.PI / 2, 0, 0] }, 8);
  box(0.04, 0.22, 0.04, 0x4a4f5c, WX, WY - 0.2, WZ + 0.2, { delay: 0.44 });
  const contact: Point = [WX - 0.22, WY + 0.2, WZ];
  limb(kit, [WX - 0.62, WY + 0.32, WZ], contact, 0.03, 0.02, STEEL, { delay: 0.46 });
  const sparks = [0.6, 1.0, 1.4, 1.9, 2.3].map((a, k) => {
    const to: Point = [contact[0] - Math.cos(a) * 0.45, contact[1] + Math.sin(a) * 0.35 + 0.05, contact[2] + 0.1 + k * 0.04];
    return box(0.025, aim(contact, to).length, 0.025, k % 2 ? YELLOW : 0xfff1a8, ...contact, { delay: 0.5 + k * 0.02, flat: true, noInk: true, rotation: aim(contact, to).rotation });
  });

  // The first-aid box, open, plasters spilling out.
  const kitBox = crate(kit, 1.1, 0.95, G, 0.5, 0.36, 0xe8e2d0, -0.4);
  decorate(kitBox, new BoxGeometry(0.37, 0.07, 0.01), 0x2fa8c8, [[0, 0.18, 0.182]]);
  box(0.36, 0.04, 0.36, 0xe8e2d0, 1.0, G + 0.36, 0.72, { delay: 0.55, rotation: [-1.0, -0.4, 0] });
  [
    [0.75, 1.15, 0.3],
    [0.55, 0.95, 1.2],
    [0.85, 1.45, -0.6],
    [0.45, 1.3, 0.8],
  ].forEach(([x, z, turn], i) => box(0.16, 0.008, 0.06, PLASTER, x, G, z, { delay: 0.6 + i * 0.02, noInk: true, rotation: [0, turn, 0] }));

  // Falx, lunging, knives out.
  const H = 2.3;
  const u = H / 2.4;
  const arms: [Point, Point] = [[-0.6, 1.5, 0.55], [0.55, 1.75, 0.45]];
  const punk = figure(kit, {
    x: -0.35,
    z: 0.35,
    y: G,
    facing: 0.4,
    height: H,
    build: "slim",
    skin: 0xe8c4a8,
    hair: { style: "bald", color: MAGENTA },
    face: { mouth: "frown", brows: "angry", mask: "eyes" },
    top: { kind: "jacket", color: 0x1c1b24, accent: 0x3a3a4c },
    bottom: { kind: "trousers", color: 0x1c1b24 },
    shoes: 0x14121c,
    belt: 0x3a3a4c,
    gloves: 0xe8dcc0,
    arms,
    legs: "stride",
    delay: 0.7,
  });
  const at = punk.at;
  // Her crest: a row of magenta spikes over the shaved head. A plaster on her cheek.
  const R = punk.headRadius;
  [-0.14, -0.05, 0.04, 0.12].forEach((dz, k) => {
    const from = at(0, 2.14 * u + R * 0.75, dz);
    const to = at(0, 2.14 * u + R * 0.75 + 0.3 - Math.abs(dz) * 0.6, dz - 0.12);
    add(new ConeGeometry(0.07, aim(from, to).length, 6), MAGENTA, ...from, { delay: 1.2 + k * 0.02, rotation: aim(from, to).rotation });
  });
  // Studs on the shoulders of her jacket.
  [-1, 1].forEach((s) => [0, 1, 2].forEach((k) => kit.ball(0.03, STEEL, ...at(s * (0.2 + k * 0.08), 1.74 * u - k * 0.03, 0.12), { delay: 1.25 })));
  decorate(punk.headPart, new BoxGeometry(0.09, 0.03, 0.01), PLASTER, [[0.11, R * 1.06 - 0.06, R * 0.75, 0.5]]);
  // Blades bolted along her forearms, plasters criss-crossed on them, and the knives.
  arms.forEach((hand, i) => {
    const s = i ? 1 : -1;
    const shoulder: Point = [s * 0.34 * u, 1.72 * u, 0];
    const elbow: Point = [(shoulder[0] + hand[0]) / 2 + s * 0.14 * u, (shoulder[1] + hand[1]) / 2 - 0.1 * u, (shoulder[2] + hand[2]) / 2 - 0.04 * u];
    [0.25, 0.45, 0.65, 0.85].forEach((k, j) => {
      const base: Point = [elbow[0] + (hand[0] - elbow[0]) * k, elbow[1] + (hand[1] - elbow[1]) * k + 0.06, elbow[2] + (hand[2] - elbow[2]) * k - 0.02];
      const from = at(...base);
      const to = at(base[0] + s * 0.16, base[1] + 0.16, base[2] - 0.16);
      add(new ConeGeometry(0.04, aim(from, to).length, 4), STEEL, ...from, { delay: 1.3 + i * 0.05 + j * 0.02, rotation: aim(from, to).rotation });
    });
    const mid = at(elbow[0] + (hand[0] - elbow[0]) * 0.55, elbow[1] + (hand[1] - elbow[1]) * 0.55 - 0.02, elbow[2] + (hand[2] - elbow[2]) * 0.55 + 0.06);
    box(0.12, 0.035, 0.03, PLASTER, ...mid, { delay: 1.45, noInk: true, rotation: [0, 0.4, s * 0.6] });
    const grip = punk.hands[i];
    const tip = at(hand[0] + s * 0.1, hand[1] + (i ? 0.05 : -0.2), hand[2] + 0.55);
    const blade = aim(grip, tip);
    add(new BoxGeometry(0.08, blade.length, 0.02), STEEL, ...grip, { delay: 1.5 + i * 0.04, rotation: blade.rotation });
    cylinder(0.03, 0.03, 0.14, 0x2a2630, ...at(hand[0], hand[1] - 0.12, hand[2]), { delay: 1.48 }, 8);
  });

  tick((t) => {
    hub.rotation.z = -t * 6;
    sparks.forEach((spark, k) => (spark.visible = Math.floor(t * 12 + k * 7) % 4 !== 3));
    light.visible = Math.floor(t * 4) % 23 !== 11;
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
