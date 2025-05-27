mod commands;
mod database;
mod models;

use database::Database;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let app_handle_for_db = app_handle.clone();

            tauri::async_runtime::spawn(async move {
                let db = Database::new("sqlite://stackwatch.db", app_handle_for_db)
                    .await
                    .expect("Failed to initialize database");

                let state = AppState {
                    db: Arc::new(Mutex::new(db)),
                };

                app_handle.manage(state);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::push_task,
            commands::pop_task,
            commands::get_task_stack,
            commands::update_task,
            commands::get_current_task,
            commands::get_current_task_info,
            commands::toggle_floating_window,
            commands::focus_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
