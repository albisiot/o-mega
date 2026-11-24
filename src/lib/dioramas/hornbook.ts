import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Hornbook (P018): the telepathic teacher of the Lanterne at night school, the moon in the tall
 * window, a finger to his temple and golden rings turning round his head. Threads of thought run
 * from his two pupils to him: the boy leaning over to copy from his neighbour is caught before he
 * starts. Reading minds is no help in a fight: a paper plane circles, aimed at his head.
 */
export function hornbook(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const WOOD = 0x5e4a3a;
  const PAPER = 0xf4f0e6;
  const F = octagonBase(kit, 0x1e2230);
  const G = floor(kit, F, 0.06, 0x3a3440, 0x2a2430, 0.32);

  // The classroom wall: a tall window with the moon, and a map of shapes pinned beside it.
  const wall = box(3.2, 2.8, 0.12, 0x1f2c40, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(1.0, 1.6, 0.01), 0x3a4a60, [[0.75, 1.45, 0.061]]);
  decorate(wall, new BoxGeometry(0.88, 1.48, 0.01), 0x14304a, [[0.75, 1.45, 0.064]]);
  decorate(wall, new CylinderGeometry(0.13, 0.13, 0.01, 20).rotateX(Math.PI / 2), 0xf0e6c0, [[0.98, 1.88, 0.068]]);
  decorate(wall, new BoxGeometry(0.03, 1.48, 0.01), 0x3a4a60, [[0.75, 1.45, 0.072]]);
  decorate(wall, new BoxGeometry(0.88, 0.03, 0.01), 0x3a4a60, [
    [0.75, 1.1, 0.072],
    [0.75, 1.75, 0.072],
  ]);
  decorate(wall, new BoxGeometry(0.8, 0.52, 0.01), 0xd8ccb0, [[-0.7, 1.75, 0.061]]);
  decorate(wall, new SphereGeometry(0.1, 8, 6).scale(1.4, 1, 0.1), 0x3a8a6a, [
    [-0.9, 1.82, 0.066],
    [-0.55, 1.65, 0.066],
    [-0.5, 1.88, 0.066],
  ]);

  // His desk: a globe and a pile of exercise books.
  const desk = table(kit, -1.25, -0.75, G, 0.3, false, WOOD);
  decorate(desk, new BoxGeometry(0.3, 0.04, 0.22), PAPER, [
    [0.25, 0.07, 0.05],
    [0.25, 0.11, 0.06],
    [0.25, 0.15, 0.04],
  ]);
  kit.cylinder(0.02, 0.06, 0.18, INK, -1.45, G + 0.8, -0.8, { delay: 0.5 }, 8);
  ball(0.15, 0x2f8f9f, -1.45, G + 0.95, -0.8, { delay: 0.55 });

  // Hornbook: grey hair and beard, glasses, a tweed jacket and tie, a finger on his temple.
  const teacher = figure(kit, {
    x: -0.45,
    z: -0.1,
    y: G,
    facing: 0.6,
    height: 2.45,
    skin: 0xd8a888,
    hair: { style: "wild", color: 0x9aa0aa },
    face: { mouth: "neutral", brows: "raised", glasses: "round", glassesColor: 0x14121c, beard: "stubble", beardColor: 0x9a9ea8 },
    top: { kind: "suit", color: 0x2f4a52 },
    bottom: { kind: "trousers", color: 0x2a3440 },
    shoes: 0x2a2622,
    arms: [
      [-0.3, 2.16, 0.12],
      [0.55, 1.55, 0.55],
    ],
    delay: 0.8,
  });
  const [temple] = teacher.hands;
  kit.cylinder(0.014, 0.014, 0.1, PAPER, temple[0], temple[1] - 0.12, temple[2] + 0.03, { delay: 1.4, noInk: true }, 6);
  const [hx, hy, hz] = teacher.head;
  const rings = [0.38, 0.46, 0.54].map((r, k) => {
    const part = add(new TorusGeometry(r, 0.012, 6, 40).rotateX(Math.PI / 2), YELLOW, hx, hy - 0.012 + 0.06 * k - 0.04, hz, { delay: 1.5 + k * 0.06, flat: true, noInk: true });
    decorate(part, new SphereGeometry(0.03, 8, 6), YELLOW, [[r, 0.012, 0]]);
    part.rotation.order = "YXZ";
    return part;
  });

  // His pupils at their desks, facing him; the one on the left leans over to copy.
  const toTeacher = -2.3;
  const pupil = (x: number, z: number, turn: number, color: number, hair: number, delay: number) => {
    const kid = figure(kit, {
      x,
      z,
      y: G,
      facing: toTeacher + turn,
      height: 1.5,
      build: "child",
      skin: 0xd8a888,
      hair: { style: "short", color: hair },
      face: { mouth: "neutral", brows: "calm" },
      top: { kind: "hoodie", color },
      bottom: { kind: "trousers", color: 0x2a3040 },
      arms: [
        [-0.12, 0.72, 0.42],
        [0.14, 0.72, 0.4],
      ],
      legs: "sit",
      delay,
    });
    // A cap of hair: the figure's own short hair lets the scalp show.
    const cap = add(new SphereGeometry(kid.headRadius * 1.04, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.97, 1.06, 1), hair, ...kid.head, { delay: delay + 0.4 });
    cap.rotation.order = "YXZ";
    cap.rotation.set(-0.5, toTeacher + turn, 0);
    const r = [0, toTeacher, 0] as Point;
    const chair = kid.at(0, 0, -0.06);
    box(0.36, 0.05, 0.36, WOOD, chair[0], G + 0.33, chair[2], { delay: delay - 0.2, rotation: r });
    box(0.06, 0.33, 0.06, 0x23222b, chair[0], G, chair[2], { delay: delay - 0.22, noInk: true });
    const back = kid.at(0, 0, -0.26);
    box(0.36, 0.36, 0.04, WOOD, back[0], G + 0.38, back[2], { delay: delay - 0.18, rotation: r });
    return kid;
  };
  /** A pupil's desk, half a metre in front of the chair at (x, z), towards the teacher. */
  const deskFor = (x: number, z: number, delay: number) => {
    const [dx, dz] = [x + Math.sin(toTeacher) * 0.5, z + Math.cos(toTeacher) * 0.5];
    const top = box(0.62, 0.04, 0.4, WOOD, dx, G + 0.6, dz, { delay, rotation: [0, toTeacher, 0] });
    box(0.5, 0.6, 0.04, 0x3e3028, dx, G, dz, { delay: delay - 0.02, rotation: [0, toTeacher, 0], noInk: true });
    decorate(top, new BoxGeometry(0.22, 0.01, 0.28), PAPER, [[0, 0.045, 0]]);
  };
  const honest = pupil(1.25, 0.3, 0, 0x2f5866, 0x3a2418, 1.1);
  deskFor(1.25, 0.3, 0.9);
  const copier = pupil(0.55, 1.0, -0.55, 0x7a2f55, 0x1a1418, 1.0);
  deskFor(0.55, 1.0, 0.8);

  // Threads of thought from each pupil's head to his, a bead of light running along each.
  const crown: Point = [hx, hy + 0.3, hz];
  const beads = [honest, copier].map((kid, k) => {
    const from: Point = [kid.head[0], kid.top + 0.05, kid.head[2]];
    const middle: Point = [(from[0] + crown[0]) / 2, Math.max(from[1], crown[1]) + 0.45, (from[2] + crown[2]) / 2];
    cable(kit, [from, middle, crown], 0.012, k ? MAGENTA : CYAN, 1.7 + k * 0.1);
    const curve = new CatmullRomCurve3([from, middle, crown].map((p) => new Vector3(...p)));
    return { curve, bead: ball(0.035, k ? MAGENTA : CYAN, ...from, { delay: 1.9, flat: true, noInk: true }) };
  });

  // The paper plane, circling the room towards the back of his head.
  const plane = add(new ConeGeometry(0.08, 0.28, 3).rotateX(Math.PI / 2).scale(1, 0.35, 1), PAPER, 0, 0, 0, { delay: 1.8 });
  const at = new Vector3();
  tick((t) => {
    rings.forEach((ring, k) => ring.rotation.set(0.35 - k * 0.25, t * (0.8 + k * 0.35) + k * 2, 0));
    beads.forEach(({ curve, bead }, k) => {
      curve.getPoint((t * 0.35 + k * 0.5) % 1, at);
      bead.position.set(at.x, at.y - 0.035, at.z);
    });
    const a = 2.2 + t * 0.9;
    plane.position.set(hx + Math.cos(a) * 0.85, hy + 0.35 + Math.sin(a * 2) * 0.1, hz + Math.sin(a) * 0.85);
    plane.rotation.y = -a;
  });

  return { width: 4.9, height: 4.2, lookY: 1.4 };
}
