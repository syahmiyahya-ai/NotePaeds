# NotePaeds modules — v9.1.0

The portable app loads three editable data files beside `NotePaeds.exe`:

```
NotePaeds.exe
modules/
  snippets.json
  medications.json
  calculators.json
```

## Online module updates (v8.4.0 and later)

The app can check an HTTPS `manifest.json` for higher module versions. Configure
the address in **Settings / portable setup**, then use **Tools > Check module
updates** or enable the startup check. A check never uploads patient notes.

The official NotePaeds feed is preconfigured at:
`https://syahmiyahya-ai.github.io/notepaeds-modules/manifest.json`.

Every update remains review-before-install. The update window shows the current
and proposed versions plus entry counts for additions, changes and removals.
The previous local files are retained and **Rollback last update** restores them.
When offline, NotePaeds keeps using the last valid local modules.

Each module may include `"moduleVersion": "1.2.0"`. Online releases require
three numeric parts and the version must match the manifest. Publish the provided
`module-feed` folder on one HTTPS static host; relative module URLs in its manifest
will resolve beside that manifest.

Use **Tools > Manage modules** to search and select snippets, medications, or
scoring tools. Add, duplicate, disable, edit, or remove entries with the form,
review the clinical content, then choose **Validate & save**. The change takes
effect immediately without rebuilding the executable. In the Windows app a
successful save preserves the previous file as `filename.json.bak`.

You can also edit these files in a text editor. Restart NotePaeds or use
**Reload files** afterward. Finish unsaved module edits before reloading or
switching the module dropdown. The app rejects a save if that file has changed
outside NotePaeds since it was loaded.

In standalone HTML, the same manager stores changes in the browser. Use Export
JSON / Import JSON to transfer them; a browser cannot automatically read or write
the adjacent modules directory. Patient notes are never part of a module export.

Use **Tools > Export clinical library** to create one portable sync file containing
all three modules and custom snippets. **Import clinical library** validates every
module, shows the entry counts for review, and retains the previous module files
as backups before applying the import. Patient notes are excluded.

## Add, change, disable or remove

Each file has this envelope (change `kind` for the other module types):

```json
{"schemaVersion":1,"kind":"snippets","entries":[]}
```

- Add an object inside `entries` with a unique, stable `id`.
- Edit the object's fields to change it.
- Add `"enabled": false` to hide that entry without deleting it.
- Remove the object to remove the entry. An empty `entries` array disables the
  entire category. Existing clinical notes are never rewritten by module changes.
- Deleting a whole JSON file restores that category's bundled defaults on reload.
- Malformed modules disable module-dependent tools and display an error; the app
  does not silently substitute a different clinical configuration.
- Keep your own modules when upgrading to a new portable folder; export them or
  copy them into the new folder before starting the new version.
- Older custom snippets remain in this Windows/browser profile. Manage those in
  Clinical > Manage snippets; a custom snippet with the same ID takes precedence.

The editor retains an **Advanced JSON for this entry** section for uncommon
fields and recovery. Import and Export continue to use complete module JSON
files. Structural validation cannot validate clinical correctness. Review all
clinical content against the applicable local protocol.

## Snippet fields

Required: `id`, `title`, `group`, `text`. Optional: `desc`, `enabled`.
New lines inside text are encoded as `\n`.

```json
{
  "id": "custom_followup",
  "title": "Follow-up",
  "group": "Structural snippets",
  "desc": "Blank follow-up headings",
  "text": "Follow-up:\nDate: _\nPlan: _",
  "enabled": true
}
```

## Medication fields

Required: `id`, `name`, `text`. Keep the IDs stable to retain the connection to
newly inserted medication lines. Optional fields include `type`, `orderPrefix`,
`otherName`, `route`, `category`, `indication`, `targetAge`, `formulations`, `dose`,
`maxSingle`, `maxDaily`, `toxicLimit`, `duration`, `administration`, `weightBands`,
`organRisk`, `warnings`, `emergency`, `revision`, `frequency`, `calcPerKg` and
`enabled`. Use existing entries as the schema examples; do not infer missing doses.

