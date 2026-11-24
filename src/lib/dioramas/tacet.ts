import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Quaternion, Shape, TorusGeometry, Vector2, Vector3 } from "three";
import { MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, floor, lamp } from "@/lib/diorama-props";

/**
 * Tacet (P072): the siren sings on the freight siding of the quay at night, head thrown back,
 * rings of her voice spreading into the dark, while two hooded dockers shuffle down the rails
 * towards her with spirals in their eyes. Her price is in her other hand, clutching her
 * bandaged throat, and in the mug of honey tea waiting on a bollard for when her voice goes.
 */
export function tacet(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const WATER = 0x0e2a40;
  const BANDAGE = 0xe8e2d0;
  const STEEL = 0x8a93a3;
  const F = octagonBase(kit, 0x1b1f2c);
  const G = floor(kit, F, 0.06, 0x2a2d3a, 0x1d2029, 0.45);

  // The harbour water behind the quay's edge, and a freighter moored there, portholes lit.
  const shape = new Shape([[-1.87, 1.38], [1.87, 1.38], [0.95, 2.28], [-0.95, 2.28]].map(([x, s]) => new Vector2(x, s)));
  add(new ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }).rotateX(-Math.PI / 2), WATER, 0, G, 0, { delay: 0.08, noInk: true });
  box(3.7, 0.06, 0.08, 0x4a4f5c, 0, G, -1.36, { delay: 0.1 });
  const hull = box(1.5, 0.5, 0.36, 0x22263a, -0.45, G, -1.75, { delay: 0.2 });
  decorate(hull, new BoxGeometry(1.5, 0.05, 0.01), MAGENTA, [[0, 0.42, 0.185]]);
  decorate(hull, new BoxGeometry(0.06, 0.06, 0.01), YELLOW, [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x) => [x, 0.26, 0.185] as Point));
  const bridge = box(0.55, 0.32, 0.28, 0xd8d2c4, -0.85, G + 0.5, -1.75, { delay: 0.26 });
  decorate(bridge, new BoxGeometry(0.4, 0.07, 0.01), 0x16c8ff, [[0, 0.2, 0.145]]);
  cylinder(0.08, 0.09, 0.32, 0x22263a, -0.2, G + 0.5, -1.75, { delay: 0.3 });

  // The freight siding: ballast with sleepers, two rails, and a buffer stop at the quay's edge.
  const bed = box(0.95, 0.025, 2.7, 0x2c2a30, 1.3, G, 0.1, { delay: 0.12, noInk: true });
  decorate(bed, new BoxGeometry(0.8, 0.025, 0.12), 0x4a3a30, Array.from({ length: 9 }, (_, k) => [0, 0.03, -1.2 + k * 0.3] as Point));
  [1.1, 1.5].forEach((x, i) => box(0.05, 0.07, 2.7, STEEL, x, G + 0.025, 0.1, { delay: 0.16 + i * 0.03 }));
  const buffer = box(0.62, 0.3, 0.14, 0x2a2834, 1.3, G + 0.08, -1.2, { delay: 0.22 });
  decorate(buffer, new BoxGeometry(0.1, 0.3, 0.01), MAGENTA, [-0.2, 0, 0.2].map((x) => [x, 0.15, 0.072, 0.6] as [number, number, number, number]));
  lamp(kit, -1.75, -0.55, G, 0.3, 2.2);

  // Two dockers walking the rails in a trance, arms out, spirals in their glowing eyes.
  const dockers = [
    { x: 1.3, z: -0.05, facing: -0.55, coat: 0x23404b, delay: 1.1 },
    { x: 0.45, z: -0.95, facing: -0.15, coat: 0x2f2a44, delay: 1.25 },
  ].map(({ x, z, facing, coat, delay }) => {
    const h = 2.1;
    const u = h / 2.4;
    const docker = figure(kit, {
      x, z, y: G, facing, height: h,
      skin: 0x8a94a8,
      face: { eyes: MAGENTA, glow: true, mouth: "open", brows: "none" },
      headwear: { kind: "hood", color: coat },
      top: { kind: "coat", color: coat },
      bottom: { kind: "trousers", color: 0x1f2430 },
      arms: [[-0.2, 1.42, 0.6], [0.22, 1.38, 0.62]],
      legs: "stride",
      delay,
    });
    const r = 0.22 * u;
    decorate(docker.headPart, new TorusGeometry(0.045 * u, 0.009, 6, 16), MAGENTA, [
      [-0.08 * u, r * 1.06 + 0.03 * u, r * 0.9 + 0.02],
      [0.08 * u, r * 1.06 + 0.03 * u, r * 0.9 + 0.02],
    ]);
    return docker;
  });

  // Tacet: black gown, magenta cape with a high collar, the right hand at her bandaged throat.
  const facing = 0.5;
  const singer = figure(kit, {
    x: -0.45, z: 0.4, y: G, facing, height: 2.45, build: "slim",
    skin: 0xeac6b8,
    hair: { style: "curly", color: 0x1a1420 },
    face: { mouth: "open", brows: "raised" },
    top: { kind: "dress", color: 0x2a2440 },
    scarf: BANDAGE,
    gloves: BANDAGE,
    shoes: 0x1a1420,
    arms: [[-0.05, 1.9, 0.24], [0.74, 1.58, 0.32]],
    delay: 0.8,
  });
  singer.headPart.rotation.x = -0.14;
  // The cape, a flattened cone behind her (an open shell would show its black inside).
  add(new CylinderGeometry(0.36, 0.78, 1.66, 18).scale(1, 1, 0.32), 0xb8245a, ...singer.at(0, 0.06, -0.16), { delay: 0.85, rotation: [0, facing, 0] });
  cylinder(0.12, 0.12, 0.13, BANDAGE, ...singer.at(0, 1.79, 0), { delay: 1.15 });
  [-1, 1].forEach((side) => box(0.26, 0.5, 0.04, 0x8a1a44, ...singer.at(side * 0.2, 1.64, -0.12), { delay: 1.2, rotation: [0, facing, -side * 0.42] }));
  // A mass of black curls round her face.
  const R = singer.headRadius;
  [[-1.0, 0.1, -0.2], [1.0, 0.1, -0.2], [-0.85, -0.45, -0.35], [0.85, -0.45, -0.35], [-0.5, 0.75, -0.45], [0.5, 0.75, -0.45], [0, 0.55, -0.75], [-0.95, -0.95, -0.4], [0.95, -0.95, -0.4]].forEach(([lx, ly, lz], i) => {
    const p = singer.at(lx * R, 2.18 + ly * R, lz * R);
    kit.ball(R * (i < 2 ? 0.48 : 0.42), 0x1a1420, p[0], p[1] - R * 0.45, p[2], { delay: 1.25 + i * 0.02 });
  });

  // Her voice: rings leaving her mouth, growing as they go, magenta and yellow by turns.
  const mouth = singer.at(0, 2.08, 0.24);
  const dir = new Vector3(0.85, 0.5, -0.05).normalize();
  const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir);
  const lift = new Vector3();
  const rings: Group[] = [0, 1, 2, 3].map((k) => {
    const ring = add(new TorusGeometry(0.5, 0.035, 6, 32), k % 2 ? YELLOW : MAGENTA, ...mouth, { delay: 1.6 + k * 0.05, flat: true, noInk: true });
    ring.quaternion.copy(turn);
    return ring;
  });

  // The honey tea on a bollard, steaming.
  bollard(kit, -1.55, 1.05, G, 0.4);
  const mug = cylinder(0.075, 0.065, 0.14, BANDAGE, -1.55, G + 0.2, 1.05, { delay: 0.5 }, 12);
  decorate(mug, new TorusGeometry(0.04, 0.012, 6, 12), BANDAGE, [[0.09, 0.07, 0]]);
  decorate(mug, new BoxGeometry(0.11, 0.004, 0.11), 0xd89a30, [[0, 0.135, 0]]);
  motes(5, 0xcfe8f0, 0.018, [-1.6, G + 0.38, 1.0], [-1.5, G + 0.8, 1.1], 1.4);

  const crowd = dockers.map((docker) => docker.parts.map((part) => part.position.clone()));
  tick((t) => {
    rings.forEach((ring, k) => {
      const u = (t / 2.6 + k / 4) % 1;
      const s = 0.2 + u * 1.3;
      ring.children[0].scale.setScalar(s);
      lift.set(0, 0.535 * s, 0).applyQuaternion(turn);
      const d = 0.32 + u * 1.45;
      ring.position.set(mouth[0] + dir.x * d - lift.x, mouth[1] + dir.y * d - lift.y, mouth[2] + dir.z * d - lift.z);
      ring.visible = u < 0.9;
    });
    // The dockers sway as they shuffle; her head shakes a little on the high note.
    dockers.forEach((docker, i) => {
      const sway = Math.sin(t * 1.4 + i * 2) * 0.035;
      docker.parts.forEach((part, k) => (part.position.x = crowd[i][k].x + sway));
    });
    singer.headPart.rotation.z = Math.sin(t * 9) * 0.015;
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
