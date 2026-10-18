import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DatasetComingSoon } from '../../src/components/DatasetComingSoon';
import { Improve } from '../../src/components/Improve';

describe('Dataset and Improve Light System Migration', () => {
  beforeEach(() => {
    localStorage.clear();
    document.title = '';
    const metas = document.querySelectorAll('meta, link, script#pulse-seo-jsonld');
    metas.forEach(el => el.remove());
  });

  afterEach(() => {
    cleanup();
  });

  describe('Dataset Coming Soon', () => {
    it('renders truthful coming-soon messaging and navigation to assessments', () => {
      render(
        <MemoryRouter initialEntries={['/dataset']}>
          <DatasetComingSoon />
        </MemoryRouter>
      );

      expect(screen.getByText('PUBLIC RESEARCH DATASET — COMING SOON')).toBeDefined();
      expect(screen.getByText('Explore Assessments')).toBeDefined();

      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');
    });
  });

  describe('Improve Performance Guide', () => {
    it('renders physiological factors, checklist, and research findings', () => {
      render(
        <MemoryRouter initialEntries={['/improve']}>
          <Improve onNavigate={vi.fn()} />
        </MemoryRouter>
      );

      expect(screen.getByText('Performance & Consistency')).toBeDefined();
      expect(screen.getByText('What affects measured reaction time?')).toBeDefined();
      expect(screen.getAllByText('Preparation checklist').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Research findings').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Can you improve your results?')).toBeDefined();

      const mainLandmarks = screen.getAllByRole('main');
      expect(mainLandmarks).toHaveLength(1);
      expect(mainLandmarks[0].id).toBe('main-content');
    });

    it('toggles preparation checklist items and supports reset', () => {
      render(
        <MemoryRouter initialEntries={['/improve']}>
          <Improve onNavigate={vi.fn()} />
        </MemoryRouter>
      );

      // Find first checkbox habit
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      const firstCheckbox = checkboxes[0];
      expect(firstCheckbox.getAttribute('aria-checked')).toBe('false');

      // Click to toggle
      fireEvent.click(firstCheckbox);
      expect(firstCheckbox.getAttribute('aria-checked')).toBe('true');

      // Reset button appears
      const resetBtn = screen.getByRole('button', { name: /reset checklist/i });
      expect(resetBtn).toBeDefined();

      fireEvent.click(resetBtn);
      expect(firstCheckbox.getAttribute('aria-checked')).toBe('false');
    });
  });
});
