# NotePaeds 9.3.3

Quick start now has an Apple-inspired setup-assistant layout, chapter sidebar, soft illustrations, rounded practice cards and reduced-motion support.

New: Help > Quick start opens a seven-chapter onboarding guide with isolated shortcut practice. Close and resume later, or restart anytime. No automatic tutorial popup; no practice text is inserted into patient notes.

The main window remains a compact Notepad-style editor. Search, medication and IV-fluid editing, dialogs and tooltips have a softer macOS-inspired appearance. The application icon is a blue notebook with a pulse mark.

- Type // for snippets, ;; for medications and IV fluids, or ## for scoring at the start of a line or after a space. Type to filter, use arrow keys and Enter to select, or Escape to keep the typed text. Ctrl+Space and F2/F3/F4 retain Spotlight search. Single comparison signs remain text.
- Medications insert immediately; Tab immediately after insertion or the small Edit button opens the editor. Fluids open their calculation fields beside the cursor. Tab moves through fields; Enter applies; Escape cancels. Alt+Enter reopens a tracked order. Dose limits under More details are optional. Without weight, a weight-based order omits the calculated total.
- Manual edits of tracked medication/fluid lines offer Patient only, Save as new and Update original after a short pause. Confirmed arithmetic mismatches appear red; hover for an explanation or Recalculate. Patient only keeps the mismatch visible until corrected. Unparseable edits require field review before saving. These are arithmetic checks, not a complete prescribing safety system.
- Dose, route and frequency edits can apply only to the current patient, save as another regimen or replace a saved regimen after an old/new comparison. Saved weight-based templates do not retain patient weight or calculated totals.
- IV fluids offer Direct mL, mL/kg, Bolus (mL/kg), and Holliday-Segar maintenance. Bolus dose and timing are entered explicitly; minutes and hours are supported. Without weight, mL/kg can be inserted without a calculated total. Holliday-Segar requires weight and shows daily volume and hourly rate using 100/50/20 mL/kg/day, divided by 24 for the hourly rate. It is a routine maintenance calculation, not a neonatal or condition-specific fluid plan. Reference: https://www.nice.org.uk/guidance/ng29/chapter/Recommendations (1.4.1).
- Maintenance offers Full, 2/3 and Half. The fraction is applied before rounding the note rate to whole mL/hour; rates below 1 retain decimals. Notes use compact text such as IV fluids NSD5% 80mL/hour — Full Maintenance. Exact daily volume and hourly calculation remain visible in the editor.
- Fluid arithmetic is reviewed before insertion. Saved templates retain the selected mode and any reusable mL/kg coefficient, while excluding patient weight, total volume, rate and duration. Manually edited fluid totals are checked when enough explicit values are available.
- Bed / QMS assigns a Yellow-zone bed or Green-zone QMS to each patient. Tabs show names first. Locations are included in JSON shift backups through Save Shift As; Open saved shift restores them. Quick export remains text.
- The HIS vitals parser handles Heart (Pulse) Rate, separate Systolic BP and Diastolic/Dystolic BP, SpO2 (%), pain zero, Alert and weight. It does not infer oxygen delivery or GCS.
- Tools > AI connection saves an API key encrypted for the Windows account, with Test and Remove controls. Existing Windows environment keys remain usable unless the key is explicitly removed in NotePaeds. No API key is distributed in the portable package.
- Tools > Check for updates checks a signed full-app release. A download must pass signature and SHA-256 verification before replacement. The app saves locally and restarts only when requested. The previous executable is retained as NotePaeds.previous.exe. Custom modules stay in place; module updates are reviewed separately.

## Upgrade

Export your current shift and clinical library, close the old application, and extract the entire ZIP into a new folder. Keep the modules folder beside NotePaeds.exe. Import your saved clinical library into the new copy if you have custom entries. Keep your old folder until you have checked your notes and custom library. This 9.3.3 package is a manual download; automatic availability depends on publication of the signed update feed.

Windows x64 and WebView2 are required. If a shared or protected folder blocks replacement, the updater keeps the verified download and displays its location for manual replacement. Notes stay in the existing local WebView profile; they are not encrypted by this release. API keys are encrypted separately.

## Validation and limits

Local regression checks cover the supplied HIS sample, placeholder behaviour, diagnosis matching, literal symbol typing, fluid arithmetic, dose limits, saved templates, location display and restoration, and medication edit links. Native tests cover encrypted credential round trips, signed update acceptance/tamper rejection, versions and module backups. Browser checks use synthetic notes and regimens only.

Live paid AI generation was not invoked. It requires a valid key, available quota and network access. A future published-version restart/update has not yet been exercised end-to-end. Keep the previous portable folder as a recovery copy.


Zone starters: type ==y or ==g then Enter for Yellow or Green zone clerking. ==yt, ==gt and ==rt then Enter insert trauma clerking and set Yellow, Green or Resus / Red zone. Uppercase is also accepted. Bed / QMS is optional and editable anytime. Yellow beds can be selected in the supplied order or using the bed map.

Fast location entry: @B1 through @B8 assign Bed 1-8; @E1-@E4 assign EYZ; @C1-@C4 assign corridor; @I1-@I4 assign isolation. @5405 assigns Green QMS 5405. All are case-insensitive and apply on Enter at a word boundary; only the shortcut is removed. Bed shortcuts set Yellow zone. The revised floor map shows orange Bed/EYZ, pink ISL/Cor and white walls.

## New in 9.3.3
AI ICD-10 opens a visible review/search panel. Enter diagnosis or de-identified clinical findings, review the text, and click Search. Progress, errors, empty results and retry are visible. Possible diagnoses are marked for review. Qualifiers are retained. Click valid terminal codes to copy only the code. Patient/note changes discard stale results.
Tools > Search ICD-10 library searches 12,221 code/title entries from WHO ICD-10 2019. Edition is explicitly labelled; confirm it matches your workplace. This dataset validates codes and titles; it is not a complete coding engine and lacks inclusion/exclusion instructions. Source: https://icdcdn.who.int/icd10/index.html . Reference guidance: https://icdcdn.who.int/icd10/metainfo.html . The reference is bundled with this app version.
Startup library checks use the existing HTTPS module address in Settings and run in the background. Click the Library status to review updates. Personal edits are preserved; unknown or overlapping changes default to Keep mine. Reviewed updates retain a local rollback snapshot. Restore previous library is in Tools. Snippets, medications/fluids and scoring remain available offline.
Tools > Publish library changes publishes reviewed reusable collections to an existing GitHub repository. Check/review the shared library first. Enter a repository-scoped token for the publication; it is cleared after use and never saved to preferences. The app compares the shared baseline at the current commit and refuses stale publication. Patient drafts and API credentials are excluded. Review reusable entries for accidentally pasted identifiers. GitHub Pages must already serve the chosen repository. Other copies see changes after Pages deployment completes.
HTA ED Dial opens in the default browser from the menu bar or Spotlight. Existing account restrictions still apply. Direct contact search links are not yet available.
AI and GitHub publication were checked with simulated responses; no paid AI request or real repository publication was performed during release verification.
