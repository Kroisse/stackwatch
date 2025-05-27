use crate::AppState;
use crate::models::{CreateTaskRequest, CurrentTaskInfo, Task, TaskStack, UpdateTaskRequest};
use tauri::{Manager, State, WebviewWindow};

#[tauri::command]
pub async fn push_task(
    context: Option<String>,
    state: State<'_, AppState>,
) -> Result<Task, String> {
    let db = state.db.lock().await;

    let request = CreateTaskRequest { context };

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
    context: String,
    state: State<'_, AppState>,
) -> Result<Task, String> {
    let db = state.db.lock().await;

    let request = UpdateTaskRequest { id, context };

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

#[tauri::command]
pub async fn get_current_task_info(
    state: State<'_, AppState>,
) -> Result<Option<CurrentTaskInfo>, String> {
    let db = state.db.lock().await;

    match db.get_current_task().await {
        Ok(Some(task)) => Ok(Some(CurrentTaskInfo { task })),
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to get current task info: {}", e)),
    }
}

#[tauri::command]
pub async fn toggle_floating_window(window: WebviewWindow) -> Result<(), String> {
    let app_handle = window.app_handle();

    match app_handle.get_webview_window("floating") {
        Some(floating_window) => {
            if floating_window.is_visible().map_err(|e| e.to_string())? {
                floating_window.hide().map_err(|e| e.to_string())?;
            } else {
                floating_window.show().map_err(|e| e.to_string())?;
            }
            Ok(())
        }
        None => Err("Floating window not found".to_string()),
    }
}

#[tauri::command]
pub async fn focus_main_window(window: WebviewWindow) -> Result<(), String> {
    let app_handle = window.app_handle();

    match app_handle.get_webview_window("main") {
        Some(main_window) => {
            // Show window if it's minimized or hidden
            if !main_window.is_visible().unwrap_or(false) {
                main_window.show().map_err(|e| e.to_string())?;
            }
            main_window.set_focus().map_err(|e| e.to_string())?;
            Ok(())
        }
        None => {
            // Main window is closed, create a new one
            tauri::WebviewWindowBuilder::new(
                app_handle,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("stackwatch")
            .inner_size(800.0, 600.0)
            .build()
            .map_err(|e| e.to_string())?;

            Ok(())
        }
    }
}
