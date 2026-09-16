import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = join(here, '..', 'public', 'icons');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function roundedSquareCoverage(x, y, size, radius) {
  const inset = size * 0.02;
  const left = inset;
  const right = size - inset;
  const top = inset;
  const bottom = size - inset;
  const dx = Math.max(left + radius - x, 0, x - (right - radius));
  const dy = Math.max(top + radius - y, 0, y - (bottom - radius));
  if (x < left || x > right || y < top || y > bottom) return 0;
  if (dx === 0 || dy === 0) return 1;
  return Math.hypot(dx, dy) <= radius ? 1 : 0;
}

function sparkleCoverage(x, y, size) {
  const center = size / 2;
  const arm = size * 0.31;
  const dx = Math.abs(x - center) / arm;
  const dy = Math.abs(y - center) / arm;
  const shape = Math.pow(dx, 2 / 3) + Math.pow(dy, 2 / 3);
  return shape <= 1 ? 1 : 0;
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const samples = 3;
  const background = [79, 70, 229];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let inside = 0;
      let sparkle = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          inside += roundedSquareCoverage(px, py, size, radius);
          sparkle += sparkleCoverage(px, py, size);
        }
      }
      const total = samples * samples;
      const alpha = inside / total;
      const white = sparkle / total;
      const offset = (y * size + x) * 4;
      const red = background[0] + (255 - background[0]) * white;
      const green = background[1] + (255 - background[1]) * white;
      const blue = background[2] + (255 - background[2]) * white;
      rgba[offset] = Math.round(red);
      rgba[offset + 1] = Math.round(green);
      rgba[offset + 2] = Math.round(blue);
      rgba[offset + 3] = Math.round(alpha * 255);
    }
  }

  return encodePng(size, size, rgba);
}

mkdirSync(outputDir, { recursive: true });

const outputs = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of outputs) {
  writeFileSync(join(outputDir, name), render(size));
  console.log(`generated public/icons/${name} (${size}x${size})`);
}
