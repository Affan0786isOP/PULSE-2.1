import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgeSelection } from '../../mobile/src/components/AgeSelection';

describe('Mobile Age Selection Laboratory Light', () => {
  it('renders age cohort buttons on light gradient background', () => {
    const { container } = render(
      <AgeSelection onSelect={() => {}} onCancel={() => {}} assessmentId="visual-reaction" />
    );
    expect(screen.getByText('Young Adults')).toBeDefined();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('bg-gradient-to-b');
    expect(root.className).toContain('text-[#090D1A]');
  });
});
