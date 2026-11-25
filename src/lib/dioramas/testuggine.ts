import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, ORANGE, YELLOW, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor, towerCrane } from "@/lib/diorama-props";

/**
 * Testuggine (P245): the Lete assault trooper on the quay under a crane, crested helmet on his
 * head, shoving a whole barricade of crates and sandbags ahead of him with his crimson tower
 * shield, the crescent of his halberd glowing orange over his shoulder. Behind his heels the
 * front line stays put; in front of him everything slides, scraping the paving. His battle plan
 * is chalked on the board behind him: one single arrow, straight ahead.
 */
export function testuggine(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const CRIMSON = 0x8a1a3a;
  const GOLD = 0xb08d3c;
  const SAND = 0x6a6450;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x30323e, 0x22242e, 0.5);

  towerCrane(kit, 1.25, -1.45, G, 0.1, 3.1, -1.5, 0x3a4a6a);

  // The battle plan: a slate on an easel, one arrow pointing forward.
  const [ex, ez] = [0.45, -1.3];
  const board = box(0.75, 0.55, 0.04, 0x1c2a2a, ex, G + 0.85, ez, { delay: 0.2, rotation: [0, 0.35, 0] });
  decorate(board, new BoxGeometry(0.06, 0.28, 0.01), CYAN, [[0, 0.22, 0.022]]);
  decorate(board, new ConeGeometry(0.11, 0.14, 3), CYAN, [[0, 0.43, 0.022]]);
  const across = (d: number, f: number): Point => [ex + d * Math.cos(0.35) + f * Math.sin(0.35), 0, ez - d * Math.sin(0.35) + f * Math.cos(0.35)];
  [-0.28, 0.28].forEach((d) => {
    const [bx, , bz] = across(d, 0.12);
    const [tx, , tz] = across(d * 0.85, 0.03);
    limb(kit, [bx, G, bz], [tx, G + 1.35, tz], 0.025, 0.02, 0x5e4a3a, { delay: 0.18 });
  });
  const [kx, , kz] = across(0, -0.35);
  const [jx, , jz] = across(0, -0.02);
  limb(kit, [kx, G, kz], [jx, G + 1.3, jz], 0.02, 0.02, 0x5e4a3a, { delay: 0.18 });

  // Testuggine, braced behind his shield.
  const H = 0.85;
  const soldier = figure(kit, {
    x: -0.45,
    z: 0.05,
    y: G,
    facing: H,
    height: 2.55,
    build: "broad",
    skin: 0xd0a080,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x6a5040, marks: 0x9a6a50 },
    headwear: { kind: "helmet", color: CRIMSON, accent: GOLD },
    top: { kind: "armor", color: CRIMSON, accent: 0xa8304e },
    bottom: { kind: "trousers", color: 0x5a1a2e },
    shoes: 0x3a2a24,
    belt: GOLD,
    gloves: 0x2a2228,
    cape: 0x1e2236,
    arms: [[-0.55, 1.25, 0.3], [0.2, 1.15, 0.45]],
    legs: "wide",
    delay: 0.8,
  });
  const P = soldier.at;
  const turned: [number, number, number] = [0, H, 0];
  const hy = soldier.head[1] - G;
  const crest = add(new CylinderGeometry(0.3, 0.3, 0.07, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), 0xc02040, ...P(0, hy + soldier.headRadius, -0.03), { delay: 1.3, rotation: turned });
  decorate(crest, new BoxGeometry(0.075, 0.02, 0.6), 0x8a1430, [[0, 0.02, 0]]);

  // The tower shield, crimson with a gold rim and boss.
  const shield = box(1.0, 1.65, 0.1, CRIMSON, ...P(0.15, 0.18, 0.62), { delay: 1.35, rotation: turned });
  decorate(shield, new BoxGeometry(1.0, 0.06, 0.01), GOLD, [
    [0, 0.06, 0.052],
    [0, 1.59, 0.052],
  ]);
  decorate(shield, new BoxGeometry(0.06, 1.65, 0.01), GOLD, [
    [-0.47, 0.825, 0.052],
    [0.47, 0.825, 0.052],
  ]);
  decorate(shield, new CylinderGeometry(0.15, 0.15, 0.05, 16).rotateX(Math.PI / 2), GOLD, [[0, 0.85, 0.07]]);
  decorate(shield, new BoxGeometry(0.04, 0.55, 0.01), 0xa8304e, [
    [-0.22, 0.45, 0.052, 0.4],
    [0.22, 1.25, 0.052, 0.4],
  ]);

  // The halberd over his right shoulder, its crescent blade glowing.
  const [hx, , hz] = P(-0.55, 0, 0.3);
  const haft = cylinder(0.035, 0.035, 2.6, 0x3a2a24, hx, G + 0.1, hz, { delay: 1.4 }, 8);
  const blade = add(new TorusGeometry(0.42, 0.06, 6, 20, Math.PI * 0.9).rotateZ(-Math.PI * 0.45).translate(-0.04, 0, 0), ORANGE, hx, G + 2.35 - 0.475, hz, { delay: 1.45, flat: true, rotation: [0, H + Math.PI, 0] });
  const edge = add(new TorusGeometry(0.47, 0.022, 6, 20, Math.PI * 0.8).rotateZ(-Math.PI * 0.4).translate(-0.06, 0, 0), YELLOW, hx, G + 2.35 - 0.47, hz, { delay: 1.5, flat: true, noInk: true, rotation: [0, H + Math.PI, 0] });

  // The barricade he is pushing: crates and sandbags, with scrape marks behind them.
  const pushed: Group[] = [
    crate(kit, ...xz(P(0.2, 0, 1.1)), G, 0.5, 0.45, 0x5e4a3a, H + 0.15),
    crate(kit, ...xz(P(-0.35, 0, 1.2)), G, 0.55, 0.4, 0x6b5442, H - 0.2),
    crate(kit, ...xz(P(0.05, 0, 1.15)), G + 0.45, 0.6, 0.36, 0x5e4a3a, H + 0.4),
    add(new SphereGeometry(0.2, 12, 8).scale(1.4, 0.55, 0.8), SAND, ...P(0.65, 0, 1.0), { delay: 0.62, rotation: turned }),
    add(new SphereGeometry(0.2, 12, 8).scale(1.4, 0.55, 0.8), SAND, ...P(-0.8, 0, 1.05), { delay: 0.64, rotation: turned }),
    add(new SphereGeometry(0.2, 12, 8).scale(1.4, 0.55, 0.8), 0x5a5444, ...P(-0.75, 0.2, 1.05), { delay: 0.66, rotation: [0, H + 0.2, 0] }),
  ];
  [-0.5, -0.3, 0.1, 0.35, 0.7].forEach((lx, i) => box(0.03, 0.006, 0.45, 0x14121c, ...P(lx, 0, 0.72), { delay: 0.7 + i * 0.02, flat: true, noInk: true, rotation: turned }));
  // The front line behind his heels, which does not move.
  [-0.9, -0.5, -0.1, 0.3, 0.7].forEach((lx, i) => box(0.24, 0.006, 0.05, CYAN, ...P(lx, 0, -0.5), { delay: 0.3 + i * 0.02, flat: true, noInk: true, rotation: turned }));
  const [mx, , mz] = P(0, 0, 1.25);
  motes(8, 0x8a8478, 0.03, [mx - 0.5, G, mz - 0.4], [mx + 0.5, G + 0.5, mz + 0.2], 1.0);

  const forward: Point = [Math.sin(H), 0, Math.cos(H)];
  const moving = [...soldier.parts, crest, shield, haft, blade, edge];
  const restSoldier = moving.map((part) => [part.position.x, part.position.z]);
  const restPushed = pushed.map((part) => [part.position.x, part.position.z]);
  const hot = new Color(0xffb040);
  const warm = new Color(ORANGE);
  tick((t) => {
    // A shove every couple of seconds: he leans in, and the barricade slides further.
    const s = Math.max(0, Math.sin(t * 2.2)) ** 6 * 0.07;
    moving.forEach((part, i) => part.position.set(restSoldier[i][0] + forward[0] * s, part.position.y, restSoldier[i][1] + forward[2] * s));
    const slide = s * 1.6;
    pushed.forEach((part, i) => part.position.set(restPushed[i][0] + forward[0] * slide, part.position.y, restPushed[i][1] + forward[2] * slide));
    colorOf(blade).lerpColors(warm, hot, (Math.sin(t * 3) + 1) / 2);
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}

/** A point's x and z, for the props that take them apart from the height. */
function xz(p: Point): [number, number] {
  return [p[0], p[2]];
}
