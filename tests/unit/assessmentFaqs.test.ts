import { describe, it, expect } from 'vitest';
import assessmentContent from '../../shared/content/assessmentContent.json';

const ASSESSMENT_ROUTES = [
  '/reaction-test',
  '/direction-test',
  '/colour-recognition',
  '/block-memory',
  '/number-memory'
];

describe('Assessment FAQs Contract', () => {
  it.each(ASSESSMENT_ROUTES)('has exactly 4 well-structured FAQs for %s', (route) => {
    const data = (assessmentContent as Record<string, any>)[route];
    expect(data).toBeDefined();
    expect(Array.isArray(data.faq)).toBe(true);
    expect(data.faq).toHaveLength(4);

    data.faq.forEach((item: { question: string; answer: string }) => {
      expect(typeof item.question).toBe('string');
      expect(item.question.trim().length).toBeGreaterThan(5);
      expect(typeof item.answer).toBe('string');
      expect(item.answer.trim().length).toBeGreaterThan(15);
    });
  });
});
