use crate::{
    error::Result,
    models::{CreateTaskRequest, Task, TaskStack, UpdateTaskRequest},
};
use chrono::Utc;
use sqlx::Sqlite;
use sqlx::migrate::MigrateDatabase;
use sqlx::sqlite::SqlitePool;

pub trait DatabaseDelegate: Send + Sync {
    fn on_task_created(&self, task: &Task) -> Result<()>;
    fn on_task_popped(&self, task: &Task) -> Result<()>;
    fn on_task_updated(&self, task: &Task) -> Result<()>;
    fn on_stack_updated(&self, stack: &TaskStack) -> Result<()>;
}

pub struct Database {
    pool: SqlitePool,
    delegate: Box<dyn DatabaseDelegate>,
}

impl Database {
    pub async fn new(
        database_url: &str,
        delegate: Box<dyn DatabaseDelegate>,
    ) -> Result<Self> {
        // Create database if it doesn't exist
        if !Sqlite::database_exists(database_url).await.unwrap_or(false) {
            Sqlite::create_database(database_url).await?;
        }

        let pool = SqlitePool::connect(database_url).await?;

        // Run migrations using sqlx's built-in migrator
        sqlx::migrate!("./migrations").run(&pool).await?;

        Ok(Database { pool, delegate })
    }

    /// Push a new task to the stack
    ///
    /// This creates a new task with the next available stack_position.
    /// The current task remains active and is not paused or ended.
    ///
    /// The current task is always the one with the highest stack_position.
    pub async fn push_task(&self, request: CreateTaskRequest) -> Result<Task> {
        let now = Utc::now();

        // Get the current highest stack position (excluding Idle task)
        let max_position: Option<i32> =
            sqlx::query_scalar("SELECT MAX(stack_position) FROM tasks WHERE ended_at IS NULL AND context NOT LIKE 'Idle%'")
                .fetch_optional(&self.pool)
                .await?;

        let new_position = max_position.unwrap_or(-1) + 1;

        // Current active task remains in the stack, no need to pause it

        // Insert new task
        let context = request.context.unwrap_or_else(|| "New Task".to_string());

        let task_id = sqlx::query(
            r#"
            INSERT INTO tasks (context, stack_position, created_at, ended_at, updated_at)
            VALUES (?1, ?2, ?3, NULL, ?4)
            "#,
        )
        .bind(&context)
        .bind(new_position)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?
        .last_insert_rowid();

        let task = self.get_task_by_id(task_id).await?;

        // Emit event for task creation
        let _ = self.delegate.on_task_created(&task);

        // Emit event for stack update
        if let Ok(stack) = self.get_task_stack().await {
            let _ = self.delegate.on_stack_updated(&stack);
        }

        Ok(task)
    }

    /// Pop the current task from the stack
    ///
    /// This marks the current task (highest stack_position) as completed by setting ended_at.
    /// The previous task in the stack automatically becomes the current task.
    /// No new tasks are created - we simply reveal the task that was already there.
    ///
    /// Example flow:
    /// 1. Push Task1 (position=0, active)
    /// 2. Push Task2 (position=1, active) - Task1 remains active
    /// 3. Pop -> Task2 ended, Task1 becomes current (no duplication)
    pub async fn pop_task(&self) -> Result<Option<Task>> {
        let current_task = match self.get_current_task().await? {
            Some(task) => task,
            None => {
                // If there's no current task, check if there's an Idle task that can be ended
                let idle_task = sqlx::query_as::<_, Task>(
                    r#"
                    SELECT id, context, stack_position, created_at, ended_at, updated_at
                    FROM tasks
                    WHERE context LIKE 'Idle%' AND ended_at IS NULL
                    ORDER BY id
                    LIMIT 1
                    "#,
                )
                .fetch_optional(&self.pool)
                .await?;

                match idle_task {
                    Some(task) => task,
                    None => return Ok(None),
                }
            }
        };

        // Mark current task as completed
        let now = Utc::now();
        sqlx::query("UPDATE tasks SET ended_at = ?1, updated_at = ?2 WHERE id = ?3")
            .bind(now.to_rfc3339())
            .bind(now.to_rfc3339())
            .bind(current_task.id)
            .execute(&self.pool)
            .await?;

        // Get the updated task to return
        let ended_task = self.get_task_by_id(current_task.id).await?;

        // Previous task in the stack is already active (ended_at is NULL),
        // so we don't need to do anything special to resume it

        // Emit event for task popped
        let _ = self.delegate.on_task_popped(&ended_task);

        // Emit event for stack update
        if let Ok(stack) = self.get_task_stack().await {
            let _ = self.delegate.on_stack_updated(&stack);
        }

        Ok(Some(ended_task))
    }

