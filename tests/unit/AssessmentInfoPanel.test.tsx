import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AssessmentInfoPanel } from '../../src/components/AssessmentInfoPanel';

describe('AssessmentInfoPanel', () => {
  it('keeps the information trigger disabled during an active assessment', () => {
    render(<AssessmentInfoPanel assessmentId="visual-reaction" isAssessmentActive={true} />);
    const trigger = screen.getByRole('button', { name: 'About this assessment and methodology' });
    expect(trigger).toBeDisabled();
  });

  it('opens and closes accessibly without duplicating the article', () => {
    render(<AssessmentInfoPanel assessmentId="visual-reaction" isAssessmentActive={false} />);
    const trigger = screen.getByRole('button', { name: 'About this assessment and methodology' });
    const panel = screen.getByRole('complementary');

    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveAttribute('inert');
    expect(document.querySelectorAll('article#assessment-seo-article')).toHaveLength(1);

    fireEvent.click(trigger);

    expect(panel).toHaveAttribute('aria-hidden', 'false');
    expect(panel).not.toHaveAttribute('inert');
    expect(screen.getByRole('heading', { name: 'Reaction Time Test' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(trigger).toHaveFocus();
    expect(document.querySelectorAll('article#assessment-seo-article')).toHaveLength(1);
  });
});
