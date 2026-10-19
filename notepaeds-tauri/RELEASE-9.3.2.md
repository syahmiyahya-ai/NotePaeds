# NotePaeds 9.3.2 — optional onboarding

Help → Quick start opens a seven-chapter guide: introduction, patients/zones/locations, parsers, inline menus, medication/fluid editing, ICD-10, and saving/library sync/help.

The guide uses the existing window and dialog styling. It does not open automatically. The Help entry shows New or Resume until completion. Chapter position and completion persist locally under a separate versioned key. Close and resume, direct chapter navigation, Finish and Restart are supported.

Practice text stays in an isolated in-memory textarea and is discarded when the application closes. Examples use placeholders rather than real prescription doses. Practice supports inline search/filtering, arrows/Enter, Escape with typed-text preservation, simulated medication Tab editing and sample location shortcuts. No patient records, stored medication regimens, modules or API credentials are modified by practice or guide restart.

Fourteen browser checks passed, including restart persistence, keyboard cancellation, simulated editing, completion, restart, compact window layout and patient-data isolation. Native history is normalised by the existing application on reload; isolation comparison excludes history/undo indices and verifies all other patient properties.

This package retains the 9.3.1 FBC and medication insertion changes. The HTA medication reconciliation remains review-only; this release does not activate those proposed dosing changes. The previous 9.3.1 portable package is retained separately.
