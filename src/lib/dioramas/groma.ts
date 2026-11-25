import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, type Group } from "three";
import { ORANGE, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Groma (P180): on a rocky height above the city the sacred surveyor stands in her red cloak with
 * the groma, its four plumb bobs swinging on their strings, and points down: the ancient survey
 * grid glows again across the streets, and a house built out of line is sliding back into the
 * square the old register gives it, dragging its dust behind.
 */
export function groma(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const ROCK = 0x4a3e3c;
  const CLOAK = 0x9a2a3a;
  const WOOD = 0x6a4e38;
  const WALLS = [0x3a4a6a, 0x4a3a5a, 0x2e5a6a, 0x54466a];
  const ROOF = 0x7a3444;
  const F = octagonBase(kit, 0x1c1a24);
  const G = floor(kit, F, 0.06, 0x2c2a38, 0x2c2a38, 0);

  // The survey grid, glowing across the whole city.
  const S = 0.45;
  const inner = 2.1;
  const half = (d: number) => Math.min(inner, inner * Math.SQRT2 - Math.abs(d));
  for (let j = 0; j < 9; j++) {
    const d = -1.575 + j * S;
    const w = half(d);
    box(2 * w, 0.006, 0.025, ORANGE, 0, G, d, { delay: 0.1 + j * 0.02, flat: true, noInk: true });
    box(0.025, 0.006, 2 * w, ORANGE, d, G, 0, { delay: 0.1 + j * 0.02, flat: true, noInk: true });
  }

  // The height she stands on.
  const [PX, PZ] = [-0.95, -0.5];
  const P = 0.4;
  add(new CylinderGeometry(1.1, 1.22, P, 7), ROCK, PX, G, PZ, { delay: 0.2, rotation: [0, 0.3, 0] });
  [0, 1, 2, 3, 4, 5].forEach((k) => {
    const a = 0.6 + k * 0.55;
    const size = 0.16 + (k % 3) * 0.05;
    add(new DodecahedronGeometry(size), k % 2 ? ROCK : 0x5a4c48, PX + Math.sin(a) * 1.15, G - 0.03, PZ + Math.cos(a) * 1.15, { delay: 0.25 + k * 0.03, rotation: [k, k * 2, 0] });
  });

  // The city below: little houses square on the grid, one of them out of line.
  const houses: { part: Group; roof: Group; x: number; z: number }[] = [];
  let n = 0;
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 6; j++) {
      const x = -1.35 + i * S;
      const z = -0.45 + j * S;
      if (Math.hypot(x - PX, z - PZ) < 1.45 || Math.abs(x) + Math.abs(z) > 2.75 || Math.abs(x) > 2 || Math.abs(z) > 2) continue;
      if ((i * 5 + j * 3) % 7 === 0) continue;
      const h = 0.2 + ((i * 7 + j * 11) % 5) * 0.08;
      const w = 0.24 + ((i + j) % 3) * 0.03;
      const part = box(w, h, w, WALLS[n % 4], x, G, z, { delay: 0.4 + n * 0.015 });
      decorate(part, new BoxGeometry(0.05, 0.05, 0.01), n % 3 ? 0x16c8ff : 0x9fe8ff, [
        [-w * 0.22, h * 0.6, w / 2 + 0.006],
        [w * 0.22, h * 0.6, w / 2 + 0.006],
      ]);
      const roof = add(new ConeGeometry(w * 0.75, 0.14, 4), ROOF, x, G + h, z, { delay: 0.5 + n * 0.015, rotation: [0, Math.PI / 4, 0] });
      houses.push({ part, roof, x, z });
      n++;
    }
  // The house out of line, pushed back into its square.
  const target = houses.reduce((best, h) => (Math.hypot(h.x - 0.9, h.z - 0.9) < Math.hypot(best.x - 0.9, best.z - 0.9) ? h : best));
  colorOf(target.part).set(0x8a4a7a);
  const dust = [0, 1, 2].map((k) => ball(0.07 - k * 0.015, 0x8a8090, target.x, G, target.z, { delay: 0.9, noInk: true }));
  const mark = box(0.36, 0.008, 0.36, ORANGE, target.x, G + 0.004, target.z, { delay: 0.8, flat: true, noInk: true });

  // Groma on the height: the instrument in her right hand, her left pointing down at the house.
  const theta = 0.45;
  const her = figure(kit, {
    x: PX + 0.1,
    z: PZ + 0.15,
    y: G + P,
    facing: theta,
    height: 2.4,
    skin: 0xd0a080,
    hair: { style: "curly", color: 0x2a1a14 },
    face: { mouth: "neutral", brows: "calm", marks: 0xb07a5a },
    top: { kind: "robe", color: 0xd8d0c0 },
    cape: CLOAK,
    scarf: CLOAK,
    belt: 0x6a4e38,
    shoes: 0x4a3428,
    arms: [
      [-0.62, 1.3, 0.24],
      [0.78, 1.72, 0.5],
    ],
    delay: 1.0,
  });
  const at = her.at;
  ball(0.05, 0xa08850, ...at(-0.28, 1.72, 0.2), { delay: 1.5 });
  const pointer = her.hands[1];
  limb(kit, pointer, [pointer[0] + Math.sin(theta + 1.1) * 0.16, pointer[1] - 0.04, pointer[2] + Math.cos(theta + 1.1) * 0.16], 0.025, 0.02, 0xd0a080, { delay: 1.5 });

  // The groma: a staff, a cross on top, four plumb lines with their bobs.
  const [sx, , sz] = her.hands[0];
  const top = G + P + 3.2;
  cylinder(0.035, 0.04, top - G - P, WOOD, sx, G + P, sz, { delay: 0.9 }, 8);
  const arms = [1.15, 1.15 + Math.PI / 2];
  arms.forEach((a, i) => box(1.05, 0.06, 0.06, WOOD, sx, top - 0.06, sz, { delay: 0.95 + i * 0.03, rotation: [0, a, 0] }));
  ball(0.06, 0xa08850, sx, top - 0.06, sz, { delay: 1.0 });
  const plumbs = [0, 1, 2, 3].map((k) => {
    const a = arms[k % 2] + (k > 1 ? Math.PI : 0);
    const from: Point = [sx + Math.cos(a) * 0.48, top - 0.06, sz - Math.sin(a) * 0.48];
    const length = 0.42 + (k % 2) * 0.16;
    const line = limb(kit, from, [from[0], from[1] - length, from[2]], 0.008, 0.008, 0xd8c8a0, { delay: 1.1 + k * 0.03, noInk: true });
    const bob = add(new ConeGeometry(0.05, 0.14, 6).rotateX(Math.PI), 0x2a2622, from[0], from[1] - length - 0.14, from[2], { delay: 1.15 + k * 0.03 });
    return { from, length, line, bob, phase: k * 1.3 };
  });

  tick((t) => {
    // The plumb bobs swing on their strings.
    plumbs.forEach(({ from, length, line, bob, phase }) => {
      const a = Math.sin(t * 1.4 + phase) * 0.12;
      const b = Math.cos(t * 1.1 + phase) * 0.08;
      const end: Point = [from[0] + Math.sin(a) * length, from[1] - Math.cos(a) * Math.cos(b) * length, from[2] + Math.sin(b) * length];
      line.rotation.set(...aim(from, end).rotation);
      bob.position.set(end[0], end[1] - 0.14, end[2]);
    });
    // The house slides and turns back into its square, then the city cheats again.
    const u = (t * 0.18 + 0.15) % 1;
    const k = Math.min(1, u / 0.7);
    const ease = 1 - (1 - k) * (1 - k);
    const off = 1 - ease;
    const [dx, dz, turn] = [0.24 * off, -0.2 * off, 0.55 * off];
    [target.part, target.roof].forEach((part, i) => {
      part.position.x = target.x + dx;
      part.position.z = target.z + dz;
      part.rotation.y = turn + (i ? Math.PI / 4 : 0);
    });
    dust.forEach((puff, i) => {
      puff.position.set(target.x + dx * (1.4 + i * 0.4) + 0.12, G, target.z + dz * (1.4 + i * 0.4) - 0.1);
      puff.visible = off > 0.08;
    });
    mark.visible = off > 0.02 || Math.floor(t * 3) % 2 === 0;
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
