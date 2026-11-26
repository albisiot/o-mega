import { BoxGeometry, ConeGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, aim, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, floor, puddle } from "@/lib/diorama-props";

type Dog = { s: number; fur: number; light: number; ears: "point" | "flop"; patches?: number };

/** A stray sitting up on command, facing `facing`; returns its collar point and its tail. */
function sittingDog(kit: Kit, x: number, z: number, y: number, facing: number, dog: Dog, delay: number): { collar: Point; tail: Group } {
  const { add, ball, decorate } = kit;
  const { s, fur, light } = dog;
  const c = Math.cos(facing);
  const n = Math.sin(facing);
  const at = (lx: number, ly: number, lz: number): Point => [x + (lx * c + lz * n) * s, y + ly * s, z + (-lx * n + lz * c) * s];
  const turn: Point = [0, facing, 0];
  const o = (wait: number, extra = {}) => ({ delay: delay + wait, rotation: turn, ...extra });
  const haunch = add(new SphereGeometry(0.28 * s, 14, 10).scale(1, 0.9, 1.1), fur, ...at(0, 0.03, -0.15), o(0));
  if (dog.patches !== undefined)
    decorate(haunch, new BoxGeometry(0.02, 0.12 * s, 0.18 * s), dog.patches, [
      [-0.27 * s, 0.25 * s, 0],
      [0.27 * s, 0.3 * s, -0.05 * s],
    ]);
  [-1, 1].forEach((side) => {
    ball(0.15 * s, fur, ...at(side * 0.17, 0.05, -0.08), o(0.02));
    add(new SphereGeometry(0.08 * s, 10, 8).scale(1, 0.6, 1.6), light, ...at(side * 0.18, 0, 0.08), o(0.03));
  });
  add(new SphereGeometry(0.24 * s, 14, 10).scale(0.85, 1.4, 0.9), fur, ...at(0, 0.22, -0.02), { ...o(0.04), rotation: [-0.3, facing, 0] });
  ball(0.17 * s, light, ...at(0, 0.4, 0.1), o(0.05));
  [-1, 1].forEach((side) => {
    limb(kit, at(side * 0.1, 0.52, 0.12), at(side * 0.1, 0.05, 0.2), 0.06 * s, 0.05 * s, fur, o(0.06));
    ball(0.065 * s, light, ...at(side * 0.1, 0, 0.24), o(0.07));
  });
  // Head, muzzle, nose, eyes lit by her will, ears.
  const head = add(new SphereGeometry(0.17 * s, 14, 10), fur, ...at(0, 0.76, 0.12), o(0.08));
  decorate(head, new BoxGeometry(0.05 * s, 0.03 * s, 0.01), CYAN, [
    [-0.07 * s, 0.2 * s, 0.155 * s],
    [0.07 * s, 0.2 * s, 0.155 * s],
  ]);
  add(new BoxGeometry(0.13 * s, 0.11 * s, 0.18 * s), light, ...at(0, 0.8, 0.28), o(0.09));
  ball(0.035 * s, INK, ...at(0, 0.88, 0.37), o(0.1));
  [-1, 1].forEach((side) => {
    if (dog.ears === "point") add(new ConeGeometry(0.05 * s, 0.15 * s, 6), fur, ...at(side * 0.1, 1.0, 0.08), { ...o(0.1), rotation: [0, facing, -side * 0.35] });
    else add(new BoxGeometry(0.05 * s, 0.17 * s, 0.1 * s), fur, ...at(side * 0.16, 0.8, 0.1), { ...o(0.1), rotation: [0, facing, side * 0.25] });
  });
  add(new TorusGeometry(0.12 * s, 0.025 * s, 6, 18).rotateX(Math.PI / 2), MAGENTA, ...at(0, 0.66, 0.08), { ...o(0.11), rotation: [0.25, facing, 0] });
  const tail = limb(kit, at(0, 0.1, -0.38), at(0, 0.25, -0.68), 0.045 * s, 0.025 * s, fur, o(0.12));
  return { collar: at(0, 0.66, 0.2), tail };
}

/**
 * Guinzaglio (P310): on the container quay at night the dogsitter of the port, in her yellow
 * parka and round glasses, holds a fistful of magenta leashes and puts her other hand out:
 * «Seduti». Four strays sit at once, eyes lit cyan by her thought, tails wagging, while rings
 * of will go out from her open hand. The price of having no head for gadgets: on the bollard
 * behind her a phone rings and rings, and she does not know how to answer it.
 */
