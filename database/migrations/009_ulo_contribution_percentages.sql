-- Normalise assessment_ulo.allocated_weight onto the contribution convention.
--
-- The column now means "the share of this assessment's marks that counts toward
-- this ULO", defaulting to an even split of 100% across the assessments that
-- cover that ULO. Attainment is then:
--     achieved  = sum(raw_mark x allocated_weight / 100)
--     available = sum(max_mark x allocated_weight / 100)
--
-- Two older conventions are being replaced, which is why the coverage editor
-- could claim a ULO should total 100% while showing 14.1%:
--   * Handbook imports stored assessment_weight / (ULOs that assessment covers)
--   * Manual saves stored 100 / (ULOs that assessment covers)
-- Both divided per assessment across its ULOs. The split now runs the other way,
-- per ULO across its assessments, so each ULO adds up to 100.
--
-- Every existing row is recalculated, because no stored value can be read under
-- the new meaning. Any contribution a coordinator hand-tuned under the old
-- convention is reset to the default and will need setting again -- unavoidable,
-- since the numbers no longer mean what they meant when they were entered.

WITH per_ulo AS (
    SELECT
        offering_ulo_id,
        COUNT(*)                                  AS covering_assessments,
        ROUND(100.0 / COUNT(*), 2)                AS even_share,
        MAX(assessment_id)                        AS last_assessment_id
    FROM assessment_ulo
    GROUP BY offering_ulo_id
)
UPDATE assessment_ulo au
SET allocated_weight = p.even_share
    -- Rounding lands on one assessment per ULO so the ULO totals exactly 100.00
    -- rather than 99.99 for a three-way split.
    + CASE
        WHEN au.assessment_id = p.last_assessment_id
        THEN 100.00 - (p.even_share * p.covering_assessments)
        ELSE 0
      END
FROM per_ulo p
WHERE p.offering_ulo_id = au.offering_ulo_id;
