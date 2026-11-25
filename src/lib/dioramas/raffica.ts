import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Quaternion, TorusGeometry, Vector3 } from "three";
import { YELLOW, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, floor } from "@/lib/diorama-props";

/**
 * Raffica (P233): the border-world gunner on lookout at the top of the harbour tower. Behind the
 * battlements, in ear defenders and a quilted jacket, he holds the grips of a twin-barrelled
 * turret firing at the sky, the barrels kicking in turn while spent brass rolls round his boots.
 * The one time he ran out of shots shows: an empty ammo box kicked over in a corner, and a wall
 * of full ones stacked behind him so it never happens again.
 */
export function raffica(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const STONE = 0x4e5268;
  const STONE_LIGHT = 0x5e6680;
  const GUN = 0x343c52;
  const OLIVE = 0x4a5a3a;
  const BRASS = 0xc9a040;
  const F = octagonBase(kit, 0x2c2a3c);
  const G = floor(kit, F, 0.06, 0x464a5e, 0x2e3142, 0.55);

  // Battlements round the back of the tower top, and the stair turret with its lit door.
  [Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2].forEach((b, i) => {
    const [nx, nz] = [Math.sin(b), Math.cos(b)];
    box(1.66, 0.5, 0.24, STONE, nx * 2.0, G, nz * 2.0, { delay: 0.1 + i * 0.03, rotation: [0, b, 0], ink: 1.02 });
    [-0.55, 0, 0.55].forEach((t, k) =>
      box(0.36, 0.3, 0.28, STONE_LIGHT, nx * 2.0 + t * Math.cos(b), G + 0.5, nz * 2.0 - t * Math.sin(b), { delay: 0.2 + i * 0.03 + k * 0.01, rotation: [0, b, 0] }),
    );
  });
  const stair = cylinder(0.42, 0.44, 1.4, STONE, -1.55, G, -0.2, { delay: 0.3 }, 16);
  decorate(stair, new BoxGeometry(0.3, 0.62, 0.02), 0x14121c, [[0, 0.31, 0.43]]);
  decorate(stair, new BoxGeometry(0.07, 0.5, 0.02), YELLOW, [[0, 0.3, 0.435]]);
  decorate(stair, new BoxGeometry(0.06, 0.16, 0.02), 0x14121c, [[0.2, 1.05, 0.39, 0]]);
  add(new ConeGeometry(0.56, 0.62, 16), 0x5a2a4a, -1.55, G + 1.4, -0.2, { delay: 0.36 });

  // The wall of full ammo boxes, and the empty one, tipped over, its lid on the floor.
  const stack: [number, number, number][] = [
    [0.8, -1.35, 0],
    [1.15, -1.0, 0],
    [1.5, -0.65, 0],
    [0.97, -1.17, 1],
    [1.33, -0.82, 1],
    [1.15, -1.0, 2],
  ];
  stack.forEach(([x, z, row], i) => {
    const ammo = crate(kit, x, z, G + row * 0.42, 0.4 + i * 0.03, 0.42, OLIVE, Math.PI / 4);
    decorate(ammo, new BoxGeometry(0.43, 0.05, 0.43), YELLOW, [[0, 0.33, 0]]);
  });
  const empty = box(0.42, 0.42, 0.42, OLIVE, -1.2, G, 0.95, { delay: 0.6, rotation: [0, 0.5, 0] });
  decorate(empty, new BoxGeometry(0.34, 0.34, 0.01), 0x14121c, [[0, 0.21, 0.212]]);
  box(0.44, 0.04, 0.44, OLIVE, -0.7, G, 1.3, { delay: 0.64, rotation: [0, 1.1, 0] });

  // Raffica: ear defenders, a quilted olive jacket, both hands on the grips.
  const gunner = figure(kit, {
    x: -0.45,
    z: 0.25,
    y: G,
    facing: 0.5,
    height: 2.45,
    build: "broad",
    skin: 0xd8a888,
    hair: { style: "short", color: 0x5a3a28 },
    face: { mouth: "neutral", brows: "calm", marks: 0xb07858 },
    top: { kind: "jacket", color: 0x4e6a48, accent: 0x3e5638 },
    bottom: { kind: "trousers", color: 0x2e3440 },
    shoes: 0x23222b,
    gloves: 0x2a2a2e,
    scarf: 0x2a2f3a,
    arms: [
      [0.08, 1.34, 0.56],
      [0.44, 1.4, 0.48],
    ],
    delay: 0.9,
  });
  const RH = gunner.headRadius;
  const headY = gunner.head[1];
  [-1, 1].forEach((side, i) =>
    add(new CylinderGeometry(0.1, 0.1, 0.09, 14).rotateZ(Math.PI / 2), 0x2a3040, ...gunner.at(side * (RH + 0.04), headY - G - 0.1, 0), { delay: 1.45 + i * 0.02, rotation: [0, 0.5, 0] }),
  );
  add(new TorusGeometry(RH + 0.06, 0.025, 6, 16, Math.PI), 0x2a3040, ...gunner.at(0, headY - G - 0.025, 0), { delay: 1.5, rotation: [0, 0.5, 0] });

  // The turret: a pedestal, and the gun built pointing up, then turned towards the sky.
  const pivot = new Vector3(...gunner.at(0.32, 1.3, 0.98));
  const aimAt = new Vector3(...gunner.at(1.12, 2.0, 1.28));
  const direction = aimAt.clone().sub(pivot).normalize();
  cylinder(0.16, 0.3, pivot.y - 0.15 - G, GUN, pivot.x, G, pivot.z, { delay: 0.7 }, 14);
  cylinder(0.36, 0.36, 0.08, 0x23222b, pivot.x, G, pivot.z, { delay: 0.68 }, 16);
  const gunParts: Group[] = [ball(0.17, 0x23222b, pivot.x, pivot.y - 0.17, pivot.z, { delay: 0.74 })];
  const body = box(0.42, 0.75, 0.38, GUN, pivot.x, pivot.y - 0.3, pivot.z, { delay: 0.78 });
  decorate(body, new BoxGeometry(0.02, 0.5, 0.3), 0x23222b, [
    [-0.215, 0.4, 0],
    [0.215, 0.4, 0],
  ]);
  gunParts.push(body, box(0.18, 0.36, 0.3, 0x3a4a34, pivot.x - 0.3, pivot.y - 0.2, pivot.z, { delay: 0.8 }));
  const barrels = [-0.1, 0.1].map((dx, k) => {
    const parts = [
      cylinder(0.09, 0.09, 0.28, 0x23222b, pivot.x + dx, pivot.y + 0.45, pivot.z, { delay: 0.82 + k * 0.03 }, 12),
      cylinder(0.06, 0.06, 1.1, GUN, pivot.x + dx, pivot.y + 0.45, pivot.z, { delay: 0.84 + k * 0.03 }, 12),
      cylinder(0.08, 0.08, 0.09, BRASS, pivot.x + dx, pivot.y + 1.47, pivot.z, { delay: 0.88 + k * 0.03 }, 12),
    ];
    const flash = [
      add(new ConeGeometry(0.12, 0.38, 8), YELLOW, pivot.x + dx, pivot.y + 1.56, pivot.z, { delay: 1.6, flat: true }),
      add(new CylinderGeometry(0.2, 0.2, 0.02, 10), 0xfff2a8, pivot.x + dx, pivot.y + 1.58, pivot.z, { delay: 1.62, flat: true, noInk: true }),
    ];
    gunParts.push(...parts, ...flash);
    return { parts: [...parts, ...flash], flash };
  });
  const gun = new Group();
  gun.position.copy(pivot);
  gun.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction));
  body.parent?.add(gun);
  gunParts.forEach((part) => {
    part.position.sub(pivot);
    gun.add(part);
  });
  const rests = barrels.map(({ parts }) => parts.map((part) => part.position.y));
  // Grips from the hands to the back of the gun.
  const side = new Vector3().crossVectors(direction, new Vector3(0, 1, 0)).normalize();
  gunner.hands.forEach((hand, i) => {
    const back = pivot.clone().addScaledVector(direction, -0.18).addScaledVector(side, i ? -0.12 : 0.12);
    limb(kit, hand, [back.x, back.y, back.z], 0.035, 0.035, 0x23222b, { delay: 1.4 });
  });

  // Spent brass round his boots, and one case flying from the gun.
  const floorBrass = add(new BoxGeometry(0.001, 0.001, 0.001), BRASS, pivot.x, G, pivot.z, { delay: 1.0, flat: true, noInk: true });
  const lying = (turn: number) => new CylinderGeometry(0.022, 0.022, 0.09, 6).rotateZ(Math.PI / 2).rotateY(turn);
  [0.3, 1.4, 2.2].forEach((turn, g) =>
    decorate(
      floorBrass,
      lying(turn),
      BRASS,
      [0, 1, 2, 3, 4, 5].map((k) => {
        const angle = k * 1.1 + g * 2.3;
        const r = 0.35 + ((k * 5 + g * 3) % 7) * 0.09;
        return [Math.cos(angle) * r, 0.022, Math.sin(angle) * r] as Point;
      }),
    ),
  );
  const ejectFrom = pivot.clone().addScaledVector(side, 0.28);
  const casing = add(new CylinderGeometry(0.022, 0.022, 0.09, 6), BRASS, ejectFrom.x, ejectFrom.y, ejectFrom.z, { delay: 1.7, noInk: true });

  tick((t) => {
    const fire = Math.floor(t * 8) % 2;
    barrels.forEach(({ parts, flash }, k) => {
      const on = fire === k;
      flash.forEach((part) => (part.visible = on));
      parts.forEach((part, i) => (part.position.y = rests[k][i] - (on ? 0.07 : 0)));
    });
    const s = (t * 1.6) % 1;
    casing.position.set(ejectFrom.x + side.x * s * 0.6, ejectFrom.y + 0.5 * s - 1.9 * s * s * 1.2, ejectFrom.z + side.z * s * 0.6 + s * 0.2);
    casing.rotation.set(s * 9, 0, s * 6);
    casing.visible = casing.position.y > G;
  });

  return { width: 4.9, height: 4.5, lookY: 1.5 };
}
