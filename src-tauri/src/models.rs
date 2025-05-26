use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Task {
    pub id: i64,
    pub context: String,
    pub stack_position: i32,
    pub created_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskRequest {
    pub id: i64,
    pub context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStack {
    pub tasks: Vec<Task>,
    pub current_task: Option<Task>,
}
