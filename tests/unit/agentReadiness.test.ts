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
        headers,
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
            body: raw,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('Agent Readiness & Machine Discovery Engine', () => {
  let app: express.Express;
  let server: http.Server;
  const mockDist = path.join(process.cwd(), 'temp-test-agent-dist');

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    if (!fs.existsSync(mockDist)) fs.mkdirSync(mockDist, { recursive: true });
    if (!fs.existsSync(path.join(mockDist, 'md'))) fs.mkdirSync(path.join(mockDist, 'md'), { recursive: true });
    if (!fs.existsSync(path.join(mockDist, '.well-known'))) fs.mkdirSync(path.join(mockDist, '.well-known'), { recursive: true });

    // Mock HTML & Markdown pairs
    fs.writeFileSync(path.join(mockDist, 'index.html'), '<!doctype html><html><head><title>PULSE</title></head><body>Desktop Shell</body></html>');
    fs.writeFileSync(path.join(mockDist, 'md', 'home.md'), '# PULSE Home\n> Canonical: https://pulse-lab.in/\n\nPlatform overview.');
    fs.writeFileSync(path.join(mockDist, 'md', 'reaction-test.md'), '# Reaction Test\n> Canonical: https://pulse-lab.in/reaction-test\n\nVisual reaction protocol.');
    fs.writeFileSync(path.join(mockDist, 'auth.md'), '# Authentication & Authorization\nPublic access requires no keys.');
    fs.writeFileSync(path.join(mockDist, '.well-known', 'api-catalog'), '{"linkset":[{"anchor":"https://pulse-lab.in/api"}]}');
    fs.writeFileSync(path.join(mockDist, '.well-known', 'ai-catalog.json'), '{"name":"PULSE"}');

    app = express();
    await registerStaticRoutes(app, mockDist);

    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(mockDist, { recursive: true, force: true });
  });

  it('serves standard HTML when Accept header does not request markdown', async () => {
    const res = await makeRequest(server, 'GET', '/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Desktop Shell');
    expect(res.headers['vary']).toBe('Accept');
    expect(res.headers['link']).toContain('rel="help"');
    expect(res.headers['link']).toContain('rel="alternate"; type="text/markdown"');
  });

  it('negotiates markdown and serves pure markdown when Accept: text/markdown is present', async () => {
    const res = await makeRequest(server, 'GET', '/reaction-test', {
      accept: 'text/markdown, text/plain',
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/markdown');
    expect(res.headers['vary']).toBe('Accept');
    expect(res.body).toContain('# Reaction Test');
    expect(res.body).toContain('Visual reaction protocol.');
    expect(res.body).not.toContain('<!doctype html>');
  });

  it('serves RFC 9727 api-catalog and auth.md correctly', async () => {
    const apiCatRes = await makeRequest(server, 'GET', '/.well-known/api-catalog');
    expect(apiCatRes.status).toBe(200);
    expect(apiCatRes.body).toContain('https://pulse-lab.in/api');

    const authRes = await makeRequest(server, 'GET', '/auth.md');
    expect(authRes.status).toBe(200);
    expect(authRes.body).toContain('# Authentication & Authorization');
  });

  it('returns clean JSON 404 for unknown /.well-known agent requests instead of serving the SPA HTML shell', async () => {
    const oauthRes = await makeRequest(server, 'GET', '/.well-known/oauth-authorization-server');
    expect(oauthRes.status).toBe(404);
    expect(oauthRes.headers['content-type']).toContain('application/json');
    expect(oauthRes.body).toContain('PULSE does not support protocol');
    expect(oauthRes.body).not.toContain('Desktop Shell');

    const agentCardRes = await makeRequest(server, 'GET', '/.well-known/agent-card.json');
    expect(agentCardRes.status).toBe(404);
    expect(agentCardRes.headers['content-type']).toContain('application/json');
    expect(agentCardRes.body).not.toContain('Desktop Shell');
  });
});
