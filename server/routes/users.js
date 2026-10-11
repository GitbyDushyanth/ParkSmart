import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/users — Admin: list all users with stats, search, role filtering, pagination
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const { search = '', role = 'all', page = 1, limit = 50 } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  try {
    const conditions = [];
    const params = [];

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`);
    }

    if (role && role !== 'all') {
      params.push(role.toLowerCase());
      conditions.push(`u.role = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalUsers = parseInt(countResult.rows[0].total);

    // Users with aggregated reservation counts
    const dataParams = [...params, limitNum, offset];
    const usersQuery = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COUNT(r.id)::int AS total_reservations,
        COUNT(r.id) FILTER (WHERE r.status = 'active')::int AS active_reservations,
        COUNT(r.id) FILTER (WHERE r.status = 'cancelled')::int AS cancelled_reservations,
        COUNT(r.id) FILTER (WHERE r.status = 'completed')::int AS completed_reservations
      FROM users u
      LEFT JOIN reservations r ON r.user_id = u.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const { rows } = await pool.query(usersQuery, dataParams);

    return res.json({
      users: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('List users error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id — Admin or self: user details with reservation history
router.get('/:id', authenticate, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Authorization check: only admin or the user themselves can view details
  if (req.user.role !== 'admin' && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const userResult = await pool.query(
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
      [targetId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Fetch user's reservation history
    const reservationsResult = await pool.query(
      `SELECT
         r.id, r.status, r.reserved_at, r.cancelled_at, r.completed_at,
         ps.slot_number, ps.slot_type
       FROM reservations r
       JOIN parking_slots ps ON ps.id = r.slot_id
       WHERE r.user_id = $1
       ORDER BY r.reserved_at DESC`,
      [targetId]
    );

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
      reservations: reservationsResult.rows,
    });
  } catch (err) {
    console.error('Get user details error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// PATCH /api/users/:id/role — Admin: update user role (promote/demote)
router.patch('/:id/role', authenticate, requireAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  const { role } = req.body;

  if (isNaN(targetId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (!role || !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either "user" or "admin"' });
  }

  // Prevent self-demotion
  if (req.user.id === targetId && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot demote your own administrator account' });
  }

  try {
    // If demoting an admin, ensure at least one other admin exists
    if (role === 'user') {
      const adminCountResult = await pool.query(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND id <> $1",
        [targetId]
      );
      const remainingAdmins = parseInt(adminCountResult.rows[0].count);
      if (remainingAdmins === 0) {
        return res.status(400).json({ error: 'Cannot demote the only remaining administrator' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, name, email, role, created_at`,
      [role, targetId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: `User role updated to ${role}`,
      user: rows[0],
    });
  } catch (err) {
    console.error('Update role error:', err.message);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
});

// DELETE /api/users/:id — Admin: delete user account safely
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id);

  if (isNaN(targetId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Prevent self-deletion
  if (req.user.id === targetId) {
    return res.status(400).json({ error: 'You cannot delete your own administrator account' });
  }

  try {
    // Ensure target user is not the last admin
    const targetUser = await pool.query('SELECT role FROM users WHERE id = $1', [targetId]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.rows[0].role === 'admin') {
      const adminCountResult = await pool.query(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND id <> $1",
        [targetId]
      );
      if (parseInt(adminCountResult.rows[0].count) === 0) {
        return res.status(400).json({ error: 'Cannot delete the only remaining administrator' });
      }
    }

    const { rows } = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role',
      [targetId]
    );

    return res.json({
      message: 'User deleted successfully',
      user: rows[0],
    });
  } catch (err) {
    console.error('Delete user error:', err.message);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
