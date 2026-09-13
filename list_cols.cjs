const fs = require('fs');
const https = require('https');
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents?key=${config.apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      console.log(JSON.parse(data));
    } catch(e) {}
  });
});
