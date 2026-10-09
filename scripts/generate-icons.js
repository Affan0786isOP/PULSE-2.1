import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import jpeg from 'jpeg-js';

// PULSE Official Brand Mark (P-Symbol) Analytical Rasterizer
function isInsidePSymbol(u, v) {
  // S1: Upper Loop / Arch
  if (u >= 12 && u <= 61 && v >= 8 && v <= 25) return true;
  if (u >= 46 && u <= 61 && v >= 45 && v <= 62) return true;
  if (u > 61) {
    const r = Math.hypot(u - 61, v - 35);
    if (r >= 10 && r <= 27 && v >= 8 && v <= 62) return true;
  }

  // S2: Lower Slanted Stem Parallelogram (M 12 55 L 36 38 L 36 75 L 12 92 Z)
  if (u >= 12 && u <= 36) {
    const slope = -17 / 24;
    const vTop = 55 + slope * (u - 12);
    const vBottom = 92 + slope * (u - 12);
    if (v >= vTop && v <= vBottom) return true;
  }

  return false;
}

function renderPulseBuffer(size, isMaskable = false, isTransparent = false) {
  const buffer = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;

  // Scale & offset to center the 100x100 P-symbol
  const symbolScale = (isMaskable ? 0.60 : 0.72) * (size / 100);
  const offsetX = cx - 50 * symbolScale;
  const offsetY = cy - 50 * symbolScale;

  const cornerRadius = isMaskable ? 0 : size * 0.2246;
  const samples = 4; // 4x4 = 16 sub-samples per pixel for anti-aliasing

  const bgR = 8;
  const bgG = 8;
  const bgB = 10;
  const symbolR = 0;
  const symbolG = 240;
  const symbolB = 255;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (y * size + x) * 4;

      let subSamplesInsideSquircle = 0;
      let subSamplesInsideSymbol = 0;
      let subSamplesOnBorder = 0;

      for (let sy = 0; sy < samples; sy++) {
        const py = y + (sy + 0.5) / samples;
        for (let sx = 0; sx < samples; sx++) {
          const pxSub = x + (sx + 0.5) / samples;

          // Squircle containment check
          let inSquircle = true;
          if (!isMaskable && !isTransparent) {
            const dx = Math.abs(pxSub - cx) - (cx - cornerRadius);
            const dy = Math.abs(py - cy) - (cy - cornerRadius);
            if (dx > 0 && dy > 0) {
              if (Math.hypot(dx, dy) > cornerRadius) {
                inSquircle = false;
              }
            }
          }

          if (inSquircle) {
            subSamplesInsideSquircle++;

            // Check subtle squircle border
            if (!isMaskable && !isTransparent && cornerRadius > 0) {
              const borderDistX = Math.min(pxSub, size - pxSub);
              const borderDistY = Math.min(py, size - py);
              const edgeDist = Math.min(borderDistX, borderDistY);
              if (edgeDist < Math.max(1, size * 0.005)) {
                subSamplesOnBorder++;
              }
            }

            // P-Symbol check
            const u = (pxSub - offsetX) / symbolScale;
            const v = (py - offsetY) / symbolScale;
            if (isInsidePSymbol(u, v)) {
              subSamplesInsideSymbol++;
            }
          }
        }
      }

      const totalSub = samples * samples;
      const squircleAlpha = subSamplesInsideSquircle / totalSub;
      const symbolAlpha = subSamplesInsideSymbol / totalSub;

      if (squircleAlpha === 0 && !isMaskable) {
        buffer[px] = 0;
        buffer[px + 1] = 0;
        buffer[px + 2] = 0;
        buffer[px + 3] = 0;
        continue;
      }

      let r = bgR;
      let g = bgG;
      let b = bgB;
      let a = Math.round(255 * squircleAlpha);

      if (subSamplesOnBorder > 0) {
        const borderAlpha = (subSamplesOnBorder / totalSub) * 0.08;
        r = Math.round(r * (1 - borderAlpha) + 255 * borderAlpha);
        g = Math.round(g * (1 - borderAlpha) + 255 * borderAlpha);
        b = Math.round(b * (1 - borderAlpha) + 255 * borderAlpha);
      }

      if (symbolAlpha > 0) {
        r = Math.round(r * (1 - symbolAlpha) + symbolR * symbolAlpha);
        g = Math.round(g * (1 - symbolAlpha) + symbolG * symbolAlpha);
        b = Math.round(b * (1 - symbolAlpha) + symbolB * symbolAlpha);
      }

      buffer[px] = r;
      buffer[px + 1] = g;
      buffer[px + 2] = b;
      buffer[px + 3] = a;
    }
  }

  return buffer;
}

