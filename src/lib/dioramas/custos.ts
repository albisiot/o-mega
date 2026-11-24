import { BoxGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { MAGENTA, YELLOW, archMouth, archedWall, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Custos (P149): the butler and archivist of a noble house stands in the palazzo's archive,
 * shelves of books to the ceiling, a library ladder, a marble bust. Under his arm the red volume
 * missing from the shelf; behind him, past a velvet rope, the barred gate of the room where the
 * truth goes, glowing and padlocked; the keys swing from his white-gloved hand.
 */
export function custos(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WOOD = 0x3a2620;
  const SHELF = 0x5e4a3a;
  const BRASS = 0xc8a040;
  const BOOKS = [0x8a2030, 0x1f5f6e, 0x3a2a5a, 0x2f4a3a, 0x6a2a4a];
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x3a2e2a, 0x2a201c, 0.35);

  /** Rows of books on a case's face, at `face` along its normal; rows run along x or z; `gap` leaves a slot empty. */
  const fill = (part: Group, rows: number, from: number, to: number, face: number, alongX: boolean, gap?: [number, number]) => {
    const sets = new Map<string, Point[]>();
    for (let r = 0; r < rows; r++) {
      const y = 0.12 + r * 0.5;
      decorate(part, new BoxGeometry(alongX ? to - from : 0.04, 0.04, alongX ? 0.04 : to - from), SHELF, [alongX ? [(from + to) / 2, y, face] : [face, y, (from + to) / 2]]);
      let p = from + 0.03;
      let k = r * 3;
      while (p < to - 0.14) {
        const w = 0.09 + ((k * 7) % 4) * 0.02;
        const h = 0.3 + ((k * 5) % 3) * 0.05;
        if (!(gap && r === gap[0] && Math.abs(p - gap[1]) < 0.1)) {
          const key = `${w}|${h}|${k % BOOKS.length}`;
          const spot: Point = alongX ? [p + w / 2, y + 0.02 + h / 2, face] : [face, y + 0.02 + h / 2, p + w / 2];
          sets.set(key, [...(sets.get(key) ?? []), spot]);
        }
        p += w;
        k++;
      }
    }
    sets.forEach((spots, key) => {
      const [w, h, c] = key.split("|").map(Number);
      decorate(part, new BoxGeometry(alongX ? w - 0.01 : 0.05, h, alongX ? 0.05 : w - 0.01), BOOKS[c], spots);
    });
  };

  // The bookcase along the left wall (one red volume missing at eye level), and one at the back.
  const left = box(0.35, 3.1, 2.0, WOOD, -1.62, G, -0.4, { delay: 0.1, ink: 1.02 });
  fill(left, 6, -0.95, 0.95, 0.16, false, [3, 0.1]);
  decorate(left, new BoxGeometry(0.01, 0.34, 0.12), 0x120e14, [[0.176, 1.82, 0.1]]);
  const back = box(1.35, 3.1, 0.3, WOOD, -0.72, G, -1.32, { delay: 0.12, ink: 1.02 });
  fill(back, 6, -0.62, 0.62, 0.14, true);

  // The wall with the barred gate; past it, the lit room where the truth goes.
  const AX = 0.65;
  add(archedWall(1.9, 3.1, 0.25, { x: AX - 0.55, half: 0.5, spring: 1.35 }), 0x2e2a3e, 0.55, G, -1.5, { delay: 0.14, ink: 1.02 });
  const light = add(archMouth(0.5, 1.35), 0xffd27a, AX, G, -1.66, { delay: 0.18, flat: true, noInk: true });
  for (let k = 0; k < 7; k++) {
    const dx = -0.42 + k * 0.14;
    const h = 1.35 + Math.sqrt(0.25 - dx * dx) - 0.03;
    cylinder(0.016, 0.016, h, 0x1a1a22, AX + dx, G, -1.45, { delay: 0.22 + k * 0.01, noInk: true }, 6);
  }
  [0.3, 1.0].forEach((y) => box(1.0, 0.04, 0.04, 0x1a1a22, AX, G + y, -1.43, { delay: 0.26, noInk: true }));
  const lock = box(0.16, 0.18, 0.08, BRASS, AX, G + 0.86, -1.38, { delay: 0.3 });
  decorate(lock, new BoxGeometry(0.025, 0.06, 0.01), 0x1a1a22, [[0, 0.08, 0.041]]);
  add(new TorusGeometry(0.055, 0.016, 6, 14, Math.PI), 0x8a93a3, AX, G + 1.04, -1.38, { delay: 0.32 });
  motes(10, 0xffe08a, 0.02, [AX - 0.45, G + 0.2, -1.4], [AX + 0.45, G + 1.8, -0.9], 0.6);

  // The velvet rope in front of it.
  [-0.05, 1.3].forEach((x, i) => {
    cylinder(0.03, 0.03, 0.9, 0x23222b, x, G, -0.85 + i * 0.1, { delay: 0.35 }, 8);
    ball(0.055, BRASS, x, G + 0.88, -0.85 + i * 0.1, { delay: 0.37 });
  });
  cable(kit, [[-0.05, G + 0.85, -0.85], [0.62, G + 0.62, -0.8], [1.3, G + 0.85, -0.75]], 0.03, MAGENTA, 0.4);

  // The library ladder against the shelves, and the bust on its plinth.
  [0.05, 0.42].forEach((z) => limb(kit, [-0.95, G, z], [-1.4, G + 3.0, z], 0.03, 0.03, SHELF, { delay: 0.4 }));
  for (let k = 0; k < 7; k++) {
    const u = (k + 0.6) / 7.5;
    box(0.04, 0.04, 0.4, SHELF, -0.95 - 0.45 * u, G + 3.0 * u, 0.235, { delay: 0.42 + k * 0.01 });
  }
  box(0.42, 0.95, 0.42, 0x6a7088, -1.05, G, 1.05, { delay: 0.45 });
  add(new SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.3, 0.8, 0.9), 0xb8bcc8, -1.05, G + 0.95, 1.05, { delay: 0.5 });
  const bust = ball(0.16, 0xb8bcc8, -1.05, G + 1.1, 1.05, { delay: 0.52 });
  decorate(bust, new BoxGeometry(0.2, 0.06, 0.05), 0x9a9eaa, [[0, 0.06, 0.11]]);

  // Custos: grey hair and moustache, high-collared navy jacket, white gloves, the red volume.
  const facing = 0.3;
  const butler = figure(kit, {
    x: 0.4,
    z: 0.4,
    y: G,
    facing,
    height: 2.45,
    build: "slim",
    skin: 0xd8b098,
    hair: { style: "short", color: 0x9a9aa0 },
    face: { mouth: "neutral", brows: "calm", beard: "moustache", beardColor: 0xb0b0b6 },
    top: { kind: "uniform", color: 0x1e2a44, accent: BRASS },
    bottom: { kind: "trousers", color: 0x1a2236 },
    shoes: 0x1a1a1e,
    gloves: 0xf0ece4,
    scarf: 0x1e2a44,
    arms: [[-0.12, 1.42, 0.36], "down"],
    delay: 0.8,
  });
  const book = box(0.3, 0.38, 0.08, 0x8a2030, ...butler.at(-0.02, 1.25, 0.3), { delay: 1.3, rotation: [0, facing - 0.25, 0.2] });
  decorate(book, new BoxGeometry(0.02, 0.38, 0.082), YELLOW, [[-0.14, 0.19, 0]]);
  decorate(book, new BoxGeometry(0.12, 0.02, 0.01), YELLOW, [
    [0.02, 0.27, 0.042],
    [0.02, 0.11, 0.042],
  ]);
  // His keys, swinging from the left hand.
  const hand = butler.hands[1];
  const ring = add(new TorusGeometry(0.06, 0.012, 6, 16), BRASS, hand[0], hand[1] - 0.2, hand[2], { delay: 1.4, rotation: [0, facing, 0] });
  const keys = [-0.035, 0.035].map((dx, i) => box(0.03, 0.2, 0.012, BRASS, hand[0] + dx, hand[1] - 0.42, hand[2] + 0.01, { delay: 1.42 + i * 0.02, rotation: [0, facing, dx * 4] }));
  const swing = new Group();
  swing.position.set(hand[0], hand[1] - 0.06, hand[2]);
  ring.parent?.add(swing);
  [ring, ...keys].forEach((part) => {
    part.position.sub(swing.position);
    swing.add(part);
  });

  const lit = colorOf(light).clone();
  tick((t) => {
    swing.rotation.z = Math.sin(t * 1.8) * 0.18;
    swing.rotation.x = Math.sin(t * 1.3) * 0.08;
    colorOf(light).copy(lit).multiplyScalar(0.85 + 0.15 * Math.sin(t * 1.5));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
