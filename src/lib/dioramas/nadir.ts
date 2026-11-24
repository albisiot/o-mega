import { BoxGeometry, CylinderGeometry, Group, OctahedronGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure } from "@/lib/diorama-figure";
import { facade, floor, puddle } from "@/lib/diorama-props";

/**
 * A cap of hair over the top of a figure's head (the figure's own caps sit low and leave it bald);
 * `front` tips it back to bare the forehead.
 */
function hairCap(kit: Kit, person: Figure, color: number, facing: number, delay: number, front = 0.4): Group {
  const R = person.headRadius;
  const [x, y, z] = person.head;
  const cap = kit.add(new SphereGeometry(R * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.1, 1.02), color, x - Math.sin(facing) * 0.03, y - R * 0.05, z - Math.cos(facing) * 0.03, { delay });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-front, facing, 0);
  return cap;
}

/**
 * Nadir (P061): the flyer with sheet-metal wings has just landed, badly, on the roof of a parked
 * car. He sits in the dent grinning and dazed, goggles up, red scarf, a plaster on his forehead,
 * little stars circling his head; one wing is bent and smoking, loose feathers of tin lie on the
 * bonnet and the street, his spanner has fallen, and the car's hazard lights blink.
 */
export function nadir(kit: Kit): Framing {
  const { add, box, decorate, tick, motes } = kit;
  const CAR = 0x3a4a7a;
  const TIN = [0x5f8a96, 0x4a6f80];
  const F = octagonBase(kit, 0x1a1a26);
  const G = floor(kit, F, 0.06, 0x262833, 0x1c1e28, 0.55);

  // The street behind: a house front with lit windows, a puddle.
  facade(kit, -0.1, -1.6, G, 0.1, { width: 2.7, height: 2.6, color: 0x2e2a46, windows: 4, floors: 2, door: true, shutters: 0x2a5a6a });
  puddle(kit, -1.3, 0.9, G, 0.3, 0.4, MAGENTA);

  // The car, nose to us, its roof caved in where he came down.
  const CX = 0.1;
  const CZ = -0.25;
  const body = box(0.95, 0.45, 2.2, CAR, CX, G + 0.17, CZ, { delay: 0.3 });
  decorate(body, new BoxGeometry(0.16, 0.08, 0.01), 0xe8f4ff, [[-0.32, 0.3, 1.101], [0.32, 0.3, 1.101]]);
  decorate(body, new BoxGeometry(0.4, 0.1, 0.01), 0x1a1a22, [[0, 0.16, 1.101]]);
  decorate(body, new BoxGeometry(0.01, 0.35, 0.01), 0x26325a, [[0.476, 0.22, -0.1], [0.476, 0.22, 0.5]]);
  const cabin = box(0.85, 0.4, 1.2, 0x4a5a8a, CX, G + 0.62, CZ - 0.15, { delay: 0.36 });
  decorate(cabin, new BoxGeometry(0.01, 0.26, 0.48), 0x16303e, [[0.426, 0.2, -0.29], [0.426, 0.2, 0.29], [-0.426, 0.2, -0.29], [-0.426, 0.2, 0.29]]);
  decorate(cabin, new BoxGeometry(0.7, 0.28, 0.01), 0x16303e, [[0, 0.2, 0.601]]);
  // Cracks across the windscreen behind him.
  decorate(cabin, new BoxGeometry(0.01, 0.22, 0.005), 0xd8f4ff, [[-0.25, 0.2, 0.608, 0.6], [0.25, 0.2, 0.608, -0.5], [0.28, 0.22, 0.608, 1.3]]);
  [-1, 1].forEach((s) => box(0.86, 0.07, 0.62, 0x4a5a8a, CX, G + 1.0, CZ - 0.15 + s * 0.3, { delay: 0.4, rotation: [-s * 0.14, 0, 0] }));
  [-0.47, 0.47].forEach((dx) =>
    [-0.72, 0.72].forEach((dz) => add(new CylinderGeometry(0.17, 0.17, 0.1, 14).rotateZ(Math.PI / 2), 0x1a1a22, CX + dx, G, CZ + dz, { delay: 0.32 })),
  );
  // Hazard lights at the corners, and a hubcap rolling away.
  const hazards = [-0.44, 0.44].flatMap((dx) => [-1.08, 1.08].map((dz) => box(0.1, 0.1, 0.06, ORANGE, CX + dx, G + 0.47, CZ + dz, { delay: 0.45, flat: true })));
  const HUB = 0.12;
  const hubcap = add(new CylinderGeometry(HUB, HUB, 0.03, 16).rotateX(Math.PI / 2), 0xb0b4bc, 0, 0, 0, { delay: 0.5 });

  // Tin feathers that came off: on the bonnet and the street; the spanner.
  [
    [CX - 0.28, G + 0.62, 0.62, 0.3],
    [1.0, G, 0.75, 1.2],
    [-0.75, G, 1.0, -0.5],
    [-1.35, G, 0.05, 2.0],
    [0.95, G, -0.6, 0.6],
  ].forEach(([x, y, z, turn], i) =>
    box(0.12, 0.02, 0.5, TIN[i % 2], x, y, z, { delay: 0.55 + i * 0.03, rotation: [0, turn, 0] }),
  );
  const spanner = box(0.05, 0.02, 0.4, 0x8a93a3, 0.55, G, 1.25, { delay: 0.6, rotation: [0, -0.6, 0] });
  decorate(spanner, new TorusGeometry(0.06, 0.02, 6, 12, 4.6).rotateX(Math.PI / 2), 0x8a93a3, [[0, 0.01, 0.22]]);

  // Nadir, sitting in the dent, scratching his head, grinning.
  const D = 0.75;
  const u = 2.3 / 2.4;
  const flyer = figure(kit, {
    x: CX - 0.12,
    z: 0.12,
    y: G + 0.62,
    facing: 0.85,
    height: 2.3,
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x2a1c18 },
    face: { mouth: "grin", brows: "worried" },
    top: { kind: "shirt", color: 0x2a6a72 },
    bottom: { kind: "trousers", color: 0x2a6a72 },
    shoes: 0x3a2c22,
    gloves: 0x4a3a2a,
    scarf: 0xd0284a,
    arms: [[-0.22, 1.9, 0.08], [0.42, 0.78, 0.42]],
    legs: "sit",
    delay: D,
  });
  hairCap(kit, flyer, 0x2a1c18, 0.85, D + 0.38, 0.55);
  const RH = flyer.headRadius;
  const headY = flyer.head[1] - (G + 0.62);
  // Goggles up on his brow, a plaster across it.
  [-1, 1].forEach((side) =>
    add(new TorusGeometry(0.055, 0.018, 6, 14), 0x8a6a3a, ...flyer.at(side * 0.08 * u, headY + RH * 0.5, RH * 1.0), { delay: D + 0.45, rotation: [0.5, 0.85, 0] }),
  );
  [-1, 1].forEach((side) =>
    add(new CylinderGeometry(0.045, 0.045, 0.02, 12).rotateX(Math.PI / 2), CYAN, ...flyer.at(side * 0.08 * u, headY + RH * 0.53, RH * 0.98), { delay: D + 0.47, flat: true, noInk: true, rotation: [0.5, 0.85, 0] }),
  );
  decorate(flyer.headPart, new BoxGeometry(0.1, 0.035, 0.02), 0xe8d4b0, [[0.09 * u, RH * 1.06 + 0.06 * u, RH * 0.86, -0.4]]);
  // Leather straps across the chest; the scarf's tail flying.
  [-1, 1].forEach((side) =>
    limb(kit, flyer.at(side * 0.22, 1.3 * u, 0.2), flyer.at(-side * 0.12, 0.78 * u, 0.26), 0.025, 0.025, 0x6a4a32, { delay: D + 0.4, noInk: true }),
  );
  const tail = limb(kit, flyer.at(0.12, 1.36 * u, -0.1), flyer.at(0.55, 1.15 * u, -0.45), 0.06, 0.035, 0xd0284a, { delay: D + 0.42 });
  const tailRest = tail.rotation.x;

  // The wings: tin feathers fanned from his shoulder blades; the left one bent down, smoking.
  const wing = (side: number, angles: number[], lengths: number[], delay: number) =>
    angles.map((a, k) => {
      const feather = box(0.13, lengths[k], 0.025, TIN[k % 2], ...flyer.at(side * 0.14, 1.32 * u, -0.26), { delay: delay + k * 0.03, rotation: [-0.3, 0.85, a] });
      decorate(feather, new BoxGeometry(0.03, lengths[k] * 0.9, 0.01), MAGENTA, [[0.05, lengths[k] * 0.52, 0.014]]);
      decorate(feather, new BoxGeometry(0.025, 0.025, 0.01), INK, [[-0.03, 0.08, 0.014], [0.03, 0.08, 0.014]]);
      return feather;
    });
  wing(-1, [0.45, 0.75, 1.05, 1.35], [1.0, 1.05, 0.95, 0.8], D + 0.5);
  const broken = wing(1, [-1.9, -2.15, -2.4], [0.85, 0.8, 0.7], D + 0.6);
  const tip = flyer.at(0.75, 0.75 * u, -0.35);
  motes(10, 0x8a8a9a, 0.04, [tip[0] - 0.1, tip[1], tip[2] - 0.1], [tip[0] + 0.15, tip[1] + 1.6, tip[2] + 0.1], 1.4);
  motes(4, MAGENTA, 0.025, [tip[0] - 0.05, tip[1], tip[2] - 0.05], [tip[0] + 0.1, tip[1] + 0.8, tip[2] + 0.05], 1.5);

  // Stars circling his head.
  const ring: Point = [flyer.head[0], flyer.top + 0.15, flyer.head[2]];
  const stars = [0, 1, 2].map((k) => add(new OctahedronGeometry(0.06).scale(1, 1, 0.4), 0xffd60a, 0, 0, 0, { delay: D + 0.8 + k * 0.05, flat: true }));

  const brokenRest = broken.map((feather) => feather.rotation.z);
  tick((t) => {
    stars.forEach((star, k) => {
      const a = t * 2.2 + (k * Math.PI * 2) / 3;
      star.position.set(ring[0] + Math.cos(a) * 0.32, ring[1] + Math.sin(a * 2) * 0.04, ring[2] + Math.sin(a) * 0.22);
      star.rotation.y = t * 4;
    });
    hazards.forEach((light) => (light.visible = Math.floor(t * 2.5) % 2 === 0));
    // The hubcap rolls off down the street and comes back round.
    const roll = (t * 0.35) % 1;
    // It turns about its centre: a part turns about its foot, so the foot circles the centre.
    const spin = roll * 14;
    const turn = -0.35;
    hubcap.rotation.set(0, turn, spin);
    hubcap.position.set(
      -0.6 - roll * 1.05 + HUB * Math.sin(spin) * Math.cos(turn),
      G + HUB - HUB * Math.cos(spin),
      0.6 + roll * 0.4 - HUB * Math.sin(spin) * Math.sin(turn),
    );
    hubcap.visible = roll < 0.92;
    broken.forEach((feather, k) => (feather.rotation.z = brokenRest[k] + Math.sin(t * 7 + k) * 0.03));
    tail.rotation.x = tailRest + Math.sin(t * 4) * 0.08;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