function createPulsePNG(size, isMaskable = false) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    if (typeof zlib.crc32 === 'function') return zlib.crc32(buf);
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crc = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawBuffer = renderPulseBuffer(size, isMaskable);
  const rawRows = [];

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0; // Filter None
    rawBuffer.copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const idat = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function createPulseJPG(size) {
  const rawBuffer = renderPulseBuffer(size, true); // Solid obsidian background
  const jpegData = jpeg.encode({
    data: rawBuffer,
    width: size,
    height: size
  }, 95);
  return jpegData.data;
}

function renderPulseOGBuffer(width = 1200, height = 630) {
  const buffer = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2 - 20;

  // Render centered 220px P-Symbol in OG card
  const symbolScale = 2.4;
  const offsetX = cx - 50 * symbolScale;
  const offsetY = cy - 50 * symbolScale;

  const samples = 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = (y * width + x) * 4;

      // Obsidian base background #08080A
      let bgR = 8;
      let bgG = 8;
      let bgB = 10;

      // Subtle engineering grid pattern
      if (x % 48 === 0 || y % 48 === 0) {
        bgR += 5;
        bgG += 6;
        bgB += 8;
      }

      // Cyan radial glow around center logo
      const distFromCenter = Math.hypot(x - cx, y - cy);
      if (distFromCenter < 380) {
        const glow = Math.pow(1 - distFromCenter / 380, 2) * 0.18;
        bgR = Math.round(bgR * (1 - glow) + 0 * glow);
        bgG = Math.round(bgG * (1 - glow) + 240 * glow);
        bgB = Math.round(bgB * (1 - glow) + 255 * glow);
      }

      // Outer border frame (32px inset)
      if (
        (x >= 32 && x <= width - 32 && (y === 32 || y === height - 32)) ||
        (y >= 32 && y <= height - 32 && (x === 32 || x === width - 32))
      ) {
        bgR = 34;
        bgG = 42;
        bgB = 53;
      }

      let subSamplesInsideSymbol = 0;
      for (let sy = 0; sy < samples; sy++) {
        const py = y + (sy + 0.5) / samples;
        for (let sx = 0; sx < samples; sx++) {
          const pxSub = x + (sx + 0.5) / samples;
          const u = (pxSub - offsetX) / symbolScale;
          const v = (py - offsetY) / symbolScale;
          if (isInsidePSymbol(u, v)) {
            subSamplesInsideSymbol++;
          }
        }
      }

      const totalSub = samples * samples;
      const symbolAlpha = subSamplesInsideSymbol / totalSub;

      let r = bgR;
      let g = bgG;
      let b = bgB;

      if (symbolAlpha > 0) {
        r = Math.round(r * (1 - symbolAlpha) + 0 * symbolAlpha);
        g = Math.round(g * (1 - symbolAlpha) + 240 * symbolAlpha);
        b = Math.round(b * (1 - symbolAlpha) + 255 * symbolAlpha);
      }

      buffer[px] = r;
      buffer[px + 1] = g;
      buffer[px + 2] = b;
      buffer[px + 3] = 255;
    }
  }

  return buffer;
}

let cachedOGBuffer = null;
function getPulseOGBuffer(width = 1200, height = 630) {
  if (cachedOGBuffer) return cachedOGBuffer;
  cachedOGBuffer = renderPulseOGBuffer(width, height);
  return cachedOGBuffer;
}

function createPulseOGPNG(width = 1200, height = 630) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    if (typeof zlib.crc32 === 'function') return zlib.crc32(buf);
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crc = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawBuffer = getPulseOGBuffer(width, height);
  const rawRows = [];

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter None
    rawBuffer.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const idat = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function createPulseOGJPG(width = 1200, height = 630) {
  const rawBuffer = getPulseOGBuffer(width, height);
  const jpegData = jpeg.encode({
    data: rawBuffer,
    width: width,
    height: height
  }, 95);
  return jpegData.data;
}

