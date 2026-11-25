import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, archMouth, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, table } from "@/lib/diorama-props";

/**
 * Subpoena (P164): in an empty trattoria the documentarist of the Lanterne turns the brass
 * cylinder on her back to the wall, and its lens reads what the plaster kept: the faces of the
 * people who sat there that night come out of the wall in pale cyan, then sink back. The
 * device runs on almost nothing: one battery lamp of three, blinking, and the faces flicker.
 */
export function subpoena(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BRASS = 0xb08d3c;
  const GHOST = 0xa8e4ff;
  const COAT = 0x6a6428;
  const F = octagonBase(kit, 0x221e26);
  const G = floor(kit, F, 0.06, 0x3a3036, 0x2a2228, 0.4);

  // The back wall, cracked plaster, and an arched window on the night harbour.
  const wall = box(3.2, 2.9, 0.3, 0x4a4450, -0.1, G, -1.4, { delay: 0.1, ink: 1.02 });
  decorate(wall, archMouth(0.42, 0.95), 0x5d566e, [[1.0, 0.72, 0.15]]);
  decorate(wall, archMouth(0.35, 0.95), 0x163a52, [[1.0, 0.8, 0.152]]);
  decorate(wall, new BoxGeometry(0.7, 0.3, 0.01), 0x0e2a3e, [[1.0, 0.95, 0.175]]);
  decorate(wall, new BoxGeometry(0.05, 0.05, 0.01), YELLOW, [
    [0.8, 1.2, 0.176],
    [0.92, 1.28, 0.176],
    [1.1, 1.22, 0.176],
    [1.2, 1.34, 0.176],
  ]);
  decorate(wall, new BoxGeometry(0.012, 0.35, 0.01), INK, [
    [-1.3, 0.7, 0.152, 0.4],
    [-1.2, 0.42, 0.152, -0.3],
  ]);
  // The patch of wall the lens reads.
  decorate(wall, new TorusGeometry(0.58, 0.015, 6, 40).scale(1.3, 1, 1), CYAN, [[-0.75, 1.8, 0.152]]);

  // The faces it brings out: a man in a hat, a girl with a bob, an old man with a moustache.
  const WZ = -1.24;
  const faces: { parts: Group[]; z: number[] }[] = [];
  const face = (x: number, y: number, delay: number, extra: (parts: Group[]) => void) => {
    const head = ball(0.17, GHOST, x, G + y - 0.17, WZ, { delay, flat: true });
    decorate(head, new BoxGeometry(0.04, 0.025, 0.02), INK, [
      [-0.055, 0.2, 0.15],
      [0.055, 0.2, 0.15],
    ]);
    decorate(head, new BoxGeometry(0.07, 0.012, 0.02), INK, [[0, 0.1, 0.16]]);
    const parts = [head];
    extra(parts);
    faces.push({ parts, z: parts.map((part) => part.position.z) });
  };
  face(-1.15, 1.8, 1.6, (parts) => {
    parts.push(cylinder(0.26, 0.26, 0.025, 0x6fb8d8, -1.15, G + 1.92, WZ, { delay: 1.65, flat: true }, 18));
    parts.push(cylinder(0.14, 0.16, 0.13, 0x6fb8d8, -1.15, G + 1.94, WZ, { delay: 1.68, flat: true }, 14));
  });
  face(-0.62, 1.45, 1.7, (parts) => {
    parts.push(add(new SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.38), 0x6fb8d8, -0.62, G + 1.51, WZ - 0.01, { delay: 1.75, flat: true }));
    [-1, 1].forEach((side) => parts.push(ball(0.08, 0x6fb8d8, -0.62 + side * 0.16, G + 1.29, WZ - 0.02, { delay: 1.78, flat: true })));
  });
  face(-0.32, 2.12, 1.8, (parts) => {
    const lip = parts[0];
    decorate(lip, new BoxGeometry(0.12, 0.03, 0.03), 0x6fb8d8, [[0, 0.13, 0.165]]);
  });

  // The trattoria table, the checked cloth still laid, a bottle and a glass.
  const desk = table(kit, -1.3, 0.45, G, 0.3, false, 0xd8d2c4);
  decorate(
    desk,
    new BoxGeometry(0.12, 0.004, 0.12),
    MAGENTA,
    Array.from({ length: 12 }, (_, k) => [-0.36 + (k % 4) * 0.24 + (Math.floor(k / 4) % 2) * 0.12, 0.051, -0.24 + Math.floor(k / 4) * 0.24] as Point),
  );
  cylinder(0.06, 0.07, 0.3, 0x1f4a3a, -1.45, G + 0.8, 0.35, { delay: 0.5 }, 10);
  cylinder(0.025, 0.04, 0.12, 0x1f4a3a, -1.45, G + 1.1, 0.35, { delay: 0.52 }, 8);
  cylinder(0.045, 0.035, 0.12, 0xcfeef7, -1.15, G + 0.8, 0.55, { delay: 0.54 }, 10);

  // Subpoena, the cylinder on her back aimed at the wall.
  const theta = 0.2;
  const reader = figure(kit, {
    x: 0.75,
    z: 0.3,
    y: G,
    facing: theta,
    height: 2.35,
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "neutral", brows: "calm", marks: 0xb07a5a },
    top: { kind: "coat", color: COAT, accent: 0x3a3820, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2a2a2a },
    shoes: 0x3a2c22,
    belt: 0x3a2c22,
    arms: [[-0.52, 0.98, 0.14], "down"],
    delay: 0.9,
  });
  const { at } = reader;
  const turn: Point = [0, theta, 0];
  add(new SphereGeometry(0.2, 12, 8).scale(1.4, 0.6, 0.9), COAT, ...at(0, 1.68, -0.14), { delay: 1.3, rotation: turn });
  [-1, 1].forEach((side) => limb(kit, at(side * 0.17, 1.15, 0.25), at(side * 0.18, 1.72, 0.12), 0.026, 0.026, 0x3a2c22, { delay: 1.32 }));
  // The goggles pushed up on her forehead.
  const RH = 0.215;
  decorate(reader.headPart, new CylinderGeometry(0.045, 0.045, 0.07, 10).rotateX(Math.PI / 2), BRASS, [
    [-0.075, RH * 1.06 + 0.14, 0.19],
    [0.075, RH * 1.06 + 0.14, 0.19],
  ]);
  decorate(reader.headPart, new CylinderGeometry(0.032, 0.032, 0.01, 10).rotateX(Math.PI / 2), CYAN, [
    [-0.075, RH * 1.06 + 0.14, 0.23],
    [0.075, RH * 1.06 + 0.14, 0.23],
  ]);
  decorate(reader.headPart, new BoxGeometry(0.4, 0.03, 0.03), 0x3a2c22, [[0, RH * 1.06 + 0.14, 0.13]]);

  const tank = cylinder(0.2, 0.2, 1.9, BRASS, ...at(0, 0.85, -0.48), { delay: 1.1, rotation: turn }, 16);
  decorate(tank, new TorusGeometry(0.205, 0.025, 6, 20).rotateX(Math.PI / 2), 0x3a2c22, [
    [0, 0.4, 0],
    [0, 1.1, 0],
    [0, 1.82, 0],
  ]);
  decorate(tank, new SphereGeometry(0.04, 8, 6), 0x2a2622, [
    [0.15, 1.72, 0.13],
    [0.15, 1.62, 0.13],
  ]);
  const battery = decorate(tank, new SphereGeometry(0.04, 8, 6), MAGENTA, [[0.15, 1.52, 0.13]]);
  cylinder(0.17, 0.2, 0.08, 0x3a2c22, ...at(0, 2.75, -0.48), { delay: 1.2 });
  const mouth = at(0, 2.86, -0.48);
  const lens: Point = [mouth[0] - 0.24, mouth[1] - 0.1, mouth[2] - 0.1];
  limb(kit, mouth, lens, 0.07, 0.09, 0x3a2c22, { delay: 1.25 });
  const glass = ball(0.075, CYAN, lens[0], lens[1] - 0.075, lens[2], { delay: 1.3, flat: true });
  const rays = [
    [-1.15, 1.7],
    [-0.62, 1.35],
    [-0.32, 2.02],
  ].map(([x, y], k) => limb(kit, lens, [x, G + y, WZ + 0.2], 0.008, 0.008, CYAN, { delay: 1.5 + k * 0.05, flat: true, noInk: true }));

  tick((t) => {
    // The faces breathe out of the wall and back; when the last lamp blinks, they flicker out.
    const on = Math.sin(t * 2.3) > -0.85;
    battery.color.setHex(on ? MAGENTA : 0x2a2622);
    faces.forEach((item, k) =>
      item.parts.forEach((part, i) => {
        part.position.z = item.z[i] + 0.06 + Math.sin(t * 0.9 + k * 2.1) * 0.06;
        part.visible = on || (k + Math.floor(t * 9)) % 2 === 0;
      }),
    );
    rays.forEach((ray) => (ray.visible = on));
    glass.visible = on;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
