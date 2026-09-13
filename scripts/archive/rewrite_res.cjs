const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  "const { assessmentType, ageGroup, metrics } = req.body || {};",
  "const { assessmentType, ageGroup, metrics, trials } = req.body || {};\n      if (!trials || !Array.isArray(trials) || trials.length === 0) {\n        return res.status(400).json({ success: false, error: 'Missing or empty trials sequence. Server-verifiable session required.' });\n      }\n      let lastTime = 0;\n      for (const t of trials) {\n        if (t.responseTimestamp < lastTime) {\n          return res.status(400).json({ success: false, error: 'Chronological inconsistency in trial sequence.' });\n        }\n        lastTime = t.responseTimestamp;\n      }"
);

fs.writeFileSync('server.ts', server);
