import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';
import { SEO, getCanonicalPath } from '../SEO';
import { DesktopWaveGraphic } from '../home/DesktopWaveGraphic';
import { LeaderboardSideWaves } from '../leaderboard/LeaderboardSideWaves';
import seoMetadata from '../../../shared/seoMetadata.json';

export interface PageShellProps {
  children: React.ReactNode;
  currentView: string;
  customTitle?: string;
  customDescription?: string;
  schema?: Record<string, any>;
  noindex?: boolean;
  canonicalUrl?: string;
  onNavigate?: (view: string) => void;
  onBack?: () => void;
  isAssessmentActive?: boolean;
  decorativeWaves?: 'bottom' | 'side' | 'none';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | 'full';
  showNavbar?: boolean;
  showFooter?: boolean;
  theme?: 'light' | 'dark-apparatus';
  contentClassName?: string;
  style?: React.CSSProperties;
}

const MAX_WIDTH_MAP: Record<string, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-full',
};

export const PageShell: React.FC<PageShellProps> = ({
  children,
  currentView,
  customTitle,
  customDescription,
  schema,
  noindex,
  canonicalUrl,
  onNavigate,
  onBack,
  isAssessmentActive,
  decorativeWaves = 'none',
  maxWidth,
  showNavbar = true,
  showFooter = true,
  theme = 'light',
  contentClassName = '',
  style,
}) => {
  const location = useLocation();

  // Register shell as authoritative SEO owner before any useEffect runs
  useLayoutEffect(() => {
    let meta = document.querySelector('meta[data-seo-owner="shell"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'pulse-seo-owner');
      meta.setAttribute('content', 'shell');
      meta.setAttribute('data-seo-owner', 'shell');
      document.head.appendChild(meta);
    }
    return () => {
      meta?.remove();
    };
  }, []);

  const canonicalPath = getCanonicalPath(location.pathname);
  const routeMeta = (seoMetadata.routes as Record<string, { title: string; description: string; indexable: boolean }>)[canonicalPath];

  const title = customTitle || routeMeta?.title || 'PULSE';
  const description = customDescription || routeMeta?.description || 'Precision User Latency & Stimulus Evaluator';
  const effectiveNoindex = noindex !== undefined ? noindex : (routeMeta ? !routeMeta.indexable : false);

  const isDarkApparatus = theme === 'dark-apparatus';
  const maxWidthClass = maxWidth 
    ? MAX_WIDTH_MAP[maxWidth] || 'max-w-[1440px] min-[2560px]:max-w-[1800px]'
    : 'max-w-[1440px] min-[2560px]:max-w-[1800px]';

  return (
    <div
      data-theme={isDarkApparatus ? 'dark' : 'light'}
      style={style}
      className={`min-h-[100dvh] w-full font-sans overflow-x-hidden relative flex flex-col ${
        isDarkApparatus
          ? 'bg-[#12161B] text-white selection:bg-[#0066FF]/30'
          : 'bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] text-[#090D1A] selection:bg-[#0066FF]/20'
      }`}
    >
      {/* Skip to Main Content Landmark */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[#0066FF] focus:text-white focus:font-semibold focus:text-xs focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF]/60"
      >
        Skip to main content
      </a>

      {/* Authoritative Single-Owner SEO */}
      <SEO
        title={title}
        description={description}
        canonicalUrl={canonicalUrl}
        noindex={effectiveNoindex}
        schema={schema}
      />

      {/* Decorative Wave & Dot Grid Primitives */}
      {decorativeWaves === 'side' ? (
        <LeaderboardSideWaves />
      ) : (
        <>
          {!isDarkApparatus && (
            <div
              className="absolute inset-0 pointer-events-none select-none z-0 opacity-40"
              style={{
                backgroundImage: 'radial-gradient(rgba(0, 102, 255, 0.12) 1.2px, transparent 1.2px)',
                backgroundSize: '36px 36px',
              }}
              aria-hidden="true"
            />
          )}
          {decorativeWaves === 'bottom' && <DesktopWaveGraphic />}
        </>
      )}

      {/* Navigation Bar */}
      {showNavbar && (
        <div className={isDarkApparatus ? 'w-full bg-white border-b border-slate-200/80 shadow-xs relative z-30' : 'w-full'}>
          <Navbar
            currentView={currentView}
            onNavigate={onNavigate}
            onBack={isAssessmentActive ? onBack : undefined}
            isAssessmentActive={isAssessmentActive}
            theme="light"
          />
        </div>
      )}

      {/* Single Accessible Main Landmark */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`w-full ${maxWidthClass} mx-auto flex-1 flex flex-col relative z-10 focus-visible:outline-none ${contentClassName}`}
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {children}
      </main>

      {/* Conditional Footer */}
      {showFooter && (
        <div className={isDarkApparatus ? 'w-full bg-white border-t border-slate-200/80 relative z-20' : 'w-full'}>
          <Footer />
        </div>
      )}
    </div>
  );
};
