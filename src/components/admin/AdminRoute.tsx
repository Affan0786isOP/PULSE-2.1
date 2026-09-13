import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../lib/useAdminAuth';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent text-[var(--text-main)] p-4 font-mono">
        <div className="flex flex-col items-center gap-4 bg-[var(--bg-surface)] p-8 rounded-2xl border border-cyan-500/20">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-cyan-400 tracking-wider uppercase">Authenticating Protocol Access</p>
            <p className="text-xs text-[var(--text-muted)]">Verifying administrative security claims...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Navigate 
        to="/admin/login" 
        state={{ 
          from: location,
          notAuthorized: true,
          message: "Administrative privileges or active session token required."
        }} 
        replace 
      />
    );
  }

  return <>{children}</>;
}
