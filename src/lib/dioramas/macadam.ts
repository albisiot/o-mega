import { BoxGeometry, CylinderGeometry, Euler, SphereGeometry, Vector3, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle } from "@/lib/diorama-props";

/**
 * Macadam (P007): the Custodi's driver next to their armoured van, hood up and engine smoking,
 * the huge wrench on his shoulder, fixing it the only way he knows: a side kick to the front.
 * Sparks fly, the van jolts, the headlights come back on and the light bar flashes.
 */
export function macadam(kit: Kit): Framing {
  const { add, box, decorate, tick, motes } = kit;
  const VAN = 0x2e5a6e;
  const VAN_DARK = 0x1f3e4e;
  const STEEL = 0x4a4f5c;
  const DARK = 0x16171e;
  const COVERALL = 0x2f5f78;
  const F = octagonBase(kit, 0x1e2430);
  const G = floor(kit, F, 0.06, 0x2a3040, 0x1c2230, 0.55);

  // The armoured van, side-on, its front to the right; parts are placed in its own frame (front +z).
  const VF = Math.PI / 2;
  const VX = -0.5;
  const VZ = 0;
  const on = (dx: number, dy: number, dz: number): Point => [VX + dz, G + dy, VZ - dx];
  const turn: [number, number, number] = [0, VF, 0];
  const van: Group[] = [box(1.2, 0.72, 1.7, VAN, ...on(0, 0.2, -0.85), { delay: 0.1, rotation: turn }), box(1.16, 0.66, 1.1, VAN, ...on(0, 0.92, -1.15), { delay: 0.16, rotation: turn })];
  const [body, cabin] = van;
  decorate(body, new BoxGeometry(0.62, 0.26, 0.01), DARK, [[0, 0.4, 0.851]]);
  decorate(body, new BoxGeometry(0.62, 0.025, 0.01), STEEL, [
    [0, 0.33, 0.858],
    [0, 0.4, 0.858],
    [0, 0.47, 0.858],
  ]);
  decorate(body, new BoxGeometry(0.01, 0.1, 1.7), MAGENTA, [
    [0.601, 0.5, 0],
    [-0.601, 0.5, 0],
  ]);
  decorate(body, new BoxGeometry(0.03, 0.03, 0.01), INK, [
    [0.602, 0.2, 0.4],
    [0.602, 0.2, -0.1],
    [0.602, 0.2, -0.6],
  ]);
  decorate(cabin, new BoxGeometry(0.98, 0.3, 0.01), 0x14303e, [[0, 0.38, 0.551]]);
  decorate(cabin, new BoxGeometry(0.01, 0.26, 0.4), 0x14303e, [
    [0.581, 0.4, 0.25],
    [-0.581, 0.4, 0.25],
  ]);
  const lights = [-0.42, 0.42].map((dx) => box(0.2, 0.12, 0.03, YELLOW, ...on(dx, 0.66, 0.02), { delay: 0.3, flat: true, rotation: turn }));
  const bar = [MAGENTA, CYAN].map((color, i) => box(0.32, 0.09, 0.16, color, ...on(i ? 0.17 : -0.17, 1.58, -0.95), { delay: 0.34 + i * 0.02, flat: true, rotation: turn }));
  // The bull bar, the wheels, the open hood over the engine.
  van.push(box(1.3, 0.08, 0.08, STEEL, ...on(0, 0.34, 0.05), { delay: 0.22, rotation: turn }));
  [-0.45, 0.45].forEach((dx) => van.push(box(0.08, 0.36, 0.08, STEEL, ...on(dx, 0.12, 0.05), { delay: 0.24, rotation: turn })));
  [-0.35, -1.35].forEach((dz) => [-1, 1].forEach((s) => van.push(add(new CylinderGeometry(0.24, 0.24, 0.16, 14).rotateZ(Math.PI / 2), DARK, ...on(s * 0.58, 0, dz), { delay: 0.2, rotation: turn }))));
  const hood = add(new BoxGeometry(1.12, 0.05, 0.64).translate(0, 0, 0.32), VAN, ...on(0, 0.9, -0.6), { delay: 0.5 });
  hood.rotation.order = "YXZ";
  hood.rotation.set(-1.15, VF, 0);
  decorate(hood, new BoxGeometry(0.5, 0.06, 0.06), VAN_DARK, [[0, 0.03, 0.62]]);
  van.push(box(1.04, 0.02, 0.56, DARK, ...on(0, 0.92, -0.32), { delay: 0.26, flat: true, noInk: true, rotation: turn }));
  const engine = box(0.52, 0.22, 0.34, STEEL, ...on(0, 0.92, -0.32), { delay: 0.4, rotation: turn });
  decorate(engine, new BoxGeometry(0.06, 0.06, 0.36), CYAN, [
    [-0.15, 0.25, 0],
    [0, 0.25, 0],
    [0.15, 0.25, 0],
  ]);
  van.push(engine, ...lights, ...bar);
  motes(12, 0x8a93a3, 0.06, [VX - 0.5, G + 1.1, VZ - 0.3], [VX - 0.2, G + 3.0, VZ + 0.3], 1.2);

  // His toolbox open on the ground and a puddle of oil.
  const tools = box(0.5, 0.24, 0.26, MAGENTA, 1.4, G, -0.45, { delay: 0.55, rotation: [0, -0.4, 0] });
  decorate(tools, new BoxGeometry(0.5, 0.03, 0.27), INK, [[0, 0.17, 0]]);
  box(0.3, 0.04, 0.05, STEEL, 1.35, G + 0.24, -0.48, { delay: 0.6, rotation: [0, -0.4, 0.3] });
  puddle(kit, -0.2, 1.1, G, 0.6, 0.4, CYAN);

  // Macadam: bandana, stubble, blue coveralls with the sleeves rolled, wrench on his shoulder.
  const H = 2.45;
  const u = H / 2.4;
  const FACE = 0.3;
  const mechanic = figure(kit, {
    x: 0.45,
    z: 0.05,
    y: G,
    facing: FACE,
    height: H,
    build: "broad",
    skin: 0xd8a07a,
    hair: { style: "short", color: 0x2a1e1a },
    face: { mouth: "smirk", brows: "calm", beard: "stubble", beardColor: 0x3a2a22 },
    top: { kind: "uniform", color: COVERALL, accent: 0x9fb8c8, sleeves: "short" },
    bottom: { kind: "trousers", color: COVERALL },
    belt: 0x1a1a1a,
    shoes: 0x2a2018,
    arms: [[-0.18, 1.5, 0.38], "hip"],
    delay: 0.8,
  });
  // His right leg is raised in a side kick at the van's front: the standing one is hidden.
  mechanic.parts.slice(0, 3).forEach((part) => (part.visible = false));
  const RL = 0.13 * u;
  const hip = mechanic.at(-0.17 * u, 1.08 * u, 0);
  const knee = mechanic.at(-0.55 * u, 0.82 * u, 0.1 * u);
  const foot = mechanic.at(-0.88 * u, 0.5 * u, 0.12 * u);
  limb(kit, hip, knee, RL * 1.25, RL * 1.12, COVERALL, { delay: 0.82 });
  limb(kit, knee, foot, RL * 1.08, RL * 0.95, COVERALL, { delay: 0.84 });
  box(0.16, 0.3, 0.22, 0x2a2018, ...foot, { delay: 0.86, rotation: aim(knee, foot).rotation });
  // His bandana, tied low over the forehead, the knot's tails behind.
  const [hx, hy, hz] = mechanic.head;
  const R = mechanic.headRadius;
  add(new SphereGeometry(R * 1.12, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), 0x2f6a8a, hx, hy + 0.1, hz - 0.01, { delay: 1.3, rotation: [0.12, FACE, 0] });
  [-0.3, 0.3].forEach((lean, i) => box(0.08, 0.18, 0.03, 0x2f6a8a, ...mechanic.at(i * 0.06 - 0.03, 2.02, -0.27), { delay: 1.35, rotation: [0.3, FACE, lean] }));
  // The wrench: handle from his fist over his right shoulder, the jaw behind it.
  const grip = mechanic.hands[0];
  const end = mechanic.at(-0.55, 2.3, -0.32);
  limb(kit, grip, end, 0.045, 0.045, STEEL, { delay: 1.4 });
  const { rotation } = aim(grip, end);
  const along = new Vector3(...end).sub(new Vector3(...grip)).normalize();
  const across = new Vector3(1, 0, 0).applyEuler(new Euler(...rotation));
  box(0.32, 0.14, 0.1, STEEL, ...end, { delay: 1.45, rotation });
  [-1, 1].forEach((s) => {
    const prong = new Vector3(...end).addScaledVector(along, 0.13).addScaledVector(across, s * 0.11);
    box(0.08, 0.16, 0.1, STEEL, prong.x, prong.y, prong.z, { delay: 1.5, rotation });
  });

  // Sparks where his boot meets the van.
  const hit: Point = [VX + 0.08, foot[1] + 0.05, foot[2]];
  const sparks = [0, 1, 2, 3, 4].map((k) => {
    const a = (k / 5) * Math.PI * 2 + 0.3;
    return zigzag(kit, [hit, [hit[0] + 0.05, hit[1] + Math.sin(a) * 0.3, hit[2] + Math.cos(a) * 0.3]], 0.03, YELLOW, 1.6 + k * 0.02)[0];
  });

  const rest = van.map((part) => part.position.y);
  const hoodRest = hood.position.y;
  tick((t) => {
    // A kick every three seconds: sparks, a jolt, the headlights catch; between kicks they splutter.
    const k = (t / 3) % 1;
    sparks.forEach((spark) => (spark.visible = k < 0.12));
    const jolt = k < 0.15 ? Math.abs(Math.sin(k * 60)) * 0.03 * (1 - k / 0.15) : 0;
    van.forEach((part, i) => (part.position.y = rest[i] + jolt));
    hood.position.y = hoodRest + jolt;
    hood.rotation.x = -1.15 - jolt * 2;
    const lit = k < 0.6 || Math.floor(t * 9) % 3 !== 0;
    lights.forEach((light) => (light.visible = lit));
    const flash = Math.floor(t * 4) % 2 === 0;
    bar[0].visible = flash;
    bar[1].visible = !flash || k < 0.05;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
