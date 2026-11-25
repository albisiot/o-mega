import { BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, ring, skyline } from "@/lib/diorama-props";

/**
 * Histrio (P166): a film set on the quay at night, the old town lit behind. The actor in his
 * hero's cape opens his hands to the camera; while its red lamp is on, the big film light pours
 * on him, a gold ring glows at his feet and for those seconds he is a hero again. When the take
 * ends it all goes dark. He cannot work a single machine: the light's cable is round his ankle.
 */
export function histrio(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const DARK = 0x23222b;
  const F = octagonBase(kit, 0x1c1e2a);
  const G = floor(kit, F, 0.06, 0x2c3040, 0x1e2230, 0.5);
  skyline(kit, -1.95, G, 0.05, [0x2a2f4a, 0x3a2a4a, 0x22344a], -1.28, 1.28);
  const dome = add(new SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x3a2a4a, 0.2, G + 1.55, -1.9, { delay: 0.3 });
  decorate(dome, new BoxGeometry(0.05, 0.07, 0.01), YELLOW, [[0, 0.12, 0.31]]);

  // Histrio, hands open, in the cape of the hero he plays.
  const X = -0.15;
  const Z = 0.15;
  const theta = 0.3;
  const hero = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: theta,
    height: 2.5,
    build: "broad",
    skin: 0xc89070,
    hair: { style: "curly", color: 0x5a4a3e },
    face: { mouth: "smirk", brows: "calm", beard: "stubble", beardColor: 0x4a3a30 },
    top: { kind: "coat", color: 0x8a8478, accent: 0x6a6458 },
    bottom: { kind: "trousers", color: 0x4a4640 },
    belt: 0x5a5248,
    cape: 0x7a1e3a,
    shoes: 0x2a2622,
    arms: [
      [-0.66, 1.35, 0.34],
      [0.66, 1.38, 0.34],
    ],
    delay: 0.9,
  });
  const aura = ring(kit, [X, G + 0.01, Z], 0.75, YELLOW, 1.6);
  motes(8, YELLOW, 0.025, [X - 0.6, G + 0.2, Z - 0.4], [X + 0.6, G + 2.6, Z + 0.4], 1.6);

  // The film light on its tripod, barn doors open, aimed at him.
  const LX = -1.55;
  const LZ = -0.4;
  const top: Point = [LX, G + 1.0, LZ];
  [0, 2.1, 4.2].forEach((a, i) => limb(kit, top, [LX + Math.sin(a) * 0.38, G, LZ + Math.cos(a) * 0.38], 0.02, 0.02, DARK, { delay: 0.2 + i * 0.02, noInk: true }));
  cylinder(0.025, 0.025, 0.85, DARK, LX, G + 1.0, LZ, { delay: 0.26 }, 8);
  const aimLight = Math.atan2(X - LX, Z - LZ);
  const head = box(0.42, 0.4, 0.38, DARK, LX, G + 1.7, LZ, { delay: 0.3, rotation: [0.15, aimLight, 0] });
  head.rotation.order = "YXZ";
  head.rotation.set(0.15, aimLight, 0);
  const lens = decorate(head, new CylinderGeometry(0.16, 0.16, 0.02, 18).rotateX(Math.PI / 2), YELLOW, [[0, 0.2, 0.2]]);
  decorate(head, new BoxGeometry(0.46, 0.02, 0.2), DARK, [
    [0, 0.42, 0.29],
    [0, -0.02, 0.29],
  ]);
  decorate(head, new BoxGeometry(0.02, 0.4, 0.2), DARK, [
    [-0.24, 0.2, 0.29],
    [0.24, 0.2, 0.29],
  ]);
  const from: Point = [LX + Math.sin(aimLight) * 0.25, G + 1.9, LZ + Math.cos(aimLight) * 0.25];
  const beams = [
    [0, 2.2],
    [0.15, 1.4],
    [-0.15, 0.7],
  ].map(([dx, y], k) => limb(kit, from, [X + dx, G + y, Z], 0.012, 0.012, YELLOW, { delay: 1.7 + k * 0.04, flat: true, noInk: true }));

  // The camera on its tripod, the red recording lamp on top.
  const CX = 1.35;
  const CZ = 0.9;
  const aimCamera = Math.atan2(X - CX, Z - CZ);
  [0, 2.1, 4.2].forEach((a, i) => limb(kit, [CX, G + 0.95, CZ], [CX + Math.sin(a) * 0.32, G, CZ + Math.cos(a) * 0.32], 0.02, 0.02, DARK, { delay: 0.4 + i * 0.02, noInk: true }));
  const body = box(0.32, 0.34, 0.52, 0x2e3440, CX, G + 0.95, CZ, { delay: 0.45, rotation: [0, aimCamera, 0] });
  decorate(body, new BoxGeometry(0.3, 0.12, 0.2), DARK, [[0, 0.4, -0.08]]);
  decorate(body, new CylinderGeometry(0.1, 0.12, 0.22, 14).rotateX(Math.PI / 2), INK, [[0, 0.17, 0.37]]);
  decorate(body, new CylinderGeometry(0.085, 0.085, 0.01, 14).rotateX(Math.PI / 2), CYAN, [[0, 0.17, 0.485]]);
  const tally = ball(0.05, MAGENTA, CX + Math.sin(aimCamera) * 0.18, G + 1.29, CZ + Math.cos(aimCamera) * 0.18, { delay: 0.55, flat: true });

  // The director's chair with the clapperboard on it.
  const DX = 1.5;
  const DZ = -0.75;
  [-1, 1].forEach((side) => {
    limb(kit, [DX + side * 0.22, G, DZ - 0.2], [DX + side * 0.22, G + 0.5, DZ + 0.2], 0.022, 0.022, 0x5e4a3a, { delay: 0.3 });
    limb(kit, [DX + side * 0.22, G, DZ + 0.2], [DX + side * 0.22, G + 0.5, DZ - 0.2], 0.022, 0.022, 0x5e4a3a, { delay: 0.3 });
    box(0.04, 0.55, 0.04, 0x5e4a3a, DX + side * 0.22, G + 0.5, DZ - 0.2, { delay: 0.32 });
  });
  box(0.48, 0.03, 0.42, MAGENTA, DX, G + 0.5, DZ, { delay: 0.34 });
  box(0.48, 0.2, 0.03, MAGENTA, DX, G + 0.78, DZ - 0.2, { delay: 0.36 });
  const clap = box(0.34, 0.24, 0.03, DARK, DX, G + 0.53, DZ + 0.02, { delay: 0.5, rotation: [-0.35, 0, 0] });
  const stick = box(0.34, 0.06, 0.03, 0xe8e2d0, DX, G + 0.78, DZ - 0.06, { delay: 0.52, rotation: [-0.35, 0, 0.2] });
  decorate(stick, new BoxGeometry(0.03, 0.07, 0.035), INK, [-0.12, -0.04, 0.04, 0.12].map((x) => [x, 0.03, 0, 0.6] as [number, number, number, number]));
  decorate(clap, new BoxGeometry(0.3, 0.008, 0.01), 0x9aa0ab, [
    [0, 0.08, 0.016],
    [0, 0.15, 0.016],
  ]);

  // The light's cable, snaking over the quay and caught round his ankle on its way to the camera.
  const ankle = hero.at(-0.2, 0.08, 0.06);
  cable(kit, [[LX + 0.1, G + 0.03, LZ + 0.15], [-1.0, G + 0.03, 0.55], [ankle[0] - 0.15, G + 0.03, ankle[2] + 0.12], [ankle[0], G + 0.04, ankle[2] + 0.15], [0.6, G + 0.03, 1.05], [CX - 0.15, G + 0.03, CZ + 0.15]], 0.022, INK, 0.6);
  add(new TorusGeometry(0.13, 0.024, 6, 16).rotateX(Math.PI / 2 - 0.3), INK, ankle[0], G + 0.04, ankle[2], { delay: 0.65, noInk: true });

  tick((t) => {
    // The take: twelve seconds of hero, then a breath of darkness, and again.
    const rolling = t % 5.5 < 4.2;
    tally.visible = rolling && Math.floor(t * 3) % 2 === 0;
    aura.visible = rolling;
    beams.forEach((beam) => (beam.visible = rolling));
    lens.color.setHex(rolling ? YELLOW : 0x4a4030);
    aura.children[0].scale.setScalar(1 + Math.sin(t * 3) * 0.04);
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
