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
import { DIORAMAS, type DioramaBuilder } from "@/lib/diorama-index";
import { type Kit } from "@/lib/diorama-kit";

// A character's diorama: the figure on a small base with a piece of Nuova Megara, built
// from simple shapes in the comic style of the threat dioramas (src/lib/threat-diorama.ts).
// It costs no download beyond three.js and its own small module, and it rises like a pop-up book.

const POP_SECONDS = 0.45;
const REST_YAW = -0.35;
const FOV = 32;
const FRAME_MARGIN = 1.04;
const FRAME_MS = 1000 / 30;
const FRAME_MARGIN_MS = 4;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;

type Builder = DioramaBuilder;

/** A card's diorama, to mount with mountCardDiorama. Rejects if the card has none. */
export function loadCardDiorama(code: string): Promise<Builder> {
  const diorama = DIORAMAS.find((entry) => entry.code === code);
  return diorama ? diorama.load() : Promise.reject(new Error(`No diorama for ${code}`));
}

/**
 * Draws a diorama (from loadCardDiorama) on the canvas: it rises like a pop-up book, sways on its
 * own and turns when dragged. Returns the cleanup function. Throws if WebGL is not available.
 */
export function mountCardDiorama(canvas: HTMLCanvasElement, build: Builder, onContextLost: () => void): () => void {
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
    const lift = -(geometry.boundingBox?.min.y ?? 0);
    geometry.translate(0, lift, 0);
    geometries.push(geometry);
    const group = new Group();
    group.position.set(x, y, z);
    if (options.rotation) group.rotation.set(...options.rotation);
    const material = options.flat ? new MeshBasicMaterial({ color }) : new MeshToonMaterial({ color, gradientMap: toonSteps });
    materials.push(material);
    group.add(new Mesh(geometry, material));
    if (options.outline) {
      options.outline.translate(0, lift, 0);
      geometries.push(options.outline);
      group.add(new Mesh(options.outline, ink));
    } else if (!options.noInk) {
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
      return material;
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
    // The first frame's timestamp can come a moment before `start`: time never runs below zero,
    // or a diorama that reads a curve or a list by time would read outside it.
    const elapsed = Math.max(0, (now - start) / 1000);
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
