import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor, orb, potted } from "@/lib/diorama-props";

/**
 * Regina Ix (P102): the four-armed alien empress waits at the permits window of the Comune. Two
 * hands hold the golden moon she conquered six planets with, the other two a queue ticket and a
 * sheaf of stamped forms; the shutter keeps coming down in her face, and her flying saucer,
 * parked over the waiting chairs, has a fine stuck on its rim. She never loses her temper.
 */
export function reginaIx(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const WALL = 0x34405a;
  const DARK = 0x23222b;
  const ROBE = 0x5b2a86;
  const LINING = 0x8a3cb8;
  const SKIN = 0x5fa870;
  const BONE = 0xe8dcc0;
  const PAPER = 0xf0ead8;
  const F = octagonBase(kit, 0x221d2c);
  const G = floor(kit, F, 0.06, 0x2c2a3a, 0x1c1a26, 0.45);

  // The permits office: its wall, the window with its shutter, a tower of forms on the counter.
  const wall = box(3.2, 2.7, 0.3, WALL, 0, G, -1.35, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(3.2, 0.06, 0.01), shade(WALL, 0.7), [[0, 0.62, 0.151]]);
  decorate(wall, new BoxGeometry(0.98, 0.82, 0.01), 0x10131c, [[0.6, 1.3, 0.151]]);
  box(1.12, 0.06, 0.32, 0x5a6478, 0.6, G + 0.86, -1.05, { delay: 0.2 });
  box(1.08, 0.16, 0.14, 0x4a5266, 0.6, G + 1.7, -1.13, { delay: 0.22 });
  const shutter = box(0.94, 0.78, 0.03, 0x8a92a6, 0.6, G + 0.92, -1.16, { delay: 0.24 });
  decorate(shutter, new BoxGeometry(0.94, 0.012, 0.01), 0x5a6274, Array.from({ length: 9 }, (_, k) => [0, 0.06 + k * 0.08, 0.016] as Point));
  const shutterScale = shutter.children.map((child) => child.scale.y);
  [0, 1, 2, 3, 4, 5, 6].forEach((k) =>
    box(0.22, 0.045, 0.3, k % 2 ? PAPER : 0xd8d2c0, 0.96 + Math.sin(k * 1.7) * 0.025, G + 0.92 + k * 0.045, -1.02, { delay: 0.3 + k * 0.02, rotation: [0, Math.sin(k) * 0.2, 0] }),
  );
  const display = box(0.42, 0.2, 0.08, 0x1a1c26, 0.6, G + 1.96, -1.16, { delay: 0.26 });
  const lit = decorate(display, new BoxGeometry(0.34, 0.12, 0.01), MAGENTA, [[0, 0.1, 0.041]]);

  // The waiting room spilling outside: two plastic chairs, the ticket machine, a dusty plant.
  [-1.25, -0.8].forEach((x, i) => {
    box(0.3, 0.42, 0.26, DARK, x, G, -0.95, { delay: 0.3 + i * 0.04, noInk: true });
    box(0.38, 0.05, 0.36, 0x1f9fc0, x, G + 0.42, -0.95, { delay: 0.32 + i * 0.04 });
    box(0.38, 0.36, 0.05, 0x1f9fc0, x, G + 0.47, -1.12, { delay: 0.34 + i * 0.04, rotation: [-0.1, 0, 0] });
  });
  cylinder(0.035, 0.05, 0.95, DARK, -1.6, G, -0.2, { delay: 0.36 }, 8);
  const machine = box(0.26, 0.32, 0.2, MAGENTA, -1.6, G + 0.95, -0.2, { delay: 0.4, rotation: [0, 0.5, 0] });
  decorate(machine, new BoxGeometry(0.1, 0.015, 0.08), PAPER, [[0, 0.1, 0.13]]);
  decorate(machine, new BoxGeometry(0.07, 0.05, 0.01), CYAN, [[0, 0.22, 0.101]]);
  potted(kit, 1.55, -0.7, G, 0.42);

  // Her saucer, hovering where parking is forbidden, a yellow fine stuck on the rim.
  const SX = -0.95;
  const SY = G + 3.05;
  const SZ = -0.95;
  const hull = add(new SphereGeometry(0.75, 24, 10).scale(1, 0.2, 1), 0x3a4458, SX, SY, SZ, { delay: 0.5 });
  const rim = [0, 1].map((odd) =>
    decorate(
      hull,
      new BoxGeometry(0.07, 0.05, 0.07),
      odd ? CYAN : YELLOW,
      Array.from({ length: 6 }, (_, k) => {
        const a = ((k * 2 + odd) / 12) * Math.PI * 2;
        return [Math.sin(a) * 0.7, 0.15, Math.cos(a) * 0.7] as Point;
      }),
    ),
  );
  const saucer = [
    hull,
    add(new SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x7fe0ff, SX, SY + 0.22, SZ, { delay: 0.56 }),
    cylinder(0.16, 0.24, 0.05, YELLOW, SX, SY - 0.03, SZ, { delay: 0.58, flat: true, noInk: true }, 16),
  ];
  const fine = box(0.2, 0.13, 0.012, YELLOW, SX + 0.1, SY + 0.27, SZ + 0.27, { delay: 1.9, rotation: [-0.55, 0.35, 0.15] });
  saucer.push(fine);
  const saucerY = saucer.map((part) => part.position.y);

  // Regina Ix: tall, green, calm, in a purple robe with a high collar and a crown of bone lace.
  const ix = figure(kit, {
    x: 0,
    z: 0.4,
    y: G,
    facing: 0.3,
    height: 2.6,
    build: "slim",
    skin: SKIN,
    hair: { style: "bald", color: SKIN },
    face: { blank: true },
    top: { kind: "robe", color: ROBE, accent: LINING },
    cape: 0x4a2270,
    arms: [[-0.2, 1.62, 0.42], [0.2, 1.62, 0.42]],
    delay: 0.8,
  });
  const theta = 0.3;
  const RH = ix.headRadius;
  const cy = RH * 1.06;
  decorate(ix.headPart, new SphereGeometry(0.055, 12, 8).scale(1.5, 0.85, 0.45), INK, [
    [-0.09, cy + 0.035, RH * 0.86, -0.35],
    [0.09, cy + 0.035, RH * 0.86, 0.35],
  ]);
  decorate(ix.headPart, new BoxGeometry(0.02, 0.02, 0.01), 0xffffff, [
    [-0.11, cy + 0.05, RH * 0.95],
    [0.07, cy + 0.05, RH * 0.95],
  ]);
  decorate(ix.headPart, new BoxGeometry(0.07, 0.014, 0.01), 0x1e3a24, [[0, cy - 0.11, RH * 0.86]]);
  const collar = new CylinderGeometry(0.38, 0.24, 0.6, 16, 1, true, Math.PI / 2 + 0.35, Math.PI - 0.7);
  add(collar, ROBE, ...ix.at(0, 1.76, -0.04), { delay: 1.2, rotation: [0, theta, 0] });
  add(collar.clone().scale(-0.96, 1, 0.96), LINING, ...ix.at(0, 1.76, -0.04), { delay: 1.2, rotation: [0, theta, 0], noInk: true });
  // The crown: a band and a fan of bone spikes, tallest in the middle.
  const band = ix.head[1] - G + RH * 0.42;
  cylinder(0.215, 0.205, 0.08, BONE, ...ix.at(0, band, 0), { delay: 1.3 }, 16);
  for (let k = 0; k < 9; k++) {
    const phi = -1.75 + k * 0.4375;
    const from = ix.at(Math.sin(phi) * 0.19, band + 0.05, Math.cos(phi) * 0.19 - 0.02);
    const to = ix.at(Math.sin(phi) * 0.44, band + 0.5 - 0.12 * Math.abs(phi), Math.cos(phi) * 0.26 - 0.1);
    const { length, rotation } = aim(from, to);
    add(new ConeGeometry(0.05, length, 4), BONE, ...from, { delay: 1.32 + k * 0.02, rotation });
    if (k % 2 === 0) {
      const gem = ix.at(Math.sin(phi) * 0.29, band + 0.26 - 0.06 * Math.abs(phi), Math.cos(phi) * 0.23 - 0.04);
      ball(0.03, CYAN, gem[0], gem[1] - 0.03, gem[2], { delay: 1.5 + k * 0.02, flat: true });
    }
  }

  // Her second pair of arms: a queue ticket held out, and the forms, stamped and stamped again.
  const lower: [Point, Point, Point][] = [
    [[-0.27, 1.5, 0.02], [-0.52, 1.2, 0.14], [-0.4, 1.08, 0.44]],
    [[0.27, 1.5, 0.02], [0.5, 1.18, 0.06], [0.34, 1.02, 0.36]],
  ];
  const lowHands = lower.map(([s, e, h], i) => {
    const [S, E, H] = [ix.at(...s), ix.at(...e), ix.at(...h)];
    ball(0.1, ROBE, S[0], S[1] - 0.1, S[2], { delay: 1.1 + i * 0.03 });
    limb(kit, S, E, 0.095, 0.09, ROBE, { delay: 1.12 + i * 0.03 });
    limb(kit, E, H, 0.08, 0.07, SKIN, { delay: 1.14 + i * 0.03 });
    ball(0.08, SKIN, H[0], H[1] - 0.08, H[2], { delay: 1.16 + i * 0.03 });
    return H;
  });
  const ticket = box(0.1, 0.16, 0.012, PAPER, lowHands[0][0], lowHands[0][1] - 0.02, lowHands[0][2] + 0.06, { delay: 1.5, rotation: [0, theta, 0.2] });
  decorate(ticket, new BoxGeometry(0.07, 0.02, 0.01), MAGENTA, [[0, 0.11, 0.008]]);
  const forms = box(0.24, 0.3, 0.05, PAPER, lowHands[1][0] + 0.02, lowHands[1][1] - 0.1, lowHands[1][2] + 0.06, { delay: 1.52, rotation: [0.1, theta, -0.1] });
  decorate(forms, new BoxGeometry(0.16, 0.014, 0.01), 0x9a9aa6, [0.08, 0.12, 0.16].map((y) => [0, y, 0.027] as Point));
  decorate(forms, new TorusGeometry(0.05, 0.01, 6, 18), MAGENTA, [[0.04, 0.23, 0.028]]);

  // The golden moon in her upper hands, six little conquered planets going round it.
  const moonAt = ix.at(0, 1.66, 0.45);
  const moon = orb(kit, moonAt, 0.17, 0xffe27a, 1.45);
  decorate(moon, new SphereGeometry(0.03, 8, 6).scale(1, 1, 0.4), 0xd8b040, [
    [-0.05, 0.22, 0.155],
    [0.06, 0.14, 0.158],
    [0.02, 0.27, 0.13],
  ]);
  const planets = new Group();
  planets.position.set(...moonAt);
  planets.rotation.x = 0.35;
  [CYAN, MAGENTA, 0x9b5cff, 0x2f8f4f, 0xff8a00, 0x9aa0ab].forEach((color, k) => {
    const a = (k / 6) * Math.PI * 2;
    const planet = ball(0.035, color, 0, 0, 0, { delay: 1.6 + k * 0.03 });
    planet.parent?.add(planets);
    planets.add(planet);
    planet.position.set(Math.sin(a) * 0.3, -0.035, Math.cos(a) * 0.3);
  });

  const glowFrom = new Color(0xffd60a);
  const glowTo = new Color(0xfff2b0);
  tick((t) => {
    // The shutter: down, up for a moment, down again just as she steps forward.
    const p = t % 6;
    const open = p < 3 ? 0 : p < 3.6 ? (p - 3) / 0.6 : p < 4.6 ? 1 : p < 4.8 ? 1 - (p - 4.6) / 0.2 : 0;
    const s = 1 - open * 0.7;
    shutter.position.y = G + 0.92 + 0.78 * (1 - s);
    shutter.children.forEach((child, i) => (child.scale.y = shutterScale[i] * s));
    lit.color.set(Math.floor(t * 2) % 2 ? 0x5a1a30 : MAGENTA);
    saucer.forEach((part, i) => (part.position.y = saucerY[i] + Math.sin(t * 1.4) * 0.06));
    fine.rotation.z = 0.15 + Math.sin(t * 7) * 0.08;
    rim[0].color.set(Math.floor(t * 3) % 2 ? CYAN : YELLOW);
    rim[1].color.set(Math.floor(t * 3) % 2 ? YELLOW : CYAN);
    colorOf(moon).lerpColors(glowFrom, glowTo, (Math.sin(t * 2.2) + 1) / 2);
    planets.rotation.y = t * 0.8;
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
