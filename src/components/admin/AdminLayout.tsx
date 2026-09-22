import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAdminAuth } from '../../lib/useAdminAuth';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Database, 
  FileSpreadsheet, 
  ArrowLeft, 
  LogOut, 
  Menu, 
  X, 
  Activity,
  Shield,
  Layers,
  Sparkles,
  History
} from 'lucide-react';
import { AdminOverview } from './AdminOverview';
import { LeaderboardModeration } from './LeaderboardModeration';
import { ExportAuditLog } from './ExportAuditLog';
import { PulseLogo } from '../brand';

export type AdminTab = 'overview' | 'moderation' | 'export-audit';

interface AdminLayoutProps {
  initialTab?: AdminTab;
  onNavigateApp?: (view: string) => void;
}

export function AdminLayout({ initialTab = 'overview', onNavigateApp }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOutAdmin, tokenClaims } = useAdminAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Derive activeTab from current route pathname as the single source of truth
  const getTabFromPathname = (pathname: string): AdminTab => {
    if (pathname.includes('/admin/moderation')) return 'moderation';
    if (pathname.includes('/admin/audit') || pathname.includes('/admin/export-audit')) return 'export-audit';
    if (pathname.includes('/admin/overview')) return 'overview';
    return initialTab;
  };

  const activeTab: AdminTab = getTabFromPathname(location.pathname);

  const handleTabClick = (tabId: AdminTab) => {
    navigate(`/admin/${tabId}`);
    setIsMobileNavOpen(false);
  };

  const handleBackToApp = () => {
    if (onNavigateApp) {
      onNavigateApp('home');
    } else {
      navigate('/');
    }
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    navigate('/admin/login');
  };

  const navItems = [
    {
      id: 'overview' as AdminTab,
      label: 'Overview',
      icon: LayoutDashboard,
      desc: 'Telemetry & Submission KPIs'
    },
    {
      id: 'moderation' as AdminTab,
      label: 'Leaderboard Moderation',
      icon: ShieldCheck,
      desc: 'Filter, Anomaly & Badges'
    },
    {
      id: 'export-audit' as AdminTab,
      label: 'Audit Log',
      icon: History,
      desc: 'Security & Action Trail'
    }
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-transparent text-[var(--text-main)] font-sans antialiased relative">
      {/* MOBILE TOP BAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-cyan-500/20 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield size={16} />
          </div>
          <div>
            <span className="font-heading text-xs font-bold tracking-wider text-cyan-400">PULSE ADMIN</span>
            <span className="block text-[10px] font-mono text-[var(--text-muted)]">Research Console</span>
          </div>
        </div>

        <button type="button"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="p-2 rounded-lg bg-[var(--bg-panel)] border border-white/10 text-[var(--text-main)] cursor-pointer"
          aria-label="Toggle navigation"
        >
          {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* PERSISTENT SIDEBAR */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-[100dvh] w-72 bg-[#090d16] border-r border-cyan-500/20 flex flex-col justify-between p-5 z-50 transition-transform duration-300 ease-in-out
          ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* BRAND & HEADER */}
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
                <PulseLogo variant="mark" size={20} color="#00F0FF" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-heading text-base font-bold tracking-wide text-[var(--text-main)]">
                    PULSE
                  </h1>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Cognitive Observational Lab
                </p>
              </div>
            </div>

            <button type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* ADMIN USER BADGE */}
          <div className="mt-4 p-3 rounded-xl bg-[var(--bg-surface)] border border-white/5 font-mono">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Active Admin Session</div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block mr-1" />
              Role Verified: Administrator
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button type="button"
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors active:scale-95 cursor-pointer group
                    ${isActive 
                      ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300' 
                      : 'bg-transparent border border-transparent hover:bg-white/[0.03] text-[var(--text-secondary)] hover:text-[var(--text-main)]'}
                  `}
                >
                  <Icon 
                    size={18} 
                    className={`shrink-0 mt-0.5 ${isActive ? 'text-cyan-400' : 'text-[var(--text-muted)] group-hover:text-white'}`} 
                  />
                  <div>
                    <span className={`block font-heading text-xs font-bold tracking-wide ${isActive ? 'text-cyan-300' : 'text-[var(--text-main)]'}`}>
                      {item.label}
                    </span>
                    <span className="block text-[10px] font-mono text-[var(--text-muted)]">
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* SIDEBAR FOOTER */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <button type="button"
            onClick={handleBackToApp}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] border border-white/5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} className="text-cyan-400" />
            <span>Return to Public App</span>
          </button>

          <button type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-mono text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* MOBILE BACKDROP */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileNavOpen(false)}
            className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 cursor-pointer" 
          />
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl">
        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'moderation' && <LeaderboardModeration />}
        {activeTab === 'export-audit' && <ExportAuditLog />}
      </main>
    </div>
  );
}
