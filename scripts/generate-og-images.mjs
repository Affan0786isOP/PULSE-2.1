import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targets = [
  {
    template: path.join(__dirname, 'og-templates', 'reaction.html'),
    dest: path.join(rootDir, 'public', 'og-guides-reaction.png')
  },
  {
    template: path.join(__dirname, 'og-templates', 'stroop.html'),
    dest: path.join(rootDir, 'public', 'og-guides-stroop.png')
  },
  {
    template: path.join(__dirname, 'og-templates', 'benchmarks.html'),
    dest: path.join(rootDir, 'public', 'og-benchmarks.png')
  }
];

async function generateOGImages() {
  console.log('Launching headless browser to render 1200x630 OG social cards...');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1
  });

  for (const t of targets) {
    const fileUrl = `file://${t.template.replace(/\\/g, '/')}`;
    console.log(`Rendering ${path.basename(t.template)} -> ${path.relative(rootDir, t.dest)}...`);
    
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    // Wait for fonts to be ready
    await page.evaluateHandle('document.fonts.ready');
    
    // Screenshot exact 1200x630 viewport
    await page.screenshot({
      path: t.dest,
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 }
    });

    const stat = fs.statSync(t.dest);
    console.log(`Generated ${path.relative(rootDir, t.dest)} (${stat.size} bytes)`);
  }

  await browser.close();
  console.log('All OG images generated successfully!');
}

generateOGImages().catch((err) => {
  console.error('Failed to generate OG images:', err);
  process.exit(1);
});
