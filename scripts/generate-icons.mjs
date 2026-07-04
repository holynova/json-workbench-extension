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
  fill(image, size, [0, 0, 0, 0]);

  const pad = Math.max(1, Math.round(size * 0.02));
  const radius = Math.round(size * 0.22);
  roundRect(image, size, pad, pad, size - pad * 2, size - pad * 2, radius, [255, 255, 255, 255]);

  drawBrace(image, size, "left", [0, 101, 255, 255]);
  drawBrace(image, size, "right", [0, 101, 255, 255]);
  drawWrench(image, size, [22, 27, 33, 255], [255, 255, 255, 255]);

  return encodePng(size, size, image);
}

function drawBrace(image, size, side, color) {
  const thick = Math.max(2, Math.round(size * 0.1));
  const x = side === "left" ? Math.round(size * 0.17) : Math.round(size * 0.73);
  const y = Math.round(size * 0.19);
  const h = Math.round(size * 0.64);
  const arm = Math.round(size * 0.11);
  const notch = Math.round(size * 0.13);
  const dir = side === "left" ? -1 : 1;

  roundRect(image, size, x, y, thick + arm, Math.round(h * 0.42), Math.round(size * 0.08), color);
  roundRect(image, size, x, y + Math.round(h * 0.58), thick + arm, Math.round(h * 0.42), Math.round(size * 0.08), color);
  rect(image, size, x, y + Math.round(h * 0.28), thick, Math.round(h * 0.44), color);
  rect(image, size, x + (dir < 0 ? -notch : thick), y + Math.round(h * 0.45), notch + thick, Math.round(size * 0.08), color);

  if (side === "left") {
    clearRoundRect(image, size, x + thick, y + Math.round(h * 0.13), arm, Math.round(h * 0.18), Math.round(size * 0.06));
    clearRoundRect(image, size, x + thick, y + Math.round(h * 0.69), arm, Math.round(h * 0.18), Math.round(size * 0.06));
  } else {
    clearRoundRect(image, size, x - arm, y + Math.round(h * 0.13), arm, Math.round(h * 0.18), Math.round(size * 0.06));
    clearRoundRect(image, size, x - arm, y + Math.round(h * 0.69), arm, Math.round(h * 0.18), Math.round(size * 0.06));
  }
}

function drawWrench(image, size, color, cutout) {
  const thickness = Math.max(3, Math.round(size * 0.105));
  const x1 = Math.round(size * 0.38);
  const y1 = Math.round(size * 0.69);
  const x2 = Math.round(size * 0.61);
  const y2 = Math.round(size * 0.37);
  line(image, size, x1, y1, x2, y2, thickness, color);
  circle(image, size, x2, y2, Math.max(5, Math.round(size * 0.135)), color);
  circle(image, size, x2 + Math.round(size * 0.065), y2 - Math.round(size * 0.075), Math.max(3, Math.round(size * 0.09)), cutout);
  rect(image, size, x2 + Math.round(size * 0.018), y2 - Math.round(size * 0.16), Math.round(size * 0.18), Math.round(size * 0.1), cutout);
  circle(image, size, x1, y1, Math.max(5, Math.round(size * 0.085)), color);
  circle(image, size, x1, y1, Math.max(2, Math.round(size * 0.04)), cutout);
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

function line(image, size, x1, y1, x2, y2, thickness, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    circle(image, size, x, y, Math.ceil(thickness / 2), color);
  }
}

function circle(image, size, cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(image, size, x, y, color);
    }
  }
}

function roundRect(image, size, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      if (insideRoundRect(px, py, x, y, width, height, radius)) setPixel(image, size, px, py, color);
    }
  }
}

function clearRoundRect(image, size, x, y, width, height, radius) {
  roundRect(image, size, x, y, width, height, radius, [255, 255, 255, 255]);
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
