import { BoxGeometry, type BufferGeometry, ConeGeometry, Group, SphereGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, limb, octagonBase, type Framing, type Kit, type PartOptions, type Point } from "@/lib/diorama-kit";
import { figure, type FigureSpec } from "@/lib/diorama-figure";
import { flame, floor, puddle, towerCrane } from "@/lib/diorama-props";

/**
 * Appello (P257): the schoolmistress leading the column of refugees out of the port at night,
 * stopped at a fork under a signpost with blank boards. She holds a red flare high; behind her
 * the column votes on the way, hands going up and down, and the result goes into the scroll
 * case on her strap so someone can reread it. In her patched coat she cannot even lift her own
 * suitcase: it waits at her feet.
 */
export function appello(kit: Kit): Framing {
  const { add, box, ball, cylinder, decorate, tick, motes } = kit;
  const COAT = 0x34506a;
  const F = octagonBase(kit, 0x1c1e2a);
  const G = floor(kit, F, 0.06, 0x2c2e3a, 0x22242e, 0);
  /** A geometry built round its centre, put with its centre at a point. */
  const put = (geometry: BufferGeometry, color: number, [x, y, z]: Point, options: PartOptions) => {
    geometry.computeBoundingBox();
    return add(geometry, color, x, y + (geometry.boundingBox?.min.y ?? 0), z, options);
  };

  // The road out of the port: a dashed line, a puddle, the cranes left behind, the signpost.
  [-1.7, -1.0, -0.3, 0.4, 1.1, 1.8].forEach((z, k) => box(0.08, 0.006, 0.4, 0xd8d2c4, -0.25 + z * 0.12, G, z, { delay: 0.08 + k * 0.02, flat: true, noInk: true, rotation: [0, 0.12, 0] }));
  puddle(kit, 0.65, 1.45, G, 0.2, 0.38, MAGENTA);
  towerCrane(kit, -1.15, -1.65, G, 0.2, 3.1, 1.2, 0x2a6a80);
  box(0.06, 2.2, 0.06, 0x23222b, 1.7, G, 0.4, { delay: 0.3 });
  [
    [1.95, 1.2, MAGENTA],
    [1.7, 2.6, CYAN],
    [1.45, -0.9, 0xd8d2c4],
  ].forEach(([y, yaw, color], k) => {
    const board = add(new BoxGeometry(0.5, 0.14, 0.03).translate(0.3, 0, 0), color, 1.7, G + y, 0.4, { delay: 0.36 + k * 0.04, rotation: [0, yaw, 0] });
    decorate(board, new ConeGeometry(0.1, 0.12, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.3), color, [[0.61, 0.07, 0]]);
  });

  // The column: each voter's right arm turns about the shoulder, up for yes, down for no.
  const voters: { arm: Group; phase: number; axis: Vector3 }[] = [];
  const voter = (spec: FigureSpec, shoulderWidth: number, phase: number) => {
    const person = figure(kit, { ...spec, arms: ["up", "down"] });
    const u = (spec.height ?? 2.4) / 2.4;
    const f = spec.facing ?? 0;
    const shoulder = new Vector3(...person.at(-shoulderWidth * u, 1.72 * u, 0));
    const arm = new Group();
    arm.position.copy(shoulder);
    const parent = person.headPart.parent as Group;
    parent.add(arm);
    person.parts
      .filter((part) => {
        const dx = part.position.x - spec.x;
        const dz = part.position.z - spec.z;
        return part.position.y >= shoulder.y - 0.001 && dx * Math.cos(f) - dz * Math.sin(f) < -0.15 * u;
      })
      .forEach((part) => {
        part.position.sub(shoulder);
        arm.add(part);
      });
    voters.push({ arm, phase, axis: new Vector3(Math.sin(f), 0, Math.cos(f)) });
    return person;
  };
  const man = voter(
    { x: -1.05, z: -0.55, y: G, facing: 0.5, height: 2.25, skin: 0xc89878, hair: { style: "short", color: 0x2a2420 }, face: { mouth: "neutral", beard: "stubble" }, headwear: { kind: "beanie", color: 0x5a3a48 }, top: { kind: "jacket", color: 0x4a4058 }, bottom: { kind: "trousers", color: 0x2a2834 }, delay: 0.6 },
    0.4,
    0.6,
  );
  ball(0.3, 0x6a5a48, ...man.at(0, 1.25, -0.42), { delay: 0.9 });
  voter(
    { x: -0.35, z: -1.15, y: G, facing: 0.35, height: 2.15, build: "slim", skin: 0xd8a890, face: { mouth: "neutral", brows: "worried" }, headwear: { kind: "hood", color: 0x5a4a6a }, top: { kind: "coat", color: 0x3a3a50 }, bottom: { kind: "long-skirt", color: 0x2a2a3a }, delay: 0.5 },
    0.34,
    1.2,
  );
  voter(
    { x: -1.45, z: 0.45, y: G, facing: 0.4, height: 1.5, build: "child", skin: 0xe0b098, hair: { style: "short", color: 0x3a2a20 }, face: { mouth: "smile" }, headwear: { kind: "beanie", color: 0x7a3a5a }, top: { kind: "hoodie", color: 0x3a4a6a }, bottom: { kind: "trousers", color: 0x2a2a3a }, delay: 0.7 },
    0.3,
    2.0,
  );

  // Appello, flare held high, the scroll case on its strap, her suitcase at her feet.
  const f = 0.25;
  const teacher = figure(kit, {
    x: 0.45,
    z: 0.45,
    y: G,
    facing: f,
    height: 2.3,
    build: "slim",
    skin: 0xe0b0a0,
    hair: { style: "curly", color: 0xb8b8c0 },
    face: { mouth: "neutral", brows: "calm", marks: 0xc09080 },
    top: { kind: "coat", color: COAT, accent: 0x2a3a4a },
    bottom: { kind: "trousers", color: 0x2a2e3e },
    shoes: 0x2a2218,
    scarf: 0x2a2e3e,
    arms: ["up", [0.42, 0.62, 0.14]],
    delay: 0.9,
  });
  const at = teacher.at;
  [
    [-0.12, 1.45, 0.22, 0.3, 0x7a3a5a],
    [0.13, 1.25, 0.22, -0.2, 0x8a7a5a],
    [-0.17, 0.78, 0.25, 0.1, 0x3a7a8a],
    [0.18, 0.62, 0.27, -0.4, 0x6a6a4a],
    [0.04, 0.95, 0.24, 0.5, 0x5a4a6a],
  ].forEach(([x, y, z, lean, color], k) => put(new BoxGeometry(0.1, 0.1, 0.012).rotateZ(lean).rotateY(f), color, at(x, y, z), { delay: 1.3 + k * 0.02 }));
  [-0.08, 0.08].forEach((x) => [1.2, 1.38, 1.56].forEach((y) => ball(0.022, 0x1a2430, ...at(x, y - 0.022, 0.215), { delay: 1.3 })));
  put(new BoxGeometry(0.05, 0.95, 0.02).rotateZ(0.62).rotateY(f), 0x6a4a30, at(0.02, 1.3, 0.23), { delay: 1.32 });
  const tube = cylinder(0.06, 0.06, 0.42, 0xe8e0d0, ...at(0.33, 0.78, 0.14), { delay: 1.35 }, 12);
  decorate(tube, new BoxGeometry(0.13, 0.04, 0.13), 0x6a4a30, [
    [0, 0.06, 0],
    [0, 0.36, 0],
  ]);
  const bag = box(0.5, 0.42, 0.2, 0x6a4a30, ...at(0.62, 0, 0.18), { delay: 1.2, rotation: [0, f + 0.3, 0] });
  decorate(bag, new BoxGeometry(0.52, 0.03, 0.22), 0xc9a46a, [
    [0, 0.12, 0],
    [0, 0.3, 0],
  ]);
  limb(kit, at(0.52, 0.42, 0.18), at(0.48, 0.55, 0.15), 0.015, 0.015, 0x3e3028, { delay: 1.3 });

  // The flare, with its smoke and sparks.
  const [hand] = teacher.hands;
  cylinder(0.045, 0.045, 0.34, 0xc0283a, hand[0], hand[1] - 0.12, hand[2], { delay: 1.4 }, 10);
  const fire = flame(kit, hand[0], hand[2], hand[1] + 0.22, 1.45, 0.8);
  const smoke = [0, 1, 2, 3].map((k) => add(new SphereGeometry(0.13 + k * 0.03, 10, 8), 0xb0305a, hand[0], hand[1] + 0.5, hand[2], { delay: 1.5, flat: true, noInk: true }));
  motes(12, 0xffb070, 0.025, [hand[0] - 0.3, hand[1] + 0.1, hand[2] - 0.3], [hand[0] + 0.3, hand[1] + 1.0, hand[2] + 0.3], 1.6);

  tick((t) => {
    // Hands go up and down as the column votes.
    voters.forEach(({ arm, phase, axis }) => {
      const s = Math.sin(t * 0.9 + phase);
      arm.quaternion.setFromAxisAngle(axis, Math.min(1, Math.max(0, (0.3 - s) / 0.6)) * 2.6);
    });
    fire.forEach((part, k) => (part.rotation.z = Math.sin(t * 13 + k * 2) * 0.12));
    smoke.forEach((puff, k) => {
      const u = (t * 0.25 + k * 0.25) % 1;
      puff.position.set(hand[0] - u * 0.6, hand[1] + 0.45 + u * 0.8, hand[2] - u * 0.3);
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
