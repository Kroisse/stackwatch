use crate::models::{CreateTaskRequest, Task, TaskStack, UpdateTaskRequest};
use chrono::Utc;
use sqlx::migrate::MigrateDatabase;
use sqlx::sqlite::SqlitePool;
use sqlx::Sqlite;

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        // Create database if it doesn't exist
        if !Sqlite::database_exists(database_url).await.unwrap_or(false) {
            Sqlite::create_database(database_url).await?;
        }

        let pool = SqlitePool::connect(database_url).await?;

        // Run migrations using sqlx's built-in migrator
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;

        Ok(Database { pool })
    }

    // Push a new task to the stack
    pub async fn push_task(&self, request: CreateTaskRequest) -> Result<Task, sqlx::Error> {
        let now = Utc::now();

        // Get the current highest stack position
        let max_position: Option<i32> =
            sqlx::query_scalar("SELECT MAX(stack_position) FROM tasks WHERE ended_at IS NULL")
                .fetch_optional(&self.pool)
                .await?;

        let new_position = max_position.unwrap_or(-1) + 1;

        // Pause current active task if exists
        if let Some(current_task) = self.get_current_task().await? {
            self.pause_task(current_task.id).await?;
        }

        // Insert new task
        let task_id = sqlx::query(
            r#"
            INSERT INTO tasks (context, stack_position, created_at, ended_at, updated_at)
            VALUES (?1, ?2, ?3, NULL, ?4)
            "#,
        )
        .bind(&request.context)
        .bind(new_position)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?
        .last_insert_rowid();

        self.get_task_by_id(task_id).await
    }

    // Pop the current task from the stack
    pub async fn pop_task(&self) -> Result<Option<Task>, sqlx::Error> {
        let current_task = match self.get_current_task().await? {
            Some(task) => task,
            None => return Ok(None),
        };

        // Mark current task as completed
        self.pause_task(current_task.id).await?;

        // Activate the previous task in the stack
        if let Some(previous_task) = self.get_previous_task(current_task.stack_position).await? {
            self.resume_task(previous_task.id).await?;
        }

        Ok(Some(current_task))
    }

    // Get current active task
    pub async fn get_current_task(&self) -> Result<Option<Task>, sqlx::Error> {
        sqlx::query_as::<_, Task>(
            r#"
            SELECT id, context, stack_position, created_at, ended_at, updated_at
            FROM tasks
            WHERE ended_at IS NULL
            ORDER BY stack_position DESC
            LIMIT 1
            "#,
        )
        .fetch_optional(&self.pool)
        .await
    }

    // Get all tasks in the stack
    pub async fn get_task_stack(&self) -> Result<TaskStack, sqlx::Error> {
        let tasks = sqlx::query_as::<_, Task>(
            r#"
            SELECT id, context, stack_position, created_at, ended_at, updated_at
            FROM tasks
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
    pub async fn update_task(&self, request: UpdateTaskRequest) -> Result<Task, sqlx::Error> {
        let now = Utc::now();

        sqlx::query("UPDATE tasks SET context = ?1, updated_at = ?2 WHERE id = ?3")
            .bind(&request.context)
            .bind(now.to_rfc3339())
            .bind(request.id)
            .execute(&self.pool)
            .await?;

        self.get_task_by_id(request.id).await
    }

    // Helper methods
    async fn get_task_by_id(&self, id: i64) -> Result<Task, sqlx::Error> {
        sqlx::query_as::<_, Task>(
            r#"
            SELECT id, context, stack_position, created_at, ended_at, updated_at
            FROM tasks
            WHERE id = ?1
            "#,
        )
        .bind(id)
        .fetch_one(&self.pool)
        .await
    }

    async fn get_previous_task(&self, current_position: i32) -> Result<Option<Task>, sqlx::Error> {
        sqlx::query_as::<_, Task>(
            r#"
            SELECT id, context, stack_position, created_at, ended_at, updated_at
            FROM tasks
            WHERE stack_position < ?1
            ORDER BY stack_position DESC
            LIMIT 1
            "#,
        )
        .bind(current_position)
        .fetch_optional(&self.pool)
        .await
    }

    async fn pause_task(&self, task_id: i64) -> Result<(), sqlx::Error> {
        let now = Utc::now();

        sqlx::query("UPDATE tasks SET ended_at = ?1, updated_at = ?2 WHERE id = ?3")
            .bind(now.to_rfc3339())
            .bind(now.to_rfc3339())
            .bind(task_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn resume_task(&self, task_id: i64) -> Result<(), sqlx::Error> {
        let task = self.get_task_by_id(task_id).await?;
        let now = Utc::now();

        // Create a new task session with the same context
        sqlx::query(
            r#"
            INSERT INTO tasks (context, stack_position, created_at, ended_at, updated_at)
            VALUES (?1, ?2, ?3, NULL, ?4)
            "#,
        )
        .bind(&task.context)
        .bind(task.stack_position)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
