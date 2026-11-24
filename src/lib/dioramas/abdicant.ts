import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, facade, floor, puddle } from "@/lib/diorama-props";

/**
 * Abdicant (P143): the ambulance driver in his soaked hi-vis jacket stands in the rain by his
 * ambulance, doors open and lights turning, helmet in hand, thumb jerked back at the poster of
 * his caped cousin on the palazzo wall. At his feet, in a wet cardboard box, the family cape and
 * mask he never wore: the debut he gave up, and every power that went with it.
 */
export function abdicant(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const WHITE = 0xe6e4dc;
  const HIVIS = 0xff7a1a;
  const SILVER = 0xdfe6ee;
  const GLASS = 0x16303e;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x262a36, 0x1a1d26, 0.45);

  // The palazzo wall with the poster of the cousin, and a column of the old town.
  facade(kit, 0.65, -1.5, G, 0.1, { width: 1.8, height: 2.9, color: 0x3a2f4e, windows: 3, floors: 3, lit: 0x9fd8ff });
  const poster = box(0.8, 1.05, 0.03, 0x23405a, 0.85, G + 0.7, -1.335, { delay: 0.3 });
  decorate(poster, new BoxGeometry(0.025, 1.3, 0.005), 0x2f6f86, [0, 1, 2, 3, 4, 5].map((k) => [0, 0.6, 0.016, (k * Math.PI) / 6] as [number, number, number, number]));
  decorate(poster, new BoxGeometry(0.36, 0.5, 0.006), MAGENTA, [[0, 0.5, 0.02, 0.12]]);
  decorate(poster, new BoxGeometry(0.13, 0.32, 0.008), 0x9fe8ff, [[0, 0.52, 0.024]]);
  decorate(poster, new BoxGeometry(0.05, 0.28, 0.008), 0x9fe8ff, [
    [-0.04, 0.24, 0.024, 0.1],
    [0.04, 0.24, 0.024, -0.1],
    [0.12, 0.78, 0.024, -0.5],
  ]);
  decorate(poster, new CylinderGeometry(0.06, 0.06, 0.008, 16).rotateX(Math.PI / 2), 0xe0b090, [[0, 0.76, 0.026]]);
  decorate(poster, new BoxGeometry(0.1, 0.03, 0.008), INK, [[0, 0.77, 0.032]]);
  column(kit, 1.6, -0.55, G, 0.2, 2.9, false, 0x6c8aa0);

  // The ambulance, rear doors open on the stretcher, lights on the roof.
  const AX = -1.05;
  box(0.9, 0.16, 1.75, 0x23222b, AX, G + 0.08, -0.8, { delay: 0.3 });
  const body = box(0.95, 1.05, 1.15, WHITE, AX, G + 0.2, -0.55, { delay: 0.35 });
  decorate(body, new BoxGeometry(0.01, 0.1, 1.15), ORANGE, [
    [0.476, 0.42, 0],
    [-0.476, 0.42, 0],
  ]);
  decorate(body, new BoxGeometry(0.8, 0.85, 0.01), GLASS, [[0, 0.5, 0.576]]);
  decorate(body, new BoxGeometry(0.6, 0.04, 0.012), CYAN, [[0, 0.88, 0.578]]);
  const cab = box(0.95, 0.75, 0.55, WHITE, AX, G + 0.2, -1.4, { delay: 0.4 });
  decorate(cab, new BoxGeometry(0.01, 0.28, 0.36), GLASS, [
    [0.476, 0.5, 0],
    [-0.476, 0.5, 0],
  ]);
  decorate(cab, new BoxGeometry(0.01, 0.1, 0.55), ORANGE, [[0.476, 0.2, 0]]);
  [-0.15, -1.4].forEach((z) =>
    [-1, 1].forEach((side) => add(new CylinderGeometry(0.17, 0.17, 0.1, 14).rotateZ(Math.PI / 2), 0x1a1a20, AX + side * 0.45, G, z, { delay: 0.45 })),
  );
  box(0.36, 0.1, 0.62, WHITE, AX, G + 0.52, 0.05, { delay: 0.5 });
  box(0.36, 0.04, 0.6, 0x23707e, AX, G + 0.62, 0.05, { delay: 0.52 });
  [-1, 1].forEach((side) => {
    const door = box(0.04, 0.95, 0.45, WHITE, AX + side * 0.52, G + 0.25, 0.25, { delay: 0.55, rotation: [0, -side * 0.3, 0] });
    decorate(door, new BoxGeometry(0.012, 0.25, 0.3), GLASS, [[side * 0.021, 0.68, 0]]);
    decorate(door, new BoxGeometry(0.012, 0.1, 0.45), ORANGE, [[side * 0.021, 0.37, 0]]);
  });
  const lights = [-1, 1].map((side) => box(0.16, 0.12, 0.16, CYAN, AX + side * 0.3, G + 1.25, -0.08, { delay: 0.6, flat: true }));
  const cabLight = box(0.5, 0.1, 0.14, MAGENTA, AX, G + 0.95, -1.4, { delay: 0.62, flat: true });

  // The family cape and mask he never wore, in a soaked box at his feet.
  const crate = box(0.5, 0.34, 0.4, 0x7a5c44, 1.3, G, 0.75, { delay: 0.7, rotation: [0, 0.4, 0] });
  decorate(crate, new BoxGeometry(0.5, 0.012, 0.01), 0x5a4232, [[0, 0.2, 0.201]]);
  box(0.42, 0.08, 0.32, MAGENTA, 1.3, G + 0.3, 0.75, { delay: 0.75, rotation: [0, 0.4, 0] });
  box(0.3, 0.02, 0.4, MAGENTA, 1.42, G + 0.12, 1.05, { delay: 0.78, rotation: [1.25, 0.4, 0] });
  const mask = box(0.2, 0.07, 0.02, INK, 1.3, G + 0.38, 0.78, { delay: 0.8, rotation: [-1.2, 0.4, 0] });
  decorate(mask, new BoxGeometry(0.05, 0.03, 0.01), 0x7a5c44, [
    [-0.05, 0.035, 0.012],
    [0.05, 0.035, 0.012],
  ]);
  puddle(kit, -0.35, 1.25, G, 0.4, 0.45, CYAN);
  puddle(kit, 0.75, 1.55, G, 0.45, 0.3, MAGENTA);

  // Abdicant: hi-vis jacket and trousers with reflective bands, helmet in his right hand.
  const facing = 0.25;
  const driver = figure(kit, {
    x: 0.35,
    z: 0.45,
    y: G,
    facing,
    height: 2.5,
    skin: 0xd6a07e,
    hair: { style: "curly", color: 0x2a1e18 },
    face: { mouth: "smirk", brows: "raised", beard: "stubble", beardColor: 0x2a1e18 },
    top: { kind: "jacket", color: HIVIS, accent: 0x24302a },
    bottom: { kind: "trousers", color: 0xf06a10 },
    shoes: 0x1a1a1e,
    arms: ["down", [0.44, 2.0, -0.12]],
    delay: 0.9,
  });
  const u = 2.5 / 2.4;
  [
    [1.3, 0.33],
    [1.55, 0.345],
  ].forEach(([y, r], i) =>
    add(new TorusGeometry(r * u, 0.025, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.74), SILVER, ...driver.at(0, y * u, 0.01), {
      delay: 1.3 + i * 0.03,
      flat: true,
      noInk: true,
      rotation: [0, facing, 0],
    }),
  );
  [-1, 1].forEach((side) =>
    [0.28, 0.44].forEach((y, i) =>
      add(new TorusGeometry(0.112 * u, 0.022, 6, 16).rotateX(Math.PI / 2), SILVER, ...driver.at(side * 0.17 * u, y * u, 0.025), { delay: 1.35 + i * 0.03, flat: true, noInk: true }),
    ),
  );
  // The thumb jerked back at the poster.
  const [helmetHand, thumbHand] = driver.hands;
  box(0.04, 0.1, 0.04, 0xd6a07e, thumbHand[0], thumbHand[1] + 0.04, thumbHand[2], { delay: 1.4, rotation: [-0.6, 0, -0.3] });
  const helmet = add(new SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), WHITE, helmetHand[0] - 0.12, helmetHand[1] - 0.2, helmetHand[2] + 0.05, {
    delay: 1.4,
    rotation: [0, 0, 1.2],
  });
  decorate(helmet, new BoxGeometry(0.22, 0.05, 0.3), ORANGE, [[0, 0.12, 0]]);

  // Rain: streaks falling and starting again from the top.
  const streaks: [Group, number][] = [];
  for (let k = 0; k < 22; k++) {
    const r = (n: number) => {
      const v = Math.sin((k + 1) * 91.7 + n * 47.3) * 3758.5453;
      return v - Math.floor(v);
    };
    const x = -1.9 + r(1) * 3.8;
    const z = -1.0 + r(2) * 2.8;
    if (Math.abs(x) + Math.abs(z) > 3.0) continue;
    streaks.push([box(0.012, 0.24, 0.012, 0x9fd8ff, x, G + r(3) * 3.8, z, { delay: 1.6, flat: true, noInk: true }), r(3) * 3.8]);
  }

  tick((t) => {
    // The roof lights take turns; the cab bar blinks.
    const beat = Math.floor(t * 4) % 2;
    lights.forEach((light, i) => (light.visible = i === beat));
    cabLight.visible = Math.floor(t * 4) % 4 !== 3;
    streaks.forEach(([streak, start]) => (streak.position.y = G + ((((start - t * 3.4) % 3.8) + 3.8) % 3.8)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
