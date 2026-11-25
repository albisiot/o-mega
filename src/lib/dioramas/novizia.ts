import { BoxGeometry, Color, CylinderGeometry, DodecahedronGeometry, ExtrudeGeometry, Group, Shape, Vector3, type BufferGeometry } from "three";
import { CYAN, MAGENTA, YELLOW, aim, archMouth, archedWall, colorOf, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor } from "@/lib/diorama-props";

/**
 * Novizia (P251): the half-trained apprentice of the Silent Blade on an old metro platform
 * among classical columns, the tunnel mouth lit magenta behind the tracks. In a low, calm guard
 * she holds her double glaive with its two glowing crescent blades, while chunks of stone float
 * round her on the Trama. Her sparring partner, a hulking iron automaton far stronger than her,
 * has just been beaten: it slumps with its panel open and sparking, and the screwdriver she
 * tried to fix it with lies on the floor, useless in her hands.
 */
export function novizia(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0x4a5068;
  const IRON = 0x4a4f5c;
  const IRON_DARK = 0x33363f;
  const F = octagonBase(kit, 0x1f1d2a);
  const G = floor(kit, F, 0.06, 0x2c2a3a, 0x1e1c2a, 0.4);

  // The tunnel at the back: a wall with its arch, the dark mouth with lights, and the rails.
  add(archedWall(3.0, 2.9, 0.25, { x: 0.5, half: 0.55, spring: 1.0 }), 0x2a2a3e, 0, G, -1.65, { delay: 0.06, ink: 1.02 });
  const mouth = add(archMouth(0.55, 1.0), 0x14121c, 0.5, G, -1.8, { delay: 0.1, flat: true, noInk: true });
  decorate(mouth, new BoxGeometry(0.08, 0.04, 0.01), MAGENTA, [
    [-0.3, 1.2, 0.03],
    [0, 1.4, 0.03],
    [0.3, 1.2, 0.03],
  ]);
  [-1.45, -1.25].forEach((z, i) => box(2.6, 0.04, 0.04, 0x8a93a3, 0, G, z, { delay: 0.12 + i * 0.02, noInk: true }));
  box(3.0, 0.02, 0.06, CYAN, 0, G, -1.05, { delay: 0.16, flat: true, noInk: true });
  column(kit, -1.55, -0.55, G, 0.14, 2.9, false, 0x4a5a78);
  column(kit, -0.7, -1.35, G, 0.18, 2.9, false, 0x4a5a78);

  // The automaton: a heavy iron sparring partner, slumped, its chest panel open and sparking.
  const AX = 1.25;
  const AZ = -0.25;
  cylinder(0.38, 0.45, 0.25, IRON_DARK, AX, G, AZ, { delay: 0.3 }, 12);
  const chest = box(0.8, 0.85, 0.55, IRON, AX, G + 0.25, AZ, { delay: 0.34, rotation: [0.2, -0.5, 0.12] });
  decorate(chest, new BoxGeometry(0.3, 0.3, 0.01), 0x14121c, [[0.1, 0.45, 0.28]]);
  decorate(chest, new CylinderGeometry(0.05, 0.05, 0.02, 10).rotateX(Math.PI / 2), 0x8a93a3, [
    [-0.28, 0.72, 0.28],
    [0.28, 0.72, 0.28],
    [-0.28, 0.15, 0.28],
  ]);
  const head = box(0.34, 0.28, 0.3, IRON_DARK, AX - 0.12, G + 1.1, AZ + 0.12, { delay: 0.4, rotation: [0.5, -0.5, 0.35] });
  const eye = decorate(head, new BoxGeometry(0.2, 0.05, 0.01), CYAN, [[0, 0.15, 0.155]]);
  box(0.3, 0.12, 0.12, IRON_DARK, AX + 0.32, G + 0.15, AZ + 0.6, { delay: 0.42, rotation: [0, -0.3, 0] });
  // Its heavy arm hangs, the great fist resting on the floor; the other arm lies across its lap.
  limb(kit, [AX - 0.42, G + 0.95, AZ + 0.12], [AX - 0.55, G + 0.45, AZ + 0.45], 0.1, 0.09, IRON, { delay: 0.44 });
  limb(kit, [AX - 0.55, G + 0.45, AZ + 0.45], [AX - 0.52, G + 0.18, AZ + 0.75], 0.09, 0.08, IRON, { delay: 0.46 });
  ball(0.2, IRON_DARK, AX - 0.52, G, AZ + 0.8, { delay: 0.48 });
  limb(kit, [AX + 0.42, G + 0.9, AZ - 0.1], [AX + 0.2, G + 0.5, AZ + 0.45], 0.1, 0.09, IRON, { delay: 0.46 });
  const sparkAt: Point = [AX - 0.02, G + 0.78, AZ + 0.32];
  const sparks = [0, 1].flatMap((k) =>
    zigzag(
      kit,
      [sparkAt, [sparkAt[0] - 0.12 + k * 0.25, sparkAt[1] + 0.12, sparkAt[2] + 0.12], [sparkAt[0] - 0.05 + k * 0.3, sparkAt[1] + 0.25, sparkAt[2] + 0.2]],
      0.02,
      k ? YELLOW : CYAN,
      0.6,
    ),
  );
  // The screwdriver she gave up with.
  cylinder(0.022, 0.022, 0.22, 0x8a93a3, AX - 0.9, G + 0.02, AZ + 1.05, { delay: 0.5, rotation: [0, 0, Math.PI / 2] }, 6);
  cylinder(0.035, 0.035, 0.12, CYAN, AX - 0.68, G + 0.0, AZ + 1.05, { delay: 0.52, rotation: [0, 0, Math.PI / 2] }, 8);

  // Novizia, in a calm low guard.
  const H = 0.45;
  const pupil = figure(kit, {
    x: -0.35,
    z: 0.4,
    y: G,
    facing: H,
    height: 2.3,
    build: "slim",
    skin: 0xc89a80,
    hair: { style: "curly", color: 0x2a1418 },
    face: { mouth: "neutral", brows: "calm" },
    top: { kind: "coat", color: 0x1f5a48, accent: 0x2a6e5a },
    bottom: { kind: "trousers", color: 0x1a2a28 },
    shoes: 0x1a1a20,
    belt: 0x14201c,
    gloves: 0x1a1a20,
    scarf: 0x1f5a48,
    arms: [[-0.3, 1.72, 0.35], [0.25, 1.12, 0.4]],
    legs: "wide",
    delay: 0.8,
  });
  // The double glaive, built upright and then laid along her hands.
  const [r, l] = pupil.hands;
  const dir = [l[0] - r[0], l[1] - r[1], l[2] - r[2]];
  const span = Math.hypot(dir[0], dir[1], dir[2]);
  const mid: Point = [(r[0] + l[0]) / 2 + (dir[0] / span) * 0.1, (r[1] + l[1]) / 2 + (dir[1] / span) * 0.1, (r[2] + l[2]) / 2 + (dir[2] / span) * 0.1];
  const L = 0.95;
  const crescent = (geometry: BufferGeometry, color: number, y: number, flip: boolean, delay: number) => {
    const g = flip ? geometry.rotateZ(Math.PI) : geometry;
    g.computeBoundingBox();
    return add(g, color, 0, y + (g.boundingBox?.min.y ?? 0), 0, { delay, flat: true });
  };
  // A crescent: an outer arc from the haft's tip, an inner one that thins to a point at both ends.
  const blade = () => {
    const shape = new Shape();
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const a = (2.1 * i) / steps;
      if (i) shape.lineTo(-0.36 + 0.36 * Math.cos(a), 0.36 * Math.sin(a));
      else shape.moveTo(0, 0);
    }
    for (let i = steps; i >= 0; i--) {
      const a = (2.1 * i) / steps;
      const r = 0.36 - 0.11 * Math.sin((Math.PI * i) / steps);
      shape.lineTo(-0.36 + r * Math.cos(a), r * Math.sin(a));
    }
    return new ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015);
  };
  const glaive = [
    add(new CylinderGeometry(0.028, 0.028, 2 * L, 8), 0xb08d3c, 0, -L, 0, { delay: 1.4 }),
    ...[-0.5, 0.5].map((y) => add(new CylinderGeometry(0.04, 0.04, 0.08, 8), 0x6a5020, 0, y, 0, { delay: 1.42 })),
  ];
  const blades = [crescent(blade(), YELLOW, L, false, 1.5), crescent(blade(), YELLOW, -L, true, 1.5)];
  glaive.push(...blades);
  const staff = new Group();
  glaive[0].parent?.add(staff);
  glaive.forEach((part) => staff.add(part));
  staff.position.set(...mid);
  staff.rotation.set(...aim([0, 0, 0], [dir[0], dir[1], dir[2]]).rotation);
  // Turn it about its own haft so the blades face the camera at rest.
  const axis = new Vector3(dir[0], dir[1], dir[2]).normalize();
  const face = new Vector3(0, 0, 1).applyEuler(staff.rotation);
  const view = new Vector3(0.34, 0.35, 0.94);
  view.addScaledVector(axis, -view.dot(axis)).normalize();
  staff.rotateY(Math.atan2(new Vector3().crossVectors(face, view).dot(axis), face.dot(view)) + 0.25);

  // Stones floating round her on the Trama.
  const stones = [
    [-1.3, 0.6, 0.9, 0.12],
    [-1.0, 2.2, 0.1, 0.09],
    [0.55, 2.5, 0.6, 0.1],
    [0.7, 0.4, 1.1, 0.13],
    [-0.2, 2.9, -0.3, 0.07],
    [0.15, 1.0, 1.35, 0.08],
  ].map(([x, y, z, size], i) => ({ part: add(new DodecahedronGeometry(size), STONE, x, G + y, z, { delay: 0.9 + i * 0.04, rotation: [i, i * 2, 0] }), y: G + y }));

  const hot = new Color(YELLOW);
  const pale = new Color(0xfff4b0);
  tick((t) => {
    stones.forEach(({ part, y }, i) => {
      part.position.y = y + Math.sin(t * 1.1 + i * 1.7) * 0.08;
      part.rotation.set(i + t * 0.3, i * 2 + t * 0.4, 0);
    });
    blades.forEach((b) => colorOf(b).lerpColors(hot, pale, (Math.sin(t * 3) + 1) / 2));
    const on = Math.floor(t * 8) % 5 !== 3;
    sparks.forEach((spark) => (spark.visible = on));
    eye.color.setHex(Math.floor(t * 3) % 7 === 4 ? 0x0b4a60 : CYAN);
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
