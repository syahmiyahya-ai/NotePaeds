use serde::Deserialize;
use serde_json::{json,Value};
use std::time::Duration;

#[tauri::command]
pub fn open_hta_dial() -> Result<(),String> {
    #[cfg(windows)] {
        std::process::Command::new("explorer.exe").arg("https://hta-ed-dial.syahmiyahya.chatgpt.site").spawn().map_err(|_|"Cannot open HTA ED Dial in your browser.".to_string())?;
        Ok(())
    }
    #[cfg(not(windows))] { Err("Open HTA ED Dial in your browser.".into()) }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PublishLibrary { repository:String, branch:String, token:String, modules:Value, expected_modules:Value, reviewed:bool }

fn publication_files(input:&PublishLibrary)->Result<Vec<Value>,String>{
    if !input.reviewed{return Err("Review the reusable library before publishing.".into())}
    let parts:Vec<_>=input.repository.split('/').collect();
    if parts.len()!=2||parts.iter().any(|s|s.is_empty()||s.len()>100||!s.chars().all(|c|c.is_ascii_alphanumeric()||"-_.".contains(c))){return Err("Repository must be owner/name.".into())}
    if input.branch.is_empty()||input.branch.len()>100||!input.branch.chars().all(|c|c.is_ascii_alphanumeric()||"-_/.".contains(c))||input.branch.contains(".."){return Err("Invalid branch.".into())}
    let docs=input.modules.as_object().ok_or("Invalid library.")?;
    if docs.len()!=3{return Err("Publish exactly the three reusable clinical collections.".into())}
    let mut files=Vec::new();let mut manifest=Vec::new();
    for kind in ["snippets","medications","calculators"]{
        let doc=&input.modules[kind];
        if doc["schemaVersion"]!=1||doc["kind"]!=kind||!doc["entries"].is_array(){return Err("Invalid library collection.".into())}
        let version=doc["moduleVersion"].as_str().ok_or("Missing library version.")?;
        if version.split('.').count()!=3||!version.chars().all(|c|c.is_ascii_digit()||c=='.'){return Err("Invalid library version.".into())}
        let text=serde_json::to_string_pretty(doc).map_err(|_|"Cannot encode library.")?;
        if text.len()>2_000_000{return Err("Library collection is too large.".into())}
        files.push(json!({"path":format!("{kind}.json"),"mode":"100644","type":"blob","content":text}));
        manifest.push(json!({"kind":kind,"version":version,"url":format!("{kind}.json")}));
    }
    files.push(json!({"path":"manifest.json","mode":"100644","type":"blob","content":json!({"schemaVersion":1,"modules":manifest}).to_string()}));
    Ok(files)
}

async fn response_value(r:reqwest::Response)->Result<Value,String>{
    if !r.status().is_success(){return Err(match r.status().as_u16(){401|403=>"GitHub access denied. Check the token and repository permission.".into(),404=>"GitHub repository or branch not found.".into(),409|422=>"The shared library changed. Refresh and review before publishing again.".into(),s=>format!("GitHub returned HTTP {s}. Library was not confirmed published.")})}
    r.json().await.map_err(|_|"Cannot read GitHub response.".into())
}

#[tauri::command]
pub async fn publish_library(input:PublishLibrary)->Result<String,String>{
    let files=publication_files(&input)?;
    if input.token.trim().is_empty(){return Err("Enter a repository-scoped GitHub token. It is used only for this publication.".into())}
    let client=reqwest::Client::builder().timeout(Duration::from_secs(30)).redirect(reqwest::redirect::Policy::none()).user_agent("NotePaeds-library").build().map_err(|_|"Cannot initialise publication.")?;
    let base=format!("https://api.github.com/repos/{}",input.repository);
    let get=client.get(format!("{base}/git/ref/heads/{}",input.branch)).bearer_auth(&input.token).send().await.map_err(|_|"Cannot reach GitHub.")?;
    let head=response_value(get).await?["object"]["sha"].as_str().ok_or("Invalid branch response.")?.to_string();
    // Compare the publication against the reviewed shared baseline at this exact commit.
    for kind in ["snippets","medications","calculators"]{
        let response=client.get(format!("{base}/contents/{kind}.json")).query(&[("ref",head.as_str())]).header("Accept","application/vnd.github.raw+json").bearer_auth(&input.token).send().await.map_err(|_|"Cannot check the shared baseline.")?;
        if !response.status().is_success(){return Err("Cannot verify the existing shared collections. Check library updates before publishing.".into())}
        let remote:Value=response.json().await.map_err(|_|"Cannot read the shared baseline.")?;
        if remote!=input.expected_modules[kind]{return Err("The shared library changed since your last review. Check library updates, review conflicts, then publish again.".into())}
    }
    let commit=response_value(client.get(format!("{base}/git/commits/{head}")).bearer_auth(&input.token).send().await.map_err(|_|"Cannot read shared library.")?).await?;
    let tree=response_value(client.post(format!("{base}/git/trees")).bearer_auth(&input.token).json(&json!({"base_tree":commit["tree"]["sha"],"tree":files})).send().await.map_err(|_|"Cannot prepare library publication.")?).await?;
    let commit=response_value(client.post(format!("{base}/git/commits")).bearer_auth(&input.token).json(&json!({"message":"Publish reviewed NotePaeds clinical library","tree":tree["sha"],"parents":[head]})).send().await.map_err(|_|"Cannot prepare library commit.")?).await?;
    let sha=commit["sha"].as_str().ok_or("Invalid publication response.")?.to_string();
    response_value(client.patch(format!("{base}/git/refs/heads/{}",input.branch)).bearer_auth(&input.token).json(&json!({"sha":sha,"force":false})).send().await.map_err(|_|"Connection interrupted. Check repository before retrying publication.")?).await?;
    let check=response_value(client.get(format!("{base}/git/ref/heads/{}",input.branch)).bearer_auth(&input.token).send().await.map_err(|_|"Publication sent; could not verify the repository. Check it before retrying.")?).await?;
    if check["object"]["sha"]!=sha{return Err("Repository moved after publication; check it before retrying.".into())}
    Ok(format!("https://github.com/{}/commit/{sha}",input.repository))
}

#[cfg(test)]mod tests{use super::*;#[test]fn publication_rejects_patient_exports_and_unreviewed_content(){let mut i=PublishLibrary{repository:"owner/repo".into(),branch:"main".into(),token:String::new(),modules:json!({"patients":[]}),expected_modules:Value::Null,reviewed:true};assert!(publication_files(&i).is_err());i.modules=json!({"snippets":{"schemaVersion":1,"kind":"snippets","moduleVersion":"1.0.0","entries":[]},"medications":{"schemaVersion":1,"kind":"medications","moduleVersion":"1.0.0","entries":[]},"calculators":{"schemaVersion":1,"kind":"calculators","moduleVersion":"1.0.0","entries":[]}});assert_eq!(publication_files(&i).unwrap().len(),4);i.reviewed=false;assert!(publication_files(&i).is_err());}}
