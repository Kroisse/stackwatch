mod commands;
mod error;

pub use error::{Error, Result};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::toggle_floating_window,
            commands::focus_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
