import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { INK, ORANGE, YELLOW, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Credo (P039): the fanatic of the Figli dell'Ultima preaches from a broken column drum at the
 * foot of the volcano, fist raised in yellow smoke, an hourglass nearly run out in his other
 * hand. Behind him a ruined wall holds a clock stopped a breath before midnight. His price is a
 * mind with no defences: the smoke rising from a crack in the street winds straight into his head.
 */
export function credo(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const COAT = 0x6e1a40;
  const STONE = 0x4e4660;
  const WALL = 0x3a2e48;
  const F = octagonBase(kit, 0x201a24);
  const G = floor(kit, F, 0.06, 0x2c2632, 0x1c1820, 0.45);

  // The ruined wall with its broken top and cracks.
  const wall = box(2.0, 2.3, 0.3, WALL, -0.65, G, -1.45, { delay: 0.1, ink: 1.02 });
  box(0.7, 0.45, 0.3, WALL, -1.3, G + 2.3, -1.45, { delay: 0.14 });
  box(0.45, 0.25, 0.3, WALL, -0.75, G + 2.3, -1.45, { delay: 0.16 });
  decorate(wall, new BoxGeometry(0.02, 0.5, 0.01), INK, [
    [0.6, 1.9, 0.155, 0.4],
    [0.75, 1.5, 0.155, -0.3],
    [-0.8, 0.5, 0.155, 0.2],
  ]);
  rubble(kit, 0.25, -1.05, G, 0.2, 5, 0.35, STONE);

  // The clock, stopped just before midnight: ticks, no numbers.
  const CX = -1.1;
  const CY = G + 1.72;
  const CZ = -1.3;
  add(new TorusGeometry(0.5, 0.05, 8, 32), 0x7a5a30, CX, CY - 0.55, CZ + 0.02, { delay: 0.25 });
  const dial = add(new CylinderGeometry(0.48, 0.48, 0.05, 28).rotateX(Math.PI / 2), 0xd8ccae, CX, CY - 0.48, CZ + 0.02, { delay: 0.28, noInk: true });
  decorate(
    dial,
    new BoxGeometry(0.03, 0.08, 0.01),
    INK,
    Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2;
      return [Math.sin(a) * 0.39, 0.48 + Math.cos(a) * 0.39, 0.03, -a] as [number, number, number, number];
    }),
  );
  box(0.06, 0.24, 0.02, INK, CX, CY, CZ + 0.07, { delay: 0.32, noInk: true, rotation: [0, 0, 0.03] });
  const minute = box(0.04, 0.38, 0.02, INK, CX, CY, CZ + 0.09, { delay: 0.34, noInk: true, rotation: [0, 0, 0.21] });
  ball(0.04, 0x7a5a30, CX, CY - 0.04, CZ + 0.1, { delay: 0.36, noInk: true });

  // The volcano behind, lava running down its face.
  add(new ConeGeometry(0.8, 1.75, 7).scale(1, 1, 0.5), 0x3a2a40, 1.1, G, -1.3, { delay: 0.2 });
  cylinder(0.14, 0.16, 0.04, ORANGE, 1.1, G + 1.66, -1.3, { delay: 0.3, flat: true, noInk: true }, 7);
  // On the cone's face: its depth there shrinks from 0.4 at the foot to nothing at the top.
  const face = (x: number, h: number): Point => [x, G + h, -1.28 + 0.4 * (1 - h / 1.75)];
  zigzag(kit, [face(1.1, 1.62), face(0.98, 1.2), face(1.12, 0.75), face(0.96, 0.15)], 0.05, ORANGE, 0.35);
  zigzag(kit, [face(1.2, 1.5), face(1.38, 0.9), face(1.45, 0.25)], 0.04, YELLOW, 0.4);

  // The crack in the street, glowing, and the smoke rising from it.
  const crack: Point[] = [[-1.75, G, 0.35], [-1.4, G, 0.62], [-1.1, G, 0.52], [-0.85, G, 0.85], [-0.55, G, 0.8]];
  zigzag(kit, crack, 0.1, INK, 0.4);
  zigzag(kit, crack.map(([x, y, z]) => [x, y + 0.05, z] as Point), 0.05, ORANGE, 0.45);
  motes(12, YELLOW, 0.035, [-1.6, G, 0.4], [-0.7, G + 2.0, 0.9], 1.2);

  // The pulpit: a fallen column drum, fluted; candles at its foot.
  const drum = cylinder(0.5, 0.55, 0.36, STONE, 0.15, G, 0.15, { delay: 0.5 }, 14);
  decorate(
    drum,
    new BoxGeometry(0.025, 0.3, 0.01),
    0x3a3448,
    [-0.9, -0.45, 0, 0.45, 0.9].map((a) => [Math.sin(a) * 0.53, 0.18, Math.cos(a) * 0.53] as Point),
  );
  const flames: Group[] = [];
  [
    [0.85, 0.75, 0.26],
    [1.05, 0.55, 0.18],
    [0.7, 0.95, 0.14],
  ].forEach(([x, z, h], i) => {
    cylinder(0.05, 0.05, h, 0xe8dcc0, x, G, z, { delay: 0.6 + i * 0.04 }, 10);
    flames.push(add(new ConeGeometry(0.035, 0.1, 6), YELLOW, x, G + h + 0.01, z, { delay: 0.7 + i * 0.04, flat: true, noInk: true }));
  });

  // Credo: long crimson coat, white collar, grey hair, eyes lit by the smoke.
  const D = 0.85;
  const preacher = figure(kit, {
    x: 0.15,
    z: 0.15,
    y: G + 0.36,
    facing: 0.3,
    height: 2.45,
    skin: 0xdcc4b4,
    hair: { style: "wild", color: 0x8a7e94 },
    face: { mouth: "frown", brows: "angry", eyes: YELLOW, glow: true, marks: 0xa89098 },
    top: { kind: "robe", color: COAT, accent: 0x1a1620 },
    cape: 0x4e1230,
    scarf: 0xf0ece0,
    shoes: 0x1a1620,
    arms: [[-0.42, 1.05, 0.34], "fist"],
    delay: D,
  });
  // Grey hair over the top of the head (the figure's own cap sits low and leaves it bald).
  const R = preacher.headRadius;
  const cap = add(new SphereGeometry(R * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.1, 1.02), 0x8a7e94, preacher.head[0] - 0.01, preacher.head[1] - R * 0.05, preacher.head[2] - 0.03, { delay: D + 0.38 });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-0.6, 0.3, 0);
  // The coat's collar, turned up.
  [-1, 1].forEach((side) =>
    box(0.16, 0.4, 0.05, COAT, ...preacher.at(side * 0.2, 1.62, -0.08), { delay: D + 0.45, rotation: [0, 0.3, -side * 0.35] }),
  );
  const [glassHand, fist] = preacher.hands;

  // The hourglass, nearly run out.
  const [hx, hy, hz] = glassHand;
  const glass = 0xa8e0f0;
  cylinder(0.11, 0.11, 0.03, 0x5e4a3a, hx, hy - 0.17, hz + 0.04, { delay: D + 0.5 });
  add(new ConeGeometry(0.09, 0.15, 12), glass, hx, hy - 0.14, hz + 0.04, { delay: D + 0.52 });
  add(new ConeGeometry(0.09, 0.15, 12).rotateX(Math.PI), glass, hx, hy + 0.01, hz + 0.04, { delay: D + 0.54 });
  add(new ConeGeometry(0.075, 0.1, 12), YELLOW, hx, hy - 0.14, hz + 0.04, { delay: D + 0.56, noInk: true });
  cylinder(0.11, 0.11, 0.03, 0x5e4a3a, hx, hy + 0.16, hz + 0.04, { delay: D + 0.58 });

  // Yellow smoke curling round the fist.
  const curls = [0, 1].map((k) =>
    add(new TorusGeometry(0.15 + k * 0.05, 0.022, 6, 22), YELLOW, fist[0], fist[1] - 0.16 - k * 0.05, fist[2], {
      delay: D + 0.6 + k * 0.05,
      flat: true,
      noInk: true,
      rotation: [1.2 + k * 0.5, 0, 0.3],
    }),
  );

  // The price: puffs of smoke from the crack, drawn along a curl straight into his ear.
  const [ex, ey, ez] = preacher.at(-0.26, 2.12, 0);
  const path = new CatmullRomCurve3([
    new Vector3(-1.0, G + 0.05, 0.7),
    new Vector3(-1.2, G + 0.9, 0.75),
    new Vector3(-1.0, G + 1.8, 0.6),
    new Vector3(ex - 0.3, ey + 0.25, ez + 0.15),
    new Vector3(ex, ey, ez),
  ]);
  const PUFFS = 14;
  const puffs = Array.from({ length: PUFFS }, (_, k) => {
    const r = 0.065 - k * 0.002;
    return { r, part: ball(r, YELLOW, 0, 0, 0, { delay: D + 0.7 + k * 0.03, flat: true, noInk: true }) };
  });

  tick((t) => {
    puffs.forEach(({ r, part }, k) => {
      const u = (k / PUFFS + t * 0.07) % 1;
      const p = path.getPoint(u);
      part.position.set(p.x, p.y - r, p.z);
      part.children[0].scale.setScalar(1 - u * 0.55);
    });
    curls.forEach((curl, k) => (curl.rotation.y = t * (k ? -1.4 : 1.1)));
    // The minute hand creeps towards midnight and never gets there.
    minute.rotation.z = 0.21 - ((t * 0.02) % 0.15);
    flames.forEach((flame, i) => flame.children[0].scale.set(1, 0.8 + 0.25 * Math.abs(Math.sin(t * 9 + i * 2)), 1));
    preacher.headPart.rotation.z = Math.sin(t * 1.3) * 0.04;
  });

  return { width: 4.9, height: 4.6, lookY: 1.65 };
}