`text` is the stored uncalculated medication snippet. `calcPerKg` is normally null.
Only set a positive number for an explicitly verified single mg/kg/dose regimen,
with its explicit frequency. It is not for ranges, daily totals, micrograms,
infusions, loading sequences or weight-band schedules. Those require clinician
selection in the tooltip calculator. Dose limits written as plain `1000 mg` or
`2000 mg/day` are recognized as mg limits; other wording requires manual review.

Type `>medicine`, then Enter: the snippet inserts immediately. For an enabled
verified single-dose default, the calculated quantity is initially `(_mg)`.
Hover the newly inserted line, click its tooltip, enter weight and review the
regimen. **Apply dose to this line** replaces only that line. No weight is required
for initial insertion. Changing patient or changing the note invalidates an open
dose update. Doses are not recalculated automatically when weight changes elsewhere.

Keyboard alternative: place the caret within or at the end of an inserted
medication, then Alt+Enter to open its weight/dose tooltip.

## Calculator fields

All entries need `id`, `title`, `kind`; `enabled` is optional.

- `kind: "arithmetic"` exposes the existing arithmetic calculator.
- `kind: "score"` defines selectable component scores, optional context/age-band
  choices and severity ranges. PAS and PRAM are working schema examples.
- `kind: "formula"` supports named numeric inputs and a plain arithmetic
  expression using `+ - * / %` and parentheses. It does not execute JavaScript,
  call URLs or read patient notes. Inputs start blank.
- `kind: "risk-rule"` defines age/context bands of yes/no findings. PECARN is
  the working example. It is not added up as a numerical score. Each band has
  findings with `risk: "high"` or `"intermediate"`, and explicit `outcomes` for
  `high`, `intermediate` and `low`. High-risk findings take precedence. All
  findings and eligibility must be assessed before a result is available.

Score fields contain `id`, `label`, and `options` with `{ "label": "...", "score": 0 }`.
The score is the sum of the explicitly selected options. Optional `contexts`
provide choices; a dependent field uses `context` plus a `variants` object keyed
by those choices. Changing a context clears its dependent finding.
Each `severity` entry has integer `min`, `max`, and `label`. Ranges must cover the
possible total without gaps or overlaps. `label` is the inserted score prefix
(for example `PRAM: 7`). Hover reference text is generated from the current module,
so changing a score definition also changes its tooltip. Old score text is not
version-stamped: review historical scores against the version used at assessment.

Non-clinical formula schema example (not installed by default):

```json
{
  "id": "double_number",
  "kind": "formula",
  "title": "Double a number",
  "inputs": [{"id":"number","label":"Number"}],
  "expression": "number * 2",
  "outputLabel": "Double",
  "decimals": 2,
  "note": "Arithmetic demonstration, not a clinical calculator."
}
```

Optional formula input fields: `unit`, `min`, `max`. Optional output fields: `unit`
and `decimals` (0–6). Both scores and formulas can carry `note`, `source` and an
HTTPS `sourceUrl`. A fundamentally new interaction or algorithm outside these
supported data schemas still needs an engine update; ordinary content changes,
new sum-based scores and arithmetic formulas do not require rebuilding.

## PECARN head injury rule

PECARN has separate under-2 and 2–17-year pathways, an eligibility check, and
blank-by-default findings. It is based on Figure 3 of
[Kuppermann et al., Lancet 2009](https://www.pecarn.org/studyDatasets/documents/Kuppermann_2009_The-Lancet_000.pdf).
The module includes age-specific severe-mechanism definitions, exclusions and
clinical-judgement reminders. It does not authorise automatic imaging or discharge.
Risk-rule modules use `label`, `eligibility`, `reference`, and `bands`; each band
has `id`, `label`, `fields` (`id`, `label`, `risk`) and the three outcome strings.
These entries can be edited, removed or disabled like other calculator modules.

## PRAM reference

PRAM is transcribed into selectable components using the
[Canadian Paediatric Society scoring table](https://cps.ca/documents/position/managing-an-acute-asthma-exacerbation),
checked 10 September 2026. PAS retains the supplied table, including its overlapping
age-4 bands. Neither score assumes unassessed findings or replaces clinical review.
