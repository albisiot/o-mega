import { BoxGeometry, ConeGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusKnotGeometry } from "three";
import { INK, MAGENTA, ORANGE, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor } from "@/lib/diorama-props";

/**
 * Esca (P327): the Banco's fisher of Segnati casts from a rooftop over the harbour at night in
 * her yellow oilskin. At the end of her magenta line the glowing lure swings back and forth,
 * and everything follows it: the black cat by the parapet, the gull on the chimney, and Esca
 * herself, mouth open, eyes lit, as hooked as anyone. Her reel is a tangle she will never undo.
 */
export function esca(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const F = octagonBase(kit, 0x1c1b26);
  const G = floor(kit, F, 0.06, 0x3a3a48, 0x2a2a36, 0.45);

  // The tiled roof behind, a chimney with its pots on the ridge.
  const roof = new Shape();
  roof.moveTo(-0.5, 0);
  roof.lineTo(0.5, 0);
  roof.lineTo(0, 1.0);
  roof.closePath();
  const tiles = add(new ExtrudeGeometry(roof, { depth: 2.6, bevelEnabled: false }).translate(0, 0, -1.3).rotateY(Math.PI / 2), 0x6a3a44, -0.2, G, -1.25, { delay: 0.1, ink: 1.02 });
  decorate(
    tiles,
    new BoxGeometry(2.6, 0.02, 0.03),
    0x4a2430,
    [0.15, 0.35, 0.55, 0.75].map((y) => [0, y, 0.5 - y * 0.5 + 0.012] as Point),
  );
  const stack = box(0.32, 0.75, 0.32, 0x5a4a5a, -1.0, G + 0.55, -1.25, { delay: 0.2 });
  decorate(stack, new BoxGeometry(0.34, 0.06, 0.34), 0x46404e, [[0, 0.72, 0]]);
  [-0.07, 0.08].forEach((dx, i) => cylinder(0.06, 0.07, 0.18 - i * 0.04, 0xb0603a, -1.0 + dx, G + 1.32, -1.33, { delay: 0.24 + i * 0.03 }, 10));

  // The parapet at the roof's edge, the lure out beyond it.
  const parapet = box(1.9, 0.38, 0.2, 0x4a5060, -1.3, G, 1.3, { delay: 0.15, rotation: [0, -Math.PI / 4, 0] });
  decorate(parapet, new BoxGeometry(1.94, 0.05, 0.24), 0x5d6680, [[0, 0.38, 0]]);
  crate(kit, 1.15, 0.85, G, 0.3, 0.36, 0x5e4a3a, 0.3);
  const book = box(0.3, 0.06, 0.22, MAGENTA, 1.15, G + 0.36, 0.85, { delay: 0.35, rotation: [0, 0.1, 0] });
  decorate(book, new BoxGeometry(0.04, 0.065, 0.1), YELLOW, [[0.15, 0.03, 0]]);
  decorate(book, new BoxGeometry(0.3, 0.04, 0.005), 0xf4f0e6, [[0, 0.03, 0.112]]);

  // Esca, rod up, leaning after her own lure.
  const [X, Z, facing] = [0.65, 0.15, -0.4];
  const H = 2.35;
  const loc = (x: number, y: number, z: number): Point => [X + x * Math.cos(facing) + z * Math.sin(facing), G + y, Z - x * Math.sin(facing) + z * Math.cos(facing)];
  const S: Point = [-0.32, 1.0, 0.12];
  const E: Point = [-0.55, 3.0, 1.3];
  const on = (k: number): Point => [S[0] + (E[0] - S[0]) * k, S[1] + (E[1] - S[1]) * k, S[2] + (E[2] - S[2]) * k];
  figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing,
    height: H,
    skin: 0xe0b8a0,
    hair: { style: "wild", color: 0xe8e8ee },
    face: { mouth: "open", brows: "raised", eyes: YELLOW, glow: true, marks: 0xc09080 },
    top: { kind: "coat", color: 0xf0c020, accent: 0xb88a10 },
    bottom: { kind: "trousers", color: 0x23404b },
    shoes: 0x1f302a,
    arms: [on(0.12), on(0.3)],
    legs: "wide",
    delay: 0.8,
  });
  const tip = loc(...E);
  limb(kit, loc(...on(-0.04)), tip, 0.035, 0.012, 0x2a2a34, { delay: 1.4 });
  // The reel, and the bird's nest of line round it.
  const reel = loc(...on(0.2));
  cylinder(0.06, 0.06, 0.06, 0x8a93a3, reel[0], reel[1] - 0.12, reel[2], { delay: 1.45 }, 12);
  add(new TorusKnotGeometry(0.07, 0.012, 48, 5, 3, 7), MAGENTA, reel[0], reel[1] - 0.16, reel[2], { delay: 1.5, flat: true, ink: 1.1 });

  // The line to the lure, which swings from the end of it.
  const pivot: Point = [-1.4, G + 2.25, 1.45];
  cable(kit, [tip, [tip[0] - 0.35, tip[1] + 0.12, tip[2] + 0.2], [-1.25, G + 2.75, 1.4], pivot], 0.011, MAGENTA, 1.55);
  const L = 0.55;
  const drop = add(new BoxGeometry(0.014, L, 0.014), MAGENTA, ...pivot, { delay: 1.6, flat: true, noInk: true, rotation: [Math.PI, 0, 0] });
  const lure = add(new SphereGeometry(0.075, 12, 10).scale(0.7, 1.6, 0.7), YELLOW, pivot[0], pivot[1] - L - 0.24, pivot[2], { delay: 1.65, flat: true });
  decorate(lure, new ConeGeometry(0.05, 0.1, 6).rotateX(Math.PI), ORANGE, [[0, -0.02, 0]]);
  decorate(lure, new BoxGeometry(0.03, 0.03, 0.01), INK, [[0.02, 0.18, 0.05]]);
  motes(10, YELLOW, 0.02, [pivot[0] - 0.4, G + 1.2, pivot[2] - 0.2], [pivot[0] + 0.4, G + 2.1, pivot[2] + 0.2], 1.7);

  // The cat by the parapet, watching it.
  const [kx, kz] = [-0.55, 0.85];
  add(new SphereGeometry(0.17, 12, 10).scale(0.9, 1.25, 1.1), 0x1a1a22, kx, G, kz, { delay: 0.6 });
  const catHead = ball(0.11, 0x1a1a22, kx - 0.04, G + 0.36, kz + 0.06, { delay: 0.65 });
  decorate(catHead, new ConeGeometry(0.04, 0.08, 4), 0x1a1a22, [
    [-0.06, 0.22, 0],
    [0.06, 0.22, 0],
  ]);
  decorate(catHead, new BoxGeometry(0.035, 0.025, 0.01), YELLOW, [
    [-0.04, 0.12, 0.1],
    [0.04, 0.12, 0.1],
  ]);
  limb(kit, [kx + 0.1, G + 0.04, kz - 0.1], [kx + 0.32, G + 0.3, kz - 0.18], 0.025, 0.02, 0x1a1a22, { delay: 0.7 });

  // The gull on the chimney, watching it too.
  const gx = -0.95;
  const gy = G + 1.32;
  const gz = -1.12;
  add(new SphereGeometry(0.1, 12, 10).scale(1.4, 0.85, 0.85), 0xf2f0ea, gx, gy, gz, { delay: 0.5 });
  box(0.24, 0.03, 0.07, 0x9aa0ab, gx + 0.04, gy + 0.1, gz + 0.06, { delay: 0.52, rotation: [0.3, 0, -0.1] });
  const gullHead = ball(0.06, 0xf2f0ea, gx - 0.13, gy + 0.1, gz + 0.02, { delay: 0.55 });
  decorate(gullHead, new ConeGeometry(0.02, 0.08, 6).rotateZ(Math.PI / 2), YELLOW, [[-0.08, 0.055, 0]]);
  decorate(gullHead, new BoxGeometry(0.015, 0.015, 0.01), INK, [[-0.03, 0.075, 0.05]]);

  tick((t) => {
    const swing = Math.sin(t * 1.7) * 0.45;
    drop.rotation.set(Math.PI, 0, swing);
    lure.position.set(pivot[0] - Math.sin(swing) * (L + 0.04), pivot[1] - Math.cos(swing) * (L + 0.04) - 0.24, pivot[2]);
    catHead.rotation.y = 0.4 + swing * 0.6;
    gullHead.rotation.y = -0.6 + swing * 0.5;
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
