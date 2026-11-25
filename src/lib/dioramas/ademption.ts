import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from "three";
import { CYAN, ORANGE, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Ademption (P197): the grey clerk who takes over other people's lives, standing in a dead man's
 * flat as if it were his own: green hat, grey overcoat, cream gloves, a green folder under his
 * arm. The moka steams for two cups at the usual hour, the rent envelope waits on the lace, the
 * old man's identical hat and coat hang on the rack, and in the wedding photo on the wall the
 * groom's face keeps flickering into his.
 */
export function ademption(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const GREEN = 0x2a5a40;
  const GREEN_DARK = 0x1f3a2c;
  const COAT = 0x5a5e68;
  const LACE = 0xe8e2d0;
  const FRAME = 0x8a6a2a;
  const WOOD = 0x4e3a2e;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x3e3236, 0x2c2226, 0.3);

  // The wall: wallpaper, the window on the volcano, the family photographs.
  const wall = box(2.8, 2.7, 0.2, 0x2f3a52, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  decorate(
    wall,
    new BoxGeometry(0.03, 2.7, 0.01),
    0x36425e,
    Array.from({ length: 10 }, (_, k) => [-1.3 + k * 0.29, 1.35, 0.105] as Point),
  );
  decorate(wall, new BoxGeometry(0.78, 1.0, 0.012), 0x14121c, [[0.8, 1.55, 0.11]]);
  decorate(wall, new BoxGeometry(0.66, 0.88, 0.014), ORANGE, [[0.8, 1.55, 0.115]]);
  decorate(wall, new ConeGeometry(0.26, 0.3, 4).scale(1, 1, 0.05), 0x4a2a4a, [[0.85, 1.38, 0.125]]);
  decorate(wall, new BoxGeometry(0.66, 0.16, 0.014), 0x3a3048, [[0.8, 1.19, 0.13]]);
  decorate(wall, new BoxGeometry(0.66, 0.035, 0.016), 0x14121c, [[0.8, 1.55, 0.135]]);
  [0.38, 1.22].forEach((x, k) => box(0.18, 1.15, 0.06, LACE, x, G + 1.02, -1.6, { delay: 0.18 + k * 0.02 }));
  const PHOTO = -0.08;
  const photo = box(0.52, 0.64, 0.04, FRAME, PHOTO, G + 1.3, -1.63, { delay: 0.22 });
  decorate(photo, new BoxGeometry(0.42, 0.54, 0.01), 0x6a5844, [[0, 0.32, 0.021]]);
  decorate(photo, new BoxGeometry(0.15, 0.22, 0.01), LACE, [[-0.09, 0.17, 0.027]]);
  decorate(photo, new BoxGeometry(0.15, 0.24, 0.01), 0x2a2830, [[0.09, 0.18, 0.027]]);
  decorate(photo, new CylinderGeometry(0.045, 0.045, 0.01, 14).rotateX(Math.PI / 2), 0xc8a080, [[-0.09, 0.38, 0.03]]);
  decorate(photo, new CylinderGeometry(0.05, 0.05, 0.01, 14).rotateX(Math.PI / 2), 0x3a2a22, [[-0.09, 0.42, 0.028]]);
  // The groom's face: the old tenant, or him.
  const face = (hat: boolean): ReturnType<typeof box> => {
    const part = box(0.001, 0.001, 0.001, 0x6a5844, PHOTO + 0.09, G + 1.3, -1.6, { delay: 0.3, noInk: true });
    decorate(part, new CylinderGeometry(0.045, 0.045, 0.01, 14).rotateX(Math.PI / 2), 0xc8a080, [[0, 0.39, 0.006]]);
    if (hat) {
      decorate(part, new BoxGeometry(0.13, 0.015, 0.01), GREEN, [[0, 0.43, 0.012]]);
      decorate(part, new BoxGeometry(0.07, 0.05, 0.01), GREEN, [[0, 0.46, 0.012]]);
    } else decorate(part, new BoxGeometry(0.07, 0.015, 0.01), 0xe8e2d0, [[0, 0.375, 0.012]]);
    return part;
  };
  const oldGroom = face(false);
  const newGroom = face(true);
  [
    [-1.2, 1.05, 0.28, 0.34],
    [-0.55, 1.85, 0.24, 0.3],
  ].forEach(([x, y, w, h], i) => {
    const frame = box(w, h, 0.04, FRAME, x, G + y, -1.63, { delay: 0.25 + i * 0.03 });
    decorate(frame, new BoxGeometry(w - 0.06, h - 0.06, 0.01), 0x6a5844, [[0, h / 2, 0.021]]);
    decorate(frame, new CylinderGeometry(0.04, 0.04, 0.01, 12).rotateX(Math.PI / 2), 0xc8a080, [[0, h * 0.6, 0.027]]);
  });
  add(new CylinderGeometry(0.13, 0.13, 0.03, 18).rotateX(Math.PI / 2), 0xd8e0ea, -0.05, G + 2.1, -1.62, { delay: 0.3 });

  // The sideboard with its vase, and the coat rack with the old man's hat and coat, just like his.
  const dresser = box(0.9, 0.85, 0.42, WOOD, -1.35, G, -1.05, { delay: 0.3, rotation: [0, 0.7, 0] });
  decorate(dresser, new BoxGeometry(0.8, 0.02, 0.01), 0x2e2218, [
    [0, 0.3, 0.215],
    [0, 0.58, 0.215],
  ]);
  decorate(dresser, new BoxGeometry(0.5, 0.01, 0.3), LACE, [[0, 0.855, 0]]);
  add(new SphereGeometry(0.13, 14, 10).scale(1, 1.3, 1), 0xd8e0ea, -1.3, G + 0.86, -1.05, { delay: 0.36 });
  cylinder(0.05, 0.07, 0.12, 0xd8e0ea, -1.3, G + 1.18, -1.05, { delay: 0.38 }, 10);
  cylinder(0.2, 0.22, 0.04, WOOD, -1.45, G, 0.55, { delay: 0.4 }, 10);
  cylinder(0.03, 0.035, 1.95, WOOD, -1.45, G, 0.55, { delay: 0.42 }, 8);
  add(new CylinderGeometry(0.1, 0.28, 1.05, 14).scale(1, 1, 0.7), COAT, -1.38, G + 0.75, 0.62, { delay: 0.45 });
  cylinder(0.32, 0.32, 0.025, GREEN, -1.45, G + 1.95, 0.55, { delay: 0.48 }, 20);
  cylinder(0.17, 0.19, 0.17, GREEN, -1.45, G + 1.96, 0.55, { delay: 0.5 }, 14);
  cylinder(0.195, 0.195, 0.04, GREEN_DARK, -1.45, G + 1.98, 0.55, { delay: 0.52, noInk: true }, 14);

  // The table: lace, the moka pot steaming for two, and the rent envelope.
  const TX = 1.05;
  const TZ = 0.15;
  table(kit, TX, TZ, G, 0.5, true, 0x3a3040, 0.75);
  cylinder(0.44, 0.47, 0.22, LACE, TX, G + 0.57, TZ, { delay: 0.56 }, 18);
  const H = G + 0.8;
  cylinder(0.07, 0.09, 0.12, 0x8a93a3, TX - 0.1, H, TZ - 0.12, { delay: 0.6 }, 8);
  cylinder(0.09, 0.07, 0.12, 0x8a93a3, TX - 0.1, H + 0.12, TZ - 0.12, { delay: 0.62 }, 8);
  add(new ConeGeometry(0.07, 0.06, 8), 0x8a93a3, TX - 0.1, H + 0.24, TZ - 0.12, { delay: 0.64 });
  box(0.03, 0.12, 0.03, 0x14121c, TX - 0.2, H + 0.08, TZ - 0.12, { delay: 0.66 });
  [
    [0.12, 0.08],
    [-0.18, 0.2],
  ].forEach(([dx, dz], i) => {
    cylinder(0.08, 0.08, 0.012, LACE, TX + dx, H, TZ + dz, { delay: 0.68 + i * 0.03 }, 14);
    cylinder(0.05, 0.04, 0.06, 0xd8e0ea, TX + dx, H + 0.012, TZ + dz, { delay: 0.7 + i * 0.03 }, 12);
  });
  const envelope = box(0.24, 0.015, 0.15, LACE, TX + 0.14, H, TZ - 0.18, { delay: 0.74, rotation: [0, 0.4, 0] });
  decorate(envelope, new BoxGeometry(0.16, 0.012, 0.06), CYAN, [[0.03, 0.012, -0.06]]);
  motes(6, 0xdfe8f0, 0.022, [TX - 0.14, H + 0.3, TZ - 0.16], [TX - 0.04, H + 0.85, TZ - 0.08], 1.0);
  // A chair waiting at the table.
  box(0.42, 0.06, 0.42, WOOD, TX - 0.25, G + 0.45, TZ + 0.65, { delay: 0.6, rotation: [0, 0.5, 0] });
  box(0.42, 0.5, 0.05, 0x3a5a4a, TX - 0.15, G + 0.51, TZ + 0.83, { delay: 0.62, rotation: [0, 0.5, 0] });
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.04, 0.45, 0.04, WOOD, TX - 0.25 + sx * 0.15, G, TZ + 0.65 + sz * 0.15, { delay: 0.6, noInk: true })));

  // Ademption, as if at home.
  const clerk = figure(kit, {
    x: -0.4,
    z: 0.35,
    y: G,
    facing: 0.3,
    height: 2.45,
    skin: 0xd0a080,
    hair: { style: "short", color: 0x3a3634 },
    face: { mouth: "neutral", brows: "calm" },
    headwear: { kind: "hat", color: GREEN, accent: GREEN_DARK },
    top: { kind: "coat", color: COAT, accent: LACE },
    bottom: { kind: "trousers", color: 0x3a3c44 },
    gloves: LACE,
    shoes: 0x1f1d22,
    arms: [[-0.4, 1.17, 0.24], "down"],
    delay: 0.8,
  });
  const at = clerk.at;
  const turn: Point = [0, 0.3, 0];
  box(0.06, 0.32, 0.02, GREEN, ...at(0, 1.36, 0.262), { delay: 1.3, rotation: turn });
  const folder = box(0.1, 0.42, 0.52, GREEN, ...at(-0.46, 1.08, 0.16), { delay: 1.35, rotation: turn });
  decorate(folder, new BoxGeometry(0.11, 0.05, 0.03), 0xc8a040, [[0, 0.32, 0.24]]);
  ball(0.04, LACE, ...at(-0.4, 1.12, 0.3), { delay: 1.4 });

  tick((t) => {
    // Now and then the old man is back in his wedding photo, for a moment.
    const old = Math.sin(t * 0.7) > 0.85;
    oldGroom.visible = old;
    newGroom.visible = !old;
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
