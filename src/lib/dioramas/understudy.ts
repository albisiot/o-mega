import { BoxGeometry, ConeGeometry, CylinderGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, potted } from "@/lib/diorama-props";

/**
 * Understudy (P008): the infiltrator of the Compagnia Lete, late at night in the office she has
 * "worked in for years" (her portrait hangs three times on the wall), a finger to her lips while
 * her stick copies the files onto the laptop and the security camera looks the other way. She
 * never changed the water-cooler bottle: the full one still sits on the floor, too heavy for her.
 */
export function understudy(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WALL = 0x2a3248;
  const GREY = 0x5a6070;
  const SKIN = 0xe0b49a;
  const HAIR = 0x5a3a2a;
  const PAPER = 0xe8e2d0;
  const F = octagonBase(kit, 0x1e2230);
  const G = floor(kit, F, 0.06, 0x2e3446, 0x222838, 0.42);

  // The wall: a window on the night city, and three portraits of her from three different years.
  const wall = box(3.4, 2.6, 0.24, WALL, -0.05, G, -1.35, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(1.3, 1.0, 0.01), 0x101a2c, [[0.85, 1.55, 0.121]]);
  decorate(
    wall,
    new BoxGeometry(0.08, 0.1, 0.01),
    YELLOW,
    [
      [0.4, 1.3],
      [0.62, 1.7],
      [0.9, 1.25],
      [1.1, 1.6],
      [1.3, 1.85],
      [0.7, 1.95],
    ].map(([x, y]) => [x, y, 0.123] as Point),
  );
  decorate(wall, new BoxGeometry(1.36, 0.05, 0.03), GREY, [
    [0.85, 1.03, 0.13],
    [0.85, 2.07, 0.13],
  ]);
  const frames = [-1.4, -0.9, -0.4].map((x, k) => [x, 2.05 + (k % 2) * 0.1] as const);
  const on = (dx: number, dy: number, z: number): Point[] => frames.map(([x, y]) => [x + dx, y + dy, z]);
  decorate(wall, new BoxGeometry(0.34, 0.42, 0.01), 0x6a4a30, on(0, 0, 0.122));
  decorate(wall, new BoxGeometry(0.28, 0.36, 0.01), 0x9fb8c8, on(0, 0, 0.126));
  decorate(wall, new BoxGeometry(0.12, 0.14, 0.01), SKIN, on(0, -0.02, 0.13));
  decorate(wall, new BoxGeometry(0.16, 0.06, 0.01), HAIR, on(0, 0.08, 0.132));
  decorate(wall, new BoxGeometry(0.12, 0.025, 0.01), 0x1a1a22, on(0, -0.01, 0.134));
  decorate(wall, new BoxGeometry(0.22, 0.1, 0.01), 0x4a4e5a, on(0, -0.13, 0.13));

  // A security camera high in the corner, sweeping the room.
  box(0.06, 0.06, 0.3, GREY, -1.55, G + 2.3, -1.1, { delay: 0.3, noInk: true });
  const cam = add(new BoxGeometry(0.16, 0.14, 0.3).translate(0, 0, 0.1), 0xd8dce6, -1.55, G + 2.15, -0.95, { delay: 0.35 });
  decorate(cam, new BoxGeometry(0.05, 0.05, 0.01), MAGENTA, [[0, 0.07, 0.26]]);

  // The filing cabinet, its top drawer pulled out.
  const cabinet = box(0.5, 1.1, 0.55, GREY, -1.45, G, -0.75, { delay: 0.3 });
  decorate(cabinet, new BoxGeometry(0.42, 0.01, 0.01), 0x3a3f4e, [
    [0, 0.37, 0.276],
    [0, 0.73, 0.276],
  ]);
  decorate(cabinet, new BoxGeometry(0.12, 0.03, 0.02), 0xc8ccd4, [
    [0, 0.25, 0.28],
    [0, 0.6, 0.28],
  ]);
  box(0.44, 0.3, 0.4, GREY, -1.45, G + 0.76, -0.33, { delay: 0.45 });
  [-0.12, -0.02, 0.08].forEach((dx, i) => box(0.04, 0.32, 0.3, i % 2 ? 0xd8c25a : PAPER, -1.45 + dx, G + 0.8, -0.33, { delay: 0.5 + i * 0.02, rotation: [0, 0, 0.15] }));

  // Her desk: the stack of files, the laptop with her stick in it, the magenta lamp.
  const DX = 0.85;
  const DZ = -0.05;
  box(1.3, 0.05, 0.62, 0x3a3040, DX, G + 0.72, DZ, { delay: 0.35 });
  [-1, 1].forEach((s) => box(0.05, 0.72, 0.56, 0x2a2430, DX + s * 0.6, G, DZ, { delay: 0.32 }));
  [0, 1, 2, 3, 4].forEach((k) => box(0.36, 0.045, 0.28, k % 2 ? 0xd8d2c4 : PAPER, 0.4, G + 0.77 + k * 0.045, 0.0, { delay: 0.5 + k * 0.02, rotation: [0, (k % 3) * 0.06, 0] }));
  box(0.52, 0.03, 0.36, 0x23222b, DX + 0.1, G + 0.77, DZ, { delay: 0.55 });
  const screen = box(0.52, 0.36, 0.03, 0x23222b, DX + 0.1, G + 0.78, DZ - 0.19, { delay: 0.6, rotation: [-0.2, 0, 0] });
  decorate(screen, new BoxGeometry(0.46, 0.3, 0.01), 0x0f2a44, [[0, 0.18, 0.016]]);
  decorate(screen, new BoxGeometry(0.4, 0.05, 0.01), 0x0a1626, [[0, 0.12, 0.022]]);
  const bar = add(new BoxGeometry(0.38, 0.03, 0.01).translate(0.19, 0, 0), YELLOW, DX + 0.1 - 0.19, G + 0.78 + 0.1, DZ - 0.16, { delay: 0.7, flat: true, noInk: true, rotation: [-0.2, 0, 0] });
  box(0.1, 0.035, 0.04, MAGENTA, DX - 0.2, G + 0.775, DZ + 0.02, { delay: 0.65 });
  const led = box(0.025, 0.025, 0.025, CYAN, DX - 0.26, G + 0.78, DZ + 0.02, { delay: 0.7, flat: true, noInk: true });
  cylinder(0.1, 0.12, 0.03, 0x23222b, 1.35, G + 0.77, -0.25, { delay: 0.6 }, 12);
  cylinder(0.02, 0.02, 0.5, 0x23222b, 1.35, G + 0.8, -0.25, { delay: 0.62, rotation: [0, 0, 0.35] }, 6);
  add(new ConeGeometry(0.14, 0.18, 12).rotateX(Math.PI), 0x23222b, 1.12, G + 1.18, -0.2, { delay: 0.66 });
  box(0.14, 0.02, 0.14, MAGENTA, 1.12, G + 1.17, -0.2, { delay: 0.68, flat: true, noInk: true });
  potted(kit, 1.55, 0.75, G, 0.5);

  // The water cooler, empty; the full bottle is still on the floor beside it.
  box(0.34, 0.95, 0.34, 0xd8dce6, -1.35, G, 0.55, { delay: 0.4 });
  cylinder(0.14, 0.14, 0.34, 0x9fd8f0, -1.35, G + 0.95, 0.55, { delay: 0.45 }, 14);
  add(new CylinderGeometry(0.15, 0.15, 0.4, 14).rotateZ(Math.PI / 2), 0x2a8ac8, -0.95, G, 1.0, { delay: 0.5, rotation: [0, 0.7, 0] });

  // Understudy: bun, glasses, grey cardigan over a white shirt; "shh", with a little smile.
  const mole = figure(kit, {
    x: -0.3,
    z: 0.3,
    y: G,
    facing: 0.4,
    height: 2.3,
    build: "slim",
    skin: SKIN,
    hair: { style: "bun", color: HAIR },
    face: { mouth: "smirk", brows: "raised", glasses: "round", glassesColor: 0x2a1e1a },
    top: { kind: "jacket", color: 0x4a4e5a, accent: PAPER },
    bottom: { kind: "trousers", color: 0x2a2a3a },
    shoes: 0x2a1e1a,
    arms: [[-0.03, 1.88, 0.3], [0.62, 1.02, 0.12]],
    delay: 0.8,
  });

  tick((t) => {
    // The copy fills up and starts again, the stick blinks, the camera sweeps, she glances round.
    bar.children[0].scale.x = 0.15 + ((t * 0.15 + 0.5) % 1) * 0.85;
    led.visible = Math.floor(t * 6) % 2 === 0;
    cam.rotation.y = 0.6 + Math.sin(t * 0.5) * 0.6;
    const look = Math.sin(t * 0.6);
    mole.headPart.rotation.y = 0.4 + (look > 0.8 ? 0.3 : look < -0.8 ? -0.3 : 0);
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
