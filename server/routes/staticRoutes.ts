import type { Express } from 'express';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

/** Vite dev middleware (development) or static dist/ + SPA/PWA fallbacks (production). */
export async function registerStaticRoutes(app: Express): Promise<void> {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vi' + 'te');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.get(['/mobile', '/mobile/*'], async (req, res, next) => {
      try {
        if (req.path.startsWith('/mobile/src') || req.path.startsWith('/mobile/@') || path.extname(req.path)) {
          return next();
        }
        const url = req.originalUrl || req.url;
        let templatePath = path.resolve(process.cwd(), 'mobile', 'index.html');
        if (!fs.existsSync(templatePath)) {
          return next();
        }
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = template.replace('src="./src/main.tsx"', 'src="/mobile/src/main.tsx"');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (vite && typeof vite.ssrFixStacktrace === 'function') {
          vite.ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl || req.url;
        let templatePath = path.resolve(process.cwd(), 'index.html');
        if (req.path.startsWith('/mobile')) {
          const mobilePath = path.resolve(process.cwd(), 'mobile', 'index.html');
          if (fs.existsSync(mobilePath)) {
            templatePath = mobilePath;
          }
        }
        let template = fs.readFileSync(templatePath, 'utf-8');
        if (req.path.startsWith('/mobile')) {
          template = template.replace('src="./src/main.tsx"', 'src="/mobile/src/main.tsx"');
        }
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (vite && typeof vite.ssrFixStacktrace === 'function') {
          vite.ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });
  } else {
    // In production, static frontend assets live inside dist/
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : (typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'index.html')) ? __dirname : process.cwd());

    app.use(express.static(distPath, {
      dotfiles: 'deny',
      setHeaders: (res, filePath) => {
        const normalized = filePath.replace(/\\/g, '/');
        if (normalized.endsWith('.map') || normalized.endsWith('/server.js') || normalized.endsWith('.env')) {
          res.status(404);
          res.end();
        }
      }
    }));

    app.get(['/mobile', '/mobile/*'], (_req, res) => {
      const mobileHtml = path.join(distPath, 'mobile', 'index.html');
      if (fs.existsSync(mobileHtml)) {
        res.sendFile(mobileHtml);
      } else {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    // SPA fallback for all other routes
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}
