import { BoxGeometry, type BufferGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type PartOptions, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bench, floor, lamp, tree } from "@/lib/diorama-props";

/**
 * Plancia (P253): the admiral without a fleet in the public gardens, at the edge of the round
 * pond, in his purple greatcoat with gold epaulettes, sash and medals. With his spyglass he
 * commands the only fleet he has left: four paper boats sailing round and round in line ahead,
 * a duck bringing up the rear. His pennant flies; his sabre is too heavy to lift, so its tip has
 * ploughed a furrow in the gravel behind him.
 */
export function plancia(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const COAT = 0x4a2a62;
  const BRASS = 0xc89a3a;
  const STONE = 0x6a6a82;
  const WATER = 0x15475e;
  const PAPER = 0xe8e4d8;
  const F = octagonBase(kit, 0x1f2430);
  const G = floor(kit, F, 0.06, 0x4a4656, 0x3a3646, 0);
  /** A geometry built round its centre, put with its centre at a point. */
  const put = (geometry: BufferGeometry, color: number, [x, y, z]: Point, options: PartOptions) => {
    geometry.computeBoundingBox();
    return add(geometry, color, x, y + (geometry.boundingBox?.min.y ?? 0), z, options);
  };

  // The gardens: a tree, a lamp, a bench, the admiral's flagpole.
  tree(kit, -1.45, -0.95, G, 0.12, 2.2);
  lamp(kit, -0.35, -1.6, G, 0.2, 2.3);
  bench(kit, 0.75, -1.35, G, 0.24);
  box(0.05, 2.6, 0.05, 0x2a2836, 1.7, G, -0.7, { delay: 0.28 });
  ball(0.06, BRASS, 1.7, G + 2.6, -0.7, { delay: 0.32 });
  const pennant = add(new ConeGeometry(0.12, 0.62, 4).rotateZ(-Math.PI / 2).scale(1, 1, 0.12).translate(0.31, 0, 0), MAGENTA, 1.7, G + 2.3, -0.7, { delay: 0.36 });

  // The round pond: water up to a rounded stone rim, a few glints on it.
  const P: Point = [-0.7, G, 0.75];
  const water = add(new CylinderGeometry(0.95, 0.95, 0.18, 32), WATER, P[0], G, P[2], { delay: 0.1, flat: true, ink: 1.01 });
  decorate(water, new BoxGeometry(0.22, 0.004, 0.025), CYAN, [
    [-0.4, 0.182, -0.3],
    [0.35, 0.182, 0.45],
    [0.1, 0.182, -0.55],
  ]);
  add(new TorusGeometry(0.97, 0.09, 8, 40).rotateX(Math.PI / 2), STONE, P[0], G + 0.1, P[2], { delay: 0.14 });

  // The fleet: four paper boats in line ahead, and the duck.
  const root = water.parent as Group;
  const vessel = (parts: Group[]) => {
    const group = new Group();
    root.add(group);
    parts.forEach((part) => group.add(part));
    return group;
  };
  const fleet = [PAPER, PAPER, 0xcfe4ee, PAPER].map((color, k) =>
    vessel([
      add(new CylinderGeometry(0.15, 0.09, 0.07, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.45), color, 0, 0, 0, { delay: 1.5 + k * 0.08 }),
      add(new ConeGeometry(0.09, 0.15, 4).rotateY(Math.PI / 4).scale(1, 1, 0.18), color, 0, 0.065, 0, { delay: 1.55 + k * 0.08 }),
    ]),
  );
  const duckHead = ball(0.05, 0xf2f0ea, 0.09, 0.07, 0, { delay: 1.9 });
  decorate(duckHead, new BoxGeometry(0.015, 0.015, 0.1), INK, [[0.02, 0.06, 0]]);
  fleet.push(
    vessel([
      add(new SphereGeometry(0.08, 12, 10).scale(1.4, 0.75, 1), 0xf2f0ea, 0, 0, 0, { delay: 1.85 }),
      duckHead,
      add(new ConeGeometry(0.022, 0.07, 6).rotateZ(-Math.PI / 2), YELLOW, 0.17, 0.1, 0, { delay: 1.95 }),
    ]),
  );

  // Plancia, at the rim, pointing his fleet on with the spyglass; the sabre trails behind.
  const f = -0.3;
  const admiral = figure(kit, {
    x: 0.75,
    z: 0.05,
    y: G,
    facing: f,
    height: 2.5,
    build: "heavy",
    skin: 0xe0a088,
    hair: { style: "bald", color: 0xe8e4dc },
    face: { mouth: "frown", brows: "angry", beard: "full", beardColor: 0xe8e4dc },
    top: { kind: "coat", color: COAT, accent: 0x2a1838 },
    bottom: { kind: "trousers", color: 0x2a1838 },
    shoes: 0x1a1820,
    arms: [[-0.5, 1.72, 0.5], "back"],
    delay: 0.8,
  });
  const at = admiral.at;
  [-1, 1].forEach((side) => ball(0.07, 0xe8e4dc, ...at(side * 0.22, 2.12, -0.06), { delay: 1.15 }));
  [-1, 1].forEach((side) => {
    const epaulette = add(new CylinderGeometry(0.21, 0.19, 0.08, 16), YELLOW, ...at(side * 0.5, 1.8, 0), { delay: 1.2, rotation: [0, f, -side * 0.3] });
    decorate(
      epaulette,
      new CylinderGeometry(0.016, 0.016, 0.17, 4),
      BRASS,
      Array.from({ length: 11 }, (_, k) => [Math.cos(k * 0.57) * 0.19, -0.05, Math.sin(k * 0.57) * 0.19] as Point),
    );
  });
  put(new BoxGeometry(0.13, 0.78, 0.035).rotateZ(-0.6).rotateY(f), 0xc02a6a, at(0.04, 1.47, 0.37), { delay: 1.22 });
  [
    [0.22, 1.6, YELLOW],
    [0.3, 1.52, CYAN],
    [0.2, 1.44, YELLOW],
  ].forEach(([x, y, color], k) => put(new CylinderGeometry(0.035, 0.035, 0.016, 10).rotateX(Math.PI / 2).rotateY(f), color, at(x, y, 0.345), { delay: 1.26 + k * 0.03 }));
  [-0.12, 0.12].forEach((x) => [1.24, 1.38, 1.52, 1.66].forEach((y) => ball(0.024, YELLOW, ...at(x, y - 0.024, 0.335), { delay: 1.3 })));

  // The spyglass, aimed at the pond.
  const [hand, back] = admiral.hands;
  const aimAt: Point = [P[0] + 0.2, G + 1.1, P[2] + 0.1];
  const length = Math.hypot(aimAt[0] - hand[0], aimAt[1] - hand[1], aimAt[2] - hand[2]);
  const tip: Point = [0, 1, 2].map((i) => hand[i] + ((aimAt[i] - hand[i]) / length) * 0.5) as Point;
  const glass = limb(kit, hand, tip, 0.05, 0.035, BRASS, { delay: 1.4 });
  decorate(glass, new TorusGeometry(0.045, 0.012, 6, 14).rotateX(Math.PI / 2), 0x8a6420, [
    [0, 0.18, 0],
    [0, 0.34, 0],
  ]);

  // The sabre, held behind his back, its tip in the gravel and a furrow behind it.
  const point = at(0.62, 0.02, -0.78);
  limb(kit, back, point, 0.025, 0.018, 0xc8d0dc, { delay: 1.35 });
  ball(0.05, YELLOW, back[0], back[1] - 0.05, back[2], { delay: 1.38 });
  put(new BoxGeometry(0.04, 0.008, 0.7).rotateY(f), 0x24222e, at(0.62, 0.005, -1.15), { delay: 1.4, flat: true, noInk: true });

  tick((t) => {
    // The fleet sails round the pond in line ahead, rocking a little.
    fleet.forEach((boat, k) => {
      const a = 0.35 * t + 0.8 - k * 0.62;
      boat.position.set(P[0] + Math.cos(a) * 0.56, G + 0.18 + Math.sin(t * 2.2 + k) * 0.01, P[2] + Math.sin(a) * 0.56);
      boat.rotation.set(Math.sin(t * 1.7 + k) * 0.08, -a - Math.PI / 2, 0);
    });
    pennant.rotation.y = 0.3 + Math.sin(t * 2.6) * 0.25;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
