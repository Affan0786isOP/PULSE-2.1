export type ErrorSeverity = 
  | 'EXPECTED_OPTIONAL_FAILURE' // e.g. PWA SW registration unavailable, optional storage fallback
  | 'RECOVERABLE_FAILURE'       // e.g. temporary network glitch retried, local cache fallback
  | 'USER_ACTION_REQUIRED'     // e.g. auth required, missing permissions, invalid input
  | 'CRITICAL_FAILURE';        // e.g. database corruption, server integrity failure

export interface ErrorReportContext {
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export function reportError(
  error: unknown,
  severity: ErrorSeverity,
  context: ErrorReportContext = {}
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const formattedLog = {
    timestamp: new Date().toISOString(),
    severity,
    component: context.component || 'Global',
    action: context.action || 'Unknown',
    message,
    ...(context.metadata ? { metadata: context.metadata } : {}),
    ...(stack && severity === 'CRITICAL_FAILURE' ? { stack } : {})
  };

  switch (severity) {
    case 'EXPECTED_OPTIONAL_FAILURE':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[PULSE Debug] Optional feature unavailable (${formattedLog.component}:${formattedLog.action}):`, message);
      }
      break;
    case 'RECOVERABLE_FAILURE':
      console.warn(`[PULSE Warning] Recoverable error (${formattedLog.component}:${formattedLog.action}):`, message);
      break;
    case 'USER_ACTION_REQUIRED':
      console.info(`[PULSE Info] User action required (${formattedLog.component}:${formattedLog.action}):`, message);
      break;
    case 'CRITICAL_FAILURE':
      console.error(`[PULSE Critical] System failure (${formattedLog.component}:${formattedLog.action}):`, message, formattedLog);
      break;
  }
}
