import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dataset } from '../../src/components/Dataset';

// Mock recharts ResponsiveContainer to avoid SVG size issues in jsdom
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

describe('Interactive Dataset Component', () => {
  const noop = () => {};

  it('renders research dataset explorer header and assessment switcher', () => {
    render(
      <MemoryRouter>
        <Dataset onNavigate={noop} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /dataset/i })).not.toBeNull();
    expect(screen.getByText(/VISUAL REACTION/i)).not.toBeNull();
    expect(screen.getByLabelText(/Select VISUAL REACTION/i)).not.toBeNull();
    expect(screen.getByLabelText(/Select DIRECTION/i)).not.toBeNull();
    expect(screen.getByLabelText(/Select COLOR TEST/i)).not.toBeNull();
    expect(screen.getByLabelText(/Select BLOCK MEMORY/i)).not.toBeNull();
    expect(screen.getByLabelText(/Select NUMBER MEMORY/i)).not.toBeNull();
  });
});
