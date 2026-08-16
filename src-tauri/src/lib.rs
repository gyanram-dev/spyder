use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

#[tauri::command]
fn show_reminder(app: tauri::AppHandle, message: String, character: Option<String>) {
    let char_str = character.unwrap_or_else(|| "spiderman".to_string());
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    println!(
        "[RUST DIAGNOSTIC] show_reminder() called | time={}ms | message='{}' | char='{}'",
        now, message, char_str
    );
    if let Some(window) = app.get_webview_window("reminder") {
        println!("[RUST DIAGNOSTIC] Found 'reminder' webview window.");
        
        match window.current_monitor() {
            Ok(Some(monitor)) => {
                let monitor_size = monitor.size();
                let monitor_position = monitor.position();
                let scale_factor = monitor.scale_factor();

                let window_width_phys = (540.0 * scale_factor) as i32;
                let padding_phys = (20.0 * scale_factor) as i32;

                let x = monitor_position.x + monitor_size.width as i32 - window_width_phys - padding_phys;
                let y = monitor_position.y + padding_phys;

                println!(
                    "[WINDOW] monitor found | size={}x{} | pos=({},{}) | scale={} | calc_x={} calc_y={}",
                    monitor_size.width, monitor_size.height, monitor_position.x, monitor_position.y, scale_factor, x, y
                );

                let pos_res = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
                println!("[WINDOW] position set to ({}, {}) | res: {:?}", x, y, pos_res);
            }
            Ok(None) => {
                println!("[WINDOW WARNING] current_monitor returned None!");
            }
            Err(e) => {
                println!("[WINDOW ERROR] Failed to query current_monitor: {:?}", e);
            }
        }

        println!("[WINDOW] size 540x440");
        let aot_res = window.set_always_on_top(true);
        println!("[WINDOW] always_on_top: {:?}", aot_res);

        let skip_res = window.set_skip_taskbar(true);
        println!("[WINDOW] skip_taskbar: {:?}", skip_res);

        let show_res = window.show();
        println!("[WINDOW] show: {:?}", show_res);

        let unm_res = window.unminimize();
        println!("[WINDOW] unminimize: {:?}", unm_res);

        let focus_res = window.set_focus();
        println!("[WINDOW] focus: {:?}", focus_res);

        let emit_res = window.emit(
            "trigger-reminder",
            serde_json::json!({ "message": message, "character": char_str }),
        );
        println!("[RUST DIAGNOSTIC] window.emit('trigger-reminder') result: {:?}", emit_res);

        #[cfg(target_os = "linux")]
        {
            let app_handle = app.clone();
            std::thread::spawn(move || {
                let resource_path = app_handle
                    .path()
                    .resource_dir()
                    .map(|p| p.join("resources").join("fahh.wav"))
                    .unwrap_or_else(|_| std::path::PathBuf::from("/usr/share/sounds/freedesktop/stereo/bell.oga"));

                let wav_str = resource_path.to_string_lossy().to_string();
                println!("[AUDIO RUST NATIVE] Target WAV sound path: '{}'", wav_str);

                let sound_commands = [
                    ("paplay", vec![wav_str.as_str()]),
                    ("pw-play", vec![wav_str.as_str()]),
                    ("aplay", vec![wav_str.as_str()]),
                    ("canberra-gtk-play", vec!["-f", wav_str.as_str()]),
                    ("paplay", vec!["/usr/share/sounds/freedesktop/stereo/bell.oga"]),
                ];

                let mut played = false;
                for (cmd, args) in sound_commands.iter() {
                    if let Ok(mut child) = std::process::Command::new(cmd).args(args).spawn() {
                        println!("[AUDIO RUST NATIVE] Triggered native Linux player '{}'", cmd);
                        let _ = child.wait();
                        played = true;
                        break;
                    }
                }
                if !played {
                    println!("[AUDIO RUST NATIVE WARNING] No native Linux audio utility found!");
                }
            });
        }
    } else {
        println!("[RUST DIAGNOSTIC ERROR] 'reminder' webview window NOT FOUND!");
    }
}

