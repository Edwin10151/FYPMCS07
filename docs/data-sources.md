# Development Data Sources

| Data | Current source | Rule |
|---|---|---|
| Unit ULOs and assessments | Public [Monash Handbook](https://handbook.monash.edu/2026/units/FIT3161?year=2026) | Import the selected Malaysia S1/S2 offering as a draft and require coordinator confirmation. Rows with published labels are strictly filtered to that offering; if the Handbook omits labels for every assessment, include them in the review draft with a warning. Retain the source URL, offering scope, and import snapshot. |
| PLOs | Development-only `DEV-BIT` seed data | These eight PLOs are mock data, not Monash-approved course outcomes. Replace them only after the teaching team supplies the official PLO list and source. |
| Gradebooks | Moodle UTF-8 CSV import; hashed workbook as development fixture | Upload one unit offering at a time. The server stores raw upload metadata, mappings, rows, review issues, and calculated results. Do not commit real student gradebooks or send student-level data to an external service. |

The supplied `Hashed MCS07.xlsx` is used to verify the importer design. It has
multiple redundant Moodle fields and assessed columns with different maximum
marks, so the application deliberately asks staff to select score columns and
their raw maximum marks. The runtime importer accepts Moodle CSV exports, not
the supplied workbook directly.
