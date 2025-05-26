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
            sqlx::query_scalar("SELECT MAX(stack_position) FROM tasks WHERE is_active = TRUE")
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
            INSERT INTO tasks (name, context, start_time, stack_position, is_active, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, TRUE, ?5, ?6)
            "#,
        )
        .bind(&request.name)
        .bind(&request.context)
        .bind(now.to_rfc3339())
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
        sqlx::query("UPDATE tasks SET is_active = FALSE WHERE id = ?1")
            .bind(current_task.id)
            .execute(&self.pool)
            .await?;

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
            SELECT id, name, context, start_time, total_duration, stack_position, is_active, created_at, updated_at
            FROM tasks
            WHERE is_active = TRUE
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
            SELECT id, name, context, start_time, total_duration, stack_position, is_active, created_at, updated_at
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

        if let Some(name) = &request.name {
            sqlx::query("UPDATE tasks SET name = ?1, updated_at = ?2 WHERE id = ?3")
                .bind(name)
                .bind(now.to_rfc3339())
                .bind(request.id)
                .execute(&self.pool)
                .await?;
        }

        if let Some(context) = &request.context {
            sqlx::query("UPDATE tasks SET context = ?1, updated_at = ?2 WHERE id = ?3")
                .bind(context)
                .bind(now.to_rfc3339())
                .bind(request.id)
                .execute(&self.pool)
                .await?;
        }

        self.get_task_by_id(request.id).await
    }

    // Helper methods
    async fn get_task_by_id(&self, id: i64) -> Result<Task, sqlx::Error> {
        sqlx::query_as::<_, Task>(
            r#"
            SELECT id, name, context, start_time, total_duration, stack_position, is_active, created_at, updated_at
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
            SELECT id, name, context, start_time, total_duration, stack_position, is_active, created_at, updated_at
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
        let task = self.get_task_by_id(task_id).await?;
        let now = Utc::now();
        let start_time = task.start_time;

        let duration_seconds = (now - start_time.with_timezone(&Utc)).num_seconds();
        let new_total_duration = task.total_duration + duration_seconds;

        sqlx::query("UPDATE tasks SET total_duration = ?1, updated_at = ?2 WHERE id = ?3")
            .bind(new_total_duration)
            .bind(now.to_rfc3339())
            .bind(task_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn resume_task(&self, task_id: i64) -> Result<(), sqlx::Error> {
        let now = Utc::now();

        sqlx::query(
            "UPDATE tasks SET start_time = ?1, is_active = TRUE, updated_at = ?2 WHERE id = ?3",
        )
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(task_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
