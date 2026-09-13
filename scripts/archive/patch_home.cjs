const fs = require('fs');

function patch(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check where to add the link in Home.tsx
    // The user asked to "Add a link to this in the Home and Dataset navigation menus."
    // Let's add a card in Home.tsx
    const search = `<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">`;
    const replace = `<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button 
                variants={itemVariants}
                onClick={() => onNavigate('privacy')}
                className="group w-full flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-transform group-hover:scale-105">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-[var(--text-primary)]">
                      Privacy Policy
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Research ethics & data
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors group-hover:translate-x-1" />
              </motion.button>`;
              
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
}

patch('src/components/Home.tsx');
patch('mobile/src/components/Home.tsx');
