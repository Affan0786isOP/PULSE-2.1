import path from 'path';
try {
  console.log(path.join(__dirname, 'index.html'));
} catch (e) {
  console.log("ERROR:", e.message);
}
