const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

/**
 * Middleware: verify JWT from Authorization header.
 * Attaches req.user = { id, email } on success.
 * Returns 401 on missing or invalid token.
 */
function requireAuth(req, res, next) {
    const header = req.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = header.slice(7);

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = { id: payload.id, email: payload.email };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired — please log in again' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = { requireAuth, JWT_SECRET };
