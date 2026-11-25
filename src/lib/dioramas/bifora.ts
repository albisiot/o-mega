import { BoxGeometry, CatmullRomCurve3, Color, CylinderGeometry, ExtrudeGeometry, Path, Shape, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { MAGENTA, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Bifora (P279): the last two Rifratti, one people split in two, stand back to back in a hall
 * of the Banco before a double arched window over the moonlit bay: one robed in cream, one in
 * charcoal, bald, the cracks on their heads glowing. Between them spins a coin, light on one
 * face and dark on the other: one of them will say yes. In front of them, the case of duelling
 * sabres they are paid to judge and never touch.
 */
export function bifora(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0x2a2f48;
  const MOON = 0xffe9a0;
  const F = octagonBase(kit, 0x1c1b26);
  const G = floor(kit, F, 0.06, 0x34344a, 0x262638, 0.45);

  // The night beyond the window: sky, the bay, the moon and its path on the water, a lighthouse.
  box(2.8, 2.3, 0.04, 0x141a34, 0, G + 0.6, -1.78, { delay: 0.05, noInk: true });
  box(2.8, 0.5, 0.06, 0x0f3048, 0, G + 0.6, -1.74, { delay: 0.08, noInk: true });
  add(new CylinderGeometry(0.24, 0.24, 0.03, 24).rotateX(Math.PI / 2), MOON, 0.62, G + 1.95, -1.7, { delay: 0.12, flat: true, noInk: true });
  const glints = [0.3, 0.22, 0.14, 0.08].map((w, k) => box(w, 0.025, 0.02, MOON, 0.62, G + 1.05 - k * 0.1, -1.7, { delay: 0.15 + k * 0.02, flat: true, noInk: true }));
  box(0.5, 0.18, 0.04, 0x0b1022, -0.75, G + 1.1, -1.72, { delay: 0.12, noInk: true });
  box(0.08, 0.42, 0.04, 0x0b1022, -0.55, G + 1.1, -1.71, { delay: 0.14, noInk: true });
  const beacon = box(0.06, 0.05, 0.03, MOON, -0.55, G + 1.52, -1.69, { delay: 0.16, flat: true, noInk: true });

  // The wall with its double arched window, magenta light round the arches.
  const wall = new Shape();
  wall.moveTo(-1.62, 0);
  wall.lineTo(1.62, 0);
  wall.lineTo(1.62, 3.2);
  wall.lineTo(-1.62, 3.2);
  wall.closePath();
  [-0.62, 0.62].forEach((cx) => {
    const hole = new Path();
    hole.moveTo(cx - 0.48, 0.7);
    hole.lineTo(cx + 0.48, 0.7);
    hole.lineTo(cx + 0.48, 2.2);
    hole.absarc(cx, 2.2, 0.48, 0, Math.PI, false);
    hole.lineTo(cx - 0.48, 0.7);
    wall.holes.push(hole);
  });
  const front = add(new ExtrudeGeometry(wall, { depth: 0.3, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, -0.15), STONE, 0, G, -1.45, { delay: 0.1, ink: 1.01 });
  [-0.62, 0.62].forEach((cx) => {
    decorate(front, new TorusGeometry(0.53, 0.035, 6, 20, Math.PI), MAGENTA, [[cx, 2.2, 0.16]]);
    decorate(front, new BoxGeometry(0.07, 1.5, 0.02), MAGENTA, [
      [cx - 0.53, 1.45, 0.16],
      [cx + 0.53, 1.45, 0.16],
    ]);
    decorate(front, new BoxGeometry(1.2, 0.08, 0.12), 0x3a4060, [[cx, 0.66, 0.18]]);
  });
  decorate(
    front,
    new BoxGeometry(0.42, 0.18, 0.02),
    0x323856,
    [
      [-1.35, 0.3, 0.16],
      [1.35, 0.5, 0.16],
      [-1.3, 2.9, 0.16],
      [1.3, 2.75, 0.16],
      [0, 3.0, 0.16],
    ],
  );
  cylinder(0.07, 0.08, 1.55, 0x5a6488, 0, G + 0.7, -1.28, { delay: 0.2 }, 10);
  box(0.22, 0.08, 0.2, 0x5a6488, 0, G + 2.25, -1.28, { delay: 0.22 });

  // The twins, back to back: cream on the left, charcoal on the right.
  const twin = (facing: number, robe: number, trim: number, delay: number): Figure => {
    const at: [number, number] = [0.37 * Math.sin(facing), 0.05 + 0.37 * Math.cos(facing)];
    return figure(kit, {
      x: at[0],
      z: at[1],
      y: G,
      facing,
      height: 2.5,
      build: "slim",
      skin: 0xb4bac6,
      hair: { style: "bald", color: 0x7a8090 },
      face: { mouth: "neutral", brows: "calm", eyes: 0x3a3f4a },
      top: { kind: "robe", color: robe, accent: trim },
      arms: ["crossed", "crossed"],
      delay,
    });
  };
  const light = twin(-0.5, 0xd8cfb4, 0xf4eedc, 0.8);
  const dark = twin(1.15, 0x2a2a34, 0x5a5a6a, 1.0);
  // The glowing cracks over their scalps.
  const crack = (who: Figure, path: Point[], delay: number) => {
    const [cx, cy, cz] = who.head;
    const r = who.headRadius * 1.02;
    const points = path.map(([dx, dy, dz]) => {
      const v = new Vector3(dx, dy, dz).normalize();
      return new Vector3(cx + v.x * r * 0.95, cy + v.y * r * 1.06, cz + v.z * r * 0.95);
    });
    const first = points[0];
    const tube = new TubeGeometry(new CatmullRomCurve3(points), 16, 0.016, 5).translate(-first.x, -first.y, -first.z);
    tube.computeBoundingBox();
    return add(tube, 0xfff0b8, first.x, first.y + (tube.boundingBox?.min.y ?? 0), first.z, { delay, flat: true, noInk: true });
  };
  const cracks = [light, dark].flatMap((who, i) => {
    const turn = i ? 1.15 : -0.5;
    const local = (x: number, y: number, z: number): Point => [x * Math.cos(turn) + z * Math.sin(turn), y, -x * Math.sin(turn) + z * Math.cos(turn)];
    return [
      crack(who, [local(0.15, 0.55, 0.8), local(0.3, 0.8, 0.45), local(0.2, 0.95, 0.05), local(0.45, 0.8, -0.35), local(0.7, 0.55, -0.4)], 1.6 + i * 0.1),
      crack(who, [local(-0.2, 0.65, 0.7), local(-0.45, 0.8, 0.3), local(-0.7, 0.6, 0.1), local(-0.85, 0.3, -0.15)], 1.65 + i * 0.1),
    ];
  });

  // The coin spinning above them: a light face and a dark face, a gold rim.
  const coin = add(new CylinderGeometry(0.17, 0.17, 0.035, 24).rotateX(Math.PI / 2), 0xd8b050, 0.05, G + 2.8, 0.25, { delay: 1.8 });
  decorate(coin, new CylinderGeometry(0.135, 0.135, 0.01, 24).rotateX(Math.PI / 2), 0xf4eedc, [[0, 0.17, 0.019]]);
  decorate(coin, new CylinderGeometry(0.135, 0.135, 0.01, 24).rotateX(Math.PI / 2), 0x23222b, [[0, 0.17, -0.019]]);

  // The case of duelling sabres on a small table, untouched.
  table(kit, 1.2, 0.95, G, 0.5, true, 0x3a3048, 0.62);
  const tray = box(0.62, 0.08, 0.34, 0x3a2420, 1.2, G + 0.66, 0.95, { delay: 0.6, rotation: [0, 0.3, 0] });
  decorate(tray, new BoxGeometry(0.56, 0.01, 0.28), 0x7a1e2e, [[0, 0.085, 0]]);
  decorate(tray, new BoxGeometry(0.5, 0.012, 0.025), 0xb8c0cc, [
    [0.02, 0.095, -0.05, 0],
    [0.02, 0.095, 0.06, 0],
  ]);
  decorate(tray, new BoxGeometry(0.06, 0.02, 0.06), 0xd8b050, [
    [-0.25, 0.1, -0.05],
    [-0.25, 0.1, 0.06],
  ]);
  box(0.62, 0.3, 0.03, 0x3a2420, 1.2 - 0.17 * Math.sin(0.3), G + 0.72, 0.95 - 0.17 * Math.cos(0.3), { delay: 0.65, rotation: [-0.35, 0.3, 0] });
  ball(0.04, 0xd8b050, 0.85, G + 0.7, 0.85, { delay: 0.7 });

  const dim = new Color(0x8a7a50);
  const bright = new Color(0xfff0b8);
  tick((t) => {
    coin.rotation.set(0.35, 0.9 + t * 2.6, 0);
    coin.position.y = G + 2.8 + Math.sin(t * 1.3) * 0.06;
    const k = (Math.sin(t * 1.6) + 1) / 2;
    cracks.forEach((c, i) => colorOf(c).lerpColors(dim, bright, i < 2 ? k : 1 - k));
    glints.forEach((g, i) => (g.visible = (Math.floor(t * 3) + i) % 4 !== 0));
    beacon.visible = Math.floor(t * 1.5) % 2 === 0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
