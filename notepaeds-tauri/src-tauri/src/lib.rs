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

fn safe_shift_filename(filename: &str) -> Result<&str, String> {
    let name = filename.trim();
    if name.is_empty()
        || name == "."
        || name == ".."
        || name.contains("..")
        || name.ends_with('.')
        || name
            .chars()
            .any(|c| c.is_control() || "\\/:*?\"<>|".contains(c))
    {
        return Err("The shift file name is not allowed.".into());
    }
    Ok(name)
}

fn suffixed_shift_filename(filename: &str, n: u32) -> String {
    let path = std::path::Path::new(filename);
    match (
        path.file_stem().and_then(|stem| stem.to_str()),
        path.extension().and_then(|ext| ext.to_str()),
    ) {
        (Some(stem), Some(ext)) => format!("{stem}-{n}.{ext}"),
        (Some(stem), None) => format!("{stem}-{n}"),
        _ => format!("NotePaeds-shift-{n}.txt"),
    }
}

fn path_stays_in_folder(dir: &std::path::Path, path: &std::path::Path) -> bool {
    let Some(parent) = path.parent() else {
        return false;
    };
    matches!(
        (std::fs::canonicalize(dir), std::fs::canonicalize(parent)),
        (Ok(folder), Ok(parent)) if folder == parent
    )
}

/// Writes `contents` into an existing folder. Unsafe names are rejected.
/// An existing file gets a numeric suffix instead of being overwritten.
#[tauri::command]
fn write_shift_file(folder: String, filename: String, contents: String) -> Result<String, String> {
    if contents.len() > 10_000_000 {
        return Err("The shift export is too large.".into());
    }
    let folder = folder.trim();
    if folder.is_empty() || folder.contains('\0') {
        return Err("The shift save folder does not exist.".into());
    }
    let name = safe_shift_filename(&filename)?.to_string();
    let dir = std::path::Path::new(folder);
    if !dir.exists() {
        return Err("The shift save folder does not exist.".into());
    }
    if !dir.is_dir() {
        return Err("The shift save folder is not a folder.".into());
    }
    for candidate in
        std::iter::once(name.clone()).chain((2..10_001).map(|n| suffixed_shift_filename(&name, n)))
    {
        let safe = safe_shift_filename(&candidate)?;
        let path = dir.join(safe);
        if !path_stays_in_folder(dir, &path) {
            return Err("The shift file name is not allowed.".into());
        }
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
        {
            Ok(mut file) => {
                if std::io::Write::write_all(&mut file, contents.as_bytes()).is_err() {
                    drop(file);
                    let _ = std::fs::remove_file(&path);
                    return Err("Could not write the shift file.".into());
                }
                return Ok(path.to_string_lossy().into_owned());
            }
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::AlreadyExists | std::io::ErrorKind::IsADirectory
                ) =>
            {
                continue;
            }
            Err(_) => return Err("Could not write the shift file.".into()),
        }
    }
    Err("Could not find a free name in the shift save folder.".into())
}

