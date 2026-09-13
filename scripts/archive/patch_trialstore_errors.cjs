const fs = require('fs');

function patch(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Make sure reportError is imported
    if (!content.includes('import { reportError }')) {
        content = `import { reportError } from './errorReporter';\n` + content;
    }

    // Replace generic escapeCSV val: any with val: unknown
    content = content.replace(/const escapeCSV = \(val: any\)/g, 'const escapeCSV = (val: unknown)');
    content = content.replace(/\(v: any\)/g, '(v: Record<string, unknown>)');

    // Replace generic any[] in parameters
    content = content.replace(/datasetDocs: any\[\] = \[\]/g, 'datasetDocs: Record<string, unknown>[] = []');
    content = content.replace(/sessions: any\[\] = \[\]/g, 'sessions: Record<string, unknown>[] = []');
    content = content.replace(/\[key: string\]: any;/g, '[key: string]: unknown;');

    // Replace catch {} with reportError
    content = content.replace(/\} catch \{\}/g, "} catch (e) { reportError(e, 'EXPECTED_OPTIONAL_FAILURE', { component: 'TrialStore' }); }");
    content = content.replace(/\} catch \(e\) \{\}/g, "} catch (e) { reportError(e, 'EXPECTED_OPTIONAL_FAILURE', { component: 'TrialStore' }); }");

    fs.writeFileSync(filePath, content);
}

patch('src/lib/trialStore.ts');
patch('mobile/src/lib/trialStore.ts');
console.log('Patched trialStore.ts');
