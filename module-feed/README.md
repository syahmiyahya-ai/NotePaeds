# NotePaeds module feed

Publish this folder unchanged on an HTTPS static host. The public address of
`manifest.json` is the update address entered in NotePaeds Settings.

Published address:
`https://syahmiyahya-ai.github.io/notepaeds-modules/manifest.json`

For every release:

1. Edit and validate the module in `notepaeds-tauri/modules`.
2. Increase its `moduleVersion` using `major.minor.patch` numbers.
3. Copy the module into this folder.
4. Set the matching version and `publishedAt` in `manifest.json`.
5. Publish all changed files together.

NotePaeds checks the manifest but never installs clinical content silently.
