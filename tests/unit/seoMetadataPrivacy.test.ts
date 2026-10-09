import { describe, it, expect } from 'vitest';
import metadata from '../../shared/seoMetadata.json';

describe('SEO metadata consistency and privacy', () => {
  it('omits public repository references from site metadata', () => {
    expect((metadata.site as Record<string, unknown>).repository).toBeUndefined();
  });

  it('uses grounded timing wording in site description without open-source claims', () => {
    expect(metadata.site.description).not.toContain('open-source');
    expect(metadata.site.description).toContain('millisecond-resolution timing');
  });

  it('uses target keyword and grounded display refresh wording for /reaction-test', () => {
    const reactionRoute = metadata.routes['/reaction-test'];
    expect(reactionRoute.title).toBe('Reaction Time Test | Visual Reaction Test | PULSE');
    expect(reactionRoute.description).toContain('estimated display refresh adjustment');
  });

  it('has consistent metadata titles for all assessment routes', () => {
    expect(metadata.routes['/direction-test'].title).toBe('Directional Choice Test: Response Speed | PULSE');
    expect(metadata.routes['/colour-recognition'].title).toBe('Colour Recognition Test: Stroop Task | PULSE');
    expect(metadata.routes['/block-memory'].title).toBe('Block Memory Test: Spatial Sequence Recall | PULSE');
    expect(metadata.routes['/number-memory'].title).toBe('Number Memory Test: Forward Digit Recall | PULSE');
  });
});
