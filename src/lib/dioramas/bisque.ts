import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, SphereGeometry, TetrahedronGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Bisque (P128): the porcelain automaton of the Compagnia Lete serves coffee at a board meeting,
 * white glaze painted with blue flowers, a lace ruff, a silver mask over one eye and a brass ear
 * trumpet turned towards the director talking at the table: everything he says runs down the
 * trumpet in a stream of cyan. The tray trembles in her hands, and a chip of her lies on the floor.
 */
export function bisque(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const GLAZE = 0xf4f2ee;
  const BLUE = 0x2a4ab0;
  const SILVER = 0xb8bcc8;
  const BRASS = 0xc8a040;
  const WOOD = 0x3e2a24;
  const F = octagonBase(kit, 0x1a1822);
  const G = floor(kit, F, 0.06, 0x2e2436, 0x241c2a, 0);

  // The boardroom: panelled wall, a tall window on the volcano at night.
  const wall = box(2.8, 2.7, 0.12, 0x242032, 0, G, -1.72, { delay: 0.08, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.03, 2.6, 0.01), 0x1a1726, [-1.0, -0.4, 0.2, 1.2].map((x) => [x, 1.35, 0.062] as Point));
  decorate(wall, new BoxGeometry(0.8, 1.3, 0.01), 0x14121c, [[0.65, 1.55, 0.062]]);
  decorate(wall, new BoxGeometry(0.7, 1.2, 0.01), 0x1a2a4a, [[0.65, 1.55, 0.064]]);
  decorate(wall, new ConeGeometry(0.32, 0.42, 3).scale(1, 1, 0.05), 0x3a2a40, [[0.65, 1.16, 0.07]]);
  decorate(wall, new BoxGeometry(0.1, 0.035, 0.01), YELLOW, [[0.65, 1.36, 0.08]]);
  decorate(wall, new BoxGeometry(0.03, 1.2, 0.01), 0x14121c, [[0.65, 1.55, 0.07]]);

  // The long table with the director's papers, glasses and a lamp; his tall chair.
  const top = box(1.8, 0.06, 0.75, WOOD, -0.6, G + 0.75, -0.85, { delay: 0.2 });
  decorate(top, new BoxGeometry(0.22, 0.008, 0.3), GLAZE, [
    [-0.3, 0.064, 0.15],
    [0.45, 0.064, 0.1],
  ]);
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.06, 0.75, 0.06, 0x2a1e1a, -0.6 + sx * 0.82, G, -0.85 + sz * 0.3, { delay: 0.18, noInk: true })));
  [-0.1, 0.15].forEach((x, i) => cylinder(0.04, 0.035, 0.11, 0x9fe8ff, x, G + 0.81, -0.62, { delay: 0.3 + i * 0.03 }, 10));
  cylinder(0.025, 0.06, 0.3, 0x2a2834, -1.3, G + 0.81, -1.0, { delay: 0.32 }, 8);
  add(new ConeGeometry(0.15, 0.16, 12, 1, true), YELLOW, -1.3, G + 1.08, -1.0, { delay: 0.34, flat: true });
  box(0.62, 1.25, 0.1, 0x4a1a32, -0.75, G + 0.5, -1.52, { delay: 0.22 });
  box(0.56, 0.08, 0.48, 0x4a1a32, -0.75, G + 0.55, -1.28, { delay: 0.24 });

  // The director, talking: every word goes straight into her trumpet.
  const boss = figure(kit, {
    x: -0.75,
    z: -1.3,
    y: G,
    facing: 0.3,
    height: 2.3,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x8a8a90 },
    face: { mouth: "open", brows: "raised", glasses: "square" },
    top: { kind: "suit", color: 0x2a2c3a, accent: 0xe8e6e0, tie: MAGENTA },
    bottom: { kind: "trousers", color: 0x2a2c3a },
    arms: ["forward", [0.5, 1.7, 0.35]],
    legs: "sit",
    delay: 0.5,
  });

  // Bisque: glazed white, blue flowers, powdered curls with a bun, a ruff, the tray held out.
  const facing = 0.05;
  const u = 2.35 / 2.4;
  const doll = figure(kit, {
    x: 0.72,
    z: 0.35,
    y: G,
    facing,
    height: 2.35,
    build: "slim",
    skin: GLAZE,
    hair: { style: "curly", color: 0xe4e2ec },
    face: { mouth: "smile", brows: "calm", eyes: 0x2a3a8a, marks: 0x8a8aa0 },
    top: { kind: "dress", color: GLAZE },
    gloves: GLAZE,
    arms: [
      [-0.2, 1.2, 0.46],
      [0.2, 1.2, 0.46],
    ],
    delay: 0.8,
  });
  const at = doll.at;
  // Blue flowers and sprigs painted on the glaze, on a marker at her feet.
  const paint = box(0.001, 0.001, 0.001, GLAZE, ...at(0, 0, 0), { delay: 1.0, noInk: true, rotation: [0, facing, 0] });
  const skirt = (y: number) => 0.39 - (0.39 - 0.26) * ((y - 0.12) / 0.92);
  const flowers: Point[] = [];
  [0.3, 0.62, 0.92].forEach((y, row) =>
    [-0.85, -0.3, 0.3, 0.85].forEach((a, k) => {
      const r = skirt(y * u) + 0.012;
      const turn = a + (row % 2 ? 0.25 : 0);
      if ((row + k) % 3 !== 2) flowers.push([r * Math.sin(turn), y * u, r * 0.8 * Math.cos(turn) + 0.01]);
    }),
  );
  flowers.push([-0.1, 1.42 * u, 0.22], [0.12, 1.3 * u, 0.22], [0.02, 1.58 * u, 0.215]);
  decorate(paint, new TorusGeometry(0.035, 0.014, 6, 12), BLUE, flowers);
  decorate(paint, new SphereGeometry(0.016, 6, 4), BLUE, flowers);
  decorate(
    paint,
    new BoxGeometry(0.012, 0.1, 0.01),
    BLUE,
    flowers.map(([x, y, z], i) => [x + 0.05, y - 0.06, z, i % 2 ? 0.7 : -0.5] as [number, number, number, number]),
  );
  // The chip knocked off her shoulder, its pieces on the carpet.
  decorate(paint, new BoxGeometry(0.06, 0.04, 0.02), 0x8a8aa0, [[0.24, 1.66 * u, 0.12, 0.3]]);
  [
    [0.3, 0.9],
    [0.45, 0.78],
    [0.15, 1.0],
  ].forEach(([dx, dz], i) => add(new TetrahedronGeometry(0.05 - i * 0.01), GLAZE, 0.72 + dx, G, 0.35 + dz, { delay: 0.7 + i * 0.03, rotation: [i, i * 2, 0.4] }));

  // The lace ruff, the bun with its flowers.
  cylinder(0.25, 0.15, 0.08, GLAZE, ...at(0, 1.72 * u, 0.0), { delay: 1.25 }, 16);
  add(new TorusGeometry(0.15, 0.05, 8, 20).rotateX(Math.PI / 2), 0xe8e6f0, ...at(0, 1.77 * u, 0.0), { delay: 1.27 });
  const hy = doll.head[1];
  const RH = doll.headRadius;
  const bun = ball(0.1, 0xe4e2ec, ...at(0, hy - G + RH * 0.8, -0.1), { delay: 1.3 });
  decorate(bun, new SphereGeometry(0.035, 8, 6), BLUE, [
    [0.1, 0.06, 0.06],
    [-0.08, 0.1, 0.07],
    [0.2, -0.06, 0.14],
    [-0.21, -0.07, 0.12],
  ]);
  // The silver mask over her right eye, a cyan lens in it, and the ear trumpet.
  const cy = RH * 1.06;
  const fz = RH * 0.9;
  decorate(doll.headPart, new CylinderGeometry(0.07, 0.07, 0.02, 16).rotateX(Math.PI / 2).scale(1.35, 1, 1), SILVER, [[-0.085, cy + 0.04, fz + 0.03]]);
  decorate(doll.headPart, new CylinderGeometry(0.026, 0.026, 0.02, 12).rotateX(Math.PI / 2), CYAN, [[-0.085, cy + 0.035, fz + 0.045]]);
  decorate(doll.headPart, new BoxGeometry(0.08, 0.022, 0.01), 0xc04060, [[0, cy - 0.1, fz + 0.005]]);
  const mouthpiece = at(-RH * 0.95, hy - G, 0);
  const bell = at(-0.62, hy - G + 0.14, -0.32);
  limb(kit, mouthpiece, bell, 0.03, 0.13, BRASS, { delay: 1.4 });
  add(new CylinderGeometry(0.12, 0.12, 0.02, 18), 0x2a2010, ...bell, { delay: 1.45, rotation: aim(mouthpiece, bell).rotation, noInk: true });
  add(new TorusGeometry(0.13, 0.018, 6, 20).rotateX(Math.PI / 2), BRASS, ...bell, { delay: 1.45, rotation: aim(mouthpiece, bell).rotation });

  // The tray: a cup of coffee on its saucer, the sugar bowl, its lid lifting to offer.
  const tray = add(new BoxGeometry(0.62, 0.025, 0.38), SILVER, ...at(0, 1.23, 0.5), { delay: 1.5, rotation: [0, facing, 0] });
  const cup = at(-0.14, 1.255, 0.5);
  const service = [
    tray,
    cylinder(0.11, 0.09, 0.02, GLAZE, ...cup, { delay: 1.55 }, 16),
    cylinder(0.07, 0.055, 0.1, GLAZE, cup[0], cup[1] + 0.02, cup[2], { delay: 1.58 }, 14),
    cylinder(0.062, 0.062, 0.008, 0x3a2010, cup[0], cup[1] + 0.115, cup[2], { delay: 1.6, noInk: true }, 14),
  ];
  decorate(service[2], new TorusGeometry(0.066, 0.008, 6, 16).rotateX(Math.PI / 2), BLUE, [[0, 0.07, 0]]);
  const sugar = at(0.14, 1.255, 0.5);
  service.push(add(new SphereGeometry(0.09, 14, 10).scale(1, 0.75, 1), SILVER, ...sugar, { delay: 1.6 }));
  const lid = cylinder(0.06, 0.075, 0.03, SILVER, sugar[0], sugar[1] + 0.13, sugar[2], { delay: 1.65 }, 14);
  decorate(lid, new SphereGeometry(0.02, 8, 6), SILVER, [[0, 0.045, 0]]);
  service.push(lid);
  motes(5, 0xe8eef2, 0.015, [cup[0] - 0.04, cup[1] + 0.15, cup[2] - 0.04], [cup[0] + 0.04, cup[1] + 0.55, cup[2] + 0.04], 1.8);

  // His words, streaming into the trumpet.
  const words = new CatmullRomCurve3([boss.at(0, boss.head[1] - G - 0.05, 0.3), [0.0, G + 2.55, -0.9], [0.2, G + 2.6, -0.3], bell].map((p) => new Vector3(...p)));
  const dashes = Array.from({ length: 10 }, (_, k) => ({ part: box(0.035, 0.13, 0.035, CYAN, 0, 0, 0, { delay: 1.7, flat: true, noInk: true }), phase: k / 10 }));

  const rest = service.map((part) => part.position.clone());
  tick((t) => {
    // The tray trembles; the sugar lid lifts and settles; the words run down the trumpet.
    const shake = Math.sin(t * 31) * 0.006;
    service.forEach((part, i) => part.position.set(rest[i].x + shake, rest[i].y + Math.abs(shake) * 0.5, rest[i].z));
    lid.position.y = rest[rest.length - 1].y + Math.max(0, Math.sin(t * 1.5)) * 0.08;
    for (const d of dashes) {
      const v = (t * 0.3 + d.phase) % 1;
      const p = words.getPointAt(v);
      const q = words.getPointAt(Math.min(1, v + 0.02));
      d.part.position.copy(p);
      d.part.rotation.set(...aim([p.x, p.y, p.z], [q.x, q.y, q.z]).rotation);
    }
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
