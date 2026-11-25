import { ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, Vector3 } from "three";
import { INK, ORANGE, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, flame, floor, puddle } from "@/lib/diorama-props";

/**
 * Sperone (P273): the knight of the plains is first off the mark, as ever: her dappled grey
 * horse rears on the wet flagstones of a torchlit colonnade, she shouts the charge with her
 * braid flying, her orange cape streaming and the pennant of her lance snapping in the wind.
 * Stealth was never her thing: the pigeons of the colonnade burst into the air.
 */
export function sperone(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const COAT = 0x8a96aa;
  const MANE = 0x22263a;
  const HOOF = 0x2a2630;
  const LEATHER = 0x3a2a26;
  const BRASS = 0xc8a050;
  const CAPE = 0xe0542a;
  const STONE = 0x4e5c7c;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x2a2a3a, 0x1c1a26, 0.45);

  // The colonnade, two braziers and the puddles catching their light.
  [
    [-1.75, -0.7],
    [-0.9, -1.45],
    [0.25, -1.95],
    [1.35, -1.55],
  ].forEach(([x, z], i) => column(kit, x, z, G, 0.1 + i * 0.04, 2.7, false, STONE));
  const fires = [
    [-1.4, -1.25],
    [0.85, -1.85],
  ].map(([x, z], i) => {
    cylinder(0.03, 0.04, 1.3, 0x23222b, x, G, z, { delay: 0.3 + i * 0.05 }, 8);
    cylinder(0.16, 0.08, 0.12, 0x23222b, x, G + 1.3, z, { delay: 0.34 + i * 0.05 }, 10);
    return flame(kit, x, z, G + 1.38, 0.38 + i * 0.05, 0.9);
  });
  puddle(kit, 0.9, 0.9, G, 0.4, 0.4, ORANGE);
  puddle(kit, -1.2, 1.1, G, 0.42, 0.3, ORANGE);

  // The horse, built in its own frame (x to its left, y up, z forward), reared up about its hind hooves.
  const PSI = 1.15;
  const P = 0.55;
  const O = new Vector3(-0.35, G, 0.05);
  const [cp, sp, cy, sy] = [Math.cos(P), Math.sin(P), Math.cos(PSI), Math.sin(PSI)];
  const K = 1.18;
  const h = (lx: number, ly: number, lz: number): Point => {
    const [x, y, z] = [lx * K, ly * K, lz * K];
    const y1 = y * cp + z * sp;
    const z1 = z * cp - y * sp;
    return [O.x + x * cy + z1 * sy, O.y + y1, O.z - x * sy + z1 * cy];
  };
  const horse: Group[] = [];
  const keep = (part: Group) => (horse.push(part), part);
  const tilt = (part: Group) => {
    part.rotation.order = "YXZ";
    part.rotation.set(-P, PSI, 0);
    return keep(part);
  };
  const leg = (points: Point[], radii: number[], delay: number, hoofOnGround: boolean) => {
    for (let k = 0; k < points.length - 1; k++) keep(limb(kit, h(...points[k]), h(...points[k + 1]), radii[k] * K, radii[k + 1] * K, COAT, { delay: delay + k * 0.03 }));
    for (let k = 1; k < points.length - 1; k++) keep(ball(radii[k] * 1.05 * K, COAT, ...below(h(...points[k]), radii[k] * 1.05 * K), { delay: delay + 0.02 }));
    const end = points[points.length - 1];
    if (hoofOnGround) keep(cylinder(0.075, 0.1, 0.1, HOOF, ...h(end[0], 0, end[2]), { delay: delay + 0.1, rotation: [0, PSI, 0] }));
    else {
      const before = points[points.length - 2];
      const toe: Point = [end[0], end[1] + (end[1] - before[1]) * 0.35, end[2] + (end[2] - before[2]) * 0.35];
      keep(limb(kit, h(...end), h(...toe), 0.085, 0.1, HOOF, { delay: delay + 0.1 }));
    }
  };
  const body = tilt(add(new SphereGeometry(K, 20, 14).scale(0.26, 0.37, 0.8), COAT, ...h(0, 0.69, 0.55), { delay: 0.5 }));
  const dapples: Point[] = [];
  [-1, 1].forEach((side) =>
    [-0.55, -0.3, -0.05, 0.2, 0.45].forEach((z, k) => {
      const v = k % 2 ? 0.08 : -0.06;
      const x = side * 0.26 * Math.sqrt(Math.max(0, 1 - (z / 0.8) ** 2 - (v / 0.37) ** 2));
      dapples.push([x * K, (0.37 + v) * K, z * K]);
    }),
  );
  decorate(body, new SphereGeometry(0.075, 8, 6), 0x55607a, dapples);
  decorate(body, new SphereGeometry(0.055, 8, 6), 0x66728a, dapples.map(([x, y, z]) => [x * 0.95, y + 0.16, z + 0.14] as Point));
  [-1, 1].forEach((s, i) => {
    leg([[s * 0.15, 1.0, 0.05], [s * 0.17, 0.62, 0.25], [s * 0.15, 0.36, -0.08], [s * 0.14, 0.08, 0.02]], [0.17, 0.1, 0.065, 0.05], 0.6 + i * 0.04, true);
    leg(
      s > 0 ? [[0.14, 0.95, 1.05], [0.15, 0.55, 1.45], [0.15, 0.25, 1.42]] : [[-0.14, 0.95, 1.05], [-0.15, 0.6, 1.4], [-0.15, 0.62, 1.08]],
      [0.12, 0.07, 0.05],
      0.7 + i * 0.04,
      false,
    );
  });
  // Neck, head with a darker muzzle, ears, eyes, the mane and tail flying back.
  const N0: Point = [0, 1.2, 1.12];
  const N1: Point = [0, 1.7, 1.62];
  const M: Point = [0, 1.3, 2.08];
  keep(ball(0.3, COAT, ...below(h(0, 1.15, 1.08), 0.3), { delay: 0.8 }));
  keep(limb(kit, h(...N0), h(...N1), 0.28, 0.17, COAT, { delay: 0.82 }));
  keep(ball(0.18, COAT, ...below(h(...N1), 0.18), { delay: 0.86 }));
  keep(limb(kit, h(...N1), h(...M), 0.17, 0.12, COAT, { delay: 0.88 }));
  keep(limb(kit, h(0, 1.38, 1.98), h(0, 1.27, 2.13), 0.135, 0.12, 0x4a5262, { delay: 0.9 }));
  [-1, 1].forEach((s) => {
    keep(limb(kit, h(s * 0.07, 1.78, 1.6), h(s * 0.09, 1.96, 1.56), 0.045, 0.01, COAT, { delay: 0.92 }));
    keep(ball(0.035, INK, ...below(h(s * 0.13, 1.64, 1.8), 0.035), { delay: 0.94, flat: true }));
  });
  [0, 1, 2, 3, 4, 5].forEach((k) => {
    const u = k / 5;
    const base: Point = [0, 1.2 + 0.52 * u + 0.12, 1.12 + 0.5 * u - 0.12];
    keep(limb(kit, h(...base), h(base[0] + (k % 2 ? 0.05 : -0.05), base[1] - 0.08, base[2] - 0.3), 0.07, 0.012, MANE, { delay: 0.95 + k * 0.02 }));
  });
  keep(cable(kit, [h(0, 1.28, -0.18), h(0, 1.15, -0.5), h(0.05, 0.85, -0.68), h(0, 0.55, -0.6)], 0.07, MANE, 1.0));
  // Tack: the saddle cloth, a studded breast strap, the reins.
  tilt(box(0.52, 0.05, 0.5, LEATHER, ...h(0, 1.38, 0.68), { delay: 1.05 }));
  const strap: Point[] = [h(0.23, 1.12, 0.78), h(0.21, 0.98, 1.22), h(0, 0.9, 1.38), h(-0.21, 0.98, 1.22), h(-0.23, 1.12, 0.78)];
  keep(cable(kit, strap, 0.03, LEATHER, 1.08));
  strap.slice(1, 4).forEach((p, k) => keep(ball(0.035, BRASS, ...below(p, 0.035), { delay: 1.1 + k * 0.02 })));

  // Sperone in the saddle: shaved head and a flying braid, quilted armour, shouting the charge.
  const seat = new Vector3(...h(0, 1.4, 0.7));
  const facing = PSI - 0.35;
  const knight = figure(kit, {
    x: seat.x,
    z: seat.z,
    y: seat.y - 1.08 * (2.1 / 2.4) + 0.04,
    facing,
    height: 2.1,
    skin: 0x8e5a3c,
    hair: { style: "bald", color: 0x1a1418 },
    face: { mouth: "grin", brows: "angry" },
    top: { kind: "armor", color: 0x2e3440, accent: 0x434c60 },
    bottom: { kind: "trousers", color: 0x2a2a34 },
    shoes: 0x1f1c22,
    gloves: 0x2a2a30,
    arms: [
      [-0.42, 2.02, 0.22],
      [0.2, 1.42, 0.48],
    ],
    legs: "wide",
    delay: 1.3,
  });
  const rider: Group[] = [...knight.parts];
  const mine = (part: Group) => (rider.push(part), part);
  mine(limb(kit, knight.at(0, 1.98, -0.16), knight.at(0.12, 1.66, -0.62), 0.045, 0.03, 0x1a1418, { delay: 1.8 }));
  mine(ball(0.04, BRASS, ...below(knight.at(0.12, 1.66, -0.62), 0.04), { delay: 1.82 }));
  // The cape, streaming back from her shoulders.
  const cut = new Shape();
  [
    [0.36, 0],
    [0.58, -1.2],
    [0.3, -1.04],
    [0.08, -1.32],
    [-0.16, -1.08],
    [-0.4, -1.34],
    [-0.58, -1.12],
    [-0.36, 0],
  ].forEach(([x, y], k) => (k ? cut.lineTo(x, y) : cut.moveTo(x, y)));
  const capeGeometry = new ExtrudeGeometry(cut, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015).rotateX(1.0).rotateY(facing);
  capeGeometry.computeBoundingBox();
  const neck = knight.at(0, 1.6, -0.16);
  mine(add(capeGeometry, CAPE, neck[0], neck[1] + (capeGeometry.boundingBox?.min.y ?? 0), neck[2], { delay: 1.6 }));
  // The lance with its pennant; the reins in her left hand.
  const [right, left] = knight.hands;
  mine(cylinder(0.022, 0.028, 1.6, 0x4a3a30, right[0], right[1] - 0.75, right[2], { delay: 1.7 }, 8));
  mine(add(new ConeGeometry(0.045, 0.2, 6), 0xb8c0cc, right[0], right[1] + 0.85, right[2], { delay: 1.75 }));
  const flag = new Shape();
  flag.moveTo(0, 0);
  flag.lineTo(0, 0.4);
  flag.lineTo(0.9, 0.28);
  flag.lineTo(0.52, 0.2);
  flag.lineTo(0.82, 0.04);
  flag.closePath();
  const yaw = facing + Math.PI / 2;
  const pennant = mine(add(new ExtrudeGeometry(flag, { depth: 0.02, bevelEnabled: false }).translate(0, 0, -0.01), ORANGE, right[0], right[1] + 0.42, right[2], { delay: 1.78, rotation: [0, yaw, 0] }));
  mine(cable(kit, [left, [left[0] + 0.15, left[1] - 0.25, left[2] + 0.1], h(0.1, 1.42, 1.98)], 0.015, LEATHER, 1.85));

  // Pigeons bursting up from the flagstones.
  const birds = [
    [1.75, 1.25, 0.75],
    [1.95, 2.15, -0.35],
    [1.25, 2.6, 1.3],
  ].map(([x, y, z], i) => {
    const bird = add(new SphereGeometry(0.07, 10, 8).scale(1.4, 0.85, 0.85), 0xc8ccd6, x, G + y, z, { delay: 1.9 + i * 0.06, rotation: [0, 0.6 - i * 0.5, 0.25] });
    const wings = [-1, 1].map((side) => {
      const wing = new CylinderGeometry(0.13, 0.07, 0.02, 3).scale(1.5, 1, 0.9).translate(side * 0.14, 0.06, 0);
      return add(wing, 0x9aa0ab, x, G + y, z, { delay: 1.92 + i * 0.06, rotation: [0, 0.6 - i * 0.5, 0] });
    });
    return { parts: [bird, ...wings], wings, y: G + y, phase: i * 0.37 };
  });

  // Horse and rider rear together about the hind hooves; the rider leans into the charge.
  const rock = new Group();
  body.parent?.add(rock);
  rock.position.copy(O);
  horse.forEach((part) => {
    part.position.sub(O);
    rock.add(part);
  });
  const saddle = new Group();
  rock.add(saddle);
  saddle.position.copy(seat).sub(O);
  rider.forEach((part) => {
    part.position.sub(seat);
    saddle.add(part);
  });
  saddle.quaternion.setFromAxisAngle(new Vector3(Math.cos(facing), 0, -Math.sin(facing)), 0.14);
  const axis = new Vector3(cy, 0, -sy);

  tick((t) => {
    rock.quaternion.setFromAxisAngle(axis, -0.06 * (1 - Math.cos(t * 1.7)));
    pennant.rotation.y = yaw + Math.sin(t * 7) * 0.25;
    fires.forEach(([outer, core], i) => {
      outer.children[0].scale.y = 1 + Math.sin(t * 9 + i) * 0.15;
      core.children[0].scale.y = 1 + Math.sin(t * 13 + i * 2) * 0.2;
    });
    birds.forEach(({ parts, wings, y, phase }) => {
      const lift = ((t * 0.25 + phase) % 1) * 0.5;
      parts.forEach((part) => (part.position.y = y + lift));
      wings.forEach((wing, side) => (wing.rotation.z = (side ? 1 : -1) * Math.sin(t * 16 + phase * 9) * 0.5));
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}

function below(p: Point, radius: number): Point {
  return [p[0], p[1] - radius, p[2]];
}
