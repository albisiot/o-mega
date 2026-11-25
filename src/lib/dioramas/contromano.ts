import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { INK, ORANGE, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { bollard, floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Contromano (P215): on a rainy harbour street at dusk, under a wall of clocks that all run
 * backwards, the man who remembers only the next forty-one hours stands in a coat and hat
 * covered in paper notes, bandaged forearms, a fat leather folder of tomorrows under his arm.
 * Now and then a note peels off his coat and floats away: what he has already forgotten. A boat
 * waits at the quay behind him.
 */
export function contromano(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const PAPER = 0xe8dcc0;
  const BRICK = 0x3a3040;
  const MAGENTA_DARK = 0x7a2f55;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2e2c3a, 0x1e1c28, 0.3);

  // The wall of clocks.
  const wall = box(2.6, 2.9, 0.3, BRICK, -0.75, G, -1.5, { delay: 0.1, ink: 1.02, rotation: [0, 0.2, 0] });
  decorate(wall, new BoxGeometry(2.6, 0.03, 0.01), shade(BRICK, 0.75), [0.6, 1.2, 1.8, 2.4].map((y) => [0, y, 0.155] as Point));
  const hands: Group[] = [];
  (
    [
      [-0.7, 2.3, 0.3],
      [0.35, 2.15, 0.24],
      [-0.25, 1.45, 0.26],
      [0.95, 1.2, 0.22],
      [-1.05, 0.9, 0.2],
    ] as Point[]
  ).forEach(([dx, y, r], i) => {
    const c: Point = [-0.75 + dx * Math.cos(0.2) + 0.2 * Math.sin(0.2), G + y, -1.5 - dx * Math.sin(0.2) + 0.2 * Math.cos(0.2)];
    const face = add(new CylinderGeometry(r, r, 0.06, 24).rotateX(Math.PI / 2), PAPER, c[0], c[1] - r, c[2], { delay: 0.2 + i * 0.04, rotation: [0, 0.2, 0] });
    decorate(face, new TorusGeometry(r * 0.98, 0.02, 6, 28), 0x5a3a28, [[0, r, 0.035]]);
    decorate(face, new BoxGeometry(0.02, 0.04, 0.01), INK, [0, 1, 2, 3].map((k) => [Math.sin((k * Math.PI) / 2) * r * 0.78, r + Math.cos((k * Math.PI) / 2) * r * 0.78, 0.035, (k * Math.PI) / 2] as [number, number, number, number]));
    [0.55, 0.8].forEach((length, k) =>
      hands.push(add(new BoxGeometry(0.025, r * length, 0.01).translate(0, (r * length) / 2, 0), INK, c[0] + 0.04 * Math.sin(0.2), c[1], c[2] + 0.04 * Math.cos(0.2), { delay: 0.3 + i * 0.04, noInk: true, rotation: [0, 0.2, i * 1.3 + k * 2] })),
    );
  });
  const lantern = wallLantern(kit, 0.45, -1.42, G + 2.4, 0.35, ORANGE);

  // The quay behind him: dark water, a stone edge, a moored boat with its mast.
  box(1.2, 0.03, 1.4, 0x0e3a4e, 1.25, G, -0.95, { delay: 0.15, noInk: true, rotation: [0, 0.2, 0] });
  box(0.12, 0.12, 1.6, 0x5d6680, 0.58, G, -0.85, { delay: 0.18, rotation: [0, 0.2, 0] });
  bollard(kit, 0.6, 0.15, G, 0.3);
  // Moored across the water: hull, deck, mast and the furled sail on its boom.
  const keel: Point = [0, 1.45, 0];
  add(new SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(0.55, 0.5, 1.25), MAGENTA_DARK, 1.25, G - 0.05, -1.0, { delay: 0.3, rotation: keel });
  add(new CylinderGeometry(0.25, 0.25, 0.03, 18).scale(1, 1, 2.3), 0x4a3628, 1.25, G + 0.18, -1.0, { delay: 0.32, rotation: keel });
  cylinder(0.025, 0.03, 1.7, 0x3e3028, 1.1, G + 0.2, -0.98, { delay: 0.35 }, 6);
  add(new CylinderGeometry(0.06, 0.04, 0.75, 8).rotateX(Math.PI / 2), PAPER, 1.45, G + 0.55, -1.03, { delay: 0.38, rotation: keel });
  puddle(kit, -0.9, 1.0, G, 0.4, 0.42, ORANGE);
  puddle(kit, 0.95, 1.15, G, 0.45, 0.3, 0x16c8ff);

  // Contromano.
  const facing = 0.25;
  const man = figure(kit, {
    x: -0.15,
    z: 0.3,
    y: G,
    facing,
    height: 2.45,
    skin: 0xc89070,
    hair: { style: "short", color: 0x9aa0ab },
    face: { mouth: "neutral", brows: "worried", marks: 0xa06850 },
    headwear: { kind: "hat", color: 0x3a3030, accent: 0x2a2020 },
    top: { kind: "coat", color: 0x3a3a46, accent: 0x5a5048 },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    shoes: 0x2a2220,
    arms: [[-0.12, 1.2, 0.38], [0.5, 0.95, 0.2]],
    delay: 0.7,
  });
  const { at } = man;
  // Bandages round both forearms.
  man.hands.forEach((hand, i) =>
    [0.12, 0.2].forEach((k, j) => {
      const elbow = man.elbows[i];
      const p: Point = [hand[0] + (elbow[0] - hand[0]) * k * 2, hand[1] + (elbow[1] - hand[1]) * k * 2, hand[2] + (elbow[2] - hand[2]) * k * 2];
      cylinder(0.105, 0.105, 0.07, 0xe8e2d0, p[0], p[1] - 0.035, p[2], { delay: 1.2 + j * 0.02, noInk: j > 0 }, 10);
    }),
  );
  // The folder of tomorrows under his right arm.
  const folder = box(0.42, 0.55, 0.12, 0x8a4a28, ...at(-0.22, 0.88, 0.36), { delay: 1.3, rotation: [0.1, facing + 0.5, 0.2] });
  decorate(folder, new BoxGeometry(0.46, 0.04, 0.13), PAPER, [
    [0.02, 0.55, 0],
    [0.02, 0.49, 0.005],
  ]);

  // The notes: all over the coat, round the hat; three of them will fly off.
  const notes: Group[] = [];
  const note = (lx: number, ly: number, lz: number, yaw: number, lean: number, delay: number) =>
    notes.push(box(0.13, 0.17, 0.012, PAPER, ...at(lx, ly, lz), { delay, rotation: [0, facing + yaw, lean], ink: 1.1 }));
  let k = 0;
  [
    [1.62, 0.36, 0.27, [-1.3, -0.6, 0.6, 1.3]],
    [1.42, 0.38, 0.28, [-1.45, -0.85, 0.85, 1.45]],
    [1.2, 0.36, 0.27, [-1.3, -0.7, 0.75, 1.35]],
    [0.92, 0.42, 0.32, [-1.4, -0.9, -0.3, 0.3, 0.9, 1.4]],
    [0.66, 0.46, 0.35, [-1.3, -0.75, -0.2, 0.35, 0.85, 1.35]],
  ].forEach(([y, rx, rz, angles]) =>
    (angles as number[]).forEach((a) => {
      note(Math.sin(a) * (rx as number), (y as number) - 0.08, Math.cos(a) * (rz as number), a, ((k * 7) % 5 - 2) * 0.12, 1.3 + k * 0.015);
      k++;
    }),
  );
  const crown = man.top - G + 0.12;
  [-1.2, -0.6, 0, 0.6, 1.2, 2.2, 3.0, 3.8].forEach((a, i) => note(Math.sin(a) * 0.21, crown, Math.cos(a) * 0.21, a, 0, 1.6 + i * 0.02));
  const flyers = [3, 9, 15].map((i) => ({ part: notes[i], rest: notes[i].position.clone(), spin: notes[i].rotation.z }));

  // Rain.
  const rain = Array.from({ length: 14 }, (_, i) => {
    const x = -1.8 + ((i * 37) % 36) / 10;
    const z = -0.6 + ((i * 53) % 24) / 10;
    return box(0.012, 0.22, 0.012, 0x9fd8ff, x, G + 3, z, { delay: 1.5, flat: true, noInk: true });
  });

  tick((t) => {
    // Every clock runs backwards.
    hands.forEach((hand, i) => (hand.rotation.z = i * 1.3 + t * (i % 2 ? 0.25 : 1.6)));
    flyers.forEach(({ part, rest, spin }, i) => {
      const u = ((t + i * 2.2) % 6.6) / 6.6;
      const lift = u < 0.5 ? 0 : (u - 0.5) / 0.5;
      part.position.set(rest.x + lift * (0.6 + i * 0.2), rest.y + lift * (1.4 + i * 0.3), rest.z + lift * 0.3);
      part.rotation.z = spin + lift * 6;
      part.visible = lift < 0.95;
    });
    rain.forEach((drop, i) => (drop.position.y = G + 0.05 + (1 - ((t * 1.6 + i * 0.37) % 1)) * 3.2));
    lantern.visible = Math.floor(t * 6) % 23 !== 11;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
