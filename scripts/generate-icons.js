import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import jpeg from 'jpeg-js';

function renderPulseBuffer(size, isMaskable = false) {
  // Pulse wave points normalized to 256x256:
  const basePoints = [
    { x: 36, y: 128 },
    { x: 80, y: 128 },
    { x: 105, y: 56 },
    { x: 150, y: 200 },
    { x: 175, y: 128 },
    { x: 220, y: 128 }
  ];

  const scale = (isMaskable ? 0.72 : 0.88) * (size / 256);
  const cx = size / 2;
  const cy = size / 2;

  const points = basePoints.map(p => ({
    x: cx + (p.x - 128) * scale,
    y: cy + (p.y - 128) * scale
  }));

  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  function minDistanceToPolyline(px, py) {
    let minDist = 999999;
    for (let i = 0; i < points.length - 1; i++) {
      const d = distToSegment(px, py, points[i].x, points[i].y, points[i+1].x, points[i+1].y);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  const strokeWidth = Math.max(2, Math.round(18 * scale));
  const glowWidth = strokeWidth * 2.8;
  const cornerRadius = isMaskable ? 0 : size * 0.22;

  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (y * size + x) * 4;
      
      let inCard = true;
      if (!isMaskable) {
        const dx = Math.abs(x - cx) - (cx - cornerRadius);
        const dy = Math.abs(y - cy) - (cy - cornerRadius);
        if (dx > 0 && dy > 0) {
          if (Math.hypot(dx, dy) > cornerRadius) {
            inCard = false;
          }
        }
      }

      if (!inCard) {
        buffer[px] = 0; buffer[px+1] = 0; buffer[px+2] = 0; buffer[px+3] = 0;
        continue;
      }

      const bgR = 3;
      const bgG = 6;
      const bgB = 12;

      const d = minDistanceToPolyline(x, y);

      if (d <= strokeWidth / 2) {
        const alpha = Math.min(1, (strokeWidth / 2 - d + 1));
        buffer[px] = Math.round(0 * alpha + bgR * (1 - alpha));
        buffer[px+1] = Math.round(240 * alpha + bgG * (1 - alpha));
        buffer[px+2] = Math.round(255 * alpha + bgB * (1 - alpha));
        buffer[px+3] = 255;
      } else if (d <= glowWidth) {
        const glowFactor = Math.pow(1 - (d - strokeWidth / 2) / (glowWidth - strokeWidth / 2), 2) * 0.45;
        buffer[px] = Math.round(0 * glowFactor + bgR * (1 - glowFactor));
        buffer[px+1] = Math.round(240 * glowFactor + bgG * (1 - glowFactor));
        buffer[px+2] = Math.round(255 * glowFactor + bgB * (1 - glowFactor));
        buffer[px+3] = 255;
      } else {
        if (!isMaskable) {
          const edgeDistX = Math.min(x, size - x);
          const edgeDistY = Math.min(y, size - y);
          const edgeDist = Math.min(edgeDistX, edgeDistY);
          if (edgeDist < size * 0.04) {
            buffer[px] = 0;
            buffer[px+1] = Math.round(240 * 0.25);
            buffer[px+2] = Math.round(255 * 0.25);
            buffer[px+3] = 255;
            continue;
          }
        }
        buffer[px] = bgR;
        buffer[px+1] = bgG;
        buffer[px+2] = bgB;
        buffer[px+3] = 255;
      }
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
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    if (typeof zlib.crc32 === 'function') {
      return zlib.crc32(buf);
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
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
  const rawBuffer = renderPulseBuffer(size, true); // Solid background for JPG
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
  const cy = height / 2;

  // Normalized pulse waveform across wide card
  const basePoints = [
    { x: 200, y: 315 },
    { x: 440, y: 315 },
    { x: 520, y: 150 },
    { x: 620, y: 480 },
    { x: 700, y: 315 },
    { x: 1000, y: 315 }
  ];

  function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  function minDistanceToPolyline(px, py) {
    let minDist = 999999;
    for (let i = 0; i < basePoints.length - 1; i++) {
      const d = distToSegment(px, py, basePoints[i].x, basePoints[i].y, basePoints[i+1].x, basePoints[i+1].y);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  const strokeWidth = 12;
  const glowWidth = 36;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = (y * width + x) * 4;

      // Base dark surface #0B0D10
      let bgR = 11;
      let bgG = 13;
      let bgB = 16;

      // Subtle technical grid line check (every 60px)
      const isGridX = (x % 60 === 0);
      const isGridY = (y % 60 === 0);
      if (isGridX || isGridY) {
        bgR += 10;
        bgG += 12;
        bgB += 15;
      }

      // Outer border frame (32px padding border)
      if (
        (x >= 32 && x <= width - 32 && (y === 32 || y === height - 32)) ||
        (y >= 32 && y <= height - 32 && (x === 32 || x === width - 32))
      ) {
        bgR = 41;
        bgG = 49;
        bgB = 58;
      }

      const d = minDistanceToPolyline(x, y);

      if (d <= strokeWidth / 2) {
        const alpha = Math.min(1, (strokeWidth / 2 - d + 1));
        buffer[px] = Math.round(34 * alpha + bgR * (1 - alpha));
        buffer[px+1] = Math.round(199 * alpha + bgG * (1 - alpha));
        buffer[px+2] = Math.round(214 * alpha + bgB * (1 - alpha));
        buffer[px+3] = 255;
      } else if (d <= glowWidth) {
        const glowFactor = Math.pow(1 - (d - strokeWidth / 2) / (glowWidth - strokeWidth / 2), 2) * 0.40;
        buffer[px] = Math.round(34 * glowFactor + bgR * (1 - glowFactor));
        buffer[px+1] = Math.round(199 * glowFactor + bgG * (1 - glowFactor));
        buffer[px+2] = Math.round(214 * glowFactor + bgB * (1 - glowFactor));
        buffer[px+3] = 255;
      } else {
        buffer[px] = bgR;
        buffer[px+1] = bgG;
        buffer[px+2] = bgB;
        buffer[px+3] = 255;
      }
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

const targets = [
  // Wide 1200x630 OG social cards
  { path: 'public/og-image.png', width: 1200, height: 630, format: 'og-png' },
  { path: 'public/og-image.jpg', width: 1200, height: 630, format: 'og-jpg' },
  { path: 'mobile/public/og-image.png', width: 1200, height: 630, format: 'og-png' },
  { path: 'mobile/public/og-image.jpg', width: 1200, height: 630, format: 'og-jpg' },

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
  const dimStr = t.width ? `${t.width}x${t.height}` : `${t.size}x${t.size}`;
  console.log(`Generated & validated ${t.path} (${dimStr})`);
}

console.log('All logo and icon image files (PNG & JPG) generated and validated successfully.');
