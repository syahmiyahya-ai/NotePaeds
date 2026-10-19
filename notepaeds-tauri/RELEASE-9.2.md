# NotePaeds 9.2

The main window remains a compact Notepad-style editor. Search, medication and IV-fluid editing, dialogs and tooltips have a softer macOS-inspired appearance. The application icon is a blue notebook with a pulse mark.

- Ctrl+Space searches snippets, medications, IV fluids and scoring. F2 opens snippets, F3 medications and fluids, F4 scoring. F6/F7/F8 remain patient ID, vitals and timestamp. Alt+Enter edits an inserted medication or fluid order. Ordinary >, / and # do not open commands; Tab does not open the dose editor.
- Dose, route and frequency edits can apply only to the current patient, save as another regimen or replace a saved regimen after an old/new comparison. Saved weight-based templates do not retain patient weight or calculated totals.
- IV fluids support fluid name, volume, rate, duration, purpose and instructions. Optional volume/rate/duration arithmetic is reviewed before insertion. Saved fluid templates leave patient-specific numbers blank.
- Bed / QMS assigns a Yellow-zone bed or Green-zone QMS to each patient. Tabs show names first. Locations are included in JSON shift backups through Save Shift As; Open saved shift restores them. Quick export remains text.
- The HIS vitals parser handles Heart (Pulse) Rate, separate Systolic BP and Diastolic/Dystolic BP, SpO2 (%), pain zero, Alert and weight. It does not infer oxygen delivery or GCS.
- Tools > AI connection saves an API key encrypted for the Windows account, with Test and Remove controls. Existing Windows environment keys remain usable unless the key is explicitly removed in NotePaeds. No API key is distributed in the portable package.
- Tools > Check for updates checks a signed full-app release. A download must pass signature and SHA-256 verification before replacement. The app saves locally and restarts only when requested. The previous executable is retained as NotePaeds.previous.exe. Custom modules stay in place; module updates are reviewed separately.

## Upgrade

Export your current shift and clinical library, close the old application, and extract the entire ZIP into a new folder. Keep the modules folder beside NotePaeds.exe. Keep your old folder until you have checked your notes and custom library. The first move from 9.0/9.1 to 9.2 is a manual download; subsequent app releases can use the new updater.

Windows x64 and WebView2 are required. If a shared or protected folder blocks replacement, the updater keeps the verified download and displays its location for manual replacement. Notes stay in the existing local WebView profile; they are not encrypted by this release. API keys are encrypted separately.

## Validation and limits

Local regression checks cover the supplied HIS sample, placeholder behaviour, diagnosis matching, literal symbol typing, fluid arithmetic, dose limits, saved templates, location display and restoration, and medication edit links. Native tests cover encrypted credential round trips, signed update acceptance/tamper rejection, versions and module backups. Browser checks use synthetic notes and regimens only.

Live paid AI generation was not invoked. It requires a valid key, available quota and network access. A future published-version restart/update has not yet been exercised end-to-end. Keep the previous portable folder as a recovery copy.