export function guinzaglio(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const F = octagonBase(kit, 0x1b1c26);
  const G = floor(kit, F, 0.06, 0x2a3038, 0x1c2028, 0.5);

  // The quay: stacked containers, the leg of a container crane, puddles.
  [
    [-1.1, 0, -1.55, 0x7a2f55],
    [-1.0, 0.62, -1.6, 0x1f7f9c],
    [0.35, 0, -1.65, 0x2f5f6a],
  ].forEach(([x, y, z, color], i) => {
    const container = box(1.4, 0.62, 0.62, color, x, G + y, z, { delay: 0.1 + i * 0.05 });
    decorate(
      container,
      new BoxGeometry(0.02, 0.54, 0.01),
      0x14121c,
      Array.from({ length: 9 }, (_, k) => [-0.6 + k * 0.15, 0.31, 0.315] as Point),
    );
  });
  const leg = box(0.2, 3.3, 0.2, 0x2f6f86, 1.55, G, -1.1, { delay: 0.25 });
  decorate(
    leg,
    new BoxGeometry(0.012, 0.36, 0.012),
    CYAN,
    Array.from({ length: 9 }, (_, k) => [0, 0.2 + k * 0.35, 0.105, k % 2 ? 0.6 : -0.6] as [number, number, number, number]),
  );
  box(1.3, 0.16, 0.16, 0x2f6f86, 1.0, G + 3.15, -1.1, { delay: 0.3 });
  const beacon = box(0.08, 0.08, 0.08, MAGENTA, 1.55, G + 3.3, -1.1, { delay: 0.32, flat: true, noInk: true });
  puddle(kit, -0.4, 1.35, G, 0.3, 0.4, MAGENTA);
  puddle(kit, 1.5, 0.55, G, 0.32, 0.3, CYAN);

  // The bollard with the phone she can't answer, ringing.
  bollard(kit, 1.15, -0.45, G, 0.4);
  const phone = box(0.1, 0.02, 0.18, 0x14121c, 1.15, G + 0.2, -0.45, { delay: 0.6, rotation: [0, 0.4, 0] });
  decorate(phone, new BoxGeometry(0.08, 0.004, 0.14), CYAN, [[0, 0.021, 0]]);
  const rings = [0.14, 0.22].map((r, k) =>
    add(new TorusGeometry(r, 0.012, 4, 16, 1.6), 0xf4f0e6, 1.15, G + 0.28, -0.45, { delay: 0.65 + k * 0.03, flat: true, noInk: true, rotation: [0, 0.4, 0.8] }),
  );

  // Guinzaglio: leashes in her right fist, left hand out.
  const facing = 0.3;
  const sitter = figure(kit, {
    x: 0,
    z: -0.4,
    y: G,
    facing,
    height: 2.3,
    build: "slim",
    skin: 0xe8c4ac,
    hair: { style: "bob", color: 0x1a1820 },
    face: { mouth: "frown", brows: "angry", glasses: "round", glassesColor: 0x8a93a3 },
    top: { kind: "hoodie", color: 0xf0b81a, accent: 0xd89a10 },
    bottom: { kind: "trousers", color: 0x1e2a3a },
    shoes: 0x2a2622,
    arms: [
      [-0.3, 1.12, 0.42],
      [0.38, 1.78, 0.7],
    ],
    legs: "wide",
    delay: 0.8,
  });
  const [fist, palm] = sitter.hands;
  // Rings of will going out from her open hand towards the dogs.
  const ahead = sitter.at(0.38, 1.5, 1.3);
  const reach = aim(palm, ahead);
  const step = (k: number): Point => [palm[0] + ((ahead[0] - palm[0]) * k) / reach.length, palm[1] + ((ahead[1] - palm[1]) * k) / reach.length, palm[2] + ((ahead[2] - palm[2]) * k) / reach.length];
  const will = [0, 1, 2].map((k) =>
    add(new TorusGeometry(0.12, 0.014, 4, 24).rotateX(Math.PI / 2), k % 2 ? CYAN : MAGENTA, ...step(0.15 + k * 0.2), { delay: 1.6 + k * 0.05, flat: true, noInk: true, rotation: reach.rotation }),
  );

  // The strays, sitting in a fan in front of her.
  const dogs = [
    sittingDog(kit, -0.85, 0.75, G, 0.45, { s: 1.15, fur: 0x2a2830, light: 0x4a4652, ears: "point" }, 1.0),
    sittingDog(kit, 0.75, 0.85, G, 0.1, { s: 1.0, fur: 0x8a5a3a, light: 0xc89a6a, ears: "point" }, 1.1),
    sittingDog(kit, -1.55, -0.1, G, 0.7, { s: 0.9, fur: 0x6a6e7a, light: 0x9aa0ab, ears: "flop", patches: 0x2a2830 }, 1.2),
    sittingDog(kit, 0.0, 1.35, G, 0.3, { s: 0.65, fur: 0xd8d4cc, light: 0xf0ece4, ears: "flop" }, 1.3),
  ];
  dogs.forEach(({ collar }, i) => {
    const mid: Point = [(fist[0] + collar[0]) / 2, Math.min(fist[1], collar[1]) - 0.2, (fist[2] + collar[2]) / 2];
    cable(kit, [fist, mid, collar], 0.018, MAGENTA, 1.6 + i * 0.05);
  });
  const wag = dogs.map(({ tail }) => tail.rotation.z);

  tick((t) => {
    dogs.forEach(({ tail }, i) => (tail.rotation.z = wag[i] + Math.sin(t * 9 + i * 1.7) * 0.35));
    will.forEach((ring, k) => {
      const p = (t * 0.6 + k / 3) % 1;
      ring.position.set(...step(0.12 + p * 0.6));
      ring.children[0].scale.setScalar(0.5 + p * 1.3);
    });
    // The phone buzzes on the bollard and its ring marks flash.
    phone.position.x = 1.15 + (Math.floor(t * 1.2) % 2 === 0 ? Math.sin(t * 60) * 0.008 : 0);
    rings.forEach((ring) => (ring.visible = Math.floor(t * 1.2) % 2 === 0));
    beacon.visible = Math.floor(t * 1.5) % 2 === 0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
