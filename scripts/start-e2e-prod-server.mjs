process.env.NODE_ENV = 'production';
process.env.PORT = '3000';
await import('../dist/server.js');
