import { BoxGeometry, CylinderGeometry, Group, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Bolide (P320): in the tram depot at night the Figli's battering ram has just burst through the
 * brick wall, bricks still flying, and charges on head down, gritting his teeth. The tram line
 * curves away to the left; he went straight on, tearing up the rail. He does not see what is in
 * front of him either: a striped bollard right in his path.
 */
export function bolide(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const BRICK = 0x6a2a3a;
  const RAIL = 0x8a93a3;
  const F = octagonBase(kit, 0x1c1c26);
  const G = floor(kit, F, 0.06, 0x30343f, 0x24272f, 0.6);

  // The depot wall with the hole he made, its edges ragged.
  const bricks = (part: Group, w: number, h: number) => {
    const rows: [number, number, number][] = [];
    for (let y = 0.2; y < h; y += 0.2) rows.push([0, y, 0.155]);
    decorate(part, new BoxGeometry(w, 0.018, 0.01), 0x3a1a26, rows);
  };
  [
    [-0.5, 0.7, 2.8, 0],
    [1.15, 0.8, 2.8, 0],
    [0.3, 0.9, 0.8, 2.0],
  ].forEach(([x, w, h, y], i) => bricks(box(w, h, 0.3, BRICK, x, G + y, -1.55, { delay: 0.1 + i * 0.03, ink: 1.02 }), w, h));
  [
    [-0.12, 0.3],
    [-0.1, 1.1],
    [-0.13, 1.7],
    [0.72, 0.6],
    [0.74, 1.4],
    [0.1, 1.95],
    [0.5, 1.92],
  ].forEach(([x, y], i) => box(0.24, 0.12, 0.26, BRICK, x, G + y, -1.5, { delay: 0.2 + i * 0.02, rotation: [0, 0, (i % 3) * 0.3 - 0.3] }));
  box(0.9, 2.0, 0.02, 0x0e1420, 0.3, G, -1.68, { delay: 0.1, flat: true, noInk: true });

  // The parked tram on its straight track.
  const tram = box(0.85, 1.25, 1.5, 0x3a5a7a, -1.5, G + 0.2, -0.35, { delay: 0.3 });
  decorate(tram, new BoxGeometry(0.87, 0.18, 1.52), 0x2a3a5a, [[0, 0.1, 0]]);
  decorate(tram, new BoxGeometry(0.01, 0.38, 0.3), 0xff7aa8, [-0.45, -0.05, 0.35].map((z) => [0.43, 0.75, z] as Point));
  decorate(tram, new BoxGeometry(0.6, 0.42, 0.01), 0xff7aa8, [[0, 0.72, 0.755]]);
  decorate(tram, new BoxGeometry(0.4, 0.1, 0.01), 0x14121c, [[0, 1.08, 0.755]]);
  decorate(tram, new BoxGeometry(0.1, 0.08, 0.01), CYAN, [
    [-0.28, 0.32, 0.755],
    [0.28, 0.32, 0.755],
  ]);
  box(0.7, 0.2, 1.2, 0x23222b, -1.5, G, -0.35, { delay: 0.28 });
  limb(kit, [-1.5, G + 1.45, -0.55], [-1.5, G + 1.8, -0.3], 0.015, 0.015, INK, { delay: 0.4, noInk: true });
  limb(kit, [-1.5, G + 1.45, -0.05], [-1.5, G + 1.8, -0.3], 0.015, 0.015, INK, { delay: 0.4, noInk: true });
  box(0.5, 0.03, 0.06, INK, -1.5, G + 1.8, -0.3, { delay: 0.42, noInk: true });
  [-1.8, -1.2].forEach((x) => box(0.05, 0.04, 1.9, RAIL, x, G, 0.05, { delay: 0.25, noInk: true }));

  // His line: straight rails from the wall that curve away left, the outer one torn up where he went on.
  const [cx, cz] = [-1.75, -0.2];
  [-1.25, -0.85, -0.45].forEach((z, k) => box(0.75, 0.03, 0.12, 0x3e3028, 0, G, z, { delay: 0.3 + k * 0.02, noInk: true }));
  [0.1, 0.35, 0.6, 0.85].forEach((a, k) => box(0.75, 0.03, 0.12, 0x3e3028, cx + 1.75 * Math.cos(a), G, cz + 1.75 * Math.sin(a), { delay: 0.36 + k * 0.02, noInk: true, rotation: [0, -a, 0] }));
  [-0.25, 0.25].forEach((x) => box(0.05, 0.05, 1.2, RAIL, x, G + 0.03, -0.8, { delay: 0.35, noInk: true }));
  add(new TorusGeometry(1.5, 0.028, 4, 24, 0.95).rotateX(Math.PI / 2), RAIL, cx, G + 0.03, cz, { delay: 0.38, noInk: true });
  add(new TorusGeometry(2.0, 0.028, 4, 24, 0.7).rotateX(Math.PI / 2).rotateY(-0.25), RAIL, cx, G + 0.03, cz, { delay: 0.38, noInk: true });
  box(0.05, 0.7, 0.05, RAIL, 0.25, G, -0.18, { delay: 0.45, rotation: [1.0, 0, -0.2] });
  // The crack he leaves, dead straight, and a bollard dead ahead.
  [-1.2, -0.7, -0.2, 0.3].forEach((z, i) => box(0.5, 0.008, 0.025, INK, 0.25 + (i % 2) * 0.06, G, z, { delay: 0.5, flat: true, noInk: true, rotation: [0, Math.PI / 2 + (i % 2 ? 0.25 : -0.25), 0] }));
  const post = cylinder(0.14, 0.16, 0.65, 0x23222b, 0.5, G, 1.8, { delay: 0.5 }, 14);
  decorate(post, new CylinderGeometry(0.152, 0.152, 0.1, 14), YELLOW, [
    [0, 0.15, 0],
    [0, 0.4, 0],
  ]);
  decorate(post, new CylinderGeometry(0.142, 0.142, 0.03, 14), MAGENTA, [[0, 0.64, 0]]);

  // Bolide, mid-charge, leaning into it.
  const B = figure(kit, {
    x: 0.2,
    z: 0.1,
    y: G,
    facing: 0.15,
    height: 2.4,
    build: "broad",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x1a1a1e },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "armor", color: 0x1e1c26, accent: 0xb0203a },
    bottom: { kind: "trousers", color: 0x1e1c26 },
    shoes: 0x2a2630,
    gloves: 0x2a2630,
    arms: [[-0.35, 1.35, 0.6], [0.6, 1.4, -0.35]],
    legs: "stride",
    delay: 0.8,
  });
  [-1, 1].forEach((s) => B.parts.push(box(0.2, 0.22, 0.12, 0xb0203a, ...B.at(s * 0.17, 0.52, s < 0 ? 0.3 : 0.05), { delay: 1.3, rotation: [0, 0.15, 0] })));
  const feet = new Vector3(...B.at(0, 0, 0));
  const lean = new Group();
  tram.parent?.add(lean);
  lean.position.copy(feet);
  B.parts.forEach((part) => {
    part.position.sub(feet);
    lean.add(part);
  });
  const axis = new Vector3(Math.cos(0.15), 0, -Math.sin(0.15));
  // Speed lines trailing back to the hole.
  [
    [-0.35, 1.9],
    [0.75, 1.5],
    [-0.25, 1.1],
  ].forEach(([dx, y], i) => box(0.025, 0.025, 0.9, i === 1 ? CYAN : MAGENTA, 0.2 + dx, G + y, -0.65, { delay: 1.5 + i * 0.05, flat: true, noInk: true }));

  // Bricks flying out of the hole after him, and dust.
  const hole = new Vector3(0.3, G + 1.0, -1.4);
  const flying = Array.from({ length: 7 }, (_, k) => ({
    part: box(0.2, 0.1, 0.12, BRICK, hole.x, hole.y, hole.z, { delay: 1.2 }),
    v: new Vector3(Math.sin(k * 2.3) * 0.6, 0.8 + (k % 3) * 0.5, 1.1 + (k % 2) * 0.5),
    phase: k / 7,
  }));
  motes(14, 0x8a8ea0, 0.04, [-0.3, G + 0.1, -1.3], [0.9, G + 1.6, -0.2], 1);

  tick((t) => {
    lean.quaternion.setFromAxisAngle(axis, 0.22 + Math.abs(Math.sin(t * 7)) * 0.03);
    lean.position.y = feet.y + Math.abs(Math.sin(t * 7)) * 0.03;
    flying.forEach(({ part, v, phase }, k) => {
      const s = ((t / 1.4 + phase) % 1) * 1.1;
      part.position.set(hole.x + v.x * s, Math.max(G, hole.y + v.y * s - 3 * s * s), hole.z + v.z * s);
      part.rotation.set(s * 6 + k, s * 4, 0);
    });
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
