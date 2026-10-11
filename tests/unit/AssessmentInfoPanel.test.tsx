import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssessmentInfoPanel } from '../../src/components/AssessmentInfoPanel';

describe('AssessmentInfoPanel Dialog Component', () => {
  it('renders with semantic dialog attributes', () => {
    render(
      <AssessmentInfoPanel
        route="/reaction-test"
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('assessment-info-title');
    expect(dialog.getAttribute('id')).toBe('assessment-info-panel');
    expect(dialog.classList.contains('pulse-light-modal')).toBe(true);
  });

  it('has inert and aria-hidden="true" when closed', () => {
    const { container } = render(
      <AssessmentInfoPanel
        route="/reaction-test"
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    const dialog = container.querySelector('#assessment-info-panel');
    expect(dialog?.hasAttribute('inert')).toBe(true);
    expect(dialog?.getAttribute('aria-hidden')).toBe('true');
  });

  it('removes inert and sets aria-hidden="false" when open', () => {
    const { container } = render(
      <AssessmentInfoPanel
        route="/reaction-test"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const dialog = container.querySelector('#assessment-info-panel');
    expect(dialog?.hasAttribute('inert')).toBe(false);
    expect(dialog?.getAttribute('aria-hidden')).toBe('false');
  });

  it('uses heading hierarchy H2 -> H3 -> H4 inside drawer to protect page H1', () => {
    render(
      <AssessmentInfoPanel
        route="/reaction-test"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    // Dialog title must be H2
    const h2Title = screen.getByRole('heading', { level: 2, name: /visual reaction time test/i });
    expect(h2Title).toBeDefined();
    expect(h2Title.getAttribute('id')).toBe('assessment-info-title');

    // Section headings must be H3
    const h3Sections = screen.getAllByRole('heading', { level: 3 });
    expect(h3Sections.length).toBeGreaterThan(0);

    // FAQ questions must be H4
    const h4Faqs = screen.getAllByRole('heading', { level: 4 });
    expect(h4Faqs.length).toBeGreaterThan(0);

    // No H1 must exist inside the drawer
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('renders real crawlable <a href="..."> links for related resources', () => {
    const { container } = render(
      <AssessmentInfoPanel
        route="/reaction-test"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const links = container.querySelectorAll('#related-resources a');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^\//);
    }
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <AssessmentInfoPanel
        route="/reaction-test"
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});


  it('traps Tab focus inside the dialog and restores focus to the opener on close', () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open info';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender, container, unmount } = render(
      <AssessmentInfoPanel route="/reaction-test" isOpen={false} onClose={vi.fn()} />
    );

    rerender(
      <AssessmentInfoPanel route="/reaction-test" isOpen={true} onClose={vi.fn()} />
    );

    const dialog = container.querySelector('#assessment-info-panel') as HTMLElement;
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    expect(focusables.length).toBeGreaterThan(1);

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    rerender(
      <AssessmentInfoPanel route="/reaction-test" isOpen={false} onClose={vi.fn()} />
    );
    expect(document.activeElement).toBe(opener);

    unmount();
    opener.remove();
  });
