import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, volcanoBackdrop } from "@/lib/diorama-props";

/**
 * Harrow (P113): the driverless combine harvester stands in the furrows outside the city like a
 * rusty idol, two silos on its back and votive ribbons fluttering from every edge, its reel
 * turning; a farmer kneels to it among candles. It cannot speak: it prints its verdict on a strip
 * of paper that grows out of its side, onto the heap of every dawn's receipts nobody reads.
 */
export function harrow(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const RUST = 0xa8441e;
  const RUST_DARK = 0x7a3018;
  const TRACK = 0x2a2622;
  const RIBBON = 0xe8e4da;
  const F = octagonBase(kit, 0x28202a);
  const G = floor(kit, F, 0.06, 0x3a2e36, 0x2a2228, 0);

  // Furrows across the field, cut to the octagon.
  [-1.9, -1.4, 0.95, 1.35, 1.75, 2.1].forEach((z, i) => {
    const w = 2 * Math.min(2.15, 2.15 * Math.SQRT2 - Math.abs(z) - 0.1);
    box(w, 0.06, 0.12, 0x4a3a3e, 0, G, z, { delay: 0.08 + i * 0.02, noInk: true });
  });
  volcanoBackdrop(kit, -1.45, -1.2, G, 0.15, 1.15);

  // The machine's own frame, its front turned to us.
  const T = 0.3;
  const at = (lx: number, ly: number, lz: number): Point => [0.1 + lx * Math.cos(T) + lz * Math.sin(T), G + ly, -0.45 - lx * Math.sin(T) + lz * Math.cos(T)];
  const turn: [number, number, number] = [0, T, 0];

  // Tracks, body, the toothed deck and the two silos.
  [-1, 1].forEach((s, i) => {
    const track = box(0.46, 0.62, 2.1, TRACK, ...at(s * 0.78, 0, 0), { delay: 0.2 + i * 0.04, rotation: turn });
    decorate(track, new CylinderGeometry(0.2, 0.2, 0.02, 12).rotateZ(Math.PI / 2), 0x4a4450, [-0.7, -0.23, 0.23, 0.7].map((z) => [s * 0.235, 0.3, z] as Point));
    decorate(
      track,
      new BoxGeometry(0.48, 0.03, 0.07),
      0x3e3830,
      Array.from({ length: 13 }, (_, k) => [0, 0.625, -0.96 + k * 0.16] as Point),
    );
  });
  const body = box(1.2, 1.05, 1.6, RUST, ...at(0, 0.45, -0.05), { delay: 0.3, rotation: turn });
  decorate(body, new BoxGeometry(0.62, 0.62, 0.02), 0x2a2228, [[0, 0.46, 0.8]]);
  decorate(
    body,
    new BoxGeometry(0.6, 0.025, 0.03),
    RUST_DARK,
    Array.from({ length: 6 }, (_, k) => [0, 0.2 + k * 0.1, 0.81] as Point),
  );
  // Its eyes: two headlights over the grille.
  const lights = decorate(body, new BoxGeometry(0.16, 0.1, 0.03), CYAN, [
    [-0.42, 0.88, 0.81],
    [0.42, 0.88, 0.81],
  ]);
  const deck = box(2.7, 0.38, 1.5, RUST_DARK, ...at(0, 1.5, -0.1), { delay: 0.4, rotation: turn });
  decorate(
    deck,
    new ConeGeometry(0.045, 0.2, 5).rotateX(Math.PI),
    0x5a2412,
    Array.from({ length: 13 }, (_, k) => [-1.26 + k * 0.21, -0.2, 0.7] as Point),
  );
  decorate(
    deck,
    new BoxGeometry(0.06, 0.06, 0.02),
    0xd8a070,
    Array.from({ length: 9 }, (_, k) => [-1.2 + k * 0.3, 0.26, 0.76] as Point),
  );
  [-1, 1].forEach((s, i) => {
    const silo = cylinder(0.3, 0.3, 1.55, RUST, ...at(s * 0.62, 1.88, -0.2), { delay: 0.5 + i * 0.05, rotation: turn }, 16);
    decorate(silo, new TorusGeometry(0.305, 0.022, 6, 20).rotateX(Math.PI / 2), RUST_DARK, [
      [0, 0.35, 0],
      [0, 0.8, 0],
      [0, 1.25, 0],
    ]);
    decorate(silo, new BoxGeometry(0.03, 1.5, 0.03), INK, [
      [s * 0.08, 0.75, 0.3],
      [s * 0.2, 0.75, 0.24],
    ]);
    add(new SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), RUST_DARK, ...at(s * 0.62, 3.43, -0.2), { delay: 0.6 + i * 0.05 });
  });
  const pipe = at(-0.62, 3.6, -0.3);
  cylinder(0.05, 0.06, 0.32, INK, ...at(-0.62, 3.6, -0.3), { delay: 0.7 }, 8);
  // FUR 0: it can't go anywhere quietly; it smokes.
  motes(9, 0x4a4450, 0.07, [pipe[0] - 0.1, pipe[1] + 0.35, pipe[2] - 0.1], [pipe[0] + 0.25, pipe[1] + 1.0, pipe[2] + 0.1], 1);

  // The cutter bar and the reel turning over it.
  const bar = box(2.4, 0.1, 0.28, 0x4a4450, ...at(0, 0.08, 1.3), { delay: 0.5, rotation: turn });
  decorate(
    bar,
    new ConeGeometry(0.035, 0.14, 4).rotateX(Math.PI / 2),
    0xb8b0a0,
    Array.from({ length: 11 }, (_, k) => [-1.1 + k * 0.22, 0.05, 0.18] as Point),
  );
  [-1, 1].forEach((s) => limb(kit, at(s * 1.05, 1.52, 0.5), at(s * 1.05, 0.78, 1.32), 0.045, 0.04, RUST_DARK, { delay: 0.55 }));
  const reel = add(new CylinderGeometry(0.06, 0.06, 2.2, 8).rotateZ(Math.PI / 2), RUST_DARK, 0, 0, 0, { delay: 0.6 });
  decorate(reel, new BoxGeometry(2.2, 0.05, 0.05), RUST, [0, 1, 2, 3, 4].map((k) => [0, 0.06 + Math.cos(k * 1.257) * 0.24, Math.sin(k * 1.257) * 0.24] as Point));
  decorate(reel, new CylinderGeometry(0.26, 0.26, 0.03, 5).rotateZ(Math.PI / 2), RUST_DARK, [
    [-1.1, 0.06, 0],
    [1.1, 0.06, 0],
  ]);
  const spin = new Group();
  spin.position.set(...at(0, 0.78, 1.32));
  spin.rotation.order = "YXZ";
  reel.parent?.add(spin);
  spin.add(reel);
  reel.position.set(0, -0.06, 0);

  // Votive ribbons tied to every edge, hanging and swaying.
  const ribbons = [
    [-1.3, 1.5, 0.74, 0.8],
    [-0.75, 1.5, 0.74, 0.55],
    [-0.15, 1.5, 0.74, 0.7],
    [0.45, 1.5, 0.74, 0.5],
    [1.0, 1.5, 0.74, 0.75],
    [-1.34, 1.85, -0.3, 0.9],
    [1.34, 1.85, -0.5, 0.95],
    [-0.62, 3.2, 0.1, 0.75],
    [0.62, 2.9, 0.1, 0.6],
    [-0.62, 2.4, 0.1, 0.5],
    [0.62, 3.35, 0.06, 0.8],
    [-1.34, 1.85, 0.3, 0.6],
    [1.34, 1.85, 0.2, 0.7],
    [-1.0, 1.5, 0.74, 0.45],
    [0.75, 1.5, 0.74, 0.85],
    [-0.42, 1.5, 0.74, 0.95],
    [-0.4, 3.0, -0.05, 0.6],
    [0.82, 2.6, -0.1, 0.7],
  ].map(([lx, ly, lz, length], k) => {
    const p = at(lx, ly, lz);
    ball(0.035, RIBBON, p[0], p[1] - 0.035, p[2], { delay: 1 + k * 0.03, noInk: true });
    return box(0.06 + (k % 3) * 0.025, length, 0.012, RIBBON, ...p, { delay: 1 + k * 0.03, rotation: [0, T + ((k * 7) % 5) * 0.15 - 0.3, Math.PI] });
  });

  // COM 1: it prints instead of speaking; every dawn's strip piles up below.
  const slot = at(1.2, 1.55, 0.67);
  const receipt = box(0.15, 1.1, 0.012, 0xf4f0e6, ...slot, { delay: 1.3, rotation: [0.06, T, Math.PI], noInk: true });
  [
    [1.25, 1.05, 0],
    [1.45, 0.9, 0.7],
    [1.3, 1.25, 1.4],
    [1.5, 1.15, 2.2],
  ].forEach(([lx, lz, yaw], i) => cylinder(0.055, 0.055, 0.17, 0xe8e2d0, ...at(lx, 0.055, lz), { delay: 1.35 + i * 0.03, rotation: [Math.PI / 2, 0, T + yaw] }, 10));
  box(0.13, 0.008, 0.5, 0xe8e2d0, ...at(1.35, 0, 1.12), { delay: 1.4, noInk: true, rotation: [0, T + 0.5, 0] });

  // Offerings: candles before the cutter bar, a sheaf of wheat.
  const flames = [-0.85, -0.45, 0.15, 0.6].map((lx, i) => {
    const h = 0.12 + (i % 2) * 0.08;
    cylinder(0.04, 0.04, h, 0xe8e2d0, ...at(lx, 0, 1.75 + (i % 2) * 0.12), { delay: 0.9 + i * 0.03 }, 8);
    return add(new ConeGeometry(0.03, 0.08, 6), ORANGE, ...at(lx, h + 0.01, 1.75 + (i % 2) * 0.12), { delay: 0.95 + i * 0.03, flat: true, noInk: true });
  });
  [-0.1, 0, 0.1].forEach((tilt, i) => add(new ConeGeometry(0.06, 0.5, 6).rotateX(Math.PI), 0xb08848, ...at(-0.15 + tilt, 0, 1.95), { delay: 1 + i * 0.02, rotation: [0, 0, tilt * 2] }));
  cylinder(0.08, 0.08, 0.05, MAGENTA, ...at(-0.15, 0.2, 1.95), { delay: 1.05, noInk: true });

  // The farmer on his knees, arms raised to it.
  figure(kit, {
    x: -1.75,
    z: -0.15,
    y: G,
    facing: 1.3,
    height: 1.9,
    skin: 0xb88a68,
    hair: { style: "short", color: 0x4a3a30 },
    face: { mouth: "open", brows: "raised", beard: "moustache", beardColor: 0x4a3a30 },
    headwear: { kind: "hat", color: 0x8a7a5a, accent: MAGENTA },
    top: { kind: "shirt", color: 0x2f5866 },
    bottom: { kind: "trousers", color: 0x3a3040 },
    arms: ["up", "up"],
    legs: "kneel",
    delay: 1.5,
  });

  tick((t) => {
    spin.rotation.set(-t * 1.2, T, 0);
    ribbons.forEach((ribbon, k) => (ribbon.rotation.x = Math.sin(t * 2.2 + k * 1.3) * 0.18));
    const u = (t / 7 + 0.6) % 1;
    receipt.children.forEach((child) => (child.scale.y = 0.35 + 0.65 * u));
    lights.color.setHex((t + 2) % 5 < 0.15 ? 0x0b3d50 : CYAN);
    flames.forEach((f, i) => (f.children[0].scale.y = 1 + Math.sin(t * 11 + i * 1.7) * 0.2));
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
