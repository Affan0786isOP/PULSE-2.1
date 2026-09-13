const fs = require('fs');

function patch(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the displayName display cell
    const search = `<td className="py-3.5 px-4 font-bold text-[var(--text-main)]">\n                          {entry.displayName}\n                        </td>`;
    const replacement = `<td className="py-3.5 px-4 font-bold text-[var(--text-main)]">\n                          {entry.displayName}\n                          {entry.source === 'local' && (\n                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border-subtle)]">\n                              Local\n                            </span>\n                          )}\n                        </td>`;
    
    if (content.includes(search)) {
        content = content.replace(search, replacement);
    } else {
        // Fallback search
        content = content.replace(
            "{entry.displayName}",
            "{entry.displayName}{entry.source === 'local' && <span className=\"ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border-subtle)]\">Local</span>}"
        );
    }
    
    fs.writeFileSync(file, content);
}

patch('src/components/Leaderboard.tsx');
patch('mobile/src/components/Leaderboard.tsx');
