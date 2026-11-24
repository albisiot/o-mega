import { BoxGeometry, ConeGeometry, CylinderGeometry, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, INK, MAGENTA, ORANGE, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Ambit (P035): the hothead of the Lanterne on a fenced street court at night, mid-punch with
 * taped fists, gritting his teeth. Behind him a knocked-over bin says he hit first; in front of
 * him his fist goes straight through a little ghost, who just grins back: with no magic at all,
 * he can't land a blow on it. The ghost bobs, the speed lines flash.
 */
export function ambit(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const PIPE = 0x5a6878;
  const LINE = 0xc8d4dc;
  const F = octagonBase(kit, 0x182028);
  const G = floor(kit, F, 0.06, 0x24384a, 0x1c2c3a, 0);

  // Court markings.
  box(0.04, 0.006, 3.2, LINE, -1.25, G, 0.2, { delay: 0.1, flat: true, noInk: true });
  add(new TorusGeometry(0.75, 0.02, 4, 32, Math.PI).rotateX(Math.PI / 2), LINE, 1.2, G, -0.8, { delay: 0.12, flat: true, noInk: true });

  // The chain-link fence: posts, rails and the diagonal wire between them.
  const FZ = -1.3;
  const W = 3.3;
  const H = 2.5;
  [-1.6, 0, 1.6].forEach((x, i) => cylinder(0.045, 0.045, H + 0.1, PIPE, x, G, FZ, { delay: 0.14 + i * 0.03 }, 8));
  box(W, 0.05, 0.05, PIPE, 0, G + H, FZ, { delay: 0.2, noInk: true });
  const holder = box(W, 0.05, 0.05, PIPE, 0, G + 0.05, FZ, { delay: 0.18, noInk: true });
  const wire = (from: [number, number], to: [number, number]) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const lean = Math.atan2(to[1] - from[1], to[0] - from[0]);
    decorate(holder, new BoxGeometry(length, 0.012, 0.012), 0x8a98a8, [[(from[0] + to[0]) / 2 - W / 2, (from[1] + to[1]) / 2 - 0.05, 0, lean]]);
  };
  for (let c = -H; c < W; c += 0.24) {
    const a = Math.max(c, 0);
    const b = Math.min(c + H, W);
    if (b - a > 0.05) wire([a, a - c], [b, b - c]);
    const d = c + H;
    const e = Math.max(d - H, 0);
    const f = Math.min(d, W);
    if (f - e > 0.05) wire([e, d - e], [f, d - f]);
  }

  // The hoop, a ball left on the court, and the bin he knocked over first.
  cylinder(0.06, 0.07, 2.4, 0x3a4a5a, 1.2, G, -1.1, { delay: 0.3 }, 10);
  const board = box(0.8, 0.5, 0.04, 0xe0e4ea, 1.2, G + 1.95, -0.98, { delay: 0.34 });
  decorate(board, new BoxGeometry(0.3, 0.02, 0.01), ORANGE, [[0, 0.12, 0.021], [0, 0.3, 0.021]]);
  decorate(board, new BoxGeometry(0.02, 0.2, 0.01), ORANGE, [[-0.15, 0.21, 0.021], [0.15, 0.21, 0.021]]);
  add(new TorusGeometry(0.15, 0.018, 6, 20).rotateX(Math.PI / 2), ORANGE, 1.2, G + 2.02, -0.78, { delay: 0.38, noInk: true });
  add(new CylinderGeometry(0.15, 0.09, 0.26, 10, 1, true), 0xe8eef4, 1.2, G + 1.76, -0.78, { delay: 0.4, noInk: true });
  const basketball = ball(0.14, ORANGE, 0.95, G, 1.05, { delay: 0.5 });
  decorate(basketball, new TorusGeometry(0.142, 0.008, 4, 20), INK, [[0, 0.14, 0], [0, 0.14, 0, Math.PI / 2]]);
  cylinder(0.17, 0.15, 0.48, 0x2f6f60, -1.2, G + 0.17, -0.8, { delay: 0.45, rotation: [0, 0.3, Math.PI / 2] }, 12);
  cylinder(0.19, 0.19, 0.04, 0x1f4f44, -1.85, G, -0.25, { delay: 0.5, rotation: [0, 0, 0.15] }, 12);
  [[-1.6, -0.5], [-1.95, -0.75], [-1.3, -0.35]].forEach(([x, z], i) => ball(0.06, 0xe8e2d0, x, G, z, { delay: 0.55 + i * 0.03 }));

  // Ambit: curly black hair, black tank top, taped hands, a straight right.
  const FACE = 1.05;
  const fighter = figure(kit, {
    x: -0.75,
    z: 0.15,
    y: G,
    facing: FACE,
    height: 2.35,
    skin: 0xc89070,
    hair: { style: "curly", color: 0x1a1416 },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "tank", color: 0x17171e },
    bottom: { kind: "trousers", color: 0x2a2a3a },
    shoes: 0xe8e2d0,
    gloves: 0xece6d6,
    arms: [[-0.06, 1.8, 1.0], [0.2, 1.98, 0.34]],
    legs: "stride",
    delay: 0.8,
  });
  // His black curls over the crown (the figure's own cap sits too low and lets the scalp show).
  const RH = fighter.headRadius;
  ball(RH * 1.04, 0x1a1416, ...fighter.at(0, fighter.head[1] - G + RH * 0.14 - RH * 1.04, -RH * 0.15), { delay: 1.2 });
  const [fist] = fighter.hands;
  const shoulder = fighter.at(-0.4, 1.72, 0);
  const along = (k: number, dy: number): Point => [shoulder[0] + (fist[0] - shoulder[0]) * k, shoulder[1] + (fist[1] - shoulder[1]) * k + dy, shoulder[2] + (fist[2] - shoulder[2]) * k];
  const lines = [-0.26, -0.13, 0.12].map((dy, i) => {
    const from = along(0.42, dy);
    const to = along(0.85, dy);
    const { length, rotation } = aim(from, to);
    return box(0.025, length, 0.025, i === 1 ? CYAN : MAGENTA, ...from, { delay: 1.5 + i * 0.04, flat: true, noInk: true, rotation });
  });

  // The ghost, his fist right through it.
  const SPIRIT = 0xcff8ff;
  const forward: Point = [Math.sin(FACE), 0, Math.cos(FACE)];
  const g: Point = [fist[0] + forward[0] * 0.04, fist[1] - 0.3, fist[2] + forward[2] * 0.04];
  const ghost: Group[] = [
    add(new SphereGeometry(0.3, 16, 12).scale(1, 1.1, 1), SPIRIT, ...g, { delay: 1.4, flat: true, noInk: true }),
    add(new ConeGeometry(0.27, 0.5, 12).rotateX(Math.PI).rotateZ(0.25), SPIRIT, g[0] + 0.05, g[1] - 0.36, g[2], { delay: 1.42, flat: true, noInk: true }),
    ball(0.08, SPIRIT, g[0] - 0.33, g[1] + 0.24, g[2], { delay: 1.44, flat: true, noInk: true }),
    ball(0.08, SPIRIT, g[0] + 0.33, g[1] + 0.3, g[2], { delay: 1.44, flat: true, noInk: true }),
  ];
  ghost.forEach((part) => {
    const material = (part.children[0] as Mesh).material as MeshBasicMaterial;
    material.transparent = true;
    material.opacity = 0.6;
    material.depthWrite = false;
  });
  decorate(ghost[0], new BoxGeometry(0.06, 0.1, 0.02), INK, [[-0.1, 0.41, 0.3], [0.1, 0.41, 0.3]]);
  decorate(ghost[0], new BoxGeometry(0.14, 0.035, 0.02), INK, [[0, 0.26, 0.305]]);
  decorate(ghost[0], new BoxGeometry(0.035, 0.025, 0.02), INK, [[-0.085, 0.28, 0.3, -0.5], [0.085, 0.28, 0.3, 0.5]]);
  ghost[0].rotation.y = 0.35;

  const ghostRest = ghost.map((part) => part.position.y);
  const fighterRest = fighter.parts.map((part) => part.position.y);
  tick((t) => {
    const float = Math.sin(t * 1.6) * 0.12;
    ghost.forEach((part, i) => (part.position.y = ghostRest[i] + float + (i > 1 ? Math.sin(t * 3 + i) * 0.03 : 0)));
    const hop = Math.abs(Math.sin(t * 4)) * 0.02;
    fighter.parts.forEach((part, i) => (part.position.y = fighterRest[i] + hop));
    lines.forEach((line, i) => (line.visible = Math.floor(t * 5 + i) % 4 !== 3));
  });

  return { width: 4.9, height: 4.4, lookY: 1.45 };
}
