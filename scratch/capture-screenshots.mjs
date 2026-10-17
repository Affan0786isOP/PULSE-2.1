import { runAudit } from './capture-screenshot-audit.mjs';

process.exitCode = await runAudit('before');
