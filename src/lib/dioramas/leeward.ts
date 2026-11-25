import { BoxGeometry, SphereGeometry, TorusGeometry } from "three";
import { CYAN, INK, MAGENTA, ORANGE, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, puddle } from "@/lib/diorama-props";

/**
 * Leeward (P171): at the end of Pier Nine in a storm, the old moorer with skin of basalt, cracks
 * glowing like embers, stands at the edge of the mole in his long black coat, arms a little
 * open, and a wave breaks on him: its spray stops at his side, and behind him a child holds a
 * paper boat, dry. He is too slow to stop anything: the stone has cracked round his rooted feet.
 */
export function leeward(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const SEA = 0x1f8fb0;
  const FOAM = 0xe8f6fb;
  const STONE = 0x4a5060;
  const BASALT = 0x7a6660;
  const F = octagonBase(kit, 0x0e3a4e);

  // The mole: a block of stone on the sea, kerbed, wet, with its bollards.
  const mole = box(2.1, 0.35, 3.2, STONE, 0.55, F, 0, { delay: 0.1, ink: 1.02 });
  decorate(mole, new BoxGeometry(2.1, 0.004, 0.012), 0x363c4a, Array.from({ length: 6 }, (_, k) => [0, 0.351, -1.25 + k * 0.5] as Point));
  decorate(mole, new BoxGeometry(0.012, 0.004, 3.2), 0x363c4a, [
    [-0.4, 0.351, 0],
    [0.2, 0.351, 0],
  ]);
  const G = F + 0.35;
  box(0.16, 0.12, 3.2, 0x3a3f4c, -0.42, G, 0, { delay: 0.15 });
  bollard(kit, 1.3, 1.1, G, 0.3);
  bollard(kit, 1.25, -1.15, G, 0.32);
  puddle(kit, 0.9, 0.85, G, 0.35, 0.3, ORANGE);
  puddle(kit, 0.6, -0.9, G, 0.36, 0.25, CYAN);

  // The lighthouse far off on its rock, its beam turning.
  ball(0.28, 0x2e2a36, 1.0, F - 0.1, -1.95, { delay: 0.2 });
  const tower = cylinder(0.1, 0.15, 1.5, 0xe8e2d0, 1.0, F + 0.1, -1.95, { delay: 0.25 }, 12);
  decorate(tower, new TorusGeometry(0.13, 0.04, 6, 16).rotateX(Math.PI / 2), MAGENTA, [
    [0, 0.45, 0],
    [0, 1.0, 0],
  ]);
  ball(0.09, ORANGE, 1.0, F + 1.6, -1.95, { delay: 0.3, flat: true });
  const beam = box(0.34, 0.04, 0.04, ORANGE, 1.0, F + 1.67, -1.95, { delay: 0.35, flat: true, noInk: true });

  // The wave: a swell rising out of the sea, a curling crest, foam along it.
  const WX = -1.45;
  const WZ = 0.2;
  add(new SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.9, 0.9, 1.3), SEA, WX - 0.15, F, WZ, { delay: 0.4 });
  const crest = add(new TorusGeometry(0.42, 0.15, 8, 20, Math.PI * 1.5).rotateZ(-Math.PI / 2).scale(1, 1, 4), SEA, WX, F + 0.18, WZ, { delay: 0.5 });
  const crestFoam = [-0.45, -0.15, 0.15, 0.45].map((dz, k) => ball(0.1, FOAM, WX + 0.05, F + 1.12, WZ + dz, { delay: 0.6 + k * 0.03 }));

  // Leeward at the edge, coat black and shining, between the wave and the child.
  const theta = 0.3;
  const moorer = figure(kit, {
    x: -0.05,
    z: 0.15,
    y: G,
    facing: theta,
    height: 2.6,
    build: "broad",
    skin: BASALT,
    hair: { style: "short", color: 0x8a8a90 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x4a3e3c, marks: ORANGE },
    top: { kind: "coat", color: 0x23252e, accent: 0x15161c },
    bottom: { kind: "trousers", color: 0x23252e },
    shoes: INK,
    arms: [
      [-0.75, 1.25, 0.22],
      [0.72, 1.18, 0.25],
    ],
    delay: 0.8,
  });
  const { at } = moorer;
  decorate(moorer.headPart, new BoxGeometry(0.012, 0.09, 0.01), ORANGE, [[-0.04, 0.4, 0.15, 0.6]]);
  [
    [-0.5, 0.25, 0.4],
    [0.45, 0.3, -0.5],
    [0.05, 0.5, 0.1],
    [-0.3, -0.25, 1.2],
  ].forEach(([dx, dz, angle], i) => box(0.36, 0.008, 0.022, INK, ...at(dx, 0, dz), { delay: 0.7 + i * 0.03, flat: true, noInk: true, rotation: [0, angle, 0] }));

  // The child behind him, dry, holding up a paper boat.
  const child = figure(kit, {
    x: 0.75,
    z: -0.35,
    y: G,
    facing: 0.0,
    height: 1.35,
    build: "child",
    skin: 0xe0b898,
    hair: { style: "bob", color: 0x3a2a22 },
    face: { mouth: "smile", brows: "raised" },
    headwear: { kind: "hood", color: ORANGE },
    top: { kind: "coat", color: ORANGE, accent: 0x8a3a10 },
    bottom: { kind: "trousers", color: 0x23404b },
    shoes: MAGENTA,
    arms: [[-0.12, 0.95, 0.25], "down"],
    delay: 1.2,
  });
  const [boatHand] = child.hands;
  add(new SphereGeometry(0.12, 4, 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.4, 0.8, 0.6), 0xf4f0e6, boatHand[0], boatHand[1] - 0.02, boatHand[2] + 0.05, { delay: 1.6 });
  box(0.012, 0.14, 0.012, 0xf4f0e6, boatHand[0], boatHand[1] + 0.06, boatHand[2] + 0.05, { delay: 1.62, noInk: true });

  // Spray flying off the crest and stopping dead against him.
  const shoulder = at(-0.6, 1.7, 0.1);
  const spray = Array.from({ length: 6 }, (_, k) => ball(0.05 + (k % 3) * 0.02, FOAM, WX, F + 1.2, WZ, { delay: 1.4 + k * 0.03, flat: true }));
  const crestY = crest.position.y;
  const foamY = crestFoam.map((part) => part.position.y);
  tick((t) => {
    // The wave heaves, the spray flies and breaks on him; the lighthouse beam turns.
    const heave = Math.sin(t * 1.6) * 0.06;
    crest.position.y = crestY + heave;
    crestFoam.forEach((part, k) => (part.position.y = foamY[k] + heave + Math.sin(t * 4 + k) * 0.02));
    spray.forEach((drop, k) => {
      const u = (t * 0.7 + k / 6) % 1;
      const spread = (k % 3) - 1;
      drop.position.set(WX + 0.2 + (shoulder[0] - WX - 0.2) * u, F + 1.15 + (shoulder[1] - F - 1.15) * u + Math.sin(u * Math.PI) * 0.5, WZ + spread * 0.3 + (shoulder[2] - WZ - spread * 0.3) * u);
      drop.visible = u < 0.95;
    });
    beam.rotation.y = t * 0.8;
  });

  return { width: 4.9, height: 4.6, lookY: 1.6 };
}
