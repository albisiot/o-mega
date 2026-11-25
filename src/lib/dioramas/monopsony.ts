import { BoxGeometry, Color, CylinderGeometry, OctahedronGeometry, SphereGeometry, TorusGeometry, type Group, type Mesh, type MeshToonMaterial } from "three";
import { CYAN, INK, MAGENTA, ORANGE, YELLOW, archMouth, archedWall, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { floor } from "@/lib/diorama-props";

/**
 * Monopsony (P203): the Compagnia's merchant in the gallery of the Banco Nove, a wardrobe of a man
 * in bank green with a round vault door for a chest and a small bronze head sunk between his
 * shoulders. On his right palm a one-of-a-kind jewel turns, then glides into the vault, which
 * spins its wheel and glows; on his left, the glass bell he bought it from stands empty among the
 * other unique pieces. All that weight rests on two short, thin legs: he never hurries anywhere.
 */
export function monopsony(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BANK = 0x2c5a4a;
  const BANK_DARK = 0x1f4236;
  const BRASS = 0xb08d3c;
  const BRASS_DARK = 0x7a6028;
  const SCALE = 0x8a7a3a;
  const LACQUER = 0x1a1a22;
  const WOOD = 0x3a2a26;
  const GLASS = 0xbfeeff;
  const MARBLE = 0xdedad0;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2a2c38, 0x1e2029, 0.5);

  // The gallery: a dark arched wall, and through the arch the harbour at sunset.
  add(archedWall(2.8, 3.0, 0.3, { x: 0.65, half: 0.48, spring: 1.45 }), 0x2e3448, 0, G, -1.6, { delay: 0.1, ink: 1.02 });
  const sunset = add(archMouth(0.48, 1.45), ORANGE, 0.65, G, -1.8, { delay: 0.14, flat: true, noInk: true });
  decorate(sunset, new BoxGeometry(0.96, 0.22, 0.01), 0x3a2a40, [[0, 0.11, 0.025]]);
  decorate(sunset, new BoxGeometry(0.02, 0.9, 0.01), 0x3a2a40, [
    [0.12, 0.45, 0.026],
    [0.26, 0.38, 0.026],
  ]);

  /** A plinth with a glass bell on it; returns the top of the plinth's brass base. */
  const bell = (x: number, z: number, delay: number): number => {
    const plinth = box(0.46, 0.85, 0.46, WOOD, x, G, z, { delay });
    decorate(plinth, new BoxGeometry(0.48, 0.05, 0.48), BRASS_DARK, [
      [0, 0.8, 0],
      [0, 0.08, 0],
    ]);
    const top = G + 0.85;
    cylinder(0.24, 0.24, 0.05, BRASS, x, top, z, { delay: delay + 0.03 }, 18);
    const glass = [
      cylinder(0.2, 0.2, 0.34, GLASS, x, top + 0.05, z, { delay: delay + 0.3, noInk: true }, 20),
      add(new SphereGeometry(0.2, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), GLASS, x, top + 0.39, z, { delay: delay + 0.3, noInk: true }),
    ];
    for (const part of glass) {
      const material = (part.children[0] as Mesh).material as MeshToonMaterial;
      material.transparent = true;
      material.opacity = 0.28;
      material.depthWrite = false;
    }
    ball(0.035, BRASS, x, top + 0.58, z, { delay: delay + 0.32 });
    return top + 0.05;
  };
  // A bust, a little sun, a vase: one of each in the world, and here.
  const bustTop = bell(-1.55, 0.45, 0.3);
  box(0.2, 0.08, 0.1, MARBLE, -1.55, bustTop, 0.45, { delay: 0.36 });
  cylinder(0.03, 0.035, 0.06, MARBLE, -1.55, bustTop + 0.08, 0.45, { delay: 0.37 });
  ball(0.07, MARBLE, -1.55, bustTop + 0.12, 0.45, { delay: 0.38 });
  const sunTop = bell(-1.05, -1.05, 0.34);
  const sun = ball(0.08, YELLOW, -1.05, sunTop + 0.08, -1.05, { delay: 0.42, flat: true });
  decorate(
    sun,
    new BoxGeometry(0.03, 0.26, 0.02),
    ORANGE,
    [0, 1, 2, 3].map((k) => [0, 0.08, 0.05, (k * Math.PI) / 4] as [number, number, number, number]),
  );
  const vaseTop = bell(1.2, -1.0, 0.38);
  add(new SphereGeometry(0.09, 14, 10).scale(1, 1.2, 1), 0xc87a3a, 1.2, vaseTop, -1.0, { delay: 0.46 });
  cylinder(0.04, 0.05, 0.1, 0xc87a3a, 1.2, vaseTop + 0.2, -1.0, { delay: 0.47 }, 10);
  // The one he has just bought from: empty, a ring of dust where it stood.
  const emptyTop = bell(1.72, 0.72, 0.42);
  cylinder(0.08, 0.08, 0.005, 0x6a6458, 1.72, emptyTop, 0.72, { delay: 0.5, flat: true, noInk: true }, 16);

  // Monopsony, turned to us.
  const X = 0.02;
  const Z = 0.18;
  const T = 0.28;
  const c = Math.cos(T);
  const s = Math.sin(T);
  const at = (lx: number, ly: number, lz: number): Point => [X + lx * c + lz * s, G + ly, Z - lx * s + lz * c];
  const r: Point = [0, T, 0];
  const D = 0.7;
  // Big lacquered boots under two short, thin legs.
  [-1, 1].forEach((side, i) => {
    const boot = box(0.3, 0.16, 0.46, LACQUER, ...at(side * 0.3, 0, 0.08), { delay: D + i * 0.02, rotation: r });
    decorate(boot, new BoxGeometry(0.31, 0.06, 0.1), BRASS_DARK, [[0, 0.1, 0.19]]);
    limb(kit, at(side * 0.3, 0.14, 0), at(side * 0.28, 0.8, 0), 0.075, 0.09, BANK_DARK, { delay: D + 0.04 + i * 0.02 });
  });
  box(0.9, 0.2, 0.6, BANK_DARK, ...at(0, 0.72, 0), { delay: D + 0.08, rotation: r });
  const chest = box(1.5, 1.35, 0.95, BANK, ...at(0, 0.85, 0), { delay: D + 0.1, rotation: r });
  decorate(chest, new BoxGeometry(1.42, 0.04, 0.02), LACQUER, [
    [0, 0.06, 0.478],
    [0, 1.29, 0.478],
  ]);
  decorate(chest, new BoxGeometry(0.04, 1.27, 0.02), LACQUER, [
    [-0.69, 0.675, 0.478],
    [0.69, 0.675, 0.478],
  ]);
  decorate(chest, new SphereGeometry(0.03, 8, 6), BRASS, [
    [-0.62, 0.14, 0.48],
    [0.62, 0.14, 0.48],
    [-0.62, 1.21, 0.48],
    [0.62, 1.21, 0.48],
  ]);
  // The vault door, its seam of gold light, the hinges and the bolt.
  const doorY = 1.5;
  const door = add(new CylinderGeometry(0.46, 0.46, 0.08, 28).rotateX(Math.PI / 2), BRASS, ...at(0, doorY - 0.46, 0.52), { delay: D + 0.2, rotation: r });
  decorate(door, new TorusGeometry(0.38, 0.025, 6, 28), BRASS_DARK, [[0, 0.46, 0.045]]);
  decorate(
    door,
    new CylinderGeometry(0.025, 0.025, 0.03, 8).rotateX(Math.PI / 2),
    BRASS_DARK,
    [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [Math.cos((k * Math.PI) / 4) * 0.42, 0.46 + Math.sin((k * Math.PI) / 4) * 0.42, 0.05] as Point),
  );
  const seam = add(new TorusGeometry(0.47, 0.025, 6, 32), YELLOW, ...at(0, doorY - 0.495, 0.5), { delay: D + 0.24, flat: true, noInk: true, rotation: r });
  [1.28, 1.72].forEach((y, k) => box(0.1, 0.16, 0.12, BRASS_DARK, ...at(0.5, y - 0.08, 0.52), { delay: D + 0.26 + k * 0.02, rotation: r }));
  box(0.07, 0.56, 0.07, BRASS, ...at(0.34, doorY - 0.28, 0.6), { delay: D + 0.3, rotation: r });
  // The wheel, built centred so it can spin on its hub.
  const wheelGeometry = new TorusGeometry(0.2, 0.03, 8, 24);
  const wheel = add(wheelGeometry, BRASS, ...at(0, doorY - 0.23, 0.62), { delay: D + 0.32 });
  wheelGeometry.translate(0, -0.23, 0);
  wheel.position.y += 0.23;
  wheel.rotation.order = "YXZ";
  wheel.rotation.set(0, T, 0);
  decorate(
    wheel,
    new BoxGeometry(0.025, 0.4, 0.025),
    BRASS,
    [0, 1, 2].map((k) => [0, 0, 0, (k * Math.PI) / 3] as [number, number, number, number]),
  );
  decorate(wheel, new CylinderGeometry(0.06, 0.06, 0.06, 12).rotateX(Math.PI / 2), BRASS_DARK, [[0, 0, 0.02]]);
  decorate(
    wheel,
    new SphereGeometry(0.03, 8, 6),
    BRASS_DARK,
    [0, 1, 2, 3, 4, 5].map((k) => [Math.sin((k * Math.PI) / 3) * 0.22, Math.cos((k * Math.PI) / 3) * 0.22, 0] as Point),
  );

  // The small bronze head without a neck, a seam down its face, two lit eyes.
  const head = add(new SphereGeometry(0.21, 18, 14).scale(0.95, 1.08, 0.95), 0x6a5a4a, ...at(0, 2.1, 0.04), { delay: D + 0.4, rotation: r });
  decorate(head, new BoxGeometry(0.06, 0.03, 0.02), YELLOW, [
    [-0.075, 0.25, 0.19],
    [0.075, 0.25, 0.19],
  ]);
  decorate(head, new BoxGeometry(0.014, 0.3, 0.02), INK, [[0, 0.2, 0.198]]);
  decorate(head, new CylinderGeometry(0.035, 0.035, 0.04, 10).rotateZ(Math.PI / 2), 0x5a4a3c, [
    [-0.2, 0.22, 0],
    [0.2, 0.22, 0],
  ]);

  // Arms: green shoulders and sleeves, forearms in scales of old brass, big open hands.
  const hands: Point[] = [];
  [-1, 1].forEach((side, i) => {
    const shoulder = at(side * 0.82, 1.98, 0);
    ball(0.3, BANK, shoulder[0], shoulder[1] - 0.3, shoulder[2], { delay: D + 0.34 + i * 0.03 });
    const elbow = at(side * 1.05, 1.45, 0.16);
    const wrist = i === 0 ? at(-0.95, 1.3, 0.62) : at(1.2, 1.26, 0.5);
    limb(kit, shoulder, elbow, 0.17, 0.16, BANK, { delay: D + 0.38 + i * 0.03 });
    ball(0.16, BANK_DARK, elbow[0], elbow[1] - 0.16, elbow[2], { delay: D + 0.4 + i * 0.03 });
    const fore = limb(kit, elbow, wrist, 0.155, 0.13, SCALE, { delay: D + 0.42 + i * 0.03 });
    const length = Math.hypot(wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]);
    const scales: [number, number, number, number][] = [];
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + row * 0.6;
        const rr = 0.15 - row * 0.006;
        scales.push([Math.sin(a) * rr, length * (0.15 + row * 0.22), Math.cos(a) * rr, 0]);
      }
    decorate(fore, new SphereGeometry(0.045, 6, 4).scale(1, 0.6, 0.5), BRASS, scales);
    // The open hand, palm up, fingers curled a little.
    const palm = i === 0 ? [-0.98, 1.22, 0.74] : [1.28, 1.18, 0.6];
    const centre = at(palm[0], palm[1], palm[2]);
    add(new SphereGeometry(0.17, 14, 10).scale(1, 0.45, 1.1), BRASS, centre[0], centre[1] - 0.04, centre[2], { delay: D + 0.46 + i * 0.03, rotation: r });
    [-0.1, -0.035, 0.035, 0.1].forEach((dx, k) =>
      limb(kit, at(palm[0] + dx, palm[1] + 0.02, palm[2] + 0.16), at(palm[0] + dx * 1.1, palm[1] + 0.12, palm[2] + 0.24), 0.035, 0.03, BRASS, { delay: D + 0.5 + k * 0.01 }),
    );
    limb(kit, at(palm[0] - side * 0.15, palm[1] + 0.02, palm[2]), at(palm[0] - side * 0.2, palm[1] + 0.12, palm[2] + 0.08), 0.04, 0.035, BRASS, { delay: D + 0.55 });
    hands.push(at(palm[0], palm[1] + 0.12, palm[2]));
  });

  // The jewel, one of a kind, turning over his right palm.
  const jewelAt = hands[0];
  const jewel = add(new OctahedronGeometry(0.1), MAGENTA, jewelAt[0], jewelAt[1], jewelAt[2], { delay: 1.5, flat: true });
  decorate(jewel, new OctahedronGeometry(0.05), 0xffb0d0, [[0.02, 0.12, 0.05]]);
  const doorCentre = at(0, doorY, 0.7);
  const glints: Group[] = [-1, 1].map((side) =>
    box(0.02, 0.16, 0.02, CYAN, jewelAt[0] + side * 0.16, jewelAt[1] + 0.06, jewelAt[2], { delay: 1.55, flat: true, noInk: true, rotation: [0, 0, side * 0.5] }),
  );

  const jewelScales = jewel.children.map((mesh) => mesh.scale.clone());
  const gold = new Color(YELLOW);
  const white = new Color(0xfff8d0);
  tick((t) => {
    // Bought: the jewel hovers, glides into the vault and is gone; the wheel spins it shut.
    const u = (t / 6) % 1;
    const glide = Math.min(1, Math.max(0, (u - 0.62) / 0.2));
    const ease = glide * glide * (3 - 2 * glide);
    jewel.visible = u < 0.84 || u > 0.97;
    jewel.position.set(
      jewelAt[0] + (doorCentre[0] - jewelAt[0]) * ease,
      jewelAt[1] + Math.sin(t * 2) * 0.03 * (1 - ease) + (doorCentre[1] - 0.1 - jewelAt[1]) * ease,
      jewelAt[2] + (doorCentre[2] - jewelAt[2]) * ease,
    );
    jewel.rotation.y = t * 1.5;
    jewel.children.forEach((mesh, i) => mesh.scale.copy(jewelScales[i]).multiplyScalar(1 - ease * 0.7));
    glints.forEach((glint) => (glint.visible = u < 0.6 && Math.sin(t * 5) > 0));
    const spin = Math.max(0, Math.min(1, (u - 0.8) / 0.18));
    wheel.rotation.z = spin * Math.PI * 1.5;
    colorOf(seam).lerpColors(gold, white, u > 0.78 && u < 0.98 ? 1 : (Math.sin(t * 1.5) + 1) / 4);
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
