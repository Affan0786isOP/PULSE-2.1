import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Assessments } from '../../src/components/Assessments';

describe('Assessments Hub Page Redesign', () => {
  beforeEach(() => {
    document.title = '';
    const metas = document.querySelectorAll('meta, link, script#pulse-seo-jsonld');
    metas.forEach(el => el.remove());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all five canonical assessment protocols with truthful badges', () => {
    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Assessments onNavigate={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Visual Reaction')).toBeDefined();
    expect(screen.getByText('Directional Choice')).toBeDefined();
    expect(screen.getByText('Colour Recognition')).toBeDefined();
    expect(screen.getByText('Block Memory')).toBeDefined();
    expect(screen.getByText('Number Memory')).toBeDefined();

    expect(screen.getByText('TEST 01')).toBeDefined();
    expect(screen.getByText('TEST 02')).toBeDefined();
    expect(screen.getByText('TEST 03')).toBeDefined();
    expect(screen.getByText('TEST 04')).toBeDefined();
    expect(screen.getByText('TEST 05')).toBeDefined();
  });

  it('triggers onNavigate with canonical protocol ID when an assessment card is clicked', () => {
    const onNavigateMock = vi.fn();
    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Assessments onNavigate={onNavigateMock} />
      </MemoryRouter>
    );

    const reactionCard = screen.getByText('Visual Reaction').closest('button');
    expect(reactionCard).toBeDefined();
    fireEvent.click(reactionCard!);

    expect(onNavigateMock).toHaveBeenCalledWith('reaction-test');
  });

  it('renders secondary outline action buttons (Try [Protocol]) on available assessment cards', () => {
    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Assessments onNavigate={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Try Visual Reaction')).toBeDefined();
    expect(screen.getByText('Try Directional Choice')).toBeDefined();
    expect(screen.getByText('Try Colour Recognition')).toBeDefined();
    expect(screen.getByText('Try Block Memory')).toBeDefined();
    expect(screen.getByText('Try Number Memory')).toBeDefined();
  });

  it('ensures single accessible main landmark via PageShell integration', () => {
    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Assessments onNavigate={vi.fn()} />
      </MemoryRouter>
    );

    const mainLandmarks = screen.getAllByRole('main');
    expect(mainLandmarks).toHaveLength(1);
    expect(mainLandmarks[0].id).toBe('main-content');
  });
});
