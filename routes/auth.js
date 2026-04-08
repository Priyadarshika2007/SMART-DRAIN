import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/db.js';
import { signAccessToken } from '../middleware/auth.js';

const router = express.Router();

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      email TEXT,
      role TEXT NOT NULL,
      area TEXT,
      assigned_areas JSONB DEFAULT '[]'::jsonb,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

function normalizeRoleLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'district head') return 'Admin';
  if (normalized === 'officer' || normalized === 'field officer') return 'Officer';
  if (normalized === 'supervisor' || normalized === 'area supervisor') return 'Supervisor';
  return String(value || '').trim();
}

async function ensureDefaultUsers() {
  const defaults = [
    {
      username: 'admin1',
      password: 'Admin@999',
      role: 'Admin',
      area: 'ALL',
      name: 'Municipal Officer',
      email: 'admin1@urbandrainx.local',
      assignedAreas: ['ALL'],
    },
    {
      username: 'officer1',
      password: '12345',
      role: 'Field Officer',
      area: 'Velachery',
      name: 'Municipal Officer',
      email: 'officer1@urbandrainx.local',
      assignedAreas: ['Velachery'],
    },
    {
      username: 'supervisor1',
      password: '12345',
      role: 'Area Supervisor',
      area: 'Triplicane',
      name: 'Area Supervisor',
      email: 'supervisor1@urbandrainx.local',
      assignedAreas: ['Velachery', 'Triplicane'],
    },
  ];

  for (const user of defaults) {
    await pool.query(
      `INSERT INTO users (username, password, role, area, name, email, assigned_areas)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (username) DO NOTHING`,
      [
        user.username,
        user.password,
        user.role,
        user.area,
        user.name,
        user.email,
        JSON.stringify(user.assignedAreas),
      ]
    );
  }

  // Backward compatibility for earlier role names.
  await pool.query(
    `UPDATE users
     SET role = 'Admin', area = 'ALL'
     WHERE username = 'admin1' AND LOWER(role) = 'district head'`
  );

  // One-time migration: update old seeded admin test password only.
  await pool.query(
    `UPDATE users
     SET password = 'Admin@999'
     WHERE username = 'admin1' AND password = 'Admin@123'`
  );
}

function toAssignedAreas(value) {
  if (Array.isArray(value)) return value;
  if (value === 'ALL') return ['ALL'];
  if (value) return [String(value)];
  return [];
}

function buildUserPayload(row) {
  const role = normalizeRoleLabel(row.role);
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role,
    area: row.area || (String(role || '').toLowerCase() === 'admin' ? 'ALL' : null),
    assignedAreas: Array.isArray(row.assigned_areas) ? row.assigned_areas : [],
    avatarUrl: row.avatar_url || null,
  };
}

const registerValidation = [
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
  body('role').isString().notEmpty(),
  body('name').optional().isString(),
  body('email').optional().isString(),
  body('area').optional().isString(),
  body('assignedAreas').optional().isArray(),
];

const loginValidation = [
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
];

router.post('/auth/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  try {
    await ensureUsersTable();
    await ensureDefaultUsers();

    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '').trim();
    const role = normalizeRoleLabel(req.body.role || 'Officer');
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const area = role.toLowerCase() === 'admin'
      ? 'ALL'
      : String(req.body.area || '').trim();
    const assignedAreas = toAssignedAreas(req.body.assignedAreas);

    console.log('[AUTH-REGISTER] payload received', {
      username,
      password,
      role,
      area,
    });

    const exists = await pool.query('SELECT id FROM users WHERE username = $1 LIMIT 1', [username]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const result = await pool.query(
      `INSERT INTO users (username, password, role, area, name, email, assigned_areas)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [username, password, role, area, name, email, JSON.stringify(assignedAreas)]
    );

    const user = buildUserPayload(result.rows[0]);
    const token = signAccessToken({
      sub: user.username,
      username: user.username,
      role: user.role,
      area: user.area,
      assignedAreas: user.assignedAreas,
      id: user.id,
    });

    return res.status(201).json({ success: true, token, user });
  } catch (error) {
    console.error('[AUTH-REGISTER]', error.message);
    return res.status(500).json({ success: false, message: 'Unable to register user' });
  }
});

router.post('/auth/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  try {
    await ensureUsersTable();
    await ensureDefaultUsers();

    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '').trim();

    console.log('[AUTH-LOGIN] credentials received', { username, password });

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (result.rows.length > 0) {
      const userRow = result.rows[0];

      if (String(userRow.password || '') !== password) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }

      const user = buildUserPayload(userRow);
      const token = signAccessToken({
        sub: user.username,
        username: user.username,
        role: user.role,
        area: user.area,
        assignedAreas: user.assignedAreas,
        id: user.id,
      });

      return res.status(200).json({ success: true, token, user });
    }

    const fallbackUsers = [
      { username: 'admin1', password: 'Admin@999', role: 'Admin', area: 'ALL', name: 'Municipal Officer' },
      { username: 'officer1', password: '12345', role: 'Officer', area: 'Velachery', name: 'Field Officer' },
      { username: 'supervisor1', password: '12345', role: 'Supervisor', area: 'Triplicane', name: 'Area Supervisor' },
    ];

    const fallback = fallbackUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (fallback) {
      const token = signAccessToken({
        sub: fallback.username,
        username: fallback.username,
        role: fallback.role,
        area: fallback.area,
      });

      return res.status(200).json({ success: true, token, user: fallback });
    }

    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  } catch (error) {
    console.error('[AUTH-LOGIN]', error.message);
    return res.status(500).json({ success: false, message: 'Unable to login' });
  }
});

router.post('/update-password', [body('userId').isInt(), body('password').isString().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  try {
    await ensureUsersTable();
    await ensureDefaultUsers();

    const userId = Number(req.body.userId);
    const nextPassword = String(req.body.password || '').trim();

    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING *',
      [nextPassword, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user: buildUserPayload(result.rows[0]) });
  } catch (error) {
    console.error('[AUTH-UPDATE-PASSWORD]', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update password' });
  }
});

router.put('/auth/reset-password', [body('username').isString().notEmpty(), body('newPassword').isString().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  try {
    await ensureUsersTable();
    await ensureDefaultUsers();

    const username = String(req.body.username || '').trim();
    const newPassword = String(req.body.newPassword || '').trim();

    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING *',
      [newPassword, username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('[AUTH-RESET-PASSWORD]', error.message);
    return res.status(500).json({ success: false, message: 'Unable to reset password' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    await ensureUsersTable();
    await ensureDefaultUsers();

    const result = await pool.query(
      `SELECT id, username, name, email, role, area, assigned_areas
       FROM users
       ORDER BY id ASC`
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      role: normalizeRoleLabel(row.role),
      area: row.area,
      assignedAreas: Array.isArray(row.assigned_areas) ? row.assigned_areas : [],
    }));

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('[USERS-LIST]', error.message);
    return res.status(500).json({ success: false, message: 'Unable to fetch users' });
  }
});

router.put('/users/update-profile', [
  body('username').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('email').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }

  try {
    await ensureUsersTable();
    await ensureDefaultUsers();

    const username = String(req.body.username || '').trim();
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2
       WHERE username = $3
       RETURNING *`,
      [name, email, username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = buildUserPayload(result.rows[0]);
    return res.status(200).json({ success: true, message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('[USERS-UPDATE-PROFILE]', error.message);
    return res.status(500).json({ success: false, message: 'Update failed' });
  }
});

export default router;
