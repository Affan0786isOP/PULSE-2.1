import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Assessments } from '../../mobile/src/components/Assessments';

describe('Mobile Assessments Hub Laboratory Light', () => {
  it('renders all 5 protocols with light card surfaces and protocol numbers', () => {
    const { container } = render(
      <MemoryRouter>
        <Assessments onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('PROTOCOL 01')).toBeDefined();
    expect(screen.getByText('PROTOCOL 05')).toBeDefined();
    expect(screen.getByText('Visual Reaction')).toBeDefined();
    expect(screen.getByText('Number Memory')).toBeDefined();
    // Protocol cards are inside the motion list container
    const card = screen.getByText('Visual Reaction').closest('button');
    expect(card).not.toBeNull();
    expect(card?.className).toContain('bg-white');
    expect(card?.className).toContain('border-slate-200/80');
  });
});
