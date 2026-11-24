import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, YELLOW, jag, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { car, floor, lamp, skyline } from "@/lib/diorama-props";

/**
 * Azimuth (P063): the big man in blue overalls and a ragged cape pulls metal without meaning
 * to, on a quayside street at night. Keys, spoons and a spanner circle him, more hang off his
 * overalls round a horseshoe magnet, a car's door flies to his hand on yellow sparks and a sign
 * post bends his way; he gazes up at nothing, noticing none of it.
 */
export function azimuth(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STEEL = 0xc8ccd4;
  const BRASS = 0xd8b04a;
  const CAR = 0x3a4a7a;
  const F = octagonBase(kit, 0x1d2230);
  const G = floor(kit, F, 0.06, 0x323a4c, 0x232a38, 0.45);
  skyline(kit, -1.8, G, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.3, 1.3);
  const light = lamp(kit, -0.35, -1.55, G, 0.3, 2.3, CYAN);

  // A small key, a spoon, a spanner: one part each, with their details stuck on.
  const key = (p: Point, color: number, delay: number, turn: Point = [0, 0, 0]): Group => {
    const part = box(0.045, 0.2, 0.018, color, ...p, { delay, rotation: turn });
    decorate(part, new TorusGeometry(0.06, 0.022, 6, 12), color, [[0, 0.255, 0]]);
    decorate(part, new BoxGeometry(0.05, 0.03, 0.02), color, [[0.04, 0.025, 0], [0.032, 0.08, 0]]);
    return part;
  };
  const spoon = (p: Point, delay: number, turn: Point): Group => {
    const part = box(0.03, 0.22, 0.012, STEEL, ...p, { delay, rotation: turn });
    decorate(part, new CylinderGeometry(0.06, 0.06, 0.02, 12).rotateX(Math.PI / 2).scale(1, 1.4, 1), STEEL, [[0, 0.28, 0]]);
    return part;
  };
  const spanner = (p: Point, delay: number, turn: Point): Group => {
    const part = box(0.045, 0.34, 0.02, 0x9aa3b4, ...p, { delay, rotation: turn });
    decorate(part, new TorusGeometry(0.05, 0.022, 6, 12, Math.PI * 1.5), 0x9aa3b4, [[0, 0.38, 0, Math.PI * 0.25]]);
    return part;
  };

  // The car with its driver's door gone: a dark hole where it was.
  const [body, cabin] = car(kit, -1.25, -0.4, G, 0.3, CAR, 0.6);
  decorate(body, new BoxGeometry(0.4, 0.26, 0.01), INK, [[0.05, 0.15, 0.315]]);
  decorate(cabin, new BoxGeometry(0.36, 0.22, 0.02), INK, [[0.05, 0.12, 0.29]]);

  // A sign post bent over towards him.
  const SX = 1.85;
  const SZ = 0.05;
  cylinder(0.03, 0.035, 0.8, 0x4a4f5c, SX, G, SZ, { delay: 0.4 }, 8);
  const bendTop: Point = [SX - 0.45, G + 1.45, SZ + 0.3];
  limb(kit, [SX, G + 0.78, SZ], bendTop, 0.03, 0.03, 0x4a4f5c, { delay: 0.45 });
  const disc = add(new CylinderGeometry(0.2, 0.2, 0.04, 20).rotateX(Math.PI / 2), 0x23707e, bendTop[0], bendTop[1] - 0.2, bendTop[2], { delay: 0.5, rotation: [0, 0.4, 0.6] });
  decorate(disc, new TorusGeometry(0.16, 0.02, 6, 20), 0xf4f0e6, [[0, 0.2, 0.025]]);

  // Azimuth, gazing up and away, palms open.
  const X = 0.4;
  const Z = 0.3;
  const man = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: 0.3,
    height: 2.5,
    build: "broad",
    skin: 0xd59a76,
    hair: { style: "short", color: 0x8c8c94 },
    face: { mouth: "neutral", brows: "raised", beard: "stubble", beardColor: 0x8c8c94 },
    top: { kind: "uniform", color: 0x2f5a78, accent: 0x9aa3b4 },
    bottom: { kind: "trousers", color: 0x2f5a78 },
    shoes: 0x2a2622,
    belt: 0x23404b,
    scarf: 0x2a4458,
    arms: [[-0.95, 1.95, 0.35], [0.85, 1.5, 0.45]],
    delay: 0.7,
  });
  const at = man.at;
  // A fuller crown of grey hair than the kit's short cut.
  const R = man.headRadius;
  add(new SphereGeometry(R * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), 0x8c8c94, man.head[0], man.head[1] + R * 0.36, man.head[2] - 0.03, { delay: 1.15, rotation: [-0.12, 0.3, 0] });
  // A ragged cape (drawn here: the kit's cape shows its inside, all ink, from the front).
  const cloak = new Shape();
  cloak.moveTo(-0.52, 1.75);
  cloak.lineTo(0.52, 1.75);
  cloak.lineTo(0.78, 0.3);
  [0.55, 0.32, 0.1, -0.12, -0.34, -0.56].forEach((x, k) => cloak.lineTo(x, k % 2 ? 0.3 : 0.12));
  cloak.lineTo(-0.78, 0.3);
  cloak.closePath();
  const cape = add(new ExtrudeGeometry(cloak, { depth: 0.05, bevelEnabled: false }), 0x2a4458, ...at(0, 0.12, -0.32), { delay: 0.75, rotation: [-0.12, 0.3, 0] });
  cape.rotation.order = "YXZ";
  // The horseshoe magnet on his chest, and what sticks to him.
  const magnet = add(new TorusGeometry(0.13, 0.05, 8, 16, Math.PI).rotateZ(Math.PI), 0xa8b0bc, ...at(0, 1.3, 0.34), { delay: 1.3, rotation: [0, 0.3, 0] });
  decorate(magnet, new BoxGeometry(0.1, 0.12, 0.1), 0xa8b0bc, [[-0.13, 0.24, 0], [0.13, 0.24, 0]]);
  decorate(magnet, new BoxGeometry(0.1, 0.05, 0.1), 0xe8e2d0, [[-0.13, 0.32, 0], [0.13, 0.32, 0]]);
  key(at(-0.3, 1.45, 0.3), BRASS, 1.35, [0, 0.3, 0.4]);
  key(at(0.32, 1.2, 0.27), STEEL, 1.37, [0, 0.3, -0.3]);
  key(at(-0.22, 0.95, 0.27), STEEL, 1.39, [0, 0.3, 0.1]);
  key(at(0.2, 0.7, 0.24), BRASS, 1.41, [0, 0.3, -0.6]);
  spoon(at(0.36, 1.48, 0.25), 1.43, [0, 0.3, -0.2]);
  spanner(at(-0.18, 0.4, 0.22), 1.45, [0, 0.3, 0.3]);

  // The car door flying in to his right hand on sparks.
  const [right, left] = man.hands;
  const DOOR: Point = [-0.72, G + 1.62, 0.3];
  const door = box(0.62, 0.36, 0.06, CAR, ...DOOR, { delay: 1.5, rotation: [0.1, 0.35, 0.25] });
  const frame = box(0.5, 0.26, 0.04, CAR, DOOR[0], DOOR[1] + 0.34, DOOR[2], { delay: 1.52, rotation: [0.1, 0.35, 0.25] });
  decorate(frame, new BoxGeometry(0.4, 0.18, 0.05), 0x16303e, [[0, 0.13, 0]]);
  decorate(door, new BoxGeometry(0.12, 0.035, 0.02), 0x9aa3b4, [[0.16, 0.26, 0.035]]);
  const sparks = [
    zigzag(kit, jag(right, [DOOR[0] + 0.15, DOOR[1] + 0.25, DOOR[2]], 5, 0.07, 1), 0.025, YELLOW, 1.6),
    zigzag(kit, jag(left, [left[0] + 0.5, left[1] + 0.3, left[2] - 0.1], 4, 0.06, 2), 0.022, YELLOW, 1.62),
    zigzag(kit, jag(right, [right[0] - 0.2, right[1] + 0.55, right[2] + 0.1], 4, 0.05, 3), 0.02, YELLOW, 1.64),
  ];

  // What circles him: keys, spoons and a spanner, on a slow orbit.
  const orbit = Array.from({ length: 9 }, (_, k) => {
    const p: Point = [X, G, Z];
    const part = k === 4 ? spanner(p, 1.7 + k * 0.03, [0, 0, 0]) : k % 4 === 1 ? spoon(p, 1.7 + k * 0.03, [0, 0, 0]) : key(p, k % 2 ? STEEL : BRASS, 1.7 + k * 0.03);
    return { part, angle: (k / 9) * Math.PI * 2, radius: 1.15 + (k % 3) * 0.12, height: 0.8 + ((k * 5) % 9) * 0.18 };
  });

  const doorRest = door.position.clone();
  const frameRest = frame.position.clone();
  tick((t) => {
    orbit.forEach(({ part, angle, radius, height }, k) => {
      const a = angle + t * 0.5;
      part.position.set(X + Math.cos(a) * radius, G + height + Math.sin(t * 1.3 + k) * 0.05, Z + Math.sin(a) * radius * 0.8);
      part.rotation.set(t * 1.1 + k, -a, 0.6 + k);
    });
    const dx = Math.sin(t * 1.7) * 0.04;
    const dy = Math.sin(t * 2.3) * 0.05;
    door.position.set(doorRest.x + dx, doorRest.y + dy, doorRest.z);
    frame.position.set(frameRest.x + dx, frameRest.y + dy, frameRest.z);
    sparks.forEach((spark, k) => spark.forEach((bit) => (bit.visible = Math.floor(t * 9 + k * 3) % 5 !== 2)));
    light.visible = Math.floor(t * 5) % 17 !== 8;
  });

  return { width: 4.9, height: 4.25, lookY: 1.45 };
}
