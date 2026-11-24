import { BoxGeometry, CircleGeometry, CylinderGeometry, Mesh, MeshToonMaterial, SphereGeometry, TorusGeometry } from "three";
import { INK, MAGENTA, ORANGE, archMouth, archedWall, cable, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Dosimeter (P144): the technician of the Custodi stands at the hatch into a zone of the tear,
 * the rift crackling in the arch behind her, in a grey suit with orange patches, a glass bubble
 * of a helmet, the hose to her air tank and the dosimeter ticking on her chest. Over the arch the
 * clock shows her forty-three minutes; she holds up a gloved palm: she won't spend them on you.
 */
export function dosimeter(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const SUIT = 0xc4c8d0;
  const DARK = 0x2a2a32;
  const STEEL = 0x8a93a3;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x2e3240, 0x1e212b, 0.3);

  // The hatch: a concrete wall with an arch, hazard stripes, the rift crackling inside.
  const AX = -0.65;
  const wall = add(archedWall(3.0, 3.2, 0.25, { x: AX, half: 0.55, spring: 1.4 }), 0x3e4558, 0, G, -1.5, { delay: 0.1, ink: 1.02 });
  const stripes: [number, number, number, number][] = [];
  for (let k = 0; k < 6; k++) [-1, 1].forEach((side) => stripes.push([AX + side * 0.68, 0.2 + k * 0.28, 0.13, 0.7]));
  decorate(wall, new BoxGeometry(0.07, 0.22, 0.01), ORANGE, stripes);
  add(archMouth(0.55, 1.4), 0x3a1036, AX, G, -1.68, { delay: 0.15, flat: true, noInk: true });
  const rift = [0, 1].map((seed) => {
    const path = jag([AX + 0.05, G + 0.1, -1.52], [AX - 0.05, G + 1.85, -1.52], 7, 0.16, seed + 1);
    const outer = zigzag(kit, path, 0.09, MAGENTA, 0.4);
    const core = zigzag(kit, path.map(([x, y, z]) => [x, y, z + 0.03] as Point), 0.035, 0xe8fbff, 0.45);
    return [...outer, ...core];
  });
  motes(14, MAGENTA, 0.03, [AX - 0.45, G, -1.5], [AX + 0.45, G + 2.0, -1.1], 0.6);
  box(1.3, 0.008, 0.08, ORANGE, AX, G, -1.15, { delay: 0.2, flat: true, noInk: true });

  // The clock over the arch: forty-three minutes left, a hand sweeping round.
  const clock = add(new CylinderGeometry(0.32, 0.32, 0.05, 32).rotateX(Math.PI / 2), 0xe8e2d0, AX, G + 2.08, -1.36, { delay: 0.3 });
  const left = (43 / 60) * Math.PI * 2;
  decorate(clock, new CircleGeometry(0.27, 32, Math.PI / 2 - left, left), MAGENTA, [[0, 0.32, 0.03]]);
  decorate(
    clock,
    new BoxGeometry(0.02, 0.06, 0.01),
    INK,
    Array.from({ length: 12 }, (_, k) => [Math.sin((k * Math.PI) / 6) * 0.29, 0.32 + Math.cos((k * Math.PI) / 6) * 0.29, 0.031, -(k * Math.PI) / 6] as [number, number, number, number]),
  );
  const hand = add(new BoxGeometry(0.03, 0.26, 0.01).translate(0, 0.13, 0), INK, AX, G + 2.4, -1.32, { delay: 0.35, flat: true, noInk: true });

  // The corridor's side wall with its pipes and a gauge, and the air tank her hose runs to.
  box(0.2, 3.2, 1.7, 0x353b4c, -1.8, G, -0.5, { delay: 0.12, ink: 1.02 });
  [1.85, 2.15].forEach((y, i) => add(new CylinderGeometry(0.08, 0.08, 1.9, 12).rotateX(Math.PI / 2), 0x4a5468, -1.6, G + y, -0.5, { delay: 0.25 + i * 0.04 }));
  cylinder(0.07, 0.07, 1.9, 0x4a5468, -1.6, G, -1.0, { delay: 0.3 });
  const gauge = add(new CylinderGeometry(0.15, 0.15, 0.05, 24).rotateZ(Math.PI / 2), 0xe8e2d0, -1.5, G + 1.0, -1.0, { delay: 0.35 });
  decorate(gauge, new TorusGeometry(0.15, 0.02, 6, 20).rotateY(Math.PI / 2), ORANGE, [[0.03, 0.15, 0]]);
  const needle = add(new BoxGeometry(0.01, 0.12, 0.02).translate(0, 0.06, 0), INK, -1.47, G + 1.15, -1.0, { delay: 0.4, flat: true, noInk: true });
  add(new CylinderGeometry(0.22, 0.22, 0.8, 16).rotateX(Math.PI / 2), 0x2f6f86, 1.5, G, -0.75, { delay: 0.4 });
  cylinder(0.05, 0.05, 0.12, ORANGE, 1.5, G + 0.42, -0.45, { delay: 0.45 });

  // Dosimeter, palm up at us; a bubble helmet over her face.
  const facing = 0.3;
  const tech = figure(kit, {
    x: 0.85,
    z: 0.45,
    y: G,
    facing,
    height: 2.4,
    skin: 0xe0b090,
    hair: { style: "short", color: 0x3a2a22 },
    face: { mouth: "frown", brows: "angry" },
    top: { kind: "uniform", color: SUIT, accent: ORANGE },
    bottom: { kind: "trousers", color: 0xb4b8c0 },
    shoes: DARK,
    gloves: DARK,
    belt: DARK,
    arms: [[-0.4, 1.95, 0.46], [0.02, 1.47, 0.36]],
    delay: 0.8,
  });
  const on = (lx: number, ly: number, lz: number) => tech.at(lx, ly, lz);
  const turn: Point = [0, facing, 0];
  box(0.36, 0.1, 0.04, ORANGE, ...on(0, 1.38, 0.24), { delay: 1.2, rotation: turn });
  [-1, 1].forEach((side) => {
    add(new SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), ORANGE, ...on(side * 0.4, 1.66, 0), { delay: 1.22 });
    box(0.06, 0.62, 0.03, DARK, ...on(side * 0.15, 1.1, 0.25), { delay: 1.24, rotation: turn });
  });
  box(0.42, 0.55, 0.22, STEEL, ...on(0, 1.15, -0.32), { delay: 1.2, rotation: turn });
  cable(kit, [on(0.15, 1.4, -0.42), on(0.4, 0.9, -0.6), [1.35, G + 0.2, -0.3], [1.5, G + 0.5, -0.45]], 0.04, ORANGE, 1.4);
  // The palm she holds up.
  const [palmAt] = tech.hands;
  box(0.14, 0.17, 0.05, DARK, palmAt[0], palmAt[1] - 0.06, palmAt[2], { delay: 1.3, rotation: turn });
  // The dosimeter on her chest, its needle twitching.
  const dial = add(new CylinderGeometry(0.1, 0.1, 0.04, 20).rotateX(Math.PI / 2), 0xe8e2d0, ...on(-0.13, 1.47, 0.27), { delay: 1.3, rotation: turn });
  decorate(dial, new TorusGeometry(0.1, 0.02, 6, 20), ORANGE, [[0, 0.1, 0]]);
  const tickNeedle = add(new BoxGeometry(0.012, 0.08, 0.01).translate(0, 0.04, 0), MAGENTA, ...on(-0.13, 1.57, 0.3), { delay: 1.35, flat: true, noInk: true });
  tickNeedle.rotation.order = "YXZ";

  // The helmet: a metal collar, a glass bubble with a glint, a frame over the top with lamps.
  const [hx, hy, hz] = tech.head;
  add(new TorusGeometry(0.21, 0.05, 8, 20).rotateX(Math.PI / 2), STEEL, ...on(0, 1.8, 0.01), { delay: 1.4 });
  const glass = ball(0.36, 0xbfe8ff, hx, hy - 0.33, hz, { delay: 1.45, noInk: true });
  const material = (glass.children[0] as Mesh).material as MeshToonMaterial;
  material.transparent = true;
  material.opacity = 0.25;
  material.depthWrite = false;
  decorate(glass, new BoxGeometry(0.04, 0.16, 0.01), 0xffffff, [[-0.16, 0.5, 0.27, 0.5]]);
  add(new TorusGeometry(0.36, 0.022, 6, 24, Math.PI), STEEL, hx, hy + 0.01, hz, { delay: 1.5, rotation: [0, facing, 0] });
  [-1, 1].forEach((side) => {
    const [lx, ly, lz] = on(side * 0.37, 2.17, 0);
    ball(0.05, ORANGE, lx, ly - 0.05, lz, { delay: 1.55, flat: true });
  });

  tick((t) => {
    hand.rotation.z = -t * 0.9;
    rift.forEach((pieces, k) => pieces.forEach((piece) => (piece.visible = Math.floor(t * 7) % 2 === k)));
    tickNeedle.rotation.set(0, facing, -0.6 + Math.sin(t * 23) * 0.12 + Math.sin(t * 3.1) * 0.25);
    needle.rotation.x = 0.4 + Math.sin(t * 1.7) * 0.2;
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
