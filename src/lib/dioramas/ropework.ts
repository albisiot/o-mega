import { CatmullRomCurve3, ConeGeometry, CylinderGeometry, DodecahedronGeometry, TorusGeometry, Vector3 } from "three";
import { MAGENTA, YELLOW, cable, jag, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure, type Figure, type FigureSpec } from "@/lib/diorama-figure";
import { column, facade, floor, rubble } from "@/lib/diorama-props";

/**
 * Ropework (P146): the Custodi's rescue team, roped together, picks its way up a street
 * wrecked by the tear: three climbers in quilted red suits and lamp helmets, rocks floating over
 * a broken palazzo and a snapped column. They don't talk: the leader tugs the rope twice, the
 * signal runs back knot by knot to the last, and the answer runs back to him.
 */
export function ropework(kit: Kit): Framing {
  const { add, box, cylinder, ball, tick } = kit;
  const SUIT = 0x9a2a3a;
  const QUILT = 0x6e1a2a;
  const HELMET = 0xd8d2c0;
  const DARK = 0x2a2a30;
  const STONE = 0x4a4f62;
  const F = octagonBase(kit, 0x1d1b28);
  const G = floor(kit, F, 0.06, 0x34303e, 0x221f2a, 0.5);

  // The wrecked street: a broken palazzo front, a snapped column, rubble, glowing cracks.
  facade(kit, 0.8, -1.45, G, 0.1, { width: 1.5, height: 2.5, color: 0x3a2f4e, windows: 2, floors: 3, lit: 0x9fd8ff });
  [
    [0.35, 2.45, 0.4, 0.3],
    [1.2, 2.4, 0.5, -0.4],
  ].forEach(([x, y, w, lean], i) => box(w, 0.3, 0.3, 0x3a2f4e, x, G + y, -1.45, { delay: 0.2 + i * 0.03, rotation: [0, 0, lean] }));
  box(0.7, 0.05, 0.3, 0x2a2430, 0.8, G + 1.2, -1.15, { delay: 0.25, rotation: [0, 0, -0.35] });
  column(kit, -0.5, -1.55, G, 0.2, 2.6, true, 0x6c8aa0);
  add(new CylinderGeometry(0.2, 0.2, 0.55, 10).rotateZ(Math.PI / 2), 0x6c8aa0, 1.45, G, 0.55, { delay: 0.3, rotation: [0, 0.6, 0] });
  cylinder(0.55, 0.75, 0.25, STONE, -0.45, G, -0.1, { delay: 0.3 }, 9);
  cylinder(0.4, 0.62, 0.5, STONE, -1.45, G, -0.7, { delay: 0.32 }, 9);
  rubble(kit, -1.0, 0.7, G, 0.35, 6, 0.5);
  rubble(kit, 1.5, -0.4, G, 0.4, 5, 0.4);
  [
    [[-0.2, G + 0.005, 1.6], [0.6, G + 0.005, 1.3]],
    [[1.3, G + 0.005, 1.2], [1.9, G + 0.005, 0.4]],
  ].forEach(([from, to], i) => zigzag(kit, jag(from as Point, to as Point, 5, 0.08, i + 2), 0.035, MAGENTA, 0.4));

  // Rocks hanging in the air of the tear, bobbing.
  const rocks = [
    [-1.0, 3.1, -1.3, 0.2],
    [0.2, 3.5, -1.0, 0.14],
    [1.55, 3.0, -0.3, 0.18],
    [1.7, 2.1, 0.8, 0.1],
    [-1.8, 2.3, 0.3, 0.12],
    [0.5, 2.9, 0.4, 0.08],
  ].map(([x, y, z, r], i) => add(new DodecahedronGeometry(r), i % 2 ? STONE : 0x5d6680, x, G + y, z, { delay: 0.5 + i * 0.04, rotation: [i, i * 2, 0] }));
  const rockRest = rocks.map((rock) => rock.position.y);

  /** A climber: quilted red suit, harness, a lamp helmet with its hooked crest. */
  const climber = (x: number, z: number, y: number, facing: number, height: number, delay: number, look: Partial<FigureSpec>): Figure => {
    const fig = figure(kit, {
      x,
      z,
      y,
      facing,
      height,
      skin: 0xd8a080,
      face: { mouth: "neutral", brows: "calm" },
      headwear: { kind: "helmet", color: HELMET, accent: DARK },
      top: { kind: "uniform", color: SUIT, accent: QUILT },
      bottom: { kind: "trousers", color: SUIT },
      shoes: DARK,
      gloves: DARK,
      belt: DARK,
      delay,
      ...look,
    });
    const u = height / 2.4;
    const R = fig.headRadius;
    const headY = fig.head[1] - y;
    [1.3, 1.5].forEach((h, i) =>
      add(new TorusGeometry((0.305 + i * 0.02) * u, 0.018, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.74), QUILT, ...fig.at(0, h * u, 0.01), {
        delay: delay + 0.4,
        flat: true,
        noInk: true,
        rotation: [0, facing, 0],
      }),
    );
    const [lx, ly, lz] = fig.at(0, headY + R * 0.7, R * 1.02);
    add(new CylinderGeometry(0.06, 0.06, 0.06, 12).rotateX(Math.PI / 2), YELLOW, lx, ly - 0.06, lz, { delay: delay + 0.5, flat: true, rotation: [0, facing, 0] });
    const crest = add(new ConeGeometry(0.05 * u, 0.38 * u, 6), 0xb83a4a, ...fig.at(0, headY + R * 1.05, -R * 0.2), { delay: delay + 0.52 });
    crest.rotation.order = "YXZ";
    crest.rotation.set(-0.55, facing, 0);
    return fig;
  };

  const lead = climber(0.6, 0.6, G, 0.35, 2.4, 0.8, {
    face: { mouth: "neutral", brows: "angry", beard: "stubble", beardColor: 0x3a2a22 },
    arms: [[-0.12, 1.2, 0.42], [0.22, 1.28, 0.3]],
    legs: "stride",
  });
  const second = climber(-0.45, -0.1, G + 0.25, 0.5, 2.25, 1.0, {
    skin: 0xc48a68,
    face: { mouth: "neutral", brows: "worried" },
    arms: [[-0.15, 1.15, 0.38], "down"],
  });
  const last = climber(-1.45, -0.7, G + 0.5, 0.6, 2.15, 1.2, {
    skin: 0xe0b090,
    face: { mouth: "open", brows: "raised" },
    arms: [[-0.12, 1.1, 0.36], "out"],
  });

  // The rope: through the leader's hands, tied at each belt, knots between.
  const belt = (fig: Figure, height: number): Point => fig.at(0.08, (1.05 * height) / 2.4, (0.3 * height) / 2.4);
  const [r1, l1] = lead.hands;
  const b2 = belt(second, 2.25);
  const b3 = belt(last, 2.15);
  const sag = (a: Point, b: Point, drop: number): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - drop, (a[2] + b[2]) / 2];
  const path: Point[] = [l1, r1, sag(r1, b2, 0.45), b2, second.hands[0], sag(second.hands[0], b3, 0.4), b3];
  cable(kit, path, 0.028, 0xc9a46a, 1.6);
  const curve = new CatmullRomCurve3(path.map((p) => new Vector3(...p)));
  [0.33, 0.48, 0.82].forEach((u, i) => {
    const p = curve.getPointAt(u);
    ball(i === 2 ? 0.06 : 0.045, i === 2 ? YELLOW : 0xc9a46a, p.x, p.y - 0.05, p.z, { delay: 1.7 + i * 0.04 });
  });
  const pulses = [0, 1, 2].map((k) => ball(0.05, YELLOW, ...path[0], { delay: 1.8 + k * 0.02, flat: true, noInk: true }));

  // The leader's two tugs: he leans back a touch with each.
  const leadRest = lead.parts.map((part) => part.position.clone());
  const back = new Vector3(-Math.sin(0.35), 0, -Math.cos(0.35));

  tick((t) => {
    rocks.forEach((rock, i) => {
      rock.position.y = rockRest[i] + Math.sin(t * 0.9 + i * 1.7) * 0.08;
      rock.rotation.y = i * 2 + t * 0.2 * (i % 2 ? 1 : -1);
    });
    // A five-second round: two pulses out to the last climber, one back.
    const c = t % 5;
    pulses.forEach((pulse, k) => {
      const out = k < 2;
      const start = out ? k * 0.35 : 2.6;
      const u = Math.min(1, Math.max(0, (c - start) / 1.6));
      const p = curve.getPointAt(out ? u : 1 - u);
      pulse.position.set(p.x, p.y - 0.05, p.z);
      pulse.visible = out ? c < start + 1.6 : c > start && c < start + 1.6;
    });
    const tug = (c < 0.2 ? Math.sin((c / 0.2) * Math.PI) : 0) + (c > 0.35 && c < 0.55 ? Math.sin(((c - 0.35) / 0.2) * Math.PI) : 0);
    lead.parts.forEach((part, i) => part.position.copy(leadRest[i]).addScaledVector(back, tug * 0.04));
  });

  return { width: 4.9, height: 4.6, lookY: 1.7 };
}