#[tauri::command]
fn reveal_reminder(app: tauri::AppHandle) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    println!("[window.show() / reveal_reminder] time={}ms", now);
    if let Some(window) = app.get_webview_window("reminder") {
        let _ = window.show();
    }
}

#[tauri::command]
fn hide_reminder(app: tauri::AppHandle) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    println!("[window.hide() / hide_reminder] time={}ms", now);
    if let Some(window) = app.get_webview_window("reminder") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn play_native_sound(app: tauri::AppHandle) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    println!("[AUDIO] play_native_sound invoked | time={}ms", now);

    let app_handle = app.clone();
    std::thread::spawn(move || {
        // Resolve resource directory candidates on Linux
        let mut candidate_paths: Vec<std::path::PathBuf> = Vec::new();

        if let Ok(res_dir) = app_handle.path().resource_dir() {
            candidate_paths.push(res_dir.join("resources").join("fahh.wav"));
            candidate_paths.push(res_dir.join("fahh.wav"));
        }
        candidate_paths.push(std::path::PathBuf::from("/usr/lib/timebound/resources/fahh.wav"));
        candidate_paths.push(std::path::PathBuf::from("/usr/lib/timebound/fahh.wav"));
        candidate_paths.push(std::path::PathBuf::from("/usr/share/sounds/freedesktop/stereo/bell.oga"));

        let mut resolved_wav_path = std::path::PathBuf::from("/usr/share/sounds/freedesktop/stereo/bell.oga");
        for candidate in &candidate_paths {
            if candidate.exists() {
                resolved_wav_path = candidate.clone();
                println!("[AUDIO] FOUND sound file at resolved path: {:?}", resolved_wav_path);
                break;
            }
        }

        let wav_str = resolved_wav_path.to_string_lossy().to_string();
        println!("[AUDIO] final resolved audio path = {}", wav_str);

        #[cfg(target_os = "linux")]
        {
            let players = [
                ("pw-play", vec![wav_str.as_str()]),
                ("paplay", vec![wav_str.as_str()]),
                ("aplay", vec![wav_str.as_str()]),
                ("canberra-gtk-play", vec!["-f", wav_str.as_str()]),
            ];

            let mut played = false;
            for (player, args) in players.iter() {
                println!("[AUDIO] checking player = {}", player);
                println!("[AUDIO] command = {} {:?}", player, args);
                match std::process::Command::new(player).args(args).output() {
                    Ok(output) => {
                        println!("[AUDIO] exit status = {:?}", output.status);
                        if !output.status.success() {
                            let stderr = String::from_utf8_lossy(&output.stderr);
                            println!("[AUDIO ERROR] Player '{}' exited with status {:?}, stderr: {}", player, output.status, stderr);
                        } else {
                            println!("[AUDIO] Player '{}' completed successfully!", player);
                            played = true;
                            break;
                        }
                    }
                    Err(err) => {
                        println!("[AUDIO ERROR] Failed to execute player '{}': {:?}", player, err);
                    }
                }
            }

            if !played {
                println!("[AUDIO ERROR] All Linux native audio players (pw-play, paplay, aplay) failed!");
            }
        }

        #[cfg(not(target_os = "linux"))]
        {
            println!("[AUDIO] Non-Linux platform, native audio handled by frontend HTML5 Audio.");
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            println!("[single-instance] Second launch attempt detected with args: {:?}. Focusing main window.", args);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            Some(vec!["--autostart"]),
        ))
        .invoke_handler(tauri::generate_handler![
            show_reminder,
            reveal_reminder,
            hide_reminder,
            play_native_sound
        ])
        .setup(|app| {
            // Check if application was launched on Windows startup
            let is_autostart = std::env::args().any(|arg| arg == "--autostart");
            if is_autostart {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            // Build system tray menu items
            let open_item = MenuItemBuilder::with_id("open", "Open TimeBound").build(app)?;
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
                .on_menu_event(|app, event| match event.id.as_ref() {
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
                })
                .on_tray_icon_event(|tray, event| match event {
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
