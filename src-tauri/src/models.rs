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

impl Task {
    pub fn title(&self) -> &str {
        // First line of context as title
        match self.context.lines().next() {
            Some(line) if !line.trim().is_empty() => line,
            _ => "Untitled Task",
        }
    }

    pub fn description(&self) -> &str {
        // Exclude the first line from context as description
        self.context
            .split_once('\n')
            .map(|(_, desc)| desc.trim_start_matches('\n'))
            .unwrap_or("")
    }

    pub fn is_active(&self) -> bool {
        self.ended_at.is_none()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub context: Option<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentTaskInfo {
    pub task: Task,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_task(context: &str, ended_at: Option<DateTime<Utc>>) -> Task {
        Task {
            id: 1,
            context: context.to_string(),
            stack_position: 0,
            created_at: Utc::now(),
            ended_at,
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn test_task_title_single_line() {
        let task = create_test_task("My Task", None);
        assert_eq!(task.title(), "My Task");
    }

    #[test]
    fn test_task_title_multi_line() {
        let task = create_test_task("My Task\nThis is a description\nWith multiple lines", None);
        assert_eq!(task.title(), "My Task");
    }

    #[test]
    fn test_task_title_empty() {
        let task = create_test_task("", None);
        assert_eq!(task.title(), "Untitled Task");
    }

    #[test]
    fn test_task_title_only_newlines() {
        let task = create_test_task("\n\n", None);
        assert_eq!(task.title(), "Untitled Task");
    }

    #[test]
    fn test_task_description_single_line() {
        let task = create_test_task("My Task", None);
        assert_eq!(task.description(), "");
    }

    #[test]
    fn test_task_description_multi_line() {
        let task = create_test_task("My Task\nThis is a description\nWith multiple lines", None);
        assert_eq!(
            task.description(),
            "This is a description\nWith multiple lines"
        );
    }

    #[test]
    fn test_task_description_with_leading_whitespace() {
        let task = create_test_task("My Task\n  This is indented\n    More indented", None);
        assert_eq!(task.description(), "  This is indented\n    More indented");
    }

    #[test]
    fn test_task_description_empty_after_title() {
        let task = create_test_task("My Task\n", None);
        assert_eq!(task.description(), "");
    }

    #[test]
    fn test_task_description_with_trailing_whitespace() {
        let task = create_test_task("My Task\n  Description with spaces  \n  ", None);
        assert_eq!(task.description(), "  Description with spaces  \n  ");
    }

    #[test]
    fn test_task_is_active_true() {
        let task = create_test_task("Active Task", None);
        assert!(task.is_active());
    }

    #[test]
    fn test_task_is_active_false() {
        let task = create_test_task("Completed Task", Some(Utc::now()));
        assert!(!task.is_active());
    }

    #[test]
    fn test_task_title_and_description_with_blank_lines() {
        let task = create_test_task(
            "My Task\n\nDescription after blank line\n\nMore content",
            None,
        );
        assert_eq!(task.title(), "My Task");
        assert_eq!(
            task.description(),
            "Description after blank line\n\nMore content"
        );
    }

    #[test]
    fn test_task_title_with_special_characters() {
        let task = create_test_task("Task with 特殊文字 and émojis 🎉", None);
        assert_eq!(task.title(), "Task with 特殊文字 and émojis 🎉");
    }
}
