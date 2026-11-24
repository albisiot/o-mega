import { BoxGeometry, CatmullRomCurve3, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, MeshBasicMaterial, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { MAGENTA, ORANGE, YELLOW, aim, cable, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { ring } from "@/lib/diorama-props";

/**
 * Re Tifeo (P080): the giant of the myth, buried under the volcano. His stone shoulders and his
 * crowned, bearded head rise behind the mountain, which sits on his chest with lava running down
 * it; his arms lie chained to the rock on either side, snakes rear behind him, and a glowing aura
 * of sparks rises round him. He sleeps with his eyes half shut, and every so often he turns in
 * his sleep: his eyes open, his head rolls, and the little city at his feet shakes.
 */
export function reTifeo(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x3a4058;
  const STONE_LIGHT = 0x4c5470;
  const BEARD = 0x8a92aa;
  const ROCK = 0x2e2630;
  const LAVA = 0xff5a1f;
  const RUST = 0x9a4a22;
  const F = octagonBase(kit, 0x221c26);

  // The bay at the front, lights on the water, and the little city along the shore.
  const bay = new Shape([[-1.5, -1.72], [1.5, -1.72], [0.95, -2.28], [-0.95, -2.28]].map(([x, s]) => new Vector2(x, s)));
  add(new ExtrudeGeometry(bay, { depth: 0.012, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x0e2a40, 0, F, 0, { delay: 0.05, noInk: true, flat: true });
  const glints = [-0.8, 0.1, 0.7].map((x, i) => box(0.25, 0.005, 0.02, YELLOW, x, F + 0.013, 1.85 + i * 0.12, { delay: 0.1, flat: true, noInk: true }));
  const houses: Group[] = [];
  for (let k = 0; k < 13; k++) {
    const x = -1.62 + k * 0.27;
    const w = 0.15 + ((k * 5) % 3) * 0.04;
    const hgt = k === 6 ? 0.5 : 0.14 + ((k * 7) % 4) * 0.06;
    const house = box(w, hgt, 0.16, [0x3a2f4e, 0x2a3a5a, 0x4a3050][k % 3], x, F, 1.5 + ((k * 3) % 2) * 0.08, { delay: 0.15 + k * 0.02 });
    decorate(house, new BoxGeometry(0.03, 0.04, 0.01), (k * 5) % 4 ? YELLOW : 0x16c8ff, [[0, hgt * 0.6, 0.081]]);
    houses.push(house);
  }

  // The giant behind the mountain: torso, shoulders, neck, with lava in the cracks of the stone.
  const glowing: MeshBasicMaterial[] = [];
  const torso = add(new CylinderGeometry(1.0, 0.8, 1.9, 16).scale(1, 1, 0.62), STONE, 0, F, -0.95, { delay: 0.2 });
  glowing.push(decorate(torso, new BoxGeometry(0.04, 0.5, 0.01), ORANGE, [[-0.45, 1.25, 0.56, 0.5], [0.5, 1.35, 0.56, -0.4], [0.25, 0.95, 0.58, 0.9]]));
  [-1, 1].forEach((side) => {
    const shoulder = ball(0.5, STONE_LIGHT, side * 0.98, F + 1.1, -0.9, { delay: 0.3 });
    glowing.push(decorate(shoulder, new BoxGeometry(0.04, 0.35, 0.01), ORANGE, [[side * -0.1, 0.6, 0.49, side * 0.6]]));
    // The arms, down to the ground beside the mountain, fists on the rock, chained.
    const from: Point = [side * 1.2, F + 1.45, -0.85];
    const elbow: Point = [side * 1.68, F + 0.6, -0.45];
    const wrist: Point = [side * 1.35, F + 0.32, 0.45];
    limb(kit, from, elbow, 0.38, 0.32, STONE, { delay: 0.35 });
    ball(0.32, STONE_LIGHT, elbow[0], elbow[1] - 0.32, elbow[2], { delay: 0.38 });
    limb(kit, elbow, wrist, 0.31, 0.27, STONE, { delay: 0.4 });
    ball(0.33, STONE_LIGHT, side * 1.3, F, 0.6, { delay: 0.45 });
    const cuff = aim(elbow, wrist);
    add(new TorusGeometry(0.3, 0.06, 8, 20).rotateX(Math.PI / 2), RUST, side * 1.44, F + 0.34, 0.2, { delay: 0.5, rotation: cuff.rotation });
    chain([[side * 1.42, F + 0.6, 0.22], [side * 1.85, F + 0.45, 0.6], [side * 1.95, F + 0.06, 0.95]], 0.55);
    cylinder(0.06, 0.08, 0.14, 0x4a4f5c, side * 1.95, F, 0.98, { delay: 0.6 });
  });
  cylinder(0.33, 0.4, 0.35, STONE, 0, F + 1.75, -0.85, { delay: 0.45 });

  // Snakes rearing behind his shoulders, glowing eyes, jaws open.
  const snakes: { head: Group; yaw: number }[] = [];
  [
    [-0.75, -1.3, -1.75, 2.75, -1.05, -0.5],
    [-0.4, -1.4, -1.1, 3.3, -1.3, -0.2],
    [0.4, -1.4, 1.1, 3.3, -1.3, 0.2],
    [0.75, -1.3, 1.75, 2.75, -1.05, 0.5],
  ].forEach(([bx, bz, tx, ty, tz, yaw], i) => {
    cable(kit, [[bx, F + 1.3, bz], [(bx + tx) / 2 + bx * 0.4, F + (1.3 + ty) / 2, bz - 0.15], [tx, F + ty, tz]], 0.1, i % 2 ? 0x2f4a6a : 0x3a3a68, 0.6 + i * 0.05);
    const head = add(new SphereGeometry(0.16, 12, 10).scale(1, 0.7, 1.5), 0x2f4a6a, tx, F + ty - 0.08, tz + 0.05, { delay: 0.8 + i * 0.05, rotation: [0, yaw, 0] });
    decorate(head, new BoxGeometry(0.05, 0.03, 0.01), YELLOW, [[-0.08, 0.15, 0.17], [0.08, 0.15, 0.17]]);
    decorate(head, new BoxGeometry(0.16, 0.05, 0.12), 0x7a1a3a, [[0, 0.03, 0.2]]);
    decorate(head, new ConeGeometry(0.015, 0.06, 4).rotateX(Math.PI), 0xf2f0ea, [[-0.05, 0.05, 0.24], [0.05, 0.05, 0.24]]);
    snakes.push({ head, yaw });
  });

  // The head, the beard, the crown: these roll together when he turns in his sleep.
  const pivot = new Vector3(0, F + 2.05, -0.8);
  const rolling: { part: Group; rest: Vector3; z: number }[] = [];
  const roll = (part: Group) => rolling.push({ part, rest: part.position.clone(), z: part.rotation.z });
  const head = add(new SphereGeometry(0.5, 18, 14).scale(0.95, 1.08, 0.9), STONE_LIGHT, 0, F + 2.06, -0.75, { delay: 0.6 });
  decorate(head, new BoxGeometry(0.2, 0.06, 0.06), STONE, [[-0.18, 0.7, 0.4, -0.2], [0.18, 0.7, 0.4, 0.2]]);
  decorate(head, new BoxGeometry(0.09, 0.2, 0.08), STONE, [[0, 0.52, 0.44]]);
  glowing.push(decorate(head, new BoxGeometry(0.03, 0.2, 0.01), ORANGE, [[-0.3, 0.45, 0.33, 0.3], [0.3, 0.8, 0.33, -0.5]]));
  roll(head);
  roll(add(new SphereGeometry(0.46, 14, 10).scale(1.05, 1.45, 0.75), BEARD, 0, F + 1.18, -0.52, { delay: 0.7 }));
  roll(box(0.42, 0.08, 0.1, BEARD, 0, F + 2.38, -0.3, { delay: 0.72 }));
  const eyes = [-1, 1].map((side) => box(0.13, 0.035, 0.03, YELLOW, side * 0.17, F + 2.66, -0.31, { delay: 0.9, flat: true, noInk: true }));
  eyes.forEach(roll);
  roll(cylinder(0.4, 0.42, 0.16, 0x4a4a58, 0, F + 2.95, -0.78, { delay: 0.75 }, 14));
  for (let k = 0; k < 7; k++) {
    const a = ((k - 3) / 3) * 1.35;
    roll(add(new ConeGeometry(0.07, 0.42 - Math.abs(k - 3) * 0.05, 6), 0xb08a3a, Math.sin(a) * 0.38, F + 3.08, -0.78 + Math.cos(a) * 0.3, { delay: 0.8 + k * 0.02, rotation: [0, 0, -Math.sin(a) * 0.35] }));
  }

  // The mountain on his chest: crater glowing, lava running down its front.
  const VZ = 0.1;
  const R0 = 1.15;
  const R1 = 0.3;
  const H = 1.75;
  cylinder(R1, R0, H, ROCK, 0, F, VZ, { delay: 0.5 }, 10);
  const crater = cylinder(R1 - 0.04, R1 - 0.04, 0.03, ORANGE, 0, F + H, VZ, { delay: 0.6, flat: true, noInk: true }, 10);
  [-0.55, 0.05, 0.6].forEach((angle, i) => {
    const flank = (hh: number, turn: number): Point => {
      const r = R0 + (R1 - R0) * (hh / H) + 0.04;
      return [r * Math.sin(angle + turn), F + hh, VZ + r * Math.cos(angle + turn)];
    };
    const path = [flank(H, 0), flank(H * 0.5, 0.12), flank(0, -0.05)];
    path.slice(1).forEach((to, k) => {
      const { length, rotation } = aim(to, path[k]);
      add(new BoxGeometry(0.16 - i * 0.02, length + 0.04, 0.02), LAVA, ...to, { delay: 0.65 + i * 0.04, flat: true, noInk: true, rotation });
      add(new BoxGeometry(0.05, length + 0.04, 0.025), YELLOW, ...to, { delay: 0.68 + i * 0.04, flat: true, noInk: true, rotation });
    });
  });

  // His aura: a ring of light behind him and sparks rising all round.
  const halo = ring(kit, [0, F + 1.65, -1.45], 1.0, MAGENTA, 1.2, true);
  motes(20, 0xffb040, 0.03, [-1.9, F + 0.4, -1.5], [1.9, F + 3.7, 0.3], 1.3);

  function chain(points: Point[], delay: number) {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    const n = Math.round(curve.getLength() / 0.12);
    const up = new Vector3(0, 1, 0);
    const twist = new Quaternion().setFromAxisAngle(up, Math.PI / 2);
    for (let k = 0; k < n; k++) {
      const p = curve.getPointAt(k / n);
      const link = add(new TorusGeometry(0.06, 0.022, 6, 12).scale(1, 1.5, 1), RUST, p.x, p.y, p.z, { delay: delay + k * 0.02 });
      link.quaternion.setFromUnitVectors(up, curve.getTangentAt(k / n).negate());
      if (k % 2) link.quaternion.multiply(twist);
    }
  }

  const lavaFrom = new Color(ORANGE);
  const lavaTo = new Color(YELLOW);
  const turned = new Vector3();
  const houseRest = houses.map((house) => house.position.x);
  tick((t) => {
    // Every eight seconds he stirs: a slow roll of the head, eyes opening, the city shaking.
    const phase = t % 8;
    const stir = phase > 5.4 && phase < 7.6 ? Math.sin((Math.PI * (phase - 5.4)) / 2.2) : 0;
    const angle = stir * 0.13 * (Math.floor(t / 8) % 2 ? -1 : 1);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    for (const { part, rest, z } of rolling) {
      turned.copy(rest).sub(pivot);
      part.position.set(pivot.x + turned.x * c - turned.y * s, pivot.y + turned.x * s + turned.y * c, rest.z);
      part.rotation.z = z + angle;
    }
    eyes.forEach((eye) => (eye.children[0].scale.y = 1 + stir * 2.2));
    houses.forEach((house, i) => (house.position.x = houseRest[i] + Math.sin(t * 47 + i) * 0.012 * stir));
    const glow = (Math.sin(t * 1.5) + 1) / 2 * 0.6 + stir * 0.4;
    for (const material of glowing) material.color.lerpColors(lavaFrom, lavaTo, glow);
    colorOf(crater).lerpColors(lavaFrom, lavaTo, glow);
    halo.children[0].scale.setScalar(1 + Math.sin(t * 1.2) * 0.03);
    halo.position.y = F + 1.65 - Math.sin(t * 1.2) * 0.03 * 1.02;
    for (const { head: snake, yaw } of snakes) snake.rotation.y = yaw + Math.sin(t * 0.9 + yaw * 3) * 0.25;
    glints.forEach((glint, i) => (glint.position.x = [-0.8, 0.1, 0.7][i] + Math.sin(t * 0.8 + i) * 0.05));
  });

  return { width: 4.9, height: 4.6, lookY: 1.85 };
}
