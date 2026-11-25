import { BoxGeometry, type BufferGeometry, ConeGeometry, type Group, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, jag, limb, octagonBase, zigzag, type Framing, type Kit, type PartOptions, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Interregno (P261): the regent of the Novecielo on the throne he has held in trust for nineteen
 * years, a window of stars behind him. Pale, black hair slicked back, eyes of gold, a towering
 * gold collar and a red robe; violet lightning crackles from both raised hands. The true crown
 * waits on its cushion beside him, untouched under a cobweb, and cobwebs tie his hem to the dais:
 * he has not stood up once.
 */
export function interregno(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const THRONE = 0x2a2a40;
  const ROBE = 0xa02838;
  const BOLT = 0xc070ff;
  const WEB = 0xd8d8e8;
  const F = octagonBase(kit, 0x16141e);
  const G = floor(kit, F, 0.06, 0x24202e, 0x1a1724, 0.5);
  /** A geometry built round its centre, put with its centre at a point. */
  const put = (geometry: BufferGeometry, color: number, [x, y, z]: Point, options: PartOptions) => {
    geometry.computeBoundingBox();
    return add(geometry, color, x, y + (geometry.boundingBox?.min.y ?? 0), z, options);
  };

  // The window of stars between two pillars.
  const sky = box(1.9, 3.1, 0.08, 0x0c1030, 0, G, -1.62, { delay: 0.06, ink: 1.02 });
  const stars = Array.from({ length: 22 }, (_, k) => [((k * 37) % 17) / 17 - 0.5, 0.15 + ((k * 53) % 29) / 29 * 2.85, 0.045] as Point).map(([x, y, z]) => [x * 1.75, y, z] as Point);
  const twinkle = decorate(sky, new BoxGeometry(0.05, 0.05, 0.01), 0xffffff, stars.filter((_, k) => k % 2));
  decorate(sky, new BoxGeometry(0.045, 0.045, 0.01), CYAN, stars.filter((_, k) => !(k % 2)));
  const planet = ball(0.12, 0xbfefff, 0.76, G + 1.7, -1.54, { delay: 0.2, flat: true });
  decorate(planet, new TorusGeometry(0.19, 0.012, 6, 28).rotateX(1.2), MAGENTA, [[0, 0.12, 0]]);
  decorate(sky, new BoxGeometry(0.9, 0.08, 0.01), 0x8a2a8a, [
    [0.45, 2.5, 0.042, -0.6],
    [0.6, 2.2, 0.042, -0.55],
  ]);
  [-1.15, 1.15].forEach((x, i) => {
    const pillar = box(0.3, 3.4, 0.3, 0x2a3048, x, G, -1.5, { delay: 0.1 + i * 0.03 });
    decorate(pillar, new BoxGeometry(0.02, 3.3, 0.01), CYAN, [[0, 1.7, 0.151]]);
  });

  // The dais, the throne on it.
  const dais = box(2.6, 0.3, 1.8, 0x2a2638, 0, G, -0.45, { delay: 0.14, ink: 1.02 });
  decorate(dais, new BoxGeometry(2.6, 0.02, 0.01), CYAN, [[0, 0.27, 0.901]]);
  box(2.6, 0.15, 0.3, 0x322e42, 0, G, 0.6, { delay: 0.18 });
  const D = G + 0.3;
  box(1.0, 0.6, 0.75, THRONE, 0, D, -0.6, { delay: 0.3 });
  const back = box(1.1, 2.3, 0.2, THRONE, 0, D + 0.6, -0.92, { delay: 0.34 });
  decorate(back, new BoxGeometry(0.04, 2.2, 0.01), YELLOW, [
    [-0.5, 1.15, 0.101],
    [0.5, 1.15, 0.101],
  ]);
  decorate(back, new BoxGeometry(0.16, 0.16, 0.01), YELLOW, [[0, 2.05, 0.101, Math.PI / 4]]);
  add(new ConeGeometry(0.78, 0.6, 4).rotateY(Math.PI / 4).scale(1, 1, 0.26), THRONE, 0, D + 2.9, -0.92, { delay: 0.38 });
  [-0.6, 0.6].forEach((x, i) => {
    box(0.18, 0.35, 0.7, THRONE, x, D + 0.6, -0.6, { delay: 0.4 + i * 0.03 });
    ball(0.08, YELLOW, x, D + 0.95, -0.28, { delay: 0.45 + i * 0.03 });
  });

  // Interregno, seated, hands raised.
  const regent = figure(kit, {
    x: 0,
    z: -0.55,
    y: D,
    height: 2.6,
    build: "slim",
    skin: 0xe8dcd8,
    hair: { style: "short", color: 0x14121c },
    face: { mouth: "smirk", brows: "calm", eyes: YELLOW, glow: true },
    top: { kind: "robe", color: ROBE },
    shoes: 0x2a1a20,
    arms: [
      [-0.66, 1.65, 0.28],
      [0.66, 1.65, 0.28],
    ],
    legs: "sit",
    delay: 0.8,
  });
  const at = regent.at;
  // The towering gold collar and the gold plate on his chest.
  [-1, 1].forEach((side) => put(new BoxGeometry(0.32, 0.8, 0.04).rotateZ(-side * 0.3), YELLOW, at(side * 0.26, 1.8, -0.13), { delay: 1.2 }));
  put(new ConeGeometry(0.2, 0.5, 3).rotateZ(Math.PI).scale(1, 1, 0.2), YELLOW, at(0, 1.12, 0.25), { delay: 1.22 });
  // Fingers spread.
  regent.hands.forEach((hand, i) => {
    const side = i ? 1 : -1;
    [-0.5, -0.15, 0.2, 0.55].forEach((lean, k) =>
      limb(kit, hand, [hand[0] + side * (0.04 + Math.sin(lean) * 0.08), hand[1] + Math.cos(lean) * 0.13, hand[2] + 0.02], 0.016, 0.012, 0xe8dcd8, { delay: 1.3 + k * 0.01 }),
    );
  });

  // The lightning: two sets of arcs from each hand, taking turns.
  const arcs: Group[][] = [0, 1].map((set) =>
    regent.hands.flatMap((hand, i) => {
      const side = i ? 1 : -1;
      return [
        [0.75, 0.35, 0.1],
        [0.85, -0.15, 0.35],
        [0.45, 0.75, -0.15],
      ].flatMap(([dx, dy, dz], k) =>
        zigzag(kit, jag([hand[0], hand[1] + 0.1, hand[2]], [hand[0] + side * dx * (set ? 0.9 : 1), hand[1] + dy + set * 0.12, hand[2] + dz], 6, 0.07, set * 5 + k + i * 2), k ? 0.022 : 0.03, k === 1 ? 0xf0d8ff : BOLT, 1.6),
      );
    }),
  );

  // The true crown on its cushion, under a cobweb.
  cylinder(0.14, 0.18, 0.75, 0x3a3650, 1.0, D, 0.15, { delay: 0.5 });
  box(0.4, 0.1, 0.4, 0x8a1e50, 1.0, D + 0.75, 0.15, { delay: 0.55 });
  cylinder(0.13, 0.13, 0.1, YELLOW, 1.0, D + 0.85, 0.15, { delay: 0.6 }, 12);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    add(new ConeGeometry(0.035, 0.11, 4), YELLOW, 1.0 + Math.sin(a) * 0.11, D + 0.95, 0.15 + Math.cos(a) * 0.11, { delay: 0.62 });
  }
  /** A thread of cobweb between two points. */
  const thread = (from: Point, to: Point, delay: number) => limb(kit, from, to, 0.005, 0.005, WEB, { delay, flat: true, noInk: true });
  const top: Point = [1.0, D + 1.06, 0.15];
  [
    [0.8, D + 0.85, -0.05],
    [1.2, D + 0.85, 0.35],
    [1.2, D + 0.85, -0.05],
    [0.8, D + 0.85, 0.35],
  ].forEach((corner, k) => thread(top, corner as Point, 1.8 + k * 0.02));

  // Cobwebs from his hem to the dais and the throne's foot: he never gets up.
  const hems: Point[] = [at(-0.3, 0.3, 0.1), at(0.32, 0.3, 0.05), at(-0.18, 0.14, 0.6), at(0.2, 0.14, 0.62)];
  const floorAt: Point[] = [
    [-0.6, D, -0.1],
    [0.62, D, -0.12],
    [-0.45, D, 0.35],
    [0.5, D, 0.35],
  ];
  hems.forEach((hem, k) => {
    thread(hem, floorAt[k], 1.9 + k * 0.02);
    thread([(hem[0] + floorAt[k][0]) / 2, (hem[1] + D) / 2, (hem[2] + floorAt[k][2]) / 2], [floorAt[k][0], D + 0.25, floorAt[k][2] - 0.05], 1.95);
  });

  tick((t) => {
    const flash = Math.floor(t * 7) % 3;
    arcs.forEach((set, k) => set.forEach((piece) => (piece.visible = k === 0 ? flash !== 2 : flash !== 0)));
    twinkle.color.setHex(Math.floor(t * 2) % 3 === 1 ? 0x6a6aa0 : 0xffffff);
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
