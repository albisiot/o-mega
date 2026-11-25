import { BackSide, BoxGeometry, ConeGeometry, Group, SphereGeometry, TorusGeometry, type Material, type Mesh } from "three";
import { CYAN, INK, YELLOW, aim, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bollard, crate, floor, lamp, puddle, towerCrane } from "@/lib/diorama-props";

/**
 * Praesidium (P226): on the wet night quay, the headless guardian of the colossus asleep under the
 * port has climbed out on its clawed bone legs. Where a head should be, its whole front is a
 * gaping maw ringed with bone. The dock siren on its pole wails at it, and the rings of sound
 * shrink and vanish into the maw: where it stands there is no sound at all. A docker in a hard
 * hat, lantern in hand, looks up at it, very small.
 */
export function praesidium(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const BONE = 0xe0d4b8;
  const BONE_DARK = 0x9a8e78;
  const HIDE = 0x6e665a;
  const FLESH = 0x6a2e2e;
  const F = octagonBase(kit, 0x0e2a3a);
  const G = floor(kit, F, 0.06, 0x2a2e38, 0x1c2028, 0.5);
  towerCrane(kit, -1.8, -0.85, G, 0.12, 3.8, 1.3, 0x35607a);
  puddle(kit, 0.4, 1.35, G, 0.3, 0.45, YELLOW);
  puddle(kit, -1.2, 0.9, G, 0.32, 0.3, CYAN);
  bollard(kit, -1.85, 0.25, G, 0.25);
  bollard(kit, 1.9, -0.6, G, 0.25);
  crate(kit, 1.55, -1.25, G, 0.3, 0.45, 0x2f6f86, 0.3);
  crate(kit, 1.6, -1.2, G + 0.45, 0.34, 0.38, 0x7a2f55, -0.2);

  // The creature's own frame, turned to face the camera at rest.
  const DF = 0.35;
  const Z0 = -0.25;
  const d = (lx: number, ly: number, lz: number): Point => [lx * Math.cos(DF) + lz * Math.sin(DF), G + ly, Z0 - lx * Math.sin(DF) + lz * Math.cos(DF)];
  const body: Group[] = [];

  // The hunched body behind the maw, a cage of ribs over it and a ridge of spines along the back.
  const BY = 2.5;
  body.push(add(new SphereGeometry(1, 18, 14).scale(1, 0.72, 1), HIDE, ...d(0, BY - 0.62, -0.95), { delay: 0.3, rotation: [0, DF, 0] }));
  [-1.65, -1.3, -0.95, -0.6, -0.25].forEach((lz, k) => {
    const r = Math.sqrt(Math.max(0.2, 1 - ((lz + 0.95) / 1.05) ** 2)) + 0.05;
    body.push(add(new TorusGeometry(r, 0.07, 6, 16, Math.PI).scale(1, 0.75, 1), BONE, ...d(0, BY + 0.05, lz), { delay: 0.45 + k * 0.04, rotation: [0, DF, 0] }));
  });
  [-1.6, -1.25, -0.9, -0.55, -0.2].forEach((lz, k) =>
    body.push(add(new ConeGeometry(0.09, 0.34, 6), BONE, ...d(0, BY + 0.74 - Math.abs(lz + 0.9) * 0.25, lz), { delay: 0.6 + k * 0.03, rotation: [-0.5, DF, 0] })),
  );

  // The maw: the whole front of it is a mouth, a deep raw bowl ringed with bone and teeth, tilted
  // up to the sky.
  const maw = new Group();
  maw.position.set(...d(0, BY - 0.15, 0.55));
  maw.rotation.order = "YXZ";
  maw.rotation.set(-0.6, DF, 0);
  const R = 0.56;
  const dome = (r: number) => new SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2);
  const cup = add(dome(R + 0.07), HIDE, 0, -(R + 0.07), 0, { delay: 0.62 });
  const throat = add(dome(R), FLESH, 0, -R, 0, { delay: 0.64, noInk: true });
  ((throat.children[0] as Mesh).material as Material).side = BackSide;
  decorate(
    throat,
    new BoxGeometry(0.016, 0.24, 0.01),
    0xd0a090,
    Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2 + (k % 3) * 0.12;
      const r = 0.24 + (k % 2) * 0.06;
      return [Math.sin(a) * r, R + Math.cos(a) * r, -0.2 - (k % 2) * 0.08, -a] as [number, number, number, number];
    }),
  );
  const pit = ball(0.17, 0x1e0a0e, 0, -0.17, -R * 0.72, { delay: 0.7, flat: true, noInk: true });
  const lip = add(new TorusGeometry(R + 0.04, 0.11, 8, 30), BONE, 0, -(R + 0.15), 0.02, { delay: 0.72 });
  const teeth = Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2;
    const h = 0.16 + (k % 3) * 0.05;
    return add(new ConeGeometry(0.045, h, 6), 0xf0e8d8, Math.cos(a) * (R - 0.02), Math.sin(a) * (R - 0.02), 0.04, { delay: 0.75 + k * 0.01, rotation: [0, 0, a + Math.PI / 2] });
  });
  const plates = [-1.0, -0.5, 0, 0.5, 1.0].map((a, k) =>
    box(0.26, 0.14, 0.22, k % 2 ? BONE : BONE_DARK, Math.sin(a) * (R + 0.12), Math.cos(a) * (R + 0.12), -0.04, { delay: 0.8 + k * 0.02, rotation: [0, 0, -a] }),
  );
  cup.parent?.add(maw);
  maw.add(cup, throat, pit, lip, ...teeth, ...plates);

  // Four long bone legs, the front pair splayed forward, each ending in a hand of hooked claws.
  const leg = (shoulder: Point, elbow: Point, wrist: Point, delay: number) => {
    limb(kit, shoulder, elbow, 0.24, 0.17, BONE_DARK, { delay });
    ball(0.2, BONE, elbow[0], elbow[1] - 0.2, elbow[2], { delay: delay + 0.03 });
    limb(kit, elbow, wrist, 0.17, 0.13, BONE, { delay: delay + 0.05 });
    add(new SphereGeometry(0.26, 12, 8).scale(1, 0.55, 1.15), BONE_DARK, wrist[0], G, wrist[2], { delay: delay + 0.08, rotation: [0, DF, 0] });
    [-0.16, -0.05, 0.06, 0.17].forEach((dx, k) => {
      const claw = add(new ConeGeometry(0.06, 0.38, 6), 0xf0e8d8, wrist[0] + dx * Math.cos(DF) + 0.12 * Math.sin(DF), G + 0.12, wrist[2] - dx * Math.sin(DF) + 0.12 * Math.cos(DF), { delay: delay + 0.1 + k * 0.02 });
      claw.rotation.order = "YXZ";
      claw.rotation.set(Math.PI / 2 + 0.55, DF + dx * 1.2, 0);
    });
  };
  [-1, 1].forEach((s, i) => {
    leg(d(s * 0.85, BY - 0.25, 0.0), d(s * 1.22, 1.35, 0.35), d(s * 1.0, 0.12, 0.85), 0.3 + i * 0.05);
    leg(d(s * 0.75, BY - 0.25, -1.5), d(s * 1.1, 1.2, -1.1), d(s * 0.95, 0.12, -1.55), 0.2 + i * 0.05);
  });

  // The dock siren wailing at it from its pole.
  const S: Point = [-1.75, G, 0.95];
  cylinder(0.04, 0.05, 2.0, 0x23222b, ...S, { delay: 0.4 }, 8);
  const mouth = maw.position.toArray() as Point;
  const horn: Point = [S[0], G + 1.95, S[2]];
  const away = aim(mouth, horn);
  add(new ConeGeometry(0.2, 0.36, 12, 1, true), 0x4a4f5c, horn[0], horn[1] - 0.1, horn[2], { delay: 0.5, rotation: away.rotation });
  const siren = ball(0.06, YELLOW, S[0], G + 2.0, S[2], { delay: 0.55, flat: true });
  const yaw = Math.atan2(mouth[0] - horn[0], mouth[2] - horn[2]);
  const rings = [0, 1, 2].map((k) => add(new TorusGeometry(0.22, 0.018, 6, 28), 0xcff2ff, ...horn, { delay: 1.6 + k * 0.1, flat: true, noInk: true, rotation: [0, yaw, 0] }));

  // The docker, small under it, lantern held up.
  const docker = figure(kit, {
    x: 1.05,
    z: 1.2,
    y: G,
    facing: -2.3,
    height: 1.35,
    build: "normal",
    skin: 0xc89070,
    face: { mouth: "open", brows: "raised" },
    headwear: { kind: "hardhat", color: YELLOW, accent: 0xd8b008 },
    top: { kind: "jacket", color: 0x2a3a4a, accent: 0x3a4a5a },
    bottom: { kind: "trousers", color: 0x23262e },
    arms: [[-0.25, 0.95, 0.25], "down"],
    delay: 1.2,
  });
  const [lh] = docker.hands;
  cylinder(0.005, 0.005, 0.1, INK, lh[0], lh[1] - 0.1, lh[2], { delay: 1.5, noInk: true }, 4);
  box(0.08, 0.1, 0.08, YELLOW, lh[0], lh[1] - 0.2, lh[2], { delay: 1.52, flat: true });
  lamp(kit, 1.75, 0.55, G, 0.35, 2.1, YELLOW);

  const rest = body.map((part) => part.position.y);
  const mawY = maw.position.y;
  tick((t) => {
    // It breathes without a sound.
    const breath = Math.sin(t * 1.2) * 0.04;
    body.forEach((part, i) => (part.position.y = rest[i] + breath));
    maw.position.y = mawY + breath;
    // The siren's rings fly at the maw, shrink and are swallowed.
    rings.forEach((ring, k) => {
      const u = (t * 0.4 + k / 3) % 1;
      const s = 1.4 - u * 1.3;
      ring.position.set(horn[0] + (mouth[0] - horn[0]) * u, horn[1] + (mouth[1] + breath - horn[1]) * u - 0.22 * s, horn[2] + (mouth[2] - horn[2]) * u);
      ring.children[0].scale.setScalar(s);
      ring.visible = u < 0.92;
    });
    siren.visible = Math.floor(t * 4) % 2 === 0;
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
