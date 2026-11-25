import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { barrel, crate, flame, floor } from "@/lib/diorama-props";

/**
 * Pertugio (P278): the little thief of the Popolo dei Colli is already inside the rail yard
 * of the enemy camp: behind him the guards have just chained and padlocked the iron gate over
 * the tracks, the padlock still swinging, and the watchtower's searchlight sweeps the fence
 * outside. Crouched by the rails in his grey beanie and ragged hood, he puts a finger to his
 * lips. His strength is another matter: the rope he tied round a crate as big as himself will
 * not move it an inch.
 */
export function pertugio(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const RUST = 0x8a4a3a;
  const RUST_DARK = 0x5a2e2a;
  const IRON = 0x4a4f5c;
  const SLEEPER = 0x3e3028;
  const ROPE = 0xc9a46a;
  const F = octagonBase(kit, 0x1d1b24);
  const G = floor(kit, F, 0.06, 0x2e2a32, 0x24202a, 0);

  // The tracks running in under the gate.
  for (let z = -1.85; z < 1.9; z += 0.34) box(0.95, 0.04, 0.12, SLEEPER, 0.1, G, z, { delay: 0.08, noInk: true });
  [-0.22, 0.42].forEach((x) => box(0.05, 0.07, 3.95, IRON, x, G + 0.04, 0, { delay: 0.1, ink: 1.02 }));

  // The fence of iron bars, and the gate just chained and padlocked.
  const FZ = -0.95;
  [
    [-1.4, 1.3],
    [1.6, 1.3],
  ].forEach(([x, w], i) => {
    const rail = box(w, 0.06, 0.06, RUST_DARK, x, G + 1.55, FZ, { delay: 0.15 + i * 0.05 });
    const bars: Point[] = [];
    for (let k = 0; k <= 8; k++) bars.push([-w / 2 + (w * k) / 8, -0.78, 0]);
    decorate(rail, new BoxGeometry(0.028, 1.56, 0.028), RUST, bars);
    decorate(rail, new ConeGeometry(0.035, 0.12, 4), RUST, bars.map(([bx]) => [bx, 0.1, 0] as Point));
    decorate(rail, new BoxGeometry(w, 0.05, 0.05), RUST_DARK, [[0, -1.3, 0]]);
  });
  [-1, 1].forEach((side, i) => {
    const cx = 0.1 + side * 0.33;
    const frame = box(0.62, 0.08, 0.07, RUST_DARK, cx, G + 1.82, FZ, { delay: 0.25 + i * 0.05 });
    decorate(frame, new BoxGeometry(0.62, 0.08, 0.07), RUST_DARK, [[0, -1.7, 0]]);
    decorate(frame, new BoxGeometry(0.08, 1.78, 0.07), RUST_DARK, [
      [-0.27, -0.85, 0],
      [0.27, -0.85, 0],
    ]);
    decorate(frame, new BoxGeometry(0.03, 1.7, 0.03), RUST, [-0.15, -0.05, 0.05, 0.15].map((x) => [x, -0.85, 0] as Point));
    decorate(frame, new BoxGeometry(0.05, 0.82, 0.03), RUST_DARK, [[0, -0.75, 0.03, side * 0.6]]);
  });
  // Chain round the two stiles, the padlock hanging from it.
  [0, 1, 2].forEach((k) => add(new TorusGeometry(0.055, 0.016, 6, 12).scale(1.4, 1, 1), 0x8a90a0, 0.1, G + 1.0 + k * 0.08, FZ + 0.05, { delay: 0.5 + k * 0.03, rotation: [0, 0, k % 2 ? 0.4 : -0.4] }));
  const lockParts = [
    add(new TorusGeometry(0.05, 0.014, 6, 12, Math.PI), 0x9aa0ab, 0.1, G + 0.9, FZ + 0.1, { delay: 0.6 }),
    box(0.14, 0.13, 0.06, 0x3a3f4e, 0.1, G + 0.77, FZ + 0.1, { delay: 0.62 }),
  ];
  decorate(lockParts[1], new BoxGeometry(0.03, 0.05, 0.01), 0x14121c, [[0, 0.05, 0.031]]);
  const HANG = new Vector3(0.1, G + 0.97, FZ + 0.1);
  const lock = new Group();
  lockParts[0].parent?.add(lock);
  lock.position.copy(HANG);
  lockParts.forEach((part) => {
    part.position.sub(HANG);
    lock.add(part);
  });

  // The watchtower inside, its searchlight sweeping the fence outside.
  const TX = 1.5;
  const TZ = 0.05;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.07, 2.2, 0.07, 0x3e3028, TX + sx * 0.28, G, TZ + sz * 0.28, { delay: 0.3, noInk: true })));
  box(0.8, 0.07, 0.8, SLEEPER, TX, G + 2.2, TZ, { delay: 0.35 });
  box(0.6, 0.3, 0.6, 0x4a3a30, TX, G + 2.27, TZ, { delay: 0.38 });
  add(new ConeGeometry(0.55, 0.3, 4).rotateY(Math.PI / 4), 0x3a2e28, TX, G + 2.75, TZ, { delay: 0.4 });
  [0.65, 1.4].forEach((y, i) => box(0.62, 0.04, 0.04, 0x3e3028, TX, G + y, TZ + 0.28, { delay: 0.32 + i * 0.02, noInk: true, rotation: [0, 0, i ? 0.6 : -0.6] }));
  const LAMP = new Vector3(TX - 0.22, G + 2.62, TZ - 0.2);
  cylinder(0.09, 0.11, 0.14, IRON, LAMP.x, LAMP.y - 0.07, LAMP.z, { delay: 0.45 }, 10);
  const cone = new ConeGeometry(0.32, 2.1, 14, 1, true).translate(0, -1.05, 0).rotateZ(Math.PI / 2 - 0.32);
  cone.computeBoundingBox();
  const beam = add(cone, 0xbfe8ff, LAMP.x, LAMP.y + (cone.boundingBox?.min.y ?? 0), LAMP.z, { delay: 0.6, flat: true, noInk: true });

  // A brazier inside the camp.
  barrel(kit, -1.55, 0.3, G, 0.3, 0x3a3f4e);
  const fire = flame(kit, -1.55, 0.3, G + 0.5, 0.4, 1.0);

  // The crate he means to drag away, tied with a rope.
  const big = crate(kit, 0.85, 0.95, G, 0.5, 0.8, 0x5e4a3a, -0.3);
  decorate(big, new BoxGeometry(0.82, 0.05, 0.05), ROPE, [[0, 0.42, 0.405]]);
  decorate(big, new BoxGeometry(0.05, 0.82, 0.05), ROPE, [[0.0, 0.4, 0.405]]);

  // Pertugio, crouched by the rails, shushing.
  const thief = figure(kit, {
    x: -0.6,
    z: 1.0,
    y: G,
    facing: 0.4,
    height: 1.95,
    build: "slim",
    skin: 0xe8c8b0,
    hair: { style: "short", color: 0x1a1418 },
    face: { mouth: "none", brows: "raised", beard: "moustache", beardColor: 0x1a1418 },
    headwear: { kind: "beanie", color: 0x6a6a78, accent: 0x55556a },
    top: { kind: "jacket", color: 0x2a3448, accent: 0x3a4458 },
    bottom: { kind: "trousers", color: 0x2a3040 },
    shoes: 0x5a3a2a,
    gloves: 0x1e1e26,
    belt: 0x4a2e22,
    arms: [
      [-0.03, 1.2, 0.2],
      [0.42, 0.72, 0.28],
    ],
    legs: "kneel",
    delay: 0.8,
  });
  const u = 1.95 / 2.4;
  const drop = 1.08 * u * 0.28;
  const turned = (part: Group) => {
    part.rotation.order = "YXZ";
    part.rotation.set(0, 0.4, 0);
    return part;
  };
  // The ragged hood over his shoulders, the finger on his lips.
  turned(add(new CylinderGeometry(0.15, 0.36, 0.34, 9).scale(1, 1, 0.8), 0x5a3a2e, ...thief.at(0, 1.72 * u - drop - 0.28, -0.01), { delay: 1.3 }));
  turned(add(new SphereGeometry(0.16, 12, 8).scale(1.4, 0.8, 1), 0x5a3a2e, ...thief.at(0, 1.72 * u - drop - 0.02, -0.15), { delay: 1.32 }));
  const [right, left] = thief.hands;
  turned(box(0.03, 0.12, 0.03, 0x1e1e26, right[0], right[1], right[2] + 0.02, { delay: 1.35 }));
  // The key ring at his belt, jingling.
  const ringAt = new Vector3(...thief.at(0.16, 1.08 * u - drop - 0.06, 0.2));
  const keys = [add(new TorusGeometry(0.05, 0.01, 6, 14), 0x9aa0ab, ringAt.x, ringAt.y - 0.06, ringAt.z, { delay: 1.4, rotation: [0, 0.4, 0] })];
  [-0.03, 0, 0.03].forEach((dx, k) => keys.push(box(0.016, 0.11, 0.012, 0x9aa0ab, ringAt.x + dx, ringAt.y - 0.2, ringAt.z + 0.01, { delay: 1.42 + k * 0.02, rotation: [0, 0.4, dx * 4] })));
  const jingle = new Group();
  keys[0].parent?.add(jingle);
  jingle.position.copy(ringAt);
  keys.forEach((part) => {
    part.position.sub(ringAt);
    jingle.add(part);
  });
  // The rope, from his left hand to the crate.
  cable(kit, [left, [left[0] + 0.35, G + 0.25, left[2] + 0.05], [0.5, G + 0.42, 1.12]], 0.025, ROPE, 1.5);

  tick((t) => {
    beam.rotation.y = 2.5 + Math.sin(t * 0.7) * 0.45;
    lock.rotation.z = Math.sin(t * 3.1) * 0.35 * Math.exp(-((t % 6) / 2.5));
    jingle.rotation.z = Math.sin(t * 9) * 0.12;
    fire[0].children[0].scale.y = 1 + Math.sin(t * 9) * 0.15;
    fire[1].children[0].scale.y = 1 + Math.sin(t * 13 + 1) * 0.2;
  });

  return { width: 4.9, height: 4.4, lookY: 1.4 };
}
