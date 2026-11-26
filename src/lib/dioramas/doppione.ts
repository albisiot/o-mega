import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, Group, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, aim, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure, type FigureSpec } from "@/lib/diorama-figure";
import { bench, floor } from "@/lib/diorama-props";

/**
 * Doppione (P314): the boxer of the Fosse and his double, in a brick gym under a pink neon,
 * both throwing a punch straight at us: two against one. The double, tinted magenta and tied to
 * him by ribbons of light, flickers and argues even mid-punch. On the wall, the X-ray that the
 * Banco always mistakes for a double exposure; behind them, the heavy bag still swings.
 */
export function doppione(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const F = octagonBase(kit, 0x1c1a26);
  const G = floor(kit, F, 0.06, 0x2a2834, 0x1e1c28, 0.55);

  // The gym's brick wall: mortar lines, a lit window, a neon tube and the X-ray light box.
  const wall = box(2.9, 2.7, 0.3, 0x4a2a3a, -0.05, G, -1.55, { delay: 0.1, ink: 1.02 });
  const mortar: Point[] = [];
  const joints: Point[] = [];
  for (let r = 0; r < 10; r++) {
    mortar.push([0, 0.25 + r * 0.25, 0.155]);
    for (let c = 0; c < 6; c++) joints.push([-1.25 + c * 0.5 + (r % 2) * 0.25, 0.125 + r * 0.25, 0.155]);
  }
  decorate(wall, new BoxGeometry(2.9, 0.018, 0.01), 0x2e1a26, mortar);
  decorate(wall, new BoxGeometry(0.018, 0.25, 0.01), 0x2e1a26, joints);
  decorate(wall, new BoxGeometry(0.62, 0.5, 0.02), 0xff7aa8, [[0.6, 1.95, 0.16]]);
  decorate(wall, new BoxGeometry(0.025, 0.5, 0.03), INK, [0.5, 0.7].map((x) => [x, 1.95, 0.17] as Point));
  decorate(wall, new BoxGeometry(0.62, 0.025, 0.03), INK, [[0.6, 1.95, 0.17]]);
  box(1.2, 0.06, 0.06, MAGENTA, -0.4, G + 2.5, -1.35, { delay: 0.3, flat: true, noInk: true });
  const xray = box(0.6, 0.46, 0.06, 0x16303e, -1.05, G + 1.75, -1.37, { delay: 0.35 });
  decorate(xray, new BoxGeometry(0.6, 0.46, 0.01), 0x9fe8ff, [[0, 0.23, -0.026]]);
  decorate(xray, new BoxGeometry(0.52, 0.38, 0.01), 0x16303e, [[0, 0.23, 0.032]]);
  [-0.07, 0.07].forEach((dx, k) => {
    const bone = k ? 0xff9ac0 : 0xe8f8ff;
    decorate(xray, new BoxGeometry(0.02, 0.3, 0.01), bone, [[dx, 0.23 + k * 0.02, 0.04]]);
    decorate(xray, new BoxGeometry(0.2, 0.02, 0.01), bone, [0.14, 0.21, 0.28].map((y) => [dx, y + k * 0.02, 0.04] as Point));
    decorate(xray, new CylinderGeometry(0.045, 0.045, 0.01, 10).rotateX(Math.PI / 2), bone, [[dx, 0.4 + k * 0.02, 0.04]]);
  });

  // A bench with a towel and a bottle; the heavy bag on its bracket.
  bench(kit, -1.45, -0.55, G, 0.3, 0.5);
  box(0.36, 0.04, 0.3, 0xe8e4dc, -1.5, G + 0.35, -0.5, { delay: 0.4, rotation: [0, 0.5, 0] });
  cylinder(0.05, 0.05, 0.22, CYAN, -1.2, G + 0.35, -0.7, { delay: 0.42 }, 10);
  box(0.08, 0.08, 0.75, 0x23222b, 1.2, G + 2.5, -1.05, { delay: 0.3 });
  const pivot = new Vector3(1.2, G + 2.5, -0.72);
  const bag = [
    box(0.02, 0.45, 0.02, 0x8a93a3, pivot.x, G + 2.05, pivot.z, { delay: 0.45, noInk: true }),
    cylinder(0.23, 0.23, 1.0, 0x7a1e3a, pivot.x, G + 1.05, pivot.z, { delay: 0.5 }, 16),
    cylinder(0.24, 0.24, 0.08, 0x2a1a24, pivot.x, G + 1.95, pivot.z, { delay: 0.52 }, 16),
  ];
  const swing = new Group();
  wall.parent?.add(swing);
  swing.position.copy(pivot);
  bag.forEach((part) => {
    part.position.sub(pivot);
    swing.add(part);
  });

  // The two of them: the same man, the double tinted magenta and scowling.
  const boxer = (spec: Partial<FigureSpec> & Pick<FigureSpec, "x" | "z" | "skin" | "top">, delay: number): Figure =>
    figure(kit, {
      y: G,
      height: 2.4,
      hair: { style: "short", color: 0x1a1820 },
      legs: "stride",
      delay,
      ...spec,
    });
  const twins = [
    boxer({ x: -0.35, z: 0.55, facing: 0.3, skin: 0xe0b08f, face: { mouth: "smirk", brows: "angry" }, top: { kind: "jacket", color: 0x23305e, accent: 0xe8e8f0 }, bottom: { kind: "trousers", color: 0x23305e }, shoes: 0x1a1a22, gloves: 0xf0ece0, arms: [[-0.2, 1.75, 0.8], [0.25, 1.85, 0.35]] }, 0.8),
    boxer({ x: 0.6, z: -0.2, facing: 0.05, skin: 0xe8a0b8, face: { mouth: "open", brows: "angry" }, top: { kind: "jacket", color: 0x5a2a7a, accent: 0xffb0d0 }, bottom: { kind: "trousers", color: 0x5a2a7a }, shoes: 0x2a1a30, gloves: 0xffc0dc, arms: [[-0.25, 1.85, 0.35], [0.2, 1.75, 0.8]] }, 1.1),
  ];
  // White tracksuit stripes round the upper arms.
  twins.forEach((t, j) =>
    [0, 1].forEach((i) => {
      const shoulder = t.at(i ? 0.4 : -0.4, 1.72, 0);
      const { rotation } = aim(shoulder, t.elbows[i]);
      [0.3, 0.55].forEach((u) => {
        const ring = new TorusGeometry(0.115, 0.022, 6, 18).rotateX(Math.PI / 2);
        t.parts.push(add(ring, j ? 0xffd0e4 : 0xe8e8f0, ...lerp(shoulder, t.elbows[i], u), { delay: 1.4, noInk: true, rotation }));
      });
    }),
  );

  // Ribbons of light from one to the other.
  const ribbon = (points: Point[], delay: number) => {
    const geometry = new TubeGeometry(new CatmullRomCurve3(points.map((p) => new Vector3(...p))), 30, 0.018, 5);
    geometry.computeBoundingBox();
    return add(geometry, MAGENTA, 0, geometry.boundingBox?.min.y ?? 0, 0, { delay, flat: true, noInk: true });
  };
  const [a, b] = twins;
  ribbon([a.at(0.3, 1.6, -0.2), [0.2, G + 2.4, 0.2], b.at(-0.35, 1.9, 0.1), b.at(0, 2.5, -0.2)], 1.6);
  ribbon([a.at(0.35, 1.2, -0.1), [0.4, G + 0.9, 0.5], b.at(-0.3, 1.3, 0.2), b.at(0.3, 0.9, -0.2)], 1.65);
  ribbon([a.at(-0.1, 2.3, -0.2), [-0.2, G + 2.8, -0.3], [0.5, G + 2.75, -0.5], b.at(0.2, 2.2, -0.1)], 1.7);
  motes(14, MAGENTA, 0.035, [-0.6, G + 0.6, -0.5], [1.1, G + 2.6, 0.7], 1.5);

  const rest = twins.map((t) => t.parts.map((part) => part.position.y));
  tick((t) => {
    swing.rotation.x = 0.16 * Math.sin(t * 2.2 + 0.8);
    twins.forEach((twin, j) => twin.parts.forEach((part, i) => (part.position.y = rest[j][i] + Math.abs(Math.sin(t * 4 + j * 1.6)) * 0.035)));
    // Now and then the double glitches out for a blink.
    const blink = (t % 3.4) / 3.4;
    b.parts.forEach((part) => (part.visible = !(blink > 0.9 && blink < 0.94)));
  });

  return { width: 4.9, height: 4.3, lookY: 1.45 };
}

function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
