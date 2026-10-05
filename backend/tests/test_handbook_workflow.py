"""Handbook reconciliation tests run only in the isolated workflow database."""
from decimal import Decimal
import json

import pytest
from fastapi import HTTPException
from app import main
from test_workflow_integration import db, fixture, insert, add_grades


def draft(db, fixture, *, description='Test', assessments=None):
    offering = fixture['offerings'][0]
    payload = {'unit_code': 'FIT9991', 'title': 'Test unit',
               'learning_outcomes': [{'code': 'ULO1', 'description': description, 'reference': 'ulo-1'}],
               'assessments': assessments if assessments is not None else [
                   {'name': 'Portfolio', 'weight': '100', 'is_hurdle': False, 'ulo_codes': ['ULO1']}]}
    snapshot = insert(db, "INSERT INTO handbook_import_snapshot(offering_id,source_url,payload) VALUES (%s,'https://handbook.monash.edu/test',%s)", (offering,json.dumps(payload)))
    return snapshot, payload


def confirm(db, fixture, snapshot, payload, mode='full', revision=None):
    offering = fixture['offerings'][0]
    review = main.review_handbook(payload, main._handbook_state(db.cursor(), offering))
    return main.confirm_handbook_import(offering, main.HandbookImportConfirmation(
        handbook_import_id=snapshot, review_revision=revision or review['revision'], application_mode=mode), fixture['user'])


def test_first_import_and_identical_reimport_preserve_ids_and_custom_contributions(db, fixture):
    assessments = [{'name': f'A{i}', 'weight': '50', 'is_hurdle': False, 'ulo_codes': ['ULO1']} for i in [1,2]]
    snapshot, payload = draft(db, fixture, assessments=assessments)
    confirm(db, fixture, snapshot, payload)
    before = db.execute('SELECT assessment_id FROM assessment ORDER BY assessment_id').fetchall()
    for row, contribution in zip(before,[Decimal(30), Decimal(70)]):
        db.execute('UPDATE assessment_ulo SET allocated_weight=%s WHERE assessment_id=%s',(contribution,row['assessment_id']))
    snapshot, payload = draft(db, fixture, assessments=assessments)
    confirm(db, fixture, snapshot, payload)
    assert db.execute('SELECT assessment_id FROM assessment ORDER BY assessment_id').fetchall() == before
    assert [r['allocated_weight'] for r in db.execute('SELECT allocated_weight FROM assessment_ulo ORDER BY assessment_id').fetchall()] == [Decimal(30),Decimal(70)]


def test_ulos_only_preserves_grade_assessment_and_mapping_ids_and_approved_report(db, fixture):
    ulo, assessments = add_grades(db, fixture)
    offering = fixture['offerings'][0]
    program = insert(db, "INSERT INTO program(program_code,program_name) VALUES ('TEST','Test')")
    plo = insert(db, "INSERT INTO plo(program_id,plo_code,description) VALUES (%s,'PLO1','Test')", (program,))
    db.execute('INSERT INTO offering_program VALUES (%s,%s)',(offering,program))
    mapping = insert(db, 'INSERT INTO ulo_plo_mapping(offering_id,offering_ulo_id,plo_id,confirmed_by) VALUES (%s,%s,%s,%s)',(offering,ulo,plo,fixture['user']['user_id']))
    db.execute("INSERT INTO ai_report(offering_id,status,evidence_snapshot) VALUES (%s,'approved','{}')",(offering,))
    grades = db.execute('SELECT grade_id,assessment_id,raw_mark,max_mark FROM student_grade ORDER BY grade_id').fetchall()
    snapshot, payload = draft(db, fixture, description='Test;')
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture, snapshot, payload)
    assert exc.value.status_code == 409
    confirm(db, fixture, snapshot, payload, 'ulos_only')
    assert db.execute('SELECT offering_ulo_id,ulo_code FROM offering_ulo').fetchone() == {'offering_ulo_id':ulo,'ulo_code':'ULO1'}
    assert db.execute('SELECT grade_id,assessment_id,raw_mark,max_mark FROM student_grade ORDER BY grade_id').fetchall() == grades
    assert db.execute('SELECT mapping_id,is_active FROM ulo_plo_mapping').fetchone() == {'mapping_id':mapping,'is_active':True}
    assert db.execute('SELECT status,evidence_stale FROM ai_report').fetchone() == {'status':'approved','evidence_stale':False}
    saved = db.execute('SELECT payload FROM handbook_import_snapshot WHERE handbook_import_id=%s',(snapshot,)).fetchone()['payload']
    assert saved['application']['mode'] == 'ulos_only'


