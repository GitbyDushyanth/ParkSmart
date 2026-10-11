import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats — Admin only: comprehensive analytics and recent activity
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      slotCountsResult,
      reservationCountsResult,
      userCountsResult,
      timelineResult,
      slotTypesResult,
      recentReservationsResult,
    ] = await Promise.all([
      // 1. Slots breakdown with accurate real-time reservation overlay
      pool.query(`
        SELECT
          COUNT(ps.id)::int AS total,
          COUNT(ps.id) FILTER (WHERE ps.status = 'available' AND r.id IS NULL)::int AS available,
          COUNT(ps.id) FILTER (WHERE r.id IS NOT NULL)::int AS reserved,
          COUNT(ps.id) FILTER (WHERE ps.status = 'occupied')::int AS occupied,
          COUNT(ps.id) FILTER (WHERE ps.status = 'maintenance')::int AS maintenance
        FROM parking_slots ps
        LEFT JOIN reservations r ON r.slot_id = ps.id AND r.status = 'active'
      `),

      // 2. Reservations breakdown
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
        FROM reservations
      `),

      // 3. Registered users breakdown
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE role = 'user')::int AS drivers,
          COUNT(*) FILTER (WHERE role = 'admin')::int AS admins
        FROM users
      `),

      // 4. Past 7 days reservation activity timeline
      pool.query(`
        SELECT
          TO_CHAR(d::date, 'Mon DD') AS label,
          TO_CHAR(d::date, 'YYYY-MM-DD') AS date_key,
          COUNT(r.id)::int AS count
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d
        LEFT JOIN reservations r ON DATE(r.reserved_at) = d::date
        GROUP BY d::date
        ORDER BY d::date ASC
      `),

      // 5. Slot distribution by type
      pool.query(`
        SELECT
          slot_type,
          COUNT(*)::int AS count
        FROM parking_slots
        GROUP BY slot_type
        ORDER BY count DESC
      `),

      // 6. Recent 10 reservations
      pool.query(`
        SELECT
          r.id,
          r.status,
          r.reserved_at,
          r.cancelled_at,
          u.name AS user_name,
          u.email AS user_email,
          ps.slot_number,
          ps.slot_type
        FROM reservations r
        JOIN users u ON u.id = r.user_id
        JOIN parking_slots ps ON ps.id = r.slot_id
        ORDER BY r.reserved_at DESC
        LIMIT 10
      `),
    ]);

    const slots = slotCountsResult.rows[0];
    const reservations = reservationCountsResult.rows[0];
    const users = userCountsResult.rows[0];

    const totalSlots = slots.total || 0;
    const availableSlots = slots.available || 0;
    const reservedSlots = slots.reserved || 0;
    const occupiedSlots = slots.occupied || 0;
    const maintenanceSlots = slots.maintenance || 0;

    // Current parking utilization % (slots in use = total - available)
    const utilizationRate = totalSlots > 0
      ? Math.round(((totalSlots - availableSlots) / totalSlots) * 100)
      : 0;

    return res.json({
      slots: {
        total: totalSlots,
        available: availableSlots,
        reserved: reservedSlots,
        occupied: occupiedSlots,
        maintenance: maintenanceSlots,
        utilizationRate,
      },
      reservations: {
        total: reservations.total || 0,
        active: reservations.active || 0,
        cancelled: reservations.cancelled || 0,
        completed: reservations.completed || 0,
      },
      users: {
        total: users.total || 0,
        drivers: users.drivers || 0,
        admins: users.admins || 0,
      },
      timeline: timelineResult.rows,
      slotTypes: slotTypesResult.rows,
      recentReservations: recentReservationsResult.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router;

