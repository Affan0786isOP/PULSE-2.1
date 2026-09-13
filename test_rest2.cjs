const fs = require('fs');
const https = require('https');
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/experimentSessions?key=${config.apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Experiment Sessions found:', parsed.documents ? parsed.documents.length : 0);
    } catch(e) {
      console.log('Error parsing:', e.message, data.substring(0, 500));
    }
  });
}).on('error', err => console.log('Req error:', err.message));
