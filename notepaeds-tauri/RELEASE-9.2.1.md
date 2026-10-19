# NotePaeds 9.2.1

Adds cursor-local `//`, `;;`, and `##` menus, linear medication/fluid editors, compact dose formatting, optional limits, manual-edit save choices, and arithmetic mismatch highlighting. The Notepad shell, locations, settings, credentials and optional Spotlight remain compatible.

Medication anchors now survive ordinary edits and undo/redo. Shift import restores validated anchors. Ambiguous or cross-record replacements remain text and are not interpreted as new medication records. Missing weight produces no calculated total and no warning on its own. Unit conversion supports explicit mass units; unrecognised or insufficient arithmetic is left unclassified.

Saving a regimen is explicit. Updating shows the original and replacement before confirmation. Weight and calculated patient totals are excluded from reusable medication templates; patient-specific fluid quantities are excluded from fluid templates.

IV fluids additionally support direct mL, mL/kg, bolus mL/kg with explicit timing, and exact daily Holliday–Segar maintenance (100/50/20 mL/kg/day; hourly = daily / 24). No bolus dose or administration speed is assumed. Maintenance needs an explicit weight. Formula reference: [NICE NG29 recommendation 1.4.1](https://www.nice.org.uk/guidance/ng29/chapter/Recommendations). Saved templates retain the mode and mL/kg coefficient but exclude patient weight and calculated totals.

Maintenance now offers Full, 2/3 and Half, applied before rounding. Inserted notes show only fluid, hourly rate and maintenance label; exact calculations remain in the editor.

## Verification

- 37 browser checks: triggers, ordinary punctuation, arithmetic, compact formatting, no weight, caps, edit tracking, recalculation, insertion and cancellation.
- 17 browser checks: save/new/update, before-after review, undo/redo, restart, shift import, small-window layout, scroll/font alignment, stale patient guard and explicit unit conversion.
- 17 fluid checks: mL/kg with/without weight, bolus dose/timing, minutes, Holliday–Segar boundaries and fractional weight, template privacy, reopening and manual mismatches.
- 20 compact-maintenance checks: fractions before rounding, labels, small rates, manual mismatch/recalculation, legacy parsing, preview, saved templates and reopening.
- Nine native tests passed for credentials, modules, generation input restrictions and signed updates.
- Browser fixtures use synthetic notes. Local QA tools and test bridges are excluded from the portable package.

Build: `node tools/prepare-921.cjs`, then `npm run build -- --no-bundle` in `notepaeds-tauri`, then `powershell -File tools/package-92.ps1` from the repository root. Browser verification uses the local-only `tools/preview-921.cjs` server and the two `tools/verify-921-*.js` scripts through Playwright CLI.

Publication of the GitHub executable and signed update feed is separate from preparing this local package. Live paid AI and a future published updater restart were not exercised in this patch.


## Portable delivery

The corrected maintenance package built successfully and passed an isolated Windows launch check. GUI subsystem 2, release signature and executable digest were verified. The six-file ZIP contains the executable, instructions and modules.

[Download from Google Drive](https://drive.google.com/file/d/1U2ozZNfkxSp0kD84Ebihxnv55w0egPr6/view?usp=drivesdk). ZIP size: 3,958,027 bytes.

ZIP SHA-256: 69B6B58CDD5B1CA1707231478631A4431649360CCE5C291F7D62DE188D9F648B.

Package suffix: -maintenance (the previous portable executable was in use and was left running).

## Zone starters and locations

Added case-insensitive ==y / ==g / ==yt / ==gt / ==rt plus Enter, exact zone headings, optional Bed / QMS, the ordered Yellow bed list and a spatial bed picker. Red zone is supported in saved-shift import. Existing ED and trauma template bodies are reused.

Zone revision: 30 browser checks passed; Windows release build and isolated native launch passed. Download: https://drive.google.com/file/d/1IMxPF7RYaXXKApzZfZPoiqDyr34exyIL/view?usp=drivesdk . ZIP: 3,959,576 bytes. SHA256: E32783B134FFA365A4A91D3384FBDBA4E93D372E4B612074E07B3A010AAE3B81.

## Fast location revision

Added case-insensitive @ location shortcuts with Enter. Bed/EYZ/Cor/ISL set Yellow; numeric QMS sets Green. Invalid tokens and email-like text stay literal. Corrected spatial map and file colours, including white walls. Existing ordered dropdown retained.

Location revision verification: 50 new checks and 30 existing zone checks passed. Release build and isolated Windows launch passed. Map uses interactive HTML buttons and CSS walls, with the sketch used only as a layout reference. Download: https://drive.google.com/file/d/1JmN-6HPZrDhiLmhEDxBfQmyX33pg7L2R/view?usp=drivesdk . ZIP size: 3,960,175 bytes. SHA256: 3BD7CD4DF43F089BAB04D19B76F7D835FD860BEBC105365646EFC9493DA3AFC5.