    // Get current active task (excluding Idle task)
    pub async fn get_current_task(&self) -> Result<Option<Task>> {
        Ok(sqlx::query_as::<_, Task>(
            r#"
            SELECT id, context, stack_position, created_at, ended_at, updated_at
            FROM tasks
            WHERE ended_at IS NULL AND context NOT LIKE 'Idle%'
            ORDER BY stack_position DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.pool)
        .await?)
    }

    // Get all active tasks in the stack (excluding Idle task)
    pub async fn get_task_stack(&self) -> Result<TaskStack> {
        let tasks = sqlx::query_as::<_, Task>(
            r#"
            SELECT id, context, stack_position, created_at, ended_at, updated_at
            FROM tasks
            WHERE ended_at IS NULL AND context NOT LIKE 'Idle%'
            ORDER BY stack_position DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let current_task = self.get_current_task().await?;

        Ok(TaskStack {
            tasks,
            current_task,
        })
    }

    // Update task context
    pub async fn update_task(&self, request: UpdateTaskRequest) -> Result<Task> {
        let now = Utc::now();

        sqlx::query("UPDATE tasks SET context = ?1, updated_at = ?2 WHERE id = ?3")
            .bind(&request.context)
            .bind(now.to_rfc3339())
            .bind(request.id)
            .execute(&self.pool)
            .await?;

        let task = self.get_task_by_id(request.id).await?;

        // Emit event for task update
        let _ = self.delegate.on_task_updated(&task);

        // Emit event for stack update
        if let Ok(stack) = self.get_task_stack().await {
            let _ = self.delegate.on_stack_updated(&stack);
        }

        Ok(task)
    }

    // Helper methods
    async fn get_task_by_id(&self, id: i64) -> Result<Task> {
        Ok(sqlx::query_as::<_, Task>(
            r#"
            SELECT id, context, stack_position, created_at, ended_at, updated_at
            FROM tasks
            WHERE id = ?1
            "#,
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockDatabaseDelegate {}

    impl DatabaseDelegate for MockDatabaseDelegate {
        fn on_task_created(&self, _task: &Task) -> Result<()> {
            Ok(())
        }

        fn on_task_popped(&self, _task: &Task) -> Result<()> {
            Ok(())
        }

        fn on_task_updated(&self, _task: &Task) -> Result<()> {
            Ok(())
        }

        fn on_stack_updated(&self, _stack: &TaskStack) -> Result<()> {
            Ok(())
        }
    }

    async fn create_test_database() -> Result<Database> {
        // Use an in-memory database for testing
        let delegate = MockDatabaseDelegate {};
        Ok(Database::new(":memory:", Box::new(delegate)).await?)
    }

    #[tokio::test]
    async fn test_push_pop_no_duplication() {
        let db = create_test_database().await.unwrap();

        // Check if there are any existing tasks
        let initial_stack = db.get_task_stack().await.unwrap();
        println!("Initial stack size: {}", initial_stack.tasks.len());

        // Push first task
        let task1 = db
            .push_task(CreateTaskRequest {
                context: Some("Task 1".to_string()),
            })
            .await
            .unwrap();

        println!(
            "Task1: id={}, position={}, context={}",
            task1.id, task1.stack_position, task1.context
        );

        assert_eq!(task1.context, "Task 1");
        assert_eq!(task1.stack_position, 1);
        assert!(task1.ended_at.is_none());

        // Verify task1 is current
        let current = db.get_current_task().await.unwrap();
        assert!(current.is_some());
        assert_eq!(current.unwrap().id, task1.id);

        // Push second task
        let task2 = db
            .push_task(CreateTaskRequest {
                context: Some("Task 2".to_string()),
            })
            .await
            .unwrap();

        assert_eq!(task2.context, "Task 2");
        assert_eq!(task2.stack_position, 2);
        assert!(task2.ended_at.is_none());

        // Verify task2 is now current
        let current = db.get_current_task().await.unwrap();
        assert!(current.is_some());
        assert_eq!(current.unwrap().id, task2.id);

        // Verify both tasks are active
        let stack = db.get_task_stack().await.unwrap();
        assert_eq!(stack.tasks.len(), 2);
        assert!(stack.tasks.iter().all(|t| t.ended_at.is_none()));

        // Pop current task (task2)
        let popped = db.pop_task().await.unwrap();
        assert!(popped.is_some());
        assert_eq!(popped.unwrap().id, task2.id);

        // Verify task1 is current again
        let current = db.get_current_task().await.unwrap();
        assert!(current.is_some());
        assert_eq!(current.unwrap().id, task1.id);

        // Verify only one active task remains (no duplication)
        let stack = db.get_task_stack().await.unwrap();
        println!("Stack after pop: {:?}", stack.tasks.len());
        for (i, task) in stack.tasks.iter().enumerate() {
            println!(
                "Task {}: id={}, context={}, ended_at={:?}",
                i, task.id, task.context, task.ended_at
            );
        }
        assert_eq!(stack.tasks.len(), 1);
        assert_eq!(stack.tasks[0].id, task1.id);
        assert!(stack.tasks[0].ended_at.is_none());
    }

    #[tokio::test]
    async fn test_pop_empty_stack() {
        let db = create_test_database().await.unwrap();

        // Sleep for 0.5 seconds
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        // Pop from empty stack should return None
        let result = db.pop_task().await.unwrap();
        let task = result.unwrap();
        assert!(task.context.starts_with("Idle\n"));
        let ended_at = task.ended_at.expect("Task should be ended");
        assert_eq!(ended_at, task.updated_at);
    }

    #[tokio::test]
    async fn test_multiple_push_pop_sequence() {
        let db = create_test_database().await.unwrap();

        // Push 3 tasks
        let task1 = db
            .push_task(CreateTaskRequest {
                context: Some("Task 1".to_string()),
            })
            .await
            .unwrap();

        let task2 = db
            .push_task(CreateTaskRequest {
                context: Some("Task 2".to_string()),
            })
            .await
            .unwrap();

        let task3 = db
            .push_task(CreateTaskRequest {
                context: Some("Task 3".to_string()),
            })
            .await
            .unwrap();

        // Current should be task3
        let current = db.get_current_task().await.unwrap().unwrap();
        assert_eq!(current.id, task3.id);

        // Pop task3
        db.pop_task().await.unwrap();

        // Current should be task2
        let current = db.get_current_task().await.unwrap().unwrap();
        assert_eq!(current.id, task2.id);

        // Pop task2
        db.pop_task().await.unwrap();

        // Current should be task1
        let current = db.get_current_task().await.unwrap().unwrap();
        assert_eq!(current.id, task1.id);

        // Stack should have only task1
        let stack = db.get_task_stack().await.unwrap();
        assert_eq!(stack.tasks.len(), 1);
        assert_eq!(stack.tasks[0].id, task1.id);
    }

    #[tokio::test]
    async fn test_update_task_context() {
        let db = create_test_database().await.unwrap();

        // Create a task
        let task = db
            .push_task(CreateTaskRequest {
                context: Some("Original context".to_string()),
            })
            .await
            .unwrap();

        // Update its context
        let updated = db
            .update_task(UpdateTaskRequest {
                id: task.id,
                context: "Updated context".to_string(),
            })
            .await
            .unwrap();

        assert_eq!(updated.id, task.id);
        assert_eq!(updated.context, "Updated context");
        assert_eq!(updated.stack_position, task.stack_position);
    }

    #[tokio::test]
    async fn test_task_stack_ordering() {
        let db = create_test_database().await.unwrap();

        // Push tasks in order
        for i in 1..=3 {
            db.push_task(CreateTaskRequest {
                context: Some(format!("Task {}", i)),
            })
            .await
            .unwrap();
        }

        // Get stack
        let stack = db.get_task_stack().await.unwrap();

        // Verify ordering (highest stack_position first)
        assert_eq!(stack.tasks.len(), 3);
        assert_eq!(stack.tasks[0].context, "Task 3");
        assert_eq!(stack.tasks[0].stack_position, 3);
        assert_eq!(stack.tasks[1].context, "Task 2");
        assert_eq!(stack.tasks[1].stack_position, 2);
        assert_eq!(stack.tasks[2].context, "Task 1");
        assert_eq!(stack.tasks[2].stack_position, 1);

        // Verify current task
        assert!(stack.current_task.is_some());
        assert_eq!(stack.current_task.unwrap().context, "Task 3");
    }
}
