use std::sync::atomic::{AtomicBool, Ordering};
use tauri::WebviewWindow;
mod generation;
mod credentials;
mod updater;
mod modules;
mod library;

static ALWAYS_ON_TOP: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn window_action(window: WebviewWindow, action: &str) -> Result<(), String> {
    match action {
        "minimize" => window.minimize(),
        "toggle-maximize" => {
            if window.is_maximized().map_err(|error| error.to_string())? {
                window.unmaximize()
            } else {
                window.maximize()
            }
        }
        "close" => window.close(),
        "alarm-attention" => {
            window.request_user_attention(Some(tauri::UserAttentionType::Critical))
        }
        "alarm-clear" => window.request_user_attention(None),
        _ => return Err(format!("Unknown window action: {action}")),
    }
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_window_title(window: WebviewWindow, title: String) -> Result<(), String> {
    window.set_title(&title).map_err(|error| error.to_string())
}

#[tauri::command]
fn toggle_always_on_top(window: WebviewWindow) -> Result<bool, String> {
    let enabled = !ALWAYS_ON_TOP.load(Ordering::Relaxed);
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())?;
    ALWAYS_ON_TOP.store(enabled, Ordering::Relaxed);
    Ok(enabled)
}

#[tauri::command]
fn save_shift_as(contents: String, suggested_name: String) -> Result<Option<String>, String> {
    if contents.len() > 10_000_000 {
        return Err("The shift export is too large.".into());
    }
    let safe_name = if (suggested_name.ends_with(".txt") || suggested_name.ends_with(".json"))
        && !suggested_name.chars().any(|c| "\\/:*?\"<>|".contains(c))
    {
        suggested_name
    } else {
        "NotePaeds-shift.txt".into()
    };
    let Some(path) = choose_shift_path(&safe_name)? else {
        return Ok(None);
    };
    std::fs::write(&path, contents.as_bytes())
        .map_err(|_| "Could not write the shift file at the selected location.".to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[cfg(windows)]
fn choose_shift_path(suggested_name: &str) -> Result<Option<std::path::PathBuf>, String> {
    use windows::{
        core::{PCWSTR, PWSTR},
        Win32::UI::Controls::Dialogs::{
            GetSaveFileNameW, OPENFILENAMEW, OFN_NOCHANGEDIR, OFN_OVERWRITEPROMPT,
            OFN_PATHMUSTEXIST,
        },
    };
    let mut file = vec![0u16; 32_768];
    let name: Vec<u16> = suggested_name.encode_utf16().collect();
    file[..name.len()].copy_from_slice(&name);
    let filter: Vec<u16> = "Shift backups (*.json)\0*.json\0Text files (*.txt)\0*.txt\0All files (*.*)\0*.*\0\0"
        .encode_utf16()
        .collect();
    let title: Vec<u16> = "Save NotePaeds shift as\0".encode_utf16().collect();
    let extension: Vec<u16> = "json\0".encode_utf16().collect();
    let mut dialog = OPENFILENAMEW {
        lStructSize: std::mem::size_of::<OPENFILENAMEW>() as u32,
        lpstrFilter: PCWSTR(filter.as_ptr()),
        lpstrFile: PWSTR(file.as_mut_ptr()),
        nMaxFile: file.len() as u32,
        lpstrTitle: PCWSTR(title.as_ptr()),
        lpstrDefExt: PCWSTR(extension.as_ptr()),
        Flags: OFN_OVERWRITEPROMPT | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR,
        ..Default::default()
    };
    if unsafe { GetSaveFileNameW(&mut dialog) }.as_bool() {
        let end = file.iter().position(|c| *c == 0).unwrap_or(file.len());
        Ok(Some(std::path::PathBuf::from(String::from_utf16_lossy(
            &file[..end],
        ))))
    } else {
        Ok(None)
    }
}

#[cfg(not(windows))]
fn choose_shift_path(_: &str) -> Result<Option<std::path::PathBuf>, String> {
    Err("Save Shift As is available in the Windows portable app.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            window_action,
            set_window_title,
            toggle_always_on_top,
            save_shift_as,
            library::open_hta_dial,
            library::publish_library,
            generation::generate_document,
            generation::check_icd10,
            generation::generation_status,
            generation::api_key_summary,
            generation::remove_api_key,
            updater::check_app_update,
            updater::download_app_update,
            updater::apply_app_update,
            generation::set_session_api_key,
            generation::verify_api_key,
            generation::generate_leaflet_image,
            modules::load_modules,
            modules::save_module,
            modules::save_library,
            modules::fetch_module_updates,
            modules::restore_module_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running NotePaeds");
}
