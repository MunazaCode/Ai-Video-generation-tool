import { deflateSync } from "node:zlib";

/** Solid-color PNG (RGB) for mock storyboard frames — large enough to look intentional when scaled. */
export function createSolidPng(
  width: number,
  height: number,
  rgb: { r: number; g: number; b: number },
): Buffer {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const rowSize = 1 + w * 3;
  const raw = Buffer.alloc(rowSize * h);
  for (let y = 0; y < h; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < w; x += 1) {
      const i = rowStart + 1 + x * 3;
      raw[i] = rgb.r;
      raw[i + 1] = rgb.g;
      raw[i + 2] = rgb.b;
    }
  }

  const compressed = deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Deterministic slate color from a short seed (avoids 1×1 red pixel look). */
export function slateRgbFromSeed(seed: string): { r: number; g: number; b: number } {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hueBuckets = [
    { r: 36, g: 72, b: 120 },
    { r: 48, g: 96, b: 88 },
    { r: 96, g: 64, b: 112 },
    { r: 120, g: 80, b: 48 },
    { r: 56, g: 88, b: 104 },
  ];
  return hueBuckets[Math.abs(h) % hueBuckets.length] ?? { r: 36, g: 72, b: 120 };
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i] ?? 0;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}
