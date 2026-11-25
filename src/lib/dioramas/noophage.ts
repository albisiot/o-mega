import { BoxGeometry, CatmullRomCurve3, ConeGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { YELLOW, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Noophage (P174): in the aisle of the city library the eyeless predator lowers its long pale
 * beak, its crest of red petals flaring, and drinks a shining thought out of the head of a
 * fleeing scholar: the beads of the idea turn grey as they reach it. Armoured all over, it is
 * still fragile underneath: a sticking plaster on its flank.
 */
export function noophage(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const PLATE = 0x3c3a46;
  const PLATE_LIGHT = 0x4e4a5a;
  const SEAM = 0x8a2440;
  const PETAL = 0x7e1f3c;
  const BEAK = 0xd8cfc2;
  const SHELF = 0x3a2a26;
  const F = octagonBase(kit, 0x1c1a22);
  const G = floor(kit, F, 0.06, 0x2e2a36, 0x221e2a, 0.5);

  // Two tall bookcases along the back edges.
  const bookcase = (x: number, z: number, turn: number, delay: number) => {
    const shelf = box(1.8, 2.8, 0.4, SHELF, x, G, z, { delay, rotation: [0, turn, 0], ink: 1.02 });
    decorate(shelf, new BoxGeometry(1.72, 0.05, 0.01), 0x24181a, [0.1, 0.62, 1.14, 1.66, 2.18, 2.7].map((y) => [0, y, 0.201] as Point));
    [0x6a2238, 0x1f5a6a, 0x8a6a3a].forEach((color, c) => {
      const spots: Point[] = [];
      for (let row = 0; row < 5; row++)
        for (let k = 0; k < 8; k++) if ((k + row * 3) % 3 === c && (k * 7 + row) % 11 !== 4) spots.push([-0.77 + k * 0.22, 0.36 + row * 0.52, 0.202]);
      decorate(shelf, new BoxGeometry(0.18, 0.38, 0.01), color, spots);
    });
  };
  bookcase(-1.25, -1.25, Math.PI / 4, 0.1);
  bookcase(0.95, -1.45, -0.4, 0.16);
  [
    [0.15, 0.95, 0.3, 0x6a2238],
    [0.4, 1.1, -0.5, 0x1f5a6a],
    [0.3, 1.05, 1.2, 0x8a6a3a],
  ].forEach(([x, z, turn, color], i) => box(0.3, 0.07, 0.22, color, x, G + (i === 2 ? 0.07 : 0), z, { delay: 0.3 + i * 0.03, rotation: [0, turn, 0] }));

  // The body, low and long, under rows of plates.
  const cx = -0.6;
  const cy = G + 1.3;
  const cz = -0.25;
  const body = add(new SphereGeometry(0.62, 18, 12).scale(1.55, 0.9, 1.0), 0x2a2832, cx, cy - 0.56, cz, { delay: 0.5 });
  // A sticking plaster on its flank, between the plates: under the armour it is fragile.
  decorate(body, new BoxGeometry(0.3, 0.08, 0.02), 0xe6c8a0, [
    [0.35, 0.36, 0.585, 0.6],
    [0.35, 0.36, 0.585, -0.6],
  ]);
  const surface = (x: number) => Math.sqrt(Math.max(0, 1 - ((x - cx) / 0.96) ** 2));
  [-1.32, -0.98, -0.64, -0.3, 0.02].forEach((x, row) => {
    const s = surface(x);
    [-1, 0, 1].forEach((side, k) => {
      const plate = box(0.4, 0.05, side ? 0.46 : 0.52, (row + k) % 2 ? PLATE : PLATE_LIGHT, x, cy + 0.56 * s * (side ? 0.55 : 1) - 0.02, cz + side * 0.47 * s, {
        delay: 0.6 + row * 0.04 + k * 0.02,
        rotation: [side * -0.75, 0, 0.25],
      });
      decorate(plate, new BoxGeometry(0.03, 0.055, side ? 0.46 : 0.52), SEAM, [[-0.2, 0.0, 0]]);
    });
  });
  // A stubby armoured tail.
  limb(kit, [cx - 0.9, cy - 0.05, cz], [cx - 1.4, cy - 0.45, cz], 0.2, 0.08, PLATE, { delay: 0.7 });

  // Four legs of stacked armoured cuffs, and clawed feet.
  [
    [0.02, -0.42],
    [0.02, 0.42],
    [-1.15, -0.42],
    [-1.15, 0.42],
  ].forEach(([dx, dz], i) => {
    const x = cx + 0.6 + dx;
    const z = cz + dz;
    [0.72, 0.44, 0.16].forEach((y, k) => cylinder(0.22 - k * 0.015, 0.16 - k * 0.01, 0.32, k % 2 ? PLATE_LIGHT : PLATE, x, G + y, z, { delay: 0.45 + i * 0.03 + k * 0.02 }, 10));
    add(new SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.6, 1), PLATE, x, G, z, { delay: 0.42 + i * 0.03 });
    [-0.5, 0, 0.5].forEach((a) => add(new ConeGeometry(0.035, 0.14, 5).rotateZ(-Math.PI / 2), BEAK, x + 0.2 * Math.cos(a), G, z + 0.2 * Math.sin(a), { delay: 0.5 + i * 0.03, rotation: [0, -a, 0] }));
  });

  // The neck, ringed with plates, rising to the head.
  const base: Point = [cx + 0.82, cy + 0.3, cz + 0.02];
  const H: Point = [0.5, G + 2.75, -0.15];
  limb(kit, base, H, 0.27, 0.17, PLATE, { delay: 0.8 });
  const neck = aim(base, H);
  [0.2, 0.45, 0.7].forEach((u, k) =>
    add(new TorusGeometry(0.25 - u * 0.1, 0.05, 6, 16).rotateX(Math.PI / 2), k % 2 ? PLATE_LIGHT : PLATE, base[0] + (H[0] - base[0]) * u, base[1] + (H[1] - base[1]) * u - 0.05, base[2] + (H[2] - base[2]) * u, {
      delay: 0.85 + k * 0.03,
      rotation: neck.rotation,
    }),
  );

  // The head: a long pale beak pointing at its prey, no eyes, and a crest of red petals.
  const d = new Vector3(1, -0.8, 0.5).normalize();
  const tip: Point = [H[0] + d.x * 0.85, H[1] + d.y * 0.85, H[2] + d.z * 0.85];
  const beak = add(new ConeGeometry(0.2, 0.85, 10), BEAK, ...H, { delay: 1.0, rotation: aim(H, tip).rotation });
  decorate(beak, new BoxGeometry(0.02, 0.6, 0.02), 0x9a8c7c, [[0, 0.3, 0.1]]);
  ball(0.21, 0x2a2832, H[0], H[1] - 0.21, H[2], { delay: 0.95 });
  const up = new Vector3(0, 1, 0);
  const u1 = up.clone().sub(d.clone().multiplyScalar(up.dot(d))).normalize();
  const u2 = new Vector3().crossVectors(d, u1);
  const petals = [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4].map((a, k) => {
    const radial = u1.clone().multiplyScalar(Math.cos(a)).addScaledVector(u2, Math.sin(a));
    const dir = radial.clone().addScaledVector(d, -0.45).normalize();
    const from: Point = [H[0] + radial.x * 0.1, H[1] + radial.y * 0.1, H[2] + radial.z * 0.1];
    const to: Point = [from[0] + dir.x, from[1] + dir.y, from[2] + dir.z];
    const length = k === 3 ? 1.2 : 1.0 - Math.abs(a) * 0.12;
    const petal = add(new SphereGeometry(0.2, 10, 8).scale(0.6, length * 2.2, 0.22), PETAL, ...from, { delay: 1.05 + k * 0.03, rotation: aim(from, to).rotation });
    decorate(petal, new BoxGeometry(0.05, length * 0.5, 0.01), 0xd04a6a, [[0, length * 0.42, 0.04]]);
    return petal;
  });

  // The scholar running away, an open mouth, the book clutched to his chest.
  const man = figure(kit, {
    x: 1.85,
    z: 0.6,
    y: G,
    facing: 0.85,
    height: 2.3,
    build: "slim",
    skin: 0xe0b896,
    hair: { style: "short", color: 0x5a4030 },
    face: { mouth: "open", brows: "worried", glasses: "round", glassesColor: 0x8a93a3 },
    top: { kind: "coat", color: 0x3a4a5e, accent: 0xd8d2c4 },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    shoes: 0x2a2226,
    arms: [[-0.05, 1.45, 0.3], "back"],
    legs: "stride",
    delay: 1.3,
  });
  const hand = man.hands[0];
  box(0.3, 0.38, 0.08, 0x6a2238, hand[0], hand[1] - 0.2, hand[2] + 0.04, { delay: 1.7, rotation: [0, 0.85, 0.2] });

  // The idea, a string of shining beads drawn from his head into the beak, greying as it goes.
  const [hx, hy, hz] = man.head;
  const path = new CatmullRomCurve3([
    new Vector3(hx - 0.05, hy + 0.3, hz - 0.05),
    new Vector3(hx - 0.35, hy + 0.75, hz - 0.2),
    new Vector3((hx + tip[0]) / 2, hy + 0.6, (hz + tip[2]) / 2 - 0.1),
    new Vector3(tip[0] + 0.12, tip[1] + 0.12, tip[2] + 0.05),
    new Vector3(...tip),
  ]);
  const N = 9;
  const beads = Array.from({ length: N }, (_, k) => ball(0.055, YELLOW, hx, hy + 0.3, hz, { delay: 1.8 + k * 0.03, flat: true, noInk: true }));
  const bright = colorOf(beads[0]).clone();
  const ashen = bright.clone().set(0x77737e);
  tick((t) => {
    beads.forEach((bead, k) => {
      const u = (t * 0.16 + k / N) % 1;
      const p = path.getPoint(u);
      bead.position.set(p.x, p.y - 0.055, p.z);
      colorOf(bead).lerpColors(bright, ashen, Math.min(1, Math.max(0, (u - 0.45) / 0.4)));
      bead.children[0].scale.setScalar(1 - u * 0.45);
    });
    // The crest flares as it feeds.
    const flare = 1 + 0.08 * Math.sin(t * 2.2);
    petals.forEach((petal, k) => {
      const s = flare + 0.03 * Math.sin(t * 2.2 + k);
      petal.children[0].scale.set(1, s, 1);
      petal.children[1].scale.set(1.06, 1.036 * s, 1.06);
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
