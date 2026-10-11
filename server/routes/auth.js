import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const JWT_EXPIRES = '7d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );

    const user = rows[0];
    const token = signToken(user);
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Generic error — don't reveal whether email exists
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me — Current user profile and reservation stats
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         u.id, u.name, u.email, u.role, u.created_at,
         COUNT(r.id)::int AS total_reservations,
         COUNT(r.id) FILTER (WHERE r.status = 'active')::int AS active_reservations,
         COUNT(r.id) FILTER (WHERE r.status = 'cancelled')::int AS cancelled_reservations,
         COUNT(r.id) FILTER (WHERE r.status = 'completed')::int AS completed_reservations
       FROM users u
       LEFT JOIN reservations r ON r.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      stats: {
        total: user.total_reservations,
        active: user.active_reservations,
        cancelled: user.cancelled_reservations,
        completed: user.completed_reservations,
      },
    });
  } catch (err) {
    console.error('Fetch profile error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/auth/profile — Update permitted profile fields (name, email)
router.put('/profile', authenticate, async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.id;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters long' });
  }

  const cleanName = name.trim().slice(0, 100);
  let cleanEmail = req.user.email;

  if (email && typeof email === 'string') {
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (trimmedEmail !== req.user.email) {
      // Check for email collision
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id <> $2',
        [trimmedEmail, userId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'This email is already in use by another account' });
      }
      cleanEmail = trimmedEmail;
    }
  }

  try {
    // Note: NEVER update role or id here to prevent privilege escalation
    const { rows } = await pool.query(
      `UPDATE users
       SET name = $1, email = $2
       WHERE id = $3
       RETURNING id, name, email, role, created_at`,
      [cleanName, cleanEmail, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = rows[0];
    // Return updated token as well so token payload matches updated name/email
    const token = signToken(updatedUser);

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      token,
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/change-password — Update password with current password verification
router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    // 1. Fetch current password hash
    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Verify current password
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // 3. Prevent using the exact same password
    const isSame = await bcrypt.compare(newPassword, rows[0].password_hash);
    if (isSame) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // 4. Hash new password and update
    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err.message);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;

