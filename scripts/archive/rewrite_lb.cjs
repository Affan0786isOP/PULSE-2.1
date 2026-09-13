const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const lbEndpointStart = "app.post('/api/leaderboard/provenance', (req, res) => {\\n    try {\\n      const { displayName, assessmentType, scoreMetric, ageGroup } = req.body || {};";

const newLbEndpointStart = `app.post('/api/leaderboard/provenance', (req, res) => {
    try {
      const { displayName, assessmentType, scoreMetric, ageGroup, trials } = req.body || {};
      
      if (!trials || !Array.isArray(trials) || trials.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing or empty trials sequence' });
      }
      
      // Basic chronological validation
      let lastTime = 0;
      for (const t of trials) {
        if (t.responseTimestamp < lastTime) {
          return res.status(400).json({ success: false, error: 'Chronological inconsistency detected in trial sequence' });
        }
        lastTime = t.responseTimestamp;
      }`;

server = server.replace(
  "const { displayName, assessmentType, scoreMetric, ageGroup } = req.body || {};",
  "const { displayName, assessmentType, scoreMetric, ageGroup, trials } = req.body || {};\n      if (!trials || !Array.isArray(trials) || trials.length === 0) {\n        return res.status(400).json({ success: false, error: 'Missing or empty trials sequence. Server-verifiable session required.' });\n      }\n      let lastTime = 0;\n      for (const t of trials) {\n        if (t.responseTimestamp < lastTime) {\n          return res.status(400).json({ success: false, error: 'Chronological inconsistency in trial sequence.' });\n        }\n        lastTime = t.responseTimestamp;\n      }"
);

fs.writeFileSync('server.ts', server);
