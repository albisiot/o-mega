import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor, wallLantern } from "@/lib/diorama-props";

/**
 * Deadweight (P204): the old smuggler of the port at the customs weighbridge by night, hooded in
 * black oilskin, her big yellow work gloves hanging from her neck. Leaning on a cargo hook for a
 * stick (she is slow now), she lays a bare hand on a crate and it floats off the scale: the dial
 * reads nothing. Now and then her hand trembles, the crate thumps down and the needle jumps, until
 * she steadies it again. A container sways overhead from a crane out of sight.
 */
export function deadweight(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x4a4f5c;
  const DARK = 0x23222b;
  const TARP = 0x1c2230;
  const HOOK = 0xd0a030;
  const F = octagonBase(kit, 0x1d1f28);
  const G = floor(kit, F, 0.06, 0x343844, 0x24272f, 0.5);

  // The warehouse behind: corrugated sheet, a lantern, crates waiting for the boat.
  const wall = box(2.7, 2.1, 0.2, 0x2a3346, 0.1, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.03, 2.0, 0.01),
    0x1e2534,
    Array.from({ length: 13 }, (_, k) => [-1.2 + k * 0.2, 1.0, 0.105] as Point),
  );
  const light = wallLantern(kit, -0.6, -1.45, G + 1.9, 0.2, YELLOW);
  crate(kit, 1.45, -1.0, G, 0.3, 0.5, 0x5e4a3a, 0.2);
  crate(kit, 1.5, -1.0, G + 0.5, 0.34, 0.42, 0x6b5442, -0.1);
  crate(kit, 1.85, -0.45, G, 0.36, 0.45, 0x5e4a3a, 0.5);

  // The container, hanging high from a crane out of the picture, swinging slowly.
  const CX = -1.15;
  const CZ = -1.05;
  const CY = G + 2.55;
  const container = box(1.2, 0.5, 0.5, 0xc89a28, CX, CY, CZ, { delay: 0.4, rotation: [0, 0.35, 0] });
  decorate(
    container,
    new BoxGeometry(0.02, 0.44, 0.01),
    0x8a6818,
    Array.from({ length: 9 }, (_, k) => [-0.52 + k * 0.13, 0.25, 0.255] as Point),
  );
  const cables = [-0.45, 0.45].map((dx) => box(0.015, 1.7, 0.015, INK, CX + dx * Math.cos(0.35), CY + 0.5, CZ - dx * Math.sin(0.35), { delay: 0.44, noInk: true }));
  const swing = new Group();
  swing.position.set(CX, CY + 2.2, CZ);
  container.parent?.add(swing);
  for (const part of [container, ...cables]) {
    part.position.sub(swing.position);
    swing.add(part);
  }

  // The weighbridge: a steel deck, a post with a big dial, its needle sitting on nothing.
  const S = 0.3;
  const PX = 0.66;
  const PZ = 0.0;
  const plate = box(1.15, 0.14, 1.0, STEEL, PX, G, PZ, { delay: 0.5, rotation: [0, S, 0] });
  decorate(
    plate,
    new BoxGeometry(1.05, 0.006, 0.02),
    0x3a3e4a,
    Array.from({ length: 5 }, (_, k) => [0, 0.142, -0.4 + k * 0.2] as Point),
  );
  const post: Point = [PX + 0.5 * Math.cos(S) - 0.45 * Math.sin(S), G + 0.14, PZ - 0.5 * Math.sin(S) - 0.45 * Math.cos(S)];
  cylinder(0.04, 0.05, 1.3, DARK, ...post, { delay: 0.55 }, 8);
  const dialY = post[1] + 1.55;
  const dial = add(new CylinderGeometry(0.26, 0.26, 0.06, 24).rotateX(Math.PI / 2), 0xe8e4d8, post[0], dialY - 0.26, post[2], { delay: 0.6, rotation: [0, S, 0] });
  decorate(dial, new TorusGeometry(0.26, 0.03, 6, 28), STEEL, [[0, 0.26, 0.02]]);
  decorate(
    dial,
    new BoxGeometry(0.015, 0.05, 0.01),
    INK,
    [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2].map((a) => [Math.sin(a) * 0.19, 0.26 + Math.cos(a) * 0.19, 0.035, -a] as [number, number, number, number]),
  );
  decorate(dial, new BoxGeometry(0.03, 0.07, 0.01), YELLOW, [[0, 0.46, 0.036]]);
  decorate(dial, new BoxGeometry(0.1, 0.05, 0.01), MAGENTA, [[0.15, 0.1, 0.035, 0.9]]);
  const needle = add(new BoxGeometry(0.022, 0.2, 0.01).translate(0, 0.1, 0), 0x14121c, post[0] + 0.045 * Math.sin(S), dialY, post[2] + 0.045 * Math.cos(S), { delay: 0.7, noInk: true });
  needle.rotation.order = "YXZ";
  needle.rotation.set(0, S, 0);
  ball(0.03, DARK, post[0] + 0.05 * Math.sin(S), dialY - 0.03, post[2] + 0.05 * Math.cos(S), { delay: 0.72 });

  // The crate she smuggles, floating off the deck, a few lines of nothing beneath it.
  const FLOAT = G + 0.14 + 0.16;
  const box0 = crate(kit, PX - 0.05, PZ + 0.08, FLOAT, 0.8, 0.78, 0x6b5442, S);
  decorate(box0, new BoxGeometry(0.05, 0.04, 0.22), 0x2a2018, [
    [-0.4, 0.6, 0],
    [0.4, 0.6, 0],
  ]);
  const lines = [-0.2, 0.05, 0.25].map((dx, k) =>
    box(0.3 - k * 0.06, 0.012, 0.012, CYAN, PX - 0.05 + dx * Math.cos(S), G + 0.17 + k * 0.035, PZ + 0.08 + 0.42 - dx * Math.sin(S), { delay: 1.0 + k * 0.04, flat: true, noInk: true, rotation: [0, S, 0] }),
  );

  // Deadweight: hooded, scarf wound round, gloves on a cord, leaning on her hook.
  const X = -0.6;
  const Z = 0.42;
  const T = 0.55;
  const crone = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: T,
    height: 2.3,
    build: "heavy",
    skin: 0xd8a888,
    face: { mouth: "frown", brows: "angry", marks: 0xa87860 },
    headwear: { kind: "hood", color: TARP },
    top: { kind: "coat", color: TARP, accent: 0x2e3648 },
    bottom: { kind: "trousers", color: 0x1a1e28 },
    shoes: 0x1a1612,
    scarf: 0x3a3a48,
    arms: [
      [-0.5, 1.02, 0.36],
      [0.78, 0.9, 0.24],
    ],
    delay: 1.1,
  });
  const at = crone.at;
  // Dark curls escaping the hood.
  [
    [-0.2, 2.2, 0.06],
    [0.2, 2.2, 0.06],
    [-0.1, 2.27, 0.1],
    [0.06, 2.28, 0.1],
  ].forEach(([lx, ly, lz], k) => {
    const p = at(lx, ly, lz);
    ball(0.06, 0x2a1e1c, p[0], p[1] - 0.06, p[2], { delay: 1.6 + k * 0.02 });
  });
  // The work gloves, on a cord round her neck.
  [-1, 1].forEach((side, i) => {
    const top = at(side * 0.13, 1.5, 0.33);
    limb(kit, at(side * 0.08, 1.72, 0.18), top, 0.008, 0.008, 0xc9a46a, { delay: 1.62, noInk: true });
    const glove = box(0.14, 0.24, 0.07, HOOK, top[0], top[1] - 0.24, top[2], { delay: 1.64 + i * 0.02, rotation: [0.1, T, side * 0.1] });
    decorate(glove, new BoxGeometry(0.15, 0.06, 0.08), 0x9a7420, [[0, 0.21, 0]]);
    decorate(glove, new BoxGeometry(0.025, 0.08, 0.075), 0x9a7420, [
      [-0.04, 0.02, 0],
      [0.01, 0.02, 0],
      [0.05, 0.03, 0],
    ]);
  });
  // The cargo hook she walks with: a brass bar for a grip, an iron curve at the foot.
  const [grip, touch] = crone.hands;
  const foot = at(-0.6, 0.13, 0.52);
  box(0.24, 0.05, 0.05, HOOK, grip[0], grip[1] - 0.02, grip[2], { delay: 1.7, rotation: [0, T, 0] });
  limb(kit, [grip[0], grip[1] - 0.02, grip[2]], foot, 0.03, 0.03, HOOK, { delay: 1.72 });
  const curve = at(-0.6 - 0.09, 0, 0.52);
  add(new TorusGeometry(0.09, 0.026, 6, 14, Math.PI).rotateZ(Math.PI), HOOK, curve[0], G + 0.02, curve[2], { delay: 1.74, rotation: [0, T, 0] });
  add(new ConeGeometry(0.03, 0.08, 6), HOOK, ...at(-0.78, 0.13, 0.52), { delay: 1.76 });

  // Her left hand, the one on the crate, so it can tremble; and the tremor's marks.
  const hand = crone.parts.find((part) => Math.abs(part.position.x - touch[0]) < 1e-6 && Math.abs(part.position.z - touch[2]) < 1e-6);
  const handX = hand?.position.x ?? 0;
  const shakes = [-1, 1].map((side) => box(0.012, 0.1, 0.012, 0xe8e4d8, touch[0] + side * 0.12, touch[1] + 0.12, touch[2] + 0.04, { delay: 1.8, flat: true, noInk: true, rotation: [0, T, side * 0.4] }));

  const crateY = box0.position.y;
  tick((t) => {
    // Weightless most of the time; then the hand shakes, the crate drops and the needle leaps.
    const u = t % 7;
    const slip = u > 5 && u < 6.1;
    const fall = slip ? Math.min(1, (u - 5) / 0.25) : u >= 6.1 && u < 6.6 ? 1 - (u - 6.1) / 0.5 : 0;
    box0.position.y = crateY + Math.sin(t * 1.6) * 0.025 * (1 - fall) - fall * 0.16;
    needle.rotation.z = -fall * 2.3 + Math.sin(t * 9) * 0.03 * (1 - fall);
    lines.forEach((line) => (line.visible = fall < 0.5));
    if (hand) hand.position.x = handX + (slip ? Math.sin(t * 60) * 0.012 : 0);
    shakes.forEach((mark) => (mark.visible = slip));
    swing.rotation.z = Math.sin(t * 0.7) * 0.03;
    light.visible = Math.floor(t * 5) % 19 !== 7;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
