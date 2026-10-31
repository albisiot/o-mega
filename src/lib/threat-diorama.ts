import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  RedFormat,
  Scene,
  WebGLRenderer,
} from "three";
import type { ThreatActor, ThreatScene } from "@/lib/threat-scene";

const POP_SECONDS = 0.45;
const REST_YAW = -0.35;
const FRAME_MS = 1000 / 30;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;

const YELLOW = 0xffd60a;
const ORANGE = 0xff8a00;
const CYAN = 0x16c8ff;
const CREAM = 0xfff8e7;
const TOWER_COLORS = [0x3a4a7a, 0x7a3a6a, 0x2f6f7a, 0x57406f, 0x4a4f5c, 0x6f3a3a, 0x3a6a55];
const TOWER_SLOTS = [
  [-1.9, -0.6],
  [1.9, -0.7],
  [-0.9, -1.1],
  [0.9, -1.2],
  [0, -1.35],
  [-2.35, -1.25],
  [2.35, -1.25],
];

type PartOptions = {
  delay: number;
  rotation?: [number, number, number];
  flat?: boolean;
  noInk?: boolean;
  ink?: number;
};
type Part = { group: Group; delay: number };

/** The same threat always gets the same skyline, for both players. */
function seededRandom(text: string): () => number {
  let state = 2166136261;
  for (const char of text) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822519);
    state = Math.imul(state ^ (state >>> 13), 3266489917);
    return ((state ^= state >>> 16) >>> 0) / 4294967296;
  };
}

