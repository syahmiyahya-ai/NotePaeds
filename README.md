# NotePaeds

A portable Windows clinical drafting editor with a Notepad-like outer window, patient tabs, inline snippets, medications and IV fluids, scoring, parsers, ICD-10 assistance and an optional guided introduction.

## Download

Use [GitHub Releases](https://github.com/syahmiyahya-ai/NotePaeds/releases/latest). This repository is private: sign in with an account that has repository access. Extract the complete portable ZIP and run `NotePaeds.exe`. Export your current shift and reusable library before upgrading; retain the previous folder while testing.

Current source version: **9.3.5**. Open **Help → Quick start** for the Apple-inspired guide and isolated shortcut practice. The proposed HTA November 2025 medication reconciliation is not activated in this version.

## Future updates

1. Make and review source changes in this repository.
2. Each push to `main` runs **Actions → Windows portable** on GitHub's Windows runner. Successful builds appear as workflow artifacts.
3. To create a permanent download, increase the version consistently in package.json/package-lock.json, Cargo.toml/Cargo.lock, tauri.conf.json and the displayed version; run **Windows portable → Run workflow**, enabling **publish_release**.
4. Download the versioned ZIP from Releases. Existing release tags are not overwritten automatically.

The repository holds code, version history and reusable library defaults. Patient notes, shifts, local settings, credentials, private signing keys, build caches and portable binaries are excluded from source commits. ZIPs belong in Releases, not the code tree.

The shared clinical-library feed remains in the separate [notepaeds-modules repository](https://github.com/syahmiyahya-ai/notepaeds-modules). Moving source and downloads here does not change the installed app's signed automatic-update endpoint. GitHub builds do not receive the local updater signing key; they produce manual-download packages only. No private signing key is required for normal repository builds.

## Development

The active app is Tauri 2 (Rust + HTML/JavaScript), in `notepaeds-tauri`. Older local WinForms/web prototypes are not part of this repository's app build.

Windows prerequisites: Node.js 22+, Rust stable/MSVC, Visual Studio C++ build tools, and WebView2 runtime.

```powershell
node tools/sync-92.cjs
node notepaeds-tauri/tests/release-92-check.cjs
cd notepaeds-tauri
npm ci
cd src-tauri
cargo test --locked
cd ..
npm run build -- --no-bundle
cd ..
powershell -File tools/package-github.ps1
```

The official WHO ICD-10 2019 code/title metadata is bundled for offline lookup; it is not a complete tabular coding reference. Clinical entries and AI suggestions require clinician review. Browser interaction scripts under `tools/verify-*.js` use synthetic data with the local preview server; GitHub's initial workflow runs syntax/core checks and native tests, not a visual browser or clinical validation suite.