def test_changed_graded_outcome_is_conflict_even_with_legacy_code(db, fixture):
    ulo, _ = add_grades(db, fixture)
    snapshot, payload = draft(db, fixture, description='Completely different outcome')
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture, snapshot, payload,'ulos_only')
    assert exc.value.status_code == 409
    assert db.execute('SELECT COUNT(*) AS n FROM offering_ulo').fetchone()['n'] == 1
    assert db.execute('SELECT ulo_code FROM offering_ulo').fetchone()['ulo_code'] == 'LO1'


def test_upload_preview_conflict_returns_409_and_preserves_assessment(db, fixture):
    offering = fixture['offerings'][0]
    assessment = insert(db, "INSERT INTO assessment(offering_id,assessment_name,weight,source) VALUES (%s,'Old',100,'handbook')",(offering,))
    batch = insert(db, "INSERT INTO grade_upload_batch(offering_id,uploaded_by,original_filename) VALUES (%s,%s,'audit.csv')",(offering,fixture['user']['user_id']))
    db.execute("INSERT INTO grade_upload_column_mapping(upload_batch_id,csv_column_name,system_field,assessment_id) VALUES (%s,'Old','raw_mark',%s)",(batch,assessment))
    snapshot, payload = draft(db, fixture)
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture, snapshot, payload)
    assert exc.value.status_code == 409
    assert db.execute('SELECT assessment_id FROM assessment').fetchone()['assessment_id'] == assessment


def test_unchanged_assessment_save_keeps_handbook_source(db, fixture):
    snapshot, payload = draft(db, fixture)
    confirm(db, fixture, snapshot, payload)
    assessment = db.execute('SELECT assessment_id FROM assessment').fetchone()['assessment_id']
    main.save_assessments(main.AssessmentsUpdate(offering_id=fixture['offerings'][0],assessments=[
        main.AssessmentRowInput(assessment_id=assessment,assessment_name='Portfolio',weight=100,ulo_codes=['ULO1'])]), fixture['user'])
    assert db.execute('SELECT source FROM assessment').fetchone()['source'] == 'handbook'
    snapshot, payload = draft(db, fixture)
    confirm(db, fixture, snapshot, payload)


def test_manual_assessment_conflict_does_not_roll_back_into_partial_changes(db, fixture):
    offering = fixture['offerings'][0]
    insert(db,"INSERT INTO assessment(offering_id,assessment_name,weight,source) VALUES (%s,'Portfolio',70,'manual')",(offering,))
    snapshot, payload = draft(db, fixture)
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture, snapshot, payload)
    assert exc.value.status_code == 409
    assert db.execute('SELECT COUNT(*) AS n FROM offering_ulo').fetchone()['n'] == 0
    assert db.execute('SELECT weight FROM assessment').fetchone()['weight'] == Decimal(70)


def test_stale_review_and_superseded_draft_cannot_apply(db, fixture):
    snapshot, payload = draft(db, fixture)
    review = main.review_handbook(payload, main._handbook_state(db.cursor(),fixture['offerings'][0]))
    db.execute("INSERT INTO offering_ulo(offering_id,ulo_code,description) VALUES (%s,'ULO2','Other')",(fixture['offerings'][0],))
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture, snapshot,payload, revision=review['revision'])
    assert 'changed after' in exc.value.detail
    draft(db, fixture)
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture, snapshot,payload)
    assert 'no longer current' in exc.value.detail


def test_programme_without_plos_keeps_ulo_table_and_no_demo_plo_substitution(db, fixture):
    offering = fixture['offerings'][0]
    program = db.execute("SELECT program_id FROM program WHERE program_code='BCS'").fetchone()['program_id']
    db.execute('INSERT INTO offering_program VALUES (%s,%s)',(offering,program))
    snapshot, payload = draft(db, fixture)
    confirm(db, fixture,snapshot,payload)
    result = main.mappings(fixture['user'],offering)
    assert result['handbook_confirmed'] is True
    assert result['ulos'][0]['ulo_code'] == 'ULO1'
    assert result['plos'] == []
    assert result['programs'][0]['plo_count'] == 0


