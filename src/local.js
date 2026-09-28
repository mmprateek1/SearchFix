// Explicit local development entry point: no public listener or server key.
import 'dotenv/config';
process.env.NODE_ENV = 'development';
process.env.PORT = '3000';
delete process.env.RENDER;
delete process.env.ALLOWED_GEMINI_KEY_HASHES;
await import('./server.js');
