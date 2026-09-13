import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider } from './AuthContext';
import { useSystemTheme } from './lib/useSystemTheme';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Home } from './components/Home';
import { Assessments } from './components/Assessments';



import { Leaderboard } from './components/Leaderboard';
import { ReactionTest } from './components/ReactionTest';
import { DirectionTest } from './components/DirectionTest';
import { BlockMemoryTest } from './components/BlockMemoryTest';
import { NumberMemoryTest } from './components/NumberMemoryTest';
import { ColorTest } from './components/ColorTest';

import { NotFound } from './components/NotFound';


// Code-split heavy routes & admin module
const Improve = React.lazy(() => import('./components/Improve').then(m => ({ default: m.Improve })));
const ResearchPrivacyPolicy = React.lazy(() => import('./components/ResearchPrivacyPolicy').then(m => ({ default: m.ResearchPrivacyPolicy })));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mb-3" />
    <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest">Loading Module...</div>
  </div>
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  useSystemTheme();

  const handleNavigate = (view: string) => {
    if (view.startsWith('/')) {
      navigate(view);
      return;
    }

    switch (view) {
      case 'home': navigate('/'); break;
      case 'assessments': navigate('/assessments'); break;
      case 'leaderboard': navigate('/leaderboard'); break;
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
                <Route path="/assessments" element={<Assessments onNavigate={handleNavigate} />} />
                <Route path="/leaderboard" element={<Leaderboard onNavigate={handleNavigate} />} />
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
  );
}

export default App;
