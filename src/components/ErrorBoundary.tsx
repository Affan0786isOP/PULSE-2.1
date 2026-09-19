import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PULSE Uncaught Error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0D10] text-[#e2e8f0] flex flex-col items-center justify-center p-6 font-sans select-none">
          <div className="w-full max-w-md bg-[#0b101b] border border-[#1e293b] rounded-xl p-6 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white mb-2">
              Application Notice
            </h2>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              PULSE encountered a rendering interruption. You can reload the application to restore evaluation.
            </p>
            {this.state.error?.message && (
              <div className="w-full bg-[#0B0D10] border border-[#1e293b] rounded p-3 mb-5 text-left text-xs font-mono text-red-300 overflow-x-auto max-h-28">
                {this.state.error.message}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-95 active:bg-cyan-600 text-slate-950 font-semibold text-xs transition-colors transition-transform transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer"
            >
              <RotateCcw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
