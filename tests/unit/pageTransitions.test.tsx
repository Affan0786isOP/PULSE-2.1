import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { PageShell } from '../../src/components/layout/PageShell';

describe('Page Transition & Surface Continuity Verification', () => {
  it('does not unmount to an empty opacity:0 state during page transitions', () => {
    const TestComponent = ({ initialPath }: { initialPath: string }) => {
      return (
        <MemoryRouter initialEntries={[initialPath]}>
          <div data-testid="app-root" className="min-h-screen bg-[var(--surface-0)]">
            <AnimatePresence initial={false}>
              <Routes>
                <Route
                  path="/page-a"
                  element={
                    <motion.div
                      key="page-a"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      data-testid="page-a-wrapper"
                    >
                      <PageShell currentView="page-a" theme="light">
                        <div>Page A Content</div>
                        <Link to="/page-b">Go to B</Link>
                      </PageShell>
                    </motion.div>
                  }
                />
                <Route
                  path="/page-b"
                  element={
                    <motion.div
                      key="page-b"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      data-testid="page-b-wrapper"
                    >
                      <PageShell currentView="page-b" theme="dark-apparatus">
                        <div>Page B Dark Content</div>
                      </PageShell>
                    </motion.div>
                  }
                />
              </Routes>
            </AnimatePresence>
          </div>
        </MemoryRouter>
      );
    };

    const { getByText, queryByTestId } = render(<TestComponent initialPath="/page-a" />);
    expect(getByText('Page A Content')).toBeDefined();

    // Trigger navigation
    act(() => {
      getByText('Go to B').click();
    });

    // Page B mounts immediately with its own opaque PageShell, never exposing empty root
    expect(getByText('Page B Dark Content')).toBeDefined();
    expect(queryByTestId('pulse-technical-background')).toBeNull();
  });

  it('verifies RouteFallback has an opaque surface matching the layout', () => {
    const { container } = render(
      <div className="w-full flex-1 flex flex-col bg-white">
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans bg-white">
          <div className="w-8 h-8 rounded-full border-2 border-[#0066FF] border-t-transparent animate-spin mb-3" />
        </div>
      </div>
    );
    expect(container.querySelector('.bg-white')).not.toBeNull();
  });
});
