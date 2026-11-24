import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { INK, ORANGE, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { flame, floor, puddle } from "@/lib/diorama-props";

/**
 * Ignifuge (P023): the Custodi's fireman walks out of a burning doorway, the last one out as
 * always, axe on his shoulder and a rescued ginger cat under his arm, soot on his face and a wry
 * look under the helmet. Fire roars in the doorway and the window above, smoke rolls up, embers
 * drift, the hose snakes back to the hydrant through puddles lit orange.
 */
export function ignifuge(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STEEL = 0x5a6070;
  const COAT = 0x2a3c48;
  const BAND = 0xc8c4b4;
  const SMOKE = 0x3a4050;
  const CAT = 0xe07a20;
  const F = octagonBase(kit, 0x1e1c24);
  const G = floor(kit, F, 0.06, 0x2c2a34, 0x1e1c24, 0.45);

  // The burning house: a charred doorway full of fire, a window above it burning too.
  const WZ = -1.25;
  const wall = box(3.0, 2.8, 0.3, 0x2e2a3a, 0, G, WZ, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.9, 1.65, 0.01), ORANGE, [[0.1, 0.825, 0.151]]);
  decorate(wall, new BoxGeometry(0.55, 1.2, 0.01), YELLOW, [[0.1, 0.6, 0.153]]);
  decorate(wall, new BoxGeometry(0.6, 0.5, 0.01), ORANGE, [[-0.95, 2.05, 0.151]]);
  decorate(wall, new BoxGeometry(0.7, 0.6, 0.01), 0x1a1620, [[0.95, 2.05, 0.151]]);
  decorate(wall, new BoxGeometry(0.18, 0.35, 0.01), INK, [
    [0.5, 2.2, 0.152, 0.3],
    [-0.4, 1.95, 0.152, -0.2],
  ]);
  [-0.42, 0.62].forEach((x) => box(0.12, 1.8, 0.1, 0x1c1820, x, G, WZ + 0.18, { delay: 0.2 }));
  box(1.16, 0.14, 0.12, 0x1c1820, 0.1, G + 1.75, WZ + 0.18, { delay: 0.22 });
  box(0.75, 0.06, 0.16, 0x1c1820, -0.95, G + 1.76, WZ + 0.2, { delay: 0.24 });
  const fires = [
    ...flame(kit, -0.15, WZ + 0.3, G, 0.3, 1.3),
    ...flame(kit, 0.32, WZ + 0.3, G, 0.32, 1.0),
    ...flame(kit, -1.05, WZ + 0.22, G + 1.82, 0.34, 0.9),
    ...flame(kit, -0.8, WZ + 0.22, G + 1.82, 0.36, 0.7),
  ];
  const smoke = [0, 1, 2, 3, 4].map((k) => ball(0.22 + (k % 2) * 0.06, SMOKE, 0, 0, 0, { delay: 0.5 + k * 0.05, noInk: true }));
  motes(18, ORANGE, 0.03, [-1.4, G + 0.4, -0.9], [1.0, G + 3.4, 0.6], 1.0);

  // The hydrant and the hose back to the door, puddles catching the fire.
  cylinder(0.11, 0.13, 0.42, 0xb02a4a, 1.45, G, 0.75, { delay: 0.4 }, 12);
  ball(0.11, 0xb02a4a, 1.45, G + 0.36, 0.75, { delay: 0.43 });
  add(new CylinderGeometry(0.05, 0.05, 0.36, 8).rotateZ(Math.PI / 2), 0xb02a4a, 1.45, G + 0.22, 0.75, { delay: 0.45 });
  cable(kit, [[1.32, G + 0.27, 0.75], [1.0, G + 0.05, 0.6], [0.9, G + 0.05, 1.3], [-0.5, G + 0.05, 1.25], [-1.1, G + 0.05, 0.3], [-0.6, G + 0.05, -0.85]], 0.045, 0xc8b890, 0.5);
  puddle(kit, -0.9, 1.3, G, 0.55, 0.4, ORANGE);
  puddle(kit, 1.1, -0.2, G, 0.6, 0.3, ORANGE);

  // Ignifuge: helmet, moustache, soot, a heavy coat with pale bands, mid-stride out of the fire.
  const fireman = figure(kit, {
    x: 0.15,
    z: 0.3,
    y: G,
    facing: 0.4,
    height: 2.45,
    build: "broad",
    skin: 0xc89478,
    hair: { style: "short", color: 0x2a1e1c },
    face: { mouth: "smirk", brows: "angry", beard: "moustache", beardColor: 0x2a1e1c, marks: 0x3a2a2a },
    top: { kind: "coat", color: COAT, accent: 0x34495a },
    bottom: { kind: "trousers", color: COAT },
    belt: BAND,
    gloves: 0x1c1c22,
    shoes: 0x1a1a1e,
    arms: [
      [-0.27, 1.55, 0.4],
      [0.3, 1.3, 0.45],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const u = 2.45 / 2.4;
  const turn: Point = [0, 0.4, 0];
  // Pale bands round his chest and the hem of his coat.
  const chest = fireman.at(0, 1.42 * u, 0);
  add(new CylinderGeometry(0.43 * u, 0.43 * u, 0.07, 18).scale(1, 1, 0.75), BAND, chest[0], chest[1], chest[2], { delay: 1.3, rotation: turn, noInk: true });
  const hem = fireman.at(0, 0.5 * u, 0);
  add(new CylinderGeometry(0.5 * u, 0.51 * u, 0.07, 18).scale(1, 1, 0.8), BAND, hem[0], hem[1], hem[2], { delay: 1.3, rotation: turn, noInk: true });
  // His helmet, built here so it sits above his eyes: a dome, a brim long at the back, a badge.
  const RH = fireman.headRadius;
  const crown = fireman.at(0, 2.14 * u + RH * 0.3, 0);
  const helmet = [
    add(new SphereGeometry(RH * 1.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x22303c, ...crown, { delay: 1.3 }),
    add(new CylinderGeometry(RH * 1.5, RH * 1.5, 0.03, 22).scale(1, 1, 1.2).translate(0, 0, -RH * 0.3), 0x1a2430, ...crown, { delay: 1.32 }),
  ];
  helmet.forEach((part) => {
    part.rotation.order = "YXZ";
    part.rotation.set(-0.25, 0.4, 0);
  });
  const badge = fireman.at(0, 2.14 * u + RH * 0.62, RH * 1.08);
  const plate = box(0.15, 0.17, 0.03, 0x22303c, badge[0], badge[1], badge[2], { delay: 1.5, rotation: [-0.5, 0.4, 0] });
  decorate(plate, new BoxGeometry(0.1, 0.11, 0.01), ORANGE, [[0, 0.085, 0.016]]);

  // The axe over his right shoulder: the handle through his fist, the head behind him.
  const low = fireman.at(-0.1, 1.15, 0.62);
  const high = fireman.at(-0.6, 2.35, -0.05);
  limb(kit, low, high, 0.035, 0.035, 0x6a4a30, { delay: 1.4 });
  const blade = box(0.05, 0.32, 0.3, STEEL, high[0], high[1] - 0.16, high[2], { delay: 1.5, rotation: [0.6, 0.4, 0.4] });
  decorate(blade, new BoxGeometry(0.06, 0.32, 0.03), ORANGE, [[0, 0.16, 0.15]]);

  // The cat he carried out, tucked in his left arm, its tail swishing.
  const [, arm] = fireman.hands;
  add(new SphereGeometry(0.15, 12, 10).scale(1.5, 0.85, 0.9), CAT, arm[0] - 0.05, arm[1] - 0.04, arm[2] + 0.06, { delay: 1.6, rotation: turn });
  const catHead = fireman.at(0.52, 1.36, 0.5);
  const head = ball(0.11, CAT, catHead[0], catHead[1], catHead[2], { delay: 1.65 });
  decorate(head, new ConeGeometry(0.04, 0.08, 4), CAT, [
    [-0.06, 0.22, 0],
    [0.06, 0.22, 0],
  ]);
  decorate(head, new BoxGeometry(0.025, 0.03, 0.01), INK, [
    [-0.04, 0.13, 0.1],
    [0.04, 0.13, 0.1],
  ]);
  const tailRoot = fireman.at(0.0, 1.32, 0.42);
  const tail = limb(kit, tailRoot, fireman.at(-0.12, 1.0, 0.55), 0.035, 0.025, CAT, { delay: 1.7 });
  const tailZ = tail.rotation.z;

  tick((t) => {
    // The fire flickers, the smoke rolls up and away, the cat's tail swishes.
    fires.forEach((part, i) => (part.children[0].scale.y = 1 + Math.sin(t * 9 + i * 1.7) * 0.18));
    smoke.forEach((puff, k) => {
      const v = (t * 0.25 + k / 5) % 1;
      puff.position.set(0.1 + (k - 2) * 0.15 + (k % 2 ? -0.35 : 0.25) * v, G + 1.9 + v * 1.5, WZ + 0.35 + v * 0.2);
      puff.children[0].scale.setScalar(0.6 + v * 0.8);
      puff.visible = v < 0.92;
    });
    tail.rotation.z = tailZ + Math.sin(t * 3) * 0.3;
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
