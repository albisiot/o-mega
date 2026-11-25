import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, IcosahedronGeometry, Shape, TorusGeometry, Vector3 } from "three";
import { CYAN, MAGENTA, ORANGE, cable, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, lamp } from "@/lib/diorama-props";

/**
 * Alaggio (P241): the Guild's tug pilot hauling a wreck out of the gulf on foot. On the towpath
 * he leans into a stride in his green dry suit, a coil of rope over one shoulder and an air tank
 * on his chest, the tow rope gripped in both fists and slung over his back to a faceted chunk of
 * a fallen ship that rocks half sunk in the water, its lights still blinking. Nothing rattles
 * him: his mug of tea steams on the bollard beside the lamp.
 */
export function alaggio(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const WATER = 0x0e3a4e;
  const FOAM = 0xcfeef7;
  const STONE = 0x464a5c;
  const ROPE = 0x8a90a8;
  const SUIT = 0x2f5a48;
  const STEEL = 0x8a93a3;
  const F = octagonBase(kit, WATER);

  // The towpath: the base's octagon cut along z = −0.35, raised above the water.
  const corners = Array.from({ length: 8 }, (_, k) => [2.3 * Math.cos(Math.PI / 8 + (k * Math.PI) / 4), 2.3 * Math.sin(Math.PI / 8 + (k * Math.PI) / 4)]);
  const kept: [number, number][] = [];
  const EDGE = -0.35;
  corners.forEach(([x, z], k) => {
    const [nx, nz] = corners[(k + 1) % 8];
    if (z >= EDGE) kept.push([x, z]);
    if (z >= EDGE !== nz >= EDGE) kept.push([x + ((nx - x) * (EDGE - z)) / (nz - z), EDGE]);
  });
  const outline = new Shape();
  kept.forEach(([x, z], k) => (k ? outline.lineTo(x, z) : outline.moveTo(x, z)));
  outline.closePath();
  const path = add(new ExtrudeGeometry(outline, { depth: 0.3, bevelEnabled: false }).rotateX(Math.PI / 2), STONE, 0, F, 0, { delay: 0.06, ink: 1.01 });
  const G = F + 0.3;
  const inner = 2.06;
  const half = (d: number) => Math.min(inner, inner * Math.SQRT2 - Math.abs(d));
  for (let z = 0.15; z < 2.1; z += 0.5) decorate(path, new BoxGeometry(2 * half(z), 0.004, 0.012), 0x30323f, [[0, 0.302, z]]);
  for (let x = -1.5; x < 1.6; x += 0.5) decorate(path, new BoxGeometry(0.012, 0.004, half(x) - EDGE), 0x30323f, [[x, 0.302, (half(x) + EDGE) / 2]]);
  box(4.35, 0.07, 0.2, 0x5a5e72, 0, G, EDGE + 0.1, { delay: 0.1 });

  /** A ring spreading on the water, again and again. */
  const ripple = (x: number, z: number, radius: number, period: number, phase: number, delay: number) => {
    const wave = add(new TorusGeometry(radius, 0.018, 6, 36).rotateX(Math.PI / 2), FOAM, x, F + 0.002, z, { delay, flat: true, noInk: true });
    tick((t) => {
      const u = ((t + phase) / period) % 1;
      wave.children[0].scale.set(0.6 + u * 0.8, 1, 0.6 + u * 0.8);
      wave.children[0].visible = u < 0.85;
    });
  };

  // The wreck: a faceted chunk of a fallen ship, half sunk, a broken fin, its lights blinking.
  const W = new Vector3(0.85, F, -1.25);
  const wreckParts = [add(new IcosahedronGeometry(0.75, 0).scale(1.4, 1.0, 0.95), 0x2e3350, W.x, F - 0.02, W.z, { delay: 0.3, rotation: [0.3, 0.5, 0.25] })];
  const lights = decorate(
    wreckParts[0],
    new BoxGeometry(0.07, 0.07, 0.07),
    MAGENTA,
    [
      [-0.55, 0.45, 0.52],
      [0.1, 0.7, 0.64],
      [0.62, 0.6, 0.44],
      [-0.2, 1.22, 0.37],
    ].map(([x, y, z]) => [x * 1.1, y, z] as Point),
  );
  decorate(wreckParts[0], new BoxGeometry(0.5, 0.03, 0.03), CYAN, [
    [-0.15, 0.95, 0.68, 0.2],
    [0.35, 0.45, 0.72, -0.1],
  ]);
  const finShape = new Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.55, 0);
  finShape.lineTo(0.1, 0.9);
  finShape.closePath();
  wreckParts.push(add(new ExtrudeGeometry(finShape, { depth: 0.05, bevelEnabled: false }).translate(-0.2, 0, -0.025), 0x3a3550, W.x + 0.1, F + 1.0, W.z - 0.1, { delay: 0.4, rotation: [0, 0.4, -0.35] }));
  wreckParts.push(ball(0.05, MAGENTA, W.x - 0.25, F + 1.82, W.z - 0.05, { delay: 0.45, flat: true, noInk: true }));
  const wreck = new Group();
  wreck.position.copy(W);
  wreckParts[0].parent?.add(wreck);
  wreckParts.forEach((part) => {
    part.position.sub(W);
    wreck.add(part);
  });
  ripple(W.x, W.z, 0.85, 3, 0, 0.5);
  ripple(W.x, W.z, 0.85, 3, 1.5, 0.5);
  motes(8, FOAM, 0.025, [W.x - 0.9, F, W.z - 0.4], [W.x + 0.6, F + 0.35, W.z + 0.5], 0.8);
  [
    [-1.3, -0.95, 0.4],
    [1.75, -0.6, -0.6],
  ].forEach(([x, z, turn], i) => box(0.45, 0.05, 0.12, 0x4a3a30, x, F - 0.01, z, { delay: 0.5 + i * 0.03, rotation: [0, turn, 0] }));

  // The lamp, the bollard and his tea.
  const light = lamp(kit, -1.65, 0.45, G, 0.3, 2.3, ORANGE);
  bollard(kit, 1.25, 0.95, G, 0.4);
  cylinder(0.06, 0.055, 0.12, 0xd8d2c4, 1.25, G + 0.2, 0.95, { delay: 0.6 }, 12);
  add(new TorusGeometry(0.035, 0.012, 6, 12), 0xd8d2c4, 1.32, G + 0.225, 0.95, { delay: 0.62 });
  motes(5, 0xe8e2d0, 0.022, [1.18, G + 0.36, 0.9], [1.3, G + 0.85, 1.0], 1.2);

  // Alaggio: grey hair and beard, a green dry suit, mid-stride, hauling.
  const facing = 0.45;
  const man = figure(kit, {
    x: -0.35,
    z: 0.55,
    y: G,
    facing,
    height: 2.45,
    build: "broad",
    skin: 0xc89a7c,
    hair: { style: "short", color: 0x9aa0a8 },
    face: { mouth: "neutral", brows: "angry", beard: "full", beardColor: 0x9aa0a8 },
    top: { kind: "jacket", color: SUIT, accent: 0x24483a },
    bottom: { kind: "trousers", color: 0x2a4a3c },
    shoes: 0x1f2226,
    gloves: 0x22242a,
    belt: 0x2a2a30,
    arms: [
      [-0.1, 1.45, 0.44],
      [0.12, 1.72, 0.34],
    ],
    legs: "stride",
    delay: 0.8,
  });
  const o = (delay: number, roll = 0): { delay: number; rotation: [number, number, number] } => ({ delay, rotation: [0, facing, roll] });
  // The air tank on his chest, its hose over the shoulder.
  const tank = add(new CylinderGeometry(0.11, 0.11, 0.5, 14).rotateZ(Math.PI / 2), STEEL, ...man.at(0, 1.07, 0.38), o(1.3));
  decorate(tank, new TorusGeometry(0.112, 0.018, 6, 16).rotateY(Math.PI / 2), 0x23222b, [
    [-0.16, 0.11, 0],
    [0.16, 0.11, 0],
  ]);
  cable(kit, [man.at(0.25, 1.18, 0.4), man.at(0.32, 1.6, 0.26), man.at(0.26, 1.9, -0.12)], 0.025, 0x23222b, 1.35);
  // The coil of rope slung over his right shoulder.
  add(new TorusGeometry(0.34, 0.055, 8, 24).rotateY(Math.PI / 2), ROPE, ...man.at(-0.58, 1.1, 0.02), o(1.4, 0.15));
  // The ballast weight on a chain from his belt.
  [0, 1, 2].forEach((k) => add(new TorusGeometry(0.035, 0.012, 6, 10), STEEL, ...man.at(0.3, 0.98 - k * 0.07, 0.22), o(1.4 + k * 0.02, k % 2 ? 1.5 : 0)));
  const weight = add(new CylinderGeometry(0.15, 0.15, 0.14, 16).rotateX(Math.PI / 2), 0x2a2e3a, ...man.at(0.32, 0.5, 0.24), o(1.48));
  decorate(weight, new TorusGeometry(0.15, 0.02, 6, 18), ORANGE, [[0, 0.15, 0]]);
  // The tow rope: from his fists over his shoulder, taut down to the wreck; the slack coiled at his feet.
  cable(
    kit,
    [man.at(-0.1, 1.45, 0.44), man.at(0.12, 1.72, 0.34), man.at(0.3, 1.98, 0.02), man.at(0.4, 1.8, -0.4), [0.1, G + 1.15, -0.45], [0.3, F + 0.9, -0.85]],
    0.04,
    ROPE,
    1.5,
  );
  const handR = man.hands[0];
  cable(kit, [handR, [handR[0] - 0.1, G + 0.6, handR[2] + 0.15], [handR[0] - 0.2, G + 0.05, handR[2] + 0.35]], 0.035, ROPE, 1.55);
  [0, 1].forEach((k) => add(new TorusGeometry(0.22 - k * 0.05, 0.035, 6, 20).rotateX(Math.PI / 2), ROPE, handR[0] - 0.25, G + k * 0.06, handR[2] + 0.42, { delay: 1.6 + k * 0.03 }));

  tick((t) => {
    wreck.rotation.set(Math.sin(t * 0.9) * 0.04, 0, Math.sin(t * 0.7 + 1) * 0.05);
    wreck.position.y = F + Math.sin(t * 1.1) * 0.03;
    lights.color.setHex(Math.floor(t * 1.4) % 3 === 2 ? 0x5a1a30 : MAGENTA);
    light.visible = Math.floor(t * 6) % 19 !== 7;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
