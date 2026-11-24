import { BoxGeometry, Color, ConeGeometry, ExtrudeGeometry, Quaternion, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { MAGENTA, archMouth, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, lamp, steps } from "@/lib/diorama-props";

/**
 * Collateral (P073): the bounty hunter stands at the foot of the Banco's steps at night, his
 * chrome arm held out, twirling the chain of a gold harpoon. The arm is the bank's collateral: a
 * pawn tag swings from its wrist, and the overdue letters with their magenta stripes lie at his
 * feet under the lit arched door.
 */
export function collateral(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const GOLD = 0xe0b040;
  const GOLD_DARK = 0xa87a20;
  const STONE = 0x4a5270;
  const STONE_LIGHT = 0x5d6680;
  const PAPER = 0xe8e2d0;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x2c2e3c, 0x1e202a, 0.5);

  // The Banco: three wide steps, two columns, the wall with its arched door lit magenta, a pediment.
  steps(kit, 0, -0.85, G, 0.1, { width: 2.7, count: 3, tread: 0.26, rise: 0.13, color: STONE });
  const top = G + 0.39;
  const wall = box(2.6, 2.3, 0.3, 0x3a3550, 0, top, -1.78, { delay: 0.2, ink: 1.02 });
  const door = decorate(wall, archMouth(0.45, 0.9), MAGENTA, [[0, 0, 0.155]]);
  decorate(wall, new BoxGeometry(0.03, 1.3, 0.01), 0x7a1a40, [[0, 0.68, 0.18]]);
  decorate(wall, new BoxGeometry(0.26, 0.5, 0.01), 0xff7aa8, [[-0.62, 1.35, 0.155], [0.62, 1.35, 0.155]]);
  [-0.98, 0.98].forEach((x, i) => column(kit, x, -1.38, top, 0.3 + i * 0.04, 2.0, false, 0x6a7896));
  box(2.6, 0.18, 0.55, STONE_LIGHT, 0, top + 2.06, -1.42, { delay: 0.4 });
  const gable = new Shape([new Vector2(-1.32, 0), new Vector2(1.32, 0), new Vector2(0, 0.46)]);
  const pediment = add(new ExtrudeGeometry(gable, { depth: 0.4, bevelEnabled: false }).translate(0, 0, -0.2), STONE_LIGHT, 0, top + 2.24, -1.45, { delay: 0.45 });
  const tympanum = new Shape([new Vector2(-1.0, 0), new Vector2(1.0, 0), new Vector2(0, 0.32)]);
  decorate(pediment, new ShapeGeometry(tympanum), 0x2a2540, [[0, 0.06, 0.205]]);
  lamp(kit, 1.72, -0.45, G, 0.3, 2.1, 0xff5c9a);

  // Overdue letters at his feet, each with a magenta band, one stuck on the bottom step.
  [
    [0.85, 1.0, 0.4],
    [1.15, 0.6, -0.3],
    [-1.0, 1.05, 1.1],
    [0.55, 1.45, -0.8],
    [-0.6, -0.72, 0.2],
  ].forEach(([x, z, turn], i) => {
    const letter = box(0.24, 0.012, 0.16, PAPER, x, i === 4 ? G + 0.13 : G, z, { delay: 0.6 + i * 0.04, rotation: [0, turn, 0], noInk: true });
    decorate(letter, new BoxGeometry(0.24, 0.004, 0.035), MAGENTA, [[0, 0.013, 0.04]]);
  });

  // Collateral: dark teal coat, stubble and a scar, the right arm out for the chain.
  const facing = 0.45;
  const h = 2.5;
  const u = h / 2.4;
  const hand: Point = [-0.88, 1.5, 0.32];
  const hunter = figure(kit, {
    x: -0.1, z: 0.55, y: G, facing, height: h, build: "broad",
    skin: 0xc89a7a,
    hair: { style: "short", color: 0x2a1e1c },
    face: { mouth: "frown", brows: "angry", beard: "stubble", marks: 0x8a5a4a },
    top: { kind: "coat", color: 0x1f3a44, accent: 0x2a4f5c },
    bottom: { kind: "trousers", color: 0x22262f },
    belt: 0x3a2c22,
    shoes: 0x2a2622,
    arms: [hand, "hip"],
    delay: 0.8,
  });

  // His short dark hair (a cap over the crown, so the scalp doesn't show through).
  const R = hunter.headRadius;
  const hair = add(new SphereGeometry(R * 1.12, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), 0x2a1e1c, hunter.head[0], hunter.head[1] + R * 0.4, hunter.head[2], { delay: 1.2 });
  hair.rotation.order = "YXZ";
  hair.rotation.set(-0.25, facing, 0);

  // The chrome arm, laid over the figure's own: pauldron, plated upper arm and forearm, a fist.
  const shoulder: Point = [-0.5 * u, 1.72 * u, 0];
  const elbow: Point = [(shoulder[0] + hand[0]) / 2 - 0.14 * u, (shoulder[1] + hand[1]) / 2 - 0.1 * u, (shoulder[2] + hand[2]) / 2 - 0.04 * u];
  const [s, e, w] = [shoulder, elbow, hand].map((p) => hunter.at(...p));
  ball(0.22, GOLD, s[0], s[1] - 0.2, s[2], { delay: 1.3 });
  limb(kit, s, e, 0.175, 0.165, GOLD, { delay: 1.32 });
  ball(0.16, GOLD_DARK, e[0], e[1] - 0.16, e[2], { delay: 1.34 });
  const fore = limb(kit, e, w, 0.165, 0.15, GOLD, { delay: 1.36 });
  const length = Math.hypot(w[0] - e[0], w[1] - e[1], w[2] - e[2]);
  decorate(fore, new TorusGeometry(0.162, 0.014, 6, 20).rotateX(Math.PI / 2), GOLD_DARK, [[0, length * 0.35, 0], [0, length * 0.7, 0]]);
  const fist = ball(0.145, GOLD, w[0], w[1] - 0.145, w[2], { delay: 1.4 });
  decorate(fist, new BoxGeometry(0.05, 0.04, 0.05), GOLD_DARK, [-0.07, 0, 0.07].map((x) => [x, 0.2, 0.11] as Point));

  // The pawn tag on its string under the wrist.
  const tagTop: Point = [w[0] * 0.75 + e[0] * 0.25, w[1] * 0.75 + e[1] * 0.25 - 0.12, w[2] * 0.75 + e[2] * 0.25];
  const tag = box(0.13, 0.19, 0.012, PAPER, tagTop[0], tagTop[1] - 0.31, tagTop[2], { delay: 1.5, rotation: [0, facing, 0] });
  decorate(tag, new BoxGeometry(0.006, 0.12, 0.006), 0x8a8478, [[0, 0.25, 0]]);
  decorate(tag, new BoxGeometry(0.13, 0.04, 0.004), MAGENTA, [[0, 0.06, 0.008]]);
  decorate(tag, new TorusGeometry(0.015, 0.005, 6, 10), 0x8a8478, [[0, 0.16, 0.008]]);

  // The chain and the harpoon, twirling under the fist.
  const start: Point = [w[0], w[1] - 0.12, w[2]];
  const STEP = 0.085;
  const links = Array.from({ length: 9 }, (_, k) =>
    add(new TorusGeometry(0.036, 0.012, 6, 12).scale(1, 1.45, 1), 0xc8a040, ...start, { delay: 1.55 + k * 0.02 }),
  );
  const head = add(new ConeGeometry(0.095, 0.42, 8), GOLD, ...start, { delay: 1.8 });
  decorate(head, new BoxGeometry(0.035, 0.22, 0.035), MAGENTA, [
    [-0.1, 0.09, 0, -0.6],
    [0.1, 0.09, 0, 0.6],
  ]);

  const UP = new Vector3(0, 1, 0);
  const dir = new Vector3();
  const back = new Vector3();
  const twist = new Quaternion().setFromAxisAngle(UP, Math.PI / 2);
  const hang = new Vector3();
  const glowFrom = new Color(MAGENTA);
  const glowTo = new Color(0xff8ab8);
  tick((t) => {
    const psi = 0.6 + t * 2.6;
    const phi = 0.62;
    dir.set(Math.sin(phi) * Math.cos(psi), -Math.cos(phi), Math.sin(phi) * Math.sin(psi));
    back.copy(dir).negate();
    links.forEach((link, k) => {
      const d = (k + 1) * STEP;
      link.position.set(start[0] + dir.x * d, start[1] + dir.y * d, start[2] + dir.z * d);
      link.quaternion.setFromUnitVectors(UP, back);
      if (k % 2) link.quaternion.multiply(twist);
    });
    const d = links.length * STEP + 0.03;
    head.position.set(start[0] + dir.x * d, start[1] + dir.y * d, start[2] + dir.z * d);
    head.quaternion.setFromUnitVectors(UP, dir);
    // The tag swings from the wrist; the bank's door breathes.
    tag.rotation.z = Math.sin(t * 2.6) * 0.3;
    hang.set(0, 0.31, 0).applyEuler(tag.rotation);
    tag.position.set(tagTop[0] - hang.x, tagTop[1] - hang.y, tagTop[2] - hang.z);
    door.color.lerpColors(glowFrom, glowTo, (Math.sin(t * 1.4) + 1) / 2);
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
