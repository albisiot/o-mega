import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle, rubble, towerCrane } from "@/lib/diorama-props";

/**
 * Ferraglia (P240): the four-armed alien scrap dealer in the yard where the fallen ships end up.
 * Scaly and scowling, in a leather apron, she sits on an upturned engine drum and never gets
 * up: one pair of hands welds a ship part on her lap, the third holds up a coin to the balance
 * that teeters beside her, the fourth fishes in the scrap heap with a telescopic grabber rather
 * than walk over. Behind her a ship's fin sticks out of the ground and the crane swings a plate.
 */
export function ferraglia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x46506a;
  const STEEL_DARK = 0x2e3446;
  const PLATE = 0x3e3a58;
  const BRASS = 0xb08d3c;
  const SKIN = 0xc49a86;
  const APRON = 0x2a3446;
  const GLOVE = 0x302c34;
  const F = octagonBase(kit, 0x23202a);
  const G = floor(kit, F, 0.06, 0x34303a, 0x2a2630, 0);
  puddle(kit, 0.75, 1.2, G, 0.1, 0.38, CYAN);

  // The crane and its swinging plate, a ship's fin in the ground, a heap of scrap.
  towerCrane(kit, -1.45, -1.25, G, 0.15, 3.3, 2.6, 0x4a3a5a);
  const hook = new Vector3(0.63, G + 2.48, -1.25);
  const swingParts = [box(0.012, 0.42, 0.012, 0x14121c, hook.x, hook.y - 0.42, hook.z, { delay: 0.4, noInk: true })];
  const hung = box(0.75, 0.55, 0.04, PLATE, hook.x, hook.y - 0.97, hook.z, { delay: 0.45, rotation: [0, 0.2, 0] });
  decorate(hung, new BoxGeometry(0.6, 0.015, 0.01), CYAN, [[0, 0.3, 0.021]]);
  decorate(hung, new SphereGeometry(0.018, 6, 4), 0x6a7290, [-0.3, -0.1, 0.1, 0.3].flatMap((x) => [[x, 0.06, 0.021], [x, 0.49, 0.021]] as Point[]));
  swingParts.push(hung);
  const swing = new Group();
  swing.position.copy(hook);
  hung.parent?.add(swing);
  swingParts.forEach((part) => {
    part.position.sub(hook);
    swing.add(part);
  });
  const finShape = new Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.1, 0);
  finShape.lineTo(0.2, 1.25);
  finShape.closePath();
  const fin = add(new ExtrudeGeometry(finShape, { depth: 0.07, bevelEnabled: false }).translate(0, 0, -0.035), PLATE, -1.15, G - 0.05, -1.0, { delay: 0.3, rotation: [0, 0.6, 0.12] });
  decorate(fin, new BoxGeometry(0.06, 0.06, 0.02), MAGENTA, [
    [0.3, 0.35, 0.04],
    [0.55, 0.2, 0.04],
    [0.28, 0.75, 0.04],
  ]);
  decorate(fin, new BoxGeometry(0.7, 0.02, 0.01), CYAN, [[0.45, 0.12, 0.04, 0]]);
  rubble(kit, -1.3, 0.75, G, 0.5, 7, 0.45, 0x4a4f5c);
  add(new CylinderGeometry(0.07, 0.07, 0.7, 10).rotateZ(Math.PI / 2), STEEL, -1.25, G, 0.55, { delay: 0.6, rotation: [0, 0.7, 0] });
  add(new CylinderGeometry(0.2, 0.2, 0.08, 10).rotateX(Math.PI / 2), BRASS, -1.55, G + 0.0, 0.95, { delay: 0.62, rotation: [0, 0.4, 0.3] });
  box(0.35, 0.18, 0.25, STEEL_DARK, -0.95, G, 1.05, { delay: 0.64, rotation: [0, 0.5, 0] });

  // Her seat: an upturned engine drum.
  const drum = cylinder(0.38, 0.38, 0.5, STEEL_DARK, 0.05, G, -0.15, { delay: 0.5 }, 16);
  decorate(drum, new TorusGeometry(0.385, 0.025, 6, 24).rotateX(Math.PI / 2), STEEL, [
    [0, 0.1, 0],
    [0, 0.4, 0],
  ]);

  // Ferraglia: scaly, bald, a frill behind her head, an apron over a dark jumper.
  const facing = 0.3;
  const dealer = figure(kit, {
    x: 0.05,
    z: -0.2,
    y: G,
    facing,
    height: 2.3,
    build: "heavy",
    skin: SKIN,
    hair: { style: "bald", color: SKIN },
    face: { mouth: "frown", brows: "angry", marks: 0x8a6a62 },
    top: { kind: "apron", color: APRON, accent: 0x3e3236, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    gloves: GLOVE,
    belt: 0x3e3236,
    arms: [
      [-0.15, 1.3, 0.52],
      [0.42, 1.02, 0.47],
    ],
    legs: "sit",
    delay: 0.8,
  });
  const turned = (part: Group, tilt: number, turn = 0) => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt, facing + turn, 0);
    return part;
  };
  const crown = dealer.headRadius * 1.06;
  decorate(
    dealer.headPart,
    new SphereGeometry(0.03, 6, 4),
    0x9a7468,
    [
      [-0.45, 0.75, 0.5],
      [0.2, 0.95, 0.25],
      [0.5, 0.65, 0.55],
      [0, 0.85, -0.5],
      [-0.6, 0.7, -0.2],
    ].map(([x, y, z]) => {
      const n = Math.hypot(x, y, z);
      return [(x / n) * 0.21, crown + (y / n) * 0.23, (z / n) * 0.21] as Point;
    }),
  );
  [-1.9, -1.35, -0.8, 0, 0.8, 1.35, 1.9].forEach((a, k) =>
    turned(add(new ConeGeometry(0.06, 0.28, 5), 0x9a7468, ...dealer.at(Math.sin(a + Math.PI) * 0.2, 1.62 + (k % 2) * 0.08, Math.cos(a + Math.PI) * 0.18), { delay: 1.3 + k * 0.01 }), 1.1, a + Math.PI),
  );

  // The two lower arms: one reaches out with a coin to the balance, one works the grabber.
  const extra = (side: number, elbow: Point, hand: Point, delay: number): Point => {
    const shoulder = dealer.at(side * 0.41, 0.93, 0.02);
    const e = dealer.at(...elbow);
    const h = dealer.at(...hand);
    ball(0.13, APRON, shoulder[0], shoulder[1] - 0.13, shoulder[2], { delay });
    limb(kit, shoulder, e, 0.12, 0.11, APRON, { delay: delay + 0.02 });
    limb(kit, e, h, 0.11, 0.1, SKIN, { delay: delay + 0.04 });
    ball(0.1, GLOVE, h[0], h[1] - 0.1, h[2], { delay: delay + 0.06 });
    return h;
  };
  const coinHand = extra(1, [0.72, 0.85, 0.1], [0.95, 1.2, 0.35], 1.3);
  add(new CylinderGeometry(0.07, 0.07, 0.02, 14).rotateX(Math.PI / 2), YELLOW, coinHand[0], coinHand[1] + 0.04, coinHand[2] + 0.04, { delay: 1.5, flat: true, rotation: [0, facing, 0] });
  const grabHand = extra(-1, [-0.72, 0.72, 0.12], [-0.85, 0.85, 0.35], 1.35);
  const reachTo = new Vector3(...dealer.at(-1.6, 0.3, 0.55));
  const dir = reachTo.clone().sub(new Vector3(...grabHand)).normalize();
  const outer = aim(grabHand, [grabHand[0] + dir.x * 0.6, grabHand[1] + dir.y * 0.6, grabHand[2] + dir.z * 0.6]);
  cylinder(0.035, 0.035, outer.length, 0x5a6070, ...grabHand, { delay: 1.5, rotation: outer.rotation }, 8);
  const slide = [
    cylinder(0.022, 0.022, 0.55, 0x8a93a3, grabHand[0] + dir.x * 0.45, grabHand[1] + dir.y * 0.45, grabHand[2] + dir.z * 0.45, { delay: 1.55, rotation: outer.rotation }, 8),
    ...[0, 2.1, 4.2].map((a, k) => {
      const end = new Vector3(...grabHand).addScaledVector(dir, 1.0);
      return add(new ConeGeometry(0.03, 0.14, 5), 0x8a93a3, end.x + Math.cos(a) * 0.03, end.y + Math.sin(a) * 0.03, end.z, { delay: 1.6 + k * 0.02, rotation: outer.rotation });
    }),
  ];
  const slideRest = slide.map((part) => part.position.clone());

  // The ship part on her lap, the torch and its sparks.
  const part = add(new CylinderGeometry(0.22, 0.22, 0.75, 16).rotateZ(Math.PI / 2), STEEL, ...dealer.at(0.05, 0.78, 0.47), { delay: 1.2, rotation: [0, facing, 0] });
  decorate(part, new TorusGeometry(0.225, 0.028, 6, 22).rotateY(Math.PI / 2), STEEL_DARK, [
    [-0.25, 0.22, 0],
    [0.3, 0.22, 0],
  ]);
  decorate(part, new TorusGeometry(0.224, 0.02, 6, 22).rotateY(Math.PI / 2), ORANGE, [[0.06, 0.22, 0]]);
  const torchHand = dealer.hands[0];
  const tip = dealer.at(0.06, 1.24, 0.52);
  limb(kit, torchHand, tip, 0.03, 0.02, BRASS, { delay: 1.4 });
  const sparks: Group[][] = [[], []];
  for (let k = 0; k < 16; k++) {
    const a = k * 2.4;
    const length = 0.2 + ((k * 7) % 5) * 0.06;
    const end: Point = [tip[0] + Math.cos(a) * length, tip[1] + 0.08 + ((k * 3) % 4) * 0.08, tip[2] + Math.sin(a) * length * 0.6 + 0.12];
    const { length: reach, rotation } = aim(tip, end);
    sparks[k % 2].push(box(0.02, reach, 0.02, k % 3 ? ORANGE : YELLOW, ...tip, { delay: 1.5, flat: true, noInk: true, rotation }));
  }

  // The balance: a post, a beam that teeters, a ship's nozzle in one pan and coins in the other.
  const post = dealer.at(1.35, 0, 0.45);
  box(0.4, 0.06, 0.3, STEEL_DARK, post[0], G, post[2], { delay: 0.7 });
  cylinder(0.03, 0.04, 1.6, BRASS, post[0], G, post[2], { delay: 0.72 }, 8);
  const pivot = new Vector3(post[0], G + 1.6, post[2]);
  const beam = box(0.9, 0.04, 0.04, BRASS, pivot.x, pivot.y - 0.02, pivot.z, { delay: 0.76 });
  ball(0.04, BRASS, pivot.x, pivot.y - 0.04, pivot.z, { delay: 0.78 });
  const pans = [-1, 1].map((side, i) => {
    const end = new Vector3(pivot.x + side * 0.42, pivot.y, pivot.z);
    const parts = [
      box(0.01, 0.5, 0.01, 0x14121c, end.x, end.y - 0.5, end.z, { delay: 0.8, noInk: true }),
      cylinder(0.17, 0.12, 0.05, BRASS, end.x, end.y - 0.55, end.z, { delay: 0.82 }, 14),
    ];
    if (i === 0) {
      parts.push(add(new ConeGeometry(0.1, 0.18, 10), STEEL, end.x, end.y - 0.5, end.z, { delay: 0.86 }));
      parts.push(cylinder(0.11, 0.11, 0.03, MAGENTA, end.x, end.y - 0.5, end.z, { delay: 0.88, flat: true }, 10));
    } else {
      [0, 1].forEach((pile) =>
        [0, 1, 2].forEach((k) => parts.push(cylinder(0.05, 0.05, 0.025, YELLOW, end.x - 0.05 + pile * 0.1, end.y - 0.5 + k * 0.026, end.z, { delay: 0.88 + k * 0.02 }, 10))),
      );
    }
    const pan = new Group();
    pan.position.copy(end);
    beam.parent?.add(pan);
    parts.forEach((p) => {
      p.position.sub(end);
      pan.add(p);
    });
    return { pan, side };
  });

  tick((t) => {
    const flick = Math.floor(t * 13) % 2 === 0;
    sparks[0].forEach((spark) => (spark.visible = flick));
    sparks[1].forEach((spark) => (spark.visible = !flick));
    swing.rotation.z = Math.sin(t * 1.3) * 0.1;
    const tilt = 0.12 + Math.sin(t * 1.1) * 0.08;
    beam.rotation.z = tilt;
    pans.forEach(({ pan, side }) => pan.position.set(pivot.x + side * 0.42 * Math.cos(tilt), pivot.y + side * 0.42 * Math.sin(tilt), pivot.z));
    const reach = 0.1 * (1 - Math.cos(t * 1.4));
    slide.forEach((piece, i) => piece.position.copy(slideRest[i]).addScaledVector(dir, reach));
  });

  return { width: 4.9, height: 4.6, lookY: 1.55 };
}
