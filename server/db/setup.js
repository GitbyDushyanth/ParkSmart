/**
 * setup.js — Reads schema.sql and seed.sql, then runs them against the database.
 * Run with: npm run setup-db
 * Then:     npm run seed
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pool from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSQL(filename) {
  const sql = readFileSync(path.join(__dirname, filename), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log(`✅ Executed ${filename}`);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await runSQL('schema.sql');
    console.log('✅ Schema applied successfully');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
