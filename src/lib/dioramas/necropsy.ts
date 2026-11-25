import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { INK, MAGENTA, ORANGE, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Necropsy (P167): the anomaly coroner of the Banco in the tiled morgue, long grey gown, cap and
 * gas mask, holds a gloved hand over the head of a body under a sheet. Under the hanging lamp a
 * chain of thought bubbles rises from the dead man, one after the other, to his last thought:
 * not his killer, a slice of pizza. Behind, the steel drawers of the cold room.
 */
export function necropsy(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STEEL = 0x7a8490;
  const SHEET = 0xd8dce4;
  const F = octagonBase(kit, 0x1e1e26);
  const G = floor(kit, F, 0.06, 0x2e3a40, 0x1e262c, 0.35);

  // The tiled back wall and the bank of cold-room drawers, one left ajar.
  const wall = box(3.2, 2.9, 0.25, 0x3a4a52, -0.1, G, -1.45, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(3.2, 0.012, 0.01), 0x2a363c, Array.from({ length: 9 }, (_, k) => [0, 0.3 + k * 0.3, 0.126] as Point));
  decorate(wall, new BoxGeometry(0.012, 2.9, 0.01), 0x2a363c, Array.from({ length: 10 }, (_, k) => [-1.35 + k * 0.3, 1.45, 0.126] as Point));
  const bank = box(1.3, 2.0, 0.5, STEEL, -1.0, G, -1.1, { delay: 0.2 });
  const doors: Point[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) if (r !== 1 || c !== 1) doors.push([-0.3 + c * 0.6, 0.35 + r * 0.6, 0.251]);
  decorate(bank, new BoxGeometry(0.52, 0.52, 0.01), 0x9aa4b0, doors);
  decorate(
    bank,
    new BoxGeometry(0.18, 0.04, 0.04),
    INK,
    doors.map(([x, y, z]) => [x, y + 0.12, z + 0.02] as Point),
  );
  const ajar = box(0.52, 0.52, 0.12, 0x9aa4b0, -0.7, G + 0.69, -0.79, { delay: 0.3 });
  decorate(ajar, new BoxGeometry(0.18, 0.04, 0.04), INK, [[0, 0.38, 0.07]]);
  decorate(ajar, new BoxGeometry(0.1, 0.06, 0.01), ORANGE, [[0.15, 0.15, 0.061]]);

  // The steel table, the body under the sheet, head to the back and feet to us.
  const TX = 0.8;
  cylinder(0.12, 0.2, 0.78, STEEL, TX, G, -0.15, { delay: 0.3 });
  box(0.7, 0.08, 1.7, 0x9aa4b0, TX, G + 0.78, -0.15, { delay: 0.35 });
  const deck = G + 0.86;
  add(new SphereGeometry(0.3, 16, 10).scale(0.95, 0.5, 2.0), SHEET, TX, deck - 0.02, -0.1, { delay: 0.45 });
  ball(0.17, SHEET, TX, deck, -0.72, { delay: 0.5 });
  [-0.1, 0.1].forEach((dx) => add(new SphereGeometry(0.07, 10, 8).scale(1, 1.5, 0.9), SHEET, TX + dx, deck, 0.55, { delay: 0.55 }));
  const head: Point = [TX, deck + 0.3, -0.72];

  // The hanging lamp over the table.
  cylinder(0.015, 0.015, 0.75, INK, TX - 0.1, G + 2.8, 0.3, { delay: 0.4, noInk: true }, 6);
  add(new ConeGeometry(0.26, 0.22, 14, 1, true), 0x2e3440, TX - 0.1, G + 2.6, 0.3, { delay: 0.42 });
  const bulb = ball(0.09, ORANGE, TX - 0.1, G + 2.5, 0.3, { delay: 0.45, flat: true });

  // A trolley of instruments.
  box(0.5, 0.04, 0.36, STEEL, 1.6, G + 0.6, 0.85, { delay: 0.3 });
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.03, 0.6, 0.03, 0x4a4f5c, 1.6 + sx * 0.22, G, 0.85 + sz * 0.15, { delay: 0.28, noInk: true })));
  const tray = box(0.4, 0.04, 0.26, 0x9aa4b0, 1.6, G + 0.64, 0.85, { delay: 0.35 });
  decorate(tray, new BoxGeometry(0.22, 0.015, 0.025), 0xe8eef2, [
    [-0.02, 0.05, -0.06],
    [0.02, 0.05, 0.02, 0.2],
    [0, 0.05, 0.08],
  ]);

  // Necropsy, gowned and masked, a hand held over the dead man's head.
  const theta = 0.3;
  const doctor = figure(kit, {
    x: -0.1,
    z: 0.05,
    y: G,
    facing: theta,
    height: 2.4,
    skin: 0xd8b8a0,
    face: { mouth: "none", brows: "calm", mask: "lower", maskColor: 0x3a3e46, glasses: "round", glassesColor: 0x9aa0ab },
    headwear: { kind: "bandana", color: 0x7a8a98 },
    top: { kind: "robe", color: 0x8a9aa8 },
    belt: 0x6a7a88,
    shoes: 0x2a2622,
    gloves: 0x2a2e36,
    arms: ["down", [0.74, 1.45, -0.19]],
    delay: 0.8,
  });
  const RH = 0.22;
  decorate(doctor.headPart, new CylinderGeometry(0.055, 0.055, 0.08, 12).rotateX(Math.PI / 2), 0x4a4f5c, [
    [-0.13, RH * 1.06 - 0.1, 0.18],
    [0.13, RH * 1.06 - 0.1, 0.18],
  ]);
  decorate(doctor.headPart, new CylinderGeometry(0.035, 0.035, 0.085, 10).rotateX(Math.PI / 2), 0x9aa0ab, [
    [-0.13, RH * 1.06 - 0.1, 0.19],
    [0.13, RH * 1.06 - 0.1, 0.19],
  ]);

  // The thought bubbles, and the last thought in the big one.
  const small = [0.05, 0.08, 0.11].map((r, k) => ball(r, 0xd8f4ff, head[0] + 0.08 + k * 0.1, head[1] + 0.05 + k * 0.3, head[2] + 0.06 + k * 0.07, { delay: 1.5 + k * 0.08, flat: true }));
  const cloud = add(new SphereGeometry(0.4, 18, 12).scale(1.1, 0.8, 0.35), 0xd8f4ff, head[0] + 0.45, head[1] + 1.1, head[2] + 0.3, { delay: 1.8, flat: true, rotation: [0, 0.35, 0] });
  decorate(cloud, new CylinderGeometry(0.17, 0.17, 0.03, 3).rotateX(Math.PI / 2).rotateZ(-0.2), ORANGE, [[0, 0.32, 0.15]]);
  decorate(cloud, new BoxGeometry(0.26, 0.05, 0.035), 0xd8a050, [[0.02, 0.43, 0.155, -0.2]]);
  decorate(cloud, new CylinderGeometry(0.025, 0.025, 0.01, 10).rotateX(Math.PI / 2), MAGENTA, [
    [-0.03, 0.33, 0.17],
    [0.05, 0.36, 0.17],
    [0.02, 0.26, 0.17],
  ]);
  const thoughts = [...small, cloud];
  const rests = thoughts.map((part) => part.position.y);

  tick((t) => {
    // The thought rises bubble by bubble, holds, and starts again; the bulb buzzes.
    const u = (t * 0.3 + 0.9) % 1;
    thoughts.forEach((part, k) => {
      part.visible = u > 0.1 + k * 0.12;
      part.position.y = rests[k] + Math.sin(t * 1.5 + k) * 0.025;
    });
    bulb.visible = Math.floor(t * 8) % 23 !== 11;
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
