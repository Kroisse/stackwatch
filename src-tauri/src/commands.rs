use crate::error::{Error, Result};
use tauri::{Manager, WebviewWindow};

#[tauri::command]
pub async fn toggle_floating_window(window: WebviewWindow) -> Result<()> {
    let app_handle = window.app_handle();

    match app_handle.get_webview_window("floating") {
        Some(floating_window) => {
            if floating_window.is_visible()? {
                floating_window.hide()?;
            } else {
                floating_window.show()?;
            }
            Ok(())
        }
        None => {
            // The floating window is defined in tauri.conf.json with "closable": false
            // If it doesn't exist here, something went wrong
            // We could try to recreate it, but let's match the config settings
            tauri::WebviewWindowBuilder::new(
                app_handle,
                "floating",
                tauri::WebviewUrl::App("floating.html".into()),
            )
            .title("")  // Empty title as per config
            .inner_size(300.0, 80.0)  // Match config dimensions
            .resizable(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .minimizable(false)
            .closable(false)
            .decorations(false)  // This achieves titleBarStyle: "Overlay" effect
            .visible(true)  // Show it immediately since we're toggling
            .build()?;

            Ok(())
        }
    }
}

#[tauri::command]
pub async fn focus_main_window(window: WebviewWindow) -> Result<()> {
    let app_handle = window.app_handle();

    match app_handle.get_webview_window("main") {
        Some(main_window) => {
            // Show window if it's minimized or hidden
            if !main_window.is_visible()? {
                main_window.show()?;
            }
            main_window.set_focus()?;
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
            .build()?;

            Ok(())
        }
    }
}
