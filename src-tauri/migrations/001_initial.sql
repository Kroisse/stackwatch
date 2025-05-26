-- Migration to create the tasks table for StackWatch
-- This implements the stack-based time management system

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                    -- Task name/title
    context TEXT,                          -- Free-form context/memo for the task
    start_time TEXT NOT NULL,              -- When the task was started (ISO 8601)
    end_time TEXT,                         -- When the task was ended (ISO 8601), NULL if still active
    stack_position INTEGER NOT NULL,       -- Position in the stack (higher = more recent)
    is_active INTEGER NOT NULL DEFAULT 0,  -- Whether this task is currently active (0/1 for boolean)
    created_at TEXT NOT NULL,              -- When the task was created (ISO 8601)
    updated_at TEXT NOT NULL               -- When the task was last updated (ISO 8601)
);

-- Index for efficient stack operations
CREATE INDEX IF NOT EXISTS idx_tasks_stack_position ON tasks(stack_position);
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);

-- Example idle task (special case in the system)
INSERT OR IGNORE INTO tasks (
    id, name, context, start_time, end_time, stack_position, is_active, created_at, updated_at
) VALUES (
    1, 'Idle', 'Default idle state', datetime('now'), NULL, 0, 1, datetime('now'), datetime('now')
);
