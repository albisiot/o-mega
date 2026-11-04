// Shrinks a generated card model for the phone: the geometry is simplified within an error
// smaller than a pixel on screen, then quantized and meshopt-compressed; the texture becomes a
// 1024px WebP. The app's GLTFLoader registers MeshoptDecoder to read it.
// Run it on the generated model, not on its own output: every pass loses a little more.
// Usage: node scripts/compress-card-model.mjs <input.glb> <output.glb>
import { statSync } from "node:fs";
import { Logger, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const TEXTURE_SIZE = 1024;
const WEBP_QUALITY = 80;
// As a fraction of the model's radius: about 0.7 px when the viewer shows it 720 px tall.
const SIMPLIFY_ERROR = 0.002;
const SIMPLIFY_MIN_RATIO = 0.4;

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: compress-card-model.mjs <input.glb> <output.glb>");

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .setLogger(new Logger(Logger.Verbosity.WARN))
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const document = await io.read(input);
await document.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: SIMPLIFY_MIN_RATIO, error: SIMPLIFY_ERROR }),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [TEXTURE_SIZE, TEXTURE_SIZE], quality: WEBP_QUALITY }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
  prune(),
);
await io.write(output, document);

const triangles = document
  .getRoot()
  .listMeshes()
  .flatMap((mesh) => mesh.listPrimitives())
  .reduce((sum, primitive) => sum + (primitive.getIndices()?.getCount() ?? 0) / 3, 0);
const megabytes = (path) => (statSync(path).size / 1e6).toFixed(2);
console.log(`${output}: ${megabytes(input)} MB -> ${megabytes(output)} MB, ${triangles} triangles`);
