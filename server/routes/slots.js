import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/slots — All authenticated users
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        ps.id,
        ps.slot_number,
        ps.slot_type,
        ps.status AS operational_status,
        ps.created_at,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END AS is_reserved,
        r.id AS reservation_id,
        r.user_id AS reserved_by_user_id
      FROM parking_slots ps
      LEFT JOIN reservations r
        ON r.slot_id = ps.id AND r.status = 'active'
      ORDER BY ps.slot_number
    `);
    return res.json({ slots: rows });
  } catch (err) {
    console.error('Get slots error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch parking slots' });
  }
});

// POST /api/slots — Admin only: create a new slot
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { slot_number, slot_type = 'regular' } = req.body;
  if (!slot_number) {
    return res.status(400).json({ error: 'slot_number is required' });
  }

  const validTypes = ['regular', 'accessible', 'electric', 'compact', 'large'];
  if (!validTypes.includes(slot_type)) {
    return res.status(400).json({ error: `slot_type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO parking_slots (slot_number, slot_type, status)
       VALUES ($1, $2, 'available')
       RETURNING *`,
      [slot_number.toUpperCase(), slot_type]
    );
    return res.status(201).json({ slot: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A slot with this number already exists' });
    }
    console.error('Create slot error:', err.message);
    return res.status(500).json({ error: 'Failed to create slot' });
  }
});

// PATCH /api/slots/:id/status — Admin only: update operational status
router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['available', 'occupied', 'maintenance'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE parking_slots SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Slot not found' });
    return res.json({ slot: rows[0] });
  } catch (err) {
    console.error('Update slot status error:', err.message);
    return res.status(500).json({ error: 'Failed to update slot status' });
  }
});

export default router;
