import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Service Worker Tier 2 Caching', () => {
  const desktopSwPath = path.join(process.cwd(), 'public', 'sw.js');
  const mobileSwPath = path.join(process.cwd(), 'mobile', 'public', 'sw.js');

  const desktopSw = fs.readFileSync(desktopSwPath, 'utf8');
  const mobileSw = fs.readFileSync(mobileSwPath, 'utf8');

  it('uses isolated cache names with version 4', () => {
    expect(desktopSw).toContain("CACHE_NAME = 'pulse-pwa-v4'");
    expect(mobileSw).toContain("CACHE_NAME = 'pulse-mobile-pwa-v4'");
  });

  it('deletes only its own stale versioned caches and never deletes across namespaces', () => {
    // Desktop must only delete pulse-pwa- (and NOT pulse-mobile-pwa-)
    expect(desktopSw).toContain("key.startsWith('pulse-pwa-') && !key.startsWith('pulse-mobile-pwa-')");
    // Mobile must only delete pulse-mobile-pwa-
    expect(mobileSw).toContain("key.startsWith('pulse-mobile-pwa-')");
  });

  it('caches Google Fonts stylesheets and webfont binaries in a dedicated font cache', () => {
    expect(desktopSw).toContain('fonts.googleapis.com');
    expect(desktopSw).toContain('fonts.gstatic.com');
    expect(desktopSw).toContain('FONT_CACHE_NAME');

    expect(mobileSw).toContain('fonts.googleapis.com');
    expect(mobileSw).toContain('fonts.gstatic.com');
    expect(mobileSw).toContain('FONT_CACHE_NAME');
  });

  it('strictly excludes all /api and sensitive routes from service worker interception', () => {
    for (const sw of [desktopSw, mobileSw]) {
      expect(sw).toContain("url.pathname.startsWith('/api')");
      expect(sw).toContain("url.pathname.startsWith('/personal-best')");
      expect(sw).toContain("url.pathname.startsWith('/research')");
      expect(sw).toContain("url.pathname.startsWith('/admin')");
      expect(sw).toContain("url.pathname.startsWith('/sessions')");
      expect(sw).toContain("url.pathname.startsWith('/health')");
    }
  });

  it('never wipes or replaces active caches while a test assessment session is live', () => {
    // Desktop and mobile SW should query clients directly via MessageChannel for active session before takeover
    expect(desktopSw).toContain('QUERY_PULSE_SESSION_ACTIVE');
    expect(mobileSw).toContain('QUERY_PULSE_SESSION_ACTIVE');
    expect(desktopSw).toContain('checkAnyClientHasActiveSession');
    expect(mobileSw).toContain('checkAnyClientHasActiveSession');
  });

  it('strictly bypasses cross-origin requests to prevent caching external resources', () => {
    for (const sw of [desktopSw, mobileSw]) {
      expect(sw).toContain('url.origin !== self.location.origin');
    }
  });

  it('restricts runtime caching strictly to same-origin static assets', () => {
    for (const sw of [desktopSw, mobileSw]) {
      expect(sw).toContain('isStaticAsset');
      expect(sw).toContain("networkResponse.type === 'basic'");
    }
  });

  it('partitions entry and key route assets', () => {
    for (const sw of [desktopSw, mobileSw]) {
      expect(sw).toContain('BUILD_ENTRY_ASSETS');
      expect(sw).toContain('BUILD_KEY_ROUTE_ASSETS');
    }
  });

  it('races document navigation against a 3-second timeout and falls back to shell', () => {
    expect(desktopSw).toContain("reject(new Error('Navigation timeout')), 3000");
    expect(desktopSw).toContain("await caches.match('/')");
    expect(mobileSw).toContain("reject(new Error('Navigation timeout')), 3000");
    expect(mobileSw).toContain("await caches.match('/mobile/')");
  });

  it('allows and caches multimedia and animation assets offline', () => {
    for (const sw of [desktopSw, mobileSw]) {
      expect(sw).toContain('riv|mp3|wav|ogg|webm|mp4');
    }
  });
});
