import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../lib/useAdminAuth';
import { Shield, Lock, ArrowLeft, AlertTriangle, Key, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export function AdminLogin({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, error, loading } = useAdminAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notAuthorized = location.state?.notAuthorized;
  const redirectMessage = location.state?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!password.trim()) {
      setLocalError("Please enter the administrator password.");
      return;
    }

    setIsSubmitting(true);
    const success = await signIn(password.trim());
    setIsSubmitting(false);

    if (success) {
      const destination = location.state?.from?.pathname || '/admin';
      navigate(destination, { replace: true });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 relative bg-transparent">
      {/* BACKGROUND ACCENT */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-cyan-500/20 rounded-2xl p-6 sm:p-8 relative z-10">
        {/* BACK TO APP */}
        <div className="flex items-center justify-between mb-6">
          <button type="button"
            onClick={() => onNavigate ? onNavigate('home') : navigate('/')}
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to Public App
          </button>

          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <Lock size={11} /> Admin Claim Required
          </span>
        </div>

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-sm">
            <Lock size={24} />
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)]">
            PULSE Admin Console
          </h1>
          <p className="font-sans text-xs text-[var(--text-secondary)] mt-1.5">
            Sign in with verified administrator credentials to access telemetry, data moderation, and quality controls.
          </p>
        </div>

        {/* NOT AUTHORIZED BANNER IF REDIRECTED */}
        {notAuthorized && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle size={16} className="shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold font-heading">Access Locked</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {redirectMessage || "Administrator credentials with verified admin token claims are required to access this console."}
              </p>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {(error || localError) && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in slide-in-from-top-1">
            <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5" />
            <p>{localError || error}</p>
          </div>
        )}

        {/* PASSWORD-ONLY FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-[var(--text-muted)]">
                Admin Master Password
              </label>
              <span className="text-[10px] font-mono text-cyan-400">
                Required
              </span>
            </div>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#090d16] border border-white/10 text-sm text-[var(--text-main)] placeholder-white/30 focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:border-cyan-500/50 transition-colors font-mono tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-heading font-bold text-xs tracking-wider uppercase transition-colors disabled:opacity-50 cursor-pointer active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            <Lock size={14} />
            {isSubmitting ? 'Verifying Password...' : 'Unlock Admin Console'}
          </button>
        </form>

        {/* SECURITY FOOTNOTE */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
            <Shield size={12} className="text-cyan-400" />
            <span>Encrypted Session Gatekeeper</span>
          </div>
          <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">
            Protected endpoint. Unauthorized access attempts are monitored.
          </p>
        </div>
      </div>
    </div>
  );
}

