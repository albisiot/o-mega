import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, TorusKnotGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { facade, floor, potted, railing } from "@/lib/diorama-props";

/**
 * Fathom (P043): on the walkway of a block of council flats at night, the hooded girl of the
 * Lanterne listens with a hand at her temple, headphones round her neck, while rings of cyan
 * spread from her head. Thoughts float out of the lit windows as bubbles (a heart, a slice of
 * pizza, a little house) and drift into her; above her head they end up as a tangled scribble,
 * because hearing what people think is not the same as understanding it.
 */
export function fathom(kit: Kit): Framing {
  const { add, ball, box, decorate, tick } = kit;
  const PARKA = 0x245a66;
  const HAIR = 0x2a1c34;
  const F = octagonBase(kit, 0x1a1c28);
  const G = floor(kit, F, 0.06, 0x2c3040, 0x1e2030, 0.36);

  // The block: three floors of windows, a balcony; a railing along the walkway, a plant.
  facade(kit, -0.1, -1.5, G, 0.1, { width: 3.0, height: 3.2, color: 0x283048, windows: 4, floors: 3, balcony: true, lit: YELLOW, shutters: 0x5a2a4a });
  railing(kit, [1.4, 1.4], [1.4, -1.25], G, 0.3, 0.85, 0x3a4a5a);
  railing(kit, [-1.5, 1.35], [-1.5, -1.2], G, 0.3, 0.85, 0x3a4a5a);
  potted(kit, 1.15, -0.95, G, 0.4, 0x2f8f4f);
  potted(kit, -1.2, 0.95, G, 0.42, 0x3a7a5a);

  // Fathom, hood up, listening.
  const D = 0.7;
  const girl = figure(kit, {
    x: 0.15,
    z: 0.35,
    y: G,
    facing: 0.4,
    height: 2.3,
    build: "slim",
    skin: 0xe6c0b0,
    hair: { style: "bob", color: HAIR },
    face: { mouth: "neutral", brows: "raised", eyes: 0x1a2a3a },
    headwear: { kind: "hood", color: PARKA },
    top: { kind: "coat", color: PARKA, accent: 0x1e2030 },
    bottom: { kind: "trousers", color: 0x1c2434 },
    shoes: 0x2a2a34,
    arms: [[-0.34, 2.0, 0.1], "hip"],
    delay: D,
  });
  const u = 2.3 / 2.4;
  // The headphones round her neck, two patches on the parka.
  add(new TorusGeometry(0.17, 0.03, 6, 20).rotateX(Math.PI / 2), 0x8a93a3, ...girl.at(0, 1.76 * u, 0.02), { delay: D + 0.4, rotation: [0.25, 0.4, 0] });
  [-1, 1].forEach((side) =>
    add(new CylinderGeometry(0.095, 0.095, 0.07, 14).rotateZ(Math.PI / 2), 0x8a93a3, ...girl.at(side * 0.2, 1.62 * u, 0.16), { delay: D + 0.42, rotation: [0, 0.4, 0] }),
  );
  [[0.25, 1.35, 0.22], [-0.05, 0.85, 0.27]].forEach(([x, y, z], i) =>
    box(0.12, 0.12, 0.02, i ? 0x1a3a46 : 0x3a6a76, ...girl.at(x, y, z), { delay: D + 0.45, rotation: [0, 0.4, i ? 0.2 : -0.1] }),
  );

  // Rings of thought spreading from her head, facing the camera at rest.
  const [hx, hy, hz] = girl.head;
  const RINGS = 3;
  const rings = Array.from({ length: RINGS }, (_, k) =>
    add(new TorusGeometry(0.4, 0.016, 6, 40), CYAN, hx, hy - 0.416, hz - 0.1, { delay: D + 0.6 + k * 0.05, flat: true, noInk: true, rotation: [0, 0.35, 0] }),
  );

  // The thoughts: bubbles with a picture each, drifting from the windows to her head.
  const BUBBLE = 0xd8f4ff;
  const bubble = (delay: number) => {
    const part = ball(0.2, BUBBLE, 0, 0, 0, { delay, flat: true });
    decorate(part, new SphereGeometry(0.05, 10, 8), BUBBLE, [[-0.24, 0, 0], [-0.33, -0.08, 0]]);
    return part;
  };
  const heart = bubble(1.3);
  decorate(heart, new BoxGeometry(0.11, 0.11, 0.02), MAGENTA, [[0, 0.17, 0.19, Math.PI / 4]]);
  decorate(heart, new CylinderGeometry(0.056, 0.056, 0.02, 12).rotateX(Math.PI / 2), MAGENTA, [[-0.04, 0.225, 0.19], [0.04, 0.225, 0.19]]);
  const pizza = bubble(1.4);
  decorate(pizza, new CylinderGeometry(0.1, 0.1, 0.02, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), ORANGE, [[0, 0.2, 0.19]]);
  decorate(pizza, new CylinderGeometry(0.02, 0.02, 0.02, 8).rotateX(Math.PI / 2), MAGENTA, [[-0.02, 0.21, 0.2], [0.025, 0.18, 0.2]]);
  const house = bubble(1.5);
  decorate(house, new BoxGeometry(0.13, 0.1, 0.02), CYAN, [[0, 0.16, 0.19]]);
  decorate(house, new ConeGeometry(0.11, 0.08, 4).rotateY(Math.PI / 4), MAGENTA, [[0, 0.25, 0.17]]);
  const thoughts: { part: Group; from: Point; phase: number }[] = [
    { part: heart, from: [-1.1, G + 2.45, -1.3], phase: 0.15 },
    { part: pizza, from: [0.65, G + 2.45, -1.3], phase: 0.5 },
    { part: house, from: [-0.35, G + 1.65, -1.3], phase: 0.82 },
  ];

  // What becomes of them: a scribble over her head.
  const muddle = add(new TorusKnotGeometry(0.12, 0.014, 70, 6, 3, 7), MAGENTA, hx, girl.top + 0.25, hz, { delay: D + 0.8, flat: true, noInk: true });
  const muddleY = muddle.position.y;

  const R = 0.416;
  tick((t) => {
    rings.forEach((ring, k) => {
      const p = (t * 0.35 + k / RINGS) % 1;
      const s = 0.9 + p * 1.6;
      // A part grows from its foot: lift the mesh so the ring grows from its centre.
      const mesh = ring.children[0];
      mesh.scale.set(s, s, 1);
      mesh.position.y = R - s * R;
      mesh.visible = p < 0.9;
    });
    thoughts.forEach(({ part, from, phase }) => {
      const p = (t * 0.12 + phase) % 1;
      const x = from[0] + (hx - from[0]) * p;
      const z = from[2] + (hz - from[2]) * p;
      const y = from[1] + (hy + 0.35 - from[1]) * p + Math.sin(p * Math.PI) * 0.35;
      part.position.set(x, y - 0.2, z);
      // It vanishes as it reaches her, and the next one sets off from its window.
      part.visible = p <= 0.86;
    });
    muddle.rotation.y = t * 0.8;
    muddle.rotation.z = Math.sin(t * 1.3) * 0.3;
    muddle.position.y = muddleY + Math.sin(t * 2) * 0.03;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
