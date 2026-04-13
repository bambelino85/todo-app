const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const app  = express();
const PORT = process.env.PORT || 3000;

/* ─── Middleware ─── */
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '20mb' }));

/* ─── Routes ─── */
app.use('/api/auth',  authRoutes);
app.use('/api/tasks', taskRoutes);

/* ─── Health check ─── */
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

/* ─── 404 fallback ─── */
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

/* ─── Global error handler ─── */
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Task Manager API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
