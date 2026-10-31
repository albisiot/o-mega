// Shrinks a generated card model for the phone: textures become 1024px JPEGs.
// Usage: node scripts/compress-card-model.mjs <input.glb> <output.glb>
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const TEXTURE_SIZE = 1024;
const JPEG_QUALITY = 82;

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: compress-card-model.mjs <input.glb> <output.glb>");

const source = readFileSync(input);
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength).toString("utf8"));
const binStart = 20 + jsonLength + 8;
const viewBytes = (view) => source.subarray(binStart + (view.byteOffset ?? 0), binStart + (view.byteOffset ?? 0) + view.byteLength);

const pad = (buffer, fill) => Buffer.concat([buffer, Buffer.alloc((4 - (buffer.length % 4)) % 4, fill)]);

const replaced = new Map();
for (const image of gltf.images ?? []) {
  const jpeg = await sharp(viewBytes(gltf.bufferViews[image.bufferView]))
    .resize(TEXTURE_SIZE, TEXTURE_SIZE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  replaced.set(image.bufferView, jpeg);
  image.mimeType = "image/jpeg";
}

const chunks = [];
let offset = 0;
gltf.bufferViews.forEach((view, index) => {
  const bytes = pad(replaced.get(index) ?? viewBytes(view), 0);
  chunks.push(bytes);
  view.byteOffset = offset;
  view.byteLength = replaced.get(index)?.length ?? view.byteLength;
  offset += bytes.length;
});
const bin = Buffer.concat(chunks);
gltf.buffers = [{ byteLength: bin.length }];
const json = pad(Buffer.from(JSON.stringify(gltf)), 0x20);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const chunkHeader = (length, type) => {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32LE(length, 0);
  buffer.writeUInt32LE(type, 4);
  return buffer;
};
writeFileSync(output, Buffer.concat([header, chunkHeader(json.length, JSON_CHUNK), json, chunkHeader(bin.length, BIN_CHUNK), bin]));
console.log(`${output}: ${(source.length / 1e6).toFixed(2)} MB -> ${((28 + json.length + bin.length) / 1e6).toFixed(2)} MB`);
