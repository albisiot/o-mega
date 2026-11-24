import { BoxGeometry, CylinderGeometry, Group, TetrahedronGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { car, facade, floor, wallLantern } from "@/lib/diorama-props";

/**
 * Impound (P124): the body-shop man of the Lanterne, red-haired and grinning, welding mask
 * pushed up, brings his sledgehammer down on the bonnet of a car double-parked outside the
 * hospital, sparks and glass flying, while the ambulance it blocks flashes behind him. His
 * estimate is already tucked under the wiper: he'll fix it at his shop, for a price.
 */
export function impound(kit: Kit): Framing {
  const { add, box, decorate, tick } = kit;
  const NAVY = 0x2c3e66;
  const WHITE = 0xe6e4de;
  const STEEL = 0x6a7080;
  const F = octagonBase(kit, 0x1e1c26);
  const G = floor(kit, F, 0.06, 0x34303e, 0x24202c, 0.4);

  // The hospital door: pale front, cyan windows, a canopy and a blank lit sign, a lantern.
  facade(kit, -0.4, -1.7, G, 0.1, { width: 2.0, height: 2.6, color: 0x3c4c5e, windows: 3, floors: 2, door: true, lit: CYAN, shutters: 0x2a3a4a });
  box(0.8, 0.05, 0.45, 0x2a3442, -0.4, G + 0.75, -1.35, { delay: 0.2 });
  box(0.7, 0.18, 0.04, 0xe8f6ff, -0.4, G + 0.86, -1.52, { delay: 0.22, flat: true });
  wallLantern(kit, -1.25, -1.55, G + 1.9, 0.25);

  // The ambulance, nose to the street, its light bar flashing.
  const AX = 1.25;
  const back = box(0.72, 0.86, 0.8, WHITE, AX, G + 0.14, -1.15, { delay: 0.3 });
  decorate(back, new BoxGeometry(0.73, 0.08, 0.81), ORANGE, [[0, 0.4, 0]]);
  const cab = box(0.72, 0.6, 0.42, WHITE, AX, G + 0.14, -0.54, { delay: 0.34 });
  decorate(cab, new BoxGeometry(0.62, 0.22, 0.02), 0x16303e, [[0, 0.44, 0.212]]);
  decorate(cab, new BoxGeometry(0.73, 0.08, 0.43), ORANGE, [[0, 0.2, 0]]);
  [-0.95, -0.55].forEach((z, i) =>
    [-1, 1].forEach((side) => add(new CylinderGeometry(0.14, 0.14, 0.08, 12).rotateZ(Math.PI / 2), 0x23222b, AX + side * 0.36, G, z - (i ? 0 : 0.3), { delay: 0.38 })),
  );
  const bar = [CYAN, MAGENTA].map((color, k) => box(0.22, 0.08, 0.14, color, AX + (k ? 0.13 : -0.13), G + 1.0, -0.72, { delay: 0.42, flat: true }));

  // The car parked across its path, already dented, the windscreen starred.
  const CX = 0.2;
  const CZ = 0.75;
  const [body, cabin] = car(kit, CX, CZ, G, 0.45, 0x6a2a58, 0.12);
  decorate(body, new BoxGeometry(0.24, 0.006, 0.02), INK, [
    [0.48, 0.302, 0.05, 0.4],
    [0.52, 0.302, -0.08, -0.3],
  ]);
  decorate(cabin, new BoxGeometry(0.01, 0.16, 0.008), 0xe8f6ff, [
    [0.25, 0.13, 0.295, 0.5],
    [0.2, 0.12, 0.295, -0.6],
    [0.27, 0.1, 0.295, 1.4],
  ]);
  // The estimate under the wiper.
  const slip = box(0.2, 0.006, 0.15, 0xf2efe6, CX - 0.5 * Math.cos(0.12), G + 0.41, CZ + 0.5 * Math.sin(0.12), { delay: 1.8, ink: 1.15, rotation: [0, 0.3, 0] });
  decorate(slip, new BoxGeometry(0.14, 0.008, 0.012), 0x8a93a3, [
    [0, 0.002, -0.04],
    [0, 0.002, 0],
    [-0.03, 0.002, 0.04],
  ]);

  // Impound, behind the car, bringing the hammer down: all worked out in his own frame.
  const facing = 0.3;
  const H: Point = [0.42, 0.68, 0.98];
  const E: Point = [-0.08, 1.48, 0.28];
  const along = (u: number): Point => [H[0] + (E[0] - H[0]) * u, H[1] + (E[1] - H[1]) * u, H[2] + (E[2] - H[2]) * u];
  const smith = figure(kit, {
    x: 0.0,
    z: -0.15,
    y: G,
    facing,
    height: 2.5,
    build: "broad",
    skin: 0xe0a888,
    hair: { style: "short", color: 0xd0562a },
    face: { mouth: "grin", brows: "raised", beard: "stubble", beardColor: 0xc04a20, marks: 0xb07050 },
    top: { kind: "shirt", color: NAVY, sleeves: "short" },
    bottom: { kind: "trousers", color: NAVY },
    belt: 0x5a3a22,
    gloves: 0x8a6a3a,
    shoes: 0x2a2622,
    arms: [along(0.84), along(0.6)],
    delay: 0.8,
  });
  // Reflective stripes on chest and sleeves, the tool belt's spanners: on a marker at his feet.
  const mark = box(0.001, 0.001, 0.001, NAVY, ...smith.at(0, 0, 0), { delay: 0.95, noInk: true, rotation: [0, facing, 0] });
  decorate(mark, new BoxGeometry(0.86, 0.06, 0.02), ORANGE, [
    [0, 1.5, 0.33],
    [0, 1.64, 0.31],
  ]);
  decorate(mark, new BoxGeometry(0.035, 0.2, 0.02), 0xa0a8b8, [
    [-0.3, 0.95, 0.3, 0.2],
    [-0.38, 0.97, 0.26, -0.15],
    [0.34, 0.96, 0.28, 0.1],
  ]);
  // The welding mask, flipped up on his head, its glass catching the sparks.
  const hy = smith.head[1] - G;
  const RH = smith.headRadius;
  const helmet = box(0.46, 0.42, 0.08, 0x3a3e48, ...smith.at(0, hy + RH * 0.72, RH * 0.45), { delay: 1.3 });
  helmet.rotation.order = "YXZ";
  helmet.rotation.set(-0.95, facing, 0);
  decorate(helmet, new BoxGeometry(0.26, 0.1, 0.02), 0x16303e, [[0, 0.24, 0.045]]);
  decorate(smith.headPart, new CylinderGeometry(0.05, 0.05, 0.03, 10).rotateZ(Math.PI / 2), 0x3a3e48, [
    [-RH * 0.98, RH * 1.2, 0],
    [RH * 0.98, RH * 1.2, 0],
  ]);

  // The sledgehammer: handle through his hands, the head flat on the bonnet.
  const head = smith.at(...H);
  const end = smith.at(...E);
  limb(kit, head, end, 0.035, 0.035, 0x8a6a4a, { delay: 1.35 });
  const d = new Vector3(end[0] - head[0], end[1] - head[1], end[2] - head[2]).normalize();
  const perp = new Vector3().crossVectors(new Vector3().crossVectors(d, new Vector3(0, 1, 0)), d).normalize().multiplyScalar(0.17);
  limb(kit, [head[0] - perp.x, head[1] - perp.y, head[2] - perp.z], [head[0] + perp.x, head[1] + perp.y, head[2] + perp.z], 0.1, 0.1, STEEL, { delay: 1.4 });

  // Sparks from the blow, two sets flashing in turn, and shards of glass flying.
  const hit: Point = [head[0] + perp.x - 0.02, G + 0.42, head[2] + perp.z];
  const burst = (k: number) => {
    const set = new Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + k * 0.5;
      const ray = box(0.025, 0.22 + (i % 2) * 0.12, 0.025, i % 3 ? ORANGE : 0xffd060, 0, 0, 0, { delay: 1.5, flat: true, noInk: true, rotation: [Math.cos(a) * 1.1, 0, Math.sin(a) * 1.3] });
      ray.parent?.add(set);
      set.add(ray);
    }
    set.position.set(...hit);
    return set;
  };
  const bursts = [burst(0), burst(1)];
  const shards = Array.from({ length: 6 }, (_, i) => ({
    part: add(new TetrahedronGeometry(0.045), 0x9fe8ff, ...hit, { delay: 1.6, flat: true, noInk: true }),
    v: [Math.cos(i * 1.7) * 0.6 + 0.3, 0.9 + (i % 3) * 0.25, Math.sin(i * 1.7) * 0.5 + 0.4] as Point,
    phase: i / 6,
  }));

  tick((t) => {
    // The ambulance flashes; the hammer rings (sparks alternate); glass flies and falls.
    const flash = Math.floor(t * 3) % 2;
    bar.forEach((light, k) => (light.visible = k === flash || t === 0));
    const beat = Math.floor(t * 10) % 2;
    bursts.forEach((set, k) => {
      set.visible = k === beat;
      set.rotation.y = t * 2;
    });
    for (const s of shards) {
      const u = (t * 0.7 + s.phase) % 1;
      s.part.position.set(hit[0] + s.v[0] * u, hit[1] + s.v[1] * u - 2.2 * u * u, hit[2] + s.v[2] * u);
      s.part.rotation.set(u * 9, u * 7, 0);
      s.part.visible = s.part.position.y > G;
    }
    slip.rotation.x = Math.sin(t * 5) * 0.06;
  });

  return { width: 4.9, height: 4.3, lookY: 1.4 };
}
