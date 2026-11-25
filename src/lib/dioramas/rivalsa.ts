import { BoxGeometry, ConeGeometry, DodecahedronGeometry, OctahedronGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, floor, puddle } from "@/lib/diorama-props";

/**
 * Rivalsa (P243): the saboteur on the quay of the imperial fuel depot at night. Her moon hangs
 * in the sky broken open, its pieces drifting; she pays the empire back one depot at a time:
 * the first tank is already a gutted, smoking shell, a charge blinks on the big one behind her,
 * and she holds up the next stick of dynamite, its fuse spitting sparks, the satchel on her hip
 * full of them. No powers, no tricks: a scarf, a fuse and a grudge.
 */
export function rivalsa(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const TANK = 0x4a5068;
  const DARK = 0x23222b;
  const SOOT = 0x2a2630;
  const STICK = 0xb0402a;
  const F = octagonBase(kit, 0x1f2230);
  const G = floor(kit, F, 0.06, 0x2e3340, 0x20232e, 0.5);

  // The big tank, next on her list: bands, a railing on top, warning lights and her charge.
  const TX = 0.95;
  const TZ = -0.95;
  const tank = cylinder(0.85, 0.85, 2.0, TANK, TX, G, TZ, { delay: 0.1 }, 24);
  decorate(tank, new TorusGeometry(0.855, 0.02, 4, 32).rotateX(Math.PI / 2), 0x363b52, [
    [0, 0.5, 0],
    [0, 1.0, 0],
    [0, 1.5, 0],
  ]);
  cylinder(0.75, 0.86, 0.18, 0x3c4258, TX, G + 2.0, TZ, { delay: 0.16 }, 24);
  add(new TorusGeometry(0.82, 0.015, 4, 32).rotateX(Math.PI / 2), DARK, TX, G + 2.42, TZ, { delay: 0.2, noInk: true });
  [0, 1, 2, 3, 4, 5].forEach((k) => {
    const a = (k / 6) * Math.PI * 2;
    box(0.02, 0.24, 0.02, DARK, TX + Math.sin(a) * 0.82, G + 2.18, TZ + Math.cos(a) * 0.82, { delay: 0.2, noInk: true });
  });
  const warnings = [-0.6, 0.6].map((a, i) => ball(0.05, MAGENTA, TX + Math.sin(a) * 0.7, G + 2.16, TZ + Math.cos(a) * 0.7, { delay: 0.24 + i * 0.02, flat: true }));
  // The charge: three sticks taped to the tank, a timer and its blinking light.
  const face = 0.35;
  const at = (r: number): [number, number] => [TX + Math.sin(face) * r, TZ + Math.cos(face) * r];
  const [cx, cz] = at(0.88);
  [-0.07, 0, 0.07].forEach((dx, i) => cylinder(0.035, 0.035, 0.32, STICK, cx + dx * Math.cos(face), G + 0.7, cz - dx * Math.sin(face), { delay: 0.3 + i * 0.02 }, 8));
  const [tx, tz] = at(0.94);
  const timer = box(0.16, 0.1, 0.06, DARK, tx, G + 0.8, tz, { delay: 0.36, rotation: [0, face, 0] });
  decorate(timer, new BoxGeometry(0.1, 0.04, 0.01), CYAN, [[0, 0.05, 0.031]]);
  const blink = ball(0.03, MAGENTA, tx, G + 0.91, tz, { delay: 0.38, flat: true });

  // The first depot: a gutted, scorched shell with a jagged rim, still smoking.
  const WX = -1.5;
  const WZ = -0.7;
  cylinder(0.55, 0.57, 0.95, SOOT, WX, G, WZ, { delay: 0.12 }, 18);
  [0, 1, 2, 3, 4, 5, 6, 7].forEach((k) => {
    const a = (k / 8) * Math.PI * 2;
    add(new ConeGeometry(0.12, 0.22 + (k % 3) * 0.12, 4), SOOT, WX + Math.sin(a) * 0.47, G + 0.9, WZ + Math.cos(a) * 0.47, { delay: 0.18 + k * 0.02, rotation: [Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3] });
  });
  cylinder(0.46, 0.46, 0.02, 0x6a2410, WX, G + 0.9, WZ, { delay: 0.2, flat: true, noInk: true }, 18);
  [
    [0.2, 0.65],
    [0.55, 0.45],
    [0.45, 0.8],
  ].forEach(([dx, dz], i) => add(new DodecahedronGeometry(0.08 + i * 0.02), SOOT, WX + dx, G - 0.02, WZ + dz, { delay: 0.22 + i * 0.03, rotation: [i, i * 2, 0] }));
  motes(12, 0x6a6a7a, 0.05, [WX - 0.3, G + 1.0, WZ - 0.3], [WX + 0.3, G + 3.0, WZ + 0.3], 0.6);

  // Her moon, broken open in the sky, and its pieces drifting away.
  add(new SphereGeometry(0.4, 18, 14, 0.4, Math.PI * 2 - 1.3), 0xcfe6f0, -0.85, G + 2.6, -1.65, { delay: 0.3, rotation: [0.2, 1.05, 0.2] });
  const SHARDS = [3.05, 3.35, 2.8];
  const shards = [
    [-1.3, -1.2, 0.09],
    [-1.1, -1.05, 0.06],
    [-1.5, -1.35, 0.05],
  ].map(([x, z, r], i) => add(new DodecahedronGeometry(r), 0xcfe6f0, x, G + SHARDS[i], z, { delay: 0.4 + i * 0.04 }));

  // The quay: a bollard and a puddle catching the warning lights.
  bollard(kit, 1.65, 0.75, G, 0.3);
  puddle(kit, 0.7, 1.1, G, 0.3, 0.42, MAGENTA);

  // Rivalsa, the lit stick held high, her free hand on the satchel.
  const saboteur = figure(kit, {
    x: -0.35,
    z: 0.6,
    y: G,
    facing: 0.3,
    height: 2.35,
    skin: 0x6a4030,
    hair: { style: "curly", color: 0x1a1418 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "jacket", color: 0x2f4a48, accent: 0x3a5856 },
    bottom: { kind: "trousers", color: 0x2a4240 },
    shoes: 0x2a2622,
    belt: 0x3a3428,
    gloves: 0x3a3a40,
    scarf: 0x8a8f98,
    arms: [[-0.42, 2.3, 0.22], [0.34, 1.12, 0.2]],
    delay: 0.8,
  });
  const s = saboteur.at;
  // A big wrapped scarf, its end hanging down her chest.
  add(new TorusGeometry(0.2, 0.075, 8, 18).rotateX(Math.PI / 2), 0x8a8f98, ...s(0, 1.62, 0.03), { delay: 1.3, rotation: [0, 0.3, 0] });
  box(0.13, 0.5, 0.06, 0x7a7f88, ...s(0.1, 1.15, 0.26), { delay: 1.32, rotation: [0.15, 0.3, -0.1] });
  // The satchel on her left hip, the strap across her chest, sticks poking out of it.
  limb(kit, s(-0.22, 1.68, 0.21), s(0.3, 1.12, 0.27), 0.022, 0.022, 0x4a4436, { delay: 1.34 });
  const bag = box(0.38, 0.32, 0.17, 0x5a5040, ...s(0.4, 0.82, 0.1), { delay: 1.36, rotation: [0, 0.3, 0] });
  decorate(bag, new BoxGeometry(0.38, 0.12, 0.01), 0x4a4234, [[0, 0.26, 0.09]]);
  [-0.12, -0.04, 0.04, 0.12].forEach((dx, i) => cylinder(0.032, 0.032, 0.26, STICK, ...s(0.4 + dx, 1.0 + (i % 2) * 0.04, 0.14), { delay: 1.4 + i * 0.02 }, 8));
  // The stick in her raised hand, the fuse curling up from it, the spark at its tip.
  const [hx, hy, hz] = saboteur.hands[0];
  cylinder(0.045, 0.045, 0.34, STICK, hx, hy - 0.16, hz, { delay: 1.45 }, 10);
  const fuseEnd: Point = [hx + 0.06, hy + 0.32, hz + 0.02];
  limb(kit, [hx, hy + 0.17, hz], fuseEnd, 0.008, 0.008, 0xd8d2c4, { delay: 1.5 });
  const spark = add(new OctahedronGeometry(0.06), YELLOW, fuseEnd[0], fuseEnd[1] - 0.06, fuseEnd[2], { delay: 1.55, flat: true, noInk: true });
  const flare = add(new OctahedronGeometry(0.1), ORANGE, fuseEnd[0], fuseEnd[1] - 0.1, fuseEnd[2], { delay: 1.55, flat: true, noInk: true });
  motes(8, YELLOW, 0.018, [fuseEnd[0] - 0.12, fuseEnd[1], fuseEnd[2] - 0.12], [fuseEnd[0] + 0.12, fuseEnd[1] + 0.35, fuseEnd[2] + 0.12], 1.6);

  tick((t) => {
    const k = Math.sin(t * 31) * 0.5 + 0.5;
    spark.children[0].scale.setScalar(0.8 + k * 0.5);
    flare.children[0].scale.setScalar(1.1 - k * 0.4);
    flare.rotation.y = t * 4;
    // The charge blinks (on at the start), the tank lights breathe in turn.
    blink.visible = Math.floor(t * 2.5) % 2 === 0;
    warnings.forEach((w, i) => (w.visible = Math.floor(t * 1.5 + i) % 3 !== 2));
    shards.forEach((shard, i) => {
      shard.rotation.set(t * (0.4 + i * 0.2), t * 0.3, 0);
      shard.position.y = G + SHARDS[i] + Math.sin(t * 0.8 + i * 2) * 0.05;
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
