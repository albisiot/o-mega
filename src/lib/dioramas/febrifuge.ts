import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, archMouth, archedWall, cable, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Febrifuge (P189): in a field ward under the arcade, the old town and its dome dark against
 * the dusk through the arch, the doctor of the rift fever stands by a cot in her green dress and
 * apron, three pocket watches on her belt, and swings a fourth on its chain over a bandaged
 * patient: tomorrow, take it or leave it. Magenta and cyan fever rises off him in waves, a drip
 * hangs from its stand and the lantern gutters. Her price lies at her feet: the bucket of water
 * she could not carry, tipped over in its puddle.
 */
export function febrifuge(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const DARK = 0x2a2a34;
  const BRASS = 0xc8a050;
  const DIAL = 0xf0e8d0;
  const F = octagonBase(kit, 0x1c1a20);
  const G = floor(kit, F, 0.06, 0x3a3640, 0x2a2630, 0.45);

  // The arcade, open on the dusk: the old town and its dome against the sky.
  const AX = 0.6;
  const sky = add(archMouth(0.55, 1.15), 0xd0703a, AX, G, -1.72, { delay: 0.08, flat: true, noInk: true });
  decorate(sky, new BoxGeometry(1.1, 0.55, 0.01), 0x2a2238, [[0, 0.28, 0.022]]);
  decorate(sky, new SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x2a2238, [[0.15, 0.55, 0.024]]);
  decorate(sky, new BoxGeometry(0.06, 0.12, 0.01), 0x2a2238, [[0.15, 0.8, 0.024]]);
  decorate(sky, new BoxGeometry(0.04, 0.04, 0.01), ORANGE, [
    [-0.35, 0.4, 0.026],
    [-0.15, 0.32, 0.026],
    [0.35, 0.42, 0.026],
  ]);
  const wall = add(archedWall(3.1, 3.0, 0.3, { x: AX, half: 0.55, spring: 1.15 }), 0x4a3a48, 0, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.3, 3.0, 0.04), 0x56445a, [[-0.55, 1.5, 0.16]]);
  const lantern = wallLantern(kit, -1.05, -1.4, G + 2.2, 0.3, ORANGE);

  // The cot, the patient under his blanket, the drip on its stand.
  const CT = 0.25;
  const c = (lx: number, lz: number): [number, number] => [-1.15 + lx * Math.cos(CT) + lz * Math.sin(CT), 0.2 - lx * Math.sin(CT) + lz * Math.cos(CT)];
  const rot: [number, number, number] = [0, CT, 0];
  [-0.55, 0.55].forEach((lx) => [-0.25, 0.25].forEach((lz) => box(0.04, 0.45, 0.04, DARK, ...xz(c(lx, lz), G), { delay: 0.3, noInk: true })));
  box(1.25, 0.12, 0.58, 0xd8d2c4, ...xz(c(0, 0), G + 0.45), { delay: 0.34, rotation: rot });
  box(0.3, 0.1, 0.42, 0xf0ece0, ...xz(c(-0.45, 0), G + 0.57), { delay: 0.38, rotation: rot });
  const blanket = add(new SphereGeometry(0.4, 14, 10).scale(1.25, 0.32, 0.72), 0x3a4a44, ...xz(c(0.15, 0), G + 0.55), { delay: 0.4, rotation: rot });
  const [hx, hz] = c(-0.45, 0);
  const sick = ball(0.15, 0xc89878, hx, G + 0.64, hz, { delay: 0.45 });
  decorate(sick, new TorusGeometry(0.15, 0.03, 6, 18).rotateX(Math.PI / 2), 0xf4f0e6, [[0, 0.22, 0]]);
  decorate(sick, new BoxGeometry(0.02, 0.05, 0.02), INK, [
    [0.05, 0.17, 0.12],
    [0.05, 0.17, -0.12],
  ]);
  const [ix, iz] = c(-0.6, -0.4);
  cylinder(0.02, 0.02, 1.7, DARK, ix, G, iz, { delay: 0.5 }, 6);
  box(0.25, 0.02, 0.02, DARK, ix, G + 1.68, iz, { delay: 0.52, noInk: true });
  box(0.12, 0.2, 0.05, 0xa8e0e8, ix + 0.1, G + 1.42, iz, { delay: 0.55 });
  cable(kit, [[ix + 0.1, G + 1.42, iz], [ix + 0.2, G + 1.0, iz + 0.15], [hx + 0.3, G + 0.68, hz + 0.2]], 0.01, 0xa8e0e8, 0.6);
  // The fever, rising off him in waves.
  const waves = [0, 1, 2].map((k) => {
    const [wx, wz] = c(-0.1 + k * 0.25, 0);
    const pieces = zigzag(kit, [0, 1, 2, 3, 4].map((s) => [wx + (s % 2 ? 0.07 : -0.07), G + 0.75 + s * 0.12, wz] as Point), 0.025, k % 2 ? CYAN : MAGENTA, 0.7 + k * 0.05);
    return { pieces, rest: pieces.map((piece) => piece.position.y), phase: k / 3 };
  });

  // The bucket she could not carry, tipped in its puddle.
  puddle(kit, 1.2, 1.15, G, 0.5, 0.4, CYAN);
  add(new CylinderGeometry(0.16, 0.12, 0.3, 12, 1, true), 0x6a7080, 1.4, G, 0.95, { delay: 0.55, rotation: [0, 0.6, Math.PI / 2 - 0.2] });

  // Febrifuge, a watch swinging from her right hand.
  const doc = figure(kit, {
    x: 0.1,
    z: 0.35,
    y: G,
    facing: 0.1,
    height: 2.35,
    build: "slim",
    skin: 0xd8a888,
    hair: { style: "bun", color: 0x8a3a1e },
    face: { mouth: "frown", brows: "calm", marks: 0xb07050 },
    top: { kind: "apron", color: 0x2f6a4a, accent: 0x1f4a3a, sleeves: "short" },
    bottom: { kind: "long-skirt", color: 0x1f4a3a },
    shoes: 0x2a2226,
    belt: 0x4a3020,
    arms: [[-0.72, 1.4, 0.38], "down"],
    delay: 0.8,
  });
  box(0.48, 0.95, 0.04, 0x1a3e30, ...doc.at(0, 0.2, 0.27), { delay: 1.1, rotation: [-0.12, 0.1, 0] });
  // Three watches on her belt.
  [-0.16, 0, 0.16].forEach((lx, i) => {
    const at = doc.at(lx, 1.0 - (i % 2) * 0.05, 0.31);
    const watch = add(new CylinderGeometry(0.055, 0.055, 0.02, 14).rotateX(Math.PI / 2), BRASS, ...at, { delay: 1.2 + i * 0.03, rotation: [0, 0.1, 0] });
    decorate(watch, new CylinderGeometry(0.042, 0.042, 0.01, 14).rotateX(Math.PI / 2), DIAL, [[0, 0.055, 0.012]]);
  });
  // The fourth on its chain, a pendulum from her fingers.
  const [hand] = doc.hands;
  const swing = new Group();
  swing.position.set(hand[0], hand[1] - 0.06, hand[2]);
  const chain = add(new BoxGeometry(0.012, 0.34, 0.012), BRASS, 0, -0.34, 0, { delay: 1.3, flat: true, noInk: true });
  const watch = add(new CylinderGeometry(0.08, 0.08, 0.025, 16).rotateX(Math.PI / 2), BRASS, 0, -0.5, 0, { delay: 1.35 });
  decorate(watch, new CylinderGeometry(0.062, 0.062, 0.01, 16).rotateX(Math.PI / 2), DIAL, [[0, 0.08, 0.014]]);
  decorate(watch, new BoxGeometry(0.008, 0.05, 0.004), INK, [
    [0, 0.1, 0.021],
    [0.015, 0.08, 0.021, 1.2],
  ]);
  chain.parent?.add(swing);
  swing.add(chain, watch);

  tick((t) => {
    swing.rotation.z = Math.sin(t * 2.2) * 0.35;
    waves.forEach(({ pieces, rest, phase }) => {
      const u = (t * 0.35 + phase) % 1;
      pieces.forEach((piece, i) => {
        piece.position.y = rest[i] + u * 0.5;
        piece.visible = u < 0.8;
      });
    });
    blanket.position.y = G + 0.55 + Math.sin(t * 1.8) * 0.012;
    lantern.visible = Math.floor(t * 6) % 17 !== 9;
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}

/** A point on the ground plan at height y. */
function xz([x, z]: [number, number], y: number): Point {
  return [x, y, z];
}
