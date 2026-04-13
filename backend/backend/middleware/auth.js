const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.userId, email: payload.email };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired - please log in again' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

module.exports = requireAuth;
