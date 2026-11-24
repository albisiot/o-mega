import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, ORANGE, YELLOW, colorOf, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bench, floor, lamp } from "@/lib/diorama-props";

/**
 * Retrograde (P100): the old hero from the future, in a knitted cardigan over his silver suit,
 * shakes his glowing cane at the time portal swirling on the belvedere behind him: it was better
 * before. His jetpack sputters blue flame and puffs of smoke, and for all its noise lifts him a
 * hand's breadth off the paving; a pigeon pecks about under his boots, unimpressed.
 */
export function retrograde(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0x6d7f9a;
  const SILVER = 0xc8ccd4;
  const KNIT = 0x8a5a2e;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x3a3640, 0x2a2630, 0.45);

  // The old town behind: a bell tower and two houses with lit windows.
  const tower = box(0.6, 2.9, 0.5, 0x3a2f4e, -1.15, G, -1.7, { delay: 0.1, ink: 1.02 });
  decorate(tower, new BoxGeometry(0.22, 0.4, 0.01), 0x14121c, [[0, 2.45, 0.255]]);
  decorate(tower, new BoxGeometry(0.1, 0.16, 0.01), YELLOW, [
    [0, 1.6, 0.255],
    [0, 0.9, 0.255],
  ]);
  add(new ConeGeometry(0.45, 0.5, 4), 0x5a2a4a, -1.15, G + 2.9, -1.7, { delay: 0.15, rotation: [0, Math.PI / 4, 0] });
  [
    [-0.35, 1.6, 0.8, 0x2c3550],
    [0.35, 1.25, 0.7, 0x3a2a4a],
  ].forEach(([x, h, w, color], i) => {
    const house = box(w, h, 0.4, color, x, G, -1.85, { delay: 0.12 + i * 0.03, ink: 1.02 });
    decorate(house, new BoxGeometry(0.1, 0.14, 0.01), YELLOW, [
      [-w / 4, h - 0.35, 0.205],
      [w / 4, h - 0.75, 0.205],
    ]);
  });
  // The belvedere: a balustrade with two piers, a bench, a lamp.
  for (let k = 0; k < 15; k++) cylinder(0.035, 0.05, 0.5, STONE, -1.45 + k * 0.21, G, -1.45, { delay: 0.2 + k * 0.01 }, 8);
  box(3.1, 0.07, 0.14, STONE, 0.02, G + 0.5, -1.45, { delay: 0.3 });
  [-1.62, 1.68].forEach((x, i) => {
    box(0.26, 0.75, 0.26, STONE, x, G, -1.45, { delay: 0.3 + i * 0.03 });
    ball(0.1, STONE, x, G + 0.75, -1.45, { delay: 0.34 + i * 0.03 });
  });
  bench(kit, -1.35, 0.55, G, 0.4, 0.9);
  const light = lamp(kit, -1.75, -0.55, G, 0.45, 2.1, YELLOW);

  // The time portal: rings of light round a bright core, a spiral turning in it.
  const portal = new Group();
  const core = add(new CylinderGeometry(0.24, 0.24, 0.02, 24).rotateX(Math.PI / 2), 0xfff1a8, 0, -0.24, 0, { delay: 0.5, flat: true, noInk: true });
  core.parent?.add(portal);
  portal.add(core);
  portal.position.set(0.95, G + 1.3, -1.1);
  portal.rotation.y = 0.35;
  [
    [0.78, 0.04, CYAN],
    [0.6, 0.035, ORANGE],
    [0.42, 0.03, YELLOW],
  ].forEach(([r, tube, color], i) => portal.add(add(new TorusGeometry(r, tube, 6, 40), color, 0, -(r + tube), -0.02 - i * 0.02, { delay: 0.55 + i * 0.05, flat: true, noInk: true })));
  const spiral = new Group();
  portal.add(spiral);
  [0, 1, 2].forEach((k) => {
    const arm = add(new TorusGeometry(0.3 + k * 0.15, 0.02, 4, 24, 2.2), k % 2 ? YELLOW : CYAN, 0, -0.02, 0.01, { delay: 0.7 + k * 0.05, flat: true, noInk: true });
    arm.rotation.z = k * 2.1;
    spiral.add(arm);
  });

  // Retrograde, hovering a hand's breadth up, cane raised.
  const FACE = 0.3;
  const H = G + 0.3;
  const elder = figure(kit, {
    x: -0.25,
    z: 0.35,
    y: H,
    facing: FACE,
    height: 2.3,
    build: "slim",
    skin: 0xe0b090,
    hair: { style: "wild", color: 0xeeeeee },
    face: { mouth: "frown", brows: "angry", beard: "moustache", beardColor: 0xf4f4f4, marks: 0xb08060 },
    top: { kind: "jacket", color: KNIT, accent: SILVER },
    bottom: { kind: "trousers", color: SILVER },
    shoes: 0xe0e4ea,
    arms: [[-0.55, 2.2, 0.35], "out"],
    delay: 0.8,
  });
  const at = elder.at;
  const flying: Group[] = [];
  // Big silver boots, and his shadow on the paving.
  [-1, 1].forEach((s) => flying.push(cylinder(0.12, 0.13, 0.3, 0xe0e4ea, ...at(s * 0.16, 0.05, 0.03), { delay: 1.1 })));
  add(new CylinderGeometry(0.4, 0.4, 0.005, 20).scale(1, 1, 0.7), 0x14121c, -0.25, G, 0.35, { delay: 0.9, flat: true, noInk: true });
  // The jetpack: two cyan tanks on his back, nozzles, sputtering blue flame and smoke.
  const flames: Group[] = [];
  const puffs: { puff: Group; from: Point; phase: number }[] = [];
  [-1, 1].forEach((s, i) => {
    const tank = at(s * 0.25, 1.1, -0.33);
    flying.push(cylinder(0.11, 0.11, 0.78, CYAN, ...tank, { delay: 1.2 + i * 0.03 }, 14));
    flying.push(ball(0.11, CYAN, tank[0], tank[1] + 0.67, tank[2], { delay: 1.24 + i * 0.03 }));
    flying.push(add(new ConeGeometry(0.09, 0.12, 10), 0x4a4f5c, tank[0], tank[1] - 0.12, tank[2], { delay: 1.26 }));
    const flame = add(new ConeGeometry(0.075, 0.5, 8).rotateX(Math.PI), CYAN, tank[0], tank[1] - 0.62, tank[2], { delay: 1.3, flat: true });
    flames.push(flame);
    flying.push(flame);
    puffs.push({ puff: ball(0.07, 0x8a8f9c, tank[0], tank[1] - 0.5, tank[2], { delay: 1.4, noInk: true }), from: [tank[0], tank[1] - 0.5, tank[2]], phase: i * 0.5 });
  });
  flying.push(box(0.56, 0.1, 0.12, 0x4a4f5c, ...at(0, 1.5, -0.3), { delay: 1.2, rotation: [0, FACE, 0] }));
  // The cane, glowing, with a ring of energy round it.
  const [hand] = elder.hands;
  const cane = new Group();
  const shaft = cylinder(0.03, 0.03, 0.85, ORANGE, 0, -0.5, 0, { delay: 1.4, flat: true });
  shaft.parent?.add(cane);
  cane.add(shaft);
  cane.add(add(new TorusGeometry(0.1, 0.03, 6, 14, Math.PI), ORANGE, -0.1, 0.35, 0, { delay: 1.45, flat: true }));
  cane.add(add(new TorusGeometry(0.09, 0.012, 4, 20).rotateX(Math.PI / 2), YELLOW, 0, -0.05, 0, { delay: 1.5, flat: true, noInk: true }));
  cane.position.set(...hand);
  cane.rotation.set(0.2, FACE, 0.35);
  flying.push(cane);

  // A pigeon pecking about below him.
  const pigeon = add(new SphereGeometry(0.09, 12, 10).scale(1.4, 0.9, 0.9), 0x8a93a3, 0.55, G, 0.95, { delay: 1.6, rotation: [0, -0.6, 0] });
  decorate(pigeon, new BoxGeometry(0.12, 0.03, 0.17), 0x6d7f9a, [[0.03, 0.15, 0]]);
  const neck = ball(0.055, 0x5a6a8a, 0.45, G + 0.1, 0.89, { delay: 1.65 });
  decorate(neck, new BoxGeometry(0.05, 0.03, 0.115), 0x2f8f6f, [[0.01, 0.03, 0]]);
  decorate(neck, new ConeGeometry(0.012, 0.04, 5).rotateZ(Math.PI / 2), INK, [[-0.065, 0.06, 0]]);
  decorate(neck, new BoxGeometry(0.012, 0.012, 0.115), 0xff8a00, [[-0.02, 0.07, 0]]);

  const rest = [...elder.parts, ...flying].map((part) => part.position.y);
  const glowFrom = new Color(ORANGE);
  const glowTo = new Color(YELLOW);
  const neckRest = neck.position.clone();
  tick((t) => {
    // He bobs on a sputtering jet; the cane flares as he shakes it; the portal turns.
    const cough = Math.floor(t * 3) % 5 === 4;
    const bob = Math.sin(t * 2.2) * 0.025 - (cough ? 0.03 : 0);
    [...elder.parts, ...flying].forEach((part, i) => (part.position.y = rest[i] + bob));
    cane.rotation.z = 0.35 + Math.sin(t * 5) * 0.12;
    flames.forEach((flame, i) => {
      flame.visible = !cough;
      flame.children[0].scale.y = 1 + Math.sin(t * 28 + i * 2) * 0.2;
    });
    for (const { puff, from, phase } of puffs) {
      const p = (t * 0.7 + phase) % 1;
      puff.position.set(from[0] + p * 0.5, from[1] - 0.25 + p * 0.3 + bob, from[2] + p * 0.2);
      puff.children[0].scale.setScalar(0.5 + p * 1.3);
    }
    colorOf(shaft).lerpColors(glowFrom, glowTo, (Math.sin(t * 5) + 1) / 2);
    spiral.rotation.z = -t * 1.2;
    const peck = Math.sin(t * 3) > 0.6;
    neck.position.set(neckRest.x - (peck ? 0.03 : 0), neckRest.y - (peck ? 0.08 : 0), neckRest.z);
    light.visible = Math.floor(t * 6) % 21 !== 13;
  });

  return { width: 4.9, height: 4.4, lookY: 1.6 };
}
