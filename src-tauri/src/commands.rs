use tauri::{Manager, WebviewWindow};

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
