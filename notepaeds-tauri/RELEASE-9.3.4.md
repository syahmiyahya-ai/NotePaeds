# NotePaeds 9.3.4 — organised Tools menu

Tools now has six top-level entries: Search & insert, Patient & investigations, AI & coding, Clinical library, Settings / portable setup, and HTA ED Dial. Original action buttons and shortcuts are preserved inside their groups. The redundant Check module updates entry is hidden in favour of the existing reviewed library-sync action.

Submenus open by hover, click or keyboard. Arrow keys, Home/End and Escape support navigation and focus return. Flyouts flip to stay within the viewport; narrow windows expand the group inline. Patient notes, medication regimens and API credentials are not modified. The onboarding guide's menu paths are updated.

Thirteen menu checks passed, including actual FBC access, keyboard navigation, duplicate removal, compact layouts and note preservation. Existing 12 medication/FBC checks and 53 ICD/library checks passed with the new navigation.

Source and Windows builds are now hosted in the private syahmiyahya-ai/NotePaeds repository. The clinical-library feed remains separate. GitHub builds do not use the local updater signing key and do not change the installed signed-update endpoint. HTA dosing reconciliation remains review-only.

Delivery verified: GitHub Actions run 39241331923 passed the core checks, optimized native tests, Windows build, packaging and release publication. The GitHub release ZIP was downloaded to a temporary QA folder, its SHA256 matched, and version 9.3.4 launched responsively with an isolated profile.

ZIP: 4,333,145 bytes. SHA256: ded0516de0e6f6b2e8c96ed0bcf97e15ea0163abcebf6f1748f61796abd6d026.

Download: https://github.com/syahmiyahya-ai/NotePaeds/releases/tag/v9.3.4

Additional checks: nine ICD failure/lookup checks and fourteen onboarding checks passed. Repository remains private; sign-in is required for access.
