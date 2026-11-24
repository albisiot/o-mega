import { Color, CylinderGeometry, DodecahedronGeometry, SphereGeometry, Vector3 } from "three";
import { INK, MAGENTA, YELLOW, colorOf, crawl, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * Novissima (P078): the star-woman has just come down on the port road in a superhero landing,
 * one knee in a smoking crater, her right fist raised and blazing like a small sun. The light is
 * eating her: glowing cracks run up her arm and across her cheek, flakes of her chip off and
 * drift up with the sparks, and now and then the sun in her fist dims. A traffic light leans
 * where the shock threw it.
 */
export function novissima(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const ASPHALT = 0x2a2c38;
  const SUIT = 0x2a6f9a;
  const WHITE = 0xe8ecf0;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, ASPHALT, 0x20222c, 0);
  skyline(kit, -1.85, G, 0.1, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.35, 1.35);
  [-1.7, -1.0, 1.2, 1.9].forEach((x, i) => box(0.36, 0.006, 0.08, 0xd8d2c4, x, G, -0.95 + i * 0.02, { delay: 0.12 + i * 0.02, flat: true, noInk: true, rotation: [0, 0.05, 0] }));

  // The crater: a dark bowl, chunks of asphalt thrown up round its lip, cracks running out.
  const CX = 0.15;
  const CZ = 0.45;
  cylinder(0.95, 0.95, 0.008, 0x14141b, CX, G, CZ, { delay: 0.2, flat: true, noInk: true }, 24);
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + 0.2;
    const chunk = box(0.34 + (k % 3) * 0.06, 0.09, 0.2, k % 2 ? 0x34363f : 0x3c3e48, CX + Math.sin(a) * 1.0, G - 0.02, CZ + Math.cos(a) * 1.0, { delay: 0.25 + k * 0.02 });
    chunk.rotation.order = "YXZ";
    chunk.rotation.set(0.5, a, 0);
  }
  [0.6, 1.9, 3.3, 4.4, 5.5].forEach((a, i) =>
    box(0.55, 0.006, 0.025, i % 2 ? INK : YELLOW, CX + Math.sin(a) * 1.35, G, CZ + Math.cos(a) * 1.35, { delay: 0.4 + i * 0.03, flat: true, noInk: true, rotation: [0, a + Math.PI / 2, 0] }),
  );
  motes(8, 0x5a5468, 0.04, [CX - 0.8, G, CZ - 0.6], [CX + 0.8, G + 1.2, CZ + 0.6], 0.8);

  // The traffic light, knocked crooked, one lamp still lit.
  const lean: Point = [-0.2, 0, -0.33];
  const pole = cylinder(0.04, 0.05, 1.7, 0x23222b, 1.3, G, -0.8, { delay: 0.3, rotation: lean }, 8);
  const head = new Vector3(0, 1.28, 0.09).applyEuler(pole.rotation);
  const lights = box(0.16, 0.42, 0.14, 0x23222b, 1.3 + head.x, G + head.y, -0.8 + head.z, { delay: 0.35, rotation: lean });
  decorate(lights, new CylinderGeometry(0.045, 0.045, 0.01, 12).rotateX(Math.PI / 2), 0x3a2a34, [[0, 0.34, 0.072], [0, 0.21, 0.072]]);
  const amber = decorate(lights, new CylinderGeometry(0.045, 0.045, 0.01, 12).rotateX(Math.PI / 2), MAGENTA, [[0, 0.08, 0.072]]);

  // Novissima: blue suit with a white front, magenta cape, long red hair, kneeling.
  const facing = 0.4;
  const h = 2.45;
  const u = h / 2.4;
  const star = figure(kit, {
    x: CX, z: CZ - 0.05, y: G, facing, height: h,
    skin: 0xecc0a8,
    hair: { style: "bald", color: 0xd0285a },
    face: { mouth: "neutral", brows: "angry", marks: YELLOW },
    top: { kind: "shirt", color: SUIT },
    bottom: { kind: "trousers", color: SUIT },
    shoes: 0x23506e,
    gloves: SUIT,
    arms: ["fist", [0.24, 0.72, 0.5]],
    legs: "kneel",
    delay: 0.8,
  });
  const rot: Point = [0, facing, 0];
  const drop = 1.08 * u * 0.28;
  add(new CylinderGeometry(0.36, 0.62, 1.35, 16).scale(1, 1, 0.3), 0xc0245a, ...star.at(0, 0.12, -0.2), { delay: 0.85, rotation: rot });
  box(0.24, 0.62, 0.06, WHITE, ...star.at(0, 0.98 * u - drop, 0.245), { delay: 1.3, rotation: [-0.05, facing, 0] });
  // Her long red hair: a cap over the crown and a mane down her back, clear of her face.
  const HAIR = 0xd0285a;
  const R = star.headRadius;
  const [hx, hy, hz] = star.head;
  const cap = add(new SphereGeometry(R * 1.12, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), HAIR, hx, hy + R * 0.4, hz, { delay: 1.2 });
  cap.rotation.order = "YXZ";
  cap.rotation.set(-0.25, facing, 0);
  add(new CylinderGeometry(R * 1.05, R * 1.7, 0.9, 16).scale(1, 1, 0.5), HAIR, ...star.at(0, 2.14 * u - drop - 0.78, -0.13), { delay: 1.22, rotation: rot });
  [-1, 1].forEach((side) => ball(R * 0.42, HAIR, ...star.at(side * R * 1.0, 2.14 * u - drop - R * 0.7, -0.04), { delay: 1.24 }));

  // Her right arm cracking with light, from the shoulder to the blazing fist.
  const SW = 0.4 * u;
  const y0 = 1.72 * u - drop;
  const path: Point[] = [star.at(-SW, y0, 0), star.at(-(SW + 0.22 * u), y0 + 0.16 * u, 0.12 * u), star.at(-(SW + 0.06 * u), y0 + 0.62 * u, 0.18 * u)];
  const cracks = zigzag(kit, crawl(path, 5, 0.145, 0.5), 0.028, YELLOW, 1.6);
  const fist = star.hands[0];
  const sun = ball(0.17, YELLOW, fist[0], fist[1] - 0.17, fist[2], { delay: 1.7, flat: true, noInk: true });
  ball(0.1, 0xfffbe6, fist[0], fist[1] - 0.1, fist[2] + 0.06, { delay: 1.72, flat: true, noInk: true });
  const rays = Array.from({ length: 10 }, (_, k) =>
    box(0.035, k % 2 ? 0.34 : 0.52, 0.035, YELLOW, ...fist, { delay: 1.75 + k * 0.02, flat: true, noInk: true, rotation: [0, 0.35, (k / 10) * Math.PI * 2] }),
  );
  const flakes = Array.from({ length: 6 }, (_, k) => add(new DodecahedronGeometry(0.045 + (k % 3) * 0.012), k % 2 ? SUIT : 0x8aa0b8, ...fist, { delay: 1.8 + k * 0.03 }));
  motes(14, YELLOW, 0.025, [fist[0] - 0.45, fist[1] - 0.8, fist[2] - 0.3], [fist[0] + 0.45, fist[1] + 0.9, fist[2] + 0.3], 1.9);

  const sunColor = new Color(YELLOW);
  const sunHot = new Color(0xffffff);
  const sunDim = new Color(0x8a6a2a);
  const elbow = path[1];
  tick((t) => {
    // The sun pulses and, every few seconds, gutters; the flakes peel off and rise.
    const gutter = t % 6 > 5.2 ? 1 : 0;
    const k = (Math.sin(t * 4) + 1) / 2;
    if (gutter) colorOf(sun).copy(sunDim);
    else colorOf(sun).lerpColors(sunColor, sunHot, k * 0.6);
    rays.forEach((ray, i) => {
      ray.rotation.z = (i / 10) * Math.PI * 2 + t * 0.4;
      ray.children[0].scale.y = gutter ? 0.3 : 0.85 + 0.25 * Math.sin(t * 5 + i);
    });
    cracks.forEach((crack) => (crack.visible = !gutter));
    flakes.forEach((flake, i) => {
      const u2 = (t * 0.32 + i / 6) % 1;
      const from = i % 2 ? fist : elbow;
      flake.position.set(from[0] + (i - 2.5) * 0.06 + u2 * 0.25 * Math.sin(i * 2), from[1] + u2 * 1.1, from[2] + u2 * 0.2 * Math.cos(i));
      flake.rotation.set(t * 2 + i, t * 1.5, 0);
      flake.visible = u2 < 0.9;
    });
    amber.color.setHex(Math.floor(t * 1.5) % 2 ? 0x3a2a34 : MAGENTA);
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
