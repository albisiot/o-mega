import { BoxGeometry, ConeGeometry, Group, SphereGeometry, type Mesh, type MeshBasicMaterial } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, lamp, puddle } from "@/lib/diorama-props";

/**
 * Normal (P221): a rainy neon street at closing time outside the land registry office. The
 * clerk in a grey coat, bag on her shoulder, hand on the strap, looks out tired and plain; behind
 * her, see-through and magenta, rises what she really is, a creature from the rift with glowing
 * eyes and hair of living wires, swaying where she cannot see it. A neighbour under an umbrella
 * waves hello; she does not wave back.
 */
export function normal(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x262634, 0x1a1a26, 0.35);

  // The street: neon-lit fronts, the registry's plain door with a blank brass plaque.
  const left = box(1.7, 3.0, 0.3, 0x2a2f4a, -0.95, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(left, new BoxGeometry(0.22, 0.3, 0.01), MAGENTA, [
    [-0.5, 1.9, 0.155],
    [0.1, 2.5, 0.155],
    [0.5, 1.9, 0.155],
  ]);
  decorate(left, new BoxGeometry(0.22, 0.3, 0.01), CYAN, [[-0.2, 2.5, 0.155]]);
  decorate(left, new BoxGeometry(0.5, 0.95, 0.012), 0x1a1c2a, [[0.2, 0.475, 0.155]]);
  decorate(left, new BoxGeometry(0.22, 0.14, 0.015), 0xc9a040, [[-0.3, 0.95, 0.158]]);
  const right = box(1.5, 2.4, 0.3, 0x23283e, 0.75, G, -1.45, { delay: 0.14, ink: 1.02 });
  decorate(right, new BoxGeometry(0.18, 0.26, 0.01), MAGENTA, [
    [-0.4, 1.0, 0.155],
    [0.35, 1.7, 0.155],
  ]);
  decorate(right, new BoxGeometry(0.18, 0.26, 0.01), 0x141a26, [
    [0.35, 1.0, 0.155],
    [-0.4, 1.7, 0.155],
  ]);
  box(0.22, 0.9, 0.06, MAGENTA, 0.15, G + 0.6, -1.28, { delay: 0.3, flat: true });
  const light = lamp(kit, 1.75, -0.55, G, 0.3, 2.3, YELLOW);
  puddle(kit, 0.85, 1.15, G, 0.4, 0.42, MAGENTA);
  puddle(kit, -0.95, 1.3, G, 0.45, 0.32, CYAN);

  // The neighbour under the umbrella, waving.
  const neighbour = figure(kit, {
    x: -1.4,
    z: -0.75,
    y: G,
    facing: 0.7,
    height: 2.15,
    build: "heavy",
    skin: 0xc89070,
    hair: { style: "short", color: 0x5a5048 },
    face: { mouth: "grin", brows: "raised", beard: "moustache", beardColor: 0x5a5048 },
    top: { kind: "coat", color: 0x23404b },
    bottom: { kind: "trousers", color: 0x2a2c38 },
    arms: [[-0.25, 1.75, 0.25], "wave"],
    delay: 0.5,
  });
  const grip = neighbour.hands[0];
  cylinder(0.015, 0.015, 0.95, INK, grip[0], grip[1] - 0.1, grip[2], { delay: 0.9, noInk: true }, 6);
  add(new ConeGeometry(0.6, 0.3, 8), 0x2a2838, grip[0], grip[1] + 0.82, grip[2], { delay: 0.95 });

  // Normal, hand on her bag's strap.
  const facing = 0.3;
  const her = figure(kit, {
    x: 0.0,
    z: 0.45,
    y: G,
    facing,
    height: 2.35,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "bob", color: 0x2a201c },
    face: { mouth: "neutral", brows: "worried" },
    top: { kind: "coat", color: 0x5a5e68, accent: 0xe0d0b0 },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    shoes: INK,
    arms: [[0.1, 1.4, 0.3], "down"],
    delay: 0.8,
  });
  const { at } = her;
  box(0.36, 0.3, 0.13, INK, ...at(0.42, 0.78, 0.06), { delay: 1.3, rotation: [0, facing, 0.05] });
  cable(kit, [at(0.26, 1.7, 0.04), at(0.18, 1.45, 0.28), at(0.38, 1.1, 0.14)], 0.02, INK, 1.35);

  // What she is: a see-through creature rising behind her, eyes lit, hair of living wires.
  const ghost = new Group();
  const H: Point = at(0.45, 2.75, -0.5);
  ghost.position.set(...H);
  const see = (part: Group, opacity: number) => {
    const material = (part.children[0] as Mesh).material as MeshBasicMaterial;
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
    part.position.sub(ghost.position);
    ghost.add(part);
    return material;
  };
  const yaw = facing + 0.5;
  const fades = [
    see(add(new ConeGeometry(0.6, 1.4, 14, 1, true), 0xb03080, H[0], H[1] - 1.7, H[2], { delay: 1.5, flat: true, noInk: true }), 0.35),
    see(add(new SphereGeometry(0.38, 18, 14).scale(0.85, 1.15, 0.95), 0xff5aa8, H[0], H[1] - 0.44, H[2], { delay: 1.55, flat: true, noInk: true, rotation: [0, yaw, 0] }), 0.6),
  ];
  const head = ghost.children[1] as Group;
  decorate(head, new BoxGeometry(0.12, 0.045, 0.02), 0xffffff, [
    [-0.1, 0.48, 0.33, 0.2],
    [0.1, 0.48, 0.33, -0.2],
  ]);
  // The wires: from the back of its head, out and down in waves.
  const wires = new Group();
  ghost.add(wires);
  for (let i = 0; i < 9; i++) {
    // Round the back and the sides only, away from the camera at rest.
    const a = 1.9 + (i / 8) * 3.0;
    const points: Point[] = [0, 1, 2, 3, 4].map((k) => {
      const r = 0.22 + k * (0.17 + (i % 3) * 0.03);
      const wave = Math.sin(k * 1.7 + i) * 0.1;
      return [H[0] + Math.sin(a + wave) * r, H[1] - 0.25 + 0.26 * k - 0.1 * k * k + wave, H[2] + Math.cos(a + wave) * r];
    });
    const strand = cable(kit, points, 0.022, MAGENTA, 1.6 + i * 0.03);
    (strand.children[1] as Mesh).visible = false;
    fades.push(see(strand, 0.85));
    wires.add(strand);
  }
  her.parts[0].parent?.add(ghost);

  // Rain.
  const rain = Array.from({ length: 14 }, (_, i) => box(0.012, 0.22, 0.012, 0x9fd8ff, -1.8 + ((i * 37) % 36) / 10, G + 3, -0.7 + ((i * 53) % 26) / 10, { delay: 1.4, flat: true, noInk: true }));

  tick((t) => {
    // It sways behind her and fades and returns; its wires stir.
    ghost.position.x = H[0] + Math.sin(t * 0.7) * 0.06;
    ghost.position.y = H[1] + Math.sin(t * 1.1) * 0.04;
    const fade = 0.75 + Math.sin(t * 0.9) * 0.25;
    fades.forEach((material, i) => (material.opacity = (i === 0 ? 0.35 : i === 1 ? 0.6 : 0.85) * fade));
    wires.rotation.y = Math.sin(t * 1.3) * 0.12;
    rain.forEach((drop, i) => (drop.position.y = G + 0.05 + (1 - ((t * 1.6 + i * 0.37) % 1)) * 3.2));
    light.visible = Math.floor(t * 6) % 19 !== 7;
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
