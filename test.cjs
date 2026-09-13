const express = require('express');
const app = express();
try {
  app.listen(3000);
  console.log('Listening');
} catch(e) {
  console.log('Error', e);
}
