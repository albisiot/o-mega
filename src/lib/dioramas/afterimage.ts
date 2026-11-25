import { BackSide, BoxGeometry, CylinderGeometry, SphereGeometry, type Group, type Material, type Mesh, type MeshBasicMaterial } from "three";
import { CYAN, INK, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, skyline } from "@/lib/diorama-props";

/**
 * Afterimage (P228): across the tar rooftops of the old town under a red moon, between chimney
 * stacks and a skylight, the Lanterne's runner sprints in her red trench coat and flip-visor
 * helmet. Her double, a see-through red echo of her, runs with her a beat ahead: every few
 * seconds it surges forward through her and fades, doing first what she is about to do.
 */
export function afterimage(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const RED = 0xc0183c;
  const ECHO = 0xff3a5a;
  const BRICK = 0x4a2a34;
  const F = octagonBase(kit, 0x1c1820);
  const G = floor(kit, F, 0.06, 0x24222c, 0x1a1820, 0.6);

  // The night behind: a red moon over the skyline.
  skyline(kit, -1.9, G, 0.08, [0x2a1e2a, 0x221a26, 0x2e2030], -1.6, 1.0);
  ball(0.3, 0xd02a40, -1.25, G + 3.3, -1.55, { delay: 0.2, flat: true, noInk: true });

  // Chimney stacks with their pots and an aerial, and a skylight glowing cyan.
  const stacks: [number, number, number][] = [
    [-1.45, -0.55, 0.75],
    [1.0, -1.25, 1.0],
  ];
  stacks.forEach(([x, z, h], i) => {
    const stack = box(0.42, h, 0.36, BRICK, x, G, z, { delay: 0.25 + i * 0.05, rotation: [0, 0.35, 0] });
    decorate(stack, new BoxGeometry(0.42, 0.015, 0.01), 0x2a161c, [
      [0, h * 0.33, 0.181],
      [0, h * 0.66, 0.181],
    ]);
    box(0.48, 0.06, 0.42, 0x5a3a44, x, G + h, z, { delay: 0.3 + i * 0.05, rotation: [0, 0.35, 0] });
    [-0.1, 0.1].forEach((dx, k) => cylinder(0.06, 0.07, 0.22 - k * 0.06, 0x6a3a40, x + dx, G + h + 0.06, z, { delay: 0.34 + i * 0.05 }, 10));
  });
  cylinder(0.015, 0.015, 0.8, INK, 1.1, G + 1.06, -1.25, { delay: 0.4, noInk: true }, 5);
  [0.55, 0.7].forEach((y, k) => box(0.5 - k * 0.15, 0.02, 0.02, INK, 1.1, G + 1.06 + y, -1.25, { delay: 0.42, noInk: true, rotation: [0, 0.6, 0] }));
  box(0.7, 0.22, 0.5, 0x3a3644, 1.35, G, 0.2, { delay: 0.3, rotation: [0, 0.35, 0] });
  const pane = box(0.6, 0.05, 0.4, 0x2a6a88, 1.35, G + 0.22, 0.2, { delay: 0.34, rotation: [0.25, 0.35, 0] });
  decorate(pane, new BoxGeometry(0.02, 0.01, 0.4), CYAN, [
    [-0.15, 0.05, 0],
    [0.15, 0.05, 0],
  ]);
  box(0.02, 0.35, 0.02, 0x8a8f9c, -0.6, G, -1.5, { delay: 0.3, noInk: true });

  // The runner, and her echo: the same woman built twice, the second a see-through red.
  const FACE = 0.9;
  const X = -0.25;
  const Z = 0.15;
  const runner = (x: number, z: number, lift: number, delay: number) => {
    const body = figure(kit, {
      x,
      z,
      y: G + lift,
      facing: FACE,
      height: 2.35,
      build: "slim",
      skin: 0xecd2bc,
      face: { mouth: "neutral", brows: "angry" },
      headwear: { kind: "helmet", color: RED, accent: 0x8a1028 },
      top: { kind: "coat", color: RED, accent: 0x14121c },
      bottom: { kind: "trousers", color: 0x1e1c22 },
      shoes: 0x14121c,
      gloves: 0x14121c,
      belt: 0x14121c,
      arms: [[-0.42, 1.15, -0.4], [0.2, 1.48, 0.62]],
      legs: "stride",
      delay,
    });
    const at = body.at;
    const RH = body.headRadius;
    const turn: Point = [0, FACE, 0];
    const hy = body.head[1] - G - lift;
    // The visor flipped up over the helmet, the ear cups, big shoulders and a silver buckle.
    const extras: Group[] = [
      add(new SphereGeometry(RH * 1.26, 16, 8, Math.PI / 2 - 1.15, 2.3, Math.PI * 0.1, Math.PI * 0.32), 0x6a0e22, ...at(0, hy + RH * 1.26 * Math.cos(Math.PI * 0.42), 0.02), { delay: delay + 0.5, rotation: turn }),
      ...[-1, 1].map((s) => add(new CylinderGeometry(0.07, 0.07, 0.06, 12).rotateZ(Math.PI / 2), 0xb8bcc8, ...at(s * RH * 1.12, hy - 0.06, 0), { delay: delay + 0.5, rotation: turn })),
      ...[-1, 1].map((s) => {
        const pad = box(0.26, 0.09, 0.24, RED, ...at(s * 0.32, 1.66, 0), { delay: delay + 0.2 });
        pad.rotation.order = "YXZ";
        pad.rotation.set(0, FACE, s * 0.4);
        return pad;
      }),
      box(0.12, 0.09, 0.03, 0xc8ccd4, ...at(0, 1.04, 0.24), { delay: delay + 0.25, rotation: turn }),
    ];
    return [...body.parts, ...extras];
  };
  const forward: Point = [Math.sin(FACE), 0, Math.cos(FACE)];
  const echo = runner(X - forward[0] * 0.5 - forward[2] * 0.35, Z - forward[2] * 0.5 + forward[0] * 0.35, 0.15, 0.6);
  const her = runner(X, Z, 0, 0.9);

  // The echo is lit, see-through and ink-less.
  const glass: Material[] = [];
  echo.forEach((part) =>
    part.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as MeshBasicMaterial;
      if (material.side === BackSide) {
        mesh.visible = false;
        return;
      }
      material.color.setHex(ECHO);
      material.transparent = true;
      material.opacity = 0.5;
      material.depthWrite = false;
      if (!glass.includes(material)) glass.push(material);
    }),
  );

  const herRest = her.map((part) => part.position.y);
  const echoRest = echo.map((part) => part.position.clone());
  tick((t) => {
    // Her running bounce; the echo bounces a beat earlier, and every three seconds it surges
    // ahead through her and fades.
    const bounce = (s: number) => Math.abs(Math.sin(s * 5)) * 0.04;
    her.forEach((part, i) => (part.position.y = herRest[i] + bounce(t)));
    const cycle = (t % 3) / 3;
    const surge = cycle < 0.3 ? 0 : ((cycle - 0.3) / 0.7) ** 1.5 * 1.2;
    echo.forEach((part, i) => {
      part.position.set(echoRest[i].x + forward[0] * surge, echoRest[i].y + bounce(t + 0.2), echoRest[i].z + forward[2] * surge);
    });
    const fade = cycle < 0.3 ? 0.5 : 0.5 * (1 - (cycle - 0.3) / 0.7);
    glass.forEach((material) => (material.opacity = fade));
  });

  return { width: 4.9, height: 4.4, lookY: 1.55 };
}
