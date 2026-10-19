# NotePaeds 9.1 — Tauri Notepad Shell

This packages the NotePaeds 9.1 single-file interface as a Windows desktop app.

## Included

- Windows 11 Notepad-style borderless shell with draggable title bar
- Native minimize, maximize, close, dynamic title and always-on-top actions
- 35 current clinical snippets
- 112 medication entries with stored tooltips and note insertion
- Expanded F6 patient identifiers and F7 vital-sign formats
- Automatic tab titles, timestamp dividers and offline ICD-10 suggestions
- Smart diagnosis-ranked medication prompts and clinical-library transfer
- Save Shift As with the native Windows location picker
- Existing patient tabs, local autosave, timers and alarms
- Calculator, PAS / PRAM scoring and Generate (Summary, Referral memo, Home advice)
- Immediate medication snippets with weight/dose entry afterward in the note tooltip
- Editable snippets, medication and calculator data modules; see MODULES.md

## Portable Windows build

Run `npm run tauri -- build --no-bundle --ci` to produce the release executable
without an installer. The modular delivery is under `../portable/NotePaeds-9.1.0-win-x64-portable`.
Keep the `modules` folder beside the executable. Tools > Manage modules supports
validated changes without recompiling. Copy your own modules when upgrading.
WebView2 is required on the destination PC. Drafts stay in the Windows/WebView
profile rather than travelling with the executable. API keys are not bundled.

## Build prerequisites

Install the current Tauri Windows prerequisites:

1. Microsoft C++ Build Tools with **Desktop development with C++**
2. Microsoft Edge WebView2 Runtime
3. Rust using `rustup` with the MSVC toolchain

Then run:

```powershell
npm install
npm run dev
npm run build
```

The NSIS installer is emitted under `src-tauri\target\release\bundle\nsis`.

Patient drafts are stored locally by the embedded WebView and are not encrypted. Clear them at handover according to the local privacy workflow.

## Keyboard medication editor

Type `>` and choose a medicine for immediate insertion. When the note contains
an explicit Impression or Diagnosis, matching entries are ranked first. Put the caret on that
medication line and press `Tab` or `Alt+Enter` (or click its hover bubble) to
open the one-row editor. Dose, unit/basis and frequency show the medication's
stored choice plus `Other…`. Tab moves through the dropdowns and weight; arrow
keys change a selected option; Enter applies it directly; Escape closes it and
returns to the note. If the note already contains weight, the immediate line is
calculated automatically. Without weight, no blank calculated-dose placeholder
is inserted.
