import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(schema);
    const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM services');
    if (rows[0].c === 0) {
      await client.query(seed);
      console.log('Seed aplicado.');
    } else {
      const settings = await client.query('SELECT id FROM settings WHERE id = 1');
      if (settings.rowCount === 0) {
        await client.query(seed);
        console.log('Settings seed aplicado.');
      } else {
        console.log('Schema OK (seed já presente).');
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
