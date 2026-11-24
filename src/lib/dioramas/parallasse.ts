import { BoxGeometry, CylinderGeometry, SphereGeometry } from "three";
import { CYAN, INK, MAGENTA, aim, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor } from "@/lib/diorama-props";

/**
 * Parallasse (P109): the alien science officer stands in the dry dock under a hull on its
 * stilts, tall and thin in a ribbed hood, glass vials across his chest. He draws the fear out of
 * a cowering docker: a dark violet smoke flows from the man's head into his open hand and down
 * into a vial. On a crate an alarm clock is already set for tomorrow at twelve past six, when
 * all that fear will hit him.
 */
export function parallasse(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BONE = 0xcfc3a8;
  const HOOD = 0x8a8a92;
  const ROBE = 0x3a3c46;
  const AMBER = 0xffa630;
  const FEAR = 0x4a2a6a;
  const F = octagonBase(kit, 0x1a1c24);
  const G = floor(kit, F, 0.06, 0x2c3038, 0x20232a, 0.5);

  // The hull in dry dock, high on its stilts, portholes lit.
  const [HL, HD, HH] = [1.26, 0.54, 0.72];
  const hull = add(new SphereGeometry(1.2, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(HL / 1.2, HH / 1.2, HD / 1.2), 0x3a4050, 0, G + 1.85, -1.35, { delay: 0.1 });
  decorate(hull, new CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(Math.PI / 2), AMBER, [-0.66, -0.33, 0, 0.33, 0.66].map((x) => [x, 0.6, HD * Math.sqrt(Math.max(0, 1 - (x / HL) ** 2 - 0.03)) + 0.01] as Point));
  decorate(hull, new BoxGeometry(1.9, 0.05, 0.01), MAGENTA, [[0, 0.42, HD * 0.86]]);
  add(new CylinderGeometry(1.2, 1.2, 0.05, 28).scale(HL / 1.2, 1, HD / 1.2), 0x4a5060, 0, G + 1.85 + HH - 0.01, -1.35, { delay: 0.2 });
  box(0.08, 0.5, 0.08, 0x23222b, -0.3, G + 1.85 + HH, -1.35, { delay: 0.22 });
  box(0.5, 0.3, 0.4, 0x4a5060, 0.35, G + 1.85 + HH, -1.35, { delay: 0.24 });
  [-0.9, 0, 0.9].forEach((x, i) => box(0.1, 1.85 + (Math.abs(x) > 0 ? 0.22 : 0.02), 0.1, 0x23222b, x, G, -1.35, { delay: 0.14 + i * 0.03 }));
  [-1.2, 1.2].forEach((x, i) => box(0.05, 2.6, 0.05, 0x4a4f5c, x, G, -1.05, { delay: 0.22 + i * 0.03, noInk: true }));
  box(2.4, 0.05, 0.05, 0x4a4f5c, 0, G + 1.2, -1.05, { delay: 0.26, noInk: true });

  // The alarm clock on a crate: set for tomorrow, twelve past six.
  crate(kit, -1.4, 0.45, G, 0.3, 0.45, 0x5e4a3a, 0.3);
  const CX = -1.4;
  const CY = G + 0.6;
  const CZ = 0.45;
  const clock = add(new CylinderGeometry(0.15, 0.15, 0.08, 20).rotateX(Math.PI / 2), CYAN, CX, CY - 0.15, CZ, { delay: 0.4, rotation: [0, 0.35, 0] });
  decorate(clock, new CylinderGeometry(0.125, 0.125, 0.01, 20).rotateX(Math.PI / 2), 0xf4f0e6, [[0, 0.15, 0.04]]);
  [-1, 1].forEach((side) => ball(0.06, CYAN, CX + side * 0.1 * Math.cos(0.35), CY + 0.07, CZ - side * 0.1 * Math.sin(0.35), { delay: 0.44 }));
  const front: Point = [CX + 0.05 * Math.sin(0.35), CY, CZ + 0.05 * Math.cos(0.35)];
  [
    [Math.PI * (6.2 / 6), 0.07, 0.025],
    [Math.PI * (12 / 30), 0.1, 0.018],
  ].forEach(([angle, length, width], k) => {
    const hand = box(width, length, 0.008, INK, ...front, { delay: 0.48 + k * 0.02, flat: true, noInk: true });
    hand.rotation.order = "YXZ";
    hand.rotation.set(0, 0.35, -angle);
  });

  // The docker, on his knees, hands up to his face.
  const docker = figure(kit, {
    x: 1.05,
    z: 0.8,
    y: G,
    facing: -0.3,
    height: 2.2,
    skin: 0xd8a888,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried" },
    headwear: { kind: "hardhat", color: 0xe08a2a },
    top: { kind: "jacket", color: 0x23707e, accent: MAGENTA },
    bottom: { kind: "trousers", color: 0x2a3040 },
    shoes: 0x2a2622,
    arms: [[-0.14, 1.4, 0.32], [0.14, 1.45, 0.3]],
    legs: "kneel",
    delay: 0.6,
  });

  // Parallasse: tall, thin, a ribbed hood, pale jointed arms, the bandolier of vials.
  const facing = 0.6;
  const H = 2.6;
  const u = H / 2.4;
  const officer = figure(kit, {
    x: -0.3,
    z: 0.05,
    y: G,
    facing,
    height: H,
    build: "slim",
    skin: BONE,
    hair: { style: "bald", color: BONE },
    face: { blank: true },
    top: { kind: "robe", color: ROBE, sleeves: "none" },
    cape: 0x2e3038,
    gloves: BONE,
    arms: ["down", [0.42, 1.62, 0.62]],
    delay: 0.9,
  });
  const neckY = officer.head[1] - G - officer.headRadius * 1.06 - 0.06;
  const hood = cylinder(0.28, 0.25, 0.78, HOOD, ...officer.at(0, neckY, 0), { delay: 1.4, rotation: [0, facing, 0] }, 16);
  decorate(hood, new BoxGeometry(0.025, 0.74, 0.05), 0x6a6a72, [-1.3, -0.95, -0.6, 0.6, 0.95, 1.3].map((a) => [Math.sin(a) * 0.265, 0.38, Math.cos(a) * 0.265] as Point));
  decorate(hood, new BoxGeometry(0.06, 0.03, 0.02), 0xffd60a, [
    [-0.07, 0.5, 0.272],
    [0.07, 0.5, 0.272],
  ]);
  cylinder(0.25, 0.25, 0.01, INK, ...officer.at(0, neckY + 0.775, 0), { delay: 1.45, flat: true, noInk: true });
  add(new SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x8a6a3a, ...officer.at(-0.36 * u, 1.66 * u, 0), { delay: 1.42, rotation: [0, facing, 0.3] });
  // Dark joints on the pale arms.
  const SW = 0.34 * u;
  const top = 1.72 * u;
  [
    officer.at(-(SW + 0.06 * u), top - 0.42 * u, 0.02),
    officer.at((SW + 0.42) / 2 + 0.14 * u, (top + 1.62) / 2 - 0.1 * u, 0.31 - 0.04 * u),
  ].forEach(([x, y, z], i) => ball(0.1, 0x2a2a30, x, y - 0.1, z, { delay: 1.5 + i * 0.03 }));
  // The bandolier from his right shoulder down across his chest; the vials stand in it.
  const strapFrom = officer.at(-0.28 * u, 1.66 * u, 0.24);
  const strapTo = officer.at(0.24 * u, 1.3 * u, 0.29);
  box(0.09, aim(strapFrom, strapTo).length, 0.03, 0x6a4a2a, ...strapFrom, { delay: 1.48, rotation: aim(strapFrom, strapTo).rotation });
  const vials = [0.15, 0.3, 0.45, 0.6, 0.75].map((k, i) => {
    const at = strapFrom.map((v, n) => v + (strapTo[n] - v) * k) as Point;
    const [fx, fz] = [Math.sin(facing) * 0.04, Math.cos(facing) * 0.04];
    return cylinder(0.028, 0.028, 0.13, i === 2 ? FEAR : AMBER, at[0] + fx, at[1] - 0.07, at[2] + fz, { delay: 1.55 + i * 0.02, flat: true }, 8);
  });

  // The fear: dark smoke from the docker's head into his hand, then down into the vial.
  const path: Point[] = [[docker.head[0], docker.head[1] + 0.25, docker.head[2]], [(docker.head[0] + officer.hands[1][0]) / 2, docker.head[1] + 0.45, (docker.head[2] + officer.hands[1][2]) / 2], officer.hands[1], [vials[2].position.x, vials[2].position.y + 0.07, vials[2].position.z]];
  const along = (k: number): Point => {
    const s = Math.min(2.999, k * 3);
    const i = Math.floor(s);
    const f = s - i;
    return [0, 1, 2].map((n) => path[i][n] + (path[i + 1][n] - path[i][n]) * f) as Point;
  };
  const puffs = [0, 1, 2, 3, 4, 5].map((k) => ball(0.07 - k * 0.006, FEAR, 0, 0, 0, { delay: 1.8 + k * 0.03 }));
  const place = (t: number) =>
    puffs.forEach((puff, k) => {
      const [x, y, z] = along(((t * 0.3 + k / 6) % 1) * 0.98);
      puff.position.set(x, y - 0.07, z);
    });
  place(0);

  tick((t) => {
    place(t);
    colorOf(vials[2]).set(Math.sin(t * 3) > 0 ? FEAR : 0x6a3a9a);
    vials.forEach((vial, i) => i !== 2 && colorOf(vial).set(Math.sin(t * 2 + i) > 0.6 ? 0xffd08a : AMBER));
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
