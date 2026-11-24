import { BoxGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { INK, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { flame, skyline } from "@/lib/diorama-props";

/**
 * Theriarch (P160): the priestess of the blind amphibian stands at the end of an old stone jetty
 * in a hooded robe of green scales, her face behind a veil of chain mail, a long oar raised like
 * a crozier. Behind her the huge warty head of the creature slowly surfaces from the harbour,
 * its milky eye seeing nothing, and sinks again in rings of water; at her feet a candle burns on
 * a plate of offerings. No engine, no weapon: an oar, a candle and patience.
 */
export function theriarch(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WATER = 0x0e3a4e;
  const FOAM = 0xcfeef7;
  const STONE = 0x5a5e6a;
  const SCALE = 0x2f5a44;
  const SKIN = 0x3e5a48;
  const F = octagonBase(kit, WATER);

  /** A ring spreading on the water, again and again. */
  const ripple = (x: number, z: number, radius: number, period: number, phase: number, delay: number) => {
    const ring = add(new TorusGeometry(radius, 0.018, 6, 36).rotateX(Math.PI / 2), FOAM, x, F + 0.002, z, { delay, flat: true, noInk: true });
    tick((t) => {
      const u = ((t + phase) / period) % 1;
      ring.children[0].scale.set(0.5 + u * 1.2, 1, 0.5 + u * 1.2);
      ring.visible = u < 0.85;
    });
  };

  // The harbour town far off on the left, and mooring poles in the water.
  skyline(kit, -1.75, F, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.4, -0.35);
  [
    [0.55, 1.35],
    [-1.75, 0.6],
  ].forEach(([x, z], i) => {
    cylinder(0.06, 0.07, 1.0 + (i % 2) * 0.25, 0x3e3028, x, F - 0.05, z, { delay: 0.15 + i * 0.03 }, 8);
    ripple(x, z, 0.12, 2.8, i * 0.9, 0.5);
  });

  // The jetty: big worn slabs out into the water.
  const jetty = box(1.3, 0.32, 2.6, STONE, -0.5, F, 0.5, { delay: 0.1 });
  decorate(jetty, new BoxGeometry(1.3, 0.006, 0.014), 0x3e424e, [0.65, 0.1, -0.45, -0.95].map((z) => [0, 0.321, z] as Point));
  decorate(jetty, new BoxGeometry(0.014, 0.006, 0.6), 0x3e424e, [
    [-0.1, 0.321, 0.95],
    [0.25, 0.321, -0.2],
    [-0.3, 0.321, -1.0],
  ]);
  const G = F + 0.32;
  // The offering: a plate of little fish and a candle.
  cylinder(0.16, 0.13, 0.03, 0x9aa0ab, -0.05, G, 0.2, { delay: 0.4 }, 16);
  [-0.07, 0.0, 0.07].forEach((dx, i) => add(new SphereGeometry(0.03, 8, 6).scale(2.2, 0.7, 1), 0xb0c0c8, -0.05 + dx, G + 0.03, 0.2 + (i - 1) * 0.04, { delay: 0.44 }));
  cylinder(0.035, 0.035, 0.18, 0xe8e0c8, -0.2, G, 0.05, { delay: 0.46 }, 10);
  const candle = flame(kit, -0.2, 0.05 - 0.03, G + 0.18, 0.5, 0.35);

  // The creature: a wide, warty head of a blind amphibian, a milky eye, a long lipless mouth.
  const [ax, az] = [0.75, -1.2];
  const beast: Group[] = [];
  beast.push(add(new SphereGeometry(0.85, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.15, 0.72, 0.8), SKIN, ax, F, az, { delay: 0.2, rotation: [0, 0.35, 0] }));
  const onHead = (dx: number, h: number, out = 0): Point => {
    const dz = 0.68 * Math.sqrt(Math.max(0, 1 - (dx / 0.98) ** 2 - (h / 0.61) ** 2)) + out;
    return [ax + dx * Math.cos(0.35) + dz * Math.sin(0.35), F + h, az - dx * Math.sin(0.35) + dz * Math.cos(0.35)];
  };
  // Its eyes bulge on top of the head, big and milky: it is blind.
  [-0.42, 0.42].forEach((dx, i) => {
    const eyeAt = onHead(dx, 0.42, -0.12);
    beast.push(add(new SphereGeometry(0.2, 16, 12), SKIN, eyeAt[0], eyeAt[1] - 0.04, eyeAt[2], { delay: 0.3 + i * 0.03 }));
    const eyeball = add(new SphereGeometry(0.17, 16, 12), 0xc8d2c0, eyeAt[0] + 0.02, eyeAt[1] + 0.06, eyeAt[2] + 0.08, { delay: 0.32 + i * 0.03 });
    decorate(eyeball, new SphereGeometry(0.1, 12, 8).scale(1, 1, 0.3), 0xa0b8b0, [[0, 0.15, 0.15]]);
    beast.push(eyeball);
    // A heavy lid, half down over it.
    beast.push(add(new SphereGeometry(0.185, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), SKIN, eyeAt[0] + 0.02, eyeAt[1] + 0.25, eyeAt[2] + 0.08, { delay: 0.34 + i * 0.03, rotation: [0.45, 0, 0] }));
  });
  const mouth = add(new TorusGeometry(1, 0.025, 4, 40, Math.PI * 0.7).rotateX(Math.PI / 2).rotateY(-Math.PI * 0.15).scale(0.99, 1, 0.7), INK, ax, F + 0.08, az, {
    delay: 0.36,
    flat: true,
    noInk: true,
    rotation: [0, 0.35, 0],
  });
  beast.push(mouth);
  [
    [-0.15, 0.5],
    [0.3, 0.45],
    [0.6, 0.3],
    [-0.75, 0.15],
    [0.1, 0.25],
    [0.75, 0.12],
  ].forEach(([dx, h], i) => {
    const p = onHead(dx, h, -0.03);
    beast.push(ball(0.06 + (i % 3) * 0.02, 0x56705a, p[0], p[1] - 0.04, p[2], { delay: 0.38 + i * 0.02 }));
  });
  [-0.1, 0.05].forEach((dx) => {
    const p = onHead(dx, 0.4, 0.01);
    beast.push(box(0.04, 0.03, 0.02, INK, ...p, { delay: 0.42, flat: true, noInk: true, rotation: [0, 0.35, 0] }));
  });
  const beastY = beast.map((part) => part.position.y);
  ripple(ax, az + 0.2, 0.9, 3.6, 0, 0.6);
  ripple(ax, az + 0.2, 0.9, 3.6, 1.8, 0.6);
  motes(6, FOAM, 0.03, [ax - 0.6, F, az + 0.3], [ax + 0.4, F + 0.9, az + 0.6], 0.8);

  // Theriarch, the oar held high.
  const theta = 0.3;
  const priestess = figure(kit, {
    x: -0.55,
    z: -0.25,
    y: G,
    facing: theta,
    height: 2.4,
    build: "slim",
    skin: 0x8aa088,
    face: { mask: "full", maskColor: 0x7a8a82, eyes: INK, brows: "none", mouth: "none" },
    headwear: { kind: "hood", color: SCALE },
    top: { kind: "robe", color: SCALE },
    cape: 0x24463a,
    gloves: 0x24463a,
    arms: [
      [-0.3, 2.0, 0.25],
      [0.15, 1.2, 0.35],
    ],
    delay: 0.9,
  });
  const at = priestess.at;
  // The chain-mail veil over her face.
  decorate(
    priestess.headPart,
    new BoxGeometry(0.012, 0.16, 0.01),
    0x4a5a54,
    [-0.12, -0.06, 0, 0.06, 0.12].map((x) => [x, 0.14, 0.2 - Math.abs(x) * 0.35] as Point),
  );
  // Scales on the robe, and two chains hanging down its front.
  const [, , robe] = priestess.parts;
  const scales: Point[] = [];
  for (let row = 0; row < 5; row++)
    for (let k = -2; k <= 2; k++) {
      const h = 0.15 + row * 0.17;
      const r = 0.42 - h * 0.12;
      const a = theta + k * 0.28 + (row % 2) * 0.14;
      scales.push([Math.sin(a) * r, h, Math.cos(a) * r * 0.8 + 0.01]);
    }
  decorate(robe, new TorusGeometry(0.045, 0.01, 4, 8, Math.PI).rotateZ(Math.PI), 0x5a8a6a, scales);
  [-0.1, 0.1].forEach((x) => limb(kit, at(x, 1.65, 0.2), at(x * 1.6, 0.2, 0.36), 0.012, 0.012, 0x8a8f98, { delay: 1.5, noInk: true }));
  // The oar: shaft through both hands, the blade up high.
  const [rh, lh] = priestess.hands;
  const dir = [lh[0] - rh[0], lh[1] - rh[1], lh[2] - rh[2]];
  const low: Point = [lh[0] + dir[0] * 0.75, lh[1] + dir[1] * 0.75, lh[2] + dir[2] * 0.75];
  const high: Point = [rh[0] - dir[0] * 1.05, rh[1] - dir[1] * 1.05, rh[2] - dir[2] * 1.05];
  limb(kit, low, high, 0.03, 0.03, 0x3a2e24, { delay: 1.4 });
  const { rotation } = aim(low, high);
  const blade = add(new BoxGeometry(0.2, 0.62, 0.03), 0x2f4a3c, ...high, { delay: 1.5, rotation });
  decorate(blade, new BoxGeometry(0.03, 0.55, 0.035), 0x24382e, [[0, 0.3, 0]]);
  cylinder(0.04, 0.04, 0.05, 0x8a8f98, ...high, { delay: 1.52, rotation, noInk: true }, 8);

  tick((t) => {
    // Once a year, it passes by: the head rises out of the water, then slips back under.
    const rise = 0.5 + 0.5 * Math.cos(t * 0.45);
    beast.forEach((part, i) => (part.position.y = beastY[i] - (1 - rise) * 0.55));
    candle.forEach((part, i) => part.children.forEach((mesh) => (mesh.scale.y = 1 + Math.sin(t * 13 + i * 2) * 0.12)));
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
