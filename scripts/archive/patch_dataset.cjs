const fs = require('fs');

function patch(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add import for ShieldCheck if not present
    if (!content.includes('ShieldCheck')) {
        content = content.replace("import { Database, Filter, RefreshCw, BarChart2, Activity } from 'lucide-react';", "import { Database, Filter, RefreshCw, BarChart2, Activity, ShieldCheck } from 'lucide-react';");
    }
    
    // Find a place to add the privacy link
    const search = `<button type="button"\n            onClick={() => fetchDataset()}`;
    const replace = `<button type="button"\n            onClick={() => onNavigate('privacy')}\n            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] active:scale-95 transition-all cursor-pointer mr-2 md:mr-4"\n          >\n            <ShieldCheck size={15} />\n            <span className="font-mono text-xs uppercase tracking-wider hidden sm:inline">Privacy</span>\n          </button>\n          <button type="button"\n            onClick={() => fetchDataset()}`;
    
    if (content.includes(search)) {
        content = content.replace(search, replace);
    }
    
    fs.writeFileSync(file, content);
}

patch('src/components/Dataset.tsx');
patch('mobile/src/components/Dataset.tsx');
