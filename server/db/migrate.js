import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    process.exit(0);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log(`Found ${files.length} migration file(s).`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Applying migration: ${file}...`);
    try {
      await pool.query(sql);
      console.log(`✓ Migration ${file} applied successfully.`);
    } catch (err) {
      console.error(`✗ Error applying ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('All migrations applied successfully.');
  process.exit(0);
}

runMigrations();