def test_mapping_cannot_use_an_unlinked_programme(db, fixture):
    offering = fixture['offerings'][0]
    ulo = insert(db,"INSERT INTO offering_ulo(offering_id,ulo_code,description) VALUES (%s,'ULO1','Test')",(offering,))
    program = insert(db,"INSERT INTO program(program_code,program_name) VALUES ('TEST','Test')")
    plo = insert(db,"INSERT INTO plo(program_id,plo_code,description) VALUES (%s,'PLO1','Test')",(program,))
    with pytest.raises(HTTPException) as exc:
        main.save_mappings(main.MappingUpdate(offering_id=offering,mappings=[{'offering_ulo_id':ulo,'plo_id':plo}]),fixture['user'])
    assert exc.value.status_code == 422


def test_scope_change_requires_fetching_new_draft(db, fixture):
    snapshot, payload = draft(db, fixture)
    payload['offering_scope'] = {'period':'JUL', 'location':'Malaysia'}
    db.execute('UPDATE handbook_import_snapshot SET payload=%s WHERE handbook_import_id=%s',(json.dumps(payload),snapshot))
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture,snapshot,payload,'ulos_only')
    assert 'different unit' in exc.value.detail


def test_configured_components_cannot_be_removed_even_without_grades(db, fixture):
    offering = fixture['offerings'][0]
    assessment = insert(db,"INSERT INTO assessment(offering_id,assessment_name,weight,source) VALUES (%s,'Old',100,'handbook')",(offering,))
    db.execute("INSERT INTO assessment_component(assessment_id,component_name,weight) VALUES (%s,'Task',100)",(assessment,))
    snapshot, payload = draft(db, fixture)
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture,snapshot,payload)
    assert 'components cannot' in exc.value.detail
    assert db.execute('SELECT COUNT(*) AS n FROM assessment_component').fetchone()['n'] == 1


def test_two_aliases_cannot_overwrite_one_existing_outcome(db, fixture):
    offering = fixture['offerings'][0]
    db.execute("INSERT INTO offering_ulo(offering_id,ulo_code,description) VALUES (%s,'LO1','Test')",(offering,))
    snapshot, payload = draft(db, fixture)
    payload['learning_outcomes'].append({'code':'LO1','description':'Test'})
    db.execute('UPDATE handbook_import_snapshot SET payload=%s WHERE handbook_import_id=%s',(json.dumps(payload),snapshot))
    with pytest.raises(HTTPException) as exc:
        confirm(db, fixture,snapshot,payload,'ulos_only')
    assert 'same existing ULO' in exc.value.detail


def test_roster_links_registered_programmes_without_cloning_demo_plos(db, fixture):
    offering = fixture['offerings'][0]
    demo = insert(db,"INSERT INTO program(program_code,program_name) VALUES ('DEV-BIT','Demo')")
    insert(db,"INSERT INTO plo(program_id,plo_code,description) VALUES (%s,'PLO1','Demo only')",(demo,))
    db.execute('INSERT INTO offering_program VALUES (%s,%s)',(offering,demo))
    unit = {'unit_code':'FIT9991','programme_codes':['BCS','BCSDS','BSE'],'staffing':[]}
    main._apply_staffing_for_unit(db.cursor(), offering, unit, [])
    codes = {r['program_code'] for r in db.execute('SELECT p.program_code FROM offering_program op JOIN program p USING(program_id) WHERE offering_id=%s',(offering,)).fetchall()}
    assert codes == {'DEV-BIT','BCS','BCSDS','BSE'}
    assert db.execute('SELECT COUNT(*) AS n FROM plo WHERE program_id<>%s',(demo,)).fetchone()['n'] == 0


def test_duplicate_handbook_codes_are_rejected_before_draft_creation():
    from app.services.handbook import HandbookImportError, normalise_page_content
    with pytest.raises(HandbookImportError, match='duplicate learning'):
        normalise_page_content({'unit_code':'FIT2004','title':'Test','unit_learning_outcomes':[
            {'code':'ULO1','description':'First'}, {'code':'ULO1','description':'Different'}]})
