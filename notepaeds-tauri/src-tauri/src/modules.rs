use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    sync::Mutex,
    time::Duration,
};

const MAX_BYTES: u64 = 2_000_000;
static MODULE_WRITE: Mutex<()> = Mutex::new(());

fn filename(kind: &str) -> Result<&'static str, String> {
    match kind {
        "snippets" => Ok("snippets.json"),
        "medications" => Ok("medications.json"),
        "calculators" => Ok("calculators.json"),
        _ => Err("Unknown module type.".into()),
    }
}
fn directory() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|_| "Cannot locate the portable app.")?;
    Ok(exe
        .parent()
        .ok_or("Cannot locate the app folder.")?
        .join("modules"))
}
fn read_text(path: &Path) -> Result<Option<String>, String> {
    let file = match fs::File::open(path) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err("Cannot read the module file.".into()),
    };
    let mut text = String::new();
    file.take(MAX_BYTES + 1)
        .read_to_string(&mut text)
        .map_err(|_| "Module must be UTF-8 text.")?;
    if text.len() as u64 > MAX_BYTES {
        return Err("Module file is too large.".into());
    }
    Ok(Some(text))
}
fn validate(kind: &str, text: &str) -> Result<(), String> {
    filename(kind)?;
    if text.len() as u64 > MAX_BYTES {
        return Err("Module file is too large.".into());
    }
    let value: serde_json::Value =
        serde_json::from_str(text).map_err(|_| "Invalid module JSON.")?;
    if value["schemaVersion"] != 1 || value["kind"] != kind || !value["entries"].is_array() {
        return Err(
            "Module must have schemaVersion 1, the matching kind, and an entries array.".into(),
        );
    }
    Ok(())
}
#[derive(Serialize)]
pub struct ModuleFile {
    kind: String,
    text: Option<String>,
}
#[derive(Serialize)]
pub struct ModuleFiles {
    directory: String,
    files: Vec<ModuleFile>,
}
#[tauri::command]
pub fn load_modules() -> Result<ModuleFiles, String> {
    let dir = directory()?;
    let mut files = Vec::new();
    for kind in ["snippets", "medications", "calculators"] {
        let text = read_text(&dir.join(filename(kind)?)).map_err(|e| format!("{kind}: {e}"))?;
        files.push(ModuleFile {
            kind: kind.into(),
            text,
        });
    }
    Ok(ModuleFiles {
        directory: dir.to_string_lossy().into(),
        files,
    })
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct FeedManifest {
    #[serde(rename = "schemaVersion")]
    schema_version: u8,
    #[serde(default, rename = "publishedAt")]
    published_at: String,
    modules: Vec<FeedModule>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct FeedModule {
    kind: String,
    version: String,
    url: String,
}

#[derive(Serialize)]
pub struct RemoteModule {
    kind: String,
    version: String,
    text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteModuleFeed {
    published_at: String,
    modules: Vec<RemoteModule>,
}

fn https_url(value: &str) -> Result<(), String> {
    let url =
        reqwest::Url::parse(value).map_err(|_| "Enter a valid HTTPS module-update address.")?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(
            "The module-update address must be a public HTTPS URL without embedded credentials."
                .into(),
        );
    }
    Ok(())
}

fn version(value: &str) -> Result<(), String> {
    let parts: Vec<_> = value.split('.').collect();
    if parts.len() != 3
        || parts.iter().any(|part| {
            part.is_empty() || part.len() > 6 || !part.chars().all(|c| c.is_ascii_digit())
        })
    {
        return Err("Module versions must use numbers in major.minor.patch format.".into());
    }
    Ok(())
}

fn update_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Could not initialise the module update connection.".into())
}

async fn download_text(client: &reqwest::Client, url: &str) -> Result<String, String> {
    https_url(url)?;
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|_| "Could not reach the module-update server.")?;
    if !response.status().is_success() {
        return Err(format!(
            "Module-update server returned HTTP {}.",
            response.status().as_u16()
        ));
    }
    if response.content_length().unwrap_or(0) > MAX_BYTES {
        return Err("A module-update file is too large.".into());
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|_| "Could not read the module-update response.")?;
    if bytes.len() as u64 > MAX_BYTES {
        return Err("A module-update file is too large.".into());
    }
    String::from_utf8(bytes.to_vec()).map_err(|_| "Module updates must be UTF-8 text.".into())
}

