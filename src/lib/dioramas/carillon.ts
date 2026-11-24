import { BoxGeometry, Color, CylinderGeometry, Group, LatheGeometry, TorusGeometry, Vector2 } from "three";
import { INK, YELLOW, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, wallLantern } from "@/lib/diorama-props";

/**
 * Carillon (P101): the nun of the Lanterne, goggles on, grips the levers in the open cockpit of
 * her giant robot of red scaffolding, white plates and church bells, one fist raised over an
 * old-town street under the moon. She prays before she smashes: a small car already lies flat
 * under its foot, which she did not see. With no stealth at all, its bells swing and ring at
 * every move.
 */
export function carillon(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const RED = 0xc0283c;
  const RED_DARK = 0x7a1a2a;
  const WHITE = 0xe8e2d0;
  const GOLD = 0xc8962a;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x3a3440, 0x2a2430, 0.35);

  // The street behind: a house front with lit windows, a lantern, the moon.
  facade(kit, 0, -1.65, G, 0.1, { width: 3.0, height: 2.7, color: 0x5a2a3a, windows: 5, floors: 3, depth: 0.2, shutters: 0x3a1a26 });
  wallLantern(kit, -1.25, -1.55, G + 2.0, 0.2);
  add(new CylinderGeometry(0.28, 0.28, 0.03, 24).rotateX(Math.PI / 2), YELLOW, 1.45, G + 3.4, -1.45, { delay: 0.15, flat: true });

  // The robot's frame, turned to us.
  const R = 0.3;
  const c = Math.cos(R);
  const s = Math.sin(R);
  const CX = 0.05;
  const CZ = -0.3;
  const at = (x: number, y: number, z: number): Point => [CX + x * c + z * s, G + y, CZ - x * s + z * c];
  const turn = (part: Group, lean = 0) => {
    part.rotation.order = "YXZ";
    part.rotation.set(0, R, lean);
    return part;
  };
  /** A tower of scaffolding: four poles, rungs every 0.3 round it and braces across the front. */
  const scaffold = (x: number, y0: number, z: number, w: number, h: number, d: number, delay: number) => {
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => turn(box(0.07, h, 0.07, RED, ...at(x + (sx * w) / 2, y0, z + (sz * d) / 2), { delay }))));
    const levels = Math.round(h / 0.3);
    for (let k = 1; k < levels; k++) {
      const y = y0 + (k * h) / levels;
      [-1, 1].forEach((sz) => turn(box(w, 0.04, 0.04, RED_DARK, ...at(x, y, z + (sz * d) / 2), { delay: delay + k * 0.02, noInk: true })));
      [-1, 1].forEach((sx) => turn(box(0.04, 0.04, d, RED_DARK, ...at(x + (sx * w) / 2, y, z), { delay: delay + k * 0.02, noInk: true })));
    }
    const step = h / levels;
    for (let k = 0; k < levels; k++) {
      const side = k % 2 ? 1 : -1;
      turn(box(0.03, Math.hypot(w, step), 0.03, RED_DARK, ...at(x + (side * w) / 2, y0 + k * step, z + d / 2), { delay: delay + 0.1, noInk: true }), side * Math.atan2(w, step));
    }
  };

  // A car it has already stepped on, flat as a biscuit.
  const flat = box(1.15, 0.09, 0.6, 0x23707e, ...at(-0.55, 0, 0.15), { delay: 0.2, rotation: [0, R + 0.5, 0.04] });
  decorate(flat, new BoxGeometry(0.55, 0.04, 0.5), 0x16303e, [[-0.05, 0.09, 0]]);
  [-0.4, 0.4].forEach((dx) => decorate(flat, new CylinderGeometry(0.12, 0.12, 0.04, 12), 0x23222b, [[dx, 0.0, 0.33]]));
  // Feet, shins and knees.
  const legs: [number, number][] = [
    [-0.5, 0.09],
    [0.5, 0],
  ];
  legs.forEach(([x, y], i) => {
    const foot = turn(box(0.55, 0.3, 0.8, WHITE, ...at(x, y, 0.08), { delay: 0.3 + i * 0.04 }));
    decorate(foot, new BoxGeometry(0.56, 0.08, 0.81), RED, [[0, 0.2, 0]]);
    scaffold(x, y + 0.3, 0, 0.42, 1.45 - y - 0.3, 0.42, 0.35 + i * 0.05);
    const shin = turn(box(0.5, 0.5, 0.07, WHITE, ...at(x, y + 0.42, 0.26), { delay: 0.5 + i * 0.04 }));
    decorate(shin, new BoxGeometry(0.25, 0.5, 0.01), RED, [[(i ? 1 : -1) * 0.125, 0.25, 0.036]]);
    add(new CylinderGeometry(0.17, 0.17, 0.5, 14).rotateZ(Math.PI / 2), WHITE, ...at(x, 0.95, 0.12), { delay: 0.55, rotation: [0, R, 0] });
  });
  // Hips, the torso cage and its open cockpit.
  turn(box(1.3, 0.3, 0.6, RED, ...at(0, 1.45, 0), { delay: 0.6 }));
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => turn(box(0.08, 1.25, 0.08, RED, ...at(sx * 0.7, 1.75, sz * 0.4), { delay: 0.65 }))));
  turn(box(1.3, 1.2, 0.05, 0x6a4a1e, ...at(0, 1.75, -0.38), { delay: 0.66 }));
  [-1, 1].forEach((sx) => {
    const flank = turn(box(0.05, 1.2, 0.75, RED, ...at(sx * 0.7, 1.75, 0), { delay: 0.68 }));
    decorate(flank, new BoxGeometry(0.06, 0.03, 0.9).rotateX(0.9), RED_DARK, [
      [0, 0.35, 0],
      [0, 0.95, 0],
    ]);
    decorate(flank, new BoxGeometry(0.06, 0.03, 0.9).rotateX(-0.9), RED_DARK, [[0, 0.65, 0]]);
  });
  const dash = turn(box(1.4, 0.45, 0.08, WHITE, ...at(0, 1.75, 0.42), { delay: 0.7 }));
  decorate(dash, new BoxGeometry(0.7, 0.45, 0.01), RED, [[0.35, 0.225, 0.045]]);
  turn(box(1.5, 0.1, 0.9, RED, ...at(0, 3.0, 0), { delay: 0.72 }));
  turn(box(1.4, 0.06, 0.06, RED_DARK, ...at(0, 2.92, 0.42), { delay: 0.73 }));

  // Shoulders, arms and fists: the right raised to strike, the left hanging with a bell.
  [-1, 1].forEach((sx, i) => {
    const pad = ball(0.36, WHITE, ...at(sx * 0.92, 2.45, 0), { delay: 0.8 + i * 0.03 });
    decorate(pad, new TorusGeometry(0.36, 0.06, 6, 20).rotateX(Math.PI / 2), RED, [[0, 0.36, 0]]);
  });
  const arm = (from: Point, to: Point, delay: number, plate: boolean) => {
    const { length, rotation } = aim(from, to);
    const beam = box(0.24, length, 0.24, RED, ...from, { delay, rotation });
    decorate(beam, new BoxGeometry(0.025, 0.3, 0.01), RED_DARK, Array.from({ length: Math.floor(length / 0.25) }, (_, k) => [0, 0.15 + k * 0.25, 0.125, k % 2 ? 0.7 : -0.7] as [number, number, number, number]));
    if (plate) add(new CylinderGeometry(0.17, 0.19, length * 0.6, 12), WHITE, ...to, { delay: delay + 0.05, rotation: aim(to, from).rotation });
    return beam;
  };
  const shoulderR = at(-0.95, 2.7, 0);
  const elbowR = at(-1.3, 2.25, 0.35);
  const fistR = at(-1.15, 3.05, 0.55);
  arm(shoulderR, elbowR, 0.85, false);
  arm(elbowR, fistR, 0.9, true);
  turn(box(0.36, 0.36, 0.36, WHITE, fistR[0], fistR[1] - 0.05, fistR[2], { delay: 1.0 }));
  const shoulderL = at(0.95, 2.7, 0);
  const elbowL = at(1.3, 2.0, 0.15);
  const fistL = at(1.2, 1.3, 0.4);
  arm(shoulderL, elbowL, 0.85, false);
  arm(elbowL, fistL, 0.9, true);
  turn(box(0.34, 0.34, 0.34, RED, fistL[0], fistL[1] - 0.32, fistL[2], { delay: 1.0 }));

  // The head: a mask half white, half red, with glowing eyes.
  turn(box(0.26, 0.2, 0.26, RED_DARK, ...at(0, 3.1, 0), { delay: 1.05 }));
  const head = turn(box(0.62, 0.55, 0.5, WHITE, ...at(0, 3.25, 0.02), { delay: 1.1 }));
  decorate(head, new BoxGeometry(0.31, 0.56, 0.51), RED, [[0.155, 0.275, 0]]);
  decorate(head, new CylinderGeometry(0.075, 0.075, 0.02, 14).rotateX(Math.PI / 2), INK, [
    [-0.14, 0.32, 0.255],
    [0.14, 0.32, 0.255],
  ]);
  const eyes = decorate(head, new CylinderGeometry(0.05, 0.05, 0.02, 14).rotateX(Math.PI / 2), YELLOW, [
    [-0.14, 0.32, 0.265],
    [0.14, 0.32, 0.265],
  ]);
  decorate(head, new BoxGeometry(0.03, 0.12, 0.01), INK, [-0.08, 0, 0.08].map((x) => [x, 0.12, 0.256] as Point));
  turn(box(0.08, 0.16, 0.4, RED, ...at(0, 3.8, 0.02), { delay: 1.15 }));

  // Bells: under each shoulder, at the left elbow and by the head, each on its own pivot.
  const bellGeometry = (k: number) =>
    new LatheGeometry(
      [
        [0, 0],
        [0.3, 0],
        [0.29, 0.04],
        [0.22, 0.12],
        [0.18, 0.3],
        [0.17, 0.42],
        [0.12, 0.5],
        [0, 0.52],
      ].map(([r, h]) => new Vector2(r * k, h * k)),
      16,
    );
  const bells = (
    [
      [at(-1.25, 2.3, 0.05), 1.0],
      [at(1.25, 2.3, 0.05), 1.0],
      [at(1.55, 1.9, 0.2), 0.75],
      [at(-0.42, 3.62, 0.0), 0.45],
      [at(0.42, 3.62, 0.0), 0.45],
    ] as [Point, number][]
  ).map(([top, k], i) => {
    const pivot = new Group();
    const bell = add(bellGeometry(k), GOLD, 0, -0.52 * k - 0.04, 0, { delay: 1.2 + i * 0.05 });
    bell.parent?.add(pivot);
    pivot.add(bell);
    pivot.add(ball(0.06 * k, 0x8a6a1e, 0, -0.6 * k, 0, { delay: 1.25 + i * 0.05 }));
    pivot.add(box(0.05, 0.06, 0.05, INK, 0, -0.05, 0, { delay: 1.2 + i * 0.05 }));
    pivot.position.set(...top);
    pivot.rotation.y = R;
    return { pivot, k };
  });
  // Rings of sound spreading from the two big bells.
  const peals = bells.slice(0, 2).map(({ pivot }, i) =>
    add(new TorusGeometry(0.34, 0.018, 4, 32).rotateX(Math.PI / 2), YELLOW, pivot.position.x, pivot.position.y - 0.62, pivot.position.z, { delay: 1.5 + i * 0.1, flat: true, noInk: true }),
  );

  // Sister Carillon in the cockpit, goggles on, gripping the levers; a rosary hangs from one.
  const seat = at(0, 0, 0.12);
  const pilot = figure(kit, {
    x: seat[0],
    z: seat[2],
    y: G + 1.52,
    facing: R,
    height: 1.3,
    build: "heavy",
    skin: 0xe0b8a0,
    hair: { style: "bald", color: 0x23222b },
    face: { mouth: "frown", brows: "angry", glasses: "goggles", glassesColor: 0xb08d3c, marks: 0xb08070 },
    headwear: { kind: "hood", color: 0x1a1a22 },
    top: { kind: "robe", color: 0x1a1a22 },
    scarf: WHITE,
    gloves: 0x3a3a44,
    arms: [
      [-0.22, 0.72, 0.3],
      [0.22, 0.72, 0.3],
    ],
    delay: 1.3,
  });
  decorate(pilot.headPart, new BoxGeometry(0.2, 0.035, 0.03), WHITE, [[0, 0.2, 0.11]]);
  pilot.hands.forEach((hand, i) => {
    cylinder(0.018, 0.018, hand[1] - G - 2.12, 0x4a4f5c, hand[0], G + 2.12, hand[2], { delay: 1.5 + i * 0.03 }, 6);
    ball(0.04, i ? RED : 0x8a6a1e, hand[0], hand[1] + 0.03, hand[2], { delay: 1.55 });
  });
  const beadsAt = pilot.hands[1];
  [0, 1, 2, 3, 4].forEach((k) => ball(0.014, 0x2a2622, beadsAt[0] + 0.03, beadsAt[1] - 0.08 - k * 0.035, beadsAt[2] + 0.02, { delay: 1.6, noInk: true }));
  box(0.012, 0.06, 0.012, GOLD, beadsAt[0] + 0.03, beadsAt[1] - 0.3, beadsAt[2] + 0.02, { delay: 1.62, noInk: true });
  box(0.04, 0.012, 0.012, GOLD, beadsAt[0] + 0.03, beadsAt[1] - 0.265, beadsAt[2] + 0.02, { delay: 1.62, noInk: true });

  const glowFrom = new Color(YELLOW);
  const glowTo = new Color(0xfff6c8);
  const pealBase = peals.map((peal) => peal.position.y);
  tick((t) => {
    // The bells swing and ring, the rings of sound spread, the eyes glow.
    bells.forEach(({ pivot }, i) => (pivot.rotation.z = Math.sin(t * 2.4 + i * 1.3) * (i < 3 ? 0.22 : 0.3)));
    peals.forEach((peal, i) => {
      const p = (t * 0.8 + i * 0.5) % 1;
      peal.children[0].scale.set(1 + p * 1.2, 1, 1 + p * 1.2);
      peal.position.y = pealBase[i] - p * 0.1;
      peal.visible = p < 0.8;
    });
    eyes.color.lerpColors(glowFrom, glowTo, (Math.sin(t * 3) + 1) / 2);
  });

  return { width: 4.9, height: 4.6, lookY: 1.95 };
}
