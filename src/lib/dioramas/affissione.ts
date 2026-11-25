import { BoxGeometry, ConeGeometry, CylinderGeometry, TorusGeometry, type Group } from "three";
import { CYAN, MAGENTA, ORANGE, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, lamp, puddle } from "@/lib/diorama-props";

/**
 * Affissione (P201): the man-billboard of the Compagnia on a wet night street by the harbour,
 * in front of a wall of peeling posters. Flat cap, rolled sleeves, metal-framed adverts strapped
 * to his arms and chest, a paste tube on his back: the chest ad sends out its hypnotic rings,
 * the forearm panels flip to the next client, and on his back there is a blank panel still
 * to let. His paste bucket and brush wait at his feet.
 */
export function affissione(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const METAL = 0x8a8e98;
  const CREAM = 0xe8d8b0;
  const SEA = 0x2a8aa8;
  const F = octagonBase(kit, 0x1a1a24);
  const G = floor(kit, F, 0.06, 0x2c2a36, 0x1e1c28, 0.3);

  /** An advert on a panel's face: a sun over the sea with a sail, a woman's face, or blank. */
  const ad = (panel: Group, kind: "sun" | "face" | "sea" | "blank", w: number, h: number, z: number) => {
    decorate(panel, new BoxGeometry(w - 0.05, h - 0.05, 0.004), kind === "face" ? CREAM : kind === "sea" ? MAGENTA : kind === "blank" ? CREAM : SEA, [[0, h / 2, z]]);
    const r = Math.min(w, h);
    if (kind === "sun") {
      decorate(panel, new CylinderGeometry(r * 0.17, r * 0.17, 0.004, 14).rotateX(Math.PI / 2), ORANGE, [[w * 0.18, h * 0.68, z * 1.2]]);
      decorate(panel, new ConeGeometry(r * 0.15, r * 0.32, 3).scale(1, 1, 0.05), 0xf4f0e6, [[-w * 0.15, h * 0.32, z * 1.2]]);
      decorate(panel, new BoxGeometry(w - 0.05, h * 0.14, 0.004), 0x1d5a78, [[0, h * 0.14, z * 1.2]]);
    }
    if (kind === "face") {
      decorate(panel, new CylinderGeometry(r * 0.26, r * 0.26, 0.004, 14).rotateX(Math.PI / 2), 0x2a1e1c, [[0.01, h * 0.6, z * 1.1]]);
      decorate(panel, new CylinderGeometry(r * 0.2, r * 0.2, 0.004, 14).rotateX(Math.PI / 2), 0xe0b090, [[0.03, h * 0.55, z * 1.2]]);
      decorate(panel, new BoxGeometry(w * 0.6, h * 0.18, 0.004), MAGENTA, [[0, h * 0.14, z * 1.2]]);
    }
    if (kind === "sea") decorate(panel, new BoxGeometry(w - 0.05, h * 0.08, 0.004), CYAN, [[0, h * 0.25, z * 1.2], [0, h * 0.45, z * 1.2]]);
  };

  // The poster wall, layer on layer, corners peeling; the street lamp and the wet cobbles.
  box(2.8, 2.6, 0.25, 0x3a3440, 0, G, -1.75, { delay: 0.1, ink: 1.02 });
  (
    [
      [-0.95, 0.75, 0.62, 0.86, "face", 0.06],
      [-0.25, 1.2, 0.7, 0.95, "sun", -0.04],
      [0.55, 0.8, 0.6, 0.82, "sea", 0.05],
      [1.05, 1.55, 0.5, 0.7, "face", -0.08],
      [-0.6, 1.85, 0.5, 0.55, "sea", 0.1],
    ] as [number, number, number, number, "sun" | "face" | "sea", number][]
  ).forEach(([x, y, w, h, kind, lean], i) => {
    const poster = box(w, h, 0.01, CREAM, x, G + y - h / 2, -1.62 + i * 0.002, { delay: 0.15 + i * 0.03, noInk: true, rotation: [0, 0, lean] });
    ad(poster, kind, w, h, 0.006);
    decorate(poster, new ConeGeometry(0.08, 0.12, 3).scale(1, 1, 0.1), 0xd8cfb8, [[w / 2 - 0.05, h - 0.06, 0.02, 0.6]]);
  });
  lamp(kit, -1.65, 0.3, G, 0.3, 2.4);
  puddle(kit, 0.9, 1.15, G, 0.4, 0.35, MAGENTA);
  puddle(kit, -0.8, 1.35, G, 0.45, 0.28, CYAN);

  // Affissione, strapped into his adverts.
  const theta = 0.3;
  const man = figure(kit, {
    x: 0.1,
    z: 0.3,
    y: G,
    facing: theta,
    height: 2.5,
    build: "broad",
    skin: 0xc89070,
    hair: { style: "short", color: 0x2a201c },
    face: { mouth: "neutral", brows: "calm", beard: "stubble", beardColor: 0x2a201c },
    headwear: { kind: "cap", color: 0x5a5048 },
    top: { kind: "jacket", color: 0x23304a, accent: 0xd8d0b8, sleeves: "short" },
    bottom: { kind: "trousers", color: 0x2a2c38 },
    shoes: 0x1f1d22,
    arms: [
      [-0.64, 0.95, 0.12],
      [0.64, 0.95, 0.12],
    ],
    delay: 0.8,
  });
  const at = man.at;
  /** A framed panel standing at a point of his body, facing the way he faces (or behind). */
  const panel = (lx: number, ly: number, lz: number, w: number, h: number, kind: "sun" | "face" | "sea" | "blank", lean: number, delay: number, back = false) => {
    const part = box(w, h, 0.03, METAL, ...at(lx, ly, lz), { delay });
    part.rotation.order = "YXZ";
    part.rotation.set(0, theta + (back ? Math.PI : 0), lean);
    ad(part, kind, w, h, 0.016);
    return part;
  };
  // Upper arms, forearms (two-faced, they flip), chest, and the blank one on his back.
  [-1, 1].forEach((side, i) => panel(side * 0.6, 1.33, 0.18, 0.24, 0.36, i ? "face" : "sea", side * 0.32, 1.3 + i * 0.03));
  const flips = [-1, 1].map((side, i) => {
    const part = panel(side * 0.68, 0.97, 0.2, 0.2, 0.28, i ? "sun" : "face", 0, 1.36 + i * 0.03);
    ad(part, i ? "sea" : "sun", 0.2, 0.28, -0.016);
    return part;
  });
  panel(0, 1.1, 0.36, 0.56, 0.5, "sun", 0, 1.4);
  panel(0, 1.05, -0.36, 0.56, 0.6, "blank", 0, 1.42, true);
  [-1, 1].forEach((side) => box(0.06, 0.5, 0.02, 0x5a3a28, ...at(side * 0.2, 1.58, 0.34), { delay: 1.44, rotation: [0, theta, 0] }));
  // The paste tube on his back, the bucket and brush at his feet.
  const tube = add(new CylinderGeometry(0.11, 0.11, 0.8, 14), 0x8a8a7a, ...at(-0.3, 1.25, -0.42), { delay: 1.46 });
  tube.rotation.order = "YXZ";
  tube.rotation.set(-0.15, theta, 0.35);
  cylinder(0.17, 0.14, 0.32, 0x5a6270, ...at(-0.8, 0, 0.45), { delay: 1.5 }, 14);
  cylinder(0.15, 0.15, 0.02, 0xe8e2d0, ...at(-0.8, 0.3, 0.45), { delay: 1.52, flat: true, noInk: true }, 14);
  box(0.03, 0.5, 0.03, 0x5e4a3a, ...at(-0.75, 0.25, 0.45), { delay: 1.54, rotation: [0.4, theta, 0.2] });

  // The chest advert's hypnotic rings.
  const centre = at(0, 1.35, 0.4);
  const rings = [0, 1].map((k) =>
    add(new TorusGeometry(0.3, 0.015, 6, 28), k ? CYAN : MAGENTA, centre[0], centre[1] - 0.3, centre[2], { delay: 1.6 + k * 0.1, flat: true, noInk: true, rotation: [0, theta, 0] }),
  );

  tick((t) => {
    rings.forEach((ring, k) => {
      const u = (t * 0.45 + k * 0.5) % 1;
      const s = 1.25 + u * 1.2;
      const mesh = ring.children[0];
      mesh.scale.set(s, s, 1);
      mesh.position.y = 0.3 - 0.3 * s;
      mesh.visible = u < 0.85;
    });
    // Every four seconds the forearm adverts turn to the next client.
    const turn = Math.floor(t / 4) * Math.PI + Math.PI * Math.min(1, Math.max(0, (t % 4) - 3.5) / 0.5);
    flips.forEach((part) => part.rotation.set(0, theta + turn, 0));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
