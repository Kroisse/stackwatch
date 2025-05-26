-- Migration to simplify the task schema:
-- 1. Remove name field (use first line of context as implicit name)
-- 2. Remove is_active field (use ended_at IS NULL to determine active state)
-- 3. Remove start_time field (use created_at as the start time)
-- 4. Rename end_time to ended_at for consistency

-- SQLite doesn't support adding NOT NULL columns without a default value,
-- and we can't modify constraints on existing columns, so we need to recreate the table

-- Create a temporary table with the new schema
CREATE TABLE tasks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context TEXT NOT NULL,                 -- Full task content (first line is implicit name)
    stack_position INTEGER NOT NULL,       -- Position in the stack (higher = more recent)
    created_at TEXT NOT NULL,              -- When the task was created/started (ISO 8601)
    ended_at TEXT,                         -- When the task was ended (ISO 8601), NULL if still active
    updated_at TEXT NOT NULL               -- When the task was last updated (ISO 8601)
);

-- Copy data from old table, combining name and context
INSERT INTO tasks_new (id, context, stack_position, created_at, ended_at, updated_at)
SELECT 
    id,
    CASE 
        WHEN context IS NULL OR context = '' THEN name
        WHEN name = substr(context, 1, length(name)) THEN context
        ELSE name || char(10) || context
    END as context,
    stack_position,
    start_time as created_at,  -- Use start_time as created_at
    CASE 
        WHEN is_active = 1 THEN NULL
        ELSE end_time
    END as ended_at,
    updated_at
FROM tasks;

-- Drop the old table
DROP TABLE tasks;

-- Rename the new table
ALTER TABLE tasks_new RENAME TO tasks;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tasks_stack_position ON tasks(stack_position);
CREATE INDEX IF NOT EXISTS idx_tasks_ended_at ON tasks(ended_at); -- Index for finding active tasks