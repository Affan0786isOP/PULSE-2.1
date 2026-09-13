const admin = require('firebase-admin');
const fs = require('fs');

if (fs.existsSync('firebase-applet-config.json')) {
  console.log("Config exists.");
} else {
  console.log("Config not found.");
}
