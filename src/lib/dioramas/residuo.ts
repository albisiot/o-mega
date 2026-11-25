import { BoxGeometry, CircleGeometry, CylinderGeometry, Group, TorusGeometry, type Material, type Mesh } from "three";
import { CYAN, INK, MAGENTA, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor, puddle } from "@/lib/diorama-props";

/**
 * Residuo (P227): outside a branch of the Banco at night, under its barred, lit teller window, the
 * guarantee collector stands in his long grey coat, a client's ledger clutched to his chest and
 * the brass ring of keys at his belt. A client in red cowers behind him. A great red blade of bad
 * luck swings down out of the dark again and again, and he takes every blow on his shoulder,
 * shards flying, without a step back. The cash machine in the wall is dead: it was never his.
 */
export function residuo(kit: Kit): Framing {
  const { add, box, ball, decorate, tick } = kit;
  const COAT = 0x3a3c46;
  const RED = 0xd0203a;
  const BRASS = 0xd8b040;
  const F = octagonBase(kit, 0x1e1a22);
  const G = floor(kit, F, 0.06, 0x2e2c36, 0x22202a, 0.6);
  puddle(kit, 0.9, 1.25, G, 0.3, 0.4, YELLOW);

  // The Banco's wall: a cornice, the barred teller window lit from inside with a clerk's
  // silhouette, and a dead cash machine.
  const wall = box(3.3, 2.9, 0.26, 0x34303e, -0.2, G, -1.3, { delay: 0.1, ink: 1.02 });
  box(3.4, 0.14, 0.4, 0x46404e, -0.2, G + 2.6, -1.25, { delay: 0.14 });
  box(3.4, 0.22, 0.34, 0x2a2632, -0.2, G, -1.22, { delay: 0.12 });
  const front = 0.131;
  decorate(wall, new BoxGeometry(1.05, 1.25, 0.01), 0x14121c, [[-0.75, 1.55, front]]);
  decorate(wall, new BoxGeometry(0.95, 1.15, 0.01), YELLOW, [[-0.75, 1.55, front + 0.003]]);
  decorate(wall, new CircleGeometry(0.15, 16), 0x5a4020, [[-0.62, 1.62, front + 0.006]]);
  decorate(wall, new BoxGeometry(0.4, 0.3, 0.01), 0x5a4020, [[-0.62, 1.15, front + 0.006]]);
  decorate(
    wall,
    new BoxGeometry(0.03, 1.15, 0.02),
    0x14121c,
    [-0.33, -0.19, -0.05, 0.09, 0.23, 0.37].map((dx) => [-0.75 + dx, 1.55, front + 0.012] as Point),
  );
  decorate(wall, new TorusGeometry(0.2, 0.025, 6, 20), 0x14121c, [[-0.75, 1.9, front + 0.014]]);
  decorate(wall, new BoxGeometry(0.5, 0.75, 0.01), 0x4a4652, [[1.0, 1.25, front]]);
  decorate(wall, new BoxGeometry(0.36, 0.26, 0.01), 0x0e1a24, [[1.0, 1.4, front + 0.004]]);
  decorate(wall, new BoxGeometry(0.3, 0.02, 0.01), MAGENTA, [
    [1.0, 1.43, front + 0.008, 0.5],
    [1.0, 1.43, front + 0.009, -0.5],
  ]);
  decorate(wall, new BoxGeometry(0.16, 0.025, 0.01), INK, [[1.0, 1.12, front + 0.006]]);
  decorate(wall, new BoxGeometry(0.1, 0.07, 0.01), CYAN, [[1.0, 1.08, front + 0.008]]);

  // Residuo: broad, square-jawed, unmoved.
  const FACE = 0.3;
  const H = 2.6;
  const u = H / 2.4;
  const collector = figure(kit, {
    x: 0.2,
    z: 0.35,
    y: G,
    facing: FACE,
    height: H,
    build: "broad",
    skin: 0xd8a080,
    hair: { style: "short", color: 0x3a2a20 },
    face: { mouth: "neutral", brows: "calm" },
    top: { kind: "coat", color: COAT, accent: 0xe8e4da },
    bottom: { kind: "trousers", color: 0x2a2c34 },
    shoes: 0x1a1818,
    belt: 0x24222a,
    arms: ["crossed", "down"],
    delay: 0.8,
  });
  const at = collector.at;
  const extra = [
    box(0.06, 0.32, 0.02, 0x1e2028, ...at(0, 1.6 * u, 0.3 * u), { delay: 1.15, rotation: [0.05, FACE, 0], noInk: true }),
    box(0.42, 0.54, 0.09, 0x7a3a2a, ...at(0.05, 1.18 * u, 0.4 * u), { delay: 1.3, rotation: [0.1, FACE, 0.18] }),
  ];
  decorate(extra[1], new BoxGeometry(0.04, 0.48, 0.07), 0xe8e0c8, [[0.2, 0.27, 0]]);
  decorate(extra[1], new BoxGeometry(0.12, 0.08, 0.01), 0xe8e0c8, [
    [0.16, 0.5, 0.05, 0.3],
    [0.12, 0.47, 0.05, -0.2],
  ]);
  const keys = add(new TorusGeometry(0.08, 0.016, 6, 16), BRASS, ...at(0.2, 0.86 * u, 0.36 * u), { delay: 1.4, rotation: [0, FACE, 0] });
  decorate(
    keys,
    new BoxGeometry(0.035, 0.14, 0.012),
    BRASS,
    [-0.06, -0.03, 0, 0.03, 0.06].map((dx, k) => [dx, -0.05 - (k % 2) * 0.02, 0.01, dx * 2] as [number, number, number, number]),
  );
  extra.push(keys);

  // The client in red, clinging behind his right arm.
  const behind = at(-0.85, 0, -0.5);
  const client = figure(kit, {
    x: behind[0],
    z: behind[2],
    y: G,
    facing: FACE + 0.25,
    height: 2.05,
    build: "slim",
    skin: 0xecc4a4,
    hair: { style: "curly", color: 0x8a4a2a },
    face: { mouth: "open", brows: "worried" },
    headwear: { kind: "hat", color: 0x8a1e2e, accent: 0x6a1422 },
    top: { kind: "coat", color: 0x7a1e2a, accent: 0x5a141e },
    bottom: { kind: "trousers", color: 0x3a1a22 },
    arms: [[-0.05, 1.3, 0.45], [0.3, 1.42, 0.42]],
    delay: 1.0,
  });

  // The blade of bad luck, hanging from a pivot up in the dark and swinging down on his shoulder.
  const shoulder = at(0.54 * u, 1.72 * u, 0);
  const P = at(1.45, 3.4, 0.12);
  const reach: Point = [0.54 * u - 1.45, 1.72 * u - 3.4, 0];
  const L = Math.hypot(reach[0], reach[1]) + 0.06;
  const HIT = Math.atan2(reach[0], -reach[1]);
  const UP = HIT + 1.7;
  const pivot = new Group();
  pivot.position.set(...P);
  pivot.rotation.order = "YXZ";
  const blade = add(new CylinderGeometry(0.05, 0.26, L, 4).scale(1, 1, 0.16), RED, 0.05, -L, 0, { delay: 1.6, flat: true, noInk: true });
  decorate(blade, new CylinderGeometry(0.02, 0.1, L * 0.96, 4).scale(1, 1, 0.5), 0xff8090, [[-0.06, L * 0.48, 0]]);
  const glass = (blade.children[0] as Mesh).material as Material;
  glass.transparent = true;
  glass.opacity = 0.8;
  blade.parent?.add(pivot);
  pivot.add(blade);
  const glow = ball(0.17, RED, shoulder[0], shoulder[1] - 0.17, shoulder[2] + 0.08, { delay: 1.7, flat: true, noInk: true });
  const shards = Array.from({ length: 9 }, (_, k) => {
    const a = -0.4 + k * 0.5;
    const dir: Point = [Math.cos(a) * 0.9, Math.abs(Math.sin(a)) * 0.6 + 0.2, Math.sin(k * 2.3) * 0.6];
    return { part: box(0.07, 0.07, 0.025, k % 3 ? RED : 0xff7080, ...shoulder, { delay: 1.75, flat: true, noInk: true, rotation: [k, k * 0.7, k * 1.3] }), dir };
  });

  const restC = [...collector.parts, ...extra].map((part) => part.position.y);
  const restW = client.parts.map((part) => part.position.y);
  tick((t) => {
    // A blow every four seconds: it lands, holds, rises slowly and falls again.
    const p = (t / 4 + 0.1) % 1;
    const ease = (x: number) => x * x * (3 - 2 * x);
    const angle = p < 0.25 ? HIT : p < 0.8 ? HIT + (UP - HIT) * ease((p - 0.25) / 0.55) : UP + (HIT - UP) * ((p - 0.8) / 0.2) ** 2;
    pivot.rotation.set(0, FACE, angle);
    const burst = p < 0.25 ? p / 0.25 : 1;
    shards.forEach(({ part, dir }) => {
      part.position.set(shoulder[0] + dir[0] * burst, shoulder[1] + dir[1] * burst - burst * burst * 0.4, shoulder[2] + 0.1 + dir[2] * burst);
      part.visible = p < 0.24;
    });
    glow.visible = p < 0.18;
    // He gives a little under the blow, then stands straight; she ducks.
    const jolt = p < 0.25 ? Math.sin((p / 0.25) * Math.PI) * 0.04 : 0;
    [...collector.parts, ...extra].forEach((part, i) => (part.position.y = restC[i] - jolt));
    client.parts.forEach((part, i) => (part.position.y = restW[i] - jolt * 1.5));
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
