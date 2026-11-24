import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Object3D } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle, sign } from "@/lib/diorama-props";

/**
 * Lacuna (P014): the man nobody remembers walks away from a bus stop at night, grey coat, grey
 * hat, grey briefcase; his face keeps crumbling into specks and slipping away altogether. The
 * people waiting in the shelter are only pale ghosts of memory, and on the shelter's side the
 * police sketch of him shows a hat over an empty face.
 */
export function lacuna(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STEEL = 0x3a4050;
  const GLASS = 0x1e4a5e;
  const GHOST = 0x2a7a98;
  const F = octagonBase(kit, 0x1a1e28);
  const G = floor(kit, F, 0.06, 0x262c3a, 0x1a1e2a, 0.5);

  // The shelter: posts, a roof, a glass back and side, a bench.
  const SX = -0.35;
  const SZ = -1.0;
  [
    [-1.0, -0.3],
    [1.0, -0.3],
    [-1.0, 0.35],
    [1.0, 0.35],
  ].forEach(([dx, dz], i) => box(0.06, 1.95, 0.06, STEEL, SX + dx, G, SZ + dz, { delay: 0.1 + i * 0.02 }));
  const roof = box(2.25, 0.08, 0.9, STEEL, SX, G + 1.95, SZ, { delay: 0.2 });
  decorate(roof, new BoxGeometry(2.25, 0.05, 0.01), CYAN, [[0, 0.04, 0.451]]);
  box(2.0, 1.55, 0.03, GLASS, SX, G + 0.3, SZ - 0.3, { delay: 0.25, ink: 1.02 });
  const side = box(0.03, 1.55, 0.6, GLASS, SX - 1.0, G + 0.3, SZ + 0.03, { delay: 0.28, ink: 1.02 });
  // The police sketch on the side: a hat, an empty oval where the face should be.
  decorate(side, new BoxGeometry(0.01, 0.5, 0.38), 0xe8e2d0, [[0.02, 0.85, 0]]);
  decorate(side, new TorusGeometry(0.09, 0.008, 6, 20).rotateY(Math.PI / 2).scale(1, 1.25, 1), 0x2a2a30, [[0.03, 0.8, 0]]);
  decorate(side, new BoxGeometry(0.01, 0.05, 0.26), 0x2a2a30, [[0.03, 0.96, 0]]);
  decorate(side, new BoxGeometry(0.01, 0.07, 0.14), 0x2a2a30, [[0.03, 1.01, 0]]);
  decorate(side, new BoxGeometry(0.01, 0.1, 0.24), 0x2a2a30, [[0.03, 0.66, 0]]);
  box(1.6, 0.06, 0.32, 0x4a3a30, SX + 0.1, G + 0.45, SZ - 0.12, { delay: 0.3 });
  [-0.6, 0.8].forEach((dx) => box(0.05, 0.45, 0.28, STEEL, SX + dx, G, SZ - 0.12, { delay: 0.3 }));
  sign(kit, 1.0, -1.1, G, 0.35, MAGENTA, 2.1);

  // Ghosts in the shelter: the people he was just with, already fading.
  const ghosts: Object3D[] = [];
  [
    [-0.7, 0.0, 1.0],
    [-0.15, 0.1, 0.9],
    [0.45, -0.05, 1.05],
  ].forEach(([dx, dz, h], i) => {
    const x = SX + dx;
    const z = SZ + dz;
    const o = { delay: 0.5 + i * 0.05, flat: true, noInk: true };
    ghosts.push(
      add(new CylinderGeometry(0.16, 0.22, h * 0.9, 10).scale(1, 1, 0.6), GHOST, x, G + 0.45 - h * 0.35, z, o),
      ball(0.13, GHOST, x, G + 0.45 + h * 0.55, z, o),
    );
    if (i === 1) ghosts.push(cylinder(0.2, 0.2, 0.02, GHOST, x, G + 0.45 + h * 0.75, z, o, 12));
  });

  puddle(kit, 0.9, 0.85, G, 0.5, 0.45, CYAN);
  puddle(kit, -1.3, 0.75, G, 0.55, 0.3, MAGENTA);

  // Lacuna, walking past: hat, grey coat, tie, briefcase, a face that won't stay.
  const X = 0.75;
  const Z = 0.5;
  const man = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: 0.55,
    height: 2.45,
    skin: 0xc8b8ac,
    hair: { style: "short", color: 0x3a3a40 },
    face: { mouth: "neutral", brows: "calm" },
    headwear: { kind: "hat", color: 0x5a5e66, accent: 0x2a2a30 },
    top: { kind: "coat", color: 0x5e636e, accent: 0x4a4e58 },
    bottom: { kind: "trousers", color: 0x3a3e48 },
    shoes: 0x1e1e24,
    arms: ["down", "down"],
    legs: "stride",
    delay: 0.8,
  });
  box(0.06, 0.34, 0.02, 0x2a2a30, ...man.at(0, 1.42, 0.25), { delay: 1.3, rotation: [0, 0.55, 0] });
  box(0.14, 0.1, 0.02, 0xd8d2c4, ...man.at(0, 1.73, 0.24), { delay: 1.28, rotation: [0, 0.55, 0] });
  const [grip] = man.hands;
  const briefcase = box(0.42, 0.3, 0.1, 0x2a2a34, grip[0], grip[1] - 0.36, grip[2], { delay: 1.4, rotation: [0, 0.55, 0] });
  decorate(briefcase, new BoxGeometry(0.12, 0.05, 0.02), YELLOW, [[0, 0.24, 0.055]]);
  add(new TorusGeometry(0.06, 0.012, 6, 12, Math.PI), 0x2a2a34, grip[0], grip[1] - 0.07, grip[2], { delay: 1.42, rotation: [0, 0.55, 0] });
  // Specks of his face drifting off to one side.
  const [hx, hy, hz] = man.head;
  motes(14, 0xc8b8ac, 0.025, [hx + 0.05, hy - 0.15, hz - 0.1], [hx + 0.6, hy + 0.5, hz + 0.2], 1.5);
  motes(8, CYAN, 0.02, [hx + 0.1, hy - 0.1, hz - 0.1], [hx + 0.7, hy + 0.6, hz + 0.2], 1.6);
  // A mist over the side of his head where the face is going.
  const mist = add(new SphereGeometry(man.headRadius * 1.03, 12, 10, Math.PI * 0.6, Math.PI * 0.7).scale(0.95, 1.06, 0.95), 0x9aa4b4, hx, hy - man.headRadius * 1.09, hz, { delay: 1.5, noInk: true, rotation: [0, 0.55, 0] });

  const features = man.headPart.children.slice(2);
  const rest = man.parts.map((part) => part.position.y);
  tick((t) => {
    // His face slips away for a moment now and then; the ghosts thin out and come back; he walks.
    const u = (t / 5) % 1;
    const gone = u > 0.55 && u < 0.8;
    features.forEach((mesh) => (mesh.visible = !gone));
    mist.visible = !gone;
    ghosts.forEach((ghost, i) => (ghost.visible = Math.sin(t * 0.7 + Math.floor(i / 2)) > -0.6));
    const step = Math.abs(Math.sin(t * 3)) * 0.02;
    man.parts.forEach((part, i) => (part.position.y = rest[i] + step));
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}
