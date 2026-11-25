import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, ORANGE, YELLOW, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { shade } from "@/lib/diorama-figure";
import { barrel, facade, floor, railing, rubble } from "@/lib/diorama-props";

/**
 * Mantice (P277): the forge automaton of Nomina, sold to the Compagnia Lete, at work in the
 * Lete foundry: a riveted iron giant with a furnace in its chest and bellows for lungs on its
 * shoulders, hammering a white-hot bar on the anvil while its tongs hold it. Every breath
 * swells the bellows and brightens the fire; every blow throws sparks. It could never sneak
 * up on anyone: smoke pours from the chimney on its head.
 */
export function mantice(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const IRON = 0x3a4458;
  const IRON_DARK = 0x262c3a;
  const BRASS = 0x9a7a3a;
  const HIDE = 0x5a3a2e;
  const F = octagonBase(kit, 0x1b1a24);
  const G = floor(kit, F, 0.06, 0x2a2a34, 0x1a1a22, 0.6);

  // The foundry: a wall of tall cyan windows, a gangway, a pipe, a quench barrel and coal.
  facade(kit, 0, -1.75, G, 0.1, { width: 3.0, height: 3.3, color: 0x2a2840, windows: 4, floors: 3, lit: CYAN, shutters: 0x2a2840 });
  box(3.0, 0.06, 0.4, IRON_DARK, 0, G + 2.4, -1.4, { delay: 0.2 });
  railing(kit, [-1.5, -1.22], [1.5, -1.22], G + 2.46, 0.24, 0.35, 0x4a4f5c);
  [-1.45, 1.45].forEach((x) => box(0.08, 2.4, 0.08, IRON_DARK, x, G, -1.25, { delay: 0.22, noInk: true }));
  const pipe = cylinder(0.12, 0.12, 2.9, 0x4a5468, -1.25, G, -1.05, { delay: 0.25 }, 12);
  decorate(pipe, new TorusGeometry(0.125, 0.02, 6, 16).rotateX(Math.PI / 2), 0xff2e6c, [
    [0, 0.6, 0],
    [0, 1.8, 0],
  ]);
  barrel(kit, 1.5, 0.75, G, 0.3, 0x2f5a6a);
  cylinder(0.18, 0.18, 0.02, 0x0e3a4e, 1.5, G + 0.48, 0.75, { delay: 0.35, flat: true, noInk: true }, 14);
  motes(6, 0xe8eef2, 0.03, [1.38, G + 0.5, 0.65], [1.62, G + 1.3, 0.85], 0.8);
  rubble(kit, -1.45, 0.6, G, 0.35, 7, 0.35, 0x24242c);

  // The automaton, built in its own frame (x to its left, z forward), facing the camera.
  const X = -0.15;
  const Z = -0.2;
  const facing = 0.3;
  const [c, s] = [Math.cos(facing), Math.sin(facing)];
  const m = (x: number, y: number, z: number): Point => [X + x * c + z * s, G + y, Z - x * s + z * c];
  const rot: [number, number, number] = [0, facing, 0];
  const o = (delay: number) => ({ delay, rotation: rot });
  [-1, 1].forEach((side) => {
    box(0.42, 0.2, 0.56, IRON_DARK, ...m(side * 0.36, 0, 0.08), o(0.5));
    const leg = cylinder(0.19, 0.22, 0.6, IRON, ...m(side * 0.36, 0.2, 0), o(0.55));
    decorate(leg, new TorusGeometry(0.2, 0.025, 6, 16).rotateX(Math.PI / 2), IRON_DARK, [[0, 0.3, 0]]);
  });
  add(new CylinderGeometry(0.5, 0.48, 0.24, 18).scale(1, 1, 0.8), IRON_DARK, ...m(0, 0.76, 0), o(0.6));
  const torso = add(new CylinderGeometry(0.64, 0.52, 1.12, 20).scale(1, 1, 0.8), IRON, ...m(0, 0.92, 0), o(0.65));
  const rivets: Point[] = [];
  [0.12, 1.02].forEach((y) => [-1.2, -0.8, -0.4, 0.4, 0.8, 1.2].forEach((a) => rivets.push([Math.sin(a) * (0.53 + y * 0.1), y, Math.cos(a) * (0.53 + y * 0.1) * 0.8])));
  decorate(torso, new SphereGeometry(0.025, 6, 4), 0x5a6478, rivets);
  decorate(torso, new BoxGeometry(0.56, 0.5, 0.06), IRON_DARK, [[0, 0.56, 0.47]]);
  const fire = decorate(torso, new BoxGeometry(0.42, 0.36, 0.02), ORANGE, [[0, 0.56, 0.5]]);
  decorate(torso, new BoxGeometry(0.035, 0.12, 0.03), INK, [-0.14, -0.07, 0, 0.07, 0.14].map((x) => [x, 0.44, 0.515] as Point));
  // The head: an iron kettle with a lid, goggle eyes glowing, a little chimney.
  cylinder(0.14, 0.16, 0.14, IRON_DARK, ...m(0, 2.02, 0), o(0.8));
  const skull = add(new CylinderGeometry(0.28, 0.3, 0.34, 18), IRON, ...m(0, 2.12, 0.02), o(0.85));
  decorate(skull, new TorusGeometry(0.085, 0.022, 6, 16), BRASS, [
    [-0.12, 0.2, 0.29],
    [0.12, 0.2, 0.29],
  ]);
  const eyes = decorate(skull, new CylinderGeometry(0.075, 0.075, 0.02, 14).rotateX(Math.PI / 2), ORANGE, [
    [-0.12, 0.2, 0.285],
    [0.12, 0.2, 0.285],
  ]);
  decorate(skull, new BoxGeometry(0.012, 0.13, 0.012), INK, [-0.15, -0.12, -0.09, 0.09, 0.12, 0.15].map((x) => [x, 0.2, 0.3] as Point));
  add(new SphereGeometry(0.28, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), IRON, ...m(0, 2.46, 0.02), o(0.9));
  cylinder(0.3, 0.3, 0.04, IRON_DARK, ...m(0, 2.44, 0.02), o(0.92));
  cylinder(0.05, 0.06, 0.22, IRON_DARK, ...m(0, 2.68, 0.02), o(0.95));
  motes(14, 0x4a3a5a, 0.07, [X - 0.12, G + 2.9, Z - 0.1], [X + 0.25, G + 4.1, Z + 0.15], 1.2);

  // The bellows on its shoulders: leather pleats between iron plates, breathing.
  const pleats: { part: Group; side: number; k: number; r: number }[] = [];
  const AXIS_Y = 2.0;
  [-1, 1].forEach((side) =>
    [0.31, 0.26, 0.31, 0.26, 0.31, 0.26, 0.33].forEach((r, k) =>
      pleats.push({
        part: add(new CylinderGeometry(r, r, k === 6 ? 0.05 : 0.07, 16).rotateZ(Math.PI / 2), k === 6 ? IRON_DARK : k % 2 ? shade(HIDE, 0.75) : HIDE, ...m(side * (0.55 + k * 0.08), AXIS_Y - r, -0.04), o(0.7 + k * 0.03)),
        side,
        k,
        r,
      }),
    ),
  );

  // The anvil, and the bar glowing on it.
  box(0.46, 0.22, 0.48, IRON_DARK, ...m(0.05, 0, 0.82), o(0.4));
  box(0.28, 0.32, 0.28, IRON_DARK, ...m(0.05, 0.22, 0.82), o(0.42));
  box(0.78, 0.18, 0.34, 0x30364a, ...m(0.02, 0.54, 0.82), o(0.44));
  add(new ConeGeometry(0.09, 0.32, 10).rotateZ(Math.PI / 2), 0x30364a, ...m(0.56, 0.6, 0.82), o(0.46));
  const bar = box(0.6, 0.06, 0.08, YELLOW, ...m(-0.05, 0.72, 0.82), { ...o(1.2), flat: true });

  // Left arm: the tongs gripping the bar's end.
  const L: Point[] = [m(0.72, 1.62, 0.02), m(0.86, 1.15, 0.28), m(0.55, 0.95, 0.62)];
  ball(0.17, IRON, ...below(L[0], 0.17), { delay: 1.0 });
  limb(kit, L[0], L[1], 0.15, 0.13, IRON, { delay: 1.02 });
  ball(0.13, IRON_DARK, ...below(L[1], 0.13), { delay: 1.04 });
  limb(kit, L[1], L[2], 0.13, 0.12, IRON, { delay: 1.06 });
  box(0.2, 0.18, 0.2, IRON_DARK, ...below(L[2], 0.09), o(1.08));
  [-0.025, 0.025].forEach((dy) => limb(kit, [L[2][0], L[2][1] + dy, L[2][2]], m(0.2, 0.78 + dy, 0.82), 0.018, 0.015, 0x5a5e6a, { delay: 1.1, noInk: true }));

  // Right arm and hammer, swinging from the shoulder.
  const S = new Vector3(...m(-0.72, 1.62, 0.02));
  const R: Point[] = [m(-0.72, 1.62, 0.02), m(-0.92, 1.2, 0.3), m(-0.5, 1.1, 0.5)];
  const swing: Group[] = [ball(0.17, IRON, ...below(R[0], 0.17), { delay: 1.0 })];
  swing.push(limb(kit, R[0], R[1], 0.15, 0.13, IRON, { delay: 1.02 }));
  swing.push(ball(0.13, IRON_DARK, ...below(R[1], 0.13), { delay: 1.04 }));
  swing.push(limb(kit, R[1], R[2], 0.13, 0.12, IRON, { delay: 1.06 }));
  swing.push(box(0.2, 0.18, 0.2, IRON_DARK, ...below(R[2], 0.09), o(1.08)));
  const top = m(-0.06, 0.94, 0.8);
  swing.push(limb(kit, R[2], top, 0.035, 0.035, 0x5e4a3a, { delay: 1.1 }));
  swing.push(box(0.22, 0.32, 0.24, IRON_DARK, top[0], G + 0.78, top[2], o(1.14)));
  const arm = new Group();
  torso.parent?.add(arm);
  arm.position.copy(S);
  swing.forEach((part) => {
    part.position.sub(S);
    arm.add(part);
  });
  const axis = new Vector3(c, 0, -s);

  // Sparks off the bar at every blow.
  const hit = m(-0.05, 0.8, 0.82);
  const sparks = Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2;
    const v = new Vector3(Math.cos(a) * (0.9 + (k % 3) * 0.4), 1.4 + (k % 4) * 0.45, Math.sin(a) * (0.9 + (k % 2) * 0.5));
    return { part: box(0.065, 0.065, 0.065, k % 2 ? YELLOW : ORANGE, ...hit, { delay: 1.3, flat: true, noInk: true }), v };
  });

  const cool = new Color(ORANGE);
  const hot = new Color(YELLOW);
  tick((t) => {
    const u = (t / 1.6 + 0.12) % 1;
    const raise = u < 0.7 ? Math.sin((u / 0.7) * (Math.PI / 2)) : Math.cos(((u - 0.7) / 0.3) * (Math.PI / 2));
    arm.quaternion.setFromAxisAngle(axis, -1.1 * raise);
    const since = u * 1.6;
    sparks.forEach(({ part, v }) => {
      part.visible = since < 0.55;
      part.position.set(hit[0] + v.x * since, hit[1] + v.y * since - 4 * since * since, hit[2] + v.z * since);
    });
    // A breath every two blows: the bellows swell, the fire and the eyes flare.
    const breath = (Math.sin((t / 3.2) * Math.PI * 2) + 1) / 2;
    pleats.forEach(({ part, side, k, r }) => part.position.set(...m(side * (0.55 + k * (0.07 + 0.025 * breath)), AXIS_Y - r, -0.04)));
    fire.color.lerpColors(cool, hot, breath);
    eyes.color.lerpColors(cool, hot, breath * 0.7);
    colorOf(bar).lerpColors(new Color(0xfff6d0), hot, Math.min(1, u * 2));
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}

function below(p: Point, radius: number): Point {
  return [p[0], p[1] - radius, p[2]];
}
