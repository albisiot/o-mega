import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, type Group, type Material, type Mesh } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, lamp, puddle, ring } from "@/lib/diorama-props";

/**
 * Preavviso (P347): the getaway driver on a wet night street beside her red car, door flung
 * open, short dark hair with sunglasses pushed up, a maroon jacket and black gloves, pointing
 * left: a dashed magenta line curves that way. Straight ahead, where the car would be in three
 * seconds, a see-through cyan crate falls again and again onto a target, and glimpses of
 * herself turn their heads round her. The price: she cannot sneak anywhere, the exhaust
 * backfires in loud puffs.
 */
export function preavviso(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const RED = 0x8a1e3a;
  const RED_DARK = 0x5e1428;
  const GLASS = 0x16303e;
  const F = octagonBase(kit, 0x16141e);
  const G = floor(kit, F, 0.06, 0x24262e, 0x1c1e26, 0);
  /** See-through: a part's colour fades, its ink goes. */
  const ghostly = (part: Group, opacity: number) => {
    const material = (part.children[0] as Mesh).material as Material;
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
    part.children.slice(1).forEach((child) => (child.visible = false));
    return part;
  };

  // The street: lane dashes, puddles catching the lights, a lamp.
  for (let x = -1.9; x < 2; x += 0.6) box(0.32, 0.006, 0.07, 0xd8d4c8, x, G, -0.05, { delay: 0.1, flat: true, noInk: true });
  puddle(kit, -0.6, 1.35, G, 0.2, 0.35, MAGENTA);
  puddle(kit, 1.55, 0.55, G, 0.22, 0.3, 0xff3040);
  lamp(kit, -1.0, -1.7, G, 0.25, 2.4, MAGENTA);

  // Her car, nose to the left, the driver's door open towards us.
  const CZ = -0.8;
  const body = box(2.1, 0.36, 0.95, RED, 0.15, G + 0.12, CZ, { delay: 0.3 });
  decorate(body, new BoxGeometry(2.1, 0.05, 0.01), MAGENTA, [
    [0, 0.2, 0.48],
    [0, 0.2, -0.48],
  ]);
  const cabin = box(1.0, 0.32, 0.85, RED_DARK, 0.35, G + 0.48, CZ, { delay: 0.36 });
  decorate(cabin, new BoxGeometry(0.86, 0.2, 0.87), GLASS, [[0, 0.17, 0]]);
  decorate(cabin, new BoxGeometry(1.02, 0.2, 0.7), GLASS, [[0, 0.17, 0]]);
  [-0.6, 0.85].forEach((x) =>
    [CZ - 0.47, CZ + 0.47].forEach((z, k) => add(new CylinderGeometry(0.2, 0.2, 0.12, 14).rotateX(Math.PI / 2), INK, x, G, z, { delay: 0.4 + k * 0.02 })),
  );
  [CZ - 0.28, CZ + 0.28].forEach((z, k) => {
    box(0.03, 0.08, 0.2, YELLOW, -0.91, G + 0.32, z, { delay: 0.45 + k * 0.02, flat: true, noInk: true });
    box(0.03, 0.07, 0.22, 0xff3040, 1.21, G + 0.33, z, { delay: 0.46 + k * 0.02, flat: true, noInk: true });
  });
  const door = add(new BoxGeometry(0.7, 0.42, 0.05).translate(0.35, 0, 0), RED, -0.15, G + 0.14, CZ + 0.48, { delay: 0.5, rotation: [0, -1.0, 0] });
  decorate(door, new BoxGeometry(0.5, 0.16, 0.06), GLASS, [[0.38, 0.32, 0]]);
  add(new CylinderGeometry(0.04, 0.04, 0.14, 8).rotateZ(Math.PI / 2), 0x5a5e6a, 1.25, G + 0.1, CZ - 0.3, { delay: 0.52 });

  // The danger she has already seen: a ghost crate dropping where the car would be.
  const target: Point = [-1.75, G + 0.004, -1.0];
  const mark = ring(kit, target, 0.32, CYAN, 0.6);
  ring(kit, target, 0.16, CYAN, 0.62);
  const crate = ghostly(box(0.45, 0.45, 0.45, CYAN, target[0], G + 2.6, target[2], { delay: 0.7, flat: true, rotation: [0.3, 0.5, 0.2] }), 0.45);
  [0.5, 0.95, 1.4, 1.85, 2.3].forEach((y, k) => box(0.03, 0.2, 0.03, CYAN, target[0], G + y, target[2], { delay: 0.65 + k * 0.02, flat: true, noInk: true }));
  decorate(crate, new BoxGeometry(0.47, 0.03, 0.47), 0xb8f4ff, [
    [0, 0.12, 0],
    [0, 0.33, 0],
  ]);

  // The way she will take: dashes curving left, ending in an arrowhead.
  const route: Point[] = [[-1.0, G, -0.75], [-1.3, G, -0.6], [-1.45, G, -0.28], [-1.5, G, 0.12], [-1.48, G, 0.52]];
  const dashes = route.map((p, k) => {
    const next = route[Math.min(k + 1, route.length - 1)];
    const prev = route[Math.max(k - 1, 0)];
    const turn = Math.atan2(-(next[2] - prev[2]), next[0] - prev[0]);
    return box(0.22, 0.008, 0.07, MAGENTA, p[0], G, p[2], { delay: 0.8 + k * 0.04, flat: true, noInk: true, rotation: [0, turn, 0] });
  });
  dashes.push(add(new ConeGeometry(0.16, 0.3, 3).rotateX(Math.PI / 2).scale(1, 0.05, 1), MAGENTA, -1.47, G, 0.85, { delay: 1.0, flat: true, noInk: true }));

  // Preavviso, pointing the way over the open door.
  const facing = 0.3;
  const driver = figure(kit, {
    x: 0.75,
    z: 0.4,
    y: G,
    facing,
    height: 2.35,
    build: "slim",
    skin: 0xe8bca0,
    hair: { style: "short", color: 0x1a1820 },
    face: { mouth: "neutral", brows: "angry" },
    top: { kind: "jacket", color: RED, accent: RED_DARK },
    bottom: { kind: "trousers", color: 0x1e2230 },
    shoes: 0x16141a,
    gloves: 0x16141a,
    arms: ["out", "hip"],
    delay: 0.8,
  });
  const shades = box(0.32, 0.05, 0.09, INK, ...driver.at(0, driver.top - G + 0.03, 0.04), { delay: 1.3 });
  shades.rotation.order = "YXZ";
  shades.rotation.set(-0.35, facing, 0);
  decorate(shades, new BoxGeometry(0.1, 0.02, 0.01), CYAN, [
    [-0.08, 0.035, 0.046],
    [0.08, 0.035, 0.046],
  ]);

  // Glimpses of herself, see-through, turning their heads to the next danger.
  const glimpses = [
    [-0.5, 2.0, -0.32, CYAN, 0.7],
    [0.58, 2.15, -0.28, 0x9b5cff, -0.8],
  ].map(([lx, ly, lz, color, look], k) => {
    const at = driver.at(lx, ly, lz);
    const parts = [
      add(new SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 0.7), color, at[0], at[1] - 0.48, at[2], { delay: 1.5 + k * 0.1, flat: true }),
      ball(0.2, color, at[0], at[1] - 0.2, at[2], { delay: 1.55 + k * 0.1, flat: true }),
      add(new SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), 0x2a3a6a, at[0], at[1] + 0.033, at[2] - 0.02, { delay: 1.58 + k * 0.1, flat: true }),
    ].map((part) => ghostly(part, 0.4));
    decorate(parts[1], new BoxGeometry(0.05, 0.025, 0.02), 0xe8f8ff, [
      [-0.07, 0.22, 0.195],
      [0.07, 0.22, 0.195],
    ]);
    parts[1].rotation.y = facing + (look as number);
    return { parts, rest: parts.map((part) => part.position.y), look: look as number };
  });

  // Puffs from the exhaust.
  const puffs = [0, 1, 2].map((k) => ({ part: ball(0.09, 0x6a6480, 1.3, G + 0.05, CZ - 0.3, { delay: 1.2 + k * 0.05, noInk: true }), phase: k / 3 }));

  tick((t) => {
    const s = (t / 3 + 0.6) % 1;
    crate.position.y = G + 0.004 + 2.6 * (1 - s * s);
    crate.visible = s < 0.97;
    mark.children[0].scale.setScalar(1 + Math.sin(t * 6) * 0.08);
    dashes.forEach((dash, k) => (dash.visible = Math.floor(t * 4) % 6 !== k));
    glimpses.forEach(({ parts, rest, look }, g) => {
      parts.forEach((part, k) => (part.position.y = rest[k] + Math.sin(t * 1.2 + g * 2) * 0.05));
      parts[1].rotation.y = facing + look * (0.8 + 0.3 * Math.sin(t * 0.8 + g));
    });
    puffs.forEach(({ part, phase }) => {
      const u = (t * 0.9 + phase) % 1;
      part.position.set(1.3 + u * 0.7, G + 0.05 + u * 0.3, CZ - 0.3 - u * 0.1);
      part.children[0].scale.setScalar(0.6 + u * 1.6);
      part.visible = u < 0.9;
    });
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
