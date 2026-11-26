import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, ORANGE, aim, colorOf, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, crate, floor, steps } from "@/lib/diorama-props";

/**
 * Trivella (P304): the Compagnia Lete driller at the night dig by the temple steps, where a
 * crack still glows from the night his rig touched the stone. His forearms, ringed in steel, have
 * become the drill: braced wide, he bores into a boulder and the chips and sparks fly; beside him
 * the rig's mast blinks. The price of never being quiet: everything near him shakes, the tin mug
 * on the crate hops and the puddle keeps rippling.
 */
export function trivella(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STEEL = 0x8a93a3;
  const DARK_STEEL = 0x3a4050;
  const SUIT = 0xe0661a;
  const GREY = 0x3a3a44;
  const ROCK = 0x6a7080;
  const F = octagonBase(kit, 0x1f1c26);
  const G = floor(kit, F, 0.06, 0x3a3038, 0x2a2228, 0);

  // The temple steps behind, a whole column and a broken one, and the glowing crack.
  steps(kit, -1.05, -0.55, G, 0.1, { width: 1.6, count: 3, color: 0x5d6680 });
  column(kit, -1.6, -1.15, G + 0.48, 0.25, 2.3);
  column(kit, -0.55, -1.15, G + 0.48, 0.3, 2.3, true);
  zigzag(
    kit,
    [
      [-1.55, G + 0.33, -0.83],
      [-1.35, G + 0.25, -0.82],
      [-1.2, G + 0.4, -0.82],
      [-0.95, G + 0.28, -0.82],
      [-0.75, G + 0.36, -0.82],
    ],
    0.03,
    CYAN,
    0.5,
  );

  // The rig: a platform, the lattice mast with its warning light, the drill pipe into the ground.
  box(0.9, 0.22, 0.8, DARK_STEEL, 1.35, G, -1.05, { delay: 0.2 });
  const mast = box(0.26, 3.0, 0.26, 0x4a5262, 1.35, G + 0.22, -1.05, { delay: 0.26 });
  decorate(
    mast,
    new BoxGeometry(0.012, 0.36, 0.012),
    CYAN,
    Array.from({ length: 8 }, (_, k) => [0, 0.2 + k * 0.35, 0.135, k % 2 ? 0.6 : -0.6] as [number, number, number, number]),
  );
  box(0.5, 0.18, 0.4, DARK_STEEL, 1.35, G + 3.22, -1.05, { delay: 0.34 });
  const beacon = box(0.12, 0.12, 0.12, MAGENTA, 1.35, G + 3.4, -1.05, { delay: 0.4, flat: true, noInk: true });
  cylinder(0.06, 0.06, 2.6, STEEL, 1.05, G + 0.22, -0.8, { delay: 0.36 }, 10);
  box(0.012, 0.5, 0.012, INK, 1.05, G + 2.82, -0.8, { delay: 0.38, noInk: true });

  // His crate by the puddle: the hard hat he never wears, and his tin mug.
  crate(kit, -1.55, 0.55, G, 0.45, 0.5, 0x5e4a3a, 0.3);
  add(new SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), ORANGE, -1.65, G + 0.5, 0.48, { delay: 0.6 });
  cylinder(0.21, 0.21, 0.02, ORANGE, -1.65, G + 0.5, 0.48, { delay: 0.62 }, 16);
  const mug = cylinder(0.06, 0.055, 0.13, 0x9aa0ab, -1.42, G + 0.5, 0.68, { delay: 0.66 }, 12);
  decorate(mug, new TorusGeometry(0.04, 0.012, 6, 12), 0x9aa0ab, [[0.07, 0.07, 0]]);
  decorate(mug, new CylinderGeometry(0.05, 0.05, 0.005, 12), 0x3a2418, [[0, 0.128, 0]]);
  add(new CylinderGeometry(0.38, 0.38, 0.006, 18).scale(1, 1, 0.6), 0x14303f, -0.85, G, 1.1, { delay: 0.5, flat: true, noInk: true });
  const ripples = [0, 1].map((k) => add(new TorusGeometry(0.14, 0.012, 4, 24).rotateX(Math.PI / 2), 0x5aa8c8, -0.85, G + 0.008, 1.1, { delay: 0.7 + k * 0.05, flat: true, noInk: true }));

  // The driller, braced wide, both arms down to the drill.
  const facing = 0.7;
  const u = 2.5 / 2.4;
  const man = figure(kit, {
    x: -0.4,
    z: 0.2,
    y: G,
    facing,
    height: 2.5,
    build: "broad",
    skin: 0xc89070,
    hair: { style: "short", color: 0xa8acb4 },
    face: { mouth: "frown", brows: "angry", marks: 0x9a6a50 },
    top: { kind: "jacket", color: SUIT, accent: 0xc85a1a },
    bottom: { kind: "trousers", color: 0xc85a1a },
    shoes: 0x2a2622,
    gloves: 0x2a2a30,
    arms: [
      [-0.13, 1.12, 0.68],
      [0.14, 1.18, 0.66],
    ],
    legs: "wide",
    delay: 0.8,
  });
  // Grey hazard bands round the jacket.
  const chest = 0.7 * u;
  [0.16, 0.46].forEach((y) => {
    const r = (0.36 + (0.09 * y) / chest) * u * 1.03;
    decorate(man.parts[7], new CylinderGeometry(r, r, 0.1, 18, 1, true).scale(1, 1, 0.72), GREY, [[0, y, 0]]);
  });
  // Ear defenders round his neck.
  [-1, 1].forEach((side) =>
    add(new CylinderGeometry(0.09, 0.09, 0.08, 14).rotateZ(Math.PI / 2), ORANGE, ...man.at(side * 0.19 * u, 1.8 * u, 0.02), { delay: 1.3, rotation: [0, facing, 0] }),
  );
  add(new TorusGeometry(0.22 * u, 0.025, 6, 16, Math.PI).rotateX(-Math.PI / 2), 0x2a2a30, ...man.at(0, 1.88 * u, 0.01), { delay: 1.32, rotation: [0, facing, 0] });

  // Steel rings round the forearms, the chuck where his hands meet, the bit into the rock.
  const shaking: Group[] = [];
  man.hands.forEach((hand, i) => {
    const elbow = man.elbows[i];
    const { rotation } = aim(elbow, hand);
    [0.15, 0.38, 0.6, 0.82].forEach((k, j) => {
      const at: Point = [elbow[0] + (hand[0] - elbow[0]) * k, elbow[1] + (hand[1] - elbow[1]) * k, elbow[2] + (hand[2] - elbow[2]) * k];
      shaking.push(add(new TorusGeometry(0.16, 0.04, 6, 18).rotateX(Math.PI / 2), j % 2 ? STEEL : 0x6a7282, ...at, { delay: 1.35 + j * 0.03, rotation }));
    });
  });
  const base = man.at(0.01, 1.08, 0.74);
  const tip = man.at(0, 0.58, 1.0);
  const drill = aim(base, tip);
  shaking.push(cylinder(0.17, 0.17, 0.18, DARK_STEEL, ...base, { delay: 1.45, rotation: drill.rotation }, 12));
  const bit = add(new ConeGeometry(0.13, drill.length - 0.12, 10), STEEL, ...base, { delay: 1.5, rotation: drill.rotation });
  bit.position.set(base[0] + (tip[0] - base[0]) * 0.16, base[1] + (tip[1] - base[1]) * 0.16, base[2] + (tip[2] - base[2]) * 0.16);
  decorate(
    bit,
    new TorusGeometry(0.1, 0.018, 4, 14).rotateX(Math.PI / 2),
    DARK_STEEL,
    [0.06, 0.18, 0.3, 0.42].map((y, k) => [0, y, 0, k * 0.2] as [number, number, number, number]),
  );
  shaking.push(bit);
  const rest = shaking.map((part) => part.position.clone());

  // The boulder he bores into, cracked, with chips and sparks flying off it.
  const rock = man.at(0, 0, 1.32);
  const boulder = add(new DodecahedronGeometry(0.42).scale(1.2, 0.9, 1), ROCK, rock[0], G - 0.05, rock[2], { delay: 0.55, rotation: [0.2, 0.5, 0] });
  decorate(boulder, new BoxGeometry(0.02, 0.4, 0.02), INK, [
    [-0.2, 0.45, 0.42, 0.5],
    [0.15, 0.4, 0.44, -0.4],
  ]);
  const chips = Array.from({ length: 7 }, (_, k) =>
    k < 4
      ? add(new DodecahedronGeometry(0.05 + (k % 2) * 0.02), k % 2 ? ROCK : 0x8a90a0, ...tip, { delay: 1.6 + k * 0.03 })
      : box(0.04, 0.04, 0.04, k % 2 ? ORANGE : 0xffd60a, ...tip, { delay: 1.6 + k * 0.03, flat: true, noInk: true }),
  );
  // Shake lines round his elbows.
  const lines = man.elbows.flatMap((elbow, i) =>
    [-1, 1].map((side) =>
      add(new TorusGeometry(0.28, 0.012, 4, 10, 1.1), 0xf4f0e6, elbow[0], elbow[1] - 0.25, elbow[2], {
        delay: 1.7,
        flat: true,
        noInk: true,
        rotation: [0, facing + (i ? 0.3 : -0.3), side > 0 ? -0.5 : 2.6],
      }),
    ),
  );

  const beam = colorOf(beacon);
  tick((t) => {
    // The jackhammer shake: rings and bit jitter, every frame a new offset.
    const jx = Math.sin(t * 71) * 0.012;
    const jy = Math.sin(t * 53 + 1) * 0.01;
    shaking.forEach((part, i) => part.position.set(rest[i].x + jx, rest[i].y + jy, rest[i].z - jx));
    lines.forEach((line, i) => (line.visible = Math.floor(t * 12 + i) % 2 === 0));
    chips.forEach((chip, k) => {
      const p = (t * 0.9 + k / 7) % 1;
      const angle = k * 2.2;
      chip.position.set(tip[0] + Math.cos(angle) * p * 0.7, tip[1] + p * 0.9 - p * p * 1.1, tip[2] + Math.sin(angle) * p * 0.5 + p * 0.2);
      chip.rotation.set(t * 5 + k, t * 3, 0);
    });
    // Everything near him trembles: the mug hops, the puddle rings spread.
    mug.position.y = G + 0.5 + Math.abs(Math.sin(t * 19)) * 0.025;
    mug.rotation.z = Math.sin(t * 23) * 0.06;
    ripples.forEach((ring, k) => {
      const r = (t * 0.7 + k * 0.5) % 1;
      ring.children[0].scale.set(0.6 + r * 1.6, 1, (0.6 + r * 1.6) * 0.6);
    });
    beam.setHex(Math.floor(t * 1.5) % 2 ? 0x5a1030 : MAGENTA);
  });

  return { width: 4.9, height: 4.6, lookY: 1.75 };
}
