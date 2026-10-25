import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../Navbar';
import { SEO, getCanonicalPath } from '../SEO';
import { DesktopWaveGraphic } from '../home/DesktopWaveGraphic';
import { LeaderboardSideWaves } from '../leaderboard/LeaderboardSideWaves';
import { useBaselineScale } from '../../lib/useBaselineScale';
import { useSystemTheme } from '../../lib/useSystemTheme';
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
  /** @deprecated The site-wide footer has been removed; retained for call-site compatibility. */
  showFooter?: boolean;
  theme?: 'light' | 'dark-apparatus' | 'dark';
  contentClassName?: string;
  disableScaling?: boolean;
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
  theme = 'light',
  contentClassName = '',
  disableScaling = false,
  style,
}) => {
  const location = useLocation();
  const { style: scaleStyle } = useBaselineScale();
  const effectiveStyle = disableScaling ? style : (scaleStyle ? { ...scaleStyle, ...style } : style);

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
  const effectiveNoindex = noindex !== undefined ? noindex : (routeMeta ? !routeMeta.indexable : true);

  const { activeTheme: globalActiveTheme, isDarkApparatus: isRouteApparatus } = useSystemTheme(location.pathname);
  const isDarkApparatus = theme === 'dark-apparatus' || isRouteApparatus;
  const effectiveTheme: 'dark' | 'light' = isDarkApparatus 
    ? 'dark' 
    : (theme === 'dark' ? 'dark' : globalActiveTheme);
  const maxWidthClass = maxWidth 
    ? MAX_WIDTH_MAP[maxWidth] || 'max-w-[1440px] min-[2560px]:max-w-[1800px]'
    : 'max-w-[1440px] min-[2560px]:max-w-[1800px]';

  return (
    <div
      data-theme={effectiveTheme}
      style={effectiveStyle}
      className={`min-h-[100dvh] w-full font-sans overflow-x-hidden relative flex flex-col ${
        isDarkApparatus
          ? 'bg-[#12161B] text-white selection:bg-[#0066FF]/30'
          : (effectiveTheme === 'dark'
              ? 'bg-[#0B0D10] text-[#F5F7FA] selection:bg-[#22C7D6]/30'
              : 'bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] text-[#090D1A] selection:bg-[#0066FF]/20')
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
        includeMobileAlternate={!(typeof window !== 'undefined' && window.location?.pathname?.startsWith('/mobile'))}
      />

      {/* Decorative Wave & Dot Grid Primitives */}
      {decorativeWaves === 'side' ? (
        <LeaderboardSideWaves theme={effectiveTheme} />
      ) : (
        <>
          {!isDarkApparatus && (
            <div
              className="absolute inset-0 pointer-events-none select-none z-0 opacity-40"
              style={{
                backgroundImage: effectiveTheme === 'dark'
                  ? 'radial-gradient(rgba(34, 199, 214, 0.08) 1.2px, transparent 1.2px)'
                  : 'radial-gradient(rgba(0, 102, 255, 0.12) 1.2px, transparent 1.2px)',
                backgroundSize: '36px 36px',
              }}
              aria-hidden="true"
            />
          )}
          {decorativeWaves === 'bottom' && <DesktopWaveGraphic theme={effectiveTheme} />}
        </>
      )}

      {/* Navigation Bar */}
      {showNavbar && (
        <div className="w-full">
          <Navbar
            currentView={currentView}
            onNavigate={onNavigate}
            onBack={isAssessmentActive ? onBack : undefined}
            isAssessmentActive={isAssessmentActive}
            theme={effectiveTheme}
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

    </div>
  );
};
