import type { Express } from 'express';
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

/** Vite dev middleware (development) or static dist/ + SPA/PWA fallbacks (production). */
export async function registerStaticRoutes(app: Express, customDistPath?: string): Promise<void> {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vi' + 'te');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.get(/^\/mobile(?:\/.*)?$/, async (req, res, next) => {
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

    app.use(async (req, res, next) => {
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
    const distPath = customDistPath || (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : (typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'index.html')) ? __dirname : process.cwd()));

    const HASHED_ASSET_REGEX = /\/assets\/.*-[A-Za-z0-9_-]{8,}\.(js|css)$/;

    // Early rejection for sensitive files (.map, .env, /server.js)
    app.use((req, res, next) => {
      const cleanPath = (req.path || '').toLowerCase();
      if (cleanPath.endsWith('.map') || cleanPath.endsWith('.env') || cleanPath === '/server.js' || cleanPath.endsWith('/server.js')) {
        return res.status(404).send('Not Found');
      }
      next();
    });

    // RFC 8288 Link headers, Vary: Accept, and Markdown Content Negotiation for Agents
    app.use((req, res, next) => {
      // Clean path
      const reqPath = (req.path || '/').toLowerCase();

      // Only handle GET/HEAD for document and API requests
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }

      // Explicit handling for well-known discovery files (.well-known)
      if (reqPath.startsWith('/.well-known/')) {
        const root = path.resolve(distPath);
        const candidate = path.resolve(root, `.${req.path}`);
        if (candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          const contentType = reqPath.endsWith('.json') ? 'application/json' : 'application/linkset+json';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
          return fs.createReadStream(candidate).pipe(res);
        }

        // Return clean JSON 404 for unsupported .well-known protocols (prevent SPA HTML soft-404)
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(404).type('application/json').json({
          error: 'Not Found',
          message: `PULSE does not support protocol ${reqPath}. See /.well-known/api-catalog and /auth.md for supported capabilities.`
        });
      }

      // Content negotiation for machine agents requesting text/markdown
      const acceptHeader = (req.headers['accept'] || '').toLowerCase();
      const wantsMarkdown = acceptHeader.includes('text/markdown') && !acceptHeader.includes('text/html');

      // Canonical link & markdown alternate header
      res.setHeader('Vary', 'Accept');
      const origin = 'https://pulse-lab.in';
      const cleanSlug = reqPath === '/' ? 'home' : reqPath.replace(/^\//, '').replace(/\/+$/, '').replace(/\//g, '-');
      const mdPath = path.join(distPath, 'md', `${cleanSlug}.md`);

      // Set RFC 8288 Link headers for HTML responses
      res.setHeader('Link', `<${origin}/llms.txt>; rel="help", <${origin}/auth.md>; rel="authorisation", <${origin}/md/${cleanSlug}.md>; rel="alternate"; type="text/markdown"`);

      if (wantsMarkdown && fs.existsSync(mdPath)) {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        return fs.createReadStream(mdPath).pipe(res);
      }

      next();
    });

    const staticFiles = express.static(distPath, {
      index: false,
      dotfiles: 'deny',
      setHeaders: (res, filePath) => {
        const normalized = filePath.replace(/\\/g, '/');

        if (HASHED_ASSET_REGEX.test(normalized)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (normalized.endsWith('/sw.js') || normalized.endsWith('/service-worker.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (normalized.endsWith('.webmanifest') || normalized.endsWith('.json') || normalized.endsWith('.ico') || normalized.endsWith('.png') || normalized.endsWith('.svg')) {
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        } else if (normalized.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
      }
    });

    // Explicit HTML file URLs must use the nonce-injecting SPA handlers below.
    app.use((req, res, next) => {
      if (req.path.toLowerCase().endsWith('.html')) {
        return next();
      }
      return staticFiles(req, res, next);
    });

    // Guard against serving HTML shells for missing static assets or files with extensions
    const isMissingStaticAsset = (reqPath: string): boolean => {
      // Any request under /assets/ or /mobile/assets/
      if (reqPath.startsWith('/assets/') || reqPath.startsWith('/mobile/assets/')) return true;
      // Any request with a file extension (e.g. .js, .css, .png, .map, etc.)
      const lastSegment = reqPath.split('/').pop() || '';
      // Existing HTML files are handled by the nonce-injecting route above; missing files should 404.
      return lastSegment.includes('.');
    };

    const serveWithNonce = (filePath: string, res: express.Response) => {
      const nonce = res.locals.nonce || '';
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          res.status(500).type('text/plain').send('Internal Server Error');
          return;
        }
        // Use case-insensitive regex in case there are <SCRIPT> tags
        const injectedHtml = nonce ? data.replace(/<script\b/ig, `<script nonce="${nonce}"`) : data;
        res.type('text/html').send(injectedHtml);
      });
    };

    // Serve existing HTML files through nonce injection, including generated SEO shells.
    app.get(/\.html$/i, (req, res, next) => {
      const root = path.resolve(distPath);
      const candidate = path.resolve(root, `.${req.path}`);
      if (candidate !== root && !candidate.startsWith(root + path.sep)) {
        return res.status(404).type('text/plain').send('Not found');
      }
      if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return serveWithNonce(candidate, res);
    });

    app.get(/^\/mobile(?:\/.*)?$/, (req, res) => {
      if (isMissingStaticAsset(req.path)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).type('text/plain').send('Not found');
      }
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      const slug = req.path.replace(/^\/+/, '').replace(/\/+$/, '');
      const seoPath = slug ? path.join(distPath, 'seo', slug + '.html') : '';
      if (seoPath && fs.existsSync(seoPath)) {
        return serveWithNonce(seoPath, res);
      }
      const mobileHtml = path.join(distPath, 'mobile', 'index.html');
      if (fs.existsSync(mobileHtml)) {
        serveWithNonce(mobileHtml, res);
      } else {
        serveWithNonce(path.join(distPath, 'index.html'), res);
      }
    });

    // SPA fallback for all other routes
    app.get(/^(?!\/api).*$/, (req, res) => {
      if (isMissingStaticAsset(req.path)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).type('text/plain').send('Not found');
      }
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      const slug = req.path.replace(/^\/+/, '').replace(/\/+$/, '');
      const seoPath = slug ? path.join(distPath, 'seo', slug + '.html') : '';
      if (seoPath && fs.existsSync(seoPath)) {
        return serveWithNonce(seoPath, res);
      }
      serveWithNonce(path.join(distPath, 'index.html'), res);
    });
  }
}
