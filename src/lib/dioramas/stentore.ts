import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, limb, octagonBase, type Framing, type Kit } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, facade, floor, lamp } from "@/lib/diorama-props";

/**
 * Stentore (P127): the marble orator of the piazza, his feet still sunk in his pedestal, bellows
 * the Comune's latest notice through a green bronze megaphone; rings of sound roll out over the
 * square, the pigeons wheel away in alarm, and the notice board below is papered with the
 * announcements he has already read to the whole city, at full voice.
 */
export function stentore(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const MARBLE = 0xdcd8cc;
  const MARBLE_SHADE = 0xbcb8ac;
  const MOSS = 0x4a7a3a;
  const BRONZE = 0x3e7a6a;
  const F = octagonBase(kit, 0x1e1a28);
  const G = floor(kit, F, 0.06, 0x3a3448, 0x2a2436, 0.36);

  // The square: a pink tenement with balconies, a lamp, two columns of an old temple.
  facade(kit, -0.6, -1.62, G, 0.1, { width: 1.8, height: 2.9, color: 0x6a2a52, windows: 3, floors: 3, balcony: true, shutters: 0x23707e });
  lamp(kit, -1.65, -0.55, G, 0.25, 2.0);
  column(kit, 1.15, -1.35, G, 0.2, 2.6, false, 0x7c8cac);
  column(kit, 1.85, -0.75, G, 0.24, 1.6, true, 0x7c8cac);

  // The pedestal, mossy and cracked; his feet are still in it.
  const PX = 0.05;
  const PZ = -0.25;
  box(1.25, 0.12, 1.15, MARBLE_SHADE, PX, G, PZ, { delay: 0.3 });
  const block = box(1.05, 0.7, 0.95, 0xa8a49a, PX, G + 0.12, PZ, { delay: 0.34 });
  decorate(block, new BoxGeometry(0.22, 0.08, 0.01), MOSS, [
    [-0.3, 0.05, 0.476],
    [0.25, 0.62, 0.476],
  ]);
  decorate(block, new BoxGeometry(0.012, 0.3, 0.01), 0x6a665e, [
    [0.3, 0.3, 0.477, 0.4],
    [-0.2, 0.5, 0.477, -0.3],
  ]);
  box(1.2, 0.1, 1.1, MARBLE_SHADE, PX, G + 0.82, PZ, { delay: 0.38 });
  const T = G + 0.92;
  const facing = 0.3;
  const statue = figure(kit, {
    x: PX,
    z: PZ,
    y: T - 0.16,
    facing,
    height: 2.4,
    build: "broad",
    skin: MARBLE,
    hair: { style: "curly", color: MARBLE_SHADE },
    face: { mouth: "open", brows: "angry", eyes: 0xa8a49a, beard: "full", beardColor: MARBLE_SHADE, marks: 0x8a867c },
    top: { kind: "robe", color: MARBLE },
    barefoot: true,
    arms: [
      [-0.12, 2.02, 0.34],
      [0.14, 2.1, 0.5],
    ],
    delay: 0.6,
  });
  // The toga's fold across his chest, moss in its creases, cracks round his ankles.
  const moss = box(0.001, 0.001, 0.001, MOSS, ...statue.at(0, 0, 0), { delay: 1.05, noInk: true, rotation: [0, facing, 0] });
  decorate(moss, new BoxGeometry(0.14, 0.05, 0.02), MOSS, [
    [-0.15, 1.1, 0.34, 0.6],
    [0.28, 0.6, 0.42, -0.4],
    [-0.4, 0.45, 0.38, 0.2],
  ]);
  decorate(moss, new BoxGeometry(0.13, 0.95, 0.03), MARBLE_SHADE, [[0.02, 1.28, 0.33, -0.6]]);
  decorate(moss, new BoxGeometry(0.3, 0.004, 0.02), 0x6a665e, [
    [-0.2, 0.161, 0.3, 0],
    [0.25, 0.161, 0.28, 0],
  ]);

  // The megaphone: from his mouth up and out over the square.
  const mouth = statue.at(0.02, 2.02, 0.28);
  const bell = statue.at(0.78, 2.4, 0.85);
  const { rotation } = aim(mouth, bell);
  const dir = new Vector3(bell[0] - mouth[0], bell[1] - mouth[1], bell[2] - mouth[2]).normalize();
  const horn = limb(kit, mouth, bell, 0.07, 0.3, BRONZE, { delay: 1.1 });
  add(new CylinderGeometry(0.27, 0.27, 0.02, 24), 0x14261f, ...bell, { delay: 1.15, rotation, noInk: true });
  add(new TorusGeometry(0.3, 0.03, 6, 28).rotateX(Math.PI / 2), 0x2f5e52, ...bell, { delay: 1.17, rotation });
  const hornRest = horn.rotation.clone();

  // Rings of his voice rolling out of the bell.
  const rings = [0, 1, 2, 3].map((k) =>
    add(new TorusGeometry(0.32, 0.025, 6, 32).rotateX(Math.PI / 2), k % 2 ? CYAN : MAGENTA, ...bell, { delay: 1.3, flat: true, noInk: true, rotation }),
  );

  // The notice board, papered with blank notices.
  const NX = -1.35;
  const NZ = 0.7;
  [-0.4, 0.4].forEach((dx) => box(0.06, 1.3, 0.06, 0x3e3028, NX + dx * Math.cos(0.5), G, NZ - dx * Math.sin(0.5), { delay: 0.4, rotation: [0, 0.5, 0] }));
  const board = box(0.95, 0.65, 0.05, 0x5e4a3a, NX, G + 0.6, NZ, { delay: 0.45, rotation: [0, 0.5, 0] });
  decorate(board, new BoxGeometry(0.2, 0.26, 0.01), 0xf2efe6, [
    [-0.3, 0.38, 0.03, 0.05],
    [-0.04, 0.4, 0.03, -0.04],
    [0.22, 0.36, 0.03, 0.08],
    [0.3, 0.12, 0.03, -0.02],
  ]);
  decorate(board, new BoxGeometry(0.12, 0.012, 0.012), 0x9aa0ab, [
    [-0.3, 0.44, 0.04],
    [-0.3, 0.4, 0.04],
    [-0.04, 0.45, 0.04],
    [0.22, 0.4, 0.04],
  ]);
  decorate(board, new SphereGeometry(0.018, 6, 4), MAGENTA, [
    [-0.3, 0.5, 0.04],
    [-0.04, 0.52, 0.04],
    [0.22, 0.48, 0.04],
    [0.3, 0.24, 0.04],
  ]);

  // Pigeons wheeling round him, flapping hard.
  const pigeon = (delay: number) => {
    const bird = new Group();
    const body = add(new SphereGeometry(0.1, 12, 8).scale(1.6, 0.9, 0.9), 0x8a90a0, 0, -0.09, 0, { delay });
    const head = ball(0.065, 0x6a7080, 0.15, 0.02, 0, { delay: delay + 0.02 });
    decorate(head, new ConeGeometry(0.018, 0.05, 5).rotateZ(-Math.PI / 2), YELLOW, [[0.07, 0.06, 0]]);
    decorate(head, new BoxGeometry(0.015, 0.015, 0.012), INK, [
      [0.035, 0.08, 0.05],
      [0.035, 0.08, -0.05],
    ]);
    const tail = box(0.12, 0.02, 0.1, 0x6a7080, -0.2, -0.02, 0, { delay });
    const wings = [-1, 1].map((side) => box(0.16, 0.02, 0.28, 0xa8aeb8, 0, 0, side * 0.02, { delay: delay + 0.03, rotation: [side * 0.5, 0, 0] }));
    body.parent?.add(bird);
    bird.add(body, head, tail, ...wings);
    wings.forEach((wing, k) => (wing.children.forEach((mesh) => (mesh.position.z = (k ? 1 : -1) * 0.14))));
    return { bird, wings };
  };
  const flock = [0, 1, 2].map((k) => ({ ...pigeon(1.5 + k * 0.05), phase: (k * Math.PI * 2) / 3, height: 3.0 + k * 0.25, radius: 1.2 + k * 0.25 }));

  tick((t) => {
    // He bellows: the horn shudders, the rings roll out and widen.
    horn.rotation.set(hornRest.x + Math.sin(t * 40) * 0.008, hornRest.y, hornRest.z + Math.sin(t * 37) * 0.008);
    rings.forEach((ring, k) => {
      const u = (t * 0.45 + k / 4) % 1;
      ring.position.set(bell[0] + dir.x * u * 0.95, bell[1] + dir.y * u * 0.95, bell[2] + dir.z * u * 0.95);
      ring.children.forEach((mesh) => mesh.scale.setScalar(1 + u * 1.1));
      ring.visible = u < 0.9;
    });
    for (const p of flock) {
      const a = p.phase + t * 0.6;
      p.bird.position.set(PX + Math.cos(a) * p.radius, G + p.height + Math.sin(t * 2 + p.phase) * 0.1, PZ + Math.sin(a) * p.radius);
      p.bird.rotation.y = -a - Math.PI / 2;
      p.wings.forEach((wing, k) => (wing.rotation.x = (k ? 1 : -1) * (0.3 + Math.sin(t * 14 + p.phase) * 0.6)));
    }
  });

  return { width: 4.9, height: 4.7, lookY: 1.95 };
}
