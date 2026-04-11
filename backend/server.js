const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database connection
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.on('connect', () => {
    console.log('? Connected to PostgreSQL database');
});

pool.on('error', (error) => {
    console.error('? Database connection error:', error);
});

// Initialize database
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                priority VARCHAR(20),
                due_date DATE,
                due_time TIME,
                completed BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                attachments JSONB DEFAULT '[]'
            )
        `);
        console.log('? Database table initialized successfully');
    } catch (error) {
        console.error('? Database initialization error:', error);
    }
}

initializeDatabase();

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running ?' });
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single task
app.get('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, category, priority, due_date, due_time, attachments } = req.body;
        
        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const result = await pool.query(
            `INSERT INTO tasks (title, description, category, priority, due_date, due_time, attachments)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title, description || '', category || '', priority || 'Medium', due_date || null, due_time || null, JSON.stringify(attachments || [])]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, priority, due_date, due_time, completed, attachments } = req.body;

        const result = await pool.query(
            `UPDATE tasks 
             SET title = $1, description = $2, category = $3, priority = $4, due_date = $5, due_time = $6, completed = $7, attachments = $8
             WHERE id = $9
             RETURNING *`,
            [title, description || '', category || '', priority || 'Medium', due_date || null, due_time || null, completed || false, JSON.stringify(attachments || []), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search tasks
app.get('/api/tasks/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const searchTerm = `%${query}%`;
        
        const result = await pool.query(
            `SELECT * FROM tasks 
             WHERE title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1
             ORDER BY created_at DESC`,
            [searchTerm]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error searching tasks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete all tasks
app.delete('/api/tasks', async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks');
        res.json({ success: true, message: 'All tasks deleted successfully' });
    } catch (error) {
        console.error('Error deleting all tasks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`?? Task Manager API running on port ${port}`);
    console.log(`?? Visit http://localhost:${port}`);
});
