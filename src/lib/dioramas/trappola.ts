import { BoxGeometry, CatmullRomCurve3, Color, CylinderGeometry, Group, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, ORANGE, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle } from "@/lib/diorama-props";

/**
 * Trappola (P317): the Compagnia Lete's hunter in a dock warehouse at night, a crane framed in
 * the open bay behind him. He has just flung his net of glowing thread over a huge Segnato, who
 * kneels with his arms up as it drops: the orange glow of his Sign goes out wherever the threads
 * touch. Hunting is all waiting, and he has no energy to spare: a camp stool and a thermos.
 */
export function trappola(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STEEL = 0x4a4f5c;
  const OLIVE = 0x3e4a34;
  const F = octagonBase(kit, 0x1c1e26);
  const G = floor(kit, F, 0.06, 0x2e3440, 0x22262f, 0.7);

  // The warehouse wall, ribbed, its bay open on the night port and a crane.
  const wall = box(2.9, 2.8, 0.3, 0x2a3442, -0.05, G, -1.55, { delay: 0.1, ink: 1.02 });
  const front = 0.155;
  decorate(wall, new BoxGeometry(0.03, 2.8, 0.01), 0x1e2632, Array.from({ length: 16 }, (_, k) => [-1.4 + k * 0.18, 1.4, front] as Point));
  decorate(wall, new BoxGeometry(1.3, 2.05, 0.012), 0x1a2a4a, [[0.65, 1.025, front + 0.002]]);
  decorate(wall, new BoxGeometry(1.3, 0.3, 0.014), 0x0e3a4e, [[0.65, 0.15, front + 0.003]]);
  decorate(wall, new BoxGeometry(0.05, 1.5, 0.016), 0x0e1626, [[0.9, 0.95, front + 0.004]]);
  decorate(wall, new BoxGeometry(0.9, 0.05, 0.016), 0x0e1626, [[0.6, 1.68, front + 0.004]]);
  decorate(wall, new BoxGeometry(0.01, 0.5, 0.016), 0x0e1626, [[0.32, 1.42, front + 0.004]]);
  decorate(wall, new BoxGeometry(0.06, 0.06, 0.018), MAGENTA, [[0.9, 1.75, front + 0.005]]);
  box(0.16, 2.8, 0.16, STEEL, 1.55, G, -1.2, { delay: 0.2 });
  const lamp = box(0.12, 0.12, 0.08, MAGENTA, 1.55, G + 2.2, -1.08, { delay: 0.3, flat: true });
  puddle(kit, 0.2, 1.3, G, 0.3, 0.4, MAGENTA);
  puddle(kit, -1.3, 0.7, G, 0.32, 0.3, CYAN);

  // His hide: a camp stool, a thermos still steaming, the bag of spare nets.
  [-1, 1].forEach((s) => limb(kit, [-1.5 + s * 0.15, G, -0.75], [-1.5 - s * 0.15, G + 0.42, -0.75], 0.02, 0.02, STEEL, { delay: 0.3, noInk: true }));
  box(0.36, 0.04, 0.3, 0x2a3424, -1.5, G + 0.42, -0.75, { delay: 0.32 });
  cylinder(0.08, 0.08, 0.32, 0x2f5a4a, -1.15, G, -1.0, { delay: 0.34 }, 12);
  cylinder(0.085, 0.085, 0.08, STEEL, -1.15, G + 0.32, -1.0, { delay: 0.36 }, 12);
  motes(5, 0xc8ccd4, 0.03, [-1.2, G + 0.45, -1.05], [-1.1, G + 1.0, -0.95], 1);
  const sack = ball(0.28, OLIVE, -1.7, G - 0.04, -0.15, { delay: 0.38 });
  decorate(sack, new TorusGeometry(0.12, 0.02, 4, 16), MAGENTA, [[0, 0.5, 0.18]]);

  // Trappola, at the back, the net just flung from his right hand, the draw line coiled in his left.
  const H = figure(kit, {
    x: -0.5,
    z: -0.2,
    y: G,
    facing: 1.2,
    height: 2.45,
    build: "broad",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x2a201c },
    face: { mouth: "frown", brows: "angry", beard: "full" },
    top: { kind: "jacket", color: OLIVE, accent: 0x2e3828 },
    bottom: { kind: "trousers", color: 0x343e2c },
    belt: 0x2a2622,
    gloves: 0x22201e,
    shoes: 0x2a2622,
    arms: [[-0.3, 1.95, 0.75], [0.5, 1.25, 0.35]],
    legs: "stride",
    delay: 0.8,
  });
  const turn: [number, number, number] = [0, 1.2, 0];
  [-0.25, 0.05, 0.3].forEach((dx, i) => box(0.13, 0.15, 0.1, 0x2e3828, ...H.at(dx, 1.02, 0.36), { delay: 1.3 + i * 0.02, rotation: turn }));
  limb(kit, H.at(-0.42, 1.95, 0.05), H.at(0.3, 1.15, 0.36), 0.04, 0.04, 0x2e3828, { delay: 1.32 });
  box(0.5, 0.6, 0.25, 0x343e2c, ...H.at(0, 1.25, -0.42), { delay: 1.3, rotation: turn });
  const coil = H.hands[1];
  add(new TorusGeometry(0.14, 0.025, 6, 18), MAGENTA, coil[0], coil[1] - 0.2, coil[2] + 0.05, { delay: 1.4, flat: true, rotation: turn });

  // The Segnato under the net, on one knee, arms up, his Sign blazing orange.
  const T: Point = [1.3, G, 0.4];
  const prey = figure(kit, {
    x: T[0],
    z: T[2],
    y: G,
    facing: -0.3,
    height: 2.35,
    build: "broad",
    skin: 0x9a6a4c,
    hair: { style: "bald", color: 0x2a201c },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "tank", color: 0x6a2a4a },
    bottom: { kind: "trousers", color: 0x3a3a4a },
    arms: ["up", "up"],
    legs: "kneel",
    delay: 1.0,
  });
  const sign = add(new CylinderGeometry(0.1, 0.1, 0.02, 12).rotateX(Math.PI / 2), ORANGE, ...prey.at(0.12, 1.15, 0.3), { delay: 1.5, flat: true, noInk: true, rotation: [0, -0.3, 0] });
  const aura = add(new TorusGeometry(0.75, 0.03, 6, 36).rotateX(Math.PI / 2), ORANGE, T[0], G + 0.01, T[2], { delay: 1.5, flat: true, noInk: true });

  // The net: rings and ribs of glowing thread, weights round its rim, built round its rim's centre.
  const R = 0.9;
  const HN = 2.3;
  const net = new Group();
  wall.parent?.add(net);
  const thread = (points: Vector3[], color: number) => {
    const geometry = new TubeGeometry(new CatmullRomCurve3(points), 16, 0.014, 4);
    geometry.computeBoundingBox();
    return add(geometry, color, 0, geometry.boundingBox?.min.y ?? 0, 0, { delay: 1.6, flat: true, noInk: true });
  };
  const at = (phi: number, theta: number) => new Vector3(R * Math.sin(phi) * Math.cos(theta), HN * Math.cos(phi), R * Math.sin(phi) * Math.sin(theta));
  const threads = [
    ...[0.35, 0.7, 1.05, 1.35].map((phi, k) => thread(Array.from({ length: 13 }, (_, i) => at(phi, (i / 12) * Math.PI * 2)), k % 2 ? CYAN : MAGENTA)),
    ...Array.from({ length: 10 }, (_, j) => thread([0, 0.4, 0.8, 1.2, Math.PI / 2].map((phi) => at(phi, (j / 10) * Math.PI * 2)), j % 2 ? MAGENTA : CYAN)),
  ];
  const weights = Array.from({ length: 10 }, (_, j) => {
    const p = at(Math.PI / 2, (j / 10) * Math.PI * 2);
    return cylinder(0.05, 0.05, 0.14, STEEL, p.x, -0.07, p.z, { delay: 1.7 });
  });
  [...threads, ...weights].forEach((part) => net.add(part));

  // The draw line from the coil in his left hand to the top of the net.
  const line = box(0.02, 1, 0.02, MAGENTA, coil[0], coil[1] - 0.1, coil[2], { delay: 1.6, flat: true, noInk: true });
  const lineFrom = new Vector3(coil[0], coil[1] - 0.1, coil[2]);
  const hand = new Vector3(...H.hands[0]);
  const over = new Vector3(T[0], G + 2.6, T[2]);
  const ground = new Vector3(T[0], G + 0.07, T[2]);
  const UP = new Vector3(0, 1, 0);
  const hot = new Color(ORANGE);
  const dead = new Color(0x4a3a34);
  tick((t) => {
    const u = (t / 3.2 + 0.43) % 1;
    if (u < 0.3) {
      const k = u / 0.3;
      net.position.lerpVectors(hand, over, k).y += Math.sin(k * Math.PI) * 0.5;
      net.scale.set(0.25 + k * 0.95, 0.2 + k * 0.1, 0.25 + k * 0.95);
    } else if (u < 0.55) {
      const k = (u - 0.3) / 0.25;
      net.position.lerpVectors(over, ground, k * k);
      net.scale.set(1.2 - k * 0.2, 0.3 + k * k * 0.7, 1.2 - k * 0.2);
    } else {
      net.position.copy(ground);
      net.scale.set(1, 1, 1);
    }
    const apex = net.position.clone().add(new Vector3(0, HN * net.scale.y, 0)).sub(lineFrom);
    line.children.forEach((mesh) => (mesh.scale.y = apex.length()));
    line.quaternion.setFromUnitVectors(UP, apex.normalize());
    // The Sign glows until the threads land, then goes out.
    const out = Math.min(1, Math.max(0, (u - 0.45) / 0.2));
    colorOf(sign).lerpColors(hot, dead, out);
    colorOf(aura).lerpColors(hot, dead, out);
    aura.visible = out < 1;
    lamp.visible = Math.floor(t * 2) % 2 === 0;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
