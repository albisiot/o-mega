import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, TorusGeometry } from "three";
import { CYAN, INK, ORANGE, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { car, facade, floor, wallLantern } from "@/lib/diorama-props";

/**
 * Sextant (P097): the astronaut back from space in her white and orange armour hovers on boot
 * jets over a narrow old-town street, rocks from orbit drifting round her, her scorched re-entry
 * capsule swinging from one hand, looking for somewhere to put it. Every space is taken, the
 * only gap by a scooter; with no stealth at all, her jets have set off the hazard lights of
 * every parked car.
 */
export function sextant(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const ARMOUR = 0xe8e4dc;
  const LAMP = 0xffa630;
  const F = octagonBase(kit, 0x1f1d28);
  const G = floor(kit, F, 0.06, 0x3a3440, 0x2a2430, 0.3);

  // The street: house fronts on two sides, lanterns, cars parked bumper to bumper.
  facade(kit, 0.1, -1.65, G, 0.1, { width: 3.0, height: 2.6, color: 0x3a2f4e, windows: 4, floors: 3, depth: 0.2, lit: LAMP, door: true });
  const side = facade(kit, -1.8, -0.35, G, 0.15, { width: 2.0, height: 2.3, color: 0x2c3550, windows: 3, floors: 2, depth: 0.2, lit: LAMP, shutters: 0x5a2a4a });
  side.rotation.y = Math.PI / 2;
  const lantern = wallLantern(kit, 1.05, -1.55, G + 1.9, 0.3, LAMP);
  const hazards = [
    [-1.0, -0.95, 0, 0x3a4a7a],
    [1.3, -0.95, 0, 0x5a2a4a],
    [-1.2, 0.75, Math.PI / 2, 0x23707e],
  ].map(([x, z, facing, color], i) => {
    const [body] = car(kit, x, z, G, 0.3 + i * 0.08, color, facing);
    return decorate(body, new BoxGeometry(0.03, 0.05, 0.08), ORANGE, [
      [0.64, 0.24, 0.26],
      [0.64, 0.24, -0.26],
      [-0.64, 0.24, 0.26],
      [-0.64, 0.24, -0.26],
    ]);
  });
  // The only gap, taken by a scooter.
  const scooter = box(0.5, 0.22, 0.2, CYAN, 0.15, G + 0.1, -0.95, { delay: 0.5 });
  decorate(scooter, new BoxGeometry(0.22, 0.05, 0.16), INK, [[-0.08, 0.24, 0]]);
  [-0.2, 0.2].forEach((dx) => add(new CylinderGeometry(0.1, 0.1, 0.06, 12).rotateX(Math.PI / 2), INK, 0.15 + dx, G, -0.95, { delay: 0.52 }));
  box(0.05, 0.4, 0.05, CYAN, 0.38, G + 0.25, -0.95, { delay: 0.54, rotation: [0, 0, -0.2] });
  box(0.04, 0.04, 0.3, INK, 0.42, G + 0.64, -0.95, { delay: 0.56 });

  // Sextant, hovering, looking down at the street.
  const FACE = 0.3;
  const H = G + 0.8;
  const astronaut = figure(kit, {
    x: 0.15,
    z: 0.3,
    y: H,
    facing: FACE,
    height: 2.3,
    build: "normal",
    skin: 0xe8c0a0,
    hair: { style: "short", color: 0xe8c878 },
    face: { mouth: "neutral", brows: "calm" },
    top: { kind: "armor", color: ARMOUR, accent: ORANGE },
    bottom: { kind: "trousers", color: ARMOUR },
    shoes: ARMOUR,
    belt: 0x4a4f5c,
    gloves: 0x4a4f5c,
    arms: ["down", [0.5, 1.6, 0.6]],
    delay: 0.8,
  });
  const u = 2.3 / 2.4;
  const armour: Group[] = [];
  // Knee guards, boot cuffs and the jets under her soles.
  const flames = [-1, 1].flatMap((s, i) => {
    armour.push(ball(0.12, ORANGE, ...astronaut.at(s * 0.17 * u, 0.6 * u - 0.12, 0.08), { delay: 1.2 + i * 0.03 }));
    armour.push(cylinder(0.14, 0.15, 0.32, ARMOUR, ...astronaut.at(s * 0.17 * u, 0.06, 0.03), { delay: 1.22 + i * 0.03 }));
    const sole = astronaut.at(s * 0.17 * u, 0, 0.08);
    return [
      add(new ConeGeometry(0.09, 0.5, 8).rotateX(Math.PI), ORANGE, sole[0], sole[1] - 0.5, sole[2], { delay: 1.3, flat: true }),
      add(new ConeGeometry(0.045, 0.3, 8).rotateX(Math.PI), YELLOW, sole[0], sole[1] - 0.3, sole[2], { delay: 1.34, flat: true, noInk: true }),
    ];
  });
  // Her capsule, scorched from re-entry, swinging on its line from her right hand.
  const [hand] = astronaut.hands;
  const swing = new Group();
  const capsule = add(new CylinderGeometry(0.13, 0.36, 0.48, 16), 0xd8d2c4, 0, -0.78, 0, { delay: 1.4 });
  capsule.parent?.add(swing);
  swing.position.set(hand[0], hand[1] - 0.05, hand[2]);
  swing.add(capsule);
  decorate(capsule, new CylinderGeometry(0.06, 0.06, 0.01, 12).rotateX(Math.PI / 2), CYAN, [[0, 0.26, 0.27]]);
  decorate(capsule, new BoxGeometry(0.04, 0.2, 0.01), 0x4a3028, [
    [-0.15, 0.12, 0.29, 0.4],
    [0.2, 0.1, 0.27, -0.3],
  ]);
  swing.add(cylinder(0.38, 0.36, 0.08, 0x4a3028, 0, -0.86, 0, { delay: 1.42 }, 16));
  swing.add(cylinder(0.08, 0.13, 0.1, 0xb0a898, 0, -0.3, 0, { delay: 1.44 }, 12));
  swing.add(box(0.012, 0.22, 0.012, INK, 0, -0.22, 0, { delay: 1.46, noInk: true }));

  // Rocks from orbit drifting round her.
  const rocks = [
    [-0.95, 2.4, 0.2, 0.16],
    [-0.75, 3.3, -0.3, 0.1],
    [0.95, 3.1, 0.1, 0.13],
    [1.25, 2.2, 0.5, 0.09],
    [-0.4, 3.55, 0.4, 0.07],
    [0.6, 3.6, -0.4, 0.08],
    [-1.35, 1.6, 0.9, 0.08],
  ].map(([x, y, z, r], i) => ({
    rock: add(new DodecahedronGeometry(r), i % 2 ? 0x7a8698 : 0x5d6680, x, G + y, z, { delay: 1.5 + i * 0.04, rotation: [i, i * 2, 0] }),
    y: G + y,
    phase: i * 1.3,
  }));
  // Rings of heat round the jets' nozzles.
  [-1, 1].forEach((s) => armour.push(add(new TorusGeometry(0.1, 0.02, 6, 16).rotateX(Math.PI / 2), YELLOW, ...(astronaut.at(s * 0.17 * u, -0.02, 0.08) as Point), { delay: 1.32, flat: true, noInk: true })));

  const body = [...astronaut.parts, ...armour, ...flames];
  const rest = body.map((part) => part.position.y);
  const swingY = swing.position.y;
  tick((t) => {
    // She bobs on her jets; the capsule swings; the cars' lights blink; the rocks drift.
    const bob = Math.sin(t * 1.6) * 0.05;
    body.forEach((part, i) => (part.position.y = rest[i] + bob));
    swing.position.y = swingY + bob;
    swing.rotation.z = Math.sin(t * 1.6 - 0.8) * 0.12;
    swing.rotation.x = Math.sin(t * 1.1) * 0.06;
    flames.forEach((flame, i) => (flame.children[0].scale.y = 1 + Math.sin(t * 30 + i) * 0.15));
    const blink = Math.floor(t * 2.5) % 2 === 0 ? ORANGE : 0x4a2a10;
    hazards.forEach((material) => material.color.set(blink));
    for (const { rock, y, phase } of rocks) {
      rock.position.y = y + Math.sin(t * 0.7 + phase) * 0.06;
      rock.rotation.y = phase + t * 0.3;
    }
    lantern.visible = Math.floor(t * 5) % 19 !== 7;
  });

  return { width: 4.9, height: 4.6, lookY: 1.8 };
}
