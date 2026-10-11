/**
 * seed.js — Seeds initial parking slot data into the database.
 * Run with: npm run seed
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pool from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    const sql = readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    const client = await pool.connect();
    try {
      await client.query(sql);
      const { rows } = await client.query('SELECT COUNT(*) FROM parking_slots');
      console.log(`✅ Seed complete. Total parking slots: ${rows[0].count}`);
    } finally {
      client.release();
    }
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