#[tauri::command]
fn save_shift_as(
    contents: String,
    suggested_name: String,
    initial_dir: Option<String>,
) -> Result<Option<String>, String> {
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
    let folder = initial_dir
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let Some(path) = choose_shift_path(&safe_name, folder)? else {
        return Ok(None);
    };
    std::fs::write(&path, contents.as_bytes())
        .map_err(|_| "Could not write the shift file at the selected location.".to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[cfg(windows)]
fn choose_shift_path(
    suggested_name: &str,
    initial_dir: Option<&str>,
) -> Result<Option<std::path::PathBuf>, String> {
    use windows::{
        core::{PCWSTR, PWSTR},
        Win32::UI::Controls::Dialogs::{
            GetSaveFileNameW, OFN_NOCHANGEDIR, OFN_OVERWRITEPROMPT, OFN_PATHMUSTEXIST,
            OPENFILENAMEW,
        },
    };
    let mut file = vec![0u16; 32_768];
    let name: Vec<u16> = suggested_name.encode_utf16().collect();
    if name.len() >= file.len() {
        return Err("The shift file name is too long.".into());
    }
    file[..name.len()].copy_from_slice(&name);
    let filter: Vec<u16> =
        "Shift backups (*.json)\0*.json\0Text files (*.txt)\0*.txt\0All files (*.*)\0*.*\0\0"
            .encode_utf16()
            .collect();
    let title: Vec<u16> = "Save NotePaeds shift as\0".encode_utf16().collect();
    let extension: Vec<u16> = "json\0".encode_utf16().collect();
    // lpstrInitialDir is a null-terminated wide string and must outlive the dialog call.
    let initial = initial_dir.and_then(|dir| {
        let dir = dir.trim();
        if dir.is_empty() || dir.contains('\0') {
            None
        } else {
            let mut wide: Vec<u16> = dir.encode_utf16().collect();
            wide.push(0);
            Some(wide)
        }
    });
    let mut dialog = OPENFILENAMEW {
        lStructSize: std::mem::size_of::<OPENFILENAMEW>() as u32,
        lpstrFilter: PCWSTR(filter.as_ptr()),
        lpstrFile: PWSTR(file.as_mut_ptr()),
        nMaxFile: file.len() as u32,
        lpstrTitle: PCWSTR(title.as_ptr()),
        lpstrDefExt: PCWSTR(extension.as_ptr()),
        lpstrInitialDir: initial
            .as_ref()
            .map(|wide| PCWSTR(wide.as_ptr()))
            .unwrap_or(PCWSTR(std::ptr::null())),
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
fn choose_shift_path(_: &str, _: Option<&str>) -> Result<Option<std::path::PathBuf>, String> {
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
            write_shift_file,
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

#[cfg(test)]
mod tests {
    use super::{safe_shift_filename, write_shift_file};

    #[test]
    fn rejects_unsafe_shift_filenames() {
        for name in [
            "",
            ".",
            "..",
            "../secret.txt",
            "..\\secret.txt",
            "folder/note.txt",
            "folder\\note.txt",
            "bad:name.txt",
            "bad?.txt",
            "bad*.txt",
            "quote\".txt",
            "ends.",
            "a\nb.txt",
        ] {
            assert!(safe_shift_filename(name).is_err(), "{name:?}");
        }
        assert_eq!(
            safe_shift_filename("  NotePaeds-shift-2026-10-27.txt  ").unwrap(),
            "NotePaeds-shift-2026-10-27.txt"
        );
    }

    #[test]
    fn writes_into_an_existing_folder_without_overwrite() {
        let dir = std::env::temp_dir().join(format!(
            "notepaeds-shift-{}-{}",
            std::process::id(),
            "write"
        ));
        let _ = std::fs::remove_dir_all(&dir);
        let missing = write_shift_file(
            dir.to_string_lossy().into_owned(),
            "NotePaeds-shift-2026-10-27.txt".into(),
            "one".into(),
        );
        assert!(missing.is_err(), "{missing:?}");
        std::fs::create_dir_all(&dir).unwrap();
        let folder = format!("{}/", dir.display());
        let first = write_shift_file(
            folder.clone(),
            "NotePaeds-shift-2026-10-27.txt".into(),
            "one".into(),
        )
        .unwrap();
        let second = write_shift_file(
            folder,
            "NotePaeds-shift-2026-10-27.txt".into(),
            "two".into(),
        )
        .unwrap();
        assert_ne!(first, second);
        assert!(first.ends_with("NotePaeds-shift-2026-10-27.txt"));
        assert!(second.ends_with("NotePaeds-shift-2026-10-27-2.txt"));
        assert_eq!(std::fs::read_to_string(&first).unwrap(), "one");
        assert_eq!(std::fs::read_to_string(&second).unwrap(), "two");
        assert!(write_shift_file(
            dir.to_string_lossy().into_owned(),
            "../escape.txt".into(),
            "no".into()
        )
        .is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
