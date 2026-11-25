import { BoxGeometry, ConeGeometry, Group } from "three";
import { CYAN, INK, MAGENTA, aim, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, flame, floor, rubble } from "@/lib/diorama-props";

/**
 * Torrione (P263): the squire of the Gola holding the passage of the temple. Before the dark
 * arch of the crypts he stands planted in his crimson quilted coat, a spear low in his fist and a
 * slab of stone for a shield, already bristling with arrows; now and then another one thuds into
 * it and the slab shudders. He has never learnt to step back: the floor is cracked under his
 * boots, the torch flickers on the wall.
 */
export function torrione(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const STONE = 0x3e4660;
  const SLAB = 0x6a7a94;
  const WOOD = 0x5e4a3a;
  const STEEL = 0x9aa4b4;
  const LEATHER = 0x4a3020;
  const F = octagonBase(kit, 0x1e1d28);
  const G = floor(kit, F, 0.06, 0x34303e, 0x24202c, 0.5);

  // The passage: a temple arch into the dark, two columns, a torch on the wall.
  const wall = add(archedWall(3.2, 2.9, 0.45, { x: 0, half: 0.62, spring: 1.3 }), STONE, 0, G, -1.3, { delay: 0.1, ink: 1.02 });
  add(archMouth(0.62, 1.3), 0x0a0810, 0, G, -1.42, { delay: 0.14, flat: true, noInk: true });
  const joint = 0x2a3044;
  [0.55, 1.1, 1.65].forEach((y) =>
    decorate(wall, new BoxGeometry(0.96, 0.02, 0.01), joint, [
      [-1.1, y, 0.23],
      [1.1, y, 0.23],
    ]),
  );
  decorate(wall, new BoxGeometry(3.2, 0.02, 0.01), joint, [
    [0, 2.2, 0.23],
    [0, 2.65, 0.23],
  ]);
  [-1.15, 1.15].forEach((x, i) => column(kit, x, -0.95, G, 0.2 + i * 0.05, 2.6, false, 0x5a6a84));
  box(0.05, 0.05, 0.25, 0x23222b, 0.72, G + 1.6, -0.95, { delay: 0.4 });
  cylinder(0.045, 0.03, 0.3, WOOD, 0.72, G + 1.5, -0.84, { delay: 0.42 }, 8);
  const torch = flame(kit, 0.72, -0.84, G + 1.8, 0.46, 0.7);
  rubble(kit, -0.4, -0.65, G, 0.5, 6, 0.5);
  motes(8, 0xb8c0d8, 0.02, [-0.6, G + 0.2, -1.2], [0.6, G + 2.2, -0.8], 0.8);

  // Torrione, planted: feet sunk a little into the floor, which cracks round them.
  const X = -0.4;
  const Z = 0.3;
  const FACE = 0.3;
  const c = Math.cos(FACE);
  const s = Math.sin(FACE);
  const at = (lx: number, ly: number, lz: number): Point => [X + lx * c + lz * s, G + ly, Z - lx * s + lz * c];
  const butt: Point = [-0.8, 1.9, -0.55];
  const tip: Point = [-0.45, 0.3, 0.95];
  const grip: Point = [butt[0] + (tip[0] - butt[0]) * 0.38, butt[1] + (tip[1] - butt[1]) * 0.38, butt[2] + (tip[2] - butt[2]) * 0.38];
  const squire = figure(kit, {
    x: X,
    z: Z,
    y: G - 0.03,
    facing: FACE,
    height: 2.5,
    build: "broad",
    skin: 0xc8946a,
    hair: { style: "curly", color: 0x2a1e1c },
    face: { mouth: "frown", brows: "angry", beard: "full", beardColor: 0x3a2a22 },
    top: { kind: "coat", color: 0x8a1f45, accent: 0x5a1430 },
    bottom: { kind: "trousers", color: 0x3a3040 },
    shoes: 0x2a2226,
    belt: LEATHER,
    arms: [grip, [0.5, 1.3, 0.38]],
    legs: "wide",
    delay: 0.8,
  });
  // The buckled straps across his coat.
  [1.62, 1.45, 1.28].forEach((y, i) => {
    const strap = box(0.24, 0.045, 0.02, LEATHER, ...squire.at(0.02, y, 0.3 + (y - 1.12) * 0.1), { delay: 1.3 + i * 0.03, rotation: [0, FACE, 0] });
    decorate(strap, new BoxGeometry(0.05, 0.055, 0.01), 0xc8a040, [[0.04, 0.0, 0.012]]);
  });
  [
    [0.9, 0.5],
    [-0.4, 0.55],
    [2.2, 0.45],
    [-2.4, 0.4],
    [1.5, 0.35],
  ].forEach(([angle, length], i) => {
    const foot = at(i % 2 ? -0.33 : 0.33, 0, 0);
    box(length, 0.006, 0.02, INK, foot[0] + Math.cos(angle) * length * 0.5, G, foot[2] - Math.sin(angle) * length * 0.5, { delay: 0.9 + i * 0.03, flat: true, noInk: true, rotation: [0, angle, 0] });
  });

  // The spear, low in his right fist.
  const [b, t] = [at(...butt), at(...tip)];
  limb(kit, b, t, 0.03, 0.03, WOOD, { delay: 1.4 });
  const dir = aim(b, t);
  const head: Point = [t[0] + (t[0] - b[0]) * (0.36 / dir.length), t[1] + (t[1] - b[1]) * (0.36 / dir.length), t[2] + (t[2] - b[2]) * (0.36 / dir.length)];
  add(new ConeGeometry(0.07, 0.36, 4), STEEL, ...t, { delay: 1.45, rotation: aim(t, head).rotation });
  cylinder(0.04, 0.04, 0.08, STEEL, ...t, { delay: 1.46, rotation: dir.rotation }, 8);

  // The slab of stone he uses as a shield, in his left hand, with the arrows it has caught.
  const SY = FACE - 0.15;
  const base = at(0.62, 0, 0.62);
  const sc = Math.cos(SY);
  const ss = Math.sin(SY);
  const onShield = (sx: number, sy: number, sz: number): Point => [base[0] + sx * sc + sz * ss, G + sy, base[2] - sx * ss + sz * sc];
  const shield = box(0.92, 1.78, 0.22, SLAB, ...base, { delay: 1.2, rotation: [0, SY, 0] });
  decorate(shield, new BoxGeometry(0.72, 1.56, 0.01), 0x5d6c86, [[0, 0.9, 0.112]]);
  decorate(shield, new BoxGeometry(0.018, 0.5, 0.01), INK, [
    [0.15, 1.15, 0.12, 0.5],
    [0.05, 0.8, 0.12, -0.3],
    [-0.2, 0.5, 0.12, 0.2],
    [0.25, 1.5, 0.12, -0.6],
  ]);
  const out = [0.8, 0.2, 0.56];
  const arrow = (from: Point, length: number, delay: number) => {
    const shaft = limb(kit, from, [from[0] + out[0] * length, from[1] + out[1] * length, from[2] + out[2] * length], 0.02, 0.02, WOOD, { delay });
    decorate(shaft, new BoxGeometry(0.1, 0.16, 0.006), MAGENTA, [[0, length - 0.1, 0]]);
    decorate(shaft, new BoxGeometry(0.006, 0.16, 0.1), CYAN, [[0, length - 0.1, 0]]);
    return shaft;
  };
  const stuck = [
    [0.2, 1.45],
    [-0.18, 1.1],
    [0.12, 0.75],
    [-0.22, 1.55],
  ].map(([sx, sy], i) => arrow(onShield(sx, sy, 0.1), 0.6, 1.6 + i * 0.05));
  const rig = new Group();
  rig.position.set(...base);
  shield.parent?.add(rig);
  [shield, ...stuck].forEach((part) => {
    part.position.sub(rig.position);
    rig.add(part);
  });
  // Broken arrows at his feet.
  [
    [0.2, 1.1, 0.4],
    [0.7, 1.3, -0.8],
    [-0.5, 1.2, 1.9],
  ].forEach(([x, z, turn], i) => box(0.3, 0.025, 0.025, WOOD, x, G, z, { delay: 0.9 + i * 0.04, rotation: [0, turn, 0] }));

  // One more arrow, flying in and thudding into the slab.
  const hit = onShield(-0.02, 1.25, 0.02);
  const flyer = arrow(hit, 0.68, 1.8);
  const wind = 1.8;
  const torchRest = torch.map((part) => part.children.map((mesh) => mesh.scale.y));
  tick((time) => {
    const u = (time / 3.2 + 0.5) % 1;
    const k = u < 0.15 ? 1 - u / 0.15 : 0;
    flyer.position.set(hit[0] + out[0] * wind * k, hit[1] + out[1] * wind * k, hit[2] + out[2] * wind * k);
    flyer.visible = u < 0.85;
    rig.rotation.z = u > 0.15 && u < 0.27 ? Math.sin((u - 0.15) * 160) * 0.02 : 0;
    torch.forEach((part, i) => part.children.forEach((mesh, k) => (mesh.scale.y = torchRest[i][k] * (1 + 0.18 * Math.sin(time * (11 + i * 5))))));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
