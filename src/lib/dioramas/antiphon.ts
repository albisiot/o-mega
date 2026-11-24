import { BoxGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, lamp, puddle } from "@/lib/diorama-props";

/**
 * Antiphon (P111): the heresiarch of the Figli dell'Ultima, hooded in violet, a blank silver mask
 * with a gaping round mouth, stands on the wet street before a temple portico and holds up one
 * bare grey hand. A street exorcist reads his formula at him: the cyan rings of the spell reach
 * the hand and fly back magenta, said backwards, at the man who cast them. The street lamp
 * beside the heretic is dead: he has no energy of his own.
 */
export function antiphon(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const STONE = 0x5a5470;
  const VIOLET = 0x3e2458;
  const STOLE = 0x8a8a92;
  const F = octagonBase(kit, 0x1a1826);
  const G = floor(kit, F, 0.06, 0x2a2836, 0x1e1c28, 0.55);

  // The temple portico: steps, three columns, the beam and the pediment.
  box(1.8, 0.15, 0.95, STONE, 0.55, G, -1.25, { delay: 0.1, ink: 1.02 });
  box(1.7, 0.15, 0.8, 0x666080, 0.55, G + 0.15, -1.3, { delay: 0.13, ink: 1.02 });
  [-0.05, 0.55, 1.15].forEach((x, i) => column(kit, x, -1.35, G + 0.3, 0.16 + i * 0.04, 1.9, false, 0x7a7494));
  box(1.75, 0.22, 0.6, STONE, 0.55, G + 2.2, -1.35, { delay: 0.3, ink: 1.02 });
  const gable = new Shape();
  gable.moveTo(-0.88, 0);
  gable.lineTo(0.88, 0);
  gable.lineTo(0, 0.42);
  gable.closePath();
  add(new ExtrudeGeometry(gable, { depth: 0.5, bevelEnabled: false }), 0x666080, 0.55, G + 2.42, -1.6, { delay: 0.34 });

  // A lamp lit far off; the lamp beside him dead.
  lamp(kit, -1.55, -0.65, G, 0.4, 2.2);
  const dead = lamp(kit, 1.5, 0.35, G, 0.44, 2.1);
  colorOf(dead).set(0x3a3a44);
  puddle(kit, -0.3, 1.35, G, 0.5, 0.42, YELLOW);
  puddle(kit, 1.2, 1.15, G, 0.52, 0.3, MAGENTA);

  // The exorcist, book in hand, reading his formula at him.
  const priest = figure(kit, {
    x: -1.62,
    z: 1.05,
    y: G,
    facing: 1.45,
    height: 2.2,
    skin: 0xe0b090,
    hair: { style: "short", color: 0x8a8a8a },
    face: { mouth: "open", brows: "raised", glasses: "round" },
    headwear: { kind: "hat", color: 0x1e1e28, accent: 0x1e1e28 },
    top: { kind: "robe", color: 0x1e1e28 },
    scarf: 0xe8e2d0,
    arms: [[-0.15, 1.3, 0.38], [0.36, 1.62, 0.48]],
    delay: 0.6,
  });
  const book = box(0.24, 0.03, 0.3, 0xe8e2d0, ...priest.hands[0], { delay: 1.2, rotation: [0.5, 1.5, 0] });
  decorate(book, new BoxGeometry(0.012, 0.035, 0.3), 0x5a2a2a, [[0, 0, 0]]);

  // Antiphon: violet hood and robe, the silver mask with its round mouth, a grey stole.
  const facing = -0.2;
  const heretic = figure(kit, {
    x: 0.35,
    z: -0.05,
    y: G,
    facing,
    height: 2.6,
    build: "slim",
    skin: 0x9a9a9a,
    face: { mask: "full", maskColor: 0xd8dce4, mouth: "none", brows: "none", eyes: 0x3a3a44 },
    headwear: { kind: "hood", color: VIOLET },
    top: { kind: "robe", color: VIOLET, sleeves: "none" },
    cape: 0x34204a,
    arms: [[-0.48, 1.8, 0.36], "down"],
    delay: 0.8,
  });
  const u = 2.6 / 2.4;
  const RH = heretic.headRadius;
  decorate(heretic.headPart, new SphereGeometry(0.05, 12, 10).scale(0.85, 1.25, 0.4), INK, [[0, RH * 1.06 - 0.1 * u, RH * 0.85]]);
  const band = (from: Point, to: Point, delay: number) => {
    const [a, b] = [heretic.at(...from), heretic.at(...to)];
    const part = box(0.13, aim(a, b).length, 0.03, STOLE, ...a, { delay, rotation: aim(a, b).rotation });
    decorate(part, new BoxGeometry(0.1, 0.012, 0.01), 0x6a6a72, [0.2, 0.45, 0.7].map((y) => [0, y, 0.016] as Point));
    return part;
  };
  band([-0.12 * u, 1.76 * u, 0.2], [-0.15 * u, 0.62 * u, 0.36], 1.4);
  band([0.2 * u, 1.74 * u, 0.2], [-0.2 * u, 1.05 * u, 0.28], 1.45);

  // The spell: rings going in cyan along the low lane, coming back magenta along the high one.
  const from: Point = priest.hands[1];
  const palm: Point = heretic.hands[0];
  const face: Point = [priest.head[0], priest.head[1], priest.head[2]];
  const arc: Point = [(palm[0] + face[0]) / 2, Math.max(palm[1], face[1]) + 0.45, (palm[2] + face[2]) / 2];
  const along = (path: Point[], k: number): Point => {
    const s = Math.min(path.length - 1.001, k * (path.length - 1));
    const i = Math.floor(s);
    const f = s - i;
    return [0, 1, 2].map((n) => path[i][n] + (path[i + 1][n] - path[i][n]) * f) as Point;
  };
  const turnIn = Math.atan2(palm[0] - from[0], palm[2] - from[2]);
  // Each wave is half a ring seen from the side: ")" going in, "(" coming back.
  const rings = [0, 1, 2, 3, 4, 5, 6, 7].map((k) =>
    add(new TorusGeometry(0.14, 0.024, 6, 16, Math.PI).rotateZ(k < 4 ? -Math.PI / 2 : Math.PI / 2), k < 4 ? CYAN : MAGENTA, 0, 0, 0, {
      delay: 1.6 + k * 0.03,
      flat: true,
      noInk: true,
      rotation: [0, turnIn - Math.PI / 2, 0],
    }),
  );
  const place = (t: number) =>
    rings.forEach((ring, k) => {
      const back = k >= 4;
      const p = ((t * 0.35 + (k % 4) / 4 + (back ? 0.12 : 0)) % 1) * 0.9 + 0.05;
      const [x, y, z] = back ? along([palm, arc, face], p) : along([from, palm], p);
      ring.position.set(x, y - 0.164, z);
    });
  place(0);
  const flash = add(new SphereGeometry(0.13, 12, 10), 0xffe6f0, palm[0], palm[1] - 0.13, palm[2], { delay: 1.7, flat: true, noInk: true });

  tick((t) => {
    place(t);
    flash.visible = t === 0 || (t * 0.35 * 4) % 1 < 0.35;
    colorOf(flash).set((t * 0.35 * 4) % 1 < 0.15 ? 0xffffff : 0xffb0d0);
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
