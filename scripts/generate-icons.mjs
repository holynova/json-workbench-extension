import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const publicIconDir = resolve("public/icons");
const storeIconDir = resolve("store-assets/icons");
mkdirSync(publicIconDir, { recursive: true });
mkdirSync(storeIconDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  writeFileSync(resolve(publicIconDir, `icon-${size}.png`), makeIcon(size));
}

copyFileSync(resolve(publicIconDir, "icon-128.png"), resolve(storeIconDir, "store-icon-128.png"));
console.log("Generated exact PNG icons");

function makeIcon(size) {
  const image = new Uint8Array(size * size * 4);
  fill(image, size, [250, 249, 245, 255]);

  const border = Math.max(1, Math.round(size * 0.04));
  const pad = Math.max(2, Math.round(size * 0.08));
  const radius = Math.round(size * 0.18);
  roundRect(image, size, pad, pad, size - pad * 2, size - pad * 2, radius, [255, 255, 255, 255]);
  strokeRoundRect(image, size, pad, pad, size - pad * 2, size - pad * 2, radius, border, [20, 20, 19, 255]);

  const inset = pad + border + Math.max(1, Math.round(size * 0.05));
  strokeRoundRect(
    image,
    size,
    inset,
    inset,
    size - inset * 2,
    size - inset * 2,
    Math.max(1, radius - border),
    Math.max(1, Math.round(size * 0.018)),
    [230, 227, 218, 255]
  );

  drawBrace(image, size, "left", [217, 119, 87, 255]);
  drawBrace(image, size, "right", [217, 119, 87, 255]);

  const ruleH = Math.max(1, Math.round(size * 0.035));
  rect(image, size, Math.round(size * 0.34), Math.round(size * 0.31), Math.round(size * 0.32), ruleH, [120, 140, 93, 255]);
  rect(image, size, Math.round(size * 0.34), Math.round(size * 0.66), Math.round(size * 0.32), ruleH, [120, 140, 93, 255]);

  return encodePng(size, size, image);
}

function drawBrace(image, size, side, color) {
  const thick = Math.max(1, Math.round(size * 0.055));
  const x = side === "left" ? Math.round(size * 0.31) : Math.round(size * 0.63);
  const y = Math.round(size * 0.37);
  const h = Math.round(size * 0.26);
  const arm = Math.round(size * 0.08);
  const dir = side === "left" ? -1 : 1;
  rect(image, size, x, y, thick, h, color);
  rect(image, size, x, y, arm * dir, thick, color);
  rect(image, size, x, y + Math.round(h / 2), arm * dir, thick, color);
  rect(image, size, x, y + h - thick, arm * dir, thick, color);
}

function fill(image, size, color) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) setPixel(image, size, x, y, color);
  }
}

function rect(image, size, x, y, width, height, color) {
  const x1 = width < 0 ? x + width : x;
  const x2 = width < 0 ? x : x + width;
  const y1 = height < 0 ? y + height : y;
  const y2 = height < 0 ? y : y + height;
  for (let py = y1; py < y2; py += 1) {
    for (let px = x1; px < x2; px += 1) setPixel(image, size, px, py, color);
  }
}

function roundRect(image, size, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      if (insideRoundRect(px, py, x, y, width, height, radius)) setPixel(image, size, px, py, color);
    }
  }
}

function strokeRoundRect(image, size, x, y, width, height, radius, thickness, color) {
  for (let i = 0; i < thickness; i += 1) {
    roundRectOutline(image, size, x + i, y + i, width - i * 2, height - i * 2, Math.max(0, radius - i), color);
  }
}

function roundRectOutline(image, size, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      if (!insideRoundRect(px, py, x, y, width, height, radius)) continue;
      const edge =
        !insideRoundRect(px - 1, py, x, y, width, height, radius) ||
        !insideRoundRect(px + 1, py, x, y, width, height, radius) ||
        !insideRoundRect(px, py - 1, x, y, width, height, radius) ||
        !insideRoundRect(px, py + 1, x, y, width, height, radius);
      if (edge) setPixel(image, size, px, py, color);
    }
  }
}

function insideRoundRect(px, py, x, y, width, height, radius) {
  const left = x + radius;
  const right = x + width - radius - 1;
  const top = y + radius;
  const bottom = y + height - radius - 1;
  if ((px >= left && px <= right) || (py >= top && py <= bottom)) return true;
  const cx = px < left ? left : right;
  const cy = py < top ? top : bottom;
  return (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2;
}

function setPixel(image, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (y * size + x) * 4;
  image[offset] = color[0];
  image[offset + 1] = color[1];
  image[offset + 2] = color[2];
  image[offset + 3] = color[3];
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr(width, height)),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let i = 0; i < 8; i += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
}
