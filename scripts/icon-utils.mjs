import { deflateSync } from "node:zlib";

export function makeIconPng(size) {
  const channels = 4;
  const stride = size * channels;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = y * (stride + 1) + 1 + x * channels;
      const pixel = iconPixel(x, y, size);
      raw[offset] = pixel[0];
      raw[offset + 1] = pixel[1];
      raw[offset + 2] = pixel[2];
      raw[offset + 3] = pixel[3];
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", Buffer.concat([u32(size), u32(size), Buffer.from([8, 6, 0, 0, 0])])),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function makeIcns(pngs) {
  const entries = [
    ["icp4", pngs.get(16)],
    ["icp5", pngs.get(32)],
    ["icp6", pngs.get(64)],
    ["ic07", pngs.get(128)],
    ["ic08", pngs.get(256)],
    ["ic09", pngs.get(512)],
    ["ic10", pngs.get(1024)],
  ];
  const chunks = entries.map(([type, png]) =>
    Buffer.concat([Buffer.from(type), u32(png.length + 8), png]),
  );
  const body = Buffer.concat(chunks);
  return Buffer.concat([Buffer.from("icns"), u32(body.length + 8), body]);
}

export function makeIco(pngs) {
  const entries = [16, 32, 48, 64, 128, 256].map((size) => ({
    size,
    png: pngs.get(size),
  }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(entries.length * 16);
  let imageOffset = header.length + directory.length;
  entries.forEach((entry, index) => {
    const offset = index * 16;
    directory[offset] = entry.size === 256 ? 0 : entry.size;
    directory[offset + 1] = entry.size === 256 ? 0 : entry.size;
    directory[offset + 2] = 0;
    directory[offset + 3] = 0;
    directory.writeUInt16LE(1, offset + 4);
    directory.writeUInt16LE(32, offset + 6);
    directory.writeUInt32LE(entry.png.length, offset + 8);
    directory.writeUInt32LE(imageOffset, offset + 12);
    imageOffset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)]);
}

export function makeIconPngSet() {
  return new Map([16, 32, 48, 64, 128, 256, 512, 1024].map((size) => [size, makeIconPng(size)]));
}

function iconPixel(x, y, size) {
  const scale = size / 100;
  if (!insideRoundedRect(x, y, size, 20 * scale)) return [0, 0, 0, 0];

  const lineWidth = 8 * scale;
  if (
    distanceToSegment(x, y, 30 * scale, 35 * scale, 70 * scale, 35 * scale) <= lineWidth / 2 ||
    distanceToSegment(x, y, 30 * scale, 50 * scale, 70 * scale, 50 * scale) <= lineWidth / 2 ||
    distanceToSegment(x, y, 30 * scale, 65 * scale, 55 * scale, 65 * scale) <= lineWidth / 2
  ) {
    return [255, 255, 255, 255];
  }

  const badgeDistance = Math.hypot(x - 75 * scale, y - 75 * scale);
  if (badgeDistance <= 15 * scale) {
    const checkDistance = Math.min(
      distanceToSegment(x, y, 70 * scale, 75 * scale, 74 * scale, 79 * scale),
      distanceToSegment(x, y, 74 * scale, 79 * scale, 80 * scale, 71 * scale),
    );
    if (checkDistance <= 1.8 * scale) return [255, 255, 255, 255];
    return [16, 185, 129, 255];
  }

  return [79, 70, 229, 255];
}

function insideRoundedRect(x, y, size, radius) {
  const cx = x < radius ? radius : x > size - radius ? size - radius : x;
  const cy = y < radius ? radius : y > size - radius ? size - radius : y;
  return Math.hypot(x - cx, y - cy) <= radius;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return Math.hypot(px - x, py - y);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const crcBuffer = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc32(crcBuffer))]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
