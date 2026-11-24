import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, ORANGE, aim, jag, limb, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Gauger (P130): the Banco's alien customs officer at the frontier of the rift, between two
 * round gates, one cyan and one magenta. Something dark has just come through and she raises
 * her brass stamp at it: orange rings fly from the stamp and its powers crumble away. On her
 * stone desk, the forms in triplicate; from its leg, the chain locked round her ankle.
 */
export function gauger(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x4a4f62;
  const COAT = 0x1f3a34;
  const SKIN = 0x5a86c0;
  const BRASS = 0xc8a040;
  const SHADOW = 0x241e36;
  const F = octagonBase(kit, 0x181a26);
  const G = floor(kit, F, 0.06, 0x2c3040, 0x20232e, 0.5);

  // The two gates of the rift, on stone steps, their insides swirling.
  const gate = (x: number, glow: number, inside: number, turn: number, delay: number) => {
    const z = -1.3;
    box(1.4, 0.15, 0.5, STONE, x, G, z, { delay, rotation: [0, turn, 0] });
    const y = G + 0.15;
    add(new TorusGeometry(0.72, 0.1, 8, 36), STONE, x, y, z, { delay: delay + 0.04, rotation: [0, turn, 0] });
    add(new CylinderGeometry(0.66, 0.66, 0.02, 36).rotateX(Math.PI / 2), inside, x, y + 0.16, z, { delay: delay + 0.06, flat: true, noInk: true, rotation: [0, turn, 0] });
    add(new TorusGeometry(0.64, 0.028, 6, 36), glow, x, y + 0.15, z + 0.01, { delay: delay + 0.08, flat: true, noInk: true, rotation: [0, turn, 0] });
    const swirl = new Group();
    const arcs = [0.45, 0.25].map((r, k) => {
      const arc = new TorusGeometry(r, 0.022, 4, 24, 3.6).rotateZ(k * 2);
      arc.computeBoundingBox();
      return add(arc, glow, 0, arc.boundingBox?.min.y ?? 0, 0.02, { delay: delay + 0.1 + k * 0.03, flat: true, noInk: true });
    });
    arcs[0].parent?.add(swirl);
    swirl.add(...arcs);
    swirl.position.set(x, y + 0.82, z + 0.03);
    swirl.rotation.order = "YXZ";
    swirl.rotation.set(0, turn, 0);
    return swirl;
  };
  const swirls = [gate(-0.95, CYAN, 0x0e3a4a, 0.25, 0.1), gate(0.95, MAGENTA, 0x4a1040, -0.15, 0.15)];

  // The desk: a block of stone with a meander band; forms in triplicate, the ink pad.
  const DX = -0.95;
  const DZ = 0.38;
  const DT = 0.3;
  const desk = box(1.15, 0.85, 0.6, 0x3e4458, DX, G, DZ, { delay: 0.3, rotation: [0, DT, 0] });
  // A band of the old pattern: two rails with diamonds between.
  decorate(desk, new BoxGeometry(1.0, 0.025, 0.01), 0x8a93a8, [
    [0, 0.76, 0.302],
    [0, 0.56, 0.302],
  ]);
  decorate(desk, new BoxGeometry(0.08, 0.08, 0.01), 0x8a93a8, [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4].map((x) => [x, 0.66, 0.302, Math.PI / 4] as [number, number, number, number]));
  const slab = box(1.25, 0.06, 0.68, STONE, DX, G + 0.85, DZ, { delay: 0.34, rotation: [0, DT, 0] });
  decorate(slab, new BoxGeometry(0.22, 0.012, 0.3), 0xf2efe6, [[-0.35, 0.066, 0.02, 0]]);
  decorate(slab, new BoxGeometry(0.22, 0.012, 0.3), 0xbfe8f4, [[-0.32, 0.078, 0.0, 0.08]]);
  decorate(slab, new BoxGeometry(0.22, 0.012, 0.3), 0xf4c0d8, [[-0.29, 0.09, -0.02, 0.16]]);
  decorate(slab, new BoxGeometry(0.2, 0.05, 0.14), 0x23222b, [[0.05, 0.085, -0.12]]);
  decorate(slab, new BoxGeometry(0.17, 0.012, 0.11), ORANGE, [[0.05, 0.112, -0.12]]);
  decorate(slab, new BoxGeometry(0.24, 0.012, 0.3), 0xf2efe6, [[0.32, 0.066, 0.08]]);
  decorate(slab, new TorusGeometry(0.07, 0.012, 6, 20).rotateX(Math.PI / 2), ORANGE, [[0.32, 0.075, 0.08]]);

  // Gauger: blue skin, pointed ears, orange eyes, green greatcoat, the stamp raised.
  const facing = 0.35;
  const officer = figure(kit, {
    x: 0.1,
    z: 0.15,
    y: G,
    facing,
    height: 2.45,
    build: "slim",
    skin: SKIN,
    hair: { style: "bald", color: SKIN },
    face: { mouth: "neutral", brows: "angry", eyes: 0xff9a20, glow: true, marks: 0x9ac0ee },
    top: { kind: "coat", color: COAT, accent: 0x16302a },
    bottom: { kind: "trousers", color: 0x1a2e2a },
    shoes: 0x14121c,
    arms: [
      [-0.55, 0.96, -0.08],
      [0.62, 1.95, 0.25],
    ],
    delay: 0.8,
  });
  const u = 2.45 / 2.4;
  const mark = box(0.001, 0.001, 0.001, COAT, ...officer.at(0, 0, 0), { delay: 1.0, noInk: true, rotation: [0, facing, 0] });
  decorate(mark, new SphereGeometry(0.025, 8, 6), CYAN, [1.2, 1.35, 1.5, 1.65].map((y) => [0.06, y * u, 0.22] as Point));
  // Her cap and her ears.
  const [hx, hy, hz] = officer.head;
  const RH = officer.headRadius;
  const capY = officer.top - 0.06;
  const crown = cylinder(0.27, 0.2, 0.13, COAT, hx, capY, hz, { delay: 1.3, rotation: [0, facing, 0] }, 20);
  decorate(crown, new CylinderGeometry(0.04, 0.04, 0.02, 12).rotateX(Math.PI / 2), CYAN, [[0, 0.08, 0.25]]);
  cylinder(0.205, 0.205, 0.05, INK, hx, capY, hz, { delay: 1.32 }, 20);
  box(0.32, 0.025, 0.14, INK, ...officer.at(0, capY - G, 0.24), { delay: 1.34, rotation: [0, facing, 0] });
  [-1, 1].forEach((side) => {
    const root = officer.at(side * RH * 0.9, hy - G, 0);
    const tip = officer.at(side * (RH + 0.2), hy - G + 0.12, -0.08);
    add(new ConeGeometry(0.05, aim(root, tip).length, 6), SKIN, ...root, { delay: 1.28, rotation: aim(root, tip).rotation });
  });

  // The stamp, aimed at the visitor; rings of nullity fly from it.
  const hand = officer.hands[1];
  const target = officer.at(1.28, 1.5, 0.15);
  const dir = new Vector3(target[0] - hand[0], target[1] - hand[1], target[2] - hand[2]).normalize();
  const along = (k: number): Point => [hand[0] + dir.x * k, hand[1] + dir.y * k, hand[2] + dir.z * k];
  ball(0.06, BRASS, ...along(-0.12), { delay: 1.4 });
  limb(kit, along(-0.08), along(0.1), 0.035, 0.035, 0x5e4a3a, { delay: 1.42 });
  limb(kit, along(0.1), along(0.2), 0.08, 0.12, BRASS, { delay: 1.44 });
  add(new TorusGeometry(0.09, 0.02, 6, 20).rotateX(Math.PI / 2), ORANGE, ...along(0.205), { delay: 1.46, flat: true, noInk: true, rotation: aim(hand, target).rotation });
  const rings = [0, 1, 2].map((k) => add(new TorusGeometry(0.11, 0.022, 6, 24).rotateX(Math.PI / 2), ORANGE, ...along(0.3), { delay: 1.5 + k * 0.03, flat: true, noInk: true, rotation: aim(hand, target).rotation }));
  const reach = aim(along(0.3), target).length;

  // The visitor from the magenta gate, crumbling where the rings hit.
  const VX = 1.35;
  const VZ = -0.2;
  const visitor = figure(kit, {
    x: VX,
    z: VZ,
    y: G,
    facing: -0.75,
    height: 2.35,
    build: "broad",
    skin: SHADOW,
    hair: { style: "wild", color: 0x16121f },
    face: { mouth: "open", brows: "angry", eyes: MAGENTA, glow: true },
    top: { kind: "robe", color: SHADOW },
    arms: ["forward", "out"],
    delay: 0.6,
  });
  const sparks = [0, 1, 2].map((k) =>
    zigzag(kit, jag(visitor.at(-0.3 + k * 0.3, 0.4 + k * 0.5, 0.25), visitor.at(0.1 - k * 0.2, 1.6 + k * 0.2, -0.2), 5, 0.12, k), 0.025, MAGENTA, 1.4),
  );
  const crumbs = Array.from({ length: 8 }, (_, k) => ({
    part: box(0.08, 0.08, 0.08, k % 3 ? SHADOW : 0x4a1a48, ...visitor.at(0.3, 1.0 + (k % 4) * 0.25, 0), { delay: 1.5 }),
    from: visitor.at(0.28, 0.9 + (k % 4) * 0.28, -0.05 + (k % 2) * 0.1),
    phase: k / 8,
  }));
  motes(10, MAGENTA, 0.025, [VX - 0.4, G + 0.3, VZ - 0.4], [VX + 0.4, G + 2.4, VZ + 0.4], 1.5);

  // The chain from the desk's foot to the cuff round her ankle.
  const cuff = officer.at(-0.17, 0.1, 0.04);
  add(new TorusGeometry(0.12, 0.035, 6, 16).rotateX(Math.PI / 2), 0xb8c0d0, cuff[0], cuff[1] - 0.04, cuff[2], { delay: 1.2 });
  const chain = new CatmullRomCurve3([[DX + 0.55, G + 0.3, DZ + 0.15], [-0.35, G + 0.06, 0.75], [-0.1, G + 0.06, 0.6], [cuff[0] - 0.05, cuff[1] + 0.02, cuff[2] + 0.1]].map((p) => new Vector3(...p)));
  for (let k = 0; k <= 11; k++) {
    const p = chain.getPointAt(k / 11);
    const q = chain.getPointAt(Math.min(1, k / 11 + 0.05));
    const link = new TorusGeometry(0.05, 0.016, 6, 10).scale(1, 1.5, 1);
    if (k % 2) link.rotateY(Math.PI / 2);
    add(link, 0xb8c0d0, p.x, p.y - 0.07, p.z, { delay: 1.2 + k * 0.02, rotation: aim([p.x, p.y, p.z], [q.x, q.y, q.z]).rotation });
  }

  tick((t) => {
    // The gates swirl; the rings fly; the visitor crackles and comes apart.
    swirls.forEach((swirl, k) => (swirl.rotation.z = t * (k ? -1.4 : 1.1)));
    rings.forEach((ring, k) => {
      const v = (t * 0.5 + k / 3) % 1;
      const p = along(0.3 + v * reach);
      ring.position.set(...p);
      ring.children.forEach((mesh) => mesh.scale.setScalar(1 + v * 1.8));
      ring.visible = v < 0.9;
    });
    const flick = Math.floor(t * 9) % 3;
    sparks.forEach((set, k) => set.forEach((piece) => (piece.visible = k !== flick || t === 0)));
    for (const c of crumbs) {
      const v = (t * 0.4 + c.phase) % 1;
      c.part.position.set(c.from[0] + v * 0.5, c.from[1] + v * 0.9, c.from[2] - v * 0.6);
      c.part.rotation.set(v * 6, v * 4, 0);
      c.part.visible = v < 0.85;
    }
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
