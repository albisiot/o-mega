import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, steps } from "@/lib/diorama-props";

/**
 * Portineria (P193): the porter of the palazzo where the truce holds, in its marble lobby with
 * the cage lift going up and down and the stair behind her. She writes the new guest into her
 * ledger, keys at her hip; past the brass line of the threshold, on the pavement, lies what he
 * had to leave outside: cape, helmet, sword and a power orb still crackling, that may not cross.
 */
export function portineria(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const IRON = 0x23222b;
  const BRASS = 0xc8a040;
  const MARBLE = 0x7a809a;
  const WOOD = 0x3a2a26;
  const F = octagonBase(kit, 0x1b1e2a);
  const G = floor(kit, F, 0.06, 0x4a5068, 0x2c3040, 0.45);
  const LINE = 1.0;

  // The lobby's chequered marble, up to the threshold.
  const tiles: Point[] = [];
  for (let i = 0; i < 10; i++)
    for (let j = 0; j < 10; j++) {
      const x = -1.925 + i * 0.45;
      const z = -1.925 + j * 0.45;
      if ((i + j) % 2 === 0 && z < LINE && Math.abs(x) + Math.abs(z) < 2.75) tiles.push([x, 0.002, z]);
    }
  const checker = box(0.001, 0.001, 0.001, 0x2f3446, 0, G, 0, { delay: 0.08, flat: true, noInk: true });
  decorate(checker, new BoxGeometry(0.43, 0.004, 0.43), 0x2f3446, tiles);

  // The pavement outside, and the brass strip of the threshold.
  const kerb = new Shape();
  kerb.moveTo(-2.06, -LINE);
  kerb.lineTo(2.06, -LINE);
  kerb.lineTo(0.9, -2.16);
  kerb.lineTo(-0.9, -2.16);
  kerb.closePath();
  add(new ExtrudeGeometry(kerb, { depth: 0.04, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x24262f, 0, G, 0, { delay: 0.1, noInk: true });
  box(4.1, 0.05, 0.07, BRASS, 0, G, LINE, { delay: 0.14, flat: true });

  // The heavy front door, swung open into the lobby.
  const leaf = add(new BoxGeometry(0.85, 2.45, 0.1).translate(0.425, 0, 0), WOOD, -1.95, G, LINE - 0.05, { delay: 0.2, rotation: [0, 1.25, 0] });
  decorate(leaf, new BoxGeometry(0.55, 0.8, 0.02), 0x4e3a32, [
    [0.425, 0.65, 0.055],
    [0.425, 1.7, 0.055],
  ]);
  decorate(leaf, new SphereGeometry(0.06, 10, 8), BRASS, [[0.72, 1.2, 0.07]]);

  // The marble stair behind her, a column, and the cage lift going up and down.
  steps(kit, 0.5, -0.45, G, 0.25, { width: 1.3, count: 6, tread: 0.25, rise: 0.2, color: MARBLE });
  column(kit, 1.75, -0.25, G, 0.35, 2.6, false, 0x8a94ac);
  const LX = -1.15;
  const LZ = -1.15;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.05, 2.6, 0.05, IRON, LX + sx * 0.42, G, LZ + sz * 0.42, { delay: 0.3 })));
  box(0.95, 0.12, 0.95, IRON, LX, G + 2.6, LZ, { delay: 0.34 });
  const cab = box(0.7, 1.05, 0.7, 0x4e3a32, LX, G, LZ, { delay: 0.36 });
  decorate(cab, new BoxGeometry(0.5, 0.4, 0.01), 0x8a6a3a, [[0, 0.7, 0.355]]);
  decorate(cab, new BoxGeometry(0.12, 0.06, 0.12), YELLOW, [[0, 1.08, 0]]);
  // Its iron gates: bars, and a band of small crosses up top.
  [
    [0, 0.44, 0],
    [0.44, 0, Math.PI / 2],
  ].forEach(([dx, dz, turn]) => {
    const bar = box(0.86, 0.04, 0.03, IRON, LX + dx, G + 2.5, LZ + dz, { delay: 0.4, rotation: [0, turn, 0], noInk: true });
    decorate(
      bar,
      new BoxGeometry(0.014, 2.5, 0.014),
      IRON,
      Array.from({ length: 7 }, (_, n) => [-0.36 + n * 0.12, -1.25, 0] as Point),
    );
    decorate(bar, new BoxGeometry(0.86, 0.03, 0.02), IRON, [
      [0, -0.45, 0],
      [0, -1.35, 0],
    ]);
    decorate(
      bar,
      new BoxGeometry(0.014, 0.17, 0.014),
      IRON,
      Array.from({ length: 6 }, (_, n) => [-0.3 + n * 0.12, -0.2, 0, n % 2 ? 0.6 : -0.6] as [number, number, number, number]),
    );
  });

  // Portineria, ledger open, pen going.
  const lady = figure(kit, {
    x: -0.1,
    z: 0.25,
    y: G,
    facing: 0.3,
    height: 2.35,
    build: "slim",
    skin: 0xd8ac90,
    hair: { style: "bun", color: 0x9a9690 },
    face: { mouth: "neutral", brows: "raised" },
    top: { kind: "coat", color: 0x26304e, accent: 0xe8e2d0 },
    bottom: { kind: "trousers", color: 0x16151c },
    shoes: 0x0f0e14,
    arms: [
      [-0.04, 1.5, 0.42],
      [0.2, 1.38, 0.44],
    ],
    delay: 0.8,
  });
  const at = lady.at;
  const turn: Point = [0, 0.3, 0];
  // The ledger open on her left hand, and the pen in her right.
  const book = box(0.46, 0.03, 0.32, 0x5a2030, ...at(0.1, 1.36, 0.46), { delay: 1.4, rotation: [0.35, 0.3, 0] });
  book.rotation.order = "YXZ";
  book.rotation.set(0.35, 0.3, 0);
  decorate(book, new BoxGeometry(0.2, 0.02, 0.28), 0xf0ead8, [
    [-0.11, 0.03, 0, 0.06],
    [0.11, 0.03, 0, -0.06],
  ]);
  const pen = add(new CylinderGeometry(0.012, 0.006, 0.2, 6), 0x14121c, ...at(-0.04, 1.46, 0.44), { delay: 1.45, rotation: [0.5, 0.3, 0.3] });
  const penAt = pen.position.clone();
  ball(0.03, 0xff8a00, ...at(0.14, 1.62, 0.21), { delay: 1.5 });
  // The keys, a great bunch at her hip.
  add(new TorusGeometry(0.1, 0.016, 6, 18), BRASS, ...at(-0.33, 1.0, 0.24), { delay: 1.5, rotation: turn });
  [-0.07, -0.035, 0, 0.035, 0.07].forEach((dx, k) =>
    box(0.024, 0.2 - (k % 2) * 0.04, 0.012, BRASS, ...at(-0.33 + dx, 0.82 + (k % 2) * 0.04, 0.26), { delay: 1.52 + k * 0.02, rotation: [0, 0.3, dx * 2.5] }),
  );

  // On the pavement: what the guest had to leave outside.
  const PX = -0.7;
  const PZ = 1.6;
  box(0.7, 0.07, 0.48, MAGENTA, PX + 0.05, G + 0.04, PZ + 0.05, { delay: 1.0, rotation: [0, 0.4, 0] });
  box(0.6, 0.06, 0.4, 0xb02050, PX + 0.08, G + 0.11, PZ + 0.03, { delay: 1.03, rotation: [0, 0.55, 0] });
  const shield = add(new CylinderGeometry(0.3, 0.3, 0.05, 22).rotateX(Math.PI / 2), 0x8a93a3, PX - 0.05, G + 0.04, PZ - 0.25, { delay: 1.05, rotation: [-0.35, 0.35, 0] });
  decorate(shield, new TorusGeometry(0.22, 0.025, 6, 22), CYAN, [[0, 0.3, 0.03]]);
  decorate(shield, new SphereGeometry(0.06, 10, 8), 0x5a6270, [[0, 0.3, 0.03]]);
  const helmet = add(new SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x5a6270, PX - 0.22, G + 0.17, PZ + 0.08, { delay: 1.08, rotation: [0.2, 0.6, 0] });
  decorate(helmet, new BoxGeometry(0.26, 0.05, 0.02), CYAN, [[0, 0.08, 0.17]]);
  const blade = box(0.05, 0.75, 0.015, 0xc8d0dc, PX + 0.32, G + 0.04, PZ - 0.32, { delay: 1.1, rotation: [-0.3, 0.4, -0.35] });
  decorate(blade, new BoxGeometry(0.24, 0.04, 0.04), IRON, [[0, 0.16, 0]]);
  decorate(blade, new BoxGeometry(0.05, 0.16, 0.05), 0x5a2030, [[0, 0.06, 0]]);
  const orb = ball(0.12, CYAN, PX + 0.25, G + 0.15, PZ + 0.2, { delay: 1.15, flat: true });
  const crackle = add(new ConeGeometry(0.03, 0.2, 4), YELLOW, PX + 0.25, G + 0.38, PZ + 0.2, { delay: 1.2, flat: true, noInk: true });
  motes(6, CYAN, 0.025, [PX - 0.2, G + 0.2, PZ - 0.1], [PX + 0.4, G + 1.1, PZ + 0.3], 1.3);

  const from = new Color(CYAN);
  const to = new Color(0xe8fbff);
  tick((t) => {
    // The pen scratches along the line; the lift rises and comes back down; the orb crackles at the line.
    pen.position.set(penAt.x + Math.sin(t * 9) * 0.02, penAt.y + Math.abs(Math.sin(t * 4.5)) * 0.015, penAt.z);
    cab.position.y = G + (1 - Math.cos(t * 0.5)) * 0.6;
    colorOf(orb).lerpColors(from, to, (Math.sin(t * 6) + 1) / 2);
    crackle.visible = Math.floor(t * 5) % 4 !== 3;
    crackle.rotation.z = Math.sin(t * 13) * 0.6;
  });

  return { width: 4.9, height: 4.4, lookY: 1.4 };
}
