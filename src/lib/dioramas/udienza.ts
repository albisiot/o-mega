import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from "three";
import { CYAN, MAGENTA, YELLOW, archMouth, archedWall, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor } from "@/lib/diorama-props";

/**
 * Udienza (P246): the empire's inquisitor in her hall of audience, a lit arch and magenta
 * banners behind her, wearing her crown of brass ear trumpets. She does not even look at the
 * man on the stool: she stands with her gloved fingers steepled while his nervous breaths drift
 * across to her trumpets, turning magenta on the way when he lies; he sweats. She could not
 * hold him herself: a little bell waits on its stand to call the guards.
 */
export function udienza(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BRASS = 0xb08d3c;
  const ROBE = 0x3a1e4a;
  const WALL = 0x2a3048;
  const F = octagonBase(kit, 0x1f1c28);
  const G = floor(kit, F, 0.06, 0x2a2636, 0x1e1a28, 0.6);

  // The hall: a wall with a lit arch, two columns and two magenta banners.
  add(archedWall(2.8, 3.0, 0.25, { x: 0, half: 0.38, spring: 1.45 }), WALL, 0.1, G, -1.5, { delay: 0.06, ink: 1.02 });
  add(archMouth(0.38, 1.45), 0xffd27a, 0.1, G, -1.67, { delay: 0.1, flat: true, noInk: true });
  cylinder(0.1, 0.14, 0.9, 0x1a1626, 0.1, G, -1.78, { delay: 0.12, noInk: true }, 10);
  ball(0.1, 0x1a1626, 0.1, G + 0.9, -1.78, { delay: 0.14, noInk: true });
  column(kit, -1.15, -1.2, G, 0.14, 3.0, false, 0x3a5a78);
  column(kit, 1.35, -1.05, G, 0.18, 3.0, false, 0x3a5a78);
  const pennant = new Shape();
  pennant.moveTo(-0.2, 0.3);
  pennant.lineTo(0, 0);
  pennant.lineTo(0.2, 0.3);
  pennant.lineTo(0.2, 1.6);
  pennant.lineTo(-0.2, 1.6);
  pennant.closePath();
  [-0.72, 0.92].forEach((x, i) => {
    const banner = add(new ExtrudeGeometry(pennant, { depth: 0.03, bevelEnabled: false }), 0x8a1e50, x, G + 1.0, -1.38, { delay: 0.22 + i * 0.04 });
    decorate(banner, new BoxGeometry(0.16, 0.16, 0.01), MAGENTA, [[0, 1.0, 0.035, Math.PI / 4]]);
    decorate(banner, new BoxGeometry(0.03, 0.9, 0.01), 0xd06090, [[0, 0.95, 0.035]]);
  });

  // The bell on its stand, to call the guards.
  box(0.12, 0.9, 0.12, 0x2a2230, 1.2, G, 0.35, { delay: 0.3 });
  box(0.3, 0.04, 0.26, 0x3a2e40, 1.2, G + 0.9, 0.35, { delay: 0.34 });
  cylinder(0.035, 0.1, 0.15, BRASS, 1.2, G + 0.94, 0.35, { delay: 0.38 }, 14);
  ball(0.035, BRASS, 1.2, G + 1.08, 0.35, { delay: 0.4 });

  // The man on the stool, hands tied behind him, sweating.
  cylinder(0.22, 0.22, 0.06, 0x4a3a30, -1.35, G + 0.38, 0.25, { delay: 0.3 }, 14);
  [0, 1, 2].forEach((k) => {
    const a = (k / 3) * Math.PI * 2;
    limb(kit, [-1.35 + Math.sin(a) * 0.2, G, 0.25 + Math.cos(a) * 0.2], [-1.35 + Math.sin(a) * 0.12, G + 0.39, 0.25 + Math.cos(a) * 0.12], 0.025, 0.025, 0x3a2e26, { delay: 0.3 });
  });
  const suspect = figure(kit, {
    x: -1.35,
    z: 0.25,
    y: G,
    facing: 1.86,
    height: 2.25,
    skin: 0xd8a888,
    hair: { style: "short", color: 0x4a3020 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "shirt", color: 0x4a5a6a },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    arms: ["back", "back"],
    legs: "sit",
    delay: 0.6,
  });
  const drop = add(new ConeGeometry(0.025, 0.06, 8).rotateX(Math.PI), CYAN, ...suspect.at(-0.2, 1.62, 0.05), { delay: 1.2, flat: true, noInk: true });
  const dropTop = drop.position.y;

  // Udienza, fingers steepled, in a robe with a high collar and broad shoulders.
  const H = 0.3;
  const judge = figure(kit, {
    x: 0.3,
    z: -0.3,
    y: G,
    facing: H,
    height: 2.5,
    build: "slim",
    skin: 0xe8c8c0,
    hair: { style: "bun", color: 0xa8aab8 },
    face: { mouth: "neutral", brows: "calm" },
    top: { kind: "robe", color: ROBE, accent: 0x6a2a5a },
    shoes: 0x1e1626,
    belt: 0x2a1436,
    gloves: 0x5a2a6a,
    arms: [[-0.03, 1.6, 0.34], [0.03, 1.6, 0.34]],
    delay: 0.9,
  });
  const P = judge.at;
  add(new ConeGeometry(0.05, 0.16, 6), 0x5a2a6a, ...P(0, 1.62, 0.34), { delay: 1.5, rotation: [0, H, 0] });
  [-1, 1].forEach((side) => {
    box(0.03, 0.4, 0.2, ROBE, ...P(side * 0.15, 1.72, -0.06), { delay: 1.45, rotation: [0, H, -side * 0.25] });
    box(0.34, 0.06, 0.42, 0x4a2a5a, ...P(side * 0.38, 1.84, 0), { delay: 1.42, rotation: [0, H, -side * 0.35] });
  });
  // The crown of ear trumpets, their bells turned outwards.
  const hy = judge.head[1] - G;
  const horns = [-1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35].map((a, k) => {
    const from = P(Math.sin(a) * 0.2, hy + Math.cos(a) * 0.2 + 0.03, -0.06);
    const to = P(Math.sin(a) * 0.5, hy + Math.cos(a) * 0.48 + 0.05, 0.1);
    const horn = limb(kit, from, to, 0.02, 0.085, BRASS, { delay: 1.55 + k * 0.03 });
    decorate(horn, new CylinderGeometry(0.068, 0.068, 0.012, 14), 0x2a1a10, [[0, Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) + 0.002, 0]]);
    return { horn, tip: to };
  });

  // His breaths, drifting from his mouth to her trumpet.
  const mouth = suspect.at(0, suspect.head[1] - G - 0.09, 0.22);
  const ear = horns[0].tip;
  const lift: Point = [(mouth[0] + ear[0]) / 2, Math.max(mouth[1], ear[1]) + 0.45, (mouth[2] + ear[2]) / 2];
  const breaths = [0, 1, 2, 3].map((k) => ball(0.07, 0xcfefff, ...mouth, { delay: 1.8 + k * 0.05, flat: true, noInk: true }));
  const calm = new Color(0xcfefff);
  const lie = new Color(MAGENTA);
  const brass = new Color(BRASS);
  const lit = new Color(YELLOW);
  tick((t) => {
    breaths.forEach((puff, k) => {
      const u = (t * 0.3 + k / 4) % 1;
      const v = 1 - u;
      puff.position.set(
        v * v * mouth[0] + 2 * u * v * lift[0] + u * u * ear[0],
        v * v * mouth[1] + 2 * u * v * lift[1] + u * u * ear[1] - 0.05,
        v * v * mouth[2] + 2 * u * v * lift[2] + u * u * ear[2],
      );
      puff.children[0].scale.setScalar(1.2 - u * 0.6);
      colorOf(puff).lerpColors(calm, lie, Math.min(1, u * 1.6));
    });
    colorOf(horns[0].horn).lerpColors(brass, lit, (Math.sin(t * 0.3 * Math.PI * 8) + 1) / 4);
    drop.position.y = dropTop - ((t * 0.5) % 1) * 0.5;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
