import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import type * as net from 'net';
import { registerStaticRoutes } from '../../server/routes/staticRoutes';

function makeRequest(
  server: http.Server,
  method: string,
  pathUrl: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as net.AddressInfo;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        method,
        path: pathUrl,
        headers
      },
      res => {
        let raw = '';
        res.on('data', chunk => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: raw
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('Static Routes & API Caching Headers (Tier 1)', () => {
  let app: express.Express;
  let server: http.Server;
  const mockDist = path.join(process.cwd(), 'temp-test-dist');

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    if (!fs.existsSync(mockDist)) fs.mkdirSync(mockDist, { recursive: true });
    if (!fs.existsSync(path.join(mockDist, 'assets'))) fs.mkdirSync(path.join(mockDist, 'assets'), { recursive: true });
    if (!fs.existsSync(path.join(mockDist, 'mobile'))) fs.mkdirSync(path.join(mockDist, 'mobile'), { recursive: true });

    fs.writeFileSync(path.join(mockDist, 'index.html'), '<html><body>Desktop Shell</body></html>');
    fs.writeFileSync(path.join(mockDist, 'mobile', 'index.html'), '<html><body>Mobile Shell</body></html>');
    fs.writeFileSync(path.join(mockDist, 'sw.js'), '// Service Worker');
    fs.writeFileSync(path.join(mockDist, 'manifest.webmanifest'), '{"name":"PULSE"}');
    fs.writeFileSync(path.join(mockDist, 'favicon.ico'), 'icon');
    fs.writeFileSync(path.join(mockDist, 'assets', 'index-AbCdEf12.js'), 'console.log("hashed js");');
    fs.writeFileSync(path.join(mockDist, 'assets', 'style-AbCdEf12.css'), 'body { color: red; }');
    fs.writeFileSync(path.join(mockDist, 'assets', 'unhashed.js'), 'console.log("unhashed");');

    app = express();

    // Early API cache-control middleware under test
    app.use('/api', (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      next();
    });

    app.get('/api/test', (_req, res) => {
      res.json({ ok: true });
    });

    await registerStaticRoutes(app, mockDist);

    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(mockDist, { recursive: true, force: true });
  });

  it('sets immutable caching for hashed JS/CSS assets matching /assets/*-[hash].(js|css)', async () => {
    const jsRes = await makeRequest(server, 'GET', '/assets/index-AbCdEf12.js');
    expect(jsRes.status).toBe(200);
    expect(jsRes.headers['cache-control']).toBe('public, max-age=31536000, immutable');

    const cssRes = await makeRequest(server, 'GET', '/assets/style-AbCdEf12.css');
    expect(cssRes.status).toBe(200);
    expect(cssRes.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('does NOT set immutable caching for unhashed assets in /assets/', async () => {
    const unhashedRes = await makeRequest(server, 'GET', '/assets/unhashed.js');
    expect(unhashedRes.status).toBe(200);
    expect(unhashedRes.headers['cache-control']).not.toBe('public, max-age=31536000, immutable');
  });

  it('sets no-cache for sw.js and service workers', async () => {
    const swRes = await makeRequest(server, 'GET', '/sw.js');
    expect(swRes.status).toBe(200);
    expect(swRes.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
  });

  it('sets short revalidation for icons and web manifests', async () => {
    const icoRes = await makeRequest(server, 'GET', '/favicon.ico');
    expect(icoRes.status).toBe(200);
    expect(icoRes.headers['cache-control']).toBe('public, max-age=86400, stale-while-revalidate=604800');

    const manifestRes = await makeRequest(server, 'GET', '/manifest.webmanifest');
    expect(manifestRes.status).toBe(200);
    expect(manifestRes.headers['cache-control']).toBe('public, max-age=86400, stale-while-revalidate=604800');
  });

  it('sets no-cache on SPA html fallback navigations', async () => {
    const pageRes = await makeRequest(server, 'GET', '/reaction-test');
    expect(pageRes.status).toBe(200);
    expect(pageRes.headers['cache-control']).toBe('no-cache, must-revalidate');
    expect(pageRes.body).toContain('Desktop Shell');

    const mobilePageRes = await makeRequest(server, 'GET', '/mobile/reaction-test');
    expect(mobilePageRes.status).toBe(200);
    expect(mobilePageRes.headers['cache-control']).toBe('no-cache, must-revalidate');
    expect(mobilePageRes.body).toContain('Mobile Shell');
  });

  it('sets strict no-store on /api routes', async () => {
    const apiRes = await makeRequest(server, 'GET', '/api/test');
    expect(apiRes.status).toBe(200);
    expect(apiRes.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
  });
});
