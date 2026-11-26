import { BoxGeometry, Color, CylinderGeometry, DodecahedronGeometry, TorusGeometry, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, railing } from "@/lib/diorama-props";

/**
 * Falla (P343): the Lete's head of security in the turbine hall, black tactical gear and a plate
 * carrier, a scowl and grey stubble: he has driven his fist into the side of a concrete pillar
 * where only he could see the flaw, and the crack runs glowing up its face and across the floor
 * while chunks burst out. Cracks glow on the generator too. The price: the security tablet he
 * should have used lies at his feet, its screen cracked like everything else.
 */
export function falla(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const CONCRETE = 0x6a6e7a;
  const STEEL = 0x2a2e3a;
  const F = octagonBase(kit, 0x1a1c26);
  const G = floor(kit, F, 0.06, 0x262a36, 0x1e4a5e, 0.6);

  /** A glowing crack drawn on a face of a part, through points of that face (x, y) at depth z. */
  const glows: MeshBasicMaterial[] = [];
  const crack = (part: Group, points: [number, number][], z: number) => {
    for (let k = 1; k < points.length; k++) {
      const [x1, y1] = points[k - 1];
      const [x2, y2] = points[k];
      const length = Math.hypot(x2 - x1, y2 - y1);
      glows.push(decorate(part, new BoxGeometry(0.03, length + 0.02, 0.012), YELLOW, [[(x1 + x2) / 2, (y1 + y2) / 2, z, Math.atan2(-(x2 - x1), y2 - y1)]]));
    }
  };

  // The turbine hall: a generator drum on its plinth behind a railing, cyan rings, magenta lights.
  const plinth = box(1.5, 0.22, 0.95, STEEL, -0.6, G, -1.35, { delay: 0.1 });
  decorate(plinth, new BoxGeometry(1.3, 0.05, 0.01), MAGENTA, [[0, 0.11, 0.48]]);
  const drum = add(new CylinderGeometry(0.5, 0.5, 1.3, 24).rotateZ(Math.PI / 2), 0x2f6f86, -0.6, G + 0.22, -1.35, { delay: 0.16 });
  decorate(drum, new TorusGeometry(0.505, 0.022, 6, 24).rotateY(Math.PI / 2), CYAN, [
    [-0.42, 0.5, 0],
    [0.42, 0.5, 0],
  ]);
  crack(drum, [[-0.1, 0.25], [0.02, 0.45], [-0.05, 0.62], [0.08, 0.8]], 0.5);
  cylinder(0.12, 0.12, 1.4, STEEL, -0.6, G + 0.95, -1.55, { delay: 0.24 }, 10);
  railing(kit, [-1.3, -0.72], [0.15, -0.72], G, 0.3, 0.55, 0x3a3f4c);

  // Falla, fist driven into the pillar, the other cocked back.
  const facing = 0.7;
  const guard = figure(kit, {
    x: -0.55,
    z: 0.45,
    y: G,
    facing,
    height: 2.5,
    build: "broad",
    skin: 0xc89070,
    hair: { style: "short", color: 0x2a2420 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x2a2420, marks: 0x8a5a44 },
    top: { kind: "uniform", color: 0x22252e, accent: 0x3a3f4c },
    bottom: { kind: "trousers", color: 0x1e2028 },
    shoes: 0x16161c,
    gloves: 0x1a1c22,
    belt: 0x30343e,
    arms: [
      [-0.5, 1.5, -0.25],
      [1.17, 1.66, 0.3],
    ],
    legs: "wide",
    delay: 0.8,
  });
  const turn: [number, number, number] = [0, facing, 0];
  const vest = box(0.64, 0.55, 0.14, 0x2e323c, ...guard.at(0, 1.2, 0.3), { delay: 1.3, rotation: turn });
  decorate(vest, new BoxGeometry(0.15, 0.13, 0.05), 0x3a3f4c, [
    [-0.2, 0.14, 0.08],
    [0, 0.14, 0.08],
    [0.2, 0.14, 0.08],
  ]);
  [-1, 1].forEach((side) => box(0.09, 0.04, 0.5, 0x2e323c, ...guard.at(side * 0.22, 1.77, 0.04), { delay: 1.32, rotation: turn }));

  // The pillar, cracked from the fist up its face; a dent where the fist went in.
  const P = guard.at(1.57, 0, 0.2);
  const pillar = box(0.8, 3.1, 0.8, CONCRETE, P[0], G, P[2], { delay: 0.2, rotation: turn });
  decorate(pillar, new BoxGeometry(0.82, 0.07, 0.82), MAGENTA, [[0, 2.85, 0]]);
  decorate(pillar, new BoxGeometry(0.02, 0.34, 0.34), 0x1a1a22, [[-0.402, 1.66, 0.1]]);
  const hit: [number, number] = [-0.4, 1.66];
  crack(pillar, [hit, [-0.22, 1.82], [-0.02, 1.74], [0.14, 2.05], [0.38, 2.2]], 0.405);
  crack(pillar, [hit, [-0.2, 1.48], [-0.04, 1.55], [0.1, 1.25], [0.28, 1.12], [0.38, 0.8]], 0.405);
  crack(pillar, [hit, [-0.26, 2.0], [-0.1, 2.3], [-0.16, 2.62]], 0.405);
  crack(pillar, [[-0.2, 1.48], [-0.3, 1.1], [-0.14, 0.7], [-0.26, 0.3], [-0.18, 0]], 0.405);
  glows.push(decorate(pillar, new BoxGeometry(0.012, 0.03, 0.36), YELLOW, [[-0.405, 1.9, -0.1], [-0.405, 1.4, -0.12]]));
  // The crack runs on across the floor, to his feet and out towards us (points in his frame).
  [
    [[1.17, 0.3], [0.98, 0.4], [0.85, 0.2], [0.62, 0.26], [0.45, 0.08]],
    [[0.98, 0.4], [0.95, 0.75], [0.72, 0.92], [0.78, 1.25]],
  ].forEach((line, j) =>
    line.slice(1).forEach(([b, c], k) => {
      const from = guard.at(line[k][0], 0, line[k][1]);
      const to = guard.at(b, 0, c);
      const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
      const part = box(length + 0.03, 0.006, 0.035, YELLOW, (from[0] + to[0]) / 2, G, (from[2] + to[2]) / 2, {
        delay: 1.5 + j * 0.1 + k * 0.03,
        flat: true,
        noInk: true,
        rotation: [0, Math.atan2(-(to[2] - from[2]), to[0] - from[0]), 0],
      });
      glows.push((part.children[0] as Mesh).material as MeshBasicMaterial);
    }),
  );

  // Chunks of concrete bursting from the blow.
  const impact = guard.at(1.17, 1.66, 0.3);
  const chunks = Array.from({ length: 9 }, (_, k) => {
    const local: Point = [-0.25 + Math.sin(k * 2.3) * 0.25, Math.cos(k * 1.9) * 0.45, 0.45 + (k % 3) * 0.25];
    const end = guard.at(1.17 + local[0], 1.66 + local[1], 0.3 + local[2]);
    const dir: Point = [end[0] - impact[0], end[1] - impact[1], end[2] - impact[2]];
    const chunk = add(new DodecahedronGeometry(0.05 + (k % 3) * 0.025), k % 2 ? CONCRETE : 0x8a8e98, ...impact, { delay: 1.6 + k * 0.02, rotation: [k, k * 2, 0] });
    return { chunk, dir, phase: k / 9 };
  });

  // The price: the security tablet on the floor, its screen cracked.
  const tablet = box(0.38, 0.03, 0.27, 0x1a1c22, -1.3, G, 1.05, { delay: 0.6, rotation: [0, 0.5, 0] });
  const screen = decorate(tablet, new BoxGeometry(0.32, 0.004, 0.21), CYAN, [[0, 0.032, 0]]);
  decorate(tablet, new BoxGeometry(0.2, 0.006, 0.014), YELLOW, [[0.02, 0.035, 0.03]]);
  decorate(tablet, new BoxGeometry(0.014, 0.006, 0.12), YELLOW, [[-0.08, 0.035, -0.02]]);

  const hot = new Color(YELLOW);
  const white = new Color(0xfff6c8);
  const screenOn = new Color(CYAN);
  const screenOff = new Color(0x0e3a4a);
  tick((t) => {
    const k = (Math.sin(t * 3) + 1) / 2;
    glows.forEach((material) => material.color.lerpColors(hot, white, k));
    chunks.forEach(({ chunk, dir, phase }) => {
      const u = (t * 0.6 + phase) % 1;
      chunk.position.set(impact[0] + dir[0] * u, impact[1] + dir[1] * u - u * u * 0.4, impact[2] + dir[2] * u);
      chunk.rotation.set(t * 3 + phase * 6, t * 2, 0);
      chunk.visible = u > 0.04 && u < 0.92;
    });
    screen.color.copy(Math.floor(t * 5) % 9 === 4 ? screenOff : screenOn);
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
