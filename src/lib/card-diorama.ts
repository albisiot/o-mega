import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  Group,
  InstancedMesh,
  Material,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  OctahedronGeometry,
  PerspectiveCamera,
  RedFormat,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from "three";

// A character's diorama: the figure on a small base with a piece of Nuova Megara, built
// from simple shapes in the comic style of the threat dioramas (src/lib/threat-diorama.ts).
// It costs no download beyond three.js, and it rises like a pop-up book.

const POP_SECONDS = 0.45;
const REST_YAW = -0.35;
const FOV = 32;
const FRAME_MARGIN = 1.04;
const FRAME_MS = 1000 / 30;
const FRAME_MARGIN_MS = 4;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;

const YELLOW = 0xffd60a;
const ORANGE = 0xff8a00;
const CYAN = 0x16c8ff;
const MAGENTA = 0xff2e6c;
const INK = 0x14121c;

type PartOptions = {
  delay: number;
  rotation?: [number, number, number];
  flat?: boolean;
  noInk?: boolean;
  ink?: number;
};

/** The tools a character's diorama is built with. Every part pops in after its delay, in seconds. */
type Kit = {
  /** A shape standing on height y: its lowest point is moved to y. */
  add(geometry: BufferGeometry, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  cylinder(top: number, bottom: number, h: number, color: number, x: number, y: number, z: number, options: PartOptions, sides?: number): Group;
  ball(radius: number, color: number, x: number, y: number, z: number, options: PartOptions): Group;
  /** Small flat details stuck to a part, so they pop and turn with it; each spot can lean by an angle. */
  decorate(part: Group, geometry: BufferGeometry, color: number, spots: [number, number, number, number?][]): void;
  /** Motion on every frame, from the seconds since the diorama opened. */
  tick(update: (elapsed: number) => void): void;
  /** Specks rising slowly through a box and starting again from the bottom. */
  motes(count: number, color: number, size: number, from: [number, number, number], to: [number, number, number], delay: number): void;
};

/** What the camera keeps in frame: the diorama's width and height, and the height it looks at. */
type Framing = { width: number; height: number; lookY: number };

/** The parts' colour, for a glow that changes on its own. */
function colorOf(part: Group): Color {
  return ((part.children[0] as Mesh).material as MeshBasicMaterial).color;
}

/**
 * Keelstone (P055): he stands before the temple door, arms crossed, and no one gets past.
 * The price of his gift shows at his feet: the hem of his robe has turned to stone and roots
 * him to the paving, because from there he does not move.
 */
function keelstone(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const PLINTH = 0x1d1b28;
  const SLAB = 0x2f3a4c;
  const TILE_A = 0x56667e;
  const TILE_B = 0x4a5970;
  const STEP = 0x5a7590;
  const STEP_LIGHT = 0x6a87a2;
  const WALL = 0x456580;
  const WALL_LIGHT = 0x587b97;
  const COLUMN = 0x7c9cb4;
  const COLUMN_LIGHT = 0x94b3c8;
  const SKIN = 0xd2ccbd;
  const SKIN_DARK = 0x9d978a;
  const ROBE = 0x1d5662;
  const ROBE_LIGHT = 0x2c7c86;
  const HAIR = 0x9c978d;
  const BEARD = 0xb9b4a8;
  const DOOR_LIGHT = 0xfff1b8;
  const octagon: [number, number, number] = [0, Math.PI / 8, 0];

  // The base: a dark octagon with a magenta band, the paving slab with a cyan edge.
  cylinder(2.5, 2.62, 0.42, PLINTH, 0, -0.42, 0, { delay: 0, ink: 1.02, rotation: octagon }, 8);
  cylinder(2.64, 2.64, 0.07, MAGENTA, 0, -0.27, 0, { delay: 0.04, flat: true, noInk: true, rotation: octagon }, 8);
  cylinder(2.42, 2.5, 0.1, SLAB, 0, 0, 0, { delay: 0.06, ink: 1.02, rotation: octagon }, 8);
  cylinder(2.52, 2.52, 0.025, CYAN, 0, 0.05, 0, { delay: 0.08, flat: true, noInk: true, rotation: octagon }, 8);
  const FLOOR = 0.12;
  // Paving in front of the temple, one slab missing.
  [-1.1, -0.37, 0.37, 1.1].forEach((x, column) =>
    [0.3, 1.02].forEach((z, row) => {
      if (column === 3 && row === 1) return;
      const turn = ((column * 7 + row * 3) % 5) * 0.012 - 0.024;
      box(0.68, 0.02, 0.68, (column + row) % 2 ? TILE_A : TILE_B, x, 0.1, z, {
        delay: 0.1 + (column + row) * 0.03,
        noInk: true,
        rotation: [0, turn, 0],
      });
    }),
  );

  // The temple: two steps, the wall with its door, two columns and the pediment.
  box(3.3, 0.15, 1.2, STEP, 0, 0.1, -0.95, { delay: 0.14, ink: 1.02 });
  box(2.9, 0.15, 0.95, STEP_LIGHT, 0, 0.25, -1.07, { delay: 0.2, ink: 1.02 });
  const TOP = 0.4;
  [-1, 1].forEach((x, i) => box(0.85, 2.62, 0.38, WALL, x, TOP, -1.3, { delay: 0.26 + i * 0.05, ink: 1.03 }));
  box(1.2, 0.57, 0.38, WALL_LIGHT, 0, 2.45, -1.3, { delay: 0.36, ink: 1.03 });
  // The light behind the door, brighter at its heart, and the light it throws down the steps.
  const doorway = box(1.15, 2.05, 0.04, YELLOW, 0, TOP, -1.32, { delay: 0.4, flat: true, noInk: true });
  const heart = box(0.66, 1.55, 0.04, DOOR_LIGHT, 0, TOP + 0.12, -1.29, { delay: 0.44, flat: true, noInk: true });
  box(1.05, 0.012, 0.42, 0xffe27a, 0, TOP, -0.82, { delay: 0.48, flat: true, noInk: true });
  box(1.15, 0.012, 0.22, 0xffe9a0, 0, 0.25, -0.46, { delay: 0.5, flat: true, noInk: true });
  [-0.64, 0.64].forEach((x, i) => box(0.12, 2.15, 0.06, WALL_LIGHT, x, TOP, -1.08, { delay: 0.42 + i * 0.03, ink: 1.04 }));
  box(1.4, 0.12, 0.06, WALL_LIGHT, 0, 2.5, -1.08, { delay: 0.47, ink: 1.04 });
  const glowFrom = new Color(YELLOW);
  const glowTo = new Color(ORANGE);
  const heartFrom = new Color(DOOR_LIGHT);
  const heartTo = new Color(YELLOW);
  tick((t) => {
    const k = (Math.sin(t * 1.6) + 1) / 2;
    colorOf(doorway).lerpColors(glowFrom, glowTo, k * 0.55);
    colorOf(heart).lerpColors(heartFrom, heartTo, k * 0.7);
  });

  [-1.2, 1.2].forEach((x, i) => {
    const wait = 0.5 + i * 0.06;
    box(0.46, 0.1, 0.46, COLUMN_LIGHT, x, TOP, -0.82, { delay: wait });
    const shaft = cylinder(0.17, 0.2, 2.3, COLUMN, x, TOP + 0.1, -0.82, { delay: wait + 0.04 }, 10);
    // Flutes down the shaft, and a crack across the right one.
    decorate(
      shaft,
      new BoxGeometry(0.025, 2.1, 0.01),
      0x56748c,
      [-0.36, 0, 0.36].map((angle) => [Math.sin(angle) * 0.19, 1.15, Math.cos(angle) * 0.19, 0] as [number, number, number, number]),
    );
    if (i === 1) decorate(shaft, new BoxGeometry(0.015, 0.3, 0.012), INK, [[0.05, 1.25, 0.19, 0.6], [-0.04, 1.05, 0.2, -0.4]]);
    cylinder(0.26, 0.19, 0.1, COLUMN_LIGHT, x, TOP + 2.4, -0.82, { delay: wait + 0.1 }, 10);
    box(0.52, 0.12, 0.52, COLUMN_LIGHT, x, TOP + 2.5, -0.82, { delay: wait + 0.12 });
  });
  const LINTEL = TOP + 2.62;
  const entablature = box(3, 0.3, 0.8, WALL_LIGHT, 0, LINTEL, -1.02, { delay: 0.68 });
  // A frieze of cyan stones along its front.
  decorate(
    entablature,
    new BoxGeometry(0.1, 0.1, 0.02),
    CYAN,
    Array.from({ length: 11 }, (_, i) => [-1.3 + i * 0.26, 0.15, 0.41] as [number, number, number]),
  );
  const pediment = new CylinderGeometry(1, 1, 0.74, 3);
  pediment.rotateX(Math.PI / 2);
  pediment.rotateZ(Math.PI);
  pediment.scale(1.73, 0.37, 1);
  add(pediment, STEP_LIGHT, 0, LINTEL + 0.3, -1.02, { delay: 0.74 });

  // Rubble: a fallen column drum and two blocks.
  add(new CylinderGeometry(0.19, 0.19, 0.55, 10).rotateZ(Math.PI / 2), COLUMN, 1.62, 0.1, 0.55, {
    delay: 0.8,
    rotation: [0, 0.7, 0],
  });
  box(0.3, 0.22, 0.26, WALL, -1.75, 0.1, 0.4, { delay: 0.84, rotation: [0, 0.4, 0] });
  box(0.2, 0.14, 0.18, WALL_LIGHT, -1.55, 0.1, 1.2, { delay: 0.88, rotation: [0.1, -0.3, 0.12] });

  // Keelstone, a little taller than the door behind him.
  const z0 = 0.45;
  const F = FLOOR;
  const D = 0.95;
  const robe = (top: number, bottom: number, h: number) => new CylinderGeometry(top, bottom, h, 18).scale(1, 1, 0.78);
  // The stone hem and the roots it sends into the paving.
  add(robe(0.6, 0.66, 0.16), SKIN_DARK, 0, F, z0, { delay: D });
  [0.35, 1.25, 2.2, 3.3, 4.3, 5.3].forEach((angle, i) => {
    const length = 0.42 + (i % 3) * 0.1;
    const reach = 0.55 + length / 2;
    box(length, 0.05, 0.11, SKIN_DARK, Math.cos(angle) * reach, F, z0 + Math.sin(angle) * reach * 0.8, {
      delay: D + 1 + i * 0.06,
      ink: 1.08,
      rotation: [0, -angle, 0],
    });
  });
  [
    [-0.85, 0.95, 0.5],
    [0.9, 1.15, -0.7],
    [0.2, 1.3, 0.2],
  ].forEach(([x, z, angle], i) =>
    box(0.32, 0.01, 0.025, INK, x, F + 0.005, z, { delay: D + 1.2 + i * 0.05, flat: true, noInk: true, rotation: [0, angle, 0] }),
  );
  [-0.17, 0.17].forEach((x, i) => box(0.18, 0.1, 0.26, SKIN, x, F, z0 + 0.5, { delay: D + 0.02 + i * 0.02 }));
  add(robe(0.46, 0.6, 1.05), ROBE, 0, F + 0.14, z0, { delay: D + 0.06 });
  add(robe(0.6, 0.46, 0.85), ROBE, 0, F + 1.15, z0, { delay: D + 0.12 });
  // The himation across his chest, from the right hip to the left shoulder.
  box(0.26, 1.3, 0.06, ROBE_LIGHT, 0.36, F + 0.95, z0 + 0.33, { delay: D + 0.18, rotation: [0.1, 0, 0.62] });
  [-1, 1].forEach((side, i) => {
    ball(0.27, ROBE, side * 0.56, F + 1.6, z0, { delay: D + 0.2 + i * 0.03 });
    cylinder(0.15, 0.17, 0.62, ROBE, side * 0.68, F + 1.3, z0 + 0.16, { delay: D + 0.24 + i * 0.03, rotation: [-0.3, 0, side * 0.12] });
  });
  // The forearms crossed in front of his chest, stone and cracked, each hand on the other arm.
  const forearm = (x: number, y: number, z: number, lean: number, wait: number) => {
    const part = add(new CylinderGeometry(0.12, 0.13, 1.16, 12).rotateZ(Math.PI / 2), SKIN, x, y, z, {
      delay: D + wait,
      rotation: [0, 0, lean],
    });
    decorate(part, new BoxGeometry(0.012, 0.16, 0.012), INK, [
      [-0.25, 0.13, 0.12, 0.5],
      [0.1, 0.14, 0.125, -0.7],
      [0.32, 0.12, 0.12, 0.3],
    ]);
  };
  forearm(0.08, F + 1.3, z0 + 0.46, 0.05, 0.32);
  ball(0.13, SKIN, -0.52, F + 1.27, z0 + 0.46, { delay: D + 0.36 });
  forearm(-0.08, F + 1.44, z0 + 0.54, -0.05, 0.38);
  ball(0.13, SKIN, 0.52, F + 1.41, z0 + 0.52, { delay: D + 0.42 });

  cylinder(0.14, 0.16, 0.22, SKIN, 0, F + 1.95, z0, { delay: D + 0.44 });
  const head = add(new SphereGeometry(0.27, 18, 14).scale(0.95, 1.1, 0.95), SKIN, 0, F + 2.08, z0, { delay: D + 0.48 });
  const face = 0.25;
  // Eyes under a heavy brow, and the cracks of his stone face.
  decorate(head, new BoxGeometry(0.3, 0.055, 0.05), SKIN_DARK, [[0, 0.36, face - 0.01]]);
  decorate(head, new BoxGeometry(0.07, 0.035, 0.02), INK, [
    [-0.09, 0.32, face + 0.005],
    [0.09, 0.32, face + 0.005],
  ]);
  decorate(head, new BoxGeometry(0.07, 0.11, 0.06), SKIN_DARK, [[0, 0.27, face]]);
  decorate(head, new BoxGeometry(0.012, 0.14, 0.012), INK, [
    [0.16, 0.42, 0.19, 0.5],
    [-0.15, 0.24, 0.205, -0.3],
  ]);
  add(new SphereGeometry(0.23, 16, 12).scale(1.05, 1.25, 0.8), BEARD, 0, F + 1.8, z0 + 0.13, { delay: D + 0.54 });
  box(0.28, 0.06, 0.07, BEARD, 0, F + 2.3, z0 + 0.24, { delay: D + 0.56 });
  // Grey curls on top and behind.
  const centre = F + 2.08 + 0.297;
  [
    [0, 0.27, -0.02],
    [-0.16, 0.2, -0.12],
    [0.16, 0.2, -0.12],
    [-0.25, 0.04, -0.08],
    [0.25, 0.04, -0.08],
    [-0.11, 0.1, -0.24],
    [0.11, 0.1, -0.24],
    [0, -0.02, -0.27],
    [-0.13, 0.24, 0.1],
    [0.13, 0.24, 0.1],
  ].forEach(([x, y, z], i) => ball(0.095, HAIR, x, centre + y - 0.095, z0 + z, { delay: D + 0.58 + i * 0.02, ink: 1.1 }));

  // Specks of light drifting out of the door.
  motes(12, YELLOW, 0.035, [-0.55, TOP + 0.1, -1.15], [0.55, TOP + 2.2, -0.35], 1.2);

  return { width: 4.9, height: 4.5, lookY: 1.6 };
}

const BUILDERS: Record<string, (kit: Kit) => Framing> = {
  P055: keelstone,
};

/** Whether a card has a diorama. */
export function hasCardDiorama(code: string): boolean {
  return code in BUILDERS;
}

/**
 * Draws a card's diorama on the canvas: it rises like a pop-up book, sways on its own and
 * turns when dragged. Returns the cleanup function. Throws if WebGL is not available or the
 * card has no diorama.
 */
export function mountCardDiorama(canvas: HTMLCanvasElement, code: string, onContextLost: () => void): () => void {
  const build = BUILDERS[code];
  if (!build) throw new Error(`No diorama for ${code}`);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  scene.add(new AmbientLight(0xffffff, 1.7));
  const sun = new DirectionalLight(0xffffff, 2.8);
  sun.position.set(4, 8, 5);
  scene.add(sun);

  const toonSteps = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
  toonSteps.minFilter = toonSteps.magFilter = NearestFilter;
  toonSteps.needsUpdate = true;

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const ink = new MeshBasicMaterial({ color: 0x000000, side: BackSide });
  materials.push(ink);
  const root = new Group();
  scene.add(root);
  const parts: { group: Group; delay: number }[] = [];
  const tickers: ((elapsed: number) => void)[] = [];
  const specks: { mesh: InstancedMesh; start: Float32Array; speed: Float32Array; bottom: number; top: number; delay: number }[] = [];
  const matrix = new Matrix4();

  const add: Kit["add"] = (geometry, color, x, y, z, options) => {
    geometry.computeBoundingBox();
    geometry.translate(0, -(geometry.boundingBox?.min.y ?? 0), 0);
    geometries.push(geometry);
    const group = new Group();
    group.position.set(x, y, z);
    if (options.rotation) group.rotation.set(...options.rotation);
    const material = options.flat ? new MeshBasicMaterial({ color }) : new MeshToonMaterial({ color, gradientMap: toonSteps });
    materials.push(material);
    group.add(new Mesh(geometry, material));
    if (!options.noInk) {
      const outline = new Mesh(geometry, ink);
      const size = options.ink ?? 1.06;
      outline.scale.set(size, 1 + (size - 1) * 0.6, size);
      outline.position.y = -0.02;
      group.add(outline);
    }
    group.scale.setScalar(0.001);
    root.add(group);
    parts.push({ group, delay: options.delay });
    return group;
  };

  const kit: Kit = {
    add,
    box: (w, h, d, color, x, y, z, options) => add(new BoxGeometry(w, h, d), color, x, y, z, options),
    cylinder: (top, bottom, h, color, x, y, z, options, sides = 14) =>
      add(new CylinderGeometry(top, bottom, h, sides), color, x, y, z, options),
    ball: (radius, color, x, y, z, options) => add(new SphereGeometry(radius, 16, 12), color, x, y, z, options),
    decorate(part, geometry, color, spots) {
      const material = new MeshBasicMaterial({ color });
      geometries.push(geometry);
      materials.push(material);
      for (const [x, y, z, lean = 0] of spots) {
        const mesh = new Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.rotation.z = lean;
        part.add(mesh);
      }
    },
    tick: (update) => tickers.push(update),
    motes(count, color, size, from, to, delay) {
      const geometry = new OctahedronGeometry(size);
      const material = new MeshBasicMaterial({ color });
      geometries.push(geometry);
      materials.push(material);
      const mesh = new InstancedMesh(geometry, material, count);
      const start = new Float32Array(count * 3);
      const speed = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        // Spread by a fixed pattern: the same specks on every phone.
        const r = (n: number) => {
          const v = Math.sin((i + 1) * 127.1 + n * 311.7) * 43758.5453;
          return v - Math.floor(v);
        };
        start[i * 3] = MathUtils.lerp(from[0], to[0], r(1));
        start[i * 3 + 1] = MathUtils.lerp(from[1], to[1], r(2));
        start[i * 3 + 2] = MathUtils.lerp(from[2], to[2], r(3));
        speed[i] = 0.12 + r(4) * 0.18;
      }
      mesh.visible = false;
      root.add(mesh);
      specks.push({ mesh, start, speed, bottom: from[1], top: to[1], delay });
    },
  };

  const framing = build(kit);

  function placeSpecks(elapsed: number) {
    for (const item of specks) {
      item.mesh.visible = elapsed >= item.delay;
      if (!item.mesh.visible) continue;
      const t = elapsed - item.delay;
      const height = item.top - item.bottom;
      for (let i = 0; i < item.speed.length; i++) {
        const y = item.start[i * 3 + 1] + item.speed[i] * t;
        const wrapped = item.bottom + ((((y - item.bottom) % height) + height) % height);
        const x = item.start[i * 3] + Math.sin(t * 0.9 + i) * 0.06;
        item.mesh.setMatrixAt(i, matrix.makeTranslation(x, wrapped, item.start[i * 3 + 2]));
      }
      item.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    // Far enough that the whole base stays in a narrow canvas while it turns.
    const half = Math.tan(MathUtils.degToRad(FOV / 2));
    const distance = FRAME_MARGIN * Math.max(framing.height / 2 / half, framing.width / 2 / (half * camera.aspect));
    camera.position.set(0, framing.lookY + distance * 0.3, distance);
    camera.lookAt(0, framing.lookY, 0);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(() => {
    resize();
    if (still) draw(start, true);
  });

  let yaw = REST_YAW;
  let targetYaw = REST_YAW;
  let dragX: number | null = null;
  const onDown = (event: PointerEvent) => {
    dragX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (dragX === null) return;
    targetYaw += (event.clientX - dragX) * 0.012;
    dragX = event.clientX;
    if (still) {
      yaw = targetYaw;
      draw(start, true);
    }
  };
  const onUp = () => {
    dragX = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  let frame = 0;
  let start = 0;
  let previous = 0;
  let slowFrames = 0;
  let still = reduced;
  const popMs = (Math.max(...parts.map((part) => part.delay)) + POP_SECONDS) * 1000;

  function draw(now: number, settled: boolean) {
    const elapsed = (now - start) / 1000;
    for (const { group, delay } of parts) {
      const x = settled ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / POP_SECONDS));
      const eased = x >= 1 ? 1 : 1 + 2.9 * (x - 1) ** 3 + 1.9 * (x - 1) ** 2;
      const wide = 1 - (1 - eased) * 0.5;
      group.scale.set(Math.max(0.001, wide), Math.max(0.001, eased), Math.max(0.001, wide));
    }
    for (const update of tickers) update(settled ? 0 : elapsed);
    placeSpecks(settled ? popMs / 1000 : elapsed);
    if (!settled) {
      if (dragX === null) targetYaw += (REST_YAW + Math.sin(now * 0.0006) * 0.22 - targetYaw) * 0.02;
      yaw += (targetYaw - yaw) * 0.12;
    }
    root.rotation.y = yaw;
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    const delta = now - previous;
    // Full display rate while something moves on purpose, half rate at rest.
    const atRest = now - start > popMs && dragX === null;
    if (atRest && delta < FRAME_MS - FRAME_MARGIN_MS) return;
    previous = now;
    // Too slow for this phone: stop on the finished diorama, turning only when dragged.
    slowFrames = delta > SLOW_FRAME_MS && delta < 500 ? slowFrames + 1 : 0;
    if (slowFrames >= SLOW_FRAMES_LIMIT) {
      cancelAnimationFrame(frame);
      still = true;
      draw(now, true);
      return;
    }
    draw(now, false);
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  start = previous = performance.now();
  observer.observe(canvas);
  resize();
  if (still) draw(start, true);
  else frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("webglcontextlost", onLost);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    toonSteps.dispose();
    renderer.dispose();
    // iOS allows few live WebGL contexts.
    renderer.forceContextLoss();
  };
}
