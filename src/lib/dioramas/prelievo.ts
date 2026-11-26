import { BackSide, BoxGeometry, CatmullRomCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector3, type Group, type Material, type Mesh } from "three";
import { CYAN, MAGENTA, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Prelievo (P350): the Lete's director of research in his laboratory, thin and grey-haired in a
 * white lab coat over black, scars of light on his face and palm, holding out his open hand to a
 * masked hero strapped into a chair: threads of magenta and cyan light pull the glowing mark out
 * of the hero's chest and into his palm, beads of it running along them. Behind, specimen tubes
 * with sleeping shapes and rising bubbles; his aura breathes round him. The price: no strength,
 * no fighting, so the hero is strapped down before he dares to touch him.
 */
export function prelievo(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STEEL = 0x3a3f4e;
  const F = octagonBase(kit, 0x161824);
  const G = floor(kit, F, 0.06, 0x23283a, 0x1a2a3a, 0.5);
  /** See-through: a part's colour fades, its ink goes. */
  const ghostly = (part: Group, opacity: number) => {
    const material = (part.children[0] as Mesh).material as Material;
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
    part.children.slice(1).forEach((child) => (child.visible = false));
    return material;
  };

  // Specimen tubes round the back, each with a sleeping shape and bubbles.
  [
    [-1.45, -1.05],
    [-0.55, -1.55],
    [0.45, -1.6],
    [1.35, -1.15],
  ].forEach(([x, z], i) => {
    cylinder(0.33, 0.36, 0.25, STEEL, x, G, z, { delay: 0.1 + i * 0.04 }, 16);
    cylinder(0.1, 0.12, 0.85, 0x0e1c26, x, G + 0.4, z, { delay: 0.14 + i * 0.04 }, 10);
    ball(0.12, 0x0e1c26, x, G + 1.27, z, { delay: 0.15 + i * 0.04 });
    ghostly(cylinder(0.29, 0.29, 1.5, 0x22a8c8, x, G + 0.25, z, { delay: 0.18 + i * 0.04 }, 18), 0.42);
    cylinder(0.33, 0.33, 0.18, STEEL, x, G + 1.75, z, { delay: 0.22 + i * 0.04 }, 16);
    decorate(box(0.04, 0.5, 0.04, 0x23222b, x, G + 1.93, z, { delay: 0.25 }), new BoxGeometry(0.05, 0.05, 0.05), MAGENTA, [[0, 0.1, 0]]);
    motes(5, 0x9fefff, 0.022, [x - 0.18, G + 0.3, z], [x + 0.18, G + 1.7, z + 0.1], 0.6);
  });

  // The hero strapped into the reclining chair.
  const chairAt: Point = [-1.1, G, 0.6];
  const turn = 1.0;
  cylinder(0.12, 0.2, 0.42, STEEL, ...chairAt, { delay: 0.3 }, 10);
  const victim = figure(kit, {
    x: chairAt[0],
    z: chairAt[2],
    y: G,
    facing: turn,
    height: 2.3,
    skin: 0xc89070,
    hair: { style: "short", color: 0x6a3a20 },
    face: { mouth: "open", brows: "worried", mask: "eyes", maskColor: 0x1f6f9c },
    top: { kind: "shirt", color: 0x1f6f9c },
    bottom: { kind: "trousers", color: 0x1f3a5a },
    shoes: 0x2a2420,
    arms: [
      [-0.36, 0.98, 0.32],
      [0.36, 0.98, 0.32],
    ],
    legs: "sit",
    delay: 0.6,
  });
  const o = (delay: number, tilt = 0) => ({ delay, rotation: [tilt, turn, 0] as [number, number, number] });
  const seatY = 0.42;
  const seat = victim.at(0, seatY, 0.05);
  box(0.66, 0.1, 0.62, 0x5a6070, seat[0], seat[1], seat[2], o(0.34));
  box(0.66, 1.25, 0.1, 0x5a6070, ...victim.at(0, seatY + 0.08, -0.28), o(0.36, -0.12));
  [-1, 1].forEach((side) => {
    box(0.1, 0.06, 0.5, 0x4a5060, ...victim.at(side * 0.38, 0.86, 0.12), o(0.38));
    box(0.14, 0.05, 0.13, 0x16141a, ...victim.at(side * 0.37, 0.92, 0.3), o(0.9));
  });
  box(0.62, 0.08, 0.06, 0x16141a, ...victim.at(0, 0.8, 0.25), o(0.92));
  // His mark, glowing on his chest, fading as it is drawn out.
  const markAt = victim.at(0, 0.98, 0.26);
  const mark = add(new TorusGeometry(0.09, 0.025, 6, 20), MAGENTA, ...markAt, { ...o(1.2), flat: true, noInk: true });

  // Prelievo, palm held out towards him.
  const doctor = figure(kit, {
    x: 0.6,
    z: 0.15,
    y: G,
    facing: 0.05,
    height: 2.55,
    build: "slim",
    skin: 0xd8c4b4,
    hair: { style: "short", color: 0xa8acb4 },
    face: { mouth: "smirk", brows: "raised", marks: MAGENTA },
    top: { kind: "coat", color: 0xe4e8ec, accent: 0x16141c },
    bottom: { kind: "trousers", color: 0x16141c },
    shoes: 0x16141a,
    arms: [[-0.75, 1.7, 0.55], "down"],
    delay: 0.8,
  });
  const palm = doctor.hands[0];
  decorate(doctor.parts[13], new BoxGeometry(0.012, 0.09, 0.012), MAGENTA, [
    [-0.03, 0.09, 0.07, 0.4],
    [0.03, 0.1, 0.07, -0.3],
  ]);
  const glow = ball(0.07, 0xffd0ea, palm[0] - 0.08, palm[1] - 0.07, palm[2] + 0.04, { delay: 1.5, flat: true, noInk: true });

  // The threads of light from the hero's chest into the palm, beads running along them.
  const end = new Vector3(palm[0] - 0.08, palm[1], palm[2] + 0.04);
  const curves = [0, 1, 2].map((k) => {
    const start = new Vector3(...markAt).add(new Vector3(0.04, 0.09, 0.04));
    const mid = start.clone().lerp(end, 0.5).add(new Vector3(0, (k - 1) * 0.25, Math.sin(k * 2) * 0.15));
    const curve = new CatmullRomCurve3([start, start.clone().lerp(mid, 0.5).add(new Vector3(0, -0.06 * (k - 1), 0.05)), mid, mid.clone().lerp(end, 0.5).add(new Vector3(0, 0.05, -0.05)), end]);
    const tube = new TubeGeometry(curve, 28, 0.016, 5).translate(-start.x, -start.y, -start.z);
    tube.computeBoundingBox();
    add(tube, k === 1 ? CYAN : MAGENTA, start.x, start.y + (tube.boundingBox?.min.y ?? 0), start.z, { delay: 1.6 + k * 0.05, flat: true, noInk: true });
    return curve;
  });
  const beads = Array.from({ length: 6 }, (_, k) => ({ part: ball(0.035, k % 2 ? 0xbff4ff : 0xffb0d8, ...markAt, { delay: 1.8, flat: true, noInk: true }), curve: curves[k % 3], phase: k / 6 }));

  // His aura, breathing, and its specks rising.
  const aura = add(new SphereGeometry(1, 20, 14).scale(0.8, 1.55, 0.65), 0xff5ab0, 0.6, G + 0.02, 0.1, { delay: 0.5, flat: true, noInk: true });
  ghostly(aura, 0.2);
  ((aura.children[0] as Mesh).material as Material).side = BackSide;
  motes(12, 0xffb0d8, 0.025, [0.0, G + 0.3, -0.3], [1.2, G + 3.0, 0.5], 1.0);

  tick((t) => {
    (aura.children[0] as Mesh).scale.setScalar(1 + Math.sin(t * 1.4) * 0.04);
    beads.forEach(({ part, curve, phase }) => {
      const s = (t * 0.4 + phase) % 1;
      const p = curve.getPoint(s);
      part.position.set(p.x, p.y - 0.035, p.z);
    });
    const fade = 1 - ((t * 0.25) % 1) * 0.4;
    mark.children[0].scale.setScalar(fade);
    mark.position.y = markAt[1] + 0.115 * (1 - fade);
    const pulse = 1 + Math.sin(t * 5) * 0.2;
    glow.children[0].scale.setScalar(pulse);
    glow.position.y = palm[1] - 0.07 * pulse;
  });

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}
