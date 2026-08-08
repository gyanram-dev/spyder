use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

#[tauri::command]
fn show_reminder(app: tauri::AppHandle, message: String) {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis();
    println!("[show_reminder() called] time={}ms message='{}'", now, message);
    if let Some(window) = app.get_webview_window("reminder") {
        // Position window at top-right corner of primary monitor
        if let Ok(Some(monitor)) = window.current_monitor() {
            let monitor_size = monitor.size();
            let monitor_position = monitor.position();
            let scale_factor = monitor.scale_factor();

            let window_width_phys = (520.0 * scale_factor) as i32;
            let padding_phys = (20.0 * scale_factor) as i32;

            let x = monitor_position.x + monitor_size.width as i32 - window_width_phys - padding_phys;
            let y = monitor_position.y + padding_phys;

            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
        }

        let _ = window.set_always_on_top(true);
        let _ = window.set_focusable(false);
        let _ = window.set_skip_taskbar(true);
        let _ = window.set_shadow(false);

        let now_emit = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis();
        println!("[trigger-reminder emitted] time={}ms message='{}'", now_emit, message);
        let _ = window.emit("trigger-reminder", serde_json::json!({ "message": message }));
    }
}

#[tauri::command]
fn reveal_reminder(app: tauri::AppHandle) {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis();
    println!("[window.show() / reveal_reminder] time={}ms", now);
    if let Some(window) = app.get_webview_window("reminder") {
        let _ = window.show();
    }
}

#[tauri::command]
fn hide_reminder(app: tauri::AppHandle) {
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis();
    println!("[window.hide() / hide_reminder] time={}ms", now);
    if let Some(window) = app.get_webview_window("reminder") {
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            Some(vec!["--autostart"]),
        ))
        .invoke_handler(tauri::generate_handler![show_reminder, reveal_reminder, hide_reminder])
        .setup(|app| {
            // Check if application was launched on Windows startup
            let is_autostart = std::env::args().any(|arg| arg == "--autostart");
            if is_autostart {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            // Build system tray menu items
            let open_item = MenuItemBuilder::with_id("open", "Open Spydy Reminder").build(app)?;
            let pause_item = MenuItemBuilder::with_id("pause", "Pause Reminders").build(app)?;
            let resume_item = MenuItemBuilder::with_id("resume", "Resume Reminders").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .item(&open_item)
                .item(&pause_item)
                .item(&resume_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "pause" => {
                            let _ = app.emit("toggle-pause-reminders", true);
                        }
                        "resume" => {
                            let _ = app.emit("toggle-pause-reminders", false);
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } => {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        } => {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" || window.label() == "reminder" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


