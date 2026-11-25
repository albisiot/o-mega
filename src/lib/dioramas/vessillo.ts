import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { MAGENTA, YELLOW, archMouth, archedWall, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, lamp, puddle } from "@/lib/diorama-props";

/**
 * Vessillo (P274): the heir of a fallen kingdom stands guard with the Custodi in the rain, on
 * the wet flagstones of a colonnade under a street lamp, the old town's lit gate behind her.
 * Red bob, freckles, a long navy coat over mail, a sword at her hip: she holds the standard of
 * her kingdom, torn and flapping, its arms sealed under a lump of red wax, because her name
 * is forbidden to her. At her feet her guard's radio lies in a puddle, blinking, unanswered.
 */
export function vessillo(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const COAT = 0x1e2a4a;
  const MAIL = 0x8a8f9a;
  const BANNER = 0xd42a4a;
  const WAX = 0x8a1424;
  const F = octagonBase(kit, 0x1b1d2a);
  const G = floor(kit, F, 0.06, 0x262a3a, 0x1a1c28, 0.32);

  // The old town's gate far back, lit inside; columns and the street lamp.
  const gate = add(archedWall(2.3, 1.75, 0.3, { x: 0, half: 0.42, spring: 0.75 }), 0x2a2f48, -0.55, G, -1.8, { delay: 0.1, rotation: [0, 0.25, 0] });
  decorate(gate, new BoxGeometry(0.5, 0.06, 0.02), 0x3a4060, [
    [-0.8, 0.5, 0.16],
    [0.75, 0.9, 0.16],
    [-0.7, 1.3, 0.16],
    [0.8, 0.3, 0.16],
  ]);
  add(archMouth(0.42, 0.75), 0x8a6a2a, -0.55 - Math.sin(0.25) * 0.18, G, -1.8 - Math.cos(0.25) * 0.18, { delay: 0.14, flat: true, noInk: true, rotation: [0, 0.25, 0] });
  column(kit, -1.75, -0.55, G, 0.18, 2.9, false, 0x3e4a6a);
  column(kit, 0.95, -1.55, G, 0.22, 2.9, false, 0x3e4a6a);
  const light = lamp(kit, 1.45, -0.25, G, 0.3, 2.45, YELLOW);
  puddle(kit, 1.15, 0.55, G, 0.4, 0.42, YELLOW);
  puddle(kit, -1.0, 1.15, G, 0.42, 0.35, MAGENTA);

  // Vessillo on guard, the standard planted beside her.
  const guard = figure(kit, {
    x: -0.2,
    z: 0.3,
    y: G,
    facing: 0.3,
    height: 2.45,
    skin: 0xecc4aa,
    hair: { style: "bob", color: 0xc8284a },
    face: { mouth: "neutral", brows: "calm", eyes: 0x2a5a4a, marks: 0xb06a5a },
    top: { kind: "coat", color: COAT, accent: MAIL },
    bottom: { kind: "trousers", color: 0x161e34 },
    shoes: 0x1a1418,
    gloves: 0x2a2426,
    belt: 0x3a2a22,
    scarf: MAIL,
    arms: [[-0.44, 1.78, 0.28], "down"],
    delay: 0.8,
  });
  const turned = (part: Group, x: number, z: number) => {
    part.rotation.order = "YXZ";
    part.rotation.set(x, 0.3, z);
    return part;
  };
  // Coat buttons, and the sword at her left hip: scabbard, crossguard, red grip.
  [1.05, 1.25, 1.45].forEach((y) => ball(0.025, 0x3a4668, ...guard.at(0.1, y - 0.025, 0.26), { delay: 1.3 }));
  const hilt = guard.at(0.36, 1.12, 0.2);
  turned(cylinder(0.035, 0.04, 0.85, 0x2a1e1e, ...guard.at(0.42, 0.32, 0.02), { delay: 1.35 }, 8), 0.3, 0.1);
  turned(box(0.24, 0.035, 0.05, 0xb8c0cc, ...hilt, { delay: 1.4 }), 0.3, 0.1);
  turned(cylinder(0.025, 0.025, 0.16, 0x8a1e2a, hilt[0], hilt[1] + 0.03, hilt[2], { delay: 1.42 }, 8), 0.3, 0.1);
  ball(0.035, 0xb8c0cc, ...guard.at(0.35, 1.29, 0.24), { delay: 1.44 });

  // The standard: the pole planted in the flagstones, the torn banner, the wax seal over its arms.
  const [hand] = guard.hands;
  cylinder(0.03, 0.036, 3.35, 0x3a2a22, hand[0], G, hand[2], { delay: 1.3 }, 8);
  add(new CylinderGeometry(0, 0.05, 0.16, 6), 0xb8c0cc, hand[0], G + 3.35, hand[2], { delay: 1.35 });
  const cloth = new Shape();
  [
    [0, 0],
    [0, 0.92],
    [1.15, 0.98],
    [0.95, 0.8],
    [1.2, 0.66],
    [0.92, 0.5],
    [1.08, 0.3],
    [0.74, 0.22],
    [0.52, 0.04],
    [0.3, 0.14],
  ].forEach(([x, y], k) => (k ? cloth.lineTo(x, y) : cloth.moveTo(x, y)));
  cloth.closePath();
  const yaw = 0.62;
  const banner = add(new ExtrudeGeometry(cloth, { depth: 0.025, bevelEnabled: false }).translate(0, 0, -0.0125), BANNER, hand[0], G + 2.38, hand[2], { delay: 1.5, rotation: [0, yaw, 0] });
  decorate(banner, new CylinderGeometry(0.13, 0.13, 0.03, 16).rotateX(Math.PI / 2), WAX, [
    [0.5, 0.52, 0.02],
    [0.5, 0.52, -0.02],
  ]);
  decorate(banner, new TorusGeometry(0.1, 0.015, 6, 16), 0xc23a4a, [
    [0.5, 0.52, 0.036],
    [0.5, 0.52, -0.036],
  ]);
  decorate(banner, new BoxGeometry(0.05, 0.1, 0.03), WAX, [
    [0.47, 0.37, 0.02, 0.2],
    [0.58, 0.39, 0.02, -0.3],
  ]);

  // Her radio, dropped in the puddle: a blinking light she never answers.
  const radio = box(0.14, 0.06, 0.26, 0x23222b, 0.95, G, 0.62, { delay: 1.6, rotation: [0, 0.7, 0] });
  decorate(radio, new BoxGeometry(0.09, 0.012, 0.1), 0x3a3f4e, [[0, 0.06, 0.04]]);
  const led = decorate(radio, new BoxGeometry(0.035, 0.025, 0.035), MAGENTA, [[0.03, 0.065, -0.08]]);
  box(0.02, 0.02, 0.24, 0x23222b, 0.79, G + 0.01, 0.43, { delay: 1.62, rotation: [0, 0.7, 0], noInk: true });

  // The rain.
  const drops = Array.from({ length: 28 }, (_, k) => {
    const a = k * 2.399;
    const r = 0.35 + ((k * 7) % 11) * 0.19;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 0.9;
    return { part: box(0.012, 0.24, 0.012, 0x9fd8ff, x, G, z, { delay: 0.6, flat: true, noInk: true, rotation: [0, 0, 0.12] }), phase: (k * 0.37) % 1 };
  });

  tick((t) => {
    banner.rotation.y = yaw + Math.sin(t * 2.3) * 0.18 + Math.sin(t * 5.1) * 0.06;
    drops.forEach(({ part, phase }) => (part.position.y = G + 0.05 + ((phase - t * 0.9) % 1 + 1) % 1 * 3.8));
    led.color.setHex(Math.floor(t * 2) % 2 ? 0x3a1a24 : MAGENTA);
    light.visible = Math.floor(t * 5) % 23 !== 9;
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
