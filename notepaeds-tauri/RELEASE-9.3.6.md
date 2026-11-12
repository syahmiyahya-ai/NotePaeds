# NotePaeds 9.3.6

Publishing the library keeps the duration on a saved fluid regimen. Patient-specific weight, volume and rate stay excluded (PR #1).

The vitals parser reads a blood pressure written as BP x/y and an oxygen saturation written as sats N (PR #2).

Quick export and Save Shift As save into one shared shift folder setting (PR #3). Settings can name that folder. Quick export writes the text file there, and Save Shift As opens the save dialog in that folder.

All AI features now use Google Gemini instead of OpenAI (PR #4). The key is saved in AI connection. After upgrading, use Test connection. The Gemini connection has not been tested against Google yet. A previously saved OpenAI key is not sent.

Diphenhydramine is included as a historical Ministry of Health reference, with a local approval warning and no auto-dosing. The medication feed manifest is 1.1.1 (commits cf28402, ff35b2d and fa9a2be).

This release does not activate the proposed HTA medication reconciliation. Existing clinical library overrides retain their existing storage mechanisms.
