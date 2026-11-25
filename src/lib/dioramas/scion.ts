import { BoxGeometry, Color, CylinderGeometry, DodecahedronGeometry, SphereGeometry, TorusGeometry } from "three";
import { MAGENTA, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Scion (P200): the heir of the Custodi in her family's gallery, under the portraits of the
 * ancestors who all wore the same golden gauntlet. Its glass case stands empty: the gauntlet is
 * on her right arm, and it has a will she lacks. It has just smashed the family vase and now
 * drags her along by the fist, glowing, while she leans back with a worried face.
 */
export function scion(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const GOLD = 0xd4a838;
  const GOLD_DARK = 0x8a6a22;
  const FRAME = 0x8a6a2a;
  const F = octagonBase(kit, 0x1a1c26);
  const G = floor(kit, F, 0.06, 0x3e4450, 0x262a32, 0.45);

  // The gallery: chequered floor, a runner, the wall with the ancestors' portraits.
  const tiles: Point[] = [];
  for (let i = 0; i < 10; i++)
    for (let j = 0; j < 10; j++) {
      const x = -1.925 + i * 0.45;
      const z = -1.925 + j * 0.45;
      if ((i + j) % 2 === 0 && Math.abs(x) + Math.abs(z) < 2.75) tiles.push([x, 0.002, z]);
    }
  const checker = box(0.001, 0.001, 0.001, 0x2a3238, 0, G, 0, { delay: 0.08, flat: true, noInk: true });
  decorate(checker, new BoxGeometry(0.43, 0.004, 0.43), 0x2a3238, tiles);
  box(0.9, 0.012, 3.2, 0x5a1e3a, 0.1, G, 0.1, { delay: 0.1, noInk: true });
  const wall = box(2.8, 2.8, 0.2, 0x2a3242, 0, G, -1.75, { delay: 0.12, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.16, 2.8, 0.03),
    0x343e50,
    [-1.3, -0.3, 0.7].map((x) => [x, 1.4, 0.11] as Point),
  );
  [-0.85, 0.2].forEach((x, i) => {
    const frame = box(0.62, 0.8, 0.05, FRAME, x, G + 1.15, -1.63, { delay: 0.2 + i * 0.04 });
    decorate(frame, new BoxGeometry(0.52, 0.7, 0.01), 0x1f3a32, [[0, 0.4, 0.026]]);
    decorate(frame, new BoxGeometry(0.3, 0.3, 0.01), i ? 0x3a2a3a : 0x2a2a3a, [[0, 0.2, 0.031]]);
    decorate(frame, new CylinderGeometry(0.08, 0.08, 0.01, 14).rotateX(Math.PI / 2), 0xc8a080, [[0, 0.47, 0.034]]);
    decorate(frame, new CylinderGeometry(0.09, 0.09, 0.01, 14).rotateX(Math.PI / 2), i ? 0x6a6a70 : 0x3a2a22, [[0, 0.52, 0.031]]);
    // Each ancestor wears the gauntlet.
    decorate(frame, new CylinderGeometry(0.06, 0.06, 0.01, 12).rotateX(Math.PI / 2), GOLD, [[i ? -0.12 : 0.12, 0.22, 0.04]]);
  });

  // The glass case of the gauntlet, empty: a velvet cushion with its dent.
  const KX = 1.4;
  const KZ = -0.7;
  box(0.6, 0.85, 0.6, 0x3e3028, KX, G, KZ, { delay: 0.3 });
  const cushion = box(0.4, 0.08, 0.4, MAGENTA, KX, G + 0.85, KZ, { delay: 0.34 });
  decorate(cushion, new BoxGeometry(0.12, 0.02, 0.24), 0x8a1a44, [[0, 0.075, 0]]);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.025, 0.55, 0.025, GOLD_DARK, KX + sx * 0.27, G + 0.85, KZ + sz * 0.27, { delay: 0.36, noInk: true })));
  [
    [0, 0.27, 0],
    [0, -0.27, 0],
    [0.27, 0, Math.PI / 2],
    [-0.27, 0, Math.PI / 2],
  ].forEach(([dx, dz, turn]) => box(0.56, 0.025, 0.025, GOLD_DARK, KX + dx, G + 1.4, KZ + dz, { delay: 0.38, noInk: true, rotation: [0, turn, 0] }));
  box(0.54, 0.01, 0.54, 0x9fd8e8, KX, G + 1.41, KZ, { delay: 0.4, flat: true, noInk: true });

  // The family vase, smashed on its stand.
  const VX = -1.25;
  const VZ = 0.85;
  cylinder(0.2, 0.24, 0.75, 0x5d6680, VX, G, VZ, { delay: 0.4 }, 10);
  cylinder(0.12, 0.09, 0.14, 0xd8e0ea, VX, G + 0.75, VZ, { delay: 0.44 }, 10);
  [
    [0.25, 0.35, 0x2a4a8a],
    [-0.3, 0.2, 0xd8e0ea],
    [0.45, 0.0, 0xd8e0ea],
    [0.05, 0.5, 0x2a4a8a],
    [-0.1, -0.35, 0xd8e0ea],
  ].forEach(([dx, dz, color], k) => add(new DodecahedronGeometry(0.05 + (k % 2) * 0.02), color, VX + dx, G, VZ + dz, { delay: 0.46 + k * 0.02, rotation: [k, k * 2, 0] }));

  // Scion, dragged along by her right arm.
  const theta = -0.1;
  const heir = figure(kit, {
    x: 0.15,
    z: 0.35,
    y: G,
    facing: theta,
    height: 2.4,
    build: "slim",
    skin: 0xd0a080,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "open", brows: "worried", marks: 0x9a6a50 },
    headwear: { kind: "headband", color: GOLD },
    top: { kind: "dress", color: 0x5a5e6a, sleeves: "none" },
    belt: GOLD,
    cape: 0x1f5a48,
    shoes: 0x3a2c22,
    arms: [
      [-0.55, 1.3, 0.72],
      [0.55, 1.35, -0.3],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const at = heir.at;
  ball(0.05, GOLD, ...at(0.22, 1.62, 0.2), { delay: 1.3 });

  // The gauntlet: pauldron, ringed arm and the great fist.
  const shoulder = at(-0.34, 1.72, 0);
  const [elbow] = heir.elbows;
  const [hand] = heir.hands;
  const ring = new TorusGeometry(0.125, 0.018, 6, 18).rotateX(Math.PI / 2);
  const gauntlet = [
    add(new SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), GOLD, shoulder[0], shoulder[1] - 0.06, shoulder[2], { delay: 1.35, rotation: [0, theta, 0.4] }),
    limb(kit, shoulder, elbow, 0.12, 0.11, GOLD, { delay: 1.38 }),
    ball(0.13, GOLD_DARK, elbow[0], elbow[1] - 0.13, elbow[2], { delay: 1.4 }),
    limb(kit, elbow, hand, 0.125, 0.14, GOLD, { delay: 1.42 }),
  ];
  const upper = aim(shoulder, elbow);
  const fore = aim(elbow, hand);
  decorate(gauntlet[1], ring, GOLD_DARK, [[0, upper.length * 0.35, 0], [0, upper.length * 0.7, 0]]);
  decorate(gauntlet[3], ring, GOLD_DARK, [[0, fore.length * 0.3, 0], [0, fore.length * 0.65, 0]]);
  const fist = box(0.27, 0.25, 0.25, GOLD, ...hand, { delay: 1.45, rotation: fore.rotation });
  decorate(
    fist,
    new BoxGeometry(0.055, 0.06, 0.07),
    GOLD_DARK,
    [-0.09, -0.03, 0.03, 0.09].map((x) => [x, 0.25, 0.08] as Point),
  );
  gauntlet.push(fist);

  // The tug: now and then the gauntlet jerks her a step on.
  const everything = [...heir.parts, ...gauntlet];
  const rest = everything.map((part) => part.position.clone());
  const pull = [hand[0] - shoulder[0], hand[2] - shoulder[2]];
  const norm = Math.hypot(pull[0], pull[1]);
  const glowFrom = new Color(GOLD);
  const glowTo = new Color(0xfff0a0);
  tick((t) => {
    const jerk = Math.max(0, Math.sin(t * 2.1)) ** 6 * 0.08;
    everything.forEach((part, i) => part.position.set(rest[i].x + (pull[0] / norm) * jerk, rest[i].y, rest[i].z + (pull[1] / norm) * jerk));
    colorOf(fist).lerpColors(glowFrom, glowTo, (Math.sin(t * 4) + 1) / 2);
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