function easeOutBack(x: number): number {
  const c = 1.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

/**
 * Draws a threat's comic book diorama on the canvas, rising like a pop-up book.
 * Returns the cleanup function. Throws if WebGL is not available.
 */
export function mountThreatDiorama(
  canvas: HTMLCanvasElement,
  threat: { name: string; level: number; scene: ThreatScene },
  onContextLost: () => void,
): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
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
  const parts: Part[] = [];
  const blinking: Object3D[] = [];

  function add(geometry: BufferGeometry, color: number, x: number, y: number, z: number, options: PartOptions): Group {
    geometry.computeBoundingBox();
    geometry.translate(0, -(geometry.boundingBox?.min.y ?? 0), 0);
    geometries.push(geometry);
    const group = new Group();
    group.position.set(x, y, z);
    if (options.rotation) group.rotation.set(...options.rotation);
    const material = options.flat
      ? new MeshBasicMaterial({ color })
      : new MeshToonMaterial({ color, gradientMap: toonSteps });
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
  }

  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, options: PartOptions) =>
    add(new BoxGeometry(w, h, d), color, x, y, z, options);

  function ground(color: number) {
    box(6, 0.25, 4.3, color, 0, -0.25, 0, { delay: 0, ink: 1.02 });
  }

  function tower(w: number, h: number, color: number, x: number, z: number, random: () => number, options: PartOptions) {
    const group = box(w, h, 0.9, color, x, 0, z, options);
    const rows = Math.floor(h / 0.42);
    const columns = Math.max(1, Math.floor(w / 0.34));
    const lit: [number, number][] = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if (random() > 0.25) lit.push([(column - (columns - 1) / 2) * 0.32, 0.3 + row * 0.42]);
      }
    }
    const pane = new PlaneGeometry(0.16, 0.2);
    const paneMaterial = new MeshBasicMaterial({ color: random() < 0.5 ? YELLOW : ORANGE });
    geometries.push(pane);
    materials.push(paneMaterial);
    const windows = new InstancedMesh(pane, paneMaterial, lit.length);
    lit.forEach(([wx, wy], i) => windows.setMatrixAt(i, new Matrix4().makeTranslation(wx, wy, 0.46)));
    group.add(windows);
  }

  function robot(x: number, z: number, size: number, delay: number) {
    box(0.26 * size, 0.55 * size, 0.3 * size, 0x4a4f5c, x - 0.22 * size, 0, z, { delay });
    box(0.26 * size, 0.55 * size, 0.3 * size, 0x4a4f5c, x + 0.22 * size, 0, z, { delay });
    box(0.8 * size, 0.8 * size, 0.55 * size, 0xc9ced8, x, 0.55 * size, z, { delay: delay + 0.08 });
    box(0.2 * size, 0.7 * size, 0.22 * size, ORANGE, x - 0.54 * size, 0.65 * size, z, { delay: delay + 0.14 });
    box(0.2 * size, 0.7 * size, 0.22 * size, ORANGE, x + 0.54 * size, 0.65 * size, z, {
      delay: delay + 0.14,
      rotation: [0, 0, 0.9],
    });
    box(0.5 * size, 0.42 * size, 0.45 * size, 0xc9ced8, x, 1.36 * size, z, { delay: delay + 0.2 });
    blinking.push(
      box(0.32 * size, 0.09 * size, 0.05 * size, CYAN, x, 1.54 * size, z + 0.23 * size, {
        delay: delay + 0.26,
        flat: true,
        noInk: true,
      }),
    );
  }

  function golem(x: number, z: number, size: number, delay: number) {
    const stone = 0x8a8a92;
    box(0.36 * size, 0.5 * size, 0.42 * size, 0x6a6a72, x - 0.3 * size, 0, z, { delay });
    box(0.36 * size, 0.5 * size, 0.42 * size, 0x6a6a72, x + 0.3 * size, 0, z, { delay });
    box(1.1 * size, 0.9 * size, 0.7 * size, stone, x, 0.5 * size, z, { delay: delay + 0.08 });
    box(0.34 * size, 0.95 * size, 0.4 * size, 0x6a6a72, x - 0.75 * size, 0.42 * size, z, { delay: delay + 0.14 });
    box(0.34 * size, 0.95 * size, 0.4 * size, 0x6a6a72, x + 0.75 * size, 0.42 * size, z, { delay: delay + 0.14 });
    box(0.5 * size, 0.38 * size, 0.46 * size, stone, x, 1.4 * size, z, { delay: delay + 0.2 });
    blinking.push(
      box(0.34 * size, 0.07 * size, 0.05 * size, ORANGE, x, 1.56 * size, z + 0.24 * size, {
        delay: delay + 0.26,
        flat: true,
        noInk: true,
      }),
    );
  }

  function car(x: number, z: number, delay: number) {
    box(1.5, 0.32, 0.72, ORANGE, x, 0.1, z, { delay, rotation: [0, 0.35, 0] });
    box(0.75, 0.28, 0.6, 0x2c2c34, x - 0.05, 0.42, z, { delay: delay + 0.08, rotation: [0, 0.35, 0] });
    blinking.push(box(0.3, 0.09, 0.2, CYAN, x - 0.05, 0.7, z, { delay: delay + 0.16, flat: true }));
  }

  function addActor(actor: ThreatActor | undefined, size: number, delay: number) {
    if (actor === "robot") robot(0, 0.3, size, delay);
    if (actor === "golem") golem(0, 0.3, size, delay);
    if (actor === "car") car(0.2, 0.9, delay);
  }

  function buildCity() {
    const random = seededRandom(threat.name);
    const { level } = threat;
    const leaning = level >= 5;
    ground(0x23232b);
    TOWER_SLOTS.slice(0, Math.min(TOWER_SLOTS.length, level + 2)).forEach(([x, z], i) => {
      const height = 1.1 + level * 0.28 + random() * 1.1;
      const tilt = leaning ? (random() - 0.5) * 0.36 : 0;
      tower(0.8 + random() * 0.25, height, TOWER_COLORS[i], x, z, random, {
        delay: 0.12 + i * 0.09,
        rotation: [0, 0, tilt],
      });
    });
    if (leaning) {
      for (let i = 0; i < 4; i++) {
        box(0.4, 0.28, 0.34, 0x6a6a72, -1.3 + i * 0.85 + random() * 0.3, 0, 1 + random() * 0.6, {
          delay: 0.8 + i * 0.05,
          rotation: [0, random() * 3, 0.3],
        });
      }
    }
    addActor(threat.scene.actor, 0.95 + level * 0.07, 0.75);
  }

  function buildPort() {
    ground(0x0f6e96);
    box(2.6, 0.25, 1.7, 0x4a4f5c, -1.5, 0, -0.1, { delay: 0.1 });
    // No magenta here or in the actors: it would vanish against the threat panel.
    const colors = [CREAM, YELLOW, CYAN, ORANGE, 0x1d9e75];
    const stacked = 3 + Math.min(threat.level, 4);
    [
      [-2.3, 0.25, 0.3],
      [-1.6, 0.25, 0.3],
      [-0.9, 0.25, 0.3],
      [-2, 0.67, 0.3],
      [-1.3, 0.67, 0.3],
      [-2, 0.25, -0.35],
      [-1.3, 0.25, -0.35],
    ]
      .slice(0, stacked)
      .forEach(([x, y, z], i) => box(0.62, 0.42, 0.42, colors[i % colors.length], x, y, z, { delay: 0.3 + i * 0.08 }));
    box(0.14, 2.3, 0.14, YELLOW, -0.3, 0.25, -0.5, { delay: 0.8 });
    box(2, 0.14, 0.14, YELLOW, 0.25, 2.45, -0.5, { delay: 0.92 });
    box(0.03, 0.8, 0.03, 0x000000, 0.9, 1.65, -0.5, { delay: 1, noInk: true });
    box(0.5, 0.3, 0.34, ORANGE, 0.9, 1.38, -0.5, { delay: 1.05 });
    box(1.9, 0.5, 0.8, 0x2c2c34, 1.5, 0, 0.8, { delay: 0.55 });
    box(0.7, 0.5, 0.5, CREAM, 1.2, 0.5, 0.8, { delay: 0.65 });
    add(new CylinderGeometry(0.12, 0.12, 0.45, 12), YELLOW, 1.8, 0.5, 0.8, { delay: 0.7 });
    blinking.push(box(0.1, 0.1, 0.1, YELLOW, -0.3, 2.62, -0.5, { delay: 1.1, flat: true, noInk: true }));
  }

  if (threat.scene.environment === "city") buildCity();
  else buildPort();

  const distance = threat.level >= 5 ? 10 : 9.2;
  camera.position.set(0, distance * 0.34, distance);
  camera.lookAt(0, threat.level >= 5 ? 1.2 : 0.75, 0);

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

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
  };
  const onUp = () => {
    dragX = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  const shakes = threat.level >= 5;
  let frame = 0;
  let start = 0;
  let previous = 0;
  let slowFrames = 0;

  function draw(now: number, settled: boolean) {
    const elapsed = (now - start) / 1000;
    for (const { group, delay } of parts) {
      const x = settled ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / POP_SECONDS));
      const eased = x >= 1 ? 1 : easeOutBack(x);
      const wide = 1 - (1 - eased) * 0.5;
      group.scale.set(Math.max(0.001, wide), Math.max(0.001, eased), Math.max(0.001, wide));
    }
    if (!settled) {
      for (const part of blinking) part.visible = Math.sin(now * 0.012) > -0.6;
      root.position.x = shakes && elapsed > 1.2 ? Math.sin(now * 0.05) * 0.012 : 0;
      if (dragX === null) targetYaw += (REST_YAW + Math.sin(now * 0.0006) * 0.22 - targetYaw) * 0.02;
    }
    yaw += (targetYaw - yaw) * 0.12;
    root.rotation.y = yaw;
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    if (now - previous < FRAME_MS) return;
    const delta = now - previous;
    previous = now;
    // Too slow for this phone: stop on the finished scene, keep the battery.
    // Long gaps are a hidden tab, not a slow device.
    slowFrames = delta > SLOW_FRAME_MS && delta < 500 ? slowFrames + 1 : 0;
    if (slowFrames >= SLOW_FRAMES_LIMIT) {
      cancelAnimationFrame(frame);
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
  // Without the animation loop, a static scene is redrawn only when it changes size.
  const still = reduced ? new ResizeObserver(() => draw(start, true)) : null;
  if (still) still.observe(canvas);
  else frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    still?.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("webglcontextlost", onLost);
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    toonSteps.dispose();
    renderer.dispose();
    // iOS allows few live WebGL contexts: a match opens one for each round.
    renderer.forceContextLoss();
  };
}
