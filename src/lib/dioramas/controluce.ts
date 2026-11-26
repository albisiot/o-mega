import { BoxGeometry, Color, CylinderGeometry } from "three";
import { CYAN, MAGENTA, aim, cable, colorOf, jag, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, rubble, steps } from "@/lib/diorama-props";

/**
 * Controluce (P351): the dig photographer who came out of the Ora Zero in negative, among the
 * temple ruins at night: platinum hair, blue-white skin and pale glowing eyes, a teal field
 * jacket and backpack, an old film camera on her chest. She reaches out a hand that glows white
 * with magenta sparks, the temple doorway behind her lit gold, and her shadow on the ground is
 * white. Now and then she glitches, pieces of her jumping aside in magenta and cyan. The price:
 * no knack for machines, the film has spilled out of her camera in loops to the ground.
 */
export function controluce(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const STONE = 0x4a4e6a;
  const TEAL = 0x2a5a6a;
  const F = octagonBase(kit, 0x16141e);
  const G = floor(kit, F, 0.06, 0x2e2c3a, 0x22202c, 0.6);

  // The temple doorway, gold light inside, two steps up to it; broken columns and blocks.
  const DX = 0.75;
  const DZ = -1.35;
  add(new BoxGeometry(0.8, 2.05, 0.04), 0xffc860, DX, G, DZ - 0.18, { delay: 0.1, flat: true, noInk: true });
  [-0.56, 0.56].forEach((dx, i) => {
    const jamb = box(0.34, 2.2, 0.5, STONE, DX + dx, G, DZ, { delay: 0.12 + i * 0.03 });
    decorate(jamb, new BoxGeometry(0.02, 1.9, 0.01), 0x363a50, [[(i ? -1 : 1) * 0.08, 1.05, 0.255]]);
  });
  box(1.6, 0.32, 0.56, 0x5a5e7a, DX, G + 2.2, DZ, { delay: 0.18 });
  steps(kit, DX, DZ + 0.55, G, 0.2, { width: 0.8, count: 2, tread: 0.16, rise: 0.1, color: STONE });
  column(kit, -1.45, -0.95, G, 0.24, 2.3, true, 0x5a6488);
  column(kit, -0.55, -1.6, G, 0.28, 2.8, false, 0x5a6488);
  box(0.6, 0.4, 0.45, STONE, 1.55, G, 0.45, { delay: 0.3, rotation: [0, 0.4, 0] });
  box(0.45, 0.3, 0.4, 0x5a5e7a, 1.45, G + 0.4, 0.4, { delay: 0.34, rotation: [0, -0.2, 0.08] });
  rubble(kit, 1.25, 1.1, G, 0.36, 5, 0.35);

  // Controluce, stepping forward, reaching out.
  const facing = 0.3;
  const shooter = figure(kit, {
    x: -0.25,
    z: 0.35,
    y: G,
    facing,
    height: 2.35,
    skin: 0x9ab8d8,
    hair: { style: "short", color: 0xd4d8e2 },
    face: { mouth: "neutral", brows: "angry", eyes: 0xf8fcff, glow: true },
    top: { kind: "jacket", color: TEAL, accent: 0x1e4450 },
    bottom: { kind: "trousers", color: 0x2a4a5a },
    shoes: 0x1a2430,
    arms: [
      [-0.62, 1.85, 0.55],
      [0.5, 1.2, -0.2],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const at = shooter.at;
  const o = (delay: number) => ({ delay, rotation: [0, facing, 0] as Point });
  // Backpack and its straps; the camera on its strap.
  box(0.5, 0.62, 0.24, 0x23404b, ...at(0, 1.2, -0.36), o(1.2));
  [-1, 1].forEach((side) => {
    limb(kit, at(side * 0.19, 1.74, -0.22), at(side * 0.19, 1.76, 0.18), 0.03, 0.03, 0x1a2a30, { delay: 1.25 });
    limb(kit, at(side * 0.19, 1.76, 0.18), at(side * 0.2, 1.25, 0.26), 0.03, 0.03, 0x1a2a30, { delay: 1.26 });
  });
  const cameraAt = at(0, 1.22, 0.33);
  const body = box(0.32, 0.18, 0.12, 0x1a1a1e, ...cameraAt, o(1.3));
  decorate(body, new BoxGeometry(0.32, 0.05, 0.125), 0xb8bcc8, [[0, 0.155, 0]]);
  add(new CylinderGeometry(0.07, 0.08, 0.12, 14).rotateX(Math.PI / 2), 0x2a2a30, ...at(0.04, 1.22, 0.43), o(1.34));
  decorate(body, new BoxGeometry(0.06, 0.06, 0.01), CYAN, [[0.04, 0.09, 0.065]]);
  cable(kit, [at(-0.14, 1.32, 0.33), at(-0.17, 1.62, 0.2), at(0, 1.76, 0.05), at(0.17, 1.62, 0.2), at(0.14, 1.32, 0.33)], 0.014, 0x1a1a1e, 1.36);
  // The price: the film spilled out of the camera in loops down to the ground.
  const film = [at(0.17, 1.24, 0.36), at(0.3, 0.98, 0.46), at(0.24, 0.62, 0.56), at(0.42, 0.34, 0.66), at(0.3, 0.06, 0.84), at(0.6, 0.02, 0.96), at(0.78, 0.02, 0.7), at(0.55, 0.02, 0.52)];
  film.slice(1).forEach((to, k) => {
    const { length, rotation } = aim(film[k], to);
    const strip = box(0.075, length + 0.02, 0.008, 0x3a2614, ...film[k], { delay: 1.4 + k * 0.03, rotation, ink: 1.2 });
    decorate(
      strip,
      new BoxGeometry(0.012, 0.018, 0.012),
      0xd8c8a0,
      Array.from({ length: Math.floor(length / 0.07) }, (_, i) => [i % 2 ? 0.026 : -0.026, 0.04 + Math.floor(i / 2) * 0.14 + (i % 2) * 0.07, 0]),
    );
  });

  // Her white shadow, cast away from the doorway's light.
  const dir: [number, number] = [-0.5, 0.86];
  const feet = at(0, 0, 0);
  const shadow = (length: number, width: number, along: number, side: number, delay: number) =>
    box(width, 0.004, length, 0xf4f8ff, feet[0] + dir[0] * along + dir[1] * side, G + 0.002, feet[2] + dir[1] * along - dir[0] * side, {
      delay,
      flat: true,
      noInk: true,
      rotation: [0, Math.atan2(dir[0], dir[1]), 0],
    });
  shadow(1.3, 0.42, 0.75, 0, 0.9);
  shadow(0.7, 0.12, 1.25, -0.3, 0.92);
  add(new CylinderGeometry(0.19, 0.19, 0.004, 16), 0xf4f8ff, feet[0] + dir[0] * 1.55, G + 0.002, feet[2] + dir[1] * 1.55, { delay: 0.94, flat: true, noInk: true });

  // The hand glowing white, magenta sparks round it.
  const hand = shooter.hands[0];
  ball(0.13, 0xf8fcff, hand[0], hand[1] - 0.12, hand[2], { delay: 1.45, flat: true, noInk: true });
  const sparks = [0, 1, 2].map((k) => {
    const a = k * 2.1;
    const to: Point = [hand[0] + Math.cos(a) * 0.4, hand[1] + Math.sin(a) * 0.35 + 0.1, hand[2] + 0.15];
    return zigzag(kit, jag(hand, to, 4, 0.05, k + 2), 0.02, MAGENTA, 1.5 + k * 0.05);
  });

  // The glitch: now and then a piece of her jumps sideways and flashes.
  const pieces = shooter.parts;
  const rest = pieces.map((part) => part.position.x);
  const tints = pieces.map((part) => colorOf(part).clone());
  const flash = [new Color(MAGENTA), new Color(CYAN)];
  tick((t) => {
    const beat = Math.floor(t * 9);
    pieces.forEach((part, i) => {
      const noise = Math.sin(beat * 12.9898 + i * 78.233) * 43758.5453;
      const hit = t > 2 && Math.floor(t * 0.8) % 3 === 0 && noise - Math.floor(noise) > 0.8;
      part.position.x = rest[i] + (hit ? (i % 2 ? 0.09 : -0.09) : 0);
      colorOf(part).copy(hit ? flash[i % 2] : tints[i]);
    });
    sparks.forEach((spark, k) => spark.forEach((bar) => (bar.visible = Math.floor(t * 7 + k * 3) % 5 !== 0 || t === 0)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
