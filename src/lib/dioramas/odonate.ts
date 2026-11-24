import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor, ring } from "@/lib/diorama-props";

/**
 * Odonate (P067): on a tar rooftop under a water tower, the swarm-master in a wasp-striped hoodie
 * clutches his remote control and cowers under a wire-mesh dome while his mechanical wasps
 * circle overhead on magenta trails. Behind him, the camp bed where he sleeps up here, with its
 * little lamp left on.
 */
export function odonate(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STRIPE = 0xe8b820;
  const TANK = 0x2a4a66;
  const F = octagonBase(kit, 0x1b1c24);
  const G = floor(kit, F, 0.06, 0x2a2a32, 0x1e1e26, 0.55);
  // The parapet round the back of the roof.
  box(2.8, 0.32, 0.16, 0x3a3f4e, 0, G, -1.75, { delay: 0.1 });
  box(0.66, 0.32, 0.16, 0x3a3f4e, -1.64, G, -1.52, { delay: 0.11, rotation: [0, -Math.PI / 4, 0] });
  box(0.16, 0.32, 1.6, 0x3a3f4e, -1.85, G, -0.5, { delay: 0.12 });

  // The water tower: legs, tank with bands, a pointed roof, a ladder.
  const TX = 1.3;
  const TZ = -1.05;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => limb(kit, [TX + sx * 0.42, G, TZ + sz * 0.42], [TX + sx * 0.3, G + 1.0, TZ + sz * 0.3], 0.04, 0.04, 0x23222b, { delay: 0.15 })));
  box(0.04, 1.0, 0.7, 0x23222b, TX, G + 0.3, TZ, { delay: 0.18, noInk: true, rotation: [0.9, 0, 0] });
  const tank = cylinder(0.55, 0.55, 0.9, TANK, TX, G + 1.0, TZ, { delay: 0.2 }, 20);
  decorate(tank, new TorusGeometry(0.555, 0.02, 6, 28).rotateX(Math.PI / 2), 0x1c3248, [[0, 0.2, 0], [0, 0.45, 0], [0, 0.7, 0]]);
  add(new CylinderGeometry(0.05, 0.62, 0.35, 20), TANK, TX, G + 1.9, TZ, { delay: 0.24 });
  [0, 1, 2, 3, 4, 5].forEach((k) => box(0.2, 0.025, 0.03, 0x4a4f5c, TX - 0.35, G + 0.15 + k * 0.28, TZ + 0.5, { delay: 0.26, noInk: true, rotation: [0, 0.8, 0] }));

  // His camp bed, and the lamp he never turns off.
  box(1.1, 0.14, 0.55, 0x2f6f60, -1.15, G + 0.25, -0.55, { delay: 0.3, rotation: [0, 0.35, 0] });
  [-0.45, 0.45].forEach((dx) => box(0.05, 0.25, 0.5, 0x23222b, -1.15 + dx * 0.94, G, -0.55 - dx * 0.34, { delay: 0.28, noInk: true, rotation: [0, 0.35, 0] }));
  box(0.7, 0.1, 0.56, MAGENTA, -1.05, G + 0.39, -0.58, { delay: 0.34, rotation: [0, 0.35, 0] });
  add(new SphereGeometry(0.16, 12, 8).scale(1.3, 0.5, 1), 0xe8e2d0, -1.6, G + 0.39, -0.4, { delay: 0.36 });
  crate(kit, -1.55, 0.2, G, 0.38, 0.34, 0x5e4a3a, 0.4);
  cylinder(0.03, 0.08, 0.2, 0x23222b, -1.55, G + 0.34, 0.2, { delay: 0.42 }, 10);
  cylinder(0.1, 0.17, 0.16, YELLOW, -1.55, G + 0.52, 0.2, { delay: 0.45, flat: true }, 12);

  // Odonate, hunched, the remote in both hands.
  const man = figure(kit, {
    x: 0.05,
    z: 0.45,
    y: G,
    facing: 0.3,
    height: 2.3,
    build: "slim",
    skin: 0xe0b8a0,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried" },
    headwear: { kind: "hood", color: STRIPE },
    top: { kind: "hoodie", color: STRIPE, accent: 0x14121c },
    bottom: { kind: "trousers", color: 0x2a2630 },
    shoes: 0x23222b,
    arms: [[-0.12, 1.42, 0.45], [0.14, 1.4, 0.45]],
    delay: 0.7,
  });
  const at = man.at;
  const u = 2.3 / 2.4;
  // Black stripes round the hoodie.
  [1.18, 1.38, 1.58].forEach((y, k) => {
    const r = (0.25 + (0.3 - 0.25) * ((y - 1.08) / 0.64)) * u + 0.012;
    add(new TorusGeometry(r, 0.035, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.72), 0x14121c, ...at(0, y * u, 0), { delay: 1.2 + k * 0.02, noInk: true, rotation: [0, 0.3, 0] });
  });
  // The remote: a box with an antenna and a lit button.
  const [right, left] = man.hands;
  const mid: Point = [(right[0] + left[0]) / 2, (right[1] + left[1]) / 2, (right[2] + left[2]) / 2 + 0.05];
  const remote = box(0.32, 0.08, 0.18, 0x3a3f4e, mid[0], mid[1] - 0.02, mid[2], { delay: 1.4, rotation: [0.5, 0.3, 0] });
  decorate(remote, new BoxGeometry(0.05, 0.02, 0.05), YELLOW, [[0.07, 0.085, 0]]);
  decorate(remote, new CylinderGeometry(0.03, 0.03, 0.02, 8), INK, [[-0.08, 0.085, 0]]);
  limb(kit, [mid[0] + 0.1, mid[1] + 0.05, mid[2] - 0.05], [mid[0] + 0.25, mid[1] + 0.75, mid[2] - 0.1], 0.012, 0.012, 0x9aa3b4, { delay: 1.45 });
  // The mesh dome on a pole from his back.
  limb(kit, at(0.05, 1.3, -0.26), at(0.05, 2.55, -0.12), 0.025, 0.025, 0x4a4f5c, { delay: 1.5 });
  const dome = add(new SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x7a8498, ...at(0.02, 2.46, 0.02), { delay: 1.55 });
  decorate(dome, new TorusGeometry(0.5, 0.012, 4, 28).rotateX(Math.PI / 2), 0x3a3f4e, [[0, 0.02, 0]]);
  decorate(dome, new TorusGeometry(0.4, 0.012, 4, 24).rotateX(Math.PI / 2), 0x3a3f4e, [[0, 0.3, 0]]);
  decorate(dome, new TorusGeometry(0.5, 0.012, 4, 28, Math.PI), 0x3a3f4e, [0, 1.05, 2.1].map((a) => [0, 0, 0, a] as [number, number, number, number]));

  // The swarm: mechanical wasps circling on magenta trails.
  const wasps = Array.from({ length: 7 }, (_, k) => {
    const d = 1.6 + k * 0.05;
    const bits = [
      add(new SphereGeometry(0.1, 10, 8).scale(1.7, 0.9, 0.9), YELLOW, 0.13, -0.09, 0, { delay: d }),
      ball(0.07, 0x23222b, -0.05, -0.07, 0, { delay: d }),
      ball(0.06, 0x23222b, -0.17, -0.06, 0, { delay: d }),
    ];
    decorate(bits[0], new TorusGeometry(0.09, 0.02, 4, 14).rotateY(Math.PI / 2), 0x14121c, [[-0.02, 0.09, 0], [0.07, 0.09, 0]]);
    decorate(bits[2], new SphereGeometry(0.03, 8, 6), YELLOW, [[-0.03, 0.08, 0.045], [-0.03, 0.08, -0.045]]);
    const wings = [-1, 1].map((s) => box(0.3, 0.01, 0.13, MAGENTA, 0.02, 0.06, s * 0.12, { delay: d + 0.03, flat: true, noInk: true, rotation: [s * 0.4, 0, 0] }));
    const group = new Group();
    bits[0].parent?.add(group);
    [...bits, ...wings].forEach((bit) => group.add(bit));
    return { group, wings, angle: (k / 7) * Math.PI * 2, radius: 1.05 + (k % 3) * 0.2, height: G + 2.5 + ((k * 3) % 5) * 0.16 };
  });
  const trails = [0.25, -0.2].map((tilt, k) => ring(kit, [0.05, G + 2.75 + k * 0.25, 0.4], 1.15 + k * 0.2, MAGENTA, 1.5 + k * 0.05));
  trails.forEach((trail, k) => (trail.rotation.set(k ? -0.2 : 0.25, 0, k ? 0.15 : -0.1)));

  const rest = man.parts.map((part) => part.position.x);
  tick((t) => {
    wasps.forEach(({ group, wings, angle, radius, height }, k) => {
      const a = angle + t * (0.7 + (k % 2) * 0.2);
      group.position.set(0.05 + Math.cos(a) * radius, height + Math.sin(t * 2 + k) * 0.08, 0.4 + Math.sin(a) * radius * 0.75);
      group.rotation.y = -a - Math.PI / 2;
      wings.forEach((wing, s) => (wing.rotation.x = (s ? -1 : 1) * (0.4 + Math.sin(t * 40 + k) * 0.35)));
    });
    trails.forEach((trail, k) => (trail.rotation.y = t * (k ? -0.3 : 0.4)));
    // He trembles.
    const shake = Math.sin(t * 31) * 0.006;
    man.parts.forEach((part, i) => (part.position.x = rest[i] + shake));
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
