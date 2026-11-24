import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, Mesh, MeshBasicMaterial, TubeGeometry, Vector3, type Group } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Byline (P031): the vain hacker of the Compagnia in a server room, glowing panels circling her.
 * The one on her palm shows an account draining to nothing, coins float away, and across the
 * racks she has scrawled her flourish in neon. The price of no stealth at all: she smiles and
 * waves at the security camera filming her.
 */
export function byline(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const RACK = 0x151a2a;
  const HAIR = 0xff4f8b;
  const F = octagonBase(kit, 0x161824);
  const G = floor(kit, F, 0.06, 0x232838, 0x181c28, 0.45);

  // Three racks of servers, their lights blinking.
  const leds: MeshBasicMaterial[] = [];
  [-1.4, -0.75, -0.1].forEach((x, i) => {
    const rack = box(0.66, 2.45, 0.5, RACK, x, G, -1.3, { delay: 0.1 + i * 0.05 });
    decorate(rack, new BoxGeometry(0.56, 0.012, 0.01), 0x2a3248, Array.from({ length: 10 }, (_, k) => [0, 0.2 + k * 0.22, 0.252] as Point));
    const row = (color: number, shift: number) =>
      decorate(rack, new BoxGeometry(0.04, 0.03, 0.01), color, Array.from({ length: 18 }, (_, k) => [-0.22 + ((k * 3 + i + shift) % 6) * 0.08, 0.28 + Math.floor(k / 2) * 0.22, 0.256] as Point));
    leds.push(row(CYAN, 0), row(MAGENTA, 3));
  });
  // Her signature in neon across the racks: a flourish, no letters.
  const flourish = new CatmullRomCurve3(
    [
      [-1.5, 1.75],
      [-1.15, 2.2],
      [-0.95, 1.7],
      [-0.7, 2.15],
      [-0.5, 1.72],
      [-0.25, 2.05],
      [-0.05, 1.8],
      [0.35, 2.15],
      [0.2, 1.62],
      [-0.6, 1.55],
      [-1.35, 1.6],
    ].map(([x, y]) => new Vector3(x, G + y, -1.02)),
  );
  const scrawl = new TubeGeometry(flourish, 120, 0.028, 6).translate(1.5, -(G + 1.75), 1.02);
  scrawl.computeBoundingBox();
  add(scrawl, MAGENTA, -1.5, G + 1.75 + (scrawl.boundingBox?.min.y ?? 0), -1.02, { delay: 1.8, flat: true, noInk: true });

  // The security camera on its bracket, pointed at her, its light on.
  cylinder(0.04, 0.05, 2.6, 0x2a2f3e, 1.4, G, -1.0, { delay: 0.2 }, 8);
  box(0.35, 0.05, 0.05, 0x2a2f3e, 1.25, G + 2.5, -1.0, { delay: 0.24 });
  const camera = box(0.16, 0.16, 0.36, 0xd8dce4, 1.12, G + 2.38, -1.0, { delay: 0.3, rotation: [0.4, -0.55, 0] });
  camera.rotation.order = "YXZ";
  decorate(camera, new CylinderGeometry(0.055, 0.055, 0.04, 12).rotateX(Math.PI / 2), INK, [[0, 0.08, 0.19]]);
  const rec = decorate(camera, new BoxGeometry(0.04, 0.04, 0.01), MAGENTA, [[0.05, 0.13, 0.181]]);

  // Byline: pink undercut, black coat, a smirk, waving at the camera.
  const hacker = figure(kit, {
    x: 0.3,
    z: 0.4,
    y: G,
    facing: 0.5,
    height: 2.4,
    build: "slim",
    skin: 0xe6bfae,
    hair: { style: "short", color: HAIR },
    face: { mouth: "smirk", brows: "raised", eyes: 0x2a1a2a },
    top: { kind: "coat", color: 0x252c42, accent: 0x343e5a },
    bottom: { kind: "trousers", color: 0x15161d },
    shoes: 0x111116,
    arms: [[-0.48, 1.42, 0.45], "wave"],
    delay: 0.8,
  });
  // Her undercut, built here (the figure's own hair caps sit too low and let the scalp show):
  // a crown of pink hair swept over to her left, shaved on her right.
  const RH = hacker.headRadius;
  const crown = hacker.head[1] - G;
  ball(RH * 1.03, HAIR, ...hacker.at(0.04, crown + RH * 0.14 - RH * 1.03, -RH * 0.15), { delay: 1.2 });
  add(new CylinderGeometry(RH * 1.05, RH * 1.2, RH * 1.35, 14, 1, true, 0.85, Math.PI - 0.4), HAIR, ...hacker.at(0, crown + RH * 0.45 - RH * 1.35, -0.01), { delay: 1.22, rotation: [0, 0.5, 0] });
  const [palm] = hacker.hands;

  // Glowing panels: the one on her palm with the draining account, three more circling her.
  const glass = (part: Group, opacity: number) => {
    const material = (part.children[0] as Mesh).material as MeshBasicMaterial;
    material.transparent = true;
    material.opacity = opacity;
    material.depthWrite = false;
  };
  const held = box(0.48, 0.3, 0.012, CYAN, palm[0], palm[1] + 0.1, palm[2], { delay: 1.5, flat: true, noInk: true, rotation: [-0.3, 0.5, 0] });
  glass(held, 0.55);
  decorate(held, new BoxGeometry(0.4, 0.07, 0.012), 0x0b3d50, [[0, 0.18, 0.004]]);
  decorate(held, new BoxGeometry(0.4, 0.07, 0.014), YELLOW, [[0, 0.18, 0.006]]);
  const bar = held.children[held.children.length - 1];
  decorate(held, new BoxGeometry(0.3, 0.012, 0.012), 0xe8fbff, [[-0.03, 0.06, 0.006], [-0.06, 0.26, 0.006]]);
  const centre: Point = [hacker.at(0, 0, 0)[0], G, hacker.at(0, 0, 0)[2]];
  const orbit = [1.95, 3.5, -1.25].map((angle, i) => {
    const panel = box(0.5, 0.34, 0.012, i === 1 ? MAGENTA : CYAN, 0, G + 1.25 + i * 0.28, 0, { delay: 1.55 + i * 0.05, flat: true, noInk: true });
    glass(panel, 0.5);
    decorate(panel, new BoxGeometry(0.36, 0.014, 0.014), 0xf4f8ff, [[0, 0.1, 0.006], [-0.05, 0.17, 0.006], [0.04, 0.24, 0.006]]);
    decorate(panel, new BoxGeometry(0.42, 0.3, 0.004), i === 1 ? 0x5a1030 : 0x0b3d50, [[0, 0.17, -0.004]]);
    return { panel, angle };
  });
  motes(8, YELLOW, 0.035, [palm[0] - 0.2, palm[1] + 0.2, palm[2] - 0.1], [palm[0] + 0.3, palm[1] + 1.3, palm[2] + 0.2], 1.6);

  tick((t) => {
    for (const { panel, angle } of orbit) {
      const a = angle + t * 0.4;
      panel.position.set(centre[0] + Math.sin(a) * 0.95, panel.position.y, centre[2] + Math.cos(a) * 0.95);
      panel.rotation.y = 0.35 + Math.sin(a) * 0.5;
    }
    // The balance runs out, again and again.
    const left = 1 - ((t * 0.3 + 0.6) % 1);
    bar.scale.x = Math.max(0.02, left);
    bar.position.x = -0.2 * (1 - left);
    rec.color.setHex(Math.floor(t * 1.5) % 2 ? 0x4a1020 : MAGENTA);
    leds.forEach((led, k) => led.color.setHex(Math.floor(t * 3 + k * 0.7) % 3 !== 2 ? (k % 2 ? MAGENTA : CYAN) : 0x223044));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
