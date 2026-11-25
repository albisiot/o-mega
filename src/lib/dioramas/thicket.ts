import { BackSide, BoxGeometry, ConeGeometry, SphereGeometry, type Group, type Material, type Mesh } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { floor, rubble } from "@/lib/diorama-props";

/**
 * Thicket (P231): the fog wood of Vall'Oscura walks, slowly, on a hillside of black pines above
 * the lights of the city: a giant of twisted roots and moss crowned with pale antlers, its long
 * arms hanging to its knees, its feet rooted into the ground it barely leaves. In the hollow of
 * its chest the people it has taken sleep huddled together, and now and then they all speak at
 * once. Banks of fog drift round its legs, its aura breathes pale green, and a lost walker's
 * lantern still glows where it was dropped.
 */
export function thicket(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const BARK = [0x5a4030, 0x6a4a34, 0x4a3628];
  const MOSS = 0x3f6a3a;
  const ANTLER = 0xd8d0c0;
  const PINE = 0x1f3a2c;
  const F = octagonBase(kit, 0x18201c);
  const G = floor(kit, F, 0.06, 0x1e2a22, 0x18221c, 0);
  rubble(kit, -1.3, 1.1, G, 0.1, 5, 0.4, 0x3a4440);
  rubble(kit, 1.5, 0.6, G, 0.12, 4, 0.35, 0x3a4440);

  // The city's lights far below, and the black pines of the wood.
  [
    [0.4, 0.5],
    [0.75, 0.8],
    [1.1, 0.45],
  ].forEach(([x, h], k) => {
    const block = box(0.28, h, 0.05, 0x1e2634, x, G, -1.95, { delay: 0.08 + k * 0.03, ink: 1.02 });
    decorate(block, new BoxGeometry(0.04, 0.04, 0.01), k % 2 ? MAGENTA : CYAN, [
      [-0.06, h * 0.7, 0.03],
      [0.06, h * 0.4, 0.03],
    ]);
  });
  const pine = (x: number, z: number, h: number, delay: number) => {
    cylinder(0.05, 0.07, h * 0.25, 0x3a2a20, x, G, z, { delay }, 6);
    [0, 1, 2].forEach((k) => add(new ConeGeometry(h * (0.3 - k * 0.07), h * 0.42, 8), k % 2 ? PINE : 0x24402f, x, G + h * (0.18 + k * 0.22), z, { delay: delay + 0.04 + k * 0.03 }));
  };
  pine(-1.7, -0.5, 1.7, 0.15);
  pine(-1.15, -1.45, 2.3, 0.18);
  pine(1.45, -1.3, 2.0, 0.2);
  pine(1.85, 0.0, 1.4, 0.22);
  pine(-1.75, 0.75, 1.1, 0.24);

  // Thicket, in its own frame, turned to face the camera.
  const DF = 0.35;
  const Z0 = -0.35;
  const d = (lx: number, ly: number, lz: number): Point => [lx * Math.cos(DF) + lz * Math.sin(DF), G + ly, Z0 - lx * Math.sin(DF) + lz * Math.cos(DF)];
  const ring = (c: Point, r: number, a: number): Point => d(c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r);
  let n = 0;
  const strand = (from: Point, to: Point, r: number) => limb(kit, from, to, r, r * 0.85, BARK[n++ % 3], { delay: 0.5 + n * 0.012 });

  // Legs of three twisted strands each, feet rooted into the ground.
  [-1, 1].forEach((s) => {
    const foot: Point = [s * 0.5, 0, 0.1];
    const knee: Point = [s * 0.44, 0.85, 0.14];
    const hip: Point = [s * 0.3, 1.55, 0];
    [0, 1, 2].forEach((i) => {
      const a = i * 2.09 + s * 0.5;
      strand(ring(foot, 0.12, a), ring(knee, 0.11, a + 1.0), 0.085);
      strand(ring(knee, 0.11, a + 1.0), ring(hip, 0.1, a + 2.0), 0.085);
    });
    [0.4, 1.3, 2.3, 3.4].forEach((a) => strand(d(foot[0], 0.12, foot[2]), d(foot[0] + Math.cos(a + s) * 0.55, 0.01, foot[2] + Math.sin(a + s) * 0.45), 0.05));
  });

  // The torso: strands bulging round a hollow in the chest, where the taken sleep.
  for (let k = 0; k < 9; k++) {
    const a = Math.PI / 2 + 1.0 + (k / 8) * (Math.PI * 2 - 2.0);
    const front = Math.abs(Math.sin(a)) > 0.5 && Math.sin(a) > 0 ? 0.12 : 0;
    const mid: Point = [0, 2.15, 0];
    strand(ring([0, 1.5, 0], 0.32, a - 0.3), ring(mid, 0.55 + front, a), 0.09);
    strand(ring(mid, 0.55 + front, a), ring([0, 2.8, 0], 0.4, a + 0.3), 0.09);
  }
  add(new SphereGeometry(1, 16, 12).scale(0.42, 0.5, 0.28), 0x120c08, ...d(0, 1.68, 0.18), { delay: 0.7, flat: true, noInk: true, rotation: [0, DF, 0] });
  const mouths: Mesh[] = [];
  [
    [-0.16, 2.22, 0.36, 0xd8a888, 0x3a2a20],
    [0.15, 2.28, 0.33, 0xb07a58, 0x1a1414],
    [0.0, 1.98, 0.4, 0xe8c8b0, 0x8a4a2a],
  ].forEach(([lx, ly, lz, skin, hair], k) => {
    const p = d(lx, ly, lz);
    const back = d(lx, ly + 0.02, lz - 0.05);
    ball(0.12, hair, back[0], back[1] - 0.12, back[2], { delay: 1.3 + k * 0.05 });
    const head = ball(0.115, skin, p[0], p[1] - 0.115, p[2], { delay: 1.32 + k * 0.05, rotation: [0.2, DF + (k - 1) * 0.3, (k - 1) * 0.35] });
    decorate(head, new BoxGeometry(0.045, 0.01, 0.01), INK, [
      [-0.04, 0.13, 0.105],
      [0.04, 0.13, 0.105],
    ]);
    decorate(head, new BoxGeometry(0.035, 0.025, 0.01), 0x3a1a20, [[0, 0.07, 0.11]]);
    mouths.push(head.children[head.children.length - 1] as Mesh);
  });

  // Shoulders, long arms with root fingers, a knot for a head and pale antlers over it.
  [-1, 1].forEach((s) => {
    const shoulder: Point = [s * 0.55, 2.75, 0];
    const elbow: Point = [s * 0.98, 1.9, 0.12];
    const wrist: Point = [s * 1.02, 1.05, 0.25];
    ball(0.24, BARK[1], ...d(shoulder[0], shoulder[1] - 0.2, shoulder[2]), { delay: 0.75 });
    [0, 1].forEach((i) => {
      strand(ring(shoulder, 0.08, i * 3), ring(elbow, 0.07, i * 3 + 1), 0.075);
      strand(ring(elbow, 0.07, i * 3 + 1), ring(wrist, 0.06, i * 3 + 2), 0.07);
    });
    [-0.3, -0.1, 0.1, 0.3].forEach((f) => strand(d(wrist[0], wrist[1], wrist[2]), d(wrist[0] + s * 0.12 + f * 0.3, 0.45 + Math.abs(f), wrist[2] + 0.1 + f * 0.4), 0.035));
  });
  ball(0.27, BARK[0], ...d(0, 2.72, 0.02), { delay: 0.8 });
  const antler = (from: Point, to: Point, r: number) => limb(kit, d(...from), d(...to), r, r * 0.7, ANTLER, { delay: 0.95 + n++ * 0.01 });
  [-1, 1].forEach((s) => {
    antler([s * 0.12, 2.95, 0], [s * 0.55, 3.45, -0.05], 0.05);
    antler([s * 0.55, 3.45, -0.05], [s * 1.0, 3.7, -0.1], 0.04);
    antler([s * 0.35, 3.25, -0.03], [s * 0.38, 3.75, 0.05], 0.035);
    antler([s * 0.7, 3.55, -0.07], [s * 0.72, 3.95, 0], 0.03);
    antler([s * 0.88, 3.64, -0.08], [s * 1.2, 3.85, 0.05], 0.025);
  });
  // Moss on its shoulders, hips and knees.
  [
    [-0.5, 2.85, 0.1, 0.16],
    [0.45, 2.88, 0.12, 0.14],
    [0.1, 2.95, 0.15, 0.12],
    [-0.35, 1.5, 0.25, 0.13],
    [0.42, 0.85, 0.22, 0.12],
    [-0.5, 0.9, 0.2, 0.1],
  ].forEach(([lx, ly, lz, r], k) => ball(r, MOSS, ...d(lx, ly - r, lz), { delay: 1.0 + k * 0.03 }));

  // The aura behind it, breathing, and specks of it rising.
  const aura = add(new SphereGeometry(1, 20, 14).scale(1.5, 2.1, 1.1), 0x9fffd8, ...d(0, 0.1, -0.2), { delay: 0.4, flat: true, noInk: true });
  const glow = (aura.children[0] as Mesh).material as Material;
  glow.side = BackSide;
  glow.transparent = true;
  glow.opacity = 0.2;
  glow.depthWrite = false;
  motes(14, 0xbfffe0, 0.03, [-1.3, G + 0.3, -1.0], [1.3, G + 3.8, 0.5], 1.2);

  // The dropped lantern, still lit, by its foot.
  const lantern = box(0.14, 0.2, 0.14, 0x23222b, 0.95, G, 0.85, { delay: 1.1, rotation: [0, 0.4, 1.35] });
  decorate(lantern, new BoxGeometry(0.1, 0.12, 0.15), YELLOW, [[0, 0.1, 0]]);

  // Banks of fog drifting low round its legs.
  const fog: Group[] = [
    [-1.1, 0.35, 0.3, 0.55],
    [-0.3, 0.6, 0.85, 0.45],
    [0.7, 0.4, 0.3, 0.6],
    [1.2, 0.2, -0.6, 0.5],
    [-0.9, 0.55, -1.0, 0.5],
    [0.1, 1.2, -0.9, 0.55],
  ].map(([x, y, z, r], k) => {
    const bank = add(new SphereGeometry(r, 14, 10).scale(1.4, 0.45, 1), 0xcfd8d4, x, G + y - r * 0.45, z, { delay: 1.4 + k * 0.05, flat: true, noInk: true });
    const mist = (bank.children[0] as Mesh).material as Material;
    mist.transparent = true;
    mist.opacity = 0.4;
    mist.depthWrite = false;
    return bank;
  });

  const fogRest = fog.map((bank) => bank.position.x);
  tick((t) => {
    fog.forEach((bank, k) => (bank.position.x = fogRest[k] + Math.sin(t * 0.25 + k * 1.7) * 0.25));
    glow.opacity = 0.2 - 0.08 * (1 - Math.cos(t * 1.1)) / 2;
    // The sleepers speak, all together, now and then.
    const speaking = Math.sin(t * 0.8) > 0.3 && Math.floor(t * 6) % 2 === 0;
    mouths.forEach((mouth) => (mouth.visible = speaking || t === 0));
  });

  return { width: 4.9, height: 4.7, lookY: 1.95 };
}
