import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, type Group } from "three";
import { ORANGE, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Hospes (P176): the guest who was let in now sits at the head of his hosts' table, in the
 * master's velvet armchair, a white napkin draped over his head and only his smile showing; he
 * holds up his glass and the lady of the house, in her evening dress, fills it with a shaking
 * hand. Her husband sits stiff behind the candles, and the front door still stands open.
 */
export function hospes(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WALL = 0x3a2440;
  const VELVET = 0x7a1a3a;
  const GILT = 0xa08850;
  const CLOTH = 0xe8e2d4;
  const WOOD = 0x4a3028;
  const F = octagonBase(kit, 0x1c1820);
  const G = floor(kit, F, 0.06, 0x3a2a2e, 0x2a1e22, 0.35);
  const flames: Group[] = [];
  const candle = (x: number, y: number, z: number, tall: number, delay: number) => {
    cylinder(0.025, 0.025, tall, CLOTH, x, y, z, { delay }, 8);
    flames.push(add(new ConeGeometry(0.03, 0.09, 6), ORANGE, x, y + tall, z, { delay: delay + 0.05, flat: true, noInk: true }));
  };

  // The dining-room wall, the front door open in it onto the night, a sconce.
  const wall = add(archedWall(2.6, 2.8, 0.2, { x: 0.85, half: 0.36, spring: 1.2 }), WALL, 0, G, -1.55, { delay: 0.08, ink: 1.02 });
  decorate(wall, new BoxGeometry(2.6, 0.06, 0.01), GILT, [[0, 0.9, 0.105]]);
  decorate(wall, new BoxGeometry(0.6, 0.6, 0.01), 0x2e1c34, [
    [-0.95, 1.85, 0.105],
    [-0.2, 1.85, 0.105],
  ]);
  add(archMouth(0.36, 1.2), 0x1e4a6a, 0.85, G, -1.67, { delay: 0.12, flat: true, noInk: true });
  box(0.06, 1.5, 0.66, 0x5a3a2a, 1.24, G, -1.2, { delay: 0.2, rotation: [0, 0.45, 0] });
  box(0.7, 0.02, 0.4, 0x6a4a3a, 0.85, G, -1.2, { delay: 0.22, noInk: true });
  box(0.06, 0.06, 0.16, GILT, -0.55, G + 1.3, -1.37, { delay: 0.3 });
  candle(-0.55, G + 1.36, -1.3, 0.2, 0.32);

  // The long table on the left, laid under a lace cloth, candles at both ends.
  const [TX, TZ] = [-1.0, -0.45];
  box(1.6, 0.74, 0.8, WOOD, TX, G, TZ, { delay: 0.4 });
  const cloth = box(1.7, 0.04, 0.9, CLOTH, TX, G + 0.74, TZ, { delay: 0.45 });
  const skirt = box(1.7, 0.3, 0.02, CLOTH, TX, G + 0.46, TZ + 0.45, { delay: 0.46 });
  decorate(skirt, new SphereGeometry(0.03, 6, 4), 0xc8c2b4, Array.from({ length: 14 }, (_, k) => [-0.78 + k * 0.12, 0, 0.012] as Point));
  decorate(cloth, new BoxGeometry(0.02, 0.006, 0.86), 0xc8c2b4, [
    [-0.4, 0.041, 0],
    [0.4, 0.041, 0],
  ]);
  [-0.55, 0, 0.55].forEach((dx, k) => cylinder(0.13, 0.13, 0.02, 0xf4f0e6, TX + dx, G + 0.78, TZ + 0.2, { delay: 0.5 + k * 0.03 }, 14));
  [-0.62, 0.62].forEach((dx, i) => {
    const [x, y, z] = [TX + dx, G + 0.78, TZ - 0.12];
    cylinder(0.03, 0.08, 0.42, GILT, x, y, z, { delay: 0.55 + i * 0.05 }, 8);
    box(0.42, 0.04, 0.04, GILT, x, y + 0.4, z, { delay: 0.58 + i * 0.05 });
    [-0.18, 0, 0.18].forEach((d, k) => candle(x + d, y + 0.44, z, k === 1 ? 0.22 : 0.16, 0.6 + k * 0.02));
  });

  // The husband, sat stiff behind the table.
  box(0.5, 0.5, 0.5, WOOD, TX, G, TZ - 0.7, { delay: 0.6 });
  box(0.5, 0.75, 0.08, WOOD, TX, G + 0.5, TZ - 0.93, { delay: 0.62 });
  figure(kit, {
    x: TX,
    z: TZ - 0.7,
    y: G,
    facing: 0.15,
    height: 2.2,
    skin: 0xd8a888,
    hair: { style: "bald", color: 0x8a8a92 },
    face: { mouth: "open", brows: "raised", beard: "moustache", beardColor: 0x8a8a92 },
    top: { kind: "suit", color: 0x2a2e3e, accent: 0xe8e4dc, tie: 0x14121c },
    bottom: { kind: "trousers", color: 0x2a2e3e },
    arms: [
      [-0.22, 1.0, 0.42],
      [0.22, 1.0, 0.42],
    ],
    legs: "sit",
    delay: 0.9,
  });

  // The master's armchair at the head of the table, and Hospes in it.
  const theta = 0.3;
  const [cx, cz] = [0.45, -0.7];
  const local = (x: number, y: number, z: number): Point => [cx + x * Math.cos(theta) + z * Math.sin(theta), G + y, cz - x * Math.sin(theta) + z * Math.cos(theta)];
  const turn: Point = [0, theta, 0];
  const back = box(0.82, 1.75, 0.14, VELVET, ...local(0, 0, -0.42), { delay: 0.4, rotation: turn });
  decorate(back, new BoxGeometry(0.86, 0.06, 0.16), GILT, [[0, 1.75, 0]]);
  add(new SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 0.3), VELVET, ...local(0, 1.72, -0.42), { delay: 0.42, rotation: turn });
  box(0.82, 0.58, 0.72, VELVET, ...local(0, 0, -0.02), { delay: 0.44, rotation: turn });
  [-1, 1].forEach((side) => {
    const rest = box(0.12, 0.3, 0.7, 0x5e1430, ...local(side * 0.44, 0.58, -0.02), { delay: 0.46, rotation: turn });
    decorate(rest, new BoxGeometry(0.13, 0.04, 0.71), GILT, [[0, 0.3, 0]]);
  });

  const guest = figure(kit, {
    x: cx,
    z: cz,
    y: G,
    facing: theta,
    height: 2.6,
    build: "slim",
    skin: 0xd8c8b8,
    hair: { style: "short", color: 0x14121c },
    face: { mouth: "grin", brows: "none" },
    top: { kind: "suit", color: 0x1c1822, accent: 0xe8e4dc, tie: 0x2a1a24 },
    bottom: { kind: "trousers", color: 0x1c1822 },
    shoes: 0x14121c,
    arms: [
      [-0.24, 1.86, 0.17],
      [0.42, 1.28, 0.45],
    ],
    legs: "sit",
    delay: 1.0,
  });
  // The napkin over his head, down to the tip of his nose, falling to his shoulders.
  const R = guest.headRadius * 1.12;
  const [hx, hy, hz] = guest.head;
  const rim = hy + R * 1.1 * Math.cos(Math.PI * 0.57);
  const cap = add(new SphereGeometry(R, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.57).scale(1, 1.1, 1), CLOTH, hx, rim, hz, { delay: 1.5, rotation: turn });
  decorate(cap, new BoxGeometry(0.2, 0.012, 0.01), 0xc8c2b4, [[0, R * 0.5, R * 0.95]]);
  const drape = new CylinderGeometry(R * 1.0, R * 1.45, R * 1.6, 18, 1, true, 0.9, Math.PI * 2 - 1.8);
  add(drape, CLOTH, hx, rim - R * 1.6 + 0.02, hz, { delay: 1.52, rotation: turn });
  add(drape.clone().scale(-0.97, 1, 0.97), 0xc8c2b4, hx, rim - R * 1.6 + 0.02, hz, { delay: 1.52, rotation: turn, noInk: true });
  // His glass held up, the lady filling it.
  const [, raised] = guest.hands;
  const glass: Point = [raised[0], raised[1] + 0.06, raised[2]];
  cylinder(0.012, 0.012, 0.12, 0xbfe8f0, ...glass, { delay: 1.6, noInk: true }, 8);
  const cup = add(new ConeGeometry(0.075, 0.13, 10).rotateX(Math.PI), 0xbfe8f0, glass[0], glass[1] + 0.12, glass[2], { delay: 1.62 });
  decorate(cup, new CylinderGeometry(0.05, 0.03, 0.05, 10), 0x7a1428, [[0, 0.065, 0]]);

  const pour = 2.2;
  const grip: Point = [glass[0] + 0.46 * Math.sin(pour), glass[1] + 0.32 - 0.46 * Math.cos(pour), glass[2]];
  const lf = -0.7;
  const [lx, lz] = [grip[0] - (-0.1 * Math.cos(lf) + 0.45 * Math.sin(lf)), grip[2] - (0.1 * Math.sin(lf) + 0.45 * Math.cos(lf))];
  figure(kit, {
    x: lx,
    z: lz,
    y: G,
    facing: lf,
    height: 2.25,
    skin: 0xe8c4a8,
    hair: { style: "bun", color: 0x6a3a22 },
    face: { mouth: "frown", brows: "worried" },
    top: { kind: "dress", color: 0x8a1e46, sleeves: "none" },
    shoes: 0x2a1a24,
    scarf: 0xf4f0e6,
    arms: [
      [-0.1, grip[1] - G, 0.45],
      [0.08, 1.4, 0.25],
    ],
    delay: 1.2,
  });
  const bottle = add(new CylinderGeometry(0.06, 0.06, 0.34, 10), 0x1e3a2a, ...grip, { delay: 1.7, rotation: [0, 0, pour] });
  decorate(bottle, new CylinderGeometry(0.025, 0.03, 0.12, 8), 0x1e3a2a, [[0, 0.4, 0]]);
  const stream = limb(kit, [glass[0], glass[1] + 0.3, glass[2]], [glass[0], glass[1] + 0.2, glass[2]], 0.012, 0.012, 0x8a1a30, { delay: 1.8, flat: true, noInk: true });

  const tilt = bottle.rotation.z;
  tick((t) => {
    // The candles flicker; the bottle shakes in her hand and the wine comes in fits.
    flames.forEach((flame, i) => flame.children[0].scale.set(1, 0.8 + 0.35 * Math.abs(Math.sin(t * 6.5 + i * 1.9)), 1));
    bottle.rotation.z = tilt + Math.sin(t * 23) * 0.035;
    stream.visible = Math.sin(t * 1.3) > -0.6;
  });

  return { width: 4.9, height: 4.4, lookY: 1.4 };
}