#[tauri::command]
pub async fn fetch_module_updates(manifest_url: String) -> Result<RemoteModuleFeed, String> {
    https_url(&manifest_url)?;
    let manifest_base = reqwest::Url::parse(&manifest_url)
        .map_err(|_| "Enter a valid HTTPS module-update address.")?;
    let client = update_client()?;
    let manifest_text = download_text(&client, &manifest_url).await?;
    let manifest: FeedManifest =
        serde_json::from_str(&manifest_text).map_err(|_| "Invalid module-update manifest JSON.")?;
    if manifest.schema_version != 1 || manifest.modules.is_empty() || manifest.modules.len() > 3 {
        return Err(
            "The module-update manifest must use schemaVersion 1 and contain 1–3 modules.".into(),
        );
    }
    let mut seen = std::collections::HashSet::new();
    let mut modules = Vec::new();
    for item in manifest.modules {
        filename(&item.kind)?;
        if !seen.insert(item.kind.clone()) {
            return Err("The module-update manifest contains a duplicate module type.".into());
        }
        version(&item.version)?;
        let module_url = manifest_base
            .join(&item.url)
            .map_err(|_| "The manifest contains an invalid module URL.")?;
        let text = download_text(&client, module_url.as_str()).await?;
        validate(&item.kind, &text).map_err(|error| format!("{}: {error}", item.kind))?;
        let value: serde_json::Value =
            serde_json::from_str(&text).map_err(|_| "Invalid module JSON.")?;
        if value.get("moduleVersion").and_then(|v| v.as_str()) != Some(item.version.as_str()) {
            return Err(format!(
                "{} version does not match the update manifest.",
                item.kind
            ));
        }
        modules.push(RemoteModule {
            kind: item.kind,
            version: item.version,
            text,
        });
    }
    Ok(RemoteModuleFeed {
        published_at: manifest.published_at,
        modules,
    })
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SaveModule {
    kind: String,
    text: String,
    expected: Option<String>,
}
#[tauri::command]
pub fn save_module(input: SaveModule) -> Result<(), String> {
    let _guard = MODULE_WRITE.lock().map_err(|_| "Module save is busy.")?;
    save_at(&directory()?, input)
}

#[tauri::command]
pub fn save_library(inputs: Vec<SaveModule>) -> Result<(), String> {
    let _guard = MODULE_WRITE.lock().map_err(|_| "Library save is busy.")?;
    save_library_at(&directory()?,inputs)
}
fn save_library_at(dir:&Path,inputs:Vec<SaveModule>)->Result<(),String>{
    if inputs.is_empty()||inputs.len()>3{return Err("Choose one to three library collections.".into())}
    let mut seen=std::collections::HashSet::new();let mut originals=Vec::new();
    for input in &inputs{
        validate(&input.kind,&input.text)?;
        if !seen.insert(input.kind.clone()){return Err("Duplicate library collection.".into())}
        let path=dir.join(filename(&input.kind)?);let old=read_text(&path)?;
        if old!=input.expected{return Err("Library changed outside NotePaeds. Reload and review again.".into())}
        originals.push((path,old));
    }
    for input in inputs{
        if let Err(error)=save_at(dir,input){
            let mut recovered=true;
            for (path,old) in &originals{let result=if let Some(text)=old{fs::write(path,text)}else if path.exists(){fs::remove_file(path)}else{Ok(())};if result.is_err(){recovered=false}}
            return Err(if recovered{error}else{format!("{error} Recovery incomplete; use the retained library backup.")})
        }
    }
    Ok(())
}

#[tauri::command]
pub fn restore_module_backup(kind: String) -> Result<(), String> {
    let _guard = MODULE_WRITE.lock().map_err(|_| "Module restore is busy.")?;
    let dir = directory()?;
    let path = dir.join(filename(&kind)?);
    let backup = path.with_extension("json.bak");
    let current = read_text(&path)?.ok_or("The current module file is missing.")?;
    let previous = read_text(&backup)?.ok_or("No backup is available for this module.")?;
    validate(&kind, &previous)?;
    let temp = path.with_extension("json.restore.tmp");
    fs::write(&temp, previous.as_bytes())
        .map_err(|_| "Cannot prepare the module backup restore.")?;
    fs::rename(&temp, &path).map_err(|_| "Cannot restore the module backup.")?;
    fs::write(&backup, current.as_bytes())
        .map_err(|_| "The module was restored, but its newer copy could not be retained.")?;
    Ok(())
}
fn save_at(dir: &Path, input: SaveModule) -> Result<(), String> {
    validate(&input.kind, &input.text)?;
    fs::create_dir_all(dir)
        .map_err(|_| "Cannot write here. Move the portable folder to a writable location.")?;
    let path = dir.join(filename(&input.kind)?);
    let old = read_text(&path)?;
    if old != input.expected {
        return Err("The file changed outside NotePaeds. Reload modules before saving.".into());
    }
    if old.is_some() {
        fs::copy(&path, path.with_extension("json.bak"))
            .map_err(|_| "Cannot create the module backup.")?;
    }
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, input.text.as_bytes()).map_err(|_| "Cannot write the module file.")?;
    fs::rename(&temp, &path)
        .map_err(|_| "Cannot replace the module file; the original and backup are retained.")?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn library_rejects_stale_second_collection_before_any_write(){
        let dir=std::env::temp_dir().join(format!("notepaeds-batch-test-{}-{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        fs::create_dir_all(&dir).unwrap();
        let a=r#"{"schemaVersion":1,"kind":"snippets","entries":[]}"#.to_string();let b=r#"{"schemaVersion":1,"kind":"medications","entries":[]}"#.to_string();
        fs::write(dir.join("snippets.json"),&a).unwrap();fs::write(dir.join("medications.json"),&b).unwrap();
        let updated=r#"{"schemaVersion":1,"kind":"snippets","entries":[],"revision":2}"#.to_string();
        assert!(save_library_at(&dir,vec![SaveModule{kind:"snippets".into(),text:updated,expected:Some(a.clone())},SaveModule{kind:"medications".into(),text:b.clone(),expected:None}]).is_err());
        assert_eq!(read_text(&dir.join("snippets.json")).unwrap(),Some(a));assert_eq!(read_text(&dir.join("medications.json")).unwrap(),Some(b));
        fs::remove_file(dir.join("snippets.json")).unwrap();fs::remove_file(dir.join("medications.json")).unwrap();fs::remove_dir(dir).unwrap();
    }
    #[test]
    fn module_types_and_schema_are_restricted() {
        assert!(filename("../secrets").is_err());
        assert!(validate(
            "snippets",
            r#"{"schemaVersion":1,"kind":"snippets","entries":[]}"#
        )
        .is_ok());
        assert!(validate(
            "snippets",
            r#"{"schemaVersion":1,"kind":"medications","entries":[]}"#
        )
        .is_err());
        assert!(validate("calculators", "not json").is_err());
    }
    #[test]
    fn update_addresses_and_versions_are_restricted() {
        assert!(https_url("https://example.com/notepaeds/manifest.json").is_ok());
        assert!(https_url("http://example.com/manifest.json").is_err());
        assert!(https_url("file:///modules/manifest.json").is_err());
        assert!(version("1.2.3").is_ok());
        assert!(version("1.2").is_err());
        assert!(version("latest").is_err());
    }
    #[test]
    fn module_save_preserves_backup_and_rejects_stale_edits() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "notepaeds-module-test-{}-{unique}",
            std::process::id()
        ));
        let original = r#"{"schemaVersion":1,"kind":"snippets","entries":[]}"#.to_owned();
        let updated =
            r#"{"schemaVersion":1,"kind":"snippets","entries":[],"revision":2}"#.to_owned();
        assert_eq!(read_text(&dir.join("snippets.json")).unwrap(), None);
        save_at(
            &dir,
            SaveModule {
                kind: "snippets".into(),
                text: original.clone(),
                expected: None,
            },
        )
        .unwrap();
        assert!(save_at(
            &dir,
            SaveModule {
                kind: "snippets".into(),
                text: updated.clone(),
                expected: None
            }
        )
        .is_err());
        assert_eq!(
            read_text(&dir.join("snippets.json")).unwrap(),
            Some(original.clone())
        );
        save_at(
            &dir,
            SaveModule {
                kind: "snippets".into(),
                text: updated.clone(),
                expected: Some(original.clone()),
            },
        )
        .unwrap();
        assert_eq!(
            read_text(&dir.join("snippets.json")).unwrap(),
            Some(updated)
        );
        assert_eq!(
            read_text(&dir.join("snippets.json.bak")).unwrap(),
            Some(original)
        );
        // Remove only the two files created by this test, then the empty test directory.
        fs::remove_file(dir.join("snippets.json")).unwrap();
        fs::remove_file(dir.join("snippets.json.bak")).unwrap();
        fs::remove_dir(dir).unwrap();
    }
}
