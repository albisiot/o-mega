import { BoxGeometry, Color, CylinderGeometry, SphereGeometry } from "three";
import { CYAN, YELLOW, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bench, bin, floor, ring } from "@/lib/diorama-props";

/**
 * Suture (P015): the doctor of the Lanterne outside her little neighbourhood clinic at night, the
 * door lit behind her. Her stethoscope glows gold as she holds it out to a boy with a bandaged
 * head on the bench, and warm sparks rise round him as he heals; she, red-nosed in her big scarf,
 * holds a tissue to her face and sneezes, next to a bin full of used ones.
 */
export function suture(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const WALL = 0x2a3a48;
  const LIT = 0xffe08a;
  const TISSUE = 0xf4f0e6;
  const F = octagonBase(kit, 0x1c2028);
  const G = floor(kit, F, 0.06, 0x2a303c, 0x1c222c, 0.5);

  // The clinic: a low front with a lit glass door under a little gable, a lit window with blinds.
  const clinic = box(2.9, 1.85, 0.4, WALL, 0.05, G, -1.3, { delay: 0.1, ink: 1.02 });
  box(3.05, 0.1, 0.55, 0x1e2a36, 0.05, G + 1.85, -1.3, { delay: 0.15 });
  decorate(clinic, new BoxGeometry(0.6, 1.12, 0.01), 0x1a2430, [[0.55, 0.56 + 0.2, 0.201]]);
  decorate(clinic, new BoxGeometry(0.5, 1.02, 0.01), LIT, [[0.55, 0.53 + 0.2, 0.206]]);
  decorate(clinic, new BoxGeometry(0.02, 1.02, 0.01), 0x1a2430, [[0.55, 0.73, 0.21]]);
  decorate(clinic, new BoxGeometry(0.62, 0.5, 0.01), LIT, [[-0.75, 1.1, 0.201]]);
  decorate(
    clinic,
    new BoxGeometry(0.62, 0.025, 0.01),
    0x8a7a50,
    [0.92, 1.0, 1.08, 1.16, 1.24, 1.32].map((y) => [-0.75, y, 0.206] as Point),
  );
  add(new CylinderGeometry(0.5, 0.5, 0.75, 3).rotateX(-Math.PI / 2).scale(1.15, 0.55, 1), 0x1e2a36, 0.6, G + 1.6, -0.92, { delay: 0.3 });
  box(0.2, 0.06, 0.12, CYAN, 0.6, G + 1.5, -0.98, { delay: 0.35, flat: true });
  // Two steps up to the door, with a handrail.
  box(0.8, 0.1, 0.5, 0x4a4e62, 0.6, G, -0.85, { delay: 0.2 });
  box(0.8, 0.1, 0.25, 0x5a5e72, 0.6, G + 0.1, -0.97, { delay: 0.22 });
  box(0.03, 0.5, 0.03, 0x16171e, 1.05, G, -0.65, { delay: 0.25, noInk: true });
  box(0.03, 0.03, 0.45, 0x16171e, 1.05, G + 0.5, -0.86, { delay: 0.27, noInk: true });

  // The bin of used tissues, and a few that missed.
  bin(kit, -1.45, 0.45, G, 0.4, 0x2f4f60);
  [
    [-1.5, 0.42],
    [-1.38, 0.52],
    [-1.45, 0.55],
  ].forEach(([x, z], i) => ball(0.075, TISSUE, x, G + 0.47, z, { delay: 0.5 + i * 0.03 }));
  [
    [-1.05, 0.95],
    [-0.75, 1.2],
  ].forEach(([x, z], i) => ball(0.06, TISSUE, x, G, z, { delay: 0.55 + i * 0.03 }));

  // The boy on the bench, head bandaged, one arm in a sling.
  const BX = 1.2;
  const BZ = 0.35;
  const BF = -0.6;
  bench(kit, BX, BZ, G, 0.4, BF);
  const boy = figure(kit, {
    x: BX - 0.05 * Math.sin(BF),
    z: BZ - 0.05 * Math.cos(BF),
    y: G,
    facing: BF,
    height: 1.3,
    build: "child",
    skin: 0xd8a080,
    hair: { style: "short", color: 0x3a2a20 },
    face: { mouth: "smile", brows: "worried" },
    headwear: { kind: "headband", color: TISSUE },
    top: { kind: "hoodie", color: 0x7a2a4a, accent: 0x8a3a5a },
    bottom: { kind: "shorts", color: 0x2a3a5a },
    arms: ["crossed", "down"],
    legs: "sit",
    delay: 0.7,
  });
  // His hair (the figure's cap leaves the crown bare) and the sling round his neck.
  const [bx, by, bz] = boy.head;
  add(new SphereGeometry(boy.headRadius * 1.08, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), 0x3a2a20, bx, by + 0.05, bz - 0.01, { delay: 1.15, rotation: [-0.1, BF, 0] });
  limb(kit, boy.at(0.12, 0.72, 0.04), boy.hands[0], 0.025, 0.025, TISSUE, { delay: 1.2 });
  limb(kit, boy.at(-0.12, 0.72, 0.04), boy.hands[0], 0.025, 0.025, TISSUE, { delay: 1.2 });
  ball(0.06, TISSUE, boy.hands[0][0], boy.hands[0][1] - 0.06, boy.hands[0][2], { delay: 1.22 });
  motes(10, YELLOW, 0.025, [BX - 0.3, G + 0.4, BZ - 0.2], [BX + 0.3, G + 1.8, BZ + 0.3], 1.8);

  // Suture: dark waves, red nose, the big scarf, a long coat, her bag on its strap.
  const X = -0.3;
  const Z = 0.3;
  const FACE = 0.5;
  const doctor = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: FACE,
    height: 2.35,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "curly", color: 0x1e1a22 },
    face: { mouth: "frown", brows: "worried" },
    top: { kind: "coat", color: 0x3a5a66, accent: 0x2f4a56 },
    bottom: { kind: "trousers", color: 0x2a2e3a },
    shoes: 0x2a1e1a,
    scarf: 0x2f6a6a,
    arms: ["chin", [0.5, 1.55, 0.42]],
    delay: 0.9,
  });
  const u = 2.35 / 2.4;
  const R = doctor.headRadius;
  // Her hair: a cap of its own (the figure's curly cap leaves the crown bare) and locks to the shoulders.
  const [hx, hy, hz] = doctor.head;
  add(new SphereGeometry(R * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), 0x1e1a22, hx, hy + 0.04, hz - 0.02, { delay: 1.2, rotation: [-0.1, FACE, 0] });
  [-1, 1].forEach((s) => limb(kit, doctor.at(s * 0.19, 2.12 * u, -0.04), doctor.at(s * 0.24, 1.72 * u, 0.02), 0.085, 0.06, 0x1e1a22, { delay: 1.22 }));
  decorate(doctor.headPart, new BoxGeometry(0.06 * u, 0.07 * u, 0.06), 0xd04050, [[0, R * 1.06 - 0.02 * u, R * 0.9 + 0.015]]);
  add(new SphereGeometry(0.3, 12, 8).scale(1, 0.45, 1), 0x2f6a6a, ...doctor.at(0, 1.62 * u, 0.02), { delay: 1.25 });
  const [tissueHand, scope] = doctor.hands;
  ball(0.08, TISSUE, tissueHand[0], tissueHand[1] - 0.06, tissueHand[2] + 0.06, { delay: 1.4 });
  const bagAt = doctor.at(-0.42, 0.95, 0.08);
  const bag = box(0.42, 0.3, 0.2, 0x4a3022, ...bagAt, { delay: 1.3, rotation: [0, FACE, 0] });
  decorate(bag, new BoxGeometry(0.43, 0.06, 0.01), 0x2a1a12, [[0, 0.22, 0.101]]);
  decorate(bag, new BoxGeometry(0.05, 0.08, 0.02), YELLOW, [[0, 0.18, 0.11]]);
  cable(kit, [doctor.at(0.22, 1.72 * u, 0.12), doctor.at(0, 1.5 * u, 0.24), [bagAt[0], bagAt[1] + 0.3, bagAt[2]]], 0.018, 0x2a1a12, 1.35);
  // The stethoscope: its tube round her neck, the gold chest-piece glowing in her hand.
  cable(kit, [doctor.at(-0.1, 1.68 * u, 0.2), doctor.at(0.15, 1.45 * u, 0.3), doctor.at(0.4, 1.4 * u, 0.42), scope], 0.018, 0x23222b, 1.45);
  const piece = add(new CylinderGeometry(0.07, 0.07, 0.03, 16).rotateX(Math.PI / 2), YELLOW, scope[0], scope[1] - 0.07, scope[2] + 0.05, { delay: 1.5, flat: true, rotation: [0, FACE, 0] });
  const halo = ring(kit, [scope[0], scope[1] - 0.12, scope[2] + 0.05], 0.13, YELLOW, 1.55, true);
  halo.rotation.y = FACE;
  const sneeze = [0, 1, 2, 3].map((k) => ball(0.025, TISSUE, ...doctor.at(-0.1 + k * 0.07, 2.0 * u + (k % 2) * 0.05, 0.38 + k * 0.03), { delay: 1.6, flat: true, noInk: true }));

  const gold = new Color(YELLOW);
  const white = new Color(0xfff6d0);
  const rest = doctor.parts.map((part) => [part.position.x, part.position.z]);
  const fx = Math.sin(FACE);
  const fz = Math.cos(FACE);
  tick((t) => {
    // The stethoscope pulses; every few seconds she sneezes and the whole of her jerks forward.
    const k = (Math.sin(t * 3) + 1) / 2;
    colorOf(piece).lerpColors(gold, white, k);
    halo.children[0].scale.setScalar(0.8 + k * 0.5);
    const u2 = (t / 4.5) % 1;
    const jerk = u2 > 0.8 && u2 < 0.88 ? Math.sin(((u2 - 0.8) / 0.08) * Math.PI) * 0.06 : 0;
    doctor.parts.forEach((part, i) => part.position.set(rest[i][0] + fx * jerk, part.position.y, rest[i][1] + fz * jerk));
    sneeze.forEach((speck) => (speck.visible = jerk > 0.02));
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
