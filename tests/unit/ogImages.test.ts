import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Dedicated OG Social Cards', () => {
  const images = [
    { file: 'public/og-guides-reaction.png', minSize: 100000 },
    { file: 'public/og-guides-stroop.png', minSize: 100000 },
    { file: 'public/og-benchmarks.png', minSize: 100000 },
  ];

  it('all 3 dedicated OG cards exist and meet minimum byte thresholds', () => {
    for (const img of images) {
      const p = path.resolve(process.cwd(), img.file);
      expect(fs.existsSync(p)).toBe(true);
      const stat = fs.statSync(p);
      expect(stat.size).toBeGreaterThan(img.minSize);
    }
  });

  it('all 3 images are valid 1200x630 PNG files', () => {
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    for (const img of images) {
      const p = path.resolve(process.cwd(), img.file);
      const buf = fs.readFileSync(p);
      expect(buf.subarray(0, 8).equals(pngSignature)).toBe(true);

      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      expect(width).toBe(1200);
      expect(height).toBe(630);
    }
  });

  it('all dedicated OG cards have distinct content hashes', () => {
    const defaultOg = fs.readFileSync(path.resolve(process.cwd(), 'public/og-image.png'));
    const buffers = images.map(img => fs.readFileSync(path.resolve(process.cwd(), img.file)));

    // Ensure none match the default og-image.png
    for (const b of buffers) {
      expect(b.equals(defaultOg)).toBe(false);
    }

    // Ensure all 3 are distinct from each other
    expect(buffers[0].equals(buffers[1])).toBe(false);
    expect(buffers[1].equals(buffers[2])).toBe(false);
    expect(buffers[0].equals(buffers[2])).toBe(false);
  });
});
