use crate::AppState;
use crate::models::{CreateTaskRequest, Task, TaskStack, UpdateTaskRequest};
use tauri::State;

#[tauri::command]
pub async fn push_task(
    name: String,
    context: Option<String>,
    state: State<'_, AppState>,
) -> Result<Task, String> {
    let db = state.db.lock().await;

    let request = CreateTaskRequest { name, context };

    db.push_task(request)
        .await
        .map_err(|e| format!("Failed to push task: {}", e))
}

#[tauri::command]
pub async fn pop_task(state: State<'_, AppState>) -> Result<Option<Task>, String> {
    let db = state.db.lock().await;

    db.pop_task()
        .await
        .map_err(|e| format!("Failed to pop task: {}", e))
}

#[tauri::command]
pub async fn get_task_stack(state: State<'_, AppState>) -> Result<TaskStack, String> {
    let db = state.db.lock().await;

    db.get_task_stack()
        .await
        .map_err(|e| format!("Failed to get task stack: {}", e))
}

#[tauri::command]
pub async fn update_task(
    id: i64,
    name: Option<String>,
    context: Option<String>,
    state: State<'_, AppState>,
) -> Result<Task, String> {
    let db = state.db.lock().await;

    let request = UpdateTaskRequest { id, name, context };

    db.update_task(request)
        .await
        .map_err(|e| format!("Failed to update task: {}", e))
}

#[tauri::command]
pub async fn get_current_task(state: State<'_, AppState>) -> Result<Option<Task>, String> {
    let db = state.db.lock().await;

    db.get_current_task()
        .await
        .map_err(|e| format!("Failed to get current task: {}", e))
}
