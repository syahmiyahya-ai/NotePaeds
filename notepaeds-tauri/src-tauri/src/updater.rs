use serde::{Deserialize,Serialize};
use std::{path::PathBuf,sync::Mutex,time::Duration};
use ring::{digest,signature};
const FEED:&str="https://syahmiyahya-ai.github.io/notepaeds-modules/app-release.json";
const MAX:u64=80_000_000;
static STAGED:Mutex<Option<(PathBuf,String)>>=Mutex::new(None);
static BUSY:std::sync::atomic::AtomicBool=std::sync::atomic::AtomicBool::new(false);
struct Guard;
impl Drop for Guard{fn drop(&mut self){BUSY.store(false,std::sync::atomic::Ordering::SeqCst)}}
#[derive(Deserialize)]struct Envelope{payload:String,signature:String}
#[derive(Clone,Deserialize,Serialize)]pub struct Release{version:String,notes:String,url:String,sha256:String,#[serde(default)]available:bool}
fn hex(bytes:&[u8])->String{bytes.iter().map(|b|format!("{b:02x}")).collect()}
fn unhex(s:&str)->Result<Vec<u8>,String>{if s.len()%2!=0{return Err("Invalid release signature.".into())}(0..s.len()).step_by(2).map(|i|u8::from_str_radix(&s[i..i+2],16).map_err(|_|"Invalid release signature.".into())).collect()}
fn version(s:&str)->Result<Vec<u64>,String>{let parts=s.split('.').map(|p|p.parse::<u64>().map_err(|_|"Invalid release version.".to_string())).collect::<Result<Vec<_>,_>>()?;if parts.len()!=3{return Err("Invalid release version.".into())}Ok(parts)}
fn verify(text:&str)->Result<Release,String>{let envelope:Envelope=serde_json::from_str(text).map_err(|_|"Invalid update manifest.")?;if !envelope.signature.is_ascii(){return Err("Invalid release signature.".into())}signature::UnparsedPublicKey::new(&signature::ED25519,include_bytes!("../update-public-key.bin")).verify(envelope.payload.as_bytes(),&unhex(&envelope.signature)?).map_err(|_|"Release signature failed. Update rejected.")?;let mut release:Release=serde_json::from_str(&envelope.payload).map_err(|_|"Invalid signed release.")?;release.available=version(&release.version)?>version(env!("CARGO_PKG_VERSION"))?;if release.url!=format!("https://github.com/syahmiyahya-ai/notepaeds-modules/releases/download/v{}/NotePaeds.exe",release.version)||release.sha256.len()!=64||!release.sha256.bytes().all(|b|b.is_ascii_hexdigit()){return Err("Invalid release download address or checksum.".into())}Ok(release)}
fn client()->Result<reqwest::Client,String>{reqwest::Client::builder().timeout(Duration::from_secs(180)).https_only(true).build().map_err(|_|"Cannot initialise updater.".into())}
#[tauri::command]pub async fn check_app_update()->Result<Release,String>{let response=client()?.get(FEED).send().await.map_err(|_|"Cannot reach the update feed. Try again when online.")?;if !response.status().is_success(){return Err("The full app update feed is not available yet. Use the supplied portable download.".into())}let bytes=response.bytes().await.map_err(|_|"Cannot read the update feed.")?;if bytes.len()>100_000{return Err("Update feed too large.".into())}verify(std::str::from_utf8(&bytes).map_err(|_|"Invalid update text.")?)}
#[tauri::command]pub async fn download_app_update()->Result<String,String>{if BUSY.swap(true,std::sync::atomic::Ordering::SeqCst){return Err("An update download is already running.".into())}let _guard=Guard;let release=check_app_update().await?;if !release.available{return Err("The app is already current.".into())}let mut response=client()?.get(&release.url).send().await.map_err(|_|"Update download could not start.")?;if !response.status().is_success()||response.content_length().unwrap_or(0)>MAX{return Err("Invalid update download.".into())}let mut bytes=Vec::new();while let Some(chunk)=response.chunk().await.map_err(|_|"Download interrupted. Try again.")?{if bytes.len() as u64+chunk.len() as u64>MAX{return Err("Update exceeds size limit.".into())}bytes.extend_from_slice(&chunk)}if hex(digest::digest(&digest::SHA256,&bytes).as_ref())!=release.sha256||!bytes.starts_with(b"MZ"){return Err("Downloaded app verification failed. Update rejected.".into())}let dir=PathBuf::from(std::env::var_os("LOCALAPPDATA").ok_or("Cannot find local application storage.")?).join("NotePaeds").join("updates").join(&release.version);std::fs::create_dir_all(&dir).map_err(|_|"Cannot create update folder.")?;let file=dir.join("NotePaeds.exe");std::fs::write(&file,bytes).map_err(|_|"Cannot save the downloaded app.")?;*STAGED.lock().map_err(|_|"Updater busy.")?=Some((file.clone(),release.sha256));Ok(file.to_string_lossy().into_owned())}
#[cfg(windows)]fn launch_helper(file:&std::path::Path,hash:&str)->Result<(),String>{
 use std::os::windows::process::CommandExt;
 let current=std::env::current_exe().map_err(|_|"Cannot find running app.")?;let parent=current.parent().ok_or("Cannot find app folder.")?;
 let probe=parent.join(format!(".notepaeds-write-test-{}",std::process::id()));std::fs::write(&probe,b"").map_err(|_|format!("App folder is not writable. Your verified download is at {}. Close NotePaeds and replace its executable manually.",file.display()))?;let _=std::fs::remove_file(probe);
 let quote=|p:&std::path::Path|format!("'{}'",p.to_string_lossy().replace('\'',"''"));let backup=parent.join("NotePaeds.previous.exe");let log=file.with_file_name("update-result.txt");let script=file.with_file_name("apply-update.ps1");
 let body=format!(r#"$ErrorActionPreference='Stop'
$target={target}
$download={download}
$backup={backup}
$log={log}
try {{
  Wait-Process -Id {pid} -Timeout 120 -ErrorAction SilentlyContinue
  if (Get-Process -Id {pid} -ErrorAction SilentlyContinue) {{ throw 'App did not close. No update applied.' }}
  if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLower() -ne '{hash}') {{ throw 'Update checksum changed. No update applied.' }}
  Copy-Item -LiteralPath $target -Destination $backup -Force
  try {{ Copy-Item -LiteralPath $download -Destination $target -Force }} catch {{ Copy-Item -LiteralPath $backup -Destination $target -Force; throw }}
  'Update applied. Previous executable retained beside the app.' | Set-Content -LiteralPath $log
  Start-Process -FilePath $target -WorkingDirectory (Split-Path -Parent $target) -WindowStyle Hidden
}} catch {{
  $_.Exception.Message | Set-Content -LiteralPath $log
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show(('NotePaeds update failed. Your notes and modules are unchanged. '+$_.Exception.Message+' See '+$log))
}}
"#,target=quote(&current),download=quote(file),backup=quote(&backup),log=quote(&log),pid=std::process::id(),hash=hash);
 std::fs::write(&script,format!("\u{feff}{body}")).map_err(|_|"Cannot prepare update helper.")?;
 let ps=PathBuf::from(std::env::var_os("SystemRoot").ok_or("Cannot locate Windows.")?).join("System32/WindowsPowerShell/v1.0/powershell.exe");std::process::Command::new(ps).args(["-NoProfile","-NonInteractive","-WindowStyle","Hidden","-ExecutionPolicy","Bypass","-File"]).arg(script).creation_flags(0x08000000).spawn().map_err(|_|"Cannot start update helper. App has been left open.")?;Ok(())
}
#[tauri::command]pub fn apply_app_update(app:tauri::AppHandle)->Result<(),String>{let staged=STAGED.lock().map_err(|_|"Updater busy.")?.clone().ok_or("Download and verify an update first.")?;let bytes=std::fs::read(&staged.0).map_err(|_|"Verified download is missing.")?;if hex(digest::digest(&digest::SHA256,&bytes).as_ref())!=staged.1{return Err("Download changed. Update rejected.".into())}
 #[cfg(windows)]launch_helper(&staged.0,&staged.1)?;
 #[cfg(not(windows))]return Err("App replacement requires Windows.".into());
 #[allow(unreachable_code)]{std::thread::spawn(move||{std::thread::sleep(Duration::from_millis(500));app.exit(0)});Ok(())}
}
#[cfg(test)]mod tests{use super::*;#[test]fn signed_release(){let fixture=include_str!("../update-test-fixture.json");assert!(verify(fixture).unwrap().available);assert!(verify(&fixture.replace("Synthetic","Tampered")).is_err());}#[test]fn versions(){assert!(version("9.10.0").unwrap()>version("9.2.0").unwrap());assert!(version("9.2").is_err())}#[test]fn rejects_forgery(){assert!(verify(r#"{"payload":"{}","signature":"abcd"}"#).is_err());assert!(unhex("é").is_err());}}
