import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Set PULSE_AUDIT_APP_ROOT to audit another checkout (e.g. the pre-cleanup baseline)
// while using this shared runner from the current branch.
const repoRoot = path.resolve(process.env.PULSE_AUDIT_APP_ROOT || scriptRoot);
const defaultPort = 4317;

function normalizeRoutePath(route) {
  if (!route.startsWith('/')) route = '/' + route;
  if (route.length > 1) route = route.replace(/\/+$/, '');
  return route || '/';
}

function pathsFromApp(source) {
  return [...source.matchAll(/<Route\b[^>]*\bpath=["']([^"']+)["'][^>]*>/g)]
    .map((match) => match[1])
    .filter((route) => route && !route.includes('*') && !route.includes(':'))
    .map(normalizeRoutePath);
}

function pathsFromRegistry(source) {
  const paths = [...source.matchAll(/\bpath:\s*'([^']+)'/g)].map((match) => match[1]);
  const aliasBlocks = [...source.matchAll(/\baliases:\s*\[([^\]]*)\]/g)];
  for (const block of aliasBlocks) {
    paths.push(...[...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]));
  }
  return paths.map(normalizeRoutePath);
}

async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => {
      probe.close((error) => error ? reject(error) : resolve());
    });
  });
}

async function waitForServer(server, healthUrl, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'health endpoint not ready';

  while (Date.now() < deadline) {
    if (server.spawnError) throw server.spawnError;
    if (server.child.exitCode !== null) {
      throw new Error('Audit server exited early (code ' + server.child.exitCode + '): ' + server.logs.join('').slice(-2000));
    }

    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.status === 'ok') return;
        lastError = 'unexpected health payload: ' + JSON.stringify(payload);
      } else {
        lastError = 'health endpoint returned HTTP ' + response.status;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error('Audit server did not become healthy at ' + healthUrl + ': ' + lastError);
}

async function stopServer(server) {
  if (!server?.child || server.child.exitCode !== null) return;
  await new Promise((resolve) => {
    const child = server.child;
    let finished = false;
    let timer;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve();
    };
    child.once('exit', finish);
    child.kill('SIGTERM');
    timer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      finish();
    }, 2500);
    timer.unref?.();
  });
}

function safeFilename(route) {
  return route === '/' ? 'home' : route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function attachTelemetry(page, surface, telemetry, expectedOrigin) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      telemetry.consoleErrors.push({ surface, url: page.url(), message: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    telemetry.pageErrors.push({ surface, url: page.url(), message: error.message });
  });
  page.on('requestfailed', (request) => {
    telemetry.failedRequests.push({
      surface,
      url: page.url(),
      requestUrl: request.url(),
      error: request.failure()?.errorText ?? 'unknown request failure',
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      const errorRecord = {
        surface,
        url: page.url(),
        requestUrl: response.url(),
        status: response.status(),
        resourceType: response.request().resourceType(),
      };
      telemetry.httpErrors.push(errorRecord);
      // Same-origin document/JS/CSS failures can leave a seemingly captured but broken SPA.
      try {
        if (new URL(response.url()).origin === expectedOrigin &&
            ['document', 'script', 'stylesheet'].includes(errorRecord.resourceType)) {
          telemetry.fatalHttpErrors.push(errorRecord);
        }
      } catch {
        // Invalid resource URLs remain in the ordinary telemetry only.
      }
    }
  });
}

async function captureRoute(page, surface, route, baseUrl, outputDir, telemetry) {
  const routeUrl = surface === 'desktop'
    ? baseUrl + route
    : baseUrl + '/mobile' + (route === '/' ? '/' : route);
  const screenshotPath = path.join(outputDir, surface + '_' + safeFilename(route) + '.png');
  const result = { surface, route, url: routeUrl, screenshot: path.relative(repoRoot, screenshotPath), ok: false };

  try {
    const response = await page.goto(routeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    result.status = response?.status() ?? null;
    if (response && response.status() >= 400) {
      throw new Error('Document navigation returned HTTP ' + response.status());
    }

    // Let lazy chunks, data requests, and fonts settle; never depend on networkidle alone.
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready.then(() => true) ?? Promise.resolve(true));
    await page.waitForFunction(
      () => !/Loading (?:Module|Mobile Experience)\.\.\./.test(document.body?.innerText ?? ''),
      undefined,
      { timeout: 10000 },
    ).catch(() => {});

    const pageState = await page.evaluate(() => {
      const bodyText = document.body?.innerText?.trim() ?? '';
      const isLoading = /Loading (?:Module|Mobile Experience)\.\.\./.test(bodyText);
      const isErrorBoundary = bodyText.includes('Something went wrong') && bodyText.includes('PULSE encountered an error');
      const isNotFoundPage = /\b404\b/.test(bodyText) && /Page not found/i.test(bodyText);
      return { hasContent: bodyText.length > 0, isLoading, isErrorBoundary, isNotFoundPage, title: document.title, bodyText: bodyText.slice(0, 240) };
    });
    result.title = pageState.title;
    result.errorBoundary = pageState.isErrorBoundary;
    result.ready = pageState.hasContent && !pageState.isLoading && !pageState.isErrorBoundary;
    if (route === '/__audit_not_found__' && !pageState.isNotFoundPage) {
      throw new Error('Not-found probe did not render the expected 404 page: ' + JSON.stringify(pageState));
    }
    if (!result.ready) {
      throw new Error('Route did not reach a content-ready state: ' + JSON.stringify(pageState));
    }

    await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });
    result.ok = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    telemetry.captureFailures.push(result);
    // Keep a diagnostic image when navigation still left a renderable page behind.
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });
      result.diagnosticScreenshotCaptured = true;
    } catch {
      result.diagnosticScreenshotCaptured = false;
    }
  }

  telemetry.routes.push(result);
  console.log((result.ok ? 'Captured' : 'FAILED') + ' [' + surface + '] ' + route + (result.error ? ' — ' + result.error : ''));
  return result;
}

