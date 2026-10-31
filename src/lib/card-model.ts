import {
  AmbientLight,
  BackSide,
  Box3,
  DataTexture,
  DirectionalLight,
  Group,
  Material,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NearestFilter,
  PerspectiveCamera,
  RedFormat,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const POP_SECONDS = 0.45;
const MODEL_SIZE = 1.8;
const FRAME_MARGIN = 1.04;
const INK_SCALE = 1.012;
const FRAME_MS = 1000 / 30;
const FRAME_MARGIN_MS = 4;
const SLOW_FRAME_MS = 66;
const SLOW_FRAMES_LIMIT = 20;
const SETTLED_YAW = 0.001;

function easeOutBack(x: number): number {
  const c = 1.9;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

/**
 * Loads a card's model on the canvas in the comic style of the threat dioramas:
 * it sways on its own and turns when dragged. Returns the cleanup function.
 * Throws if WebGL is not available.
 */
export function mountCardModel(
  canvas: HTMLCanvasElement,
  url: string,
  onLoaded: () => void,
  onFailed: () => void,
): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 20);
  scene.add(new AmbientLight(0xffffff, 1.9));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(1.5, 3, 4);
  scene.add(sun);

  const toonSteps = new DataTexture(new Uint8Array([120, 190, 255]), 3, 1, RedFormat);
  toonSteps.minFilter = toonSteps.magFilter = NearestFilter;
  toonSteps.needsUpdate = true;
  const ink = new MeshBasicMaterial({ color: 0x000000, side: BackSide });
  const materials: Material[] = [ink];
  const textures: Texture[] = [toonSteps];
  const meshes: Mesh[] = [];
  const pivot = new Group();
  scene.add(pivot);

  let disposed = false;
  let frame = 0;
  let previous = 0;
  let slowFrames = 0;
  let loadedAt: number | null = null;
  let sways = !reduced;
  let redraw = true;

  new GLTFLoader().load(
    url,
    (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      const box = new Box3().setFromObject(model);
      const scale = MODEL_SIZE / Math.max(...box.getSize(new Vector3()).toArray());
      model.scale.setScalar(scale);
      model.position.copy(box.getCenter(new Vector3()).multiplyScalar(-scale));
      pivot.add(model);
      const parts: Mesh[] = [];
      model.traverse((object) => {
        if (object instanceof Mesh) parts.push(object);
      });
      for (const part of parts) {
        const source = part.material as MeshStandardMaterial;
        const toon = new MeshToonMaterial({ map: source.map, color: source.color, gradientMap: toonSteps });
        source.dispose();
        part.material = toon;
        materials.push(toon);
        if (source.map) textures.push(source.map);
        meshes.push(part);
        const outline = new Mesh(part.geometry, ink);
        outline.scale.setScalar(INK_SCALE);
        part.add(outline);
      }
      loadedAt = performance.now();
      redraw = true;
      onLoaded();
    },
    undefined,
    (cause) => {
      console.error("Card model failed", cause);
      if (!disposed) onFailed();
    },
  );

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    // Far enough that the model never leaves a narrow canvas while it turns.
    const halfHeight = Math.tan(MathUtils.degToRad(camera.fov / 2));
    camera.position.z = (FRAME_MARGIN * MODEL_SIZE) / 2 / (halfHeight * Math.min(camera.aspect, 1));
    camera.updateProjectionMatrix();
    redraw = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let yaw = 0;
  let targetYaw = 0;
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

  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    const delta = now - previous;
    const popping = loadedAt !== null && now - loadedAt < POP_SECONDS * 1000 && !reduced;
    // Full display rate while something moves on purpose, half rate at rest.
    if (dragX === null && !popping && delta < FRAME_MS - FRAME_MARGIN_MS) return;
    if (!sways && !popping && !redraw && Math.abs(targetYaw - yaw) < SETTLED_YAW) return;
    previous = now;
    // Too slow for this phone: stop swaying, keep turning only when dragged.
    slowFrames = delta > SLOW_FRAME_MS && delta < 500 ? slowFrames + 1 : 0;
    if (slowFrames >= SLOW_FRAMES_LIMIT) sways = false;

    const elapsed = loadedAt === null ? 0 : (now - loadedAt) / 1000;
    const pop = reduced ? 1 : Math.min(1, elapsed / POP_SECONDS);
    pivot.scale.setScalar(Math.max(0.001, pop >= 1 ? 1 : easeOutBack(pop)));
    yaw += (targetYaw - yaw) * 0.12;
    pivot.rotation.y = yaw + (sways && dragX === null ? Math.sin(elapsed * 0.9) * 0.3 : 0);
    redraw = false;
    renderer.render(scene, camera);
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    onFailed();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  frame = requestAnimationFrame(loop);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("webglcontextlost", onLost);
    meshes.forEach((mesh) => mesh.geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    // iOS allows few live WebGL contexts.
    renderer.forceContextLoss();
  };
}
