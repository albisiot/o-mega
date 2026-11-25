import { BoxGeometry, Color, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, YELLOW, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, shade } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Stazza (P249): the amphibian co-pilot in the engine room of his freighter, a furnace glowing
 * orange behind him with a gauge on its flue, pipes and a valve wheel on the wall. Huge and
 * calm, a magenta frill round his neck, he holds a giant wrench across his chest and grumbles
 * in bubbles that rise from the corner of his mouth: everything is fine, he says, while a
 * patched pipe puffs steam and the gauge wobbles. He would never hurt a fly: one buzzes round
 * his head undisturbed.
 */
export function stazza(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SKIN = 0x6a7a6a;
  const PALE = 0xc8c0a0;
  const STEEL = 0x8a93a3;
  const WALL = 0x262a36;
  const F = octagonBase(kit, 0x1e202a);
  const G = floor(kit, F, 0.06, 0x2e3440, 0x1e222c, 0.25);

  // The engine room: the back wall, its pipes and a valve wheel.
  box(3.1, 2.9, 0.15, WALL, 0, G, -1.6, { delay: 0.06, ink: 1.02 });
  [
    [2.4, 0.09, 0x7a2a5a],
    [2.0, 0.07, 0x2a6a7a],
    [0.6, 0.1, 0x3a3a48],
  ].forEach(([y, r, color], i) => add(new CylinderGeometry(r, r, 3.0, 12).rotateZ(Math.PI / 2), color, 0, G + y - r, -1.42, { delay: 0.1 + i * 0.04 }));
  cylinder(0.08, 0.08, 2.4, 0x3a3a48, -1.45, G, -1.3, { delay: 0.2 }, 12);
  const wheel = add(new TorusGeometry(0.14, 0.025, 6, 18), MAGENTA, -1.45, G + 1.16, -1.17, { delay: 0.24, rotation: [0, 0.35, 0] });
  decorate(wheel, new BoxGeometry(0.26, 0.02, 0.02), 0x5a1e40, [
    [0, 0.165, 0],
    [0, 0.165, 0, Math.PI / 2],
  ]);
  // The gauge, on the furnace's flue.
  const DX = 1.2 + 0.14 * Math.sin(0.35);
  const DY = G + 1.62;
  const DZ = -1.05 + 0.14 * Math.cos(0.35);
  const dial = add(new CylinderGeometry(0.17, 0.17, 0.05, 20).rotateX(Math.PI / 2), 0xe8e2d0, DX, DY, DZ, { delay: 0.28, rotation: [0, 0.35, 0] });
  decorate(dial, new BoxGeometry(0.1, 0.03, 0.01), CYAN, [[-0.07, 0.24, 0.027, 0.5]]);
  decorate(dial, new BoxGeometry(0.1, 0.03, 0.01), MAGENTA, [[0.07, 0.24, 0.027, -0.5]]);
  const needle = box(0.018, 0.13, 0.01, INK, DX + 0.03 * Math.sin(0.35), DY + 0.17, DZ + 0.03 * Math.cos(0.35), { delay: 0.32, flat: true, noInk: true, rotation: [0, 0.35, 0.4] });
  // The patched joint on the teal pipe, puffing steam.
  add(new CylinderGeometry(0.1, 0.1, 0.18, 12).rotateZ(Math.PI / 2), 0xd8d2c4, 0.45, G + 1.83, -1.42, { delay: 0.34 });
  const steam = [0, 1, 2].map((k) => ball(0.08 + k * 0.03, 0xe8f4f8, 0.45 + k * 0.05, G + 2.0 + k * 0.12, -1.35 + k * 0.08, { delay: 0.4 + k * 0.03, flat: true, noInk: true }));

  // The furnace, its grate glowing, a flue up to the ceiling.
  const furnace = box(0.9, 1.4, 0.7, 0x2a2430, 1.2, G, -1.05, { delay: 0.14, rotation: [0, -0.3, 0] });
  const grate = decorate(furnace, new BoxGeometry(0.56, 0.42, 0.01), ORANGE, [[0, 0.55, 0.352]]);
  decorate(furnace, new BoxGeometry(0.04, 0.42, 0.012), 0x1a1620, [-0.18, -0.06, 0.06, 0.18].map((x) => [x, 0.55, 0.356] as Point));
  cylinder(0.12, 0.12, 1.5, 0x3a3440, 1.2, G + 1.4, -1.05, { delay: 0.2 }, 12);

  // Stazza: huge, in his overalls, the wrench across his chest.
  const H = 0.3;
  const pilot = figure(kit, {
    x: -0.2,
    z: 0.35,
    y: G,
    facing: H,
    height: 2.75,
    build: "heavy",
    skin: SKIN,
    hair: { style: "bald", color: SKIN },
    face: { blank: true },
    top: { kind: "uniform", color: 0x23404b, accent: 0x6a7a80 },
    bottom: { kind: "trousers", color: 0x1e3640 },
    shoes: 0x2a2a30,
    belt: 0x3a3028,
    gloves: SKIN,
    arms: [[-0.32, 1.25, 0.5], [0.3, 1.7, 0.52]],
    delay: 0.8,
  });
  const P = pilot.at;
  const turned: [number, number, number] = [0, H, 0];
  pilot.headPart.visible = false;
  // His toad's head: a wide skull over a pale jaw, a long mouth, bulging half-closed eyes.
  const hy = pilot.head[1] - G;
  const skull = add(new SphereGeometry(0.37, 18, 14).scale(1.3, 0.78, 1.15), SKIN, ...P(0, hy - 0.26, 0.04), { delay: 1.3, rotation: turned });
  decorate(skull, new TorusGeometry(0.43, 0.014, 4, 24, 1.9).rotateX(Math.PI / 2).rotateY(-(Math.PI / 2 - 0.95)).scale(1.07, 1, 0.95), INK, [[0, 0.204, 0]]);
  add(new SphereGeometry(0.37, 16, 12).scale(1.2, 0.55, 1.05), PALE, ...P(0, hy - 0.4, 0.09), { delay: 1.28, rotation: turned });
  [-1, 1].forEach((side) => {
    const eye = ball(0.12, SKIN, ...P(side * 0.235, hy + 0.12, 0.25), { delay: 1.34, rotation: turned });
    decorate(eye, new CylinderGeometry(0.054, 0.054, 0.02, 12).rotateX(Math.PI / 2), INK, [[0, 0.1, 0.11]]);
    decorate(eye, new BoxGeometry(0.024, 0.024, 0.01), 0xf4f0e6, [[0.018, 0.12, 0.124]]);
    const lid = add(new SphereGeometry(0.127, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), shade(SKIN, 0.8), ...P(side * 0.235, hy + 0.272, 0.25), { delay: 1.36 });
    lid.rotation.order = "YXZ";
    lid.rotation.set(0.45, H, 0);
  });
  // The frill round his neck, ribbed.
  add(new CylinderGeometry(0.62, 0.34, 0.14, 22).scale(1, 1, 0.85), 0xb02a68, ...P(0, hy - 0.52, -0.02), { delay: 1.24, rotation: turned });
  for (let k = 0; k < 9; k++) {
    const a = 0.7 + (k / 8) * (Math.PI * 2 - 1.4);
    ball(0.075, k % 2 ? 0xe04a8a : 0xb02a68, ...P(Math.sin(a) * 0.6, hy - 0.42, Math.cos(a) * 0.52 - 0.02), { delay: 1.26 + k * 0.01 });
  }
  // Big hands, and the tool belt's pouches.
  pilot.hands.forEach((hand, i) => ball(0.15, SKIN, hand[0], hand[1] - 0.13, hand[2], { delay: 1.4 + i * 0.02 }));
  [-0.42, 0.42].forEach((lx, i) => {
    box(0.18, 0.22, 0.12, 0x3a3028, ...P(lx, 0.98, 0.34), { delay: 1.42 + i * 0.02, rotation: [0, H + lx * 0.6, 0] });
    cylinder(0.025, 0.025, 0.14, CYAN, ...P(lx + 0.04, 1.18, 0.34), { delay: 1.46 }, 6);
  });
  // The giant wrench, built upright and then laid across him.
  const from: Point = P(-0.6, 1.04, 0.5);
  const to: Point = P(0.62, 1.94, 0.54);
  const { length, rotation } = aim(from, to);
  const wrench = [
    box(0.08, length, 0.05, STEEL, 0, 0, 0, { delay: 1.5 }),
    box(0.36, 0.14, 0.09, STEEL, 0, length, 0, { delay: 1.52 }),
    box(0.09, 0.26, 0.09, STEEL, 0.13, length + 0.12, 0, { delay: 1.54 }),
    box(0.08, 0.16, 0.08, shade(STEEL, 0.8), -0.08, length + 0.12, 0, { delay: 1.56 }),
    add(new TorusGeometry(0.06, 0.025, 6, 14), STEEL, 0, -0.09, 0, { delay: 1.5 }),
  ];
  const tool = new Group();
  wrench[0].parent?.add(tool);
  wrench.forEach((part) => tool.add(part));
  tool.position.set(...from);
  tool.rotation.set(...rotation);

  // The fly he would never swat, and his bubbles.
  const fly = ball(0.045, INK, 0, 0, 0, { delay: 1.7, flat: true });
  const wings = add(new BoxGeometry(0.13, 0.012, 0.05), 0xdfefff, 0, 0, 0, { delay: 1.72, flat: true, noInk: true });
  const mouth = P(0.45, hy - 0.06, 0.25);
  const bubbles = [0, 1, 2, 3].map((k) => ball(0.035 + k * 0.01, 0xbfefff, mouth[0], mouth[1], mouth[2], { delay: 1.75 + k * 0.04 }));

  const [cx, cyHead, cz] = pilot.head;
  const glowA = new Color(ORANGE);
  const glowB = new Color(YELLOW);
  tick((t) => {
    grate.color.lerpColors(glowA, glowB, (Math.sin(t * 7) * Math.sin(t * 2.3) + 1) / 4);
    needle.rotation.z = 0.4 + Math.sin(t * 9) * 0.06 + Math.sin(t * 1.3) * 0.12;
    steam.forEach((puff, k) => puff.children[0].scale.setScalar(0.6 + ((t * 0.8 + k * 0.33) % 1) * 0.7));
    const a = t * 2.2;
    const fx = cx + Math.cos(a) * 0.65;
    const fy = cyHead + 0.35 + Math.sin(a * 2.3) * 0.08;
    const fz = cz + Math.sin(a) * 0.6;
    fly.position.set(fx, fy - 0.045, fz);
    wings.position.set(fx, fy + 0.01, fz);
    wings.rotation.y = -a;
    wings.children[0].scale.set(1, 1, 0.3 + Math.abs(Math.sin(t * 40)));
    bubbles.forEach((bubble, k) => {
      const u = (t * 0.25 + k / 4) % 1;
      bubble.position.set(mouth[0] + Math.sin(t * 2 + k) * 0.05 + u * 0.15, mouth[1] + u * 1.0, mouth[2]);
      bubble.children.forEach((mesh) => mesh.scale.setScalar(0.6 + u * 0.8));
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
