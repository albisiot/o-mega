import { BoxGeometry, ConeGeometry, Vector3, type Group } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor, wallLantern } from "@/lib/diorama-props";

/**
 * Rasura (P283): an Erased of Nomina in an old-town alley, a hooded figure of torn parchment
 * strips with a blank scraped face and a red stitch across the brow. On the wall behind her a
 * mural of the hero who saved the street is being scraped away: the head is already blank
 * plaster, and its strips peel off and drift to her robe. On a bench the man who was saved sits
 * with his bandaged head and a bouquet for someone, and cannot remember who.
 */
export function rasura(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const PARCH = 0xd8cdb4;
  const PARCH_DARK = 0xb8aa8c;
  const SCRIBBLE = 0x5a4a5e;
  const WALL = 0x3a3450;
  const F = octagonBase(kit, 0x1c1a24);
  const G = floor(kit, F, 0.06, 0x2e2c3a, 0x201e2a, 0.42);

  /** Tilts a part in its own frame, then turns it about the vertical. */
  const yxz = (part: Group, tilt: number, turn: number, roll = 0) => {
    part.rotation.order = "YXZ";
    part.rotation.set(tilt, turn, roll);
    return part;
  };
  const scribbles = new BoxGeometry(0.07, 0.008, 0.004);

  // The alley wall, and on it the mural of the hero, scraped blank from the chest up.
  const wall = box(3.4, 2.7, 0.3, WALL, 0, G, -1.45, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(3.4, 0.03, 0.01), shade(WALL, 0.7), [0.5, 1.0, 1.5, 2.0].map((y) => [0, y, 0.152] as Point));
  const M = 0.85;
  const face = 0.156;
  decorate(wall, new BoxGeometry(1.3, 1.8, 0.01), 0x1f5f7a, [[M, 1.45, face]]);
  decorate(wall, new BoxGeometry(0.9, 1.05, 0.01), MAGENTA, [[M, 1.25, face + 0.002]]);
  decorate(wall, new BoxGeometry(0.42, 0.62, 0.01), YELLOW, [[M, 1.35, face + 0.004]]);
  decorate(wall, new BoxGeometry(0.13, 0.55, 0.01), 0x23305a, [
    [M - 0.1, 0.78, face + 0.004],
    [M + 0.1, 0.78, face + 0.004],
  ]);
  decorate(wall, new BoxGeometry(0.12, 0.5, 0.01), YELLOW, [[M + 0.33, 1.72, face + 0.004, -0.4]]);
  decorate(wall, new BoxGeometry(0.2, 0.06, 0.01), CYAN, [[M, 1.08, face + 0.006]]);
  // The scraped patch: blank plaster where the face was.
  decorate(wall, new BoxGeometry(0.5, 0.42, 0.01), PARCH, [
    [M - 0.02, 1.95, face + 0.008, 0.2],
    [M + 0.18, 1.82, face + 0.009, -0.35],
    [M - 0.2, 1.72, face + 0.01, 0.5],
    [M + 0.3, 2.12, face + 0.01, 0.1],
  ]);
  // Strips half peeled off the mural.
  [
    [M - 0.35, 1.7, 0.5, -0.6],
    [M + 0.45, 1.95, 0.7, 0.5],
    [M + 0.05, 1.55, 0.6, 0.1],
  ].forEach(([x, y, tilt, roll], i) => yxz(box(0.09, 0.32, 0.01, PARCH, x, G + y, -1.29, { delay: 0.5 + i * 0.04 }), tilt, 0, roll));
  const lantern = wallLantern(kit, -1.1, -1.3, G + 2.25, 0.3, YELLOW);

  // Rasura: blank parchment face under a hood, a robe of torn written strips, thin grey hands.
  const facing = 0.25;
  const u = 2.55 / 2.4;
  const erased = figure(kit, {
    x: -0.15,
    z: 0.15,
    y: G,
    facing,
    height: 2.55,
    build: "slim",
    skin: 0xe8dfc8,
    face: { blank: true },
    headwear: { kind: "hood", color: PARCH_DARK },
    top: { kind: "robe", color: PARCH },
    gloves: 0x8e8a84,
    arms: [
      [-0.4, 1.02, 0.12],
      [0.42, 1.05, 0.1],
    ],
    delay: 0.8,
  });
  const cy = erased.headRadius * 1.06;
  const fz = erased.headRadius * 0.9;
  decorate(erased.headPart, new BoxGeometry(0.06, 0.035, 0.02), shade(PARCH, 0.82), [
    [-0.08 * u, cy + 0.03, fz - 0.01],
    [0.08 * u, cy + 0.03, fz - 0.01],
  ]);
  decorate(erased.headPart, new BoxGeometry(0.26, 0.016, 0.02), 0xc81e3a, [[0, cy + 0.12, fz - 0.03]]);
  decorate(erased.headPart, new BoxGeometry(0.01, 0.045, 0.02), 0xc81e3a, [-0.09, -0.03, 0.03, 0.09].map((x) => [x, cy + 0.12, fz - 0.025] as Point));
  // Her strips, hanging in rings round the robe, each scrawled with lines.
  [
    [0.1, 0.52, 0.45, 9, -0.12],
    [0.55, 0.5, 0.37, 8, -0.1],
    [1.1, 0.58, 0.32, 7, -0.06],
  ].forEach(([bottom, length, radius, count, tilt], ring) => {
    for (let k = 0; k < count; k++) {
      const a = -1.75 + (3.5 * k) / (count - 1) + (ring % 2) * 0.15;
      const at = erased.at(Math.sin(a) * radius * u, bottom * u, Math.cos(a) * radius * u * 0.8);
      const strip = yxz(box(0.11, length * u * (0.85 + ((k * 7) % 3) * 0.1), 0.014, k % 3 ? PARCH : PARCH_DARK, ...at, { delay: 1.2 + ring * 0.1 + k * 0.015 }), tilt, facing + a, ((k % 3) - 1) * 0.06);
      decorate(strip, scribbles, SCRIBBLE, [
        [-0.01, 0.12, 0.009],
        [0.01, 0.2, 0.009],
        [-0.02, 0.28, 0.009],
      ]);
    }
  });

  // The man she has met: bandaged, a bouquet for his rescuer, and no idea who that was.
  const B = { x: -1.35, z: 0.62, facing: 0.95 };
  const seat = box(0.95, 0.06, 0.38, 0x5e4a3a, B.x, G + 0.39, B.z, { delay: 0.4, rotation: [0, B.facing, 0] });
  decorate(seat, new BoxGeometry(0.95, 0.008, 0.01), 0x3e3028, [[0, 0.061, 0]]);
  [-0.4, 0.4].forEach((dx) =>
    box(0.05, 0.39, 0.3, 0x23222b, B.x + dx * Math.cos(B.facing), G, B.z - dx * Math.sin(B.facing), { delay: 0.42, rotation: [0, B.facing, 0] }),
  );
  yxz(box(0.95, 0.3, 0.04, 0x5e4a3a, B.x - 0.2 * Math.sin(B.facing), G + 0.5, B.z - 0.2 * Math.cos(B.facing), { delay: 0.45 }), -0.15, B.facing);
  const saved = figure(kit, {
    x: B.x,
    z: B.z,
    y: G,
    facing: B.facing,
    height: 2.3,
    build: "normal",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x4a3226 },
    face: { mouth: "open", brows: "worried", beard: "stubble" },
    headwear: { kind: "headband", color: 0xf2efe6 },
    top: { kind: "jacket", color: 0x2c4a5e, accent: 0xd8d2c4 },
    bottom: { kind: "trousers", color: 0x2a2a3a },
    shoes: 0x2a2622,
    arms: ["chin", [0.2, 0.98, 0.42]],
    legs: "sit",
    delay: 1.0,
  });
  const bunch = saved.hands[1];
  [-0.05, 0, 0.05].forEach((dx, i) => {
    cylinder(0.01, 0.012, 0.3, 0x2f8f4f, bunch[0] + dx * 0.6, bunch[1] - 0.1, bunch[2], { delay: 1.6, noInk: true, rotation: [0, 0, dx * 3] }, 5);
    ball(0.055, i === 1 ? YELLOW : MAGENTA, bunch[0] + dx * 1.6, bunch[1] + 0.19, bunch[2], { delay: 1.65 + i * 0.03 });
  });
  add(new ConeGeometry(0.1, 0.2, 8).rotateX(Math.PI), 0xe8e2d0, bunch[0], bunch[1] - 0.12, bunch[2], { delay: 1.6 });

  // Strips of the mural drifting to her, one after another.
  const from = new Vector3(M + 0.05, G + 1.9, -1.25);
  const bend = new Vector3(0.9, G + 2.6, -0.5);
  const to = new Vector3(...erased.at(0.2, 1.85 * u, 0.1));
  const drift = Array.from({ length: 6 }, (_, k) => box(0.11, 0.28, 0.01, PARCH, 0, 0, 0, { delay: 1.7 + k * 0.05 }));
  [
    [0.55, 0.75, 0.4],
    [-0.75, 0.95, -0.6],
    [0.25, 1.35, 1.1],
  ].forEach(([x, z, turn], i) => box(0.1, 0.01, 0.3, PARCH_DARK, x, G, z, { delay: 0.6 + i * 0.03, rotation: [0, turn, 0] }));
  const place = (t: number) =>
    drift.forEach((strip, k) => {
      const s = (t * 0.18 + k / drift.length) % 1;
      const p = from.clone().multiplyScalar((1 - s) * (1 - s)).addScaledVector(bend, 2 * s * (1 - s)).addScaledVector(to, s * s);
      strip.position.set(p.x, p.y - 0.1, p.z);
      strip.rotation.set(s * 5 + k, s * 3, Math.sin(s * 9 + k) * 0.8);
    });
  place(0);

  const rest = saved.headPart.rotation.y;
  tick((t) => {
    place(t);
    // He looks from the bouquet to the wall and back; the lantern sputters.
    saved.headPart.rotation.y = rest + Math.sin(t * 0.7) * 0.12;
    lantern.visible = Math.floor(t * 6) % 17 !== 9;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
