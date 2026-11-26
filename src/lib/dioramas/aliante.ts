import { BoxGeometry, CylinderGeometry, Group } from "three";
import { CYAN, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, ring, skyline } from "@/lib/diorama-props";

/**
 * Aliante (P295): the PE teacher of the Custodi floats over the school roof at sunset, arms
 * raised, breathing slowly, rings of calm under her feet. Every so often she loses her nerve and
 * drops, then rises again: the crash mat below already bears the print of her last fall, and
 * the dumbbell she cannot lift lies beside it. Behind, the port crane against the setting sun.
 */
export function aliante(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const F = octagonBase(kit, 0x221e30);
  const G = floor(kit, F, 0.06, 0x3a3a4c, 0x2a2a3a, 0.5);
  const DARK = 0x23222b;

  // The horizon: the setting sun, a strip of the city, a harbour crane.
  add(new CylinderGeometry(0.42, 0.42, 0.02, 24).rotateX(Math.PI / 2), ORANGE, 0.7, G + 0.05, -2.0, { delay: 0.1, flat: true, noInk: true });
  skyline(kit, -1.95, G, 0.12, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.2, 0.15);
  const CRANE = 0x3a4060;
  [-0.22, 0.22].forEach((dx) => box(0.07, 0.9, 0.07, CRANE, 1.4 + dx, G, -1.55, { delay: 0.2 }));
  box(0.55, 0.06, 0.12, CRANE, 1.4, G + 0.9, -1.55, { delay: 0.22 });
  box(0.36, 0.3, 0.3, CRANE, 1.4, G + 0.96, -1.55, { delay: 0.24 });
  limb(kit, [1.3, G + 1.15, -1.55], [0.55, G + 2.45, -1.55], 0.04, 0.03, CRANE, { delay: 0.28 });
  box(0.07, 0.07, 0.07, MAGENTA, 0.55, G + 2.45, -1.55, { delay: 0.32, flat: true, noInk: true });
  limb(kit, [0.58, G + 2.42, -1.55], [0.58, G + 1.8, -1.55], 0.008, 0.008, 0x14121c, { delay: 0.34, noInk: true });
  box(2.9, 0.32, 0.14, 0x4a4658, -0.05, G, -1.68, { delay: 0.15 });

  // The roof: a TV aerial, the vaulting box, the crash mat with the print of her last fall.
  cylinder(0.025, 0.03, 1.8, DARK, -1.2, G, -1.3, { delay: 0.25 }, 8);
  [0.5, 0.4, 0.3].forEach((w, i) => box(w, 0.025, 0.025, DARK, -1.2, G + 1.35 + i * 0.15, -1.3, { delay: 0.3, noInk: true, rotation: [0, 0.5, 0] }));
  [0.92, 0.88, 0.84].forEach((w, k) => {
    const seg = box(w, 0.22, w * 0.55, 0x8a6446, -1.3, G + k * 0.22, 0.45, { delay: 0.3 + k * 0.04, rotation: [0, 0.4, 0] });
    decorate(seg, new BoxGeometry(w + 0.004, 0.02, w * 0.55 + 0.004), 0x4a3226, [[0, 0.21, 0]]);
  });
  box(0.86, 0.1, 0.48, 0xe6dcc4, -1.3, G + 0.66, 0.45, { delay: 0.45, rotation: [0, 0.4, 0] });
  const mat = box(1.7, 0.2, 1.3, 0x1f6f9a, 0.35, G, 0.68, { delay: 0.25 });
  decorate(mat, new BoxGeometry(0.012, 0.005, 1.3), 0x16506e, [
    [-0.27, 0.201, 0],
    [0.27, 0.201, 0],
  ]);
  const PRINT = 0x14506f;
  decorate(mat, new CylinderGeometry(0.11, 0.11, 0.005, 14), PRINT, [[0.56, 0.202, 0.25]]);
  decorate(mat, new BoxGeometry(0.36, 0.005, 0.24), PRINT, [[0.25, 0.202, 0.25]]);
  decorate(mat, new BoxGeometry(0.34, 0.005, 0.07).rotateY(0.7), PRINT, [[0.32, 0.202, 0.03]]);
  decorate(mat, new BoxGeometry(0.34, 0.005, 0.07).rotateY(-0.7), PRINT, [[0.32, 0.202, 0.47]]);
  decorate(mat, new BoxGeometry(0.38, 0.005, 0.08).rotateY(-0.35), PRINT, [[-0.08, 0.202, 0.16]]);
  decorate(mat, new BoxGeometry(0.38, 0.005, 0.08).rotateY(0.35), PRINT, [[-0.08, 0.202, 0.34]]);
  // The dumbbell she could not lift.
  add(new CylinderGeometry(0.03, 0.03, 0.5, 8).rotateZ(Math.PI / 2), 0x8a93a3, 1.45, G + 0.08, -0.15, { delay: 0.5 });
  [-0.2, 0.2].forEach((dx) => add(new CylinderGeometry(0.11, 0.11, 0.08, 14).rotateZ(Math.PI / 2), DARK, 1.45 + dx, G, -0.15, { delay: 0.52 }));

  // Aliante, floating, arms up, the white band of the Custodi on her arm.
  const H = 2.35;
  const u = H / 2.4;
  const FLY = G + 1.1;
  const coach = figure(kit, {
    x: 0.1,
    z: 0.5,
    y: FLY,
    facing: 0.3,
    height: H,
    build: "slim",
    skin: 0xf0c4a8,
    hair: { style: "ponytail", color: 0xc0283c },
    face: { mouth: "smile", brows: "calm", marks: 0xd08a6a },
    top: { kind: "jacket", color: 0x72d2bc, accent: 0xeef6f2 },
    bottom: { kind: "trousers", color: 0x72d2bc },
    shoes: 0x2a3440,
    arms: ["up", "up"],
    delay: 0.9,
  });
  const torso = coach.parts[7];
  decorate(torso, new BoxGeometry(0.02, 0.6 * u, 0.1), 0xeef6f2, [
    [-0.28 * u, 0.33 * u, 0],
    [0.28 * u, 0.33 * u, 0],
  ]);
  const shoulder = coach.at(0.34 * u, 1.72 * u, 0);
  const elbow = coach.elbows[1];
  const mix = (k: number): Point => [0, 1, 2].map((i) => shoulder[i] + (elbow[i] - shoulder[i]) * k) as Point;
  const band = limb(kit, mix(0.3), mix(0.6), 0.1 * u, 0.1 * u, 0xf4f8f6, { delay: 1.4 });
  const whistle = cylinder(0.025, 0.025, 0.08, 0xc8d0dc, ...coach.at(0.06, 1.42 * u, 0.22), { delay: 1.45 }, 8);
  const crown = 2.14 * u;
  // The long ponytail streaming down and out to one side as she rises.
  const tail: Point[] = [coach.at(0, crown - 0.05, -0.22), coach.at(-0.3, crown - 0.45, -0.32), coach.at(-0.42, crown - 0.95, -0.28), coach.at(-0.36, crown - 1.35, -0.2)];
  const locks = tail.slice(1).map((to, i) => limb(kit, tail[i], to, 0.08 - i * 0.02, 0.06 - i * 0.02, 0xc0283c, { delay: 1.4 + i * 0.03 }));

  // Rings of calm under her feet, and her shadow on the mat.
  const rings = [0, 1, 2, 3].map((k) => ring(kit, [0.1, FLY - 0.12 - k * 0.22, 0.53], 0.3 + k * 0.04, CYAN, 1.5 + k * 0.05));
  const shadow = add(new CylinderGeometry(0.34, 0.34, 0.004, 18), 0x123a52, 0.12, G + 0.203, 0.55, { delay: 1.2, flat: true, noInk: true });

  const body: Group[] = [...coach.parts, band, whistle, ...locks];
  const rest = body.map((part) => part.position.y);
  const ringRest = rings.map((r) => r.position.y);
  tick((t) => {
    // Calm breathing; then, every eight seconds, a moment of panic and a drop.
    const cycle = t % 8;
    const dip = cycle > 6 ? Math.sin(((cycle - 6) / 2) * Math.PI) * 0.42 : 0;
    const lift = Math.sin(t * 1.4) * 0.07 - dip;
    body.forEach((part, i) => (part.position.y = rest[i] + lift));
    rings.forEach((r, k) => {
      r.position.y = ringRest[k] + lift;
      const s = 1 + 0.15 * Math.sin(t * 1.4 + k);
      r.children[0].scale.set(s, 1, s);
      r.visible = dip < 0.12;
    });
    const near = 1 + dip * 0.9 - lift * 0.5;
    shadow.children[0].scale.set(near, 1, near);
  });

  return { width: 4.9, height: 4.6, lookY: 1.95 };
}
