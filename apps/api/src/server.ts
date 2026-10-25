import app from './app.js';
import { config } from './config.js';
import { pool } from './db.js';
const server = app.listen(config.PORT, config.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => console.log(`SEES Express API listening on ${config.PORT}`));
const close = () => server.close(() => { void pool.end().then(() => process.exit(0)); });
process.on('SIGTERM', close);
process.on('SIGINT', close);

