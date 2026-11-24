import { BoxGeometry, ConeGeometry, TorusGeometry, type Mesh } from "three";
import { CYAN, INK, MAGENTA, ORANGE, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Erasure (P159): the State's anchorwoman at her news desk, in a black high-collared dress with
 * pointed shoulders, hands folded, headset on, the wall of monitors behind her hissing with
 * static. On the big screen is yesterday: a ship burning in the harbour. A magenta glitch sweeps
 * across it and the fire is gone, while rings of her voice roll out of the studio into everyone's
 * memory. She could not throw a punch, and she never needs to.
 */
export function erasure(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const WALL = 0x2a1820;
  const FRAME = 0x1e1e26;
  const DRESS = 0x1a1820;
  const F = octagonBase(kit, 0x1d1820);
  const G = floor(kit, F, 0.06, 0x241c26, 0x18141c, 0.5);

  // The studio's back wall with its magenta light strips.
  const wall = box(2.9, 2.5, 0.12, WALL, -0.15, G, -1.55, { delay: 0.1, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.05, 2.3, 0.01), MAGENTA, [
    [-1.38, 1.2, 0.061],
    [1.38, 1.2, 0.061],
  ]);
  decorate(wall, new BoxGeometry(2.7, 0.04, 0.01), MAGENTA, [[0, 0.25, 0.061]]);

  // The wall of monitors, all static.
  const fizz: Mesh[][] = [[], []];
  [-1.3, -0.72].forEach((x, c) =>
    [0.45, 1.0, 1.55].forEach((y, r) => {
      const monitor = box(0.56, 0.46, 0.22, FRAME, x, G + y, -1.38, { delay: 0.2 + (c * 3 + r) * 0.03 });
      decorate(monitor, new BoxGeometry(0.48, 0.38, 0.01), 0x5a5a6a, [[0, 0.23, 0.111]]);
      decorate(monitor, new BoxGeometry(0.04, 0.03, 0.01), MAGENTA, [[0.2, 0.03, 0.111]]);
      [0, 1].forEach((set) => {
        const spots: Point[] = Array.from({ length: 6 }, (_, k) => {
          const n = Math.sin((c * 3 + r) * 12.9 + k * 7.7 + set * 3.1) * 43758.5;
          const v = n - Math.floor(n);
          return [-0.18 + ((k * 0.37 + v) % 1) * 0.36, 0.08 + ((k * 0.61 + v * 1.7) % 1) * 0.3, 0.117];
        });
        decorate(monitor, new BoxGeometry(0.09, 0.018, 0.005), 0xd8d8e4, spots);
        fizz[set].push(...(monitor.children.slice(-6) as Mesh[]));
      });
    }),
  );

  // The big screen: yesterday's news, a ship on fire in the harbour.
  const screen = box(1.15, 0.8, 0.08, FRAME, 0.6, G + 1.1, -1.46, { delay: 0.35 });
  decorate(screen, new BoxGeometry(1.05, 0.7, 0.01), 0x1a2a44, [[0, 0.4, 0.041]]);
  decorate(screen, new BoxGeometry(1.05, 0.22, 0.01), 0x1f6f9c, [[0, 0.16, 0.043]]);
  decorate(screen, new BoxGeometry(0.5, 0.1, 0.01), 0x4a5060, [[0, 0.3, 0.046]]);
  decorate(screen, new BoxGeometry(0.16, 0.14, 0.01), 0x4a5060, [[-0.05, 0.42, 0.046]]);
  decorate(screen, new BoxGeometry(0.2, 0.03, 0.01), CYAN, [[0.32, 0.6, 0.044]]);
  decorate(screen, new ConeGeometry(0.07, 0.24, 6), ORANGE, [
    [-0.12, 0.54, 0.048],
    [0.06, 0.58, 0.048],
    [0.18, 0.5, 0.048],
  ]);
  const fire = screen.children.slice(-3) as Mesh[];
  const glitch = box(0.05, 0.74, 0.02, MAGENTA, 0.6, G + 1.13, -1.4, { delay: 0.5, flat: true, noInk: true });

  // The news desk, her chair behind it.
  const theta = 0.3;
  const anchor = figure(kit, {
    x: -0.05,
    z: -0.15,
    y: G,
    facing: theta,
    height: 2.3,
    build: "slim",
    skin: 0xd8a888,
    hair: { style: "curly", color: 0x2a1a1c },
    face: { mouth: "neutral", brows: "calm" },
    top: { kind: "dress", color: DRESS },
    scarf: DRESS,
    shoes: 0x14121c,
    arms: [
      [-0.06, 1.0, 0.5],
      [0.06, 1.0, 0.52],
    ],
    legs: "sit",
    delay: 0.9,
  });
  const at = anchor.at;
  const turn: Point = [0, theta, 0];
  box(0.6, 1.05, 0.1, 0x3a1a26, ...at(0, 0.5, -0.32), { delay: 0.6, rotation: turn });
  box(0.55, 0.12, 0.5, 0x3a1a26, ...at(0, 0.5, 0.05), { delay: 0.62, rotation: turn });
  const desk = box(1.8, 0.95, 0.56, 0x15131b, ...at(0, 0, 0.66), { delay: 0.7, rotation: turn });
  decorate(desk, new BoxGeometry(1.8, 0.06, 0.01), MAGENTA, [[0, 0.62, 0.281]]);
  decorate(desk, new BoxGeometry(1.8, 0.015, 0.01), CYAN, [[0, 0.5, 0.281]]);
  const top = box(1.9, 0.05, 0.66, 0x2e2a36, ...at(0, 0.95, 0.64), { delay: 0.74, rotation: turn });
  decorate(top, new BoxGeometry(0.3, 0.01, 0.22), 0xe8e4da, [
    [-0.42, 0.055, 0.05],
    [-0.38, 0.06, 0.08],
  ]);
  cylinder(0.04, 0.035, 0.13, 0xbfe8f0, ...at(0.6, 1.0, 0.7), { delay: 0.8 }, 10);

  // Pointed shoulders, and the headset's microphone at her cheek.
  [-1, 1].forEach((side) => {
    const pad = box(0.28, 0.1, 0.24, DRESS, ...at(side * 0.34, 1.27, 0), { delay: 1.3 });
    pad.rotation.order = "YXZ";
    pad.rotation.set(0, theta, side * 0.45);
  });
  const ear = at(-0.2, 1.64, 0.02);
  const lip = at(-0.07, 1.55, 0.19);
  limb(kit, ear, lip, 0.01, 0.01, INK, { delay: 1.4, noInk: true });
  cylinder(0.025, 0.025, 0.04, INK, lip[0], lip[1] - 0.02, lip[2], { delay: 1.42 }, 8);

  // The rings of her voice, rolling out of the studio and into the city's memory.
  const head = anchor.head;
  const R = 0.3;
  const rings = [0, 1].map((i) =>
    add(new TorusGeometry(R, 0.012, 6, 36), MAGENTA, head[0], head[1] - R, head[2], { delay: 1.6 + i * 0.1, flat: true, noInk: true, rotation: turn }),
  );

  tick((t) => {
    // Static boils on the monitors.
    const flip = Math.floor(t * 10) % 2;
    fizz.forEach((set, k) => set.forEach((mesh) => (mesh.visible = k === flip || k === 0)));
    // A glitch sweeps the big screen; once it has passed, the fire was never there.
    const p = (t * 0.25) % 1;
    glitch.position.x = 0.6 + (p * 1.6 - 0.8) * 0.65;
    glitch.visible = p > 0.25 && p < 0.75;
    fire.forEach((mesh) => (mesh.visible = p < 0.5));
    // Her voice goes out in widening rings.
    rings.forEach((ring, i) => {
      const u = (t * 0.45 + i * 0.5) % 1;
      const s = 0.7 + u * 2.4;
      const mesh = ring.children[0];
      mesh.scale.setScalar(s);
      mesh.position.y = R * (1 - s);
      ring.position.x = head[0] + Math.sin(theta) * u * 1.3;
      ring.position.z = head[2] + Math.cos(theta) * u * 1.3;
      ring.visible = u < 0.85;
    });
  });

  return { width: 4.9, height: 4.2, lookY: 1.3 };
}
