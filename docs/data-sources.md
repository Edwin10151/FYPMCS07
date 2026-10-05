# Development Data Sources

| Data | Current source | Rule |
|---|---|---|
| Unit ULOs and assessments | Public [Monash Handbook](https://handbook.monash.edu/2026/units/FIT3161?year=2026) | Import the selected Malaysia FEB/JUL offering (Handbook First/Second semester) as a draft and require coordinator confirmation. OCT requires manual setup. Rows with published labels are strictly filtered to that offering; if the Handbook omits labels for every assessment, include them in the review draft with a warning. Retain the source URL, offering scope, and import snapshot. |
| PLOs | Development-only `DEV-BIT` seed data | These eight PLOs are mock data, not Monash-approved course outcomes. Replace them only after the teaching team supplies the official PLO list and source. |
| Gradebooks | Moodle UTF-8 CSV import; hashed workbook as development fixture | Upload one unit offering at a time. The server stores raw upload metadata, mappings, rows, review issues, and calculated results. Do not commit real student gradebooks or send student-level data to an external service. |

The supplied `Hashed MCS07.xlsx` is used to verify the importer design. It has
multiple redundant Moodle fields and assessed columns with different maximum
marks, so the application deliberately asks staff to select score columns and
their raw maximum marks. The runtime importer accepts Moodle CSV exports, not
the supplied workbook directly.

Handbook review compares the draft with the current offering before confirmation.
Equivalent LO/ULO labels reuse the same outcome ID; cosmetic terminal punctuation
does not change an outcome's meaning. Changed definitions require review, and a
semantic change to a graded outcome cannot be applied through import. Existing
outcomes missing from the draft are retained and identified for coordinator review.

Choose **ULOs only** to preserve all assessment records, grades, contribution
percentages and equivalent ULO/PLO links. The snapshot records which mode was
applied; confirming this mode does not mean its assessment preview was applied.
Full application updates matching assessments in place, preserves raw mark
scales and unchanged contributions, and blocks structural changes while grades,
upload previews or reviewed assessment components would be affected. A changed
outcome definition invalidates its PLO links for review. Superseded drafts and
reviews of changed offering data cannot be confirmed.

BCS, BCSDS, BSE, BCS (HONS), MAI, MBIS and MDS are registered as labels from the
supplied Tutor List. Roster import can link them to an offering without supplying
PLO definitions. The mapping page shows those definitions as pending; it never
substitutes DEV-BIT outcomes for them. DEV-BIT remains a separate demo programme.
