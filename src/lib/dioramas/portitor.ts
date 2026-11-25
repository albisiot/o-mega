import { BoxGeometry, CylinderGeometry } from "three";
import { ORANGE, archMouth, archedWall, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, flame, floor, rubble } from "@/lib/diorama-props";

/**
 * Portitor (P172): the rescuer walks out of a burning ruin with a wooden door strapped to his
 * back, a gas mask on and the lamp lit on his helmet; a child rides on his hip and a grandmother
 * in a red headscarf follows holding on to the door's knob. He carries no weapon: he does not
 * defend, he gets people out. Smoke rolls up behind him and the fires flicker in the rubble.
 */
export function portitor(kit: Kit): Framing {
  const { add, box, ball, decorate, tick, motes } = kit;
  const WOOD = 0x7a5a3c;
  const WOOD_DARK = 0x4a3628;
  const LEATHER = 0x6a3a22;
  const BRASS = 0xa8884a;
  const SMOKE = 0x4a4452;
  const F = octagonBase(kit, 0x211c22);
  const G = floor(kit, F, 0.06, 0x36303a, 0x26222b, 0.45);

  // The ruin: a burnt house front with fire in its windows, a broken arch glowing inside, rubble.
  const house = facade(kit, -0.6, -1.4, G, 0.1, { width: 2.0, height: 2.3, color: 0x3a3340, windows: 3, floors: 2, lit: ORANGE, shutters: 0x2a2530 });
  decorate(house, new BoxGeometry(0.5, 0.5, 0.01), 0x1a161c, [[0.62, 2.0, 0.16, 0.5]]);
  [-1.35, -0.95, -0.2].forEach((x, i) => add(new BoxGeometry(0.34, 0.3, 0.3), 0x3a3340, x, G + 2.3, -1.4, { delay: 0.18 + i * 0.03, rotation: [0, 0, 0.3 - i * 0.4] }));
  add(archedWall(1.3, 1.8, 0.3, { x: 0, half: 0.36, spring: 0.85 }), 0x4a4250, 1.25, G, -1.0, { delay: 0.2, rotation: [0, -0.55, 0] });
  add(archMouth(0.36, 0.85), ORANGE, 1.25 - Math.sin(-0.55) * 0.17, G, -1.0 - Math.cos(-0.55) * 0.17, { delay: 0.24, flat: true, noInk: true, rotation: [0, -0.55, 0] });
  rubble(kit, -1.45, 0.75, G, 0.3, 6, 0.35, 0x4a4250);
  rubble(kit, 1.55, -0.1, G, 0.32, 5, 0.35, 0x4a4250);
  const fires = [...flame(kit, -1.45, 0.8, G + 0.04, 0.5, 0.8), ...flame(kit, 1.75, 0.15, G + 0.05, 0.55, 0.7)];
  motes(14, ORANGE, 0.025, [-1.7, G + 0.4, -1.3], [1.7, G + 3.3, -0.4], 0.8);

  // Smoke rolling up over the ruin.
  const puffs = [
    [-1.2, 2.5, -1.3, 0.32],
    [-0.4, 2.8, -1.5, 0.4],
    [0.7, 2.4, -1.3, 0.3],
    [1.3, 2.2, -0.9, 0.34],
    [-0.9, 3.2, -1.4, 0.26],
  ].flatMap(([x, y, z, r], i) =>
    [0, 1].map((k) => {
      const [dx, dy, s] = k ? [r * 0.8, -r * 0.35, 0.7] : [0, 0, 1];
      const h = G + y + dy - r * s;
      return { part: ball(r * s, k ? 0x3e3946 : SMOKE, x + dx, h, z + 0.05 * k, { delay: 0.3 + i * 0.04, noInk: true }), y: h, phase: i * 0.23 };
    }),
  );

  // Portitor, walking out with the child on his hip.
  const theta = 0.32;
  const man = figure(kit, {
    x: 0.25,
    z: 0.35,
    y: G,
    facing: theta,
    height: 2.45,
    build: "broad",
    skin: 0xc89a7a,
    hair: { style: "short", color: 0x2a2220 },
    face: { brows: "worried", mask: "lower", maskColor: 0x4a4644 },
    headwear: { kind: "hardhat", color: 0x6a5a3a, accent: 0x4a3e2a },
    top: { kind: "coat", color: 0x585c5e, accent: 0x3e4244 },
    bottom: { kind: "trousers", color: 0x34343a },
    shoes: 0x2a2420,
    gloves: 0x2a2420,
    belt: LEATHER,
    arms: ["down", [0.36, 1.28, 0.3]],
    legs: "stride",
    delay: 0.8,
  });
  const at = man.at;
  const place = ([x, y, z]: Point) => ({ x, y, z });
  const turn: Point = [0, theta, 0];
  // The gas mask's filters and the lamp on the helmet.
  [-1, 1].forEach((side) => {
    const filter = add(new CylinderGeometry(0.075, 0.075, 0.1, 14).rotateX(Math.PI / 2), 0x6a6460, ...at(side * 0.13, 1.99, 0.23), { delay: 1.25, rotation: [0, theta + side * 0.55, 0] });
    decorate(filter, new CylinderGeometry(0.05, 0.05, 0.01, 12).rotateX(Math.PI / 2), 0x23222b, [[0, 0.075, 0.052]]);
  });
  add(new CylinderGeometry(0.06, 0.075, 0.1, 12).rotateX(Math.PI / 2), 0x4a4644, ...at(0, 1.98, 0.24), { delay: 1.27, rotation: turn });
  add(new CylinderGeometry(0.075, 0.075, 0.06, 14).rotateX(Math.PI / 2), BRASS, ...at(0, 2.27, 0.24), { delay: 1.3, rotation: turn });
  const lamp = add(new CylinderGeometry(0.055, 0.055, 0.02, 14).rotateX(Math.PI / 2), 0xfff4d0, ...at(0, 2.29, 0.28), { delay: 1.32, flat: true, noInk: true, rotation: turn });
  // The harness: straps over the shoulders to the door, a buckle on the chest.
  [-1, 1].forEach((side) => {
    limb(kit, at(side * 0.22, 1.74, 0.33), at(side * 0.2, 1.14, 0.27), 0.03, 0.03, LEATHER, { delay: 1.2 });
    limb(kit, at(side * 0.24, 1.76, 0.3), at(side * 0.26, 1.86, -0.38), 0.03, 0.03, LEATHER, { delay: 1.2 });
  });
  const strap = box(0.5, 0.06, 0.04, LEATHER, ...at(0, 1.48, 0.33), { delay: 1.22, rotation: turn });
  decorate(strap, new BoxGeometry(0.08, 0.07, 0.01), BRASS, [[0.12, 0.03, 0.025]]);
  box(0.1, 0.08, 0.03, BRASS, ...at(0, 1.1, 0.3), { delay: 1.24, rotation: turn });

  // The door on his back: planks, iron bands and a knob on the outside.
  const door = box(1.15, 1.9, 0.08, WOOD, ...at(0, 0.85, -0.47), { delay: 0.7, rotation: turn });
  const faces = [0.042, -0.042];
  decorate(door, new BoxGeometry(0.012, 1.86, 0.01), WOOD_DARK, faces.flatMap((z) => [-0.29, 0, 0.29].map((x) => [x, 0.95, z] as Point)));
  decorate(door, new BoxGeometry(1.1, 0.07, 0.012), 0x2a2826, faces.flatMap((z) => [0.3, 1.6].map((y) => [0, y, z] as Point)));
  const knob = at(-0.44, 1.62, -0.55);
  ball(0.045, BRASS, knob[0], knob[1] - 0.045, knob[2], { delay: 1.0 });

  // The child on his hip, holding his collar.
  const child = figure(kit, {
    ...place(at(0.5, 1.0, 0.24)),
    facing: theta + 0.35,
    height: 1.05,
    build: "child",
    skin: 0xdcae8c,
    hair: { style: "curly", color: 0x3a2418 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "hoodie", color: 0x23607a, accent: 0x2f7896 },
    bottom: { kind: "trousers", color: 0x2a3040 },
    shoes: 0xd8d2c4,
    arms: [[-0.2, 0.75, 0.15], "down"],
    legs: "sit",
    delay: 1.4,
  });

  // The grandmother behind him, holding on to the knob.
  figure(kit, {
    ...place(at(-0.92, 0, -0.85)),
    facing: theta + 0.25,
    height: 2.0,
    build: "heavy",
    skin: 0xd4a888,
    hair: { style: "bun", color: 0xc8c4c0 },
    face: { mouth: "frown", brows: "worried" },
    headwear: { kind: "hood", color: 0xa02a40 },
    top: { kind: "dress", color: 0x4a3a4a },
    shoes: 0x2a2226,
    arms: [[-0.35, 0.95, 0.25], [0.42, 1.5, 0.42]],
    delay: 1.6,
  });

  const walkers = [...man.parts, door, ...child.parts];
  const rest = walkers.map((part) => part.position.y);
  tick((t) => {
    // A heavy, steady walk; the fires lick; the smoke rolls up and thins out.
    const bob = Math.abs(Math.sin(t * 2.6)) * 0.025;
    walkers.forEach((part, i) => (part.position.y = rest[i] + bob));
    fires.forEach((fire, i) => {
      const k = 0.85 + 0.25 * Math.abs(Math.sin(t * 7 + i * 1.7));
      fire.children[0].scale.set(1, k, 1);
      fire.children[1]?.scale.set(1.06, 1.036 * k, 1.06);
    });
    puffs.forEach(({ part, y, phase }) => {
      const u = (t * 0.12 + phase) % 1;
      part.position.y = y + u * 0.6;
      part.children.forEach((mesh) => mesh.scale.setScalar(1 - u * 0.5));
    });
    lamp.visible = Math.floor(t * 5) % 17 !== 9;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
