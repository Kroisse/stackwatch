-- Revert migration 002_remove_name_field.sql
-- This script restores the original schema from migration 001

-- Create a temporary table with the original schema
CREATE TABLE tasks_original (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                    -- Task name/title
    context TEXT,                          -- Free-form context/memo for the task
    start_time TEXT NOT NULL,              -- When the task was started (ISO 8601)
    end_time TEXT,                         -- When the task was ended (ISO 8601), NULL if still active
    total_duration INTEGER NOT NULL DEFAULT 0,  -- Total time spent in seconds
    stack_position INTEGER NOT NULL,       -- Position in the stack (higher = more recent)
    is_active INTEGER NOT NULL DEFAULT 0,  -- Whether this task is currently active (0/1 for boolean)
    created_at TEXT NOT NULL,              -- When the task was created (ISO 8601)
    updated_at TEXT NOT NULL               -- When the task was last updated (ISO 8601)
);

-- Copy data back from simplified table, extracting name from first line of context
INSERT INTO tasks_original (id, name, context, start_time, end_time, total_duration, stack_position, is_active, created_at, updated_at)
SELECT
    id,
    -- Extract first line as name
    CASE
        WHEN instr(context, char(10)) > 0 THEN substr(context, 1, instr(context, char(10)) - 1)
        ELSE context
    END as name,
    -- Extract remaining lines as context (or NULL if single line)
    CASE
        WHEN instr(context, char(10)) > 0 THEN substr(context, instr(context, char(10)) + 1)
        ELSE NULL
    END as context,
    created_at as start_time,  -- Restore start_time from created_at
    ended_at as end_time,
    0 as total_duration,  -- We lost duration data, default to 0
    stack_position,
    CASE
        WHEN ended_at IS NULL THEN 1
        ELSE 0
    END as is_active,
    created_at,
    updated_at
FROM tasks;

-- Drop the simplified table
DROP TABLE tasks;

-- Rename back to tasks
ALTER TABLE tasks_original RENAME TO tasks;

-- Recreate original indexes
CREATE INDEX IF NOT EXISTS idx_tasks_stack_position ON tasks(stack_position);
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
