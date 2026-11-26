import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { MAGENTA, YELLOW, archMouth, archedWall, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { shade } from "@/lib/diorama-figure";
import { floor, pole, puddle, rubble } from "@/lib/diorama-props";

/**
 * Cunicolo (P286): the blind creature of the metro, a giant pale axolotl veined in blue with
 * magenta gills, clinging head down to the portal of a tunnel above the tracks. Its mouth is
 * open and the light of the lamps strung along the line flows into it in yellow streams: the
 * lamps go out one at a time, towards you. Not clever: it has torn one lamp down to eat it
 * whole, and holds it, dark, cable and all.
 */
export function cunicolo(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const BRICK = 0x3a3046;
  const SKIN = 0xcbbbe0;
  const VEIN = 0x3a5aa8;
  const F = octagonBase(kit, 0x1a1822);
  const G = floor(kit, F, 0.06, 0x24222c, 0x1a1820, 0);

  // The tracks: sleepers and two rails running out of the tunnel.
  for (let k = 0; k < 10; k++) box(1.15, 0.05, 0.14, 0x3e3028, 0, G, -1.5 + k * 0.38, { delay: 0.1 + k * 0.02 });
  [-0.36, 0.36].forEach((x) => box(0.06, 0.07, 3.7, 0x8a93a3, x, G + 0.05, 0.2, { delay: 0.3 }));

  // The portal: brick above, tiles below, the dark mouth.
  const Z = -1.4;
  const wall = add(archedWall(3.2, 2.8, 0.4, { x: 0, half: 0.8, spring: 0.85 }), BRICK, 0, G, Z, { delay: 0.15 });
  const front = 0.2 + 0.003;
  const tiles = (color: number, odd: number) =>
    decorate(
      wall,
      new BoxGeometry(0.15, 0.15, 0.01),
      color,
      Array.from({ length: 6 }, (_, row) => Array.from({ length: 4 }, (_, col) => [row, col])).flat().flatMap(([row, col]) =>
        (row + col) % 2 === odd ? [-1, 1].map((side) => [side * (0.95 + col * 0.17), 0.1 + row * 0.17, front] as Point) : [],
      ),
    );
  tiles(0x1f6f8a, 0);
  tiles(0x6a2a5a, 1);
  decorate(wall, new BoxGeometry(3.2, 0.025, 0.01), shade(BRICK, 0.65), [1.2, 1.5, 1.8, 2.1, 2.4, 2.7].map((y) => [0, y, front] as Point));
  add(archMouth(0.8, 0.85), 0x0c0b12, 0, G, Z - 0.1, { delay: 0.2, flat: true, noInk: true });

  // The lamps strung from the portal to a pole, out towards us.
  pole(kit, 1.75, 0.95, G, 0.3, 2.55, 0x3a3446);
  const A: Point = [0.55, G + 2.25, Z + 0.22];
  const B: Point = [1.75, G + 2.4, 0.95];
  const along = (s: number): Point => [A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s - 0.25 * Math.sin(Math.PI * s), A[2] + (B[2] - A[2]) * s];
  cable(kit, [A, along(0.25), along(0.5), along(0.75), B], 0.014, 0x23222b, 0.4);
  const head: Point = [0, G + 1.9, Z + 0.66];
  const lamps = [0.3, 0.58, 0.86].map((s, k) => {
    const at = along(s);
    box(0.014, 0.16, 0.014, 0x23222b, at[0], at[1] - 0.16, at[2], { delay: 0.5 + k * 0.05, noInk: true });
    add(new ConeGeometry(0.17, 0.14, 12), 0x4a6a6a, at[0], at[1] - 0.3, at[2], { delay: 0.52 + k * 0.05 });
    const bulb = ball(0.075, YELLOW, at[0], at[1] - 0.4, at[2], { delay: 0.55 + k * 0.05, flat: true });
    const bulbAt: Point = [at[0], at[1] - 0.34, at[2]];
    const stream = [0, 1, 2].map((j) => {
      const mid = new Vector3(...bulbAt).lerp(new Vector3(...head), 0.5).add(new Vector3((j - 1) * 0.12, 0.12 + j * 0.08, (j - 1) * 0.06));
      return cable(kit, [bulbAt, [mid.x, mid.y, mid.z], [head[0] + 0.12, head[1] - 0.1, head[2] + 0.2]], 0.018 - j * 0.004, j === 1 ? 0xfff2a0 : YELLOW, 1.8 + k * 0.05);
    });
    return { bulb, stream };
  });
  puddle(kit, -1.1, 0.9, G, 0.5, 0.45, YELLOW);
  rubble(kit, -1.25, 0.2, G, 0.55, 4, 0.3);

  // Cunicolo, head down on the portal: a pale veined body, stubby splayed legs, its tail along the top.
  const D = 0.9;
  const zf = Z + 0.2;
  const body = add(new SphereGeometry(0.36, 16, 12).scale(1, 1.5, 0.62), SKIN, 0, G + 1.98, zf + 0.22, { delay: D });
  decorate(body, new BoxGeometry(0.014, 0.3, 0.01), VEIN, [
    [-0.12, 0.45, 0.21, 0.4],
    [0.1, 0.7, 0.21, -0.3],
    [-0.05, 0.9, 0.2, 0.2],
    [0.16, 0.35, 0.19, -0.6],
  ]);
  limb(kit, [0, G + 2.85, zf + 0.15], [0.45, G + 2.98, Z - 0.05], 0.2, 0.14, SKIN, { delay: D + 0.1 });
  limb(kit, [0.45, G + 2.98, Z - 0.05], [1.1, G + 2.88, Z - 0.1], 0.14, 0.03, SKIN, { delay: D + 0.14 });
  const skull = add(new SphereGeometry(0.32, 18, 12).scale(1.3, 0.82, 0.95), SKIN, head[0], head[1] - 0.26, head[2], { delay: D + 0.06, rotation: [0, 0.4, 0] });
  decorate(skull, new BoxGeometry(0.014, 0.18, 0.01), VEIN, [
    [-0.2, 0.34, 0.25, 0.8],
    [0.18, 0.32, 0.26, -0.7],
    [0.02, 0.44, 0.22, 0.1],
  ]);
  decorate(skull, new CylinderGeometry(0.26, 0.26, 0.02, 22).scale(1, 1, 0.34).rotateX(1.87), 0x2a1020, [[0, 0.17, 0.285]]);
  const glow = decorate(skull, new CylinderGeometry(0.19, 0.19, 0.02, 20).scale(1, 1, 0.22).rotateX(1.87), YELLOW, [[0, 0.165, 0.3]]);
  // Gills: three magenta stalks a side, feathered.
  [-1, 1].forEach((side) =>
    [0.35, 0.85, 1.35].forEach((a, k) => {
      const base: Point = [side * 0.34, head[1] + 0.02 + k * 0.05, head[2] - 0.08];
      const tip: Point = [side * (0.34 + Math.cos(a - 0.5) * 0.5), head[1] + 0.06 + Math.sin(a) * 0.42, head[2] - 0.14 + k * 0.03];
      const stalk = limb(kit, base, tip, 0.04, 0.018, MAGENTA, { delay: D + 0.2 + k * 0.03 });
      decorate(stalk, new BoxGeometry(0.15, 0.014, 0.014), shade(MAGENTA, 1.25), [0.1, 0.18, 0.26, 0.34, 0.42].map((y, j) => [0, y, 0, j % 2 ? 0.6 : -0.6] as [number, number, number, number]));
    }),
  );
  // Short legs splayed on the wall, four pale fingers each.
  const hands: Point[] = [];
  [
    [-1, 2.2, -0.78, 1.92],
    [1, 2.2, 0.78, 1.92],
    [-1, 2.55, -0.74, 2.72],
    [1, 2.55, 0.74, 2.72],
  ].forEach(([side, y, hx, hy], i) => {
    const hip: Point = [side * 0.26, G + y, zf + 0.25];
    const knee: Point = [side * 0.52, G + (y + hy) / 2 + 0.04, zf + 0.24];
    const paw: Point = [hx, G + hy, zf + 0.1];
    limb(kit, hip, knee, 0.12, 0.1, SKIN, { delay: D + 0.12 + i * 0.03 });
    limb(kit, knee, paw, 0.1, 0.08, SKIN, { delay: D + 0.15 + i * 0.03 });
    hands.push(paw);
    [-0.5, -0.15, 0.2, 0.55].forEach((spread, j) => {
      const angle = Math.atan2(paw[1] - knee[1], paw[0] - knee[0]) + spread;
      limb(kit, paw, [paw[0] + Math.cos(angle) * 0.14, paw[1] + Math.sin(angle) * 0.14, paw[2] + 0.02], 0.03, 0.016, 0xe8b0c8, { delay: D + 0.2 + j * 0.01 });
    });
  });
  // The lamp it tore down to eat whole, dark, its cable still hanging.
  const grab = hands[0];
  add(new ConeGeometry(0.17, 0.14, 12), 0x4a6a6a, grab[0] - 0.08, grab[1] - 0.24, grab[2] + 0.12, { delay: D + 0.3, rotation: [0.3, 0, 0.5] });
  ball(0.075, 0x4a4a3a, grab[0] - 0.04, grab[1] - 0.36, grab[2] + 0.14, { delay: D + 0.32 });
  const dangling = new CatmullRomCurve3([new Vector3(grab[0], grab[1] - 0.05, grab[2] + 0.14), new Vector3(grab[0] - 0.25, grab[1] - 0.5, grab[2] + 0.22), new Vector3(grab[0] - 0.15, G + 0.75, zf + 0.3)]);
  cable(kit, dangling.getPoints(4).map((p) => [p.x, p.y, p.z] as Point), 0.014, 0x23222b, D + 0.35);
  add(new TorusGeometry(0.11, 0.018, 6, 14).rotateX(Math.PI / 2), 0x23222b, grab[0] + 0.2, grab[1] + 0.06, grab[2] + 0.08, { delay: D + 0.36, rotation: [0.2, 0, -0.9], noInk: true });

  tick((t) => {
    // The lamps go out one by one, nearest the mouth first, then all come back.
    const p = (t * 0.55) % 4;
    const out = Math.floor(p);
    lamps.forEach(({ bulb, stream }, k) => {
      bulb.visible = k >= out;
      stream.forEach((part) => (part.visible = k === out));
    });
    glow.color.setHex(out < 3 ? YELLOW : 0x6a5a20);
    skull.rotation.z = Math.sin(t * 0.8) * 0.05;
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
