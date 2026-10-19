# NotePaeds 9.3.5

Blood investigations now recognise FBC, RP, LFT, CRP, calcium/magnesium/phosphate, troponin I/T, coagulation, TFT, lipids, blood gas and additional common labelled tests. Supplied units and comparison signs are retained; no missing values, conversions or normal results are inferred. Conflicting repeated results are flagged and omitted for manual review. FBC retains its two-line format.

F5 opens the local parser with an editable preview. Ctrl+Shift+A opens the active patient's timer/alarm. Shortcuts preserve an open editor. Insertion retains the original cursor location and is blocked if the patient or note changes.

Verification: pure parser coverage for aliases, units, precision, inequalities, missing values, ambiguous numbers and conflicting results; 12 new browser checks; 12 medication/FBC regression checks; 13 Tools menu checks; existing core/syntax checks. Windows build and native tests run on GitHub before release.

This release does not activate the proposed HTA medication reconciliation. Existing clinical library overrides and credentials retain their existing storage mechanisms.