async function captureSettingsModal(page, surface, baseUrl, outputDir, telemetry) {
  const homeUrl = surface === 'desktop' ? baseUrl + '/' : baseUrl + '/mobile/';
  try {
    await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});

    // A clean mobile context presents the first-run Welcome dialog, which blocks Settings.
    // Dismiss only that onboarding dialog; retain the normal fresh-user state in route captures.
    const welcomeDialog = page.getByRole('dialog').filter({ hasText: /Welcome to PULSE/i }).first();
    if (await welcomeDialog.count() > 0) {
      const welcomeClose = welcomeDialog.getByRole('button', { name: /^close(?: dialog)?$/i }).first();
      if (await welcomeClose.count() === 0) {
        throw new Error('Welcome dialog is open but has no accessible Close button');
      }
      await welcomeClose.click({ timeout: 4000 });
      await welcomeDialog.waitFor({ state: 'hidden', timeout: 4000 });
    }

    const settingsButton = page.getByRole('button', { name: /settings/i }).first();
    if (await settingsButton.count() === 0) {
      const failure = { surface, route: '/ (settings modal)', error: 'No accessible Settings button found' };
      telemetry.captureFailures.push(failure);
      telemetry.interactions.push({ surface, interaction: 'settings modal', ok: false, error: failure.error });
      console.error('FAILED [' + surface + '] settings modal: ' + failure.error);
      return;
    }

    await settingsButton.click({ timeout: 4000 });
    await page.locator('[role="dialog"]').first().waitFor({ state: 'visible', timeout: 5000 });
    const file = path.join(outputDir, surface + '_modal_settings.png');
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
    telemetry.interactions.push({
      surface,
      interaction: 'settings modal',
      screenshot: path.relative(repoRoot, file),
      ok: true,
    });
    console.log('Captured [' + surface + '] settings modal');
  } catch (error) {
    telemetry.interactions.push({
      surface,
      interaction: 'settings modal',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    telemetry.captureFailures.push({
      surface,
      route: '/ (settings modal)',
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('FAILED [' + surface + '] settings modal: ' + (error instanceof Error ? error.message : String(error)));
  }
}

export async function runAudit(mode) {
  if (!['before', 'after'].includes(mode)) throw new Error('Unknown screenshot mode: ' + mode);

  const port = Number(process.env.PULSE_AUDIT_PORT || defaultPort);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('PULSE_AUDIT_PORT must be an available TCP port between 1024 and 65535.');
  }

  const outputDir = path.resolve(
    process.env.PULSE_AUDIT_SCREENSHOT_DIR || path.join(repoRoot, 'artifacts', 'screenshots', mode),
  );
  const serverPath = path.join(repoRoot, 'dist', 'server.js');
  await access(serverPath).catch(() => {
    throw new Error('dist/server.js is missing. Run npm run build immediately before capturing screenshots.');
  });

  const [desktopApp, mobileApp, routeRegistry] = await Promise.all([
    readFile(path.join(repoRoot, 'src', 'App.tsx'), 'utf8'),
    readFile(path.join(repoRoot, 'mobile', 'src', 'App.tsx'), 'utf8'),
    readFile(path.join(repoRoot, 'shared', 'registries', 'routeRegistry.ts'), 'utf8'),
  ]);

  const registryRoutes = pathsFromRegistry(routeRegistry);
  const desktopDeclaredRoutes = [...new Set(pathsFromApp(desktopApp).filter((route) => !route.startsWith('/mobile')))];
  const mobileDeclaredRoutes = [...new Set(pathsFromApp(mobileApp).filter((route) => !route.startsWith('/mobile')))];
  const routeRegistryMismatches = [
    ...registryRoutes.filter((route) => !desktopDeclaredRoutes.includes(route)).map((route) => ({
      surface: 'desktop', route, error: 'Route registry declares this path/alias, but the desktop SPA has no matching Route declaration',
    })),
    ...registryRoutes.filter((route) => !mobileDeclaredRoutes.includes(route)).map((route) => ({
      surface: 'mobile', route, error: 'Route registry declares this path/alias, but the mobile SPA has no matching Route declaration',
    })),
  ];
  const desktopRoutes = [...new Set([
    ...desktopDeclaredRoutes,
    ...registryRoutes,
    '/__audit_not_found__',
  ])].sort();
  const mobileRoutes = [...new Set([
    ...mobileDeclaredRoutes,
    ...registryRoutes,
    '/__audit_not_found__',
  ])].sort();

  const telemetry = {
    mode,
    generatedAt: new Date().toISOString(),
    baseCommitHint: process.env.GITHUB_SHA || null,
    port,
    outputDir: path.relative(repoRoot, outputDir),
    viewports: { desktop: { width: 1280, height: 800 }, mobile: 'Playwright Pixel 5 profile' },
    routeSources: ['src/App.tsx', 'mobile/src/App.tsx', 'shared/registries/routeRegistry.ts'],
    discoveredRouteCounts: { desktop: desktopRoutes.length, mobile: mobileRoutes.length },
    routeRegistryMismatches,
    routes: [],
    interactions: [],
    skippedInteractions: [],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    httpErrors: [],
    fatalHttpErrors: [],
    captureFailures: routeRegistryMismatches.map((mismatch) => ({ ...mismatch, type: 'route-registry-mismatch' })),
  };
  for (const mismatch of routeRegistryMismatches) {
    console.error('ROUTE REGISTRY MISMATCH [' + mismatch.surface + '] ' + mismatch.route + ': ' + mismatch.error);
  }

  let server;
  let browser;
  let runError = null;

  try {
    await mkdir(outputDir, { recursive: true });
    // Fail fast rather than accidentally reusing an unrelated app already listening on this port.
    await assertPortAvailable(port);
    const child = spawn('node', [serverPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'production',
        VERCEL: '',
        VERCEL_ENV: '',
        NOW_REGION: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server = { child, logs: [], spawnError: null };
    child.on('error', (error) => { server.spawnError = error; });
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        server.logs.push(chunk);
        if (server.logs.join('').length > 8000) server.logs.splice(0, 2);
      });
    }

    const baseUrl = 'http://127.0.0.1:' + port;
    await waitForServer(server, baseUrl + '/api/health');
    console.log('Audit server healthy at ' + baseUrl);
    const expectedOrigin = new URL(baseUrl).origin;

    browser = await chromium.launch({ headless: true });
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const desktopPage = await desktopContext.newPage();
    attachTelemetry(desktopPage, 'desktop', telemetry, expectedOrigin);
    for (const route of desktopRoutes) {
      await captureRoute(desktopPage, 'desktop', route, baseUrl, outputDir, telemetry);
    }
    await captureSettingsModal(desktopPage, 'desktop', baseUrl, outputDir, telemetry);
    await desktopContext.close();

    const mobileContext = await browser.newContext({
      ...devices['Pixel 5'],
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    attachTelemetry(mobilePage, 'mobile', telemetry, expectedOrigin);
    for (const route of mobileRoutes) {
      await captureRoute(mobilePage, 'mobile', route, baseUrl, outputDir, telemetry);
    }
    await captureSettingsModal(mobilePage, 'mobile', baseUrl, outputDir, telemetry);
    await mobileContext.close();
  } catch (error) {
    runError = error instanceof Error ? error.message : String(error);
    console.error('Audit run failed: ' + runError);
  } finally {
    await browser?.close().catch(() => {});
    await stopServer(server);
    await mkdir(outputDir, { recursive: true }).catch(() => {});
    telemetry.runError = runError;
    telemetry.summary = {
      routeCaptures: telemetry.routes.filter((route) => route.ok).length,
      routeFailures: telemetry.captureFailures.length,
      routeRegistryMismatches: telemetry.routeRegistryMismatches.length,
      pageErrors: telemetry.pageErrors.length,
      consoleErrors: telemetry.consoleErrors.length,
      httpErrorResponses: telemetry.httpErrors.length,
      fatalSameOriginResourceErrors: telemetry.fatalHttpErrors.length,
      failedRequests: telemetry.failedRequests.length,
    };
    const telemetryPath = path.join(outputDir, 'telemetry.json');
    await writeFile(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8').catch((error) => {
      console.error('Could not write telemetry: ' + (error instanceof Error ? error.message : String(error)));
      runError = runError || 'Could not write telemetry.json';
    });
    console.log('Audit summary: ' + JSON.stringify(telemetry.summary));
    console.log('Telemetry: ' + path.relative(repoRoot, telemetryPath));
  }

  // Captured route/navigation failures or uncaught page errors must fail the command.
  return runError || telemetry.captureFailures.length > 0 || telemetry.pageErrors.length > 0 || telemetry.fatalHttpErrors.length > 0 ? 1 : 0;
}
