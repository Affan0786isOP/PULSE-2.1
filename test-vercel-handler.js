import handler from './api/index.ts';
import http from 'http';

const server = http.createServer((req, res) => {
  handler(req, res);
});

server.listen(3001, () => {
  console.log("Listening on 3001");
});
