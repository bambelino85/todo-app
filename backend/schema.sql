-- ============================================================
--  Task Manager Schema v2 (with Auth)
--  Run: psql -U <user> -d <dbname> -f schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS tasks (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT        DEFAULT '',
    category    TEXT        DEFAULT 'Professional',
    priority    TEXT        DEFAULT 'Medium',
    due_date    DATE,
    due_time    TIME,
    recurring   TEXT        DEFAULT 'none',
    tags        JSONB       DEFAULT '[]',
    completed   BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    subtasks    JSONB       DEFAULT '[]',
    attachments JSONB       DEFAULT '[]',
    sort_order  INTEGER     DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id    ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed  ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_priority   ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date   ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order);

-- Migration guard: add user_id if upgrading from v1 (no-op if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='tasks' AND column_name='user_id'
    ) THEN
        ALTER TABLE tasks
            ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;
