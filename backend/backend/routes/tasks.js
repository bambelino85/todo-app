const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');

// Protect all task routes
router.use(auth);

function rowToTask(row) {
    return {
        id:          row.id,
        title:       row.title,
        description: row.description,
        category:    row.category,
        priority:    row.priority,
        dueDate:     row.due_date   ? row.due_date.toISOString().split('T')[0] : '',
        dueTime:     row.due_time   || '',
        recurring:   row.recurring,
        tags:        row.tags       || [],
        completed:   row.completed,
        createdAt:   row.created_at,
        subtasks:    row.subtasks   || [],
        attachments: row.attachments|| [],
        sortOrder:   row.sort_order,
    };
}

/* GET /api/tasks */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tasks WHERE user_id = $1 ORDER BY sort_order DESC, created_at DESC',
            [req.user.id]
        );
        res.json(result.rows.map(rowToTask));
    } catch (err) {
        console.error('GET /api/tasks', err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

/* POST /api/tasks */
router.post('/', async (req, res) => {
    const {
        title, description = '', category = 'Professional',
        priority = 'Medium', dueDate = null, dueTime = null,
        recurring = 'none', tags = [], attachments = []
    } = req.body;

    if (!title || !title.trim())
        return res.status(400).json({ error: 'Title is required' });

    try {
        const maxRes = await pool.query(
            'SELECT COALESCE(MAX(sort_order), 0) AS mx FROM tasks WHERE user_id = $1',
            [req.user.id]
        );
        const sortOrder = maxRes.rows[0].mx + 1;

        const result = await pool.query(
            `INSERT INTO tasks
                (user_id, title, description, category, priority, due_date, due_time,
                 recurring, tags, attachments, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING *`,
            [
                req.user.id, title.trim(), description, category, priority,
                dueDate || null, dueTime || null,
                recurring, JSON.stringify(tags), JSON.stringify(attachments), sortOrder
            ]
        );
        res.status(201).json(rowToTask(result.rows[0]));
    } catch (err) {
        console.error('POST /api/tasks', err);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

/* PUT /api/tasks/:id */
router.put('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid task ID' });

    const {
        title, description = '', category = 'Professional',
        priority = 'Medium', dueDate = null, dueTime = null,
        recurring = 'none', tags = [], completed, subtasks, attachments
    } = req.body;

    if (!title || !title.trim())
        return res.status(400).json({ error: 'Title is required' });

    try {
        const result = await pool.query(
            `UPDATE tasks SET
                title=$1, description=$2, category=$3, priority=$4,
                due_date=$5, due_time=$6, recurring=$7, tags=$8,
                completed=$9, subtasks=$10, attachments=$11
             WHERE id=$12 AND user_id=$13
             RETURNING *`,
            [
                title.trim(), description, category, priority,
                dueDate || null, dueTime || null, recurring,
                JSON.stringify(tags),
                completed !== undefined ? completed : false,
                JSON.stringify(subtasks || []),
                JSON.stringify(attachments || []),
                id, req.user.id
            ]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
        res.json(rowToTask(result.rows[0]));
    } catch (err) {
        console.error(`PUT /api/tasks/${id}`, err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

/* PATCH /api/tasks/reorder/bulk */
router.patch('/reorder/bulk', async (req, res) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || !orderedIds.length)
        return res.status(400).json({ error: 'orderedIds array is required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < orderedIds.length; i++) {
            await client.query(
                'UPDATE tasks SET sort_order=$1 WHERE id=$2 AND user_id=$3',
                [orderedIds.length - i, orderedIds[i], req.user.id]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('PATCH /api/tasks/reorder/bulk', err);
        res.status(500).json({ error: 'Failed to reorder tasks' });
    } finally {
        client.release();
    }
});

/* PATCH /api/tasks/:id */
router.patch('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid task ID' });

    const allowed    = ['title','description','category','priority','completed','recurring'];
    const jsonFields = { tags: true, subtasks: true, attachments: true };
    const colMap     = { dueDate: 'due_date', dueTime: 'due_time' };

    const setClauses = [];
    const values     = [];
    let   idx        = 1;

    for (const [key, val] of Object.entries(req.body)) {
        const col = colMap[key] || (allowed.includes(key) ? key : null);
        if (col) {
            setClauses.push(`${col} = $${idx++}`);
            values.push(val);
        } else if (jsonFields[key]) {
            setClauses.push(`${key} = $${idx++}`);
            values.push(JSON.stringify(val));
        }
    }

    for (const [key, col] of Object.entries(colMap)) {
        if (req.body[key] !== undefined && !setClauses.some(c => c.startsWith(col))) {
            setClauses.push(`${col} = $${idx++}`);
            values.push(req.body[key] || null);
        }
    }

    if (!setClauses.length) return res.status(400).json({ error: 'No valid fields to update' });

    values.push(id, req.user.id);
    try {
        const result = await pool.query(
            `UPDATE tasks SET ${setClauses.join(', ')} WHERE id=$${idx} AND user_id=$${idx+1} RETURNING *`,
            values
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
        res.json(rowToTask(result.rows[0]));
    } catch (err) {
        console.error(`PATCH /api/tasks/${id}`, err);
        res.status(500).json({ error: 'Failed to patch task' });
    }
});

/* DELETE /api/tasks/:id */
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid task ID' });
    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id=$1 AND user_id=$2 RETURNING id',
            [id, req.user.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
        res.json({ deleted: id });
    } catch (err) {
        console.error(`DELETE /api/tasks/${id}`, err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

/* DELETE /api/tasks (clear all for this user) */
router.delete('/', async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE user_id=$1', [req.user.id]);
        res.json({ deleted: 'all' });
    } catch (err) {
        console.error('DELETE /api/tasks', err);
        res.status(500).json({ error: 'Failed to clear tasks' });
    }
});

module.exports = router;
