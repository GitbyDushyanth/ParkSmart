/**
 * createAdmin.js — Securely creates the initial admin account.
 * Usage: node server/scripts/createAdmin.js
 * Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD env vars or edit defaults below.
 */
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import dotenv from 'dotenv';

dotenv.config();

const name     = process.env.ADMIN_NAME  || 'Admin';
const email    = process.env.ADMIN_EMAIL || 'admin@parksmart.local';
const password = process.env.ADMIN_PASSWORD; // Must be supplied — no default

async function main() {
  if (!password) {
    console.error('❌  ADMIN_PASSWORD env var is required.');
    console.error('    Example: $env:ADMIN_PASSWORD="YourPassword"; node server/scripts/createAdmin.js');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('❌  ADMIN_PASSWORD must be at least 6 characters.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = 'admin'
       RETURNING id, name, email, role`,
      [name, email, hash]
    );
    console.log('✅ Admin account ready:', rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ createAdmin failed:', err.message);
  process.exit(1);
});
