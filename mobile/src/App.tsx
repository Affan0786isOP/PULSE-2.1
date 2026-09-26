import React from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { AuthProvider } from './AuthContext';
import { useSettings } from './lib/settingsStore';
import { useSystemTheme } from './lib/useSystemTheme';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Home } from './components/Home';

import { 
  evaluateDeviceRouting, 
  syncDeviceRoutingStorage,
  clearRedirectLoopGuard,
  resolveDeviceRedirect
} from './lib/deviceRouting';

function RedirectIndexHtml() {
  const location = useLocation();
  const search = location.search || '';
  const hash = location.hash || '';
  return <Navigate to={`/${search}${hash}`} replace />;
}

// Code-split heavy routes for fast Home startup
const Assessments = React.lazy(() => import('./components/Assessments').then(m => ({ default: m.Assessments })));
const Leaderboard = React.lazy(() => import('./components/Leaderboard').then(m => ({ default: m.Leaderboard })));
const ReactionTest = React.lazy(() => import('./components/ReactionTest').then(m => ({ default: m.ReactionTest })));
const DirectionTest = React.lazy(() => import('./components/DirectionTest').then(m => ({ default: m.DirectionTest })));
const BlockMemoryTest = React.lazy(() => import('./components/BlockMemoryTest').then(m => ({ default: m.BlockMemoryTest })));
const NumberMemoryTest = React.lazy(() => import('./components/NumberMemoryTest').then(m => ({ default: m.NumberMemoryTest })));
const ColorTest = React.lazy(() => import('./components/ColorTest').then(m => ({ default: m.ColorTest })));
const NotFound = React.lazy(() => import('./components/NotFound').then(m => ({ default: m.NotFound })));
const Improve = React.lazy(() => import('./components/Improve').then(m => ({ default: m.Improve })));
const ResearchPrivacyPolicy = React.lazy(() => import('./components/ResearchPrivacyPolicy').then(m => ({ default: m.ResearchPrivacyPolicy })));
const Dataset = React.lazy(() => import('./components/Dataset').then(m => ({ default: m.Dataset })));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mb-3" />
    <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest">Loading Module...</div>
  </div>
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [settings] = useSettings();
  useSystemTheme();

  React.useEffect(() => {
    try {
      const pathname = typeof window !== 'undefined' ? window.location.pathname : (location.pathname || '');
      const search = location.search || window.location.search || '';
      const hash = location.hash || window.location.hash || '';
      const decision = evaluateDeviceRouting(search);
      const params = new URLSearchParams(search);
      const hasRoutingParam = params.has('force_mobile') || params.has('mobile') || params.has('force_desktop') || params.has('desktop');

      syncDeviceRoutingStorage(decision, hasRoutingParam);

      const redirect = resolveDeviceRedirect(pathname, search, hash);
      if (redirect.shouldRedirect && redirect.targetUrl) {
        window.location.replace(redirect.targetUrl);
      } else {
        clearRedirectLoopGuard();
      }
    } catch (e) {}
  }, [location.pathname, location.search, location.hash]);

  const handleNavigate = (view: string) => {
    if (view.startsWith('/')) {
      navigate(view);
      return;
    }

    switch (view) {
      case 'home': navigate('/'); break;
      case 'assessments': navigate('/assessments'); break;
      case 'leaderboard': navigate('/leaderboard'); break;
      case 'dataset':
      case 'analytics':
        navigate('/dataset');
        break;
      case 'improve': navigate('/improve'); break;
      case 'visual-reaction':
      case 'reaction-test':
        navigate('/reaction-test');
        break;
      case 'direction':
      case 'direction-test':
        navigate('/direction-test');
        break;
      case 'color-recognition':
      case 'colour-recognition':
      case 'color-test':
        navigate('/colour-recognition');
        break;
      case 'block-memory':
      case 'block-memory-test':
        navigate('/block-memory');
        break;
      case 'number-memory':
      case 'number-memory-test':
        navigate('/number-memory');
        break;
      case 'privacy':
      case 'research-privacy':
      case 'privacy-policy':
        navigate('/privacy');
        break;
      default: navigate('/');
    }
  };

  return (
    <MotionConfig reducedMotion={settings.reducedMotionEnabled ? 'always' : 'user'}>
      <AuthProvider>
        <div className="min-h-[100dvh] bg-[var(--bg-base)] text-[var(--text-main)] relative font-sans flex flex-col selection:bg-cyan-500/30">
          {/* Global Consistent Animated Canvas Background */}
          <AnimatedBackground />

          {/* App Content */}
          <div className="relative z-10 flex-1 flex flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex-1 flex flex-col w-full"
              >
                <React.Suspense fallback={<RouteFallback />}>
                <Routes location={location}>
                  <Route path="/" element={<Home onNavigate={handleNavigate} />} />
                  <Route path="/index.html" element={<RedirectIndexHtml />} />
                  <Route path="/assessments" element={<Assessments onNavigate={handleNavigate} />} />
                  <Route path="/leaderboard" element={<Leaderboard onNavigate={handleNavigate} />} />
                  <Route path="/dataset" element={<Dataset onNavigate={handleNavigate} />} />
                  <Route path="/analytics" element={<Dataset onNavigate={handleNavigate} />} />
                  <Route path="/improve" element={<Improve onNavigate={handleNavigate} />} />
                  <Route path="/reaction-test" element={<ReactionTest onNavigate={handleNavigate} />} />
                  <Route path="/visual-reaction" element={<ReactionTest onNavigate={handleNavigate} />} />
                  <Route path="/direction-test" element={<DirectionTest onNavigate={handleNavigate} />} />
                  <Route path="/direction" element={<DirectionTest onNavigate={handleNavigate} />} />
                  <Route path="/block-memory" element={<BlockMemoryTest onNavigate={handleNavigate} />} />
                  <Route path="/block-memory-test" element={<BlockMemoryTest onNavigate={handleNavigate} />} />
                  <Route path="/number-memory" element={<NumberMemoryTest onNavigate={handleNavigate} />} />
                  <Route path="/number-memory-test" element={<NumberMemoryTest onNavigate={handleNavigate} />} />
                  <Route path="/colour-recognition" element={<ColorTest onNavigate={handleNavigate} />} />
                  <Route path="/color-recognition" element={<ColorTest onNavigate={handleNavigate} />} />
                  <Route path="/color-test" element={<ColorTest onNavigate={handleNavigate} />} />
                  <Route path="/privacy" element={<ResearchPrivacyPolicy onNavigate={handleNavigate} />} />
                  <Route path="/research-privacy" element={<ResearchPrivacyPolicy onNavigate={handleNavigate} />} />

                  <Route path="*" element={<NotFound onNavigate={handleNavigate} />} />
                </Routes>
                </React.Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;
