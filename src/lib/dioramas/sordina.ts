import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, TorusGeometry, type Group } from "three";
import { CYAN, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { bench, floor, lamp } from "@/lib/diorama-props";

/**
 * Sordina (P037): the spy for hire on an empty metro platform at night, a sideways look, holding
 * out a dossier she has stolen for you and hiding another copy behind her back for whoever pays
 * more; on the bench, a briefcase of cash from the last client. The dossier is bound by a magic
 * seal turning round it that she, with no magic at all, can't break. A train's lights grow in
 * the tunnel, the platform lamp flickers.
 */
export function sordina(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const TILE = 0x2c5a6a;
  const EDGE = 0.45;
  const F = octagonBase(kit, 0x1a1c22);
  const G = floor(kit, F, 0.06, 0x2a282e, 0x1e1c22, 0.4);

  // The tiled wall, with the tunnel's mouth over the tracks.
  const wall = box(3.15, 2.9, 0.16, TILE, 0.02, G, -1.45, { delay: 0.1, ink: 1.02 });
  const tiles: Point[] = [];
  for (let r = 0; r < 13; r++) tiles.push([0, 0.22 * r + 0.1, 0.081]);
  decorate(wall, new BoxGeometry(3.15, 0.015, 0.01), 0x1e4250, tiles);
  decorate(wall, new BoxGeometry(3.15, 0.12, 0.012), MAGENTA, [[0, 2.55, 0.082]]);
  const mouth = box(0.85, 1.4, 0.02, 0x06050a, 1.08, G, -1.36, { delay: 0.2, flat: true, noInk: true });
  decorate(mouth, new BoxGeometry(0.08, 0.06, 0.01), YELLOW, [[-0.17, 0.35, 0.012], [0.17, 0.35, 0.012]]);
  const headlights = mouth.children.slice(1);
  box(1.0, 0.1, 0.06, 0x1e4250, 1.08, G + 1.4, -1.33, { delay: 0.22 });

  // The tracks on their sleepers.
  const sleepers = box(0.01, 0.01, 0.01, 0x3a2c24, 1.08, G, 0, { delay: 0.2, flat: true, noInk: true });
  decorate(sleepers, new BoxGeometry(0.85, 0.04, 0.12), 0x3a2c24, Array.from({ length: 9 }, (_, k) => [0, 0.02, -1.2 + k * 0.3] as Point));
  [0.84, 1.32].forEach((x) => box(0.05, 0.07, 2.75, 0x8a93a3, x, G + 0.03, -0.05, { delay: 0.26, noInk: true }));

  // The platform: the base's octagon, cut along its edge, raised over the tracks.
  const R = 2.3;
  const corners: [number, number][] = Array.from({ length: 8 }, (_, k) => [R * Math.sin(Math.PI / 8 + (k * Math.PI) / 4), R * Math.cos(Math.PI / 8 + (k * Math.PI) / 4)]);
  const cut: [number, number][] = [];
  corners.forEach((a, k) => {
    const b = corners[(k + 1) % 8];
    if (a[0] <= EDGE) cut.push(a);
    if ((a[0] - EDGE) * (b[0] - EDGE) < 0) cut.push([EDGE, a[1] + ((EDGE - a[0]) / (b[0] - a[0])) * (b[1] - a[1])]);
  });
  const outline = new Shape();
  cut.forEach(([x, z], k) => (k ? outline.lineTo(x, -z) : outline.moveTo(x, -z)));
  outline.closePath();
  const P = 0.3;
  add(new ExtrudeGeometry(outline, { depth: P, bevelEnabled: false }).rotateX(-Math.PI / 2), 0x3e4658, 0, G, 0, { delay: 0.14, ink: 1.01 });
  const S = G + P;
  box(0.12, 0.006, 3.6, YELLOW, EDGE - 0.12, S, -0.05, { delay: 0.3, flat: true, noInk: true });
  const light = lamp(kit, 0.25, -1.05, S, 0.3, 2.0, MAGENTA);
  bench(kit, -1.2, -0.85, S, 0.35);

  // The last client's money in an open briefcase on the bench.
  const B: Point = [-1.35, S + 0.35, -0.82];
  const caseBox = box(0.46, 0.1, 0.32, 0x3a2620, ...B, { delay: 0.5, rotation: [0, 0.2, 0] });
  decorate(caseBox, new BoxGeometry(0.12, 0.04, 0.24), 0x7a9a6a, [[-0.13, 0.11, 0], [0, 0.11, 0], [0.13, 0.11, 0]]);
  decorate(caseBox, new BoxGeometry(0.03, 0.045, 0.245), YELLOW, [[-0.13, 0.11, 0], [0, 0.11, 0], [0.13, 0.11, 0]]);
  box(0.46, 0.3, 0.03, 0x3a2620, B[0] + 0.03, B[1] + 0.1, B[2] - 0.17, { delay: 0.54, rotation: [-0.35, 0.2, 0] });

  // Sordina: dark braids, a teal trench coat, a black collar, a sideways look.
  const spy = figure(kit, {
    x: -0.05,
    z: 0.45,
    y: S,
    facing: 0.45,
    height: 2.4,
    build: "slim",
    skin: 0xe8c8b8,
    hair: { style: "braids", color: 0x161a26 },
    face: { mouth: "smirk", brows: "calm", eyes: 0x2a5a6a },
    top: { kind: "coat", color: 0x1f4a52, accent: 0x2a6068 },
    bottom: { kind: "trousers", color: 0x161a24 },
    shoes: 0x111116,
    scarf: 0x14161f,
    belt: 0x14161f,
    arms: ["back", [0.24, 1.45, 0.48]],
    delay: 0.8,
  });
  // Her dark hair over the crown (the figure's own cap sits too low and lets the scalp show).
  const RH = spy.headRadius;
  ball(RH * 1.04, 0x161a26, ...spy.at(0.03, spy.head[1] - S + RH * 0.14 - RH * 1.04, -RH * 0.15), { delay: 1.2 });
  const [hidden, offered] = spy.hands;
  box(0.24, 0.32, 0.04, 0xd8d0b8, hidden[0], hidden[1] - 0.16, hidden[2] - 0.04, { delay: 1.4, rotation: [0, 0.45, 0.3] });
  const dossier = box(0.3, 0.4, 0.06, 0x5a8a9a, offered[0], offered[1] - 0.2, offered[2] + 0.04, { delay: 1.4, rotation: [0, 0.45, -0.1] });
  decorate(dossier, new BoxGeometry(0.28, 0.02, 0.064), 0xe8e2d0, [[0.01, 0.3, 0], [0.01, 0.34, 0]]);
  decorate(dossier, new CylinderGeometry(0.05, 0.05, 0.02, 14).rotateX(Math.PI / 2), MAGENTA, [[0, 0.2, 0.035]]);
  const centre: Point = [offered[0], offered[1], offered[2] + 0.04];
  const seals: Group[] = [0, 1].map((k) =>
    add(new TorusGeometry(0.32, 0.016, 6, 40), k ? CYAN : MAGENTA, centre[0], centre[1] - 0.32, centre[2], { delay: 1.6 + k * 0.05, flat: true, noInk: true, rotation: [0, k * 1.6, 0] }),
  );
  seals.forEach((seal) => decorate(seal, new BoxGeometry(0.05, 0.05, 0.03), 0xffe0f0, [[0, 0.656, 0], [0.32, 0.336, 0], [-0.32, 0.336, 0], [0, 0.016, 0]]));

  tick((t) => {
    seals.forEach((seal, k) => (seal.rotation.y = k * 1.6 + t * (k ? -1.2 : 1.5)));
    // A train coming: its lights grow in the dark, again and again.
    const near = 1 + ((t * 0.25) % 1) * 1.5;
    headlights.forEach((mesh) => mesh.scale.set(near, near, 1));
    light.visible = Math.floor(t * 7) % 19 !== 5;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
