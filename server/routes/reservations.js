import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/reservations/mine — Current user's reservations
router.get('/mine', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         r.id, r.status, r.reserved_at, r.cancelled_at,
         ps.slot_number, ps.slot_type, ps.status AS slot_operational_status
       FROM reservations r
       JOIN parking_slots ps ON ps.id = r.slot_id
       WHERE r.user_id = $1
       ORDER BY r.reserved_at DESC`,
      [req.user.id]
    );
    return res.json({ reservations: rows });
  } catch (err) {
    console.error('Get my reservations error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// GET /api/reservations — Admin: all reservations
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        r.id, r.status, r.reserved_at, r.cancelled_at,
        u.name AS user_name, u.email AS user_email,
        ps.slot_number, ps.slot_type
      FROM reservations r
      JOIN users u ON u.id = r.user_id
      JOIN parking_slots ps ON ps.id = r.slot_id
      ORDER BY r.reserved_at DESC
    `);
    return res.json({ reservations: rows });
  } catch (err) {
    console.error('Get all reservations error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// POST /api/reservations — Create a reservation (atomic, safe under concurrency)
router.post('/', authenticate, async (req, res) => {
  const { slot_id } = req.body;
  const userId = req.user.id; // Never trust user-supplied user_id

  if (!slot_id) {
    return res.status(400).json({ error: 'slot_id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock the slot row to prevent concurrent booking
    const slotResult = await client.query(
      `SELECT id, status FROM parking_slots WHERE id = $1 FOR UPDATE`,
      [slot_id]
    );
    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Slot not found' });
    }

    const slot = slotResult.rows[0];
    if (slot.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Slot is ${slot.status} and cannot be reserved` });
    }

    // 2. Check for existing active reservation on this slot
    const existingRes = await client.query(
      `SELECT id FROM reservations WHERE slot_id = $1 AND status = 'active'`,
      [slot_id]
    );
    if (existingRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This slot is already reserved' });
    }

    // 3. Check this user doesn't already have an active reservation for this slot
    const userExisting = await client.query(
      `SELECT id FROM reservations WHERE user_id = $1 AND slot_id = $2 AND status = 'active'`,
      [userId, slot_id]
    );
    if (userExisting.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already have an active reservation for this slot' });
    }

    // 4. Create the reservation
    const { rows } = await client.query(
      `INSERT INTO reservations (user_id, slot_id, status)
       VALUES ($1, $2, 'active')
       RETURNING id, user_id, slot_id, status, reserved_at`,
      [userId, slot_id]
    );

    await client.query('COMMIT');

    // Return with slot details
    const reservation = rows[0];
    const fullRes = await pool.query(
      `SELECT r.id, r.status, r.reserved_at,
              ps.slot_number, ps.slot_type, ps.status AS slot_operational_status
       FROM reservations r
       JOIN parking_slots ps ON ps.id = r.slot_id
       WHERE r.id = $1`,
      [reservation.id]
    );

    return res.status(201).json({ reservation: fullRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    // Unique constraint violation (partial index backup)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This slot was just reserved by someone else' });
    }
    console.error('Create reservation error:', err.message);
    return res.status(500).json({ error: 'Failed to create reservation' });
  } finally {
    client.release();
  }
});

// PATCH /api/reservations/:id/cancel — Cancel a reservation
router.patch('/:id/cancel', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the reservation row
    const resResult = await client.query(
      `SELECT id, user_id, slot_id, status FROM reservations WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (resResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = resResult.rows[0];

    // Only the owner or an admin can cancel
    if (!isAdmin && reservation.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You can only cancel your own reservations' });
    }

    if (reservation.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Reservation is already ${reservation.status}` });
    }

    // Cancel it
    const { rows } = await client.query(
      `UPDATE reservations
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    return res.json({ reservation: rows[0], message: 'Reservation cancelled successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel reservation error:', err.message);
    return res.status(500).json({ error: 'Failed to cancel reservation' });
  } finally {
    client.release();
  }
});

export default router;
