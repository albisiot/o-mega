import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, YELLOW, aim, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Maroon (P105): the alien technician his fleet left behind kneels in a scrapyard by the port
 * and brings a dead moped back to life with a touch, his hands glowing orange and its headlight
 * coming on. Behind him his own escape pod lies dented and dark, an umbrella turned into a dish
 * points at the sky, and up there the lights of the fleet keep drifting away.
 */
export function maroon(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SKIN = 0x8f8c86;
  const SUIT = 0x3f6a3a;
  const BAND = 0xe0701a;
  const DARK = 0x23222b;
  const F = octagonBase(kit, 0x1d1f26);
  const G = floor(kit, F, 0.06, 0x2e3038, 0x22242c, 0.6);

  // The scrapyard: a corrugated fence and a stack of tyres.
  const fence = box(3.0, 1.5, 0.06, 0x23707e, 0, G, -1.5, { delay: 0.1 });
  decorate(fence, new BoxGeometry(0.03, 1.5, 0.01), 0x1a525e, Array.from({ length: 19 }, (_, k) => [-1.44 + k * 0.16, 0.75, 0.031] as Point));
  [0, 1, 2].forEach((k) => add(new TorusGeometry(0.2, 0.09, 8, 16).rotateX(Math.PI / 2), DARK, 1.5, G + k * 0.17, 0.45, { delay: 0.2 + k * 0.04 }));

  // His escape pod, half sunk, dented, its light dead.
  const pod = add(new SphereGeometry(0.55, 20, 14).scale(1.25, 0.85, 1), 0x7a8090, -1.2, G - 0.12, -0.8, { delay: 0.3, rotation: [0, 0.5, 0.12] });
  decorate(pod, new CylinderGeometry(0.17, 0.17, 0.04, 16).rotateX(Math.PI / 2), 0x14303f, [[-0.3, 0.52, 0.5]]);
  decorate(pod, new TorusGeometry(0.17, 0.03, 6, 16), BAND, [[-0.3, 0.52, 0.51]]);
  decorate(pod, new BoxGeometry(0.16, 0.06, 0.04), 0x5a6070, [
    [-0.4, 0.6, 0.44, 0.4],
    [0.45, 0.3, 0.38, -0.3],
  ]);
  add(new ConeGeometry(0.16, 0.4, 4).scale(0.3, 1, 1), 0x7a8090, -1.75, G + 0.3, -1.0, { delay: 0.35, rotation: [0, 0.5, 0.9] });
  ball(0.07, 0x3a3a44, -1.15, G + 0.8, -0.85, { delay: 0.38 });

  // An umbrella on a pole, turned into a dish aimed at the sky, calling home.
  cylinder(0.035, 0.05, 2.1, DARK, 1.3, G, -1.0, { delay: 0.4 }, 8);
  const dish = add(new ConeGeometry(0.45, 0.2, 10), MAGENTA, 1.3, G + 2.0, -1.0, { delay: 0.45, rotation: [0.25, 0, 2.6] });
  decorate(dish, new BoxGeometry(0.02, 0.22, 0.02), 0x9a1c44, [0, 1, 2, 3, 4].map((k) => [Math.sin(k * 1.26) * 0.25, 0.1, Math.cos(k * 1.26) * 0.25] as Point));
  const beacon = ball(0.06, YELLOW, 1.1, G + 2.25, -0.98, { delay: 0.5, flat: true });
  const wire: Point[] = [
    [1.3, G + 0.4, -1.0],
    [0.3, G + 0.02, -1.25],
    [-0.72, G + 0.35, -0.95],
  ];
  wire.slice(1).forEach((to, i) => {
    const { length, rotation } = aim(wire[i], to);
    box(0.02, length, 0.02, INK, ...wire[i], { delay: 0.5, noInk: true, rotation });
  });

  // The fleet, three small lights leaving.
  const fleet = [
    [-0.5, 3.1, -1.4],
    [-0.85, 3.35, -1.6],
    [-0.2, 3.45, -1.7],
  ].map(([x, y, z], k) => add(new ConeGeometry(0.07, 0.24, 4).rotateZ(Math.PI / 2 + 0.3).scale(1, 0.5, 1), k ? CYAN : 0x9fe8ff, x, G + y, z, { delay: 0.6 + k * 0.05, flat: true, noInk: true }));
  const fleetAt = fleet.map((ship) => ship.position.clone());

  // The moped he is mending: a little scooter on its stand.
  const scooter = new Group();
  const moped = [
    add(new SphereGeometry(0.28, 14, 10).scale(0.8, 0.75, 1.35), 0x2a8fb0, 0, 0.16, -0.2, { delay: 0.7 }),
    add(new SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1.3), 0x2a8fb0, 0, 0.12, 0.5, { delay: 0.71 }),
    box(0.3, 0.06, 0.5, 0x23404b, 0, 0.16, 0.18, { delay: 0.72 }),
    box(0.3, 0.68, 0.24, 0x2a8fb0, 0, 0.14, 0.4, { delay: 0.74, rotation: [-0.12, 0, 0] }),
    cylinder(0.03, 0.03, 0.2, DARK, 0, 0.82, 0.48, { delay: 0.76 }, 8),
    box(0.5, 0.04, 0.04, DARK, 0, 1.0, 0.48, { delay: 0.78 }),
    box(0.26, 0.08, 0.45, 0x2a2622, 0, 0.6, -0.22, { delay: 0.8 }),
    ...[-0.45, 0.5].map((z) => add(new CylinderGeometry(0.16, 0.16, 0.08, 14).rotateZ(Math.PI / 2), DARK, 0, 0, z, { delay: 0.82 })),
  ];
  const headlight = ball(0.075, YELLOW, 0, 0.86, 0.55, { delay: 0.84, flat: true });
  moped.push(headlight);
  // Where his touch runs through the engine: orange veins on the side we see.
  decorate(moped[0], new BoxGeometry(0.04, 0.014, 0.22), ORANGE, [
    [0.215, 0.21, -0.04],
    [0.21, 0.28, 0.06],
    [0.205, 0.14, 0.02],
  ]);

  // Maroon: kneeling, grey and wrinkled, in a green suit with orange bands and his tank on his back.
  const facing = 0.35;
  const tech = figure(kit, {
    x: -0.3,
    z: -0.15,
    y: G,
    facing,
    height: 2.4,
    skin: SKIN,
    hair: { style: "bald", color: SKIN },
    face: { mouth: "frown", brows: "worried", marks: 0x6a6862 },
    top: { kind: "jacket", color: SUIT, accent: BAND },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x2a2622,
    belt: 0x4a3a2a,
    gloves: 0xffa040,
    arms: [[-0.18, 0.66, 0.62], [0.2, 0.72, 0.58]],
    legs: "kneel",
    delay: 1.0,
  });
  scooter.position.set(...tech.at(0, 0, 0.84));
  scooter.rotation.y = facing - Math.PI / 2;
  moped.forEach((part) => {
    const at = part.position.clone();
    part.parent?.add(scooter);
    scooter.add(part);
    part.position.copy(at);
  });
  // The ridges over his skull, running back.
  const top = tech.head[1] - G;
  [-0.09, 0, 0.09].forEach((dx, k) =>
    add(new SphereGeometry(0.06, 10, 8).scale(1, 0.8, 3.4), SKIN, ...tech.at(dx, top + (dx ? 0.13 : 0.18), -0.04), { delay: 1.5 + k * 0.02, rotation: [0, facing, 0] }),
  );
  // Orange bands round his arms.
  const shoulderY = 1.72 - 0.3;
  const arms: [Point, Point][] = [
    [[-0.4, shoulderY, 0], [-0.18, 0.66, 0.62]],
    [[0.4, shoulderY, 0], [0.2, 0.72, 0.58]],
  ];
  arms.forEach(([shoulder, hand], i) => {
    const side = i ? 1 : -1;
    const elbow: Point = [(shoulder[0] + hand[0]) / 2 + side * 0.14, (shoulder[1] + hand[1]) / 2 - 0.1, (shoulder[2] + hand[2]) / 2 - 0.04];
    [
      [shoulder, elbow],
      [elbow, hand],
    ].forEach(([a, b], k) => {
      const mid: Point = tech.at((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      const { rotation } = aim(tech.at(...a), tech.at(...b));
      add(new TorusGeometry(0.118, 0.035, 6, 16).rotateX(Math.PI / 2), BAND, mid[0], mid[1] - 0.035, mid[2], { delay: 1.6 + k * 0.03, rotation });
    });
  });
  // The tank on his back, with its ring of round vents.
  const tank = box(0.52, 0.62, 0.3, BAND, ...tech.at(0, shoulderY - 0.62, -0.38), { delay: 1.4, rotation: [0, facing, 0] });
  decorate(tank, new CylinderGeometry(0.07, 0.07, 0.03, 12).rotateX(Math.PI / 2), INK, [
    [-0.14, 0.15, -0.155],
    [0, 0.15, -0.155],
    [0.14, 0.15, -0.155],
    [-0.14, 0.33, -0.155],
    [0, 0.33, -0.155],
    [0.14, 0.33, -0.155],
  ]);
  const glows = tech.hands.map(([x, y, z], i) => ball(0.105, ORANGE, x, y - 0.105, z, { delay: 1.7 + i * 0.03, flat: true }));
  motes(8, ORANGE, 0.03, [...tech.at(0.1, 0.6, 0.75)] as Point, [...tech.at(0.25, 1.4, 0.95)] as Point, 2.0);

  const warm = new Color(ORANGE);
  const hot = new Color(0xffd060);
  tick((t) => {
    fleet.forEach((ship, k) => {
      const u = ((t * 0.08 + k * 0.33) % 1) * 0.6;
      ship.position.set(fleetAt[k].x - u * 0.8, fleetAt[k].y + u * 0.25, fleetAt[k].z - u * 0.3);
      ship.visible = u < 0.55;
    });
    beacon.visible = Math.floor(t * 2) % 3 !== 2;
    headlight.visible = !(t % 3.1 > 2.7 && Math.floor(t * 12) % 2 === 1);
    glows.forEach((glow, i) => colorOf(glow).lerpColors(warm, hot, (Math.sin(t * 4 + i) + 1) / 2));
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