// Generate an ICO file containing 16x16, 32x32, 48x48 PNG frames
function createPulseICO() {
  const sizes = [16, 32, 48];
  const pngBuffers = sizes.map(sz => createPulsePNG(sz, false));

  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type (1 = icon)
  header.writeUInt16LE(sizes.length, 4); // count

  let offset = 6 + sizes.length * 16;
  const entries = [];

  for (let i = 0; i < sizes.length; i++) {
    const sz = sizes[i];
    const png = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(sz >= 256 ? 0 : sz, 0); // width
    entry.writeUInt8(sz >= 256 ? 0 : sz, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const targets = [
  // Wide 1200x630 OG social cards
  { path: 'public/og-image.png', width: 1200, height: 630, format: 'og-png' },
  { path: 'public/og-image.jpg', width: 1200, height: 630, format: 'og-jpg' },
  { path: 'mobile/public/og-image.png', width: 1200, height: 630, format: 'og-png' },
  { path: 'mobile/public/og-image.jpg', width: 1200, height: 630, format: 'og-jpg' },

  // Favicons
  { path: 'public/favicon-16x16.png', size: 16, format: 'png', maskable: false },
  { path: 'public/favicon-32x32.png', size: 32, format: 'png', maskable: false },
  { path: 'public/favicon-192x192.png', size: 192, format: 'png', maskable: false },
  { path: 'public/favicon.ico', format: 'ico' },

  { path: 'mobile/public/favicon-16x16.png', size: 16, format: 'png', maskable: false },
  { path: 'mobile/public/favicon-32x32.png', size: 32, format: 'png', maskable: false },
  { path: 'mobile/public/favicon-192x192.png', size: 192, format: 'png', maskable: false },
  { path: 'mobile/public/favicon.ico', format: 'ico' },

  // PNG files
  { path: 'public/logo.png', size: 512, format: 'png', maskable: false },
  { path: 'public/pulse-logo.png', size: 512, format: 'png', maskable: false },
  { path: 'public/icon-192.png', size: 192, format: 'png', maskable: false },
  { path: 'public/icon-512.png', size: 512, format: 'png', maskable: false },
  { path: 'public/icon-maskable-512.png', size: 512, format: 'png', maskable: true },
  { path: 'public/apple-touch-icon.png', size: 180, format: 'png', maskable: false },

  { path: 'mobile/public/logo.png', size: 512, format: 'png', maskable: false },
  { path: 'mobile/public/pulse-logo.png', size: 512, format: 'png', maskable: false },
  { path: 'mobile/public/icon-192.png', size: 192, format: 'png', maskable: false },
  { path: 'mobile/public/icon-512.png', size: 512, format: 'png', maskable: false },
  { path: 'mobile/public/icon-maskable-512.png', size: 512, format: 'png', maskable: true },
  { path: 'mobile/public/apple-touch-icon.png', size: 180, format: 'png', maskable: false },

  // JPG / JPEG files
  { path: 'public/logo.jpg', size: 512, format: 'jpg', maskable: true },
  { path: 'public/logo.jpeg', size: 512, format: 'jpg', maskable: true },
  { path: 'public/pulse-logo.jpg', size: 512, format: 'jpg', maskable: true },
  { path: 'public/pulse-logo.jpeg', size: 512, format: 'jpg', maskable: true },

  { path: 'mobile/public/logo.jpg', size: 512, format: 'jpg', maskable: true },
  { path: 'mobile/public/logo.jpeg', size: 512, format: 'jpg', maskable: true },
  { path: 'mobile/public/pulse-logo.jpg', size: 512, format: 'jpg', maskable: true },
  { path: 'mobile/public/pulse-logo.jpeg', size: 512, format: 'jpg', maskable: true },
];

function validatePNGFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(signature)) {
    throw new Error(`Invalid PNG signature in ${filePath}`);
  }
  let pos = 8;
  const idatChunks = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    const storedCrc = buf.readUInt32BE(pos + 8 + length);
    const computedCrc = (typeof zlib.crc32 === 'function' 
      ? zlib.crc32(buf.subarray(pos + 4, pos + 8 + length)) 
      : (() => {
          const crcTable = new Uint32Array(256);
          for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            crcTable[n] = c;
          }
          let c = 0xFFFFFFFF;
          const chunkBody = buf.subarray(pos + 4, pos + 8 + length);
          for (let i = 0; i < chunkBody.length; i++) c = crcTable[(c ^ chunkBody[i]) & 0xFF] ^ (c >>> 8);
          return (c ^ 0xFFFFFFFF) >>> 0;
        })()) >>> 0;

    if (storedCrc !== computedCrc) {
      throw new Error(`CRC mismatch in ${filePath} chunk ${type}: stored=${storedCrc}, computed=${computedCrc}`);
    }
    if (type === 'IDAT') {
      idatChunks.push(data);
    }
    pos += 8 + length + 4;
  }
  // Validate IDAT zlib decompression
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  if (decompressed.length === 0) {
    throw new Error(`Decompressed IDAT is empty in ${filePath}`);
  }
}

for (const t of targets) {
  const dir = path.dirname(t.path);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  let buf;
  if (t.format === 'og-png') {
    buf = createPulseOGPNG(t.width, t.height);
  } else if (t.format === 'og-jpg') {
    buf = createPulseOGJPG(t.width, t.height);
  } else if (t.format === 'ico') {
    buf = createPulseICO();
  } else if (t.format === 'jpg') {
    buf = createPulseJPG(t.size);
  } else {
    buf = createPulsePNG(t.size, t.maskable);
  }
  
  fs.writeFileSync(t.path, buf);
  if (t.format === 'png' || t.format === 'og-png') {
    validatePNGFile(t.path);
  } else if (t.format === 'jpg' || t.format === 'og-jpg') {
    jpeg.decode(buf);
  }
  const dimStr = t.width ? `${t.width}x${t.height}` : (t.size ? `${t.size}x${t.size}` : 'multi-size');
  console.log(`Generated & validated ${t.path} (${dimStr})`);
}

console.log('All official brand logo and icon image files (PNG, JPG, ICO) generated and validated successfully.');
