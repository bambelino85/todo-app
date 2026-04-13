const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const pool     = require('../db');
const authMiddleware = require('../middleware/auth');

const SALT_ROUNDS = 12;
const TOKEN_TTL   = '7d';

function issueToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_TTL }
    );
}

function safeUser(row) {
    return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
    const { name = '', email = '', password = '' } = req.body;

    if (!email.trim() || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    if (password.length < 8)
        return res.status(400).json({ error: 'Password must be at least 8 characters' });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return res.status(400).json({ error: 'Invalid email address' });

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (existing.rows.length)
            return res.status(409).json({ error: 'An account with that email already exists' });

        const hash   = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING *',
            [email.trim().toLowerCase(), hash, name.trim()]
        );

        const user  = result.rows[0];
        res.status(201).json({ token: issueToken(user), user: safeUser(user) });
    } catch (err) {
        console.error('POST /api/auth/register', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
    const { email = '', password = '' } = req.body;

    if (!email.trim() || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        const user   = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash)))
            return res.status(401).json({ error: 'Invalid email or password' });

        res.json({ token: issueToken(user), user: safeUser(user) });
    } catch (err) {
        console.error('POST /api/auth/login', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

/* GET /api/auth/me */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
        if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
        res.json({ user: safeUser(result.rows[0]) });
    } catch (err) {
        console.error('GET /api/auth/me', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

module.exports = router;
