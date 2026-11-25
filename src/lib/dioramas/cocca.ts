import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { CYAN, INK, MAGENTA, YELLOW, aim, colorOf, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, tree } from "@/lib/diorama-props";

/**
 * Cocca (P272): the archer of the Gente della Selva on the lawn of a ruined temple at night,
 * her bow drawn on a Compagnia Lete drone hovering over the grass, the tip of her only arrow
 * glowing: one is enough, and her quiver is empty. Her skin is veined like wood, fireflies
 * circle the pine behind her; on a column drum lies the price of knowing nothing of machines,
 * a phone she gave up on, its screen cracked.
 */
export function cocca(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STONE = 0x7c8cac;
  const LEATHER = 0x5a2a2e;
  const BONE = 0xe8dcc0;
  const F = octagonBase(kit, 0x1d2620);
  const G = floor(kit, F, 0.06, 0x22382a, 0x1a2c20, 0);

  // The temple ruin: two columns under a corner of the architrave and the pediment, one broken.
  column(kit, -1.6, -0.95, G, 0.12, 2.5, false, STONE);
  column(kit, -0.45, -1.62, G, 0.16, 2.5, false, STONE);
  column(kit, 1.5, -1.05, G, 0.2, 1.5, true, STONE);
  const turn = Math.atan2(0.67, 1.15);
  box(1.75, 0.22, 0.42, 0x6a7a9a, -1.025, G + 2.56, -1.285, { delay: 0.3, rotation: [0, turn, 0] });
  const gable = new Shape();
  gable.moveTo(-0.95, 0);
  gable.lineTo(0.95, 0);
  gable.lineTo(0, 0.5);
  gable.closePath();
  add(new ExtrudeGeometry(gable, { depth: 0.36, bevelEnabled: false }).translate(0, 0, -0.18), STONE, -1.025, G + 2.78, -1.285, { delay: 0.36, rotation: [0, turn, 0] });
  tree(kit, 0.45, -1.8, G, 0.25, 2.3, 0x2f6f4a);
  motes(10, 0xd8ff7a, 0.022, [-0.2, G + 0.6, -2.0], [1.1, G + 2.2, -1.1], 1.2);

  // The column drum with the cracked phone.
  const drum = cylinder(0.26, 0.28, 0.42, STONE, -1.5, G, 0.85, { delay: 0.4 }, 12);
  decorate(drum, new BoxGeometry(0.025, 0.36, 0.01), 0x5d6a88, [-0.5, 0, 0.5].map((a) => [Math.sin(a) * 0.28, 0.21, Math.cos(a) * 0.28] as Point));
  const phone = box(0.12, 0.018, 0.2, INK, -1.48, G + 0.42, 0.85, { delay: 0.5, rotation: [0, 0.5, 0] });
  decorate(phone, new BoxGeometry(0.1, 0.004, 0.17), CYAN, [[0, 0.019, 0]]);
  decorate(phone, new BoxGeometry(0.006, 0.006, 0.1).rotateY(0.7), 0xf4f0e6, [[0.01, 0.022, 0.01]]);
  decorate(phone, new BoxGeometry(0.006, 0.006, 0.07).rotateY(-0.5), 0xf4f0e6, [[-0.015, 0.022, -0.03]]);

  // Cocca: short green hair, wood-veined skin, a long leather coat, the bow drawn.
  const facing = 0.3;
  const archer = figure(kit, {
    x: -0.5,
    z: 0.35,
    y: G,
    facing,
    height: 2.35,
    build: "slim",
    skin: 0xc8946a,
    hair: { style: "short", color: 0x2f5a44 },
    face: { mouth: "frown", brows: "angry", marks: 0x7a4a2a },
    top: { kind: "coat", color: LEATHER, accent: 0x6a6a74 },
    bottom: { kind: "trousers", color: 0x3a3a46 },
    shoes: 0x2a2026,
    belt: 0x3a2018,
    arms: [
      [-0.1, 1.9, 0.16],
      [0.74, 2.08, 0.3],
    ],
    legs: "wide",
    delay: 0.8,
  });
  const lean = (part: Group, x: number, z: number) => {
    part.rotation.order = "YXZ";
    part.rotation.set(x, facing, z);
    return part;
  };
  // Brass buttons down the coat, a quiver strap across the chest, the empty quiver on her back.
  [-0.07, 0.07].forEach((dx) => [1.22, 1.38, 1.54].forEach((y, k) => ball(0.022, 0xc8a050, ...archer.at(dx, y - 0.022, 0.235 - k * 0.005), { delay: 1.3 })));
  lean(box(0.05, 0.85, 0.03, 0x3a2018, ...archer.at(0, 1.0, 0.24), { delay: 1.32, noInk: true }), 0, -0.75);
  const quiver = lean(cylinder(0.09, 0.07, 0.62, 0x4a2a20, ...archer.at(0.12, 1.15, -0.3), { delay: 1.34 }, 10), -0.15, -0.45);
  decorate(quiver, new TorusGeometry(0.09, 0.015, 6, 14).rotateX(Math.PI / 2), 0xc8a050, [[0, 0.6, 0]]);

  // The bow, held in her left hand: an arc of pale wood bowing towards the drone.
  const [nock, grip] = archer.hands;
  const flat = new Vector3(grip[0] - nock[0], 0, grip[2] - nock[2]).normalize();
  const R = 0.85;
  const A = 1.6;
  const yaw = Math.atan2(flat.x, flat.z);
  const bow = (tube: number) =>
    new TorusGeometry(R, tube, 6, 28, A)
      .rotateZ(-A / 2)
      .translate(-R, 0, 0)
      .rotateY(yaw - Math.PI / 2);
  add(bow(0.03), BONE, grip[0], grip[1] - R * Math.sin(A / 2), grip[2], { delay: 1.4, outline: bow(0.05) });
  const tip = (up: number): Point => [grip[0] + flat.x * R * (Math.cos(A / 2) - 1), grip[1] + up * R * Math.sin(A / 2), grip[2] + flat.z * R * (Math.cos(A / 2) - 1)];
  limb(kit, tip(1), nock, 0.007, 0.007, 0xf4ecd8, { delay: 1.45, noInk: true });
  limb(kit, nock, tip(-1), 0.007, 0.007, 0xf4ecd8, { delay: 1.45, noInk: true });
  box(0.07, 0.12, 0.05, 0x3a2018, grip[0], grip[1] - 0.06, grip[2], { delay: 1.42, rotation: [0, yaw, 0] });

  // Her one arrow: shaft, white fletching, the glowing head.
  const dir = new Vector3(grip[0] - nock[0], grip[1] - nock[1], grip[2] - nock[2]).normalize();
  const along = (from: Point, k: number): Point => [from[0] + dir.x * k, from[1] + dir.y * k, from[2] + dir.z * k];
  const head = along(grip, 0.2);
  limb(kit, along(nock, -0.06), head, 0.012, 0.012, 0x3a2a20, { delay: 1.5 });
  const fletch = aim(along(nock, -0.04), along(nock, 0.1)).rotation;
  box(0.07, 0.12, 0.006, 0xf4f0e6, ...along(nock, -0.04), { delay: 1.52, noInk: true, rotation: fletch });
  box(0.006, 0.12, 0.07, 0xf4f0e6, ...along(nock, -0.04), { delay: 1.52, noInk: true, rotation: fletch });
  add(new ConeGeometry(0.035, 0.12, 6), YELLOW, ...head, { delay: 1.55, flat: true, rotation: aim(head, along(head, 1)).rotation });
  const spark = ball(0.04, YELLOW, ...along(head, 0.1), { delay: 1.6, flat: true, noInk: true });

  // The drone of the Compagnia Lete, straight down her line, its red eye on her.
  const D = along(grip, 1.7);
  const droneParts: Group[] = [];
  const body = add(new SphereGeometry(0.17, 16, 10).scale(1.3, 0.55, 1.3), 0x2a2e3a, D[0], D[1] - 0.09, D[2], { delay: 1.0 });
  decorate(body, new BoxGeometry(0.3, 0.025, 0.01), MAGENTA, [[0, 0.1, 0.215]]);
  droneParts.push(body);
  const eye = ball(0.045, MAGENTA, D[0] - dir.x * 0.18, D[1] - 0.13, D[2] - dir.z * 0.18, { delay: 1.05, flat: true });
  droneParts.push(eye);
  const rotors: Group[] = [];
  [0.785, 2.356, 3.927, 5.498].forEach((a, k) => {
    const [rx, rz] = [D[0] + Math.cos(a) * 0.3, D[2] + Math.sin(a) * 0.3];
    droneParts.push(box(0.3, 0.03, 0.04, 0x3a3e4c, (D[0] + rx) / 2, D[1] - 0.02, (D[2] + rz) / 2, { delay: 1.05, rotation: [0, -a, 0] }));
    droneParts.push(cylinder(0.03, 0.03, 0.06, 0x3a3e4c, rx, D[1], rz, { delay: 1.1 }, 8));
    const rotor = add(new CylinderGeometry(0.13, 0.13, 0.008, 18), 0x9fe8ff, rx, D[1] + 0.06, rz, { delay: 1.12 + k * 0.02, flat: true, noInk: true });
    decorate(rotor, new BoxGeometry(0.26, 0.012, 0.035), INK, [[0, 0.01, 0]]);
    rotors.push(rotor);
    droneParts.push(rotor);
  });
  const rest = droneParts.map((part) => part.position.clone());

  const glowFrom = new Color(YELLOW);
  const glowTo = new Color(0xffffff);
  tick((t) => {
    const bob = Math.sin(t * 1.9) * 0.06;
    const sway = Math.sin(t * 0.7) * 0.08;
    droneParts.forEach((part, i) => part.position.set(rest[i].x + sway, rest[i].y + bob, rest[i].z - sway * 0.5));
    rotors.forEach((rotor, k) => (rotor.rotation.y = t * (k % 2 ? 22 : -22)));
    eye.visible = Math.floor(t * 2.5) % 5 !== 3;
    colorOf(spark).lerpColors(glowFrom, glowTo, (Math.sin(t * 4) + 1) / 2);
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
