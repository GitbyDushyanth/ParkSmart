import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats — Admin only
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [slotsResult, reservationsResult, usersResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'available') AS available,
          COUNT(*) FILTER (WHERE status = 'occupied') AS occupied,
          COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance
        FROM parking_slots
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'active') AS active,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed
        FROM reservations
      `),
      pool.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'user'`),
    ]);

    // Count slots that have active reservations
    const reservedSlotsResult = await pool.query(`
      SELECT COUNT(DISTINCT slot_id) AS reserved
      FROM reservations WHERE status = 'active'
    `);

    const slots = slotsResult.rows[0];
    const reservations = reservationsResult.rows[0];
    const users = usersResult.rows[0];
    const reservedSlots = reservedSlotsResult.rows[0];

    return res.json({
      slots: {
        total: parseInt(slots.total),
        available: parseInt(slots.available),
        occupied: parseInt(slots.occupied),
        maintenance: parseInt(slots.maintenance),
        reserved: parseInt(reservedSlots.reserved),
      },
      reservations: {
        total: parseInt(reservations.total),
        active: parseInt(reservations.active),
        cancelled: parseInt(reservations.cancelled),
        completed: parseInt(reservations.completed),
      },
      users: {
        total: parseInt(users.total),
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router;
