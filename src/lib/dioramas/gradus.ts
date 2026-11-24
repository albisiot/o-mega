import { BoxGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, steps, wallLantern } from "@/lib/diorama-props";

/**
 * Gradus (P119): on the grand marble staircase of the Banco, step edges lit, the bald porter in
 * his navy double-breasted coat climbs with an old lady riding on his back, the great ring of keys
 * swinging at his belt. Every flight costs him a memory: little photographs slip off him one by
 * one and drift away down the stairs.
 */
export function gradus(kit: Kit): Framing {
  const { box, cylinder, ball, decorate, tick } = kit;
  const MARBLE = 0x6a7890;
  const BRASS = 0xd8b048;
  const F = octagonBase(kit, 0x1e2130);
  const G = floor(kit, F, 0.06, 0x2c3040, 0x22263a, 0.6);

  // The hall: a back wall with pilasters and a tall lit window, a column, a lantern.
  const wall = box(2.7, 3.4, 0.2, 0x262c48, -0.05, G, -1.6, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.2, 3.4, 0.03), 0x30385a, [-1.15, -0.4, 0.4, 1.15].map((x) => [x, 1.7, 0.11] as Point));
  decorate(wall, new BoxGeometry(0.5, 1.4, 0.02), 0x0b3d50, [[0, 2.0, 0.11]]);
  decorate(wall, new BoxGeometry(0.03, 1.4, 0.03), CYAN, [[0, 2.0, 0.12]]);
  column(kit, 1.45, -0.95, G, 0.2, 3.2, false, 0x8a98b0);
  wallLantern(kit, 0.75, -1.5, G + 2.6, 0.3, YELLOW);

  // The flight, rising to the right; a magenta runner, lit edges, balusters along the far side.
  const f = -1.85;
  const dir: [number, number] = [-Math.sin(f), -Math.cos(f)];
  const side: [number, number] = [Math.cos(f), -Math.sin(f)];
  const S: [number, number] = [-1.55, -0.5];
  const tread = 0.36;
  const rise = 0.14;
  const count = 8;
  steps(kit, ...S, G, 0.3, { width: 1.3, count, tread, rise, color: MARBLE, facing: f });
  const along = (d: number, s: number, y: number): Point => [S[0] + dir[0] * d + side[0] * s, G + y, S[1] + dir[1] * d + side[1] * s];
  for (let k = 0; k < count; k++) {
    box(0.5, 0.012, tread, MAGENTA, ...along(k * tread + tread / 2, 0, (k + 1) * rise), { delay: 0.5 + k * 0.02, noInk: true, rotation: [0, f, 0] });
    box(1.3, 0.02, 0.035, YELLOW, ...along(k * tread + 0.02, 0, (k + 1) * rise), { delay: 0.55 + k * 0.02, flat: true, noInk: true, rotation: [0, f, 0] });
    cylinder(0.035, 0.05, 0.55, 0xa8b4c8, ...along(k * tread + tread / 2, -0.58, (k + 1) * rise), { delay: 0.6 + k * 0.02 }, 8);
  }
  limb(kit, along(0.15, -0.58, rise + 0.55), along(count * tread - 0.15, -0.58, count * rise + 0.55), 0.045, 0.045, 0xa8b4c8, { delay: 0.8 });

  // Gradus, mid-climb: the front foot already on the next step.
  const d0 = 3 * tread + 0.08;
  const [px, , pz] = along(d0, 0.05, 0);
  const facing = Math.atan2(dir[0], dir[1]);
  const porter = figure(kit, {
    x: px,
    z: pz,
    y: G + 4 * rise,
    facing,
    height: 2.5,
    build: "broad",
    skin: 0xd8a888,
    hair: { style: "bald", color: 0x3a2a22 },
    face: { mouth: "neutral", brows: "worried" },
    top: { kind: "coat", color: 0x1e2a4a, accent: 0xd8d2c4 },
    bottom: { kind: "trousers", color: 0x1a2440 },
    belt: 0x4a3426,
    shoes: 0x1a1618,
    arms: ["back", "back"],
    legs: "stride",
    delay: 1,
  });
  [1, 2].forEach((k) => (porter.parts[k].position.y += rise));
  [1.25, 1.42, 1.59].forEach((y, i) => [-0.1, 0.1].forEach((x) => ball(0.03, BRASS, ...porter.at(x, y, 0.31), { delay: 1.4 + i * 0.02, noInk: true })));
  // The great ring of keys at his hip.
  const keyRing = porter.at(-0.36, 0.98, 0.2);
  const ringPart = kit.add(new TorusGeometry(0.08, 0.014, 6, 16), BRASS, keyRing[0], keyRing[1] - 0.1, keyRing[2], { delay: 1.45, rotation: [0, facing, 0] });
  // Hung upside down from the ring's foot, so they swing from their bows.
  const keys = [-0.05, -0.015, 0.02, 0.055].map((dx, i) =>
    box(0.025, 0.2 + (i % 2) * 0.05, 0.012, BRASS, keyRing[0] + dx * Math.cos(facing), keyRing[1] - 0.1, keyRing[2] - dx * Math.sin(facing), { delay: 1.5 + i * 0.02, rotation: [0, facing, Math.PI] }),
  );

  // The old lady riding on his back, her arms round his neck.
  const back = 0.38;
  const lady = figure(kit, {
    x: px - dir[0] * back - Math.cos(facing) * 0.16,
    z: pz - dir[1] * back + Math.sin(facing) * 0.16,
    y: G + 4 * rise + 0.55,
    facing,
    height: 1.75,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "curly", color: 0xe8e8ec },
    face: { mouth: "smile", brows: "calm" },
    top: { kind: "coat", color: 0x5a5868, accent: 0x8a8898 },
    bottom: { kind: "long-skirt", color: 0x3a3848 },
    shoes: 0x2a2222,
    arms: [
      [-0.08, 1.02, 0.62],
      [0.4, 1.05, 0.6],
    ],
    delay: 1.3,
  });

  // Memories: little photographs slipping off him and drifting down the stairs.
  const photos = [0x16c8ff, MAGENTA, 0x7ad8b8, 0x9b5cff].map((color, k) => {
    const photo = box(0.22, 0.26, 0.012, 0xf4f0e6, 0, 0, 0, { delay: 1.7 + k * 0.05 });
    decorate(photo, new BoxGeometry(0.17, 0.16, 0.01), color, [[0, 0.15, 0.008], [0, 0.15, -0.008]]);
    decorate(photo, new BoxGeometry(0.06, 0.07, 0.01), INK, [[0.03, 0.14, 0.012], [-0.03, 0.14, -0.012]]);
    return photo;
  });
  const head = porter.head;
  // Both of them rise a little with each step he takes.
  const climbers = [...porter.parts, ...lady.parts, ringPart, ...keys];
  const rest = climbers.map((part) => part.position.y);

  tick((t) => {
    photos.forEach((photo, k) => {
      const u = (t / 6 + k / 4) % 1;
      const d = d0 - u * 2.4;
      const [x, , z] = along(d, 0.15 + Math.sin(u * 5 + k) * 0.25, 0);
      photo.position.set(x, head[1] + 0.3 + Math.sin(u * Math.PI) * 0.3 - u * 1.6, z);
      photo.rotation.set(Math.sin(u * 7 + k) * 0.5, facing + u * 4, Math.cos(u * 5) * 0.4);
      photo.visible = u < 0.9;
    });
    const step = Math.abs(Math.sin(t * 1.6)) * 0.035;
    climbers.forEach((part, i) => (part.position.y = rest[i] + step));
    const sway = Math.sin(t * 3) * 0.18;
    ringPart.rotation.z = sway * 0.5;
    keys.forEach((key, i) => (key.rotation.z = Math.PI + (i - 1.5) * 0.12 + sway));
  });

  return { width: 4.9, height: 4.5, lookY: 1.8 };
}
