import { BoxGeometry, ConeGeometry, MathUtils, SphereGeometry, TorusGeometry, type Group } from "three";
import { INK, MAGENTA, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Hollowbone (P157): the colossus hunter rests on his staff on a rocky hillside, green cloak over
 * leather armour, a load of giant bones roped on his back; beside him a colossal rib sticks out
 * of the ground with his saw still in it and a price tag on a string. He is slow under the load
 * and sees nothing: the mossy hill behind him is the face of a sleeping colossus, and now and
 * then it opens one yellow eye and looks at him.
 */
export function hollowbone(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const STONE = 0x5a6070;
  const STONE_DARK = 0x464c5c;
  const MOSS = 0x3f6a3a;
  const BONE = 0xd8ccb0;
  const LEATHER = 0x5a3a24;
  const F = octagonBase(kit, 0x1f1d26);
  const G = floor(kit, F, 0.06, 0x34323a, 0x28262e, 0);
  rubble(kit, -1.5, 0.9, G, 0.2, 5, 0.4, 0x4a4f5c);
  rubble(kit, 1.4, 1.2, G, 0.25, 4, 0.3, 0x4a4f5c);
  [
    [-0.4, 1.6],
    [1.7, 0.5],
    [-1.9, 0.1],
    [0.5, 1.9],
  ].forEach(([x, z], i) => add(new ConeGeometry(0.07, 0.24, 5), MOSS, x, G, z, { delay: 0.3 + i * 0.03, rotation: [0.25 * (i - 1.5), 0, 0.2] }));

  // The hill that is a head: a mossy dome with a heavy brow, a nose, a long crack of a mouth,
  // turned to look out at us.
  const [hx, hz, yaw] = [-1.0, -0.75, 0.35];
  add(new SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.15, 1.25, 0.85), STONE, hx, G, hz, { delay: 0.1, ink: 1.03, rotation: [0, yaw, 0] });
  /** A point on the dome's face, `dx` across and `h` up, `out` off its surface. */
  const face = (dx: number, h: number, out = 0): Point => {
    const dz = 0.85 * Math.sqrt(Math.max(0, 1 - (dx / 1.15) ** 2 - (h / 1.25) ** 2)) + out;
    return [hx + dx * Math.cos(yaw) + dz * Math.sin(yaw), G + h, hz - dx * Math.sin(yaw) + dz * Math.cos(yaw)];
  };
  const onFace = (lean = 0): Point => [0, yaw, lean];
  [-1, 1].forEach((side, i) => box(0.44, 0.11, 0.2, STONE_DARK, ...face(side * 0.36, 0.86, -0.05), { delay: 0.3 + i * 0.03, rotation: onFace(side * -0.25) }));
  box(0.18, 0.36, 0.18, STONE_DARK, ...face(0, 0.3, -0.07), { delay: 0.34, rotation: onFace() });
  box(0.66, 0.035, 0.04, INK, ...face(0, 0.14, 0.0), { delay: 0.36, flat: true, noInk: true, rotation: onFace() });
  // Its eyes, shut: dark sockets, each with the curve of a closed lid.
  const shut: Group[] = [];
  [-1, 1].forEach((side) => {
    add(new SphereGeometry(0.19, 14, 10).scale(1, 0.6, 0.35), 0x2a2e38, ...face(side * 0.36, 0.6, -0.03), { delay: 0.38, noInk: true, rotation: onFace() });
    [-1, 1].forEach((k) => {
      const line = box(0.17, 0.035, 0.02, INK, ...face(side * 0.36 + k * 0.075, 0.66, 0.04), { delay: 0.4, flat: true, noInk: true, rotation: onFace(k * 0.22) });
      if (side < 0) shut.push(line);
    });
  });
  const eye = add(new SphereGeometry(0.13, 14, 10).scale(1, 0.7, 0.3), YELLOW, ...face(-0.36, 0.6, 0.02), { delay: 0.42, flat: true, noInk: true, rotation: onFace() });
  const pupil = box(0.035, 0.11, 0.02, INK, ...face(-0.3, 0.63, 0.07), { delay: 0.44, flat: true, noInk: true, rotation: onFace() });
  // Cracks and moss on the crown.
  [
    [-0.7, 0.45, 0.5],
    [0.75, 0.5, -0.6],
  ].forEach(([dx, h, lean], i) => box(0.02, 0.3, 0.02, INK, ...face(dx, h, 0.01), { delay: 0.46 + i * 0.02, flat: true, noInk: true, rotation: onFace(lean) }));
  [
    [-0.3, 1.05, -0.2, 0.24],
    [0.25, 1.1, -0.35, 0.2],
    [-0.75, 0.85, 0.05, 0.18],
    [0.55, 0.85, 0.1, 0.16],
  ].forEach(([dx, y, dz, r], i) => ball(r, i % 2 ? 0x355a34 : MOSS, hx + dx * Math.cos(yaw) + dz * Math.sin(yaw), G + y, hz - dx * Math.sin(yaw) + dz * Math.cos(yaw), { delay: 0.5 + i * 0.03 }));

  // A rib of an older catch, sticking out of the ground, his saw still in it, the price on a tag.
  cable(
    kit,
    [
      [1.05, G - 0.05, -1.05],
      [1.25, G + 0.95, -0.85],
      [1.65, G + 1.25, -0.45],
      [1.95, G + 0.7, -0.05],
      [2.0, G - 0.05, 0.12],
    ],
    0.09,
    BONE,
    0.4,
  );
  const saw = box(0.5, 0.13, 0.012, 0x9aa0ab, 1.45, G + 1.05, -0.62, { delay: 0.6, rotation: [0, -0.6, -0.5] });
  decorate(saw, new BoxGeometry(0.14, 0.1, 0.03), 0x7a5a3a, [[-0.29, 0.07, 0]]);
  box(0.006, 0.3, 0.006, INK, 1.86, G + 0.62, 0.02, { delay: 0.64, noInk: true });
  const tag = box(0.16, 0.1, 0.012, 0xe8e0c8, 1.86, G + 0.52, 0.04, { delay: 0.66, rotation: [0, 0.3, 0.15] });
  decorate(tag, new BoxGeometry(0.1, 0.02, 0.01), MAGENTA, [
    [0, 0.06, 0.008],
    [0, 0.03, 0.008],
  ]);

  // Hollowbone, leaning on his staff, the load of bones on his back.
  const theta = 0.3;
  const hunter = figure(kit, {
    x: 0.65,
    z: 0.6,
    y: G,
    facing: theta,
    height: 2.5,
    build: "broad",
    skin: 0xc0906a,
    hair: { style: "short", color: 0x4a4a4c },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x6a6a66 },
    top: { kind: "armor", color: 0x2e2a28, accent: 0x4a3a2e },
    bottom: { kind: "trousers", color: 0x2a2826 },
    belt: LEATHER,
    cape: 0x3f5a38,
    scarf: 0x3f5a38,
    shoes: 0x2a2420,
    arms: [[-0.5, 1.3, 0.3], "down"],
    legs: "wide",
    delay: 0.8,
  });
  const at = hunter.at;
  limb(kit, at(-0.52, 0, 0.33), at(-0.47, 2.5, 0.27), 0.035, 0.03, 0x7a6048, { delay: 1.4 });
  [-1, 1].forEach((side) => add(new SphereGeometry(0.15, 12, 8).scale(1, 1.4, 0.9), LEATHER, ...at(side * 0.33, 0.14, 0.05), { delay: 1.3, rotation: [0, theta, 0] }));
  // The bones: three long ones fanned out, two curved tusks, roped together.
  [
    [-0.22, -0.5],
    [0, -0.05],
    [0.22, 0.42],
  ].forEach(([x0, x1], i) => {
    const top = at(x1, 2.95 - Math.abs(x1) * 0.4, -0.5);
    limb(kit, at(x0, 1.0, -0.4), top, 0.06, 0.055, BONE, { delay: 1.2 + i * 0.04 });
    [-0.05, 0.05].forEach((dx) => {
      const knob = at(x1 + dx, 2.95 - Math.abs(x1) * 0.4 + 0.02, -0.5);
      ball(0.075, BONE, knob[0], knob[1] - 0.075, knob[2], { delay: 1.3 + i * 0.04 });
    });
  });
  [-1, 1].forEach((side, i) =>
    cable(kit, [at(side * 0.25, 1.1, -0.45), at(side * 0.62, 1.9, -0.55), at(side * 0.7, 2.6, -0.5), at(side * 0.5, 3.0, -0.4)], 0.065, BONE, 1.25 + i * 0.05),
  );
  add(new TorusGeometry(0.36, 0.035, 6, 20).rotateX(Math.PI / 2).scale(1, 1, 0.6), 0x4a3a2a, ...at(0, 1.55, -0.45), { delay: 1.45, rotation: [0, theta, 0] });
  limb(kit, at(-0.35, 1.78, 0.18), at(0.3, 1.1, 0.27), 0.035, 0.035, LEATHER, { delay: 1.4 });

  tick((t) => {
    // Every few seconds the hill opens an eye, looks at the hunter, and goes back to sleep.
    const p = t % 9;
    const open = MathUtils.smoothstep(p, 3, 3.5) * (1 - MathUtils.smoothstep(p, 6.2, 6.7));
    eye.children[0].scale.y = Math.max(0.02, open);
    eye.visible = open > 0.02;
    pupil.visible = open > 0.6;
    shut.forEach((line) => (line.visible = open < 0.2));
    pupil.position.x = face(-0.3, 0.63, 0.07)[0] + Math.sin(p * 2) * 0.02 * open;
  });

  return { width: 4.9, height: 4.6, lookY: 1.6 };
}
