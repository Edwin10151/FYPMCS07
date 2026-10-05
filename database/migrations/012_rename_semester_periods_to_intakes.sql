-- Switches the semester period scheme from S1/S2 to the three real intake
-- months: FEB, JUL, OCT. February and July keep working with Handbook import
-- (they map onto Monash's real "First semester"/"Second semester" labels in
-- app/services/handbook.py and unit_coordinator.py); October has no matching
-- Handbook data, so Handbook import is simply unavailable for those units.
UPDATE semester SET period = 'FEB' WHERE period = 'S1';
UPDATE semester SET period = 'JUL' WHERE period = 'S2';
