import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, ORANGE, aim, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bench, floor } from "@/lib/diorama-props";

/**
 * Matins (P230): at dawn, in a piazza of Nuova Megara, the voice of the morning news stands in the
 * fountain: a tower of long bones bound and twisted into a sheaf, a ring of speaker mouths round
 * its neck. Rings of its voice roll out over the square, rings of water spread across the basin,
 * and the townspeople stand facing it, nodding all together. It never moves: its bones are
 * rooted through the cracked paving. On a bench an unplugged radio says the same thing.
 */
export function matins(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BONE = 0xd8d0bc;
  const BONE_DARK = 0xb4aa94;
  const STONE = 0x5d6680;
  const WATER = 0x1f6f8f;
  const F = octagonBase(kit, 0x201c26);
  const G = floor(kit, F, 0.06, 0x332e3c, 0x241f2c, 0.5);

  // Dawn behind the city: a low orange sun and dark towers with a few cyan windows.
  box(2.6, 0.04, 0.02, ORANGE, 0, G + 0.9, -1.9, { delay: 0.05, flat: true, noInk: true });
  ball(0.32, ORANGE, 0.45, G + 0.95, -1.95, { delay: 0.1, flat: true, noInk: true });
  [
    [-1.25, 1.5, 0.4],
    [-0.75, 2.3, 0.45],
    [-0.22, 1.8, 0.4],
    [1.08, 2.1, 0.4],
  ].forEach(([x, h, w], k) => {
    const tower = box(w, h, 0.06, k % 2 ? 0x2a2238 : 0x241e32, x, G, -1.78 + (k % 2) * 0.05, { delay: 0.1 + k * 0.03, ink: 1.02 });
    decorate(tower, new BoxGeometry(0.05, 0.06, 0.01), CYAN, [
      [-w * 0.2, h * 0.7, 0.035],
      [w * 0.2, h * 0.45, 0.035],
    ]);
  });

  // The fountain basin, and its water.
  const TX = -0.15;
  const TZ = -0.5;
  const W = G + 0.2;
  add(new CylinderGeometry(1.0, 1.05, 0.22, 28, 1, true), STONE, TX, G, TZ, { delay: 0.2 });
  add(new TorusGeometry(1.0, 0.06, 6, 32).rotateX(Math.PI / 2), 0x6e7894, TX, G + 0.16, TZ, { delay: 0.22 });
  cylinder(0.98, 0.98, 0.02, WATER, TX, W - 0.02, TZ, { delay: 0.24, flat: true, noInk: true }, 28);

  // The sheaf of bones: twisted from the water to the speaker band, splaying out above it.
  const N = 12;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const color = k % 2 ? BONE : BONE_DARK;
    const foot: Point = [TX + Math.cos(a) * 0.46, W - 0.05, TZ + Math.sin(a) * 0.46];
    const waist: Point = [TX + Math.cos(a + 0.9) * 0.26, G + 2.45, TZ + Math.sin(a + 0.9) * 0.26];
    const r = 0.46 + (k % 3) * 0.08;
    const crown: Point = [TX + Math.cos(a + 1.25) * r, G + 3.55 + (k % 2) * 0.18, TZ + Math.sin(a + 1.25) * r];
    limb(kit, foot, waist, 0.08, 0.06, color, { delay: 0.4 + k * 0.02 });
    limb(kit, [waist[0], waist[1] + 0.2, waist[2]], crown, 0.06, 0.05, color, { delay: 0.6 + k * 0.02 });
    ball(0.07, color, crown[0], crown[1] - 0.06, crown[2], { delay: 0.7 + k * 0.02 });
  }
  // The band of speaker mouths round its neck.
  const band = cylinder(0.33, 0.33, 0.34, 0xa89e88, TX, G + 2.35, TZ, { delay: 0.8 }, 18);
  decorate(band, new SphereGeometry(0.065, 10, 8).scale(1, 1.4, 1), 0x1a1418, Array.from({ length: 9 }, (_, k) => [Math.cos((k / 9) * Math.PI * 2) * 0.31, 0.17, Math.sin((k / 9) * Math.PI * 2) * 0.31] as Point));
  [2.33, 2.66].forEach((y) => cylinder(0.36, 0.36, 0.05, BONE, TX, G + y, TZ, { delay: 0.82 }, 18));
  // Rooted: bones run out from the basin across the paving, which cracks round them.
  [0.5, 1.6, 2.6, 3.7, 4.9].forEach((a, k) => {
    const from: Point = [TX + Math.cos(a) * 0.95, G + 0.2, TZ + Math.sin(a) * 0.95];
    const to: Point = [TX + Math.cos(a + 0.2) * 1.45, G + 0.02, TZ + Math.sin(a + 0.2) * 1.45];
    limb(kit, from, to, 0.06, 0.035, BONE_DARK, { delay: 0.35 + k * 0.03 });
    box(0.5, 0.006, 0.02, INK, to[0], G, to[2], { delay: 0.4, flat: true, noInk: true, rotation: [0, -a + 0.6, 0] });
  });

  // The townspeople, facing it, all nodding at once.
  const crowd: Group[] = [];
  [
    [-1.45, 0.65, 0x3a4a6a],
    [-0.85, 1.3, 0x4a3a5a],
    [0.6, 1.35, 0x2f4a5a],
    [1.2, 0.8, 0x4a4250],
  ].forEach(([x, z, coat], k) => {
    const turn = Math.atan2(TX - x, TZ - z);
    const person = figure(kit, {
      x,
      z,
      y: G,
      facing: turn,
      height: 1.6 + (k % 2) * 0.12,
      build: k === 2 ? "heavy" : "normal",
      skin: [0xd8a888, 0x8a5a3a, 0xe0b898, 0xb07a58][k],
      hair: { style: (["short", "bun", "bald", "bob"] as const)[k], color: [0x3a2a20, 0x8a8a90, 0x2a1e1c, 0x5a3020][k] },
      face: { mouth: "smile", brows: "none" },
      top: { kind: k % 2 ? "coat" : "jacket", color: coat },
      bottom: { kind: "trousers", color: 0x262430 },
      delay: 1.1 + k * 0.08,
    });
    crowd.push(...person.parts);
  });

  // The loudspeaker on its pole, and the radio on the bench: unplugged, still talking.
  cylinder(0.04, 0.05, 2.5, 0x23222b, -1.7, G, -0.6, { delay: 0.3 }, 8);
  const neck: Point = [-1.7, G + 2.4, -0.6];
  const mouth: Point = [-1.95, G + 2.48, -0.33];
  add(new ConeGeometry(0.16, 0.36, 12, 1, true), 0x8a8f9c, ...mouth, { delay: 0.4, rotation: aim(mouth, neck).rotation });
  bench(kit, 1.45, -0.35, G, 0.3, -0.9);
  const radio = box(0.42, 0.26, 0.16, 0x7a2f55, 1.45, G + 0.35, -0.3, { delay: 0.6, rotation: [0, 0.35, 0] });
  decorate(radio, new CylinderGeometry(0.08, 0.08, 0.01, 16).rotateX(Math.PI / 2), 0x2a1a24, [[-0.08, 0.13, 0.082]]);
  decorate(radio, new BoxGeometry(0.1, 0.05, 0.01), ORANGE, [[0.11, 0.17, 0.082]]);
  cylinder(0.008, 0.008, 0.4, INK, 1.6, G + 0.61, -0.3, { delay: 0.65, noInk: true, rotation: [0, 0, -0.5] }, 4);
  cable(kit, [[1.5, G + 0.36, -0.15], [1.6, G + 0.15, 0.1], [1.75, G + 0.03, 0.4]], 0.012, INK, 0.7);
  box(0.06, 0.04, 0.1, 0xd8d8e0, 1.78, G, 0.45, { delay: 0.75 });
  const radioWave = add(new TorusGeometry(0.12, 0.012, 6, 20), ORANGE, 1.45, G + 0.42, -0.3, { delay: 1.4, flat: true, noInk: true, rotation: [0, 0.35, 0] });

  // The rings: the voice from the band, the water across the basin, a murmur from the radio.
  const voice = [0, 1, 2].map((k) => add(new TorusGeometry(0.4, 0.02, 6, 36).rotateX(Math.PI / 2), 0xffc890, TX, G + 2.52, TZ, { delay: 1.3 + k * 0.1, flat: true, noInk: true }));
  const ripples = [0, 1].map((k) => add(new TorusGeometry(0.5, 0.018, 6, 36).rotateX(Math.PI / 2), 0xbfefff, TX, W + 0.005, TZ, { delay: 1.4 + k * 0.1, flat: true, noInk: true }));

  const rest = crowd.map((part) => part.position.y);
  tick((t) => {
    voice.forEach((ring, k) => {
      const u = (t * 0.35 + k / 3) % 1;
      ring.children[0].scale.set(1 + u * 3, 1, 1 + u * 3);
      ring.visible = u < 0.85;
    });
    ripples.forEach((ring, k) => {
      const u = (t * 0.3 + k / 2) % 1;
      ring.children[0].scale.set(1 + u * 0.9, 1, 1 + u * 0.9);
      ring.visible = u < 0.9;
    });
    const wave = 1 + ((t * 0.8) % 1) * 1.2;
    radioWave.children[0].scale.setScalar(wave);
    radioWave.children[0].position.y = 0.12 * (1 - wave);
    const nod = Math.max(0, Math.sin(t * 2.4)) * 0.025;
    crowd.forEach((part, i) => (part.position.y = rest[i] - nod));
  });

  return { width: 4.9, height: 4.7, lookY: 1.9 };
}
