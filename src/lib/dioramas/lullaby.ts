import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, SphereGeometry, TorusGeometry, TubeGeometry, Vector3, type Group } from "three";
import { INK, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Lullaby (P034): the recruiter of the Figli dell'Ultima on a little stage before a velvet
 * curtain, one finger raised with a violet spiral turning above it and a pocket watch swinging
 * from the other hand. A burly dock worker in a cap shuffles towards him with glowing eyes and
 * arms out, already convinced; the hypnotist who can't fight has found his muscle.
 */
export function lullaby(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const VELVET = 0x8a1640;
  const VIOLET = 0xb04cff;
  const HAIR = 0x7a788e;
  const F = octagonBase(kit, 0x1e1620);
  const G = floor(kit, F, 0.06, 0x4a3226, 0x2e1e18, 0.3);

  // The curtain: pleats of velvet, a fringed valance, gold tie-backs at the sides.
  for (let k = 0; k < 16; k++) {
    const x = -1.55 + k * 0.207;
    cylinder(0.11, 0.12, 2.75, k % 2 ? VELVET : 0x6e1034, x, G, -1.45 + (k % 2) * 0.05, { delay: 0.1 + k * 0.015, ink: 1.03 }, 10);
  }
  const valance = box(3.4, 0.4, 0.2, 0xa01c4c, 0, G + 2.6, -1.3, { delay: 0.35 });
  decorate(valance, new SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0xa01c4c, Array.from({ length: 16 }, (_, k) => [-1.6 + k * 0.213, 0.0, 0.05] as Point));
  decorate(valance, new BoxGeometry(3.4, 0.05, 0.01), YELLOW, [[0, 0.1, 0.101]]);

  // The stage's front edge, with footlights.
  const lip = box(2.4, 0.12, 0.2, 0x2e1e18, 0, G, 1.75, { delay: 0.3 });
  decorate(lip, new BoxGeometry(2.4, 0.03, 0.01), YELLOW, [[0, 0.1, 0.101]]);
  const footlights = [-0.9, -0.3, 0.3, 0.9].map((x, i) => add(new SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xfff0a0, x, G + 0.12, 1.75, { delay: 0.32 + i * 0.03, flat: true }));

  // Lullaby: slicked grey hair, grey suit, half-closed eyes and a thin smile.
  const hypnotist = figure(kit, {
    x: -0.45,
    z: 0.15,
    y: G,
    facing: 0.5,
    height: 2.5,
    build: "slim",
    skin: 0xd8c0b8,
    hair: { style: "short", color: HAIR },
    face: { mouth: "smirk", brows: "calm", eyes: 0x4a3a5a },
    top: { kind: "suit", color: 0x5c5a6e },
    bottom: { kind: "trousers", color: 0x4a4858 },
    shoes: 0x1a1820,
    arms: [[-0.4, 2.05, 0.32], [0.34, 1.62, 0.5]],
    delay: 0.8,
  });
  // His slicked silver hair (the figure's own cap sits too low and lets the scalp show).
  const RH = hypnotist.headRadius;
  ball(RH * 1.02, HAIR, ...hypnotist.at(0, hypnotist.head[1] - G + RH * 0.16 - RH * 1.02, -RH * 0.17), { delay: 1.2 });
  const [fingerHand, watchHand] = hypnotist.hands;
  cylinder(0.022, 0.028, 0.16, 0xd8c0b8, fingerHand[0], fingerHand[1] + 0.04, fingerHand[2], { delay: 1.3 }, 8);
  const tip: Point = [fingerHand[0], fingerHand[1] + 0.2, fingerHand[2]];
  // The spiral, widening as it rises from his fingertip.
  const turns: Vector3[] = [];
  for (let k = 0; k <= 90; k++) {
    const s = k / 90;
    const r = 0.02 + s * 0.26;
    turns.push(new Vector3(Math.cos(s * Math.PI * 7) * r, s * 0.95, Math.sin(s * Math.PI * 7) * r));
  }
  const spiral = add(new TubeGeometry(new CatmullRomCurve3(turns), 180, 0.02, 5), VIOLET, ...tip, { delay: 1.4, flat: true, noInk: true });
  const glow = ball(0.045, 0xe0b0ff, tip[0], tip[1] - 0.04, tip[2], { delay: 1.35, flat: true, noInk: true });
  // The pocket watch on its chain.
  const CHAIN = 0.36;
  const chain = cylinder(0.008, 0.008, CHAIN, YELLOW, watchHand[0], watchHand[1] - CHAIN, watchHand[2], { delay: 1.4, noInk: true }, 5);
  const watch = add(new CylinderGeometry(0.1, 0.1, 0.035, 18).rotateX(Math.PI / 2), YELLOW, watchHand[0], watchHand[1] - CHAIN - 0.2, watchHand[2], { delay: 1.45 });
  decorate(watch, new CylinderGeometry(0.08, 0.08, 0.01, 18).rotateX(Math.PI / 2), 0xf4ecd8, [[0, 0.1, 0.02]]);
  decorate(watch, new BoxGeometry(0.012, 0.06, 0.01), INK, [[0, 0.12, 0.026], [0.02, 0.09, 0.026, 1.2]]);

  // The recruit: a big docker in a cap, sleepwalking towards him with glowing eyes.
  const recruit = figure(kit, {
    x: 1.25,
    z: 0.2,
    y: G,
    facing: -0.45,
    height: 2.4,
    build: "broad",
    skin: 0xc89878,
    hair: { style: "short", color: 0x3a2a20 },
    face: { mouth: "open", brows: "none", eyes: VIOLET, glow: true, beard: "stubble", beardColor: 0x3a2a20 },
    headwear: { kind: "cap", color: 0x2f4a5a },
    top: { kind: "jacket", color: 0x5a4636, accent: 0x6e5844 },
    bottom: { kind: "trousers", color: 0x2a3040 },
    arms: ["forward", "forward"],
    legs: "stride",
    delay: 1.0,
  });

  // Spirals turning in his eyes.
  const R2 = recruit.headRadius;
  decorate(recruit.headPart, new TorusGeometry(0.05, 0.013, 6, 16, Math.PI * 1.6), VIOLET, [
    [-0.08, R2 * 1.06 + 0.03, R2 * 0.9 + 0.02],
    [0.08, R2 * 1.06 + 0.03, R2 * 0.9 + 0.02],
  ]);
  const spirals = recruit.headPart.children.slice(-2);

  const rest = recruit.parts.map((part) => [part.position.x, part.position.y, part.position.z]);
  const pivot = [watchHand[0], watchHand[1]];
  tick((t) => {
    spiral.rotation.y = -t * 2.2;
    glow.visible = Math.floor(t * 4) % 6 !== 5;
    // The watch swings from his fingers.
    const a = Math.sin(t * 2.4) * 0.5;
    chain.rotation.z = a;
    chain.position.set(pivot[0] + CHAIN * Math.sin(a), pivot[1] - CHAIN * Math.cos(a), watchHand[2]);
    watch.position.set(pivot[0] + (CHAIN + 0.2) * Math.sin(a), pivot[1] - (CHAIN + 0.2) * Math.cos(a), watchHand[2]);
    watch.rotation.z = a;
    // The recruit sways like a sleepwalker.
    const sway = Math.sin(t * 1.4) * 0.03;
    const bob = Math.abs(Math.sin(t * 1.4)) * 0.025;
    recruit.parts.forEach((part: Group, i) => part.position.set(rest[i][0] + sway, rest[i][1] + bob, rest[i][2]));
    footlights.forEach((light, i) => (light.visible = Math.floor(t * 3 + i * 1.7) % 11 !== 4));
    spirals.forEach((mesh) => (mesh.rotation.z = -t * 4));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
