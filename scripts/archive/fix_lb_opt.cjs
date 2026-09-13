const fs = require('fs');
function fix(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace("idempotencyKey, ageGroup, idempotencyKey", "idempotencyKey, ageGroup");
    content = content.replace("const [idempotencyKey] = useState(() => safeUUID());", "");
    content = content.replace("import { safeUUID } from '../lib/utils';", "");
    fs.writeFileSync(file, content);
}
fix('src/components/LeaderboardOptIn.tsx');
fix('mobile/src/components/LeaderboardOptIn.tsx');
