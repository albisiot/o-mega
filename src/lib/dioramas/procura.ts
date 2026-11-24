import { BoxGeometry, Color, ExtrudeGeometry, Group, Shape, TorusGeometry } from "three";
import { MAGENTA, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle } from "@/lib/diorama-props";

/**
 * Procura (P107): the motel manager stands in the wet car park with his big ring of keys and a
 * thin smile; back to back with him stands the pale green ghost of the old woman whose voice he
 * has learnt by heart. Along the walkway every door is shut but the last, room nine, left ajar
 * and glowing, kept ready; over it all the arrow sign chases its bulbs.
 */
export function procura(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const WALL = 0x4a4640;
  const DOOR = 0x2b6a66;
  const DARK = 0x23222b;
  const F = octagonBase(kit, 0x1a1c22);
  const G = floor(kit, F, 0.06, 0x2a2e36, 0x20232a, 0);

  // The motel: a long low block, a walkway under a canopy, four doors and their lamps.
  const wall = box(3.1, 1.95, 0.5, WALL, 0, G, -1.35, { delay: 0.1, ink: 1.02 });
  const doors = [-1.15, -0.4, 1.15];
  const NINE = 0.4;
  decorate(wall, new BoxGeometry(0.38, 0.86, 0.01), DOOR, doors.map((x) => [x, 0.51, 0.251] as Point));
  decorate(wall, new BoxGeometry(0.03, 0.03, 0.01), YELLOW, doors.map((x) => [x + 0.13, 0.5, 0.257] as Point));
  decorate(wall, new BoxGeometry(0.26, 0.26, 0.01), 0x6a6a3a, [-0.78, 0, 0.78].map((x) => [x, 0.7, 0.251] as Point));
  const room = decorate(wall, new BoxGeometry(0.38, 0.86, 0.01), MAGENTA, [[NINE, 0.51, 0.251]]);
  box(3.1, 0.08, 0.68, 0x5a5a62, 0, G, -0.77, { delay: 0.14 });
  box(3.25, 0.07, 0.72, 0x3a3a44, 0, G + 1.62, -0.78, { delay: 0.18 });
  [-1.45, -0.05, 1.35].forEach((x, i) => box(0.06, 1.54, 0.06, DARK, x, G + 0.08, -0.48, { delay: 0.2 + i * 0.03, noInk: true }));
  const lamps = [...doors, NINE].map((x, i) => box(0.12, 0.06, 0.12, YELLOW, x, G + 1.56, -0.95, { delay: 0.25 + i * 0.03, flat: true }));
  // Room nine, ajar: the door swung out, light on the walkway, the mat out.
  const hinge: Point = [NINE - 0.19, G + 0.08, -1.08];
  box(0.38, 0.86, 0.04, DOOR, hinge[0] + 0.19 * Math.cos(0.9), hinge[1], hinge[2] + 0.19 * Math.sin(0.9), { delay: 0.3, rotation: [0, -0.9, 0] });
  const spill = box(0.42, 0.004, 0.5, 0x8a2050, NINE, G + 0.08, -0.72, { delay: 0.32, flat: true, noInk: true });
  box(0.36, 0.015, 0.22, 0x8a5a3a, NINE, G + 0.084, -0.64, { delay: 0.34, noInk: true });

  // The arrow sign on its posts, bulbs chasing round it.
  const SX = 1.55;
  const SZ = 0.15;
  [-0.32, 0.32].forEach((dx, i) => box(0.07, 2.2, 0.07, DARK, SX + dx * Math.cos(0.55), G, SZ + dx * Math.sin(0.55), { delay: 0.4 + i * 0.03 }));
  const board = box(0.95, 0.42, 0.06, 0x2f5a4a, SX, G + 2.0, SZ, { delay: 0.45, rotation: [0, -0.55, 0] });
  decorate(board, new BoxGeometry(0.8, 0.28, 0.01), 0x23443a, [[0, 0.21, 0.031]]);
  const arrow = new Shape();
  [
    [-0.55, 0.06],
    [0.1, 0.06],
    [0.1, 0.18],
    [0.42, -0.06],
    [0.1, -0.3],
    [0.1, -0.18],
    [-0.55, -0.18],
  ].forEach(([x, y], k) => (k ? arrow.lineTo(x, y) : arrow.moveTo(x, y)));
  const ANGLE = Math.PI + 0.45;
  const arrowGeometry = new ExtrudeGeometry(arrow, { depth: 0.05, bevelEnabled: false }).rotateZ(ANGLE);
  arrowGeometry.computeBoundingBox();
  const lift = -(arrowGeometry.boundingBox?.min.y ?? 0);
  const sign = add(arrowGeometry, 0x2f5a4a, SX - 0.05, G + 1.45, SZ + 0.1, { delay: 0.5, rotation: [0, -0.55, 0] });
  const bulbSpots = [0, 1].map(() => [] as Point[]);
  for (let k = 0; k < 12; k++) {
    const x = -0.5 + (k / 11) * 0.86;
    const y = -0.06;
    bulbSpots[k % 2].push([x * Math.cos(ANGLE) - y * Math.sin(ANGLE), x * Math.sin(ANGLE) + y * Math.cos(ANGLE) + lift, 0.06]);
  }
  const bulbs = bulbSpots.map((spots, k) => decorate(sign, new BoxGeometry(0.04, 0.04, 0.02), k ? YELLOW : 0x6a5a20, spots));

  // The wet car park: painted bays and puddles.
  [-1.6, 0.0].forEach((x, i) => box(0.05, 0.005, 0.9, 0xb8b4a8, x, G, 0.9, { delay: 0.5 + i * 0.02, flat: true, noInk: true }));
  puddle(kit, -0.9, 1.25, G, 0.55, 0.4, YELLOW);
  puddle(kit, 0.95, 1.2, G, 0.57, 0.3, MAGENTA);

  // The ghost of the old woman, back to back with him, pale green, swaying.
  const ghost = figure(kit, {
    x: -0.62,
    z: -0.2,
    y: G + 0.04,
    facing: -1.35,
    height: 2.25,
    build: "slim",
    skin: 0x5a9a8c,
    hair: { style: "bun", color: 0x3f7a70 },
    face: { mouth: "neutral", brows: "worried", eyes: 0x1a3a36 },
    top: { kind: "dress", color: 0x2f6a62, accent: 0x3f7a70 },
    shoes: 0x2f5e58,
    scarf: 0x3f7a70,
    arms: ["crossed", "crossed"],
    delay: 0.9,
  });

  // Procura: cardigan, name badge, a thin smile; the keys in his right hand, left hand behind him.
  const facing = 0.35;
  const host = figure(kit, {
    x: 0.05,
    z: 0.3,
    y: G,
    facing,
    height: 2.4,
    skin: 0xd8b090,
    hair: { style: "short", color: 0x5a4030 },
    face: { mouth: "smirk", brows: "raised" },
    top: { kind: "jacket", color: 0x7a4a2e, accent: 0xd8ccb0 },
    bottom: { kind: "trousers", color: 0x2e3a30 },
    shoes: 0x3a2218,
    arms: ["down", "back"],
    delay: 1.1,
  });
  box(0.1, 0.05, 0.015, 0xe8e2d0, ...host.at(0.15, 1.5, 0.27), { delay: 1.6, rotation: [0, facing, 0] });
  const hand = host.hands[0];
  const ring = new Group();
  ring.position.set(hand[0], hand[1] - 0.05, hand[2] + 0.02);
  const keys = [add(new TorusGeometry(0.08, 0.014, 6, 18), 0xd8b04a, 0, -0.17, 0, { delay: 1.7, rotation: [0, facing, 0] })];
  keys.push(
    ...[-0.6, -0.3, 0, 0.25, 0.5].map((a, k) =>
      add(new BoxGeometry(0.03, 0.17, 0.012), k === 2 ? MAGENTA : 0xd8b04a, Math.sin(a) * 0.05, -0.32, Math.cos(facing) * 0.01, { delay: 1.72 + k * 0.02, rotation: [0, facing, a] }),
    ),
  );
  keys.forEach((part) => {
    const at = part.position.clone();
    part.parent?.add(ring);
    ring.add(part);
    part.position.copy(at);
  });

  const ghostRest = ghost.parts.map((part) => part.position.x);
  const roomFrom = new Color(MAGENTA);
  const roomTo = new Color(0xff8ab0);
  tick((t) => {
    bulbs[0].color.set(Math.floor(t * 4) % 2 ? YELLOW : 0x6a5a20);
    bulbs[1].color.set(Math.floor(t * 4) % 2 ? 0x6a5a20 : YELLOW);
    const sway = Math.sin(t * 1.2) * 0.03;
    const gone = t % 5 > 4.7 && Math.floor(t * 20) % 2 === 0;
    ghost.parts.forEach((part, i) => {
      part.position.x = ghostRest[i] + sway;
      part.visible = !gone;
    });
    room.color.lerpColors(roomFrom, roomTo, (Math.sin(t * 1.5) + 1) / 2);
    colorOf(spill).set(Math.sin(t * 1.5) > 0 ? 0x9a2858 : 0x8a2050);
    ring.rotation.z = Math.sin(t * 2.4) * 0.12;
    lamps[1].visible = Math.floor(t * 6) % 17 !== 3;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
