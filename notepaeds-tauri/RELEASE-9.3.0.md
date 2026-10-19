# NotePaeds 9.3.0

AI ICD-10 now opens a visible review/search panel and shows progress, useful failures, empty results and Retry. It accepts reviewed de-identified clinical findings for possible diagnosis suggestions, preserving qualifiers and marking AI-proposed candidates. Structured responses use WHO ICD-10 2019 and are checked against 12,221 official code/title entries. Valid terminal codes can be copied individually from the results and status bar. A clipboard fallback selects the code for manual copying. Pending results are discarded when the patient or note changes.

The reference comes from https://icdcdn.who.int/icd10/index.html (2019 metadata including listed updates). It validates codes and titles; inclusion/exclusion notes are not included. See https://icdcdn.who.int/icd10/metainfo.html . WHO 2019 remains explicitly labelled because the workplace edition has not been confirmed. The reference is bundled with the program, rather than silently replaced by startup library checks.

Library checks use the existing HTTPS module feed in Settings. The local library opens immediately; background checks report status without opening a dialog or taking focus. Review shows entry-level before/after changes and conflicts. Existing personal changes and older settings-based custom snippets are included in the merge. Unknown baselines default to preserving overlapping local content. Patient notes remain untouched. A previous library and baseline are retained for rollback.

Publish library changes is a separate reviewed action. It requires an existing GitHub repository, branch and a repository-scoped token entered for that publication only. The token is cleared and not persisted. Publication compares the current repository collections to the reviewed baseline and updates all collections/manifest in one Git commit, refusing stale edits. It excludes patient drafts and calculated patient values. Custom reusable entries still require review for accidentally pasted identifiers. Pages hosting must already be enabled. No real library publication was made during implementation.

HTA ED Dial opens in the default browser through the menu bar, Tools or Spotlight. Its existing account restrictions apply. Contact-specific search links were not verified or added.

## Validation

- 53 workflow checks: qualifier recognition, edition validation, AI UI and errors, copy, stale patient protection, quiet sync, conflicts, rollback, reviewed publication boundary, dial access and minimum-window layout.
- Nine failure/lookup checks: empty input, identifiers, empty results, timeout, retry, clipboard fallback and offline code/description search.
- Six legacy-personal-snippet checks: conflict review, keep-mine, migration, restart and rollback.
- Existing 37 medication/editor checks, 17 tracking/persistence checks and 50 fast-location checks rerun successfully.
- 11 native tests passed, including secure credentials, signed updates, stale batch-write rejection and publication input validation.
- Browser fixtures use synthetic notes and API responses. No paid AI request, real GitHub publication or future full-app update restart was exercised.

Build: node tools/prepare-93.cjs; npm run build -- --no-bundle in notepaeds-tauri; tools/package-92.ps1. QA server/test bridges are never written into the portable application.

Extract the complete portable ZIP into a new folder. Export your current shift and library before upgrading; import your custom library into the new folder. Keep the previous portable folder until you have checked your data.

## Portable delivery

Windows release build and isolated launch succeeded; 9.3.0 was responsive. GUI subsystem 2, six-file ZIP, release signature and executable digest verified. Google Drive upload verified by metadata readback, 4,147,511 bytes.

Download: https://drive.google.com/file/d/1b_4F0Vr6M2iydNBZ6weQVU5nZr52SLjT/view?usp=drivesdk

ZIP SHA256: 72DF7E3BA24CF6C6C4ED80F36F7604C8BF866043D1E8CD7BA475663A6AF1820F

The executable and app-update feed were not published to GitHub. This is a manual portable download.
