import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor, puddle, ring } from "@/lib/diorama-props";

/**
 * Hireling (P168): the night docker in her hi-vis raincoat, hood up and headlamp on, holds up
 * her time card by the punch clock of the container yard and frowns at it: the clock's hands
 * race, while round her the rain falls slowly, caught in her slower time. She notices nothing
 * behind her: a gull on a crate is stealing the sandwich out of her open lunchbox.
 */
export function hireling(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const DARK = 0x23222b;
  const STRIPE = 0xc8ccd4;
  const F = octagonBase(kit, 0x1a1c26);
  const G = floor(kit, F, 0.06, 0x2a2e3a, 0x1e2230, 0.5);

  // The yard: stacked containers, a crane leg, puddles catching the yellow lights.
  [
    [-0.9, 0, -1.3, 0x7a2f55],
    [-0.75, 0.6, -1.3, 0x1f7f9c],
    [0.65, 0, -1.55, 0x2a3a5a],
  ].forEach(([x, y, z, color], i) => {
    const can = box(1.4, 0.6, 0.6, color, x, G + y, z, { delay: 0.1 + i * 0.05 });
    decorate(can, new BoxGeometry(0.02, 0.5, 0.01), 0x14121c, Array.from({ length: 9 }, (_, k) => [-0.6 + k * 0.15, 0.3, 0.301] as Point));
  });
  const leg = box(0.18, 3.2, 0.18, YELLOW, 1.62, G, -0.95, { delay: 0.2 });
  decorate(leg, new BoxGeometry(0.015, 0.3, 0.01), INK, Array.from({ length: 10 }, (_, k) => [0, 0.2 + k * 0.3, 0.091, k % 2 ? 0.7 : -0.7] as [number, number, number, number]));
  puddle(kit, -0.3, 1.45, G, 0.3, 0.4, YELLOW);
  puddle(kit, 1.35, 0.8, G, 0.32, 0.3, MAGENTA);

  // The punch clock on its post, hands racing, and the rack of time cards.
  const CX = 0.95;
  const CZ = -0.25;
  const yaw = 0.35;
  cylinder(0.05, 0.05, 1.0, DARK, CX, G, CZ, { delay: 0.3 }, 8);
  const clock = box(0.42, 0.55, 0.22, 0x3a4252, CX, G + 1.0, CZ, { delay: 0.35, rotation: [0, yaw, 0] });
  decorate(clock, new CylinderGeometry(0.17, 0.17, 0.02, 20).rotateX(Math.PI / 2), 0xe8e2d0, [[0, 0.36, 0.115]]);
  decorate(
    clock,
    new BoxGeometry(0.015, 0.04, 0.01),
    INK,
    Array.from({ length: 12 }, (_, k) => [Math.sin((k * Math.PI) / 6) * 0.14, 0.36 + Math.cos((k * Math.PI) / 6) * 0.14, 0.13, -(k * Math.PI) / 6] as [number, number, number, number]),
  );
  decorate(clock, new BoxGeometry(0.2, 0.03, 0.01), INK, [[0, 0.1, 0.115]]);
  const dial: Point = [CX + Math.sin(yaw) * 0.14, G + 1.36, CZ + Math.cos(yaw) * 0.14];
  const hands = [
    [0.13, 0.022],
    [0.09, 0.03],
  ].map(([length, width], k) => {
    const hand = box(width, length, 0.01, k ? MAGENTA : INK, ...dial, { delay: 0.45 + k * 0.03, flat: true, noInk: true });
    hand.rotation.order = "YXZ";
    return hand;
  });
  const rack = box(0.3, 0.42, 0.06, DARK, CX + 0.38, G + 0.9, CZ - 0.12, { delay: 0.4, rotation: [0, yaw, 0] });
  decorate(rack, new BoxGeometry(0.06, 0.12, 0.01), 0xd8d2c4, [
    [-0.08, 0.42, 0.02],
    [0, 0.44, 0.02],
    [0.08, 0.41, 0.02],
  ]);

  // The lunchbox on a crate behind her, and the gull at her sandwich.
  crate(kit, -1.55, 0.15, G, 0.4, 0.5, 0x5e4a3a, 0.2);
  const lunch = box(0.3, 0.12, 0.2, 0x1f7f9c, -1.68, G + 0.5, 0.22, { delay: 0.55 });
  decorate(lunch, new BoxGeometry(0.22, 0.03, 0.12), 0xe8d8a8, [[0.02, 0.13, 0]]);
  box(0.3, 0.02, 0.2, 0x1f7f9c, -1.68, G + 0.62, 0.1, { delay: 0.58, rotation: [-1.1, 0, 0] });
  const GX = -1.33;
  const GZ = 0.12;
  add(new SphereGeometry(0.16, 12, 10).scale(1.4, 0.85, 0.85), 0xf2f0ea, GX, G + 0.5, GZ, { delay: 0.6, rotation: [0, 0.3, 0] });
  [-1, 1].forEach((side) => box(0.36, 0.03, 0.1, 0x9aa0ab, GX + 0.08, G + 0.7, GZ + side * 0.11, { delay: 0.62, rotation: [side * 0.25, 0.3, -0.1] }));
  const gullHead = ball(0.085, 0xf2f0ea, GX - 0.18, G + 0.72, GZ, { delay: 0.65 });
  decorate(gullHead, new ConeGeometry(0.025, 0.1, 6).rotateZ(Math.PI / 2), YELLOW, [[-0.12, 0.07, 0]]);
  decorate(gullHead, new BoxGeometry(0.12, 0.035, 0.07), 0xe8d8a8, [[-0.19, 0.06, 0]]);
  decorate(gullHead, new BoxGeometry(0.016, 0.016, 0.01), INK, [
    [-0.04, 0.1, 0.075],
    [-0.04, 0.1, -0.075],
  ]);

  // Hireling, hood up, time card raised, frowning at it.
  const theta = 0.3;
  const docker = figure(kit, {
    x: -0.2,
    z: 0.35,
    y: G,
    facing: theta,
    height: 2.3,
    skin: 0xe0b898,
    hair: { style: "long", color: 0x1f1b22 },
    face: { mouth: "frown", brows: "raised" },
    headwear: { kind: "hood", color: YELLOW },
    top: { kind: "coat", color: YELLOW, accent: 0x2a2a2a },
    bottom: { kind: "trousers", color: 0x2a2e3a },
    shoes: 0x2a2622,
    gloves: 0x2a2a2a,
    arms: ["down", [0.3, 1.72, 0.42]],
    delay: 0.8,
  });
  const { at } = docker;
  const turn: Point = [0, theta, 0];
  // Reflective bands on the coat, the ear defenders round her neck, the headlamp on the hood.
  [
    [0.33, 1.4, 0.74],
    [0.4, 0.55, 0.78],
  ].forEach(([r, y, squash], i) => add(new TorusGeometry(r, 0.03, 6, 24).rotateX(Math.PI / 2).scale(1, 1, squash), STRIPE, ...at(0, y, 0), { delay: 1.3 + i * 0.03, rotation: turn }));
  [-1, 1].forEach((side) => ball(0.075, 0xd8b400, ...at(side * 0.2, 1.72, 0.04), { delay: 1.35 }));
  const lamp = box(0.14, 0.08, 0.08, DARK, ...at(0, 2.36, 0.17), { delay: 1.4, rotation: turn });
  decorate(lamp, new CylinderGeometry(0.03, 0.03, 0.01, 10).rotateX(Math.PI / 2), 0xe8f8ff, [[0, 0.04, 0.045]]);
  const [, cardHand] = docker.hands;
  const card = box(0.17, 0.26, 0.012, 0xd8d2c4, cardHand[0] - 0.03, cardHand[1] - 0.05, cardHand[2] + 0.05, { delay: 1.45, rotation: [0, theta - 0.2, 0.1] });
  decorate(card, new BoxGeometry(0.13, 0.01, 0.005), 0x6a6a72, [0.06, 0.11, 0.16, 0.21].map((y) => [0, y, 0.008] as Point));
  decorate(card, new BoxGeometry(0.07, 0.016, 0.006), MAGENTA, [[0.03, 0.16, 0.009]]);

  // The rain: quick everywhere, slow inside the ring of her slower time.
  const [hx, , hz] = at(0, 0, 0);
  ring(kit, [hx, G + 0.01, hz], 0.85, CYAN, 1.5);
  const drops = Array.from({ length: 16 }, (_, k) => {
    const a = k * 2.4;
    const r = k % 2 ? 0.25 + (k % 5) * 0.13 : 1.0 + (k % 4) * 0.28;
    const x = k % 2 ? hx + Math.cos(a) * r : Math.cos(a) * r;
    const z = k % 2 ? hz + Math.sin(a) * r * 0.8 : Math.sin(a) * r;
    const slow = Math.hypot(x - hx, z - hz) < 0.85;
    const part = box(0.014, slow ? 0.07 : 0.2, 0.014, CYAN, x, G + 0.4 + ((k * 0.37) % 1) * 2.6, z, { delay: 1.2 + k * 0.02, flat: true, noInk: true });
    return { part, start: part.position.y - G, speed: slow ? 0.12 : 3.2 };
  });

  const gullY = gullHead.position.y;
  tick((t) => {
    // The clock races from twenty-one past two; her rain barely moves; the gull pecks.
    hands[0].rotation.set(0, yaw, -2.2 - t * 2.5);
    hands[1].rotation.set(0, yaw, -1.23 - t * 0.2);
    drops.forEach(({ part, start, speed }) => (part.position.y = G + 0.1 + ((((start - 0.1 - speed * t) % 3) + 3) % 3)));
    gullHead.position.y = gullY - (Math.sin(t * 5) > 0.6 ? 0.05 : 0);
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
