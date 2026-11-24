import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, colorOf, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bench, column, floor, sign } from "@/lib/diorama-props";

/**
 * Truss (P075): at a bus stop by a broken temple column, the bronze exoskeleton hero holds a bus
 * over his head with a grin of effort. The battery on his chest is down to its last blinking
 * cell, sparks spit from his knee, and a charging cable runs from his back to the charging post:
 * he lifts buses, but on the bench his espresso cup lies spilt.
 */
export function truss(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BRONZE = 0x9a6630;
  const BRONZE_LIGHT = 0xb47c3c;
  const TEAL = 0x2a8aa8;
  const BUS = 0xa8305a;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x2e2f3c, 0x1f2029, 0.5);

  // The stop: a kerb, the blank stop sign, a bench with a spilt espresso, a broken column.
  sign(kit, 1.65, 0.55, G, 0.2, CYAN, 1.75);
  bench(kit, -1.5, 0.75, G, 0.25, 0.7);
  const cup = cylinder(0.045, 0.035, 0.07, 0xf2f0ea, -1.42, G + 0.4, 0.82, { delay: 0.5, rotation: [0, 0.4, Math.PI / 2] }, 10);
  decorate(cup, new TorusGeometry(0.025, 0.008, 6, 10), 0xf2f0ea, [[0.05, 0.035, 0]]);
  box(0.2, 0.004, 0.14, 0x3a2216, -1.3, G + 0.355, 0.8, { delay: 0.52, flat: true, noInk: true, rotation: [0, 0.6, 0] });
  column(kit, -1.45, -1.15, G, 0.15, 2.5, true);

  // The charging post, its screen lit.
  const post = box(0.32, 1.15, 0.22, 0x2a3a48, 1.45, G, -1.1, { delay: 0.3 });
  decorate(post, new BoxGeometry(0.2, 0.16, 0.01), CYAN, [[0, 0.85, 0.115]]);
  decorate(post, new BoxGeometry(0.08, 0.08, 0.01), MAGENTA, [[0, 0.55, 0.115]]);

  // Truss: bronze breastplate and helmet with a crest, bare red arms, teal kilt, bronze greaves.
  const facing = 0.35;
  const h = 2.6;
  const u = h / 2.4;
  const hero = figure(kit, {
    x: -0.1, z: 0.25, y: G, facing, height: h, build: "broad",
    skin: 0xc8786e,
    hair: { style: "bald", color: 0x2a1e1c },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "armor", color: BRONZE, accent: BRONZE_LIGHT, sleeves: "none" },
    bottom: { kind: "skirt", color: 0x2a6a80 },
    belt: BRONZE_LIGHT,
    shoes: 0x3a2c22,
    arms: ["up", "up"],
    legs: "wide",
    delay: 0.8,
  });
  const rot: Point = [0, facing, 0];
  const SW = 0.5 * u;
  const y0 = 1.72 * u;
  [-1, 1].forEach((side) => {
    // Greaves and knee guards, bracers on the forearms.
    const knee = hero.at(side * 0.27 * u, 0.62 * u, 0.03);
    limb(kit, hero.at(side * 0.34 * u, 0.12 * u, 0), knee, 0.17, 0.165, BRONZE, { delay: 1.3 });
    ball(0.16, BRONZE_LIGHT, knee[0], knee[1] - 0.16, knee[2], { delay: 1.32 });
    const elbow: Point = [side * (SW + 0.12 * u), y0 + 0.4 * u, 0.04];
    const wrist: Point = [side * (SW + 0.04 * u), y0 + 0.85 * u, 0.06];
    const from = hero.at(...elbow.map((v, i) => v + (wrist[i] - v) * 0.25) as Point);
    const to = hero.at(...elbow.map((v, i) => v + (wrist[i] - v) * 0.85) as Point);
    const bracer = limb(kit, from, to, 0.14, 0.13, BRONZE, { delay: 1.34 });
    decorate(bracer, new TorusGeometry(0.138, 0.015, 6, 18).rotateX(Math.PI / 2), TEAL, [[0, 0.05, 0]]);
  });

  // The helmet: a bronze dome, cheek guards, a nose guard and a teal crest.
  const [cx, cy, cz] = hero.head;
  const R = hero.headRadius;
  add(new SphereGeometry(R * 1.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), BRONZE, cx, cy + R * 0.2, cz, { delay: 1.4, rotation: rot });
  add(new TorusGeometry(R * 1.13, 0.03, 6, 24).rotateX(Math.PI / 2), 0x6a4220, cx, cy + R * 0.2 - 0.03, cz, { delay: 1.41 });
  [-1, 1].forEach((side) => box(0.05, R * 0.95, R * 0.9, BRONZE, ...hero.at(side * R * 1.02, 2.14 * u - R * 0.55, 0.02), { delay: 1.42, rotation: rot }));
  box(0.05, R * 0.5, 0.04, BRONZE, ...hero.at(0, 2.14 * u - R * 0.05, R * 1.06), { delay: 1.43, rotation: rot });
  const crest = box(0.08, 0.26, R * 2.3, TEAL, ...hero.at(0, 2.14 * u + R * 1.1, -0.04), { delay: 1.46, rotation: rot });
  decorate(crest, new BoxGeometry(0.085, 0.24, 0.02), 0x1a5a70, [-0.18, -0.06, 0.06, 0.18].map((z) => [0, 0.13, z] as Point));

  // The battery on his chest: one cell left, blinking.
  box(0.36, 0.17, 0.05, INK, ...hero.at(0, 1.4 * u, 0.37 * u), { delay: 1.5, rotation: rot });
  box(0.03, 0.08, 0.04, INK, ...hero.at(0.195, 1.445 * u, 0.37 * u), { delay: 1.5, rotation: rot });
  const cells = [-0.12, -0.04, 0.04, 0.12].map((x, k) =>
    box(0.065, 0.11, 0.02, k ? 0x2a2a34 : YELLOW, ...hero.at(x, 1.4 * u + 0.03, 0.39 * u), { delay: 1.55 + k * 0.02, rotation: rot, flat: true, noInk: true }),
  );

  // Sparks spitting from the left knee.
  const knee = hero.at(0.3 * u, 0.62 * u, 0.12);
  const sparks: Group[] = [
    ...zigzag(kit, [knee, [knee[0] + 0.2, knee[1] + 0.12, knee[2] + 0.1], [knee[0] + 0.32, knee[1] + 0.05, knee[2] + 0.2], [knee[0] + 0.45, knee[1] + 0.16, knee[2] + 0.22]], 0.022, YELLOW, 1.7),
    ...zigzag(kit, [knee, [knee[0] + 0.15, knee[1] - 0.12, knee[2] + 0.15], [knee[0] + 0.3, knee[1] - 0.08, knee[2] + 0.3]], 0.022, YELLOW, 1.75),
  ];

  // The charging cable from his back, sagging across the paving to the post.
  cable(kit, [hero.at(0.1, 1.15 * u, -0.38), [0.35, G + 0.05, -0.35], [1.1, G + 0.05, -0.65], [1.45, G + 0.75, -0.98]], 0.028, 0x1a1a22, 1.6);

  // The bus over his head, wheels hanging beside his hands.
  const bottom = 1.72 * u + 0.85 * u + 0.12;
  const bus: Group[] = [];
  const body = box(2.3, 0.85, 0.9, BUS, ...hero.at(0, bottom, 0.06), { delay: 1.9, rotation: rot });
  bus.push(body);
  decorate(body, new BoxGeometry(2.0, 0.3, 0.01), 0x1e3a50, [[0, 0.52, 0.455], [0, 0.52, -0.455]]);
  decorate(body, new BoxGeometry(0.3, 0.22, 0.012), 0x9fe8ff, [[-0.6, 0.52, 0.456], [0.45, 0.52, 0.456]]);
  decorate(body, new BoxGeometry(0.01, 0.36, 0.76), 0x1e3a50, [[1.155, 0.52, 0]]);
  decorate(body, new BoxGeometry(0.012, 0.1, 0.12), YELLOW, [[1.156, 0.16, 0.3], [1.156, 0.16, -0.3]]);
  decorate(body, new BoxGeometry(0.012, 0.1, 0.12), MAGENTA, [[-1.156, 0.16, 0.3], [-1.156, 0.16, -0.3]]);
  decorate(body, new BoxGeometry(2.3, 0.04, 0.01), 0xe8e2d0, [[0, 0.3, 0.455]]);
  [-0.82, 0.82].forEach((x) =>
    [-0.4, 0.4].forEach((z) => bus.push(add(new CylinderGeometry(0.17, 0.17, 0.12, 12).rotateX(Math.PI / 2), 0x23222b, ...hero.at(x, bottom - 0.24, 0.06 + z), { delay: 1.95, rotation: rot }))),
  );

  const busRest = bus.map((part) => part.position.y);
  tick((t) => {
    // The bus trembles a hair, the last cell blinks, the knee crackles.
    const strain = Math.sin(t * 1.3) * 0.015 + Math.sin(t * 17) * 0.004;
    bus.forEach((part, i) => (part.position.y = busRest[i] + strain));
    colorOf(cells[0]).setHex(Math.floor(t * 2.5) % 2 ? MAGENTA : YELLOW);
    const on = Math.floor(t * 9) % 5 !== 3;
    sparks.forEach((spark, i) => (spark.visible = on && (i < 3 || Math.floor(t * 6) % 3 !== 1)));
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
