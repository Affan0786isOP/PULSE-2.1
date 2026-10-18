import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Home } from '../../src/components/Home';
import { About } from '../../src/components/About';
import { Assessments } from '../../src/components/Assessments';
import { Leaderboard } from '../../src/components/Leaderboard';
import { ReactionTest } from '../../src/components/ReactionTest';
import { DirectionTest } from '../../src/components/DirectionTest';
import { ColorTest } from '../../src/components/ColorTest';
import { BlockMemoryTest } from '../../src/components/BlockMemoryTest';
import { NumberMemoryTest } from '../../src/components/NumberMemoryTest';
import { DatasetComingSoon } from '../../src/components/DatasetComingSoon';
import { Improve } from '../../src/components/Improve';
import { ResearchPrivacyPolicy } from '../../src/components/ResearchPrivacyPolicy';
import { Navbar } from '../../src/components/Navbar';
import { PageShell } from '../../src/components/layout/PageShell';

describe('All Routes Smoke Test - No Null useContext Errors', () => {
  const noop = () => {};

  it('renders Navbar on home and subroutes without throwing', () => {
    expect(() => render(<MemoryRouter><Navbar currentView="home" /></MemoryRouter>)).not.toThrow();
    expect(() => render(<MemoryRouter><Navbar currentView="assessments" /></MemoryRouter>)).not.toThrow();
    expect(() => render(<MemoryRouter><Navbar currentView="reaction-test" isAssessmentActive={true} onBack={noop} /></MemoryRouter>)).not.toThrow();
  });

  it('renders PageShell without throwing', () => {
    expect(() => render(<MemoryRouter><PageShell currentView="home"><div>Content</div></PageShell></MemoryRouter>)).not.toThrow();
    expect(() => render(<MemoryRouter><PageShell currentView="assessments" theme="light"><div>Content</div></PageShell></MemoryRouter>)).not.toThrow();
    expect(() => render(<MemoryRouter><PageShell currentView="reaction-test" theme="dark-apparatus"><div>Content</div></PageShell></MemoryRouter>)).not.toThrow();
  });

  it('renders Home without throwing', () => {
    expect(() => render(<MemoryRouter><Home /></MemoryRouter>)).not.toThrow();
  });

  it('renders About without throwing', () => {
    expect(() => render(<MemoryRouter><About onNavigate={noop} /></MemoryRouter>)).not.toThrow();
  });

  it('renders Assessments without throwing', () => {
    expect(() => render(<MemoryRouter><Assessments onNavigate={noop} /></MemoryRouter>)).not.toThrow();
  });

  it('renders Leaderboard without throwing', () => {
    expect(() => render(<MemoryRouter><Leaderboard onNavigate={noop} /></MemoryRouter>)).not.toThrow();
  });

  it('renders DatasetComingSoon without throwing', () => {
    expect(() => render(<MemoryRouter><DatasetComingSoon /></MemoryRouter>)).not.toThrow();
  });

  it('renders Improve without throwing', () => {
    expect(() => render(<MemoryRouter><Improve onNavigate={noop} /></MemoryRouter>)).not.toThrow();
  });

  it('renders ResearchPrivacyPolicy without throwing', () => {
    expect(() => render(<MemoryRouter><ResearchPrivacyPolicy onNavigate={noop} /></MemoryRouter>)).not.toThrow();
  });

  it('renders all 5 cognitive assessment engines without throwing', () => {
    expect(() => render(<MemoryRouter><ReactionTest onNavigate={noop} /></MemoryRouter>)).not.toThrow();
    expect(() => render(<MemoryRouter><DirectionTest onNavigate={noop} /></MemoryRouter>)).not.toThrow();
    expect(() => render(<MemoryRouter><ColorTest onNavigate={noop} /></MemoryRouter>)).not.toThrow();
    expect(() => render(<MemoryRouter><BlockMemoryTest onNavigate={noop} /></MemoryRouter>)).not.toThrow();
    expect(() => render(<MemoryRouter><NumberMemoryTest onNavigate={noop} /></MemoryRouter>)).not.toThrow();
  });
});
