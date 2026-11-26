import { BoxGeometry, CylinderGeometry, Group } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, facade, floor, lamp, puddle } from "@/lib/diorama-props";

/** Moves parts into one group turning about `pivot` (in their parent's frame), to tilt them as one. */
function rig(parts: Group[], pivot: Point): Group {
  const group = new Group();
  group.position.set(...pivot);
  parts[0].parent?.add(group);
  for (const part of parts) {
    part.position.sub(group.position);
    group.add(part);
  }
  return group;
}

/**
 * Scavalco (P305): the parkour courier vaults a parked car on the wet tram street under the
 * temple columns, diving across it with both gloved hands on the roof and her knees tucked,
 * her head turned to look at us. On her back rides the parcel nobody must open, tied with
 * magenta string: now and then it jolts by itself. She has no Segno and no powers, only her
 * legs; the car's hazard lights blink and the street lamp hums.
 */
export function scavalco(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const CAR = 0x2c3456;
  const GLASS = 0x16303e;
  const F = octagonBase(kit, 0x1c1b26);
  const G = floor(kit, F, 0.06, 0x2a2c3a, 0x1c1e28, 0.35);

  // The street: tram rails, a house front, two temple columns, a lamp, a puddle.
  [-1.15, -0.85].forEach((z, i) => box(4.2, 0.025, 0.05, 0x8f98a8, 0, G, z, { delay: 0.08 + i * 0.02, noInk: true }));
  facade(kit, -1.05, -1.7, G, 0.12, { width: 2.0, height: 2.9, color: 0x3a2a4a, windows: 3, floors: 3, balcony: true });
  column(kit, 0.55, -1.7, G, 0.2, 3.1);
  column(kit, 1.45, -1.55, G, 0.25, 3.1);
  const light = lamp(kit, -1.75, 0.55, G, 0.3, 2.4, MAGENTA);
  puddle(kit, 1.2, 1.15, G, 0.35, 0.42, CYAN);

  // The parked car, side on, roof at about her hip height.
  const body = box(2.3, 0.5, 1.0, CAR, 0.05, G + 0.2, 0.0, { delay: 0.4 });
  const cabin = box(1.25, 0.4, 0.9, 0x3a4470, -0.1, G + 0.7, 0.0, { delay: 0.46 });
  decorate(cabin, new BoxGeometry(0.5, 0.28, 0.01), GLASS, [
    [-0.3, 0.2, 0.455],
    [0.3, 0.2, 0.455],
    [-0.3, 0.2, -0.455],
    [0.3, 0.2, -0.455],
  ]);
  decorate(cabin, new BoxGeometry(0.01, 0.28, 0.75), GLASS, [
    [0.63, 0.2, 0],
    [-0.63, 0.2, 0],
  ]);
  decorate(body, new BoxGeometry(0.01, 0.12, 0.2), YELLOW, [
    [1.155, 0.32, 0.3],
    [1.155, 0.32, -0.3],
  ]);
  decorate(body, new BoxGeometry(0.01, 0.1, 0.2), MAGENTA, [
    [-1.155, 0.32, 0.3],
    [-1.155, 0.32, -0.3],
  ]);
  decorate(body, new BoxGeometry(2.2, 0.02, 0.01), 0x1c2036, [[0, 0.25, 0.505]]);
  const hazard = decorate(body, new BoxGeometry(0.1, 0.06, 0.04), ORANGE, [
    [1.1, 0.42, 0.49],
    [-1.1, 0.42, 0.49],
  ]);
  [-0.75, 0.8].forEach((x) =>
    [-0.47, 0.47].forEach((z) => add(new CylinderGeometry(0.22, 0.22, 0.14, 14).rotateX(Math.PI / 2), 0x1c1b22, x, G, z, { delay: 0.5 })),
  );
  const roof = G + 1.1;
  void body;

  // Scavalco, built standing at the origin, then turned to run left to right and pitched into
  // a dive over the roof, both hands planted on it, her head turned to look at us.
  const u = 2.35 / 2.4;
  const runner = figure(kit, {
    x: 0,
    z: 0,
    y: 0,
    height: 2.35,
    build: "slim",
    skin: 0x7a4e3a,
    hair: { style: "braids", color: 0x1a1414 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "jacket", color: 0x5a5e6e, accent: 0x3a3e4e },
    bottom: { kind: "trousers", color: 0x2e3240 },
    shoes: 0x1c1b22,
    gloves: 0x1c1b22,
    arms: [
      [-0.22, 0.5, 0.6],
      [0.22, 0.5, 0.6],
    ],
    legs: "kneel",
    delay: 0.9,
  });
  // Red stripes down the jacket.
  decorate(runner.parts[7], new BoxGeometry(0.05, 0.5, 0.02), 0xd8304a, [
    [-0.16, 0.3, 0.2],
    [0.16, 0.3, 0.2],
  ]);
  // The parcel on her back, tied with string, and the backpack straps.
  const parcel = box(0.6, 0.48, 0.4, 0xe8e2d4, ...runner.at(0, 0.86, -0.46), { delay: 1.5 });
  decorate(parcel, new BoxGeometry(0.05, 0.49, 0.41), MAGENTA, [[0, 0.24, 0]]);
  decorate(parcel, new BoxGeometry(0.61, 0.49, 0.05), MAGENTA, [[0, 0.24, 0]]);
  decorate(parcel, new BoxGeometry(0.16, 0.06, 0.06), MAGENTA, [
    [-0.06, 0.5, 0, 0.5],
    [0.06, 0.5, 0, -0.5],
  ]);
  const straps = [-1, 1].map((side) => box(0.06, 0.5, 0.03, 0x1c1b22, ...runner.at(side * 0.15 * u, 0.88, 0.2), { delay: 1.45 }));

  const [right, left] = runner.hands;
  const hands: Point = [(right[0] + left[0]) / 2, (right[1] + left[1]) / 2, (right[2] + left[2]) / 2];
  const dive = rig([...runner.parts, parcel, ...straps], hands);
  dive.rotation.order = "YXZ";
  dive.rotation.set(1.05, Math.PI / 2, 0);
  dive.position.set(-0.05, roof + 0.085 * u, 0.05);
  const head = runner.parts.indexOf(runner.headPart);
  const neck = runner.at(0, 1.66 * u - 1.08 * u * 0.28, 0);
  const look = rig(runner.parts.slice(head - 1), [neck[0] - hands[0], neck[1] - hands[1], neck[2] - hands[2]]);
  look.rotation.order = "YXZ";
  look.rotation.set(-0.6, -1.15, 0);

  // Speed lines behind her.
  (
    [
      [-1.35, 1.95, -0.1, 0.9],
      [-1.45, 1.6, 0.2, 0.7],
      [-1.25, 2.25, 0.05, 0.6],
    ] as [number, number, number, number][]
  ).forEach(([x, y, z, length], i) =>
    box(length, 0.025, 0.025, i === 1 ? CYAN : MAGENTA, x, G + y, z, { delay: 1.7 + i * 0.05, flat: true, noInk: true }),
  );

  const lamp0 = colorOf(light);
  tick((t) => {
    // The parcel jolts by itself, twice in a row, every few seconds.
    const beat = (t % 3.2) / 3.2;
    const jolt = beat > 0.8 && beat < 0.9 ? Math.sin((beat - 0.8) * 62.8) : 0;
    parcel.rotation.set(jolt * 0.12, 0, jolt * 0.08);
    hazard.color.setHex(Math.floor(t * 2) % 2 === 0 ? ORANGE : 0x5a3010);
    lamp0.setHex(Math.floor(t * 8) % 23 === 5 ? 0x5a1030 : MAGENTA);
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
