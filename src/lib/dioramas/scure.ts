import { BoxGeometry, ExtrudeGeometry, Group, Matrix4, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, facade, floor, puddle, wallLantern } from "@/lib/diorama-props";

/**
 * Scure (P275): Nomina's headsman, collecting for the Compagnia Lete, waits in a wet lane at
 * night outside a debtor's door, the great axe on his shoulder and the ledger in his fist. He
 * has no magic to break the ward glowing on the doorstep, so he comes when it is nearly done:
 * its arcs go out one by one while the debtor peeks from the window. Bald, stubbled, X marks
 * tattooed on his bare arms, black leather to the knuckles.
 */
export function scure(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const SKIN = 0xd8a08a;
  const LEATHER = 0x1c2430;
  const STEEL = 0x56667a;
  const F = octagonBase(kit, 0x1d1b26);
  const G = floor(kit, F, 0.06, 0x2a2836, 0x1c1a26, 0.3);

  // The debtor's house: a doorstep, a lantern, a frightened face at the window.
  facade(kit, 0.75, -1.65, G, 0.1, { width: 2.4, height: 2.7, color: 0x3a3048, windows: 3, floors: 2, door: true, shutters: 0x2f5a6a });
  box(0.9, 0.12, 0.35, 0x4a4658, 0.75, G, -1.33, { delay: 0.2 });
  const lantern = wallLantern(kit, 0.12, -1.5, G + 1.85, 0.3, ORANGE);
  column(kit, -1.8, -0.7, G, 0.25, 2.6, false, 0x4a5874);
  puddle(kit, -0.1, 1.25, G, 0.4, 0.42, ORANGE);
  puddle(kit, 1.35, 0.6, G, 0.42, 0.3, CYAN);
  const debtor = ball(0.1, 0xe0b8a0, 1.43, G + 0.65, -1.45, { delay: 0.5 });
  decorate(debtor, new BoxGeometry(0.025, 0.035, 0.01), INK, [
    [-0.03, 0.12, 0.095],
    [0.035, 0.12, 0.095],
  ]);
  const fingers = box(0.05, 0.1, 0.04, 0xe0b8a0, 1.5, G + 0.66, -1.47, { delay: 0.55 });

  // The ward on the doorstep: eight glowing arcs, most of them already out.
  const W: Point = [0.75, G, -0.78];
  const arcs = Array.from({ length: 8 }, (_, k) => {
    const arc = add(new TorusGeometry(0.6, 0.05, 4, 10, 0.62).rotateX(Math.PI / 2), CYAN, ...W, { delay: 0.6 + k * 0.03, flat: true, noInk: true, rotation: [0, -(k * Math.PI) / 4 - 0.08, 0] });
    decorate(arc, new BoxGeometry(0.09, 0.012, 0.09).rotateY(Math.PI / 4), 0x9fe8ff, [[0.6 * Math.cos(0.31), 0.05, 0.6 * Math.sin(0.31)]]);
    return arc;
  });

  // Scure: broad, bald, stubbled, a long black leather coat, bare tattooed arms.
  const facing = 0.6;
  const H = figure(kit, {
    x: -0.75,
    z: 0.38,
    y: G,
    facing,
    height: 2.6,
    build: "broad",
    skin: SKIN,
    hair: { style: "bald", color: 0x5a4a44 },
    face: { mouth: "frown", brows: "angry", beard: "stubble", beardColor: 0x6a5a54 },
    top: { kind: "coat", color: LEATHER, accent: 0x2a3240, sleeves: "none" },
    bottom: { kind: "trousers", color: 0x161c26 },
    shoes: 0x14161c,
    gloves: 0x1a1c22,
    belt: 0x2a2a30,
    arms: ["down", [0.36, 1.5, 0.42]],
    delay: 0.8,
  });
  const u = 2.6 / 2.4;
  const lerp = (a: Point, b: Point, k: number): Point => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const flatX = (part: Group) => {
    part.rotation.order = "YXZ";
    part.rotation.set(0, facing, 0);
    return part;
  };
  // The hood fallen on his shoulders, buckled straps across the chest.
  flatX(add(new SphereGeometry(0.2, 12, 8).scale(1.8, 0.75, 1.1), LEATHER, ...H.at(0, 1.8, -0.2), { delay: 1.3 }));
  [1.3, 1.5, 1.7].forEach((y, k) => {
    const strap = flatX(box(0.42, 0.06, 0.06, 0x2a2a34, ...H.at(0, y, 0.34 + k * 0.012), { delay: 1.32 + k * 0.02 }));
    decorate(strap, new BoxGeometry(0.07, 0.07, 0.02), 0x8a93a3, [[0.06, 0.03, 0.035]]);
  });
  // Bare upper arms with crossed tattoos, black bracers to the knuckles.
  [0, 1].forEach((i) => {
    const side = i ? 1 : -1;
    const shoulder = H.at(side * 0.5 * u, 1.72 * u, 0);
    const elbow = H.elbows[i];
    const hand = H.hands[i];
    add(new SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), LEATHER, shoulder[0], shoulder[1] - 0.235 * 0.31, shoulder[2], { delay: 1.24, rotation: [0, facing, -side * 0.2] });
    const sleeve = limb(kit, shoulder, lerp(shoulder, elbow, 0.98), 0.168, 0.158, SKIN, { delay: 1.25 });
    const length = new Vector3(...elbow).distanceTo(new Vector3(...shoulder));
    [0.35, 0.68].forEach((v) =>
      [0, Math.PI].forEach((a) =>
        decorate(sleeve, new BoxGeometry(0.014, 0.085, 0.014), MAGENTA, [
          [Math.sin(a) * 0.165, v * length, Math.cos(a) * 0.165, 0.75],
          [Math.sin(a) * 0.165, v * length, Math.cos(a) * 0.165, -0.75],
        ]),
      ),
    );
    [0.35, 0.68].forEach((v) =>
      [-1, 1].forEach((s) =>
        [0.75, -0.75].forEach((lean) => decorate(sleeve, new BoxGeometry(0.014, 0.085, 0.014).rotateX(lean), MAGENTA, [[s * 0.165, v * length, 0]])),
      ),
    );
    limb(kit, lerp(elbow, hand, 0.18), lerp(elbow, hand, 0.92), 0.15, 0.135, 0x1a1c22, { delay: 1.3 });
  });

  // The ledger of debts in his right fist.
  const [right] = H.hands;
  const ledger = flatX(box(0.22, 0.28, 0.07, 0x5a1a22, right[0], right[1] - 0.3, right[2] + 0.04, { delay: 1.4 }));
  decorate(ledger, new BoxGeometry(0.2, 0.24, 0.072), 0xe8e2d0, [[0.015, 0.14, 0]]);

  // The axe across his left shoulder: a long haft and a crescent blade with a magenta edge.
  const butt = H.at(0.28, 1.2, 0.6);
  const head = H.at(0.64, 2.5, -0.27);
  const d = new Vector3(head[0] - butt[0], head[1] - butt[1], head[2] - butt[2]).normalize();
  limb(kit, butt, [head[0] + d.x * 0.12, head[1] + d.y * 0.12, head[2] + d.z * 0.12], 0.042, 0.036, 0x4a3a30, { delay: 1.45 });
  const out = new Vector3(Math.cos(facing), 0, -Math.sin(facing));
  out.addScaledVector(d, -out.dot(d)).normalize();
  const basis = new Matrix4().makeBasis(out, d, new Vector3().crossVectors(out, d));
  const blade = (draw: (shape: Shape) => void, color: number, delay: number) => {
    const shape = new Shape();
    draw(shape);
    const geometry = new ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -0.0225).applyMatrix4(basis);
    geometry.computeBoundingBox();
    return add(geometry, color, head[0], head[1] + (geometry.boundingBox?.min.y ?? 0), head[2], { delay, ink: 1.03 });
  };
  blade(
    (s) => {
      s.moveTo(0, -0.14);
      s.quadraticCurveTo(0.22, -0.16, 0.44, -0.36);
      s.quadraticCurveTo(0.6, 0.04, 0.44, 0.4);
      s.quadraticCurveTo(0.22, 0.22, 0, 0.2);
      s.closePath();
    },
    STEEL,
    1.5,
  );
  blade(
    (s) => {
      s.moveTo(0.44, -0.36);
      s.quadraticCurveTo(0.6, 0.04, 0.44, 0.4);
      s.lineTo(0.5, 0.48);
      s.quadraticCurveTo(0.7, 0.04, 0.5, -0.44);
      s.closePath();
    },
    MAGENTA,
    1.55,
  );

  tick((t) => {
    // The ward runs down arc by arc, then is cast again; half of it is left at the start.
    const left = 8 - Math.floor(((t / 7 + 0.55) % 1) * 8);
    arcs.forEach((arc, k) => (arc.visible = k < left && !(k === left - 1 && Math.floor(t * 9) % 5 === 2)));
    const peek = Math.sin(t * 0.9) > -0.5;
    debtor.visible = peek;
    fingers.visible = peek;
    lantern.visible = Math.floor(t * 6) % 17 !== 5;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
