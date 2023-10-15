from flask import Blueprint, render_template
from flask_login import login_required, current_user
from flask import redirect, url_for, flash
from .models import Subject, Offering, Course, Major
from flask import request, jsonify
from . import views
from collections import defaultdict
import json
from datetime import datetime
from . import db
from collections import deque

views = Blueprint('views', __name__)


@views.route('/')
def landing():
    return render_template("landing.html", user=current_user)


@views.route('/dashboard')
@login_required
def dashboard():
    if not current_user.is_email_verified:
        flash('Please verify your email before accessing the dashboard.', category='error')
        return redirect(url_for('auth.verify_email_instruction'))
    elif not current_user.profile.initial_setup_complete:
        flash('Please complete your profile before accessing the dashboard.', category='error')
        return redirect(url_for('auth.initial_setup'))

    profile = current_user.profile
    course = profile.course
    major = profile.major
    starting_session = profile.session
    starting_year = profile.year_of_commencement

    try:
        all_course_subjects = Subject.query.join(Subject.courses).filter(Course.id == course.id).all()
        subjects_by_session = {
            'both': [],
            'autumn': [],
            'spring': []
        }

        for subject in all_course_subjects:
            subject_info = {
                'code': subject.code,
                'name': subject.name,
                'type': get_subject_type(subject, course, major),
            }

            if subject.prerequisite_group:
                subject_info['prerequisites'] = [{'code': pre.code, 'name': pre.name} for pre in
                                                 subject.prerequisite_group.prerequisites]
                subject_info['prerequisites_json'] = json.dumps([pre.code for pre in
                                                                 subject.prerequisite_group.prerequisites])  # Convert prerequisites to JSON string
                subject_info['prerequisite_type'] = subject.prerequisite_group.prerequisite_type
            else:
                subject_info['prerequisites'] = []
                subject_info['prerequisites_json'] = json.dumps([])

            offerings = [offering.session for offering in subject.offerings]

            if 'Autumn' in offerings and 'Spring' in offerings:
                subjects_by_session['both'].append(subject_info)
            elif 'Autumn' in offerings:
                subjects_by_session['autumn'].append(subject_info)
            elif 'Spring' in offerings:
                subjects_by_session['spring'].append(subject_info)

    except Exception as e:
        print(f"Error fetching subjects: {e}")
        subjects_by_session = {'both': [], 'autumn': [], 'spring': []}
    # Fetching data for the dropdowns
    courses = Course.query.all()
    majors = Major.query.all()
    current_year = datetime.now().year
    years = range(current_year - 1, current_year + 1)

    # Include subjects CSIT998 and CSIT999 for selection in the dashboard
    capstone_subjects = Subject.query.filter(Subject.code.in_(['CSIT998', 'CSIT999'])).all()
    capstone_subjects_info = []
    for subject in capstone_subjects:
        subject_info = {
            'code': subject.code,
            'name': subject.name,
            'type': 'capstone',
        }
        capstone_subjects_info.append(subject_info)
    subjects_by_session['capstone'] = capstone_subjects_info

    return render_template(
        "dashboard.html",
        user=current_user,
        subjects_by_session=subjects_by_session,
        starting_session=starting_session,
        starting_year=starting_year,
        courses=courses,
        majors=majors,
        years=years
    )


def get_subject_type(subject, course, major):
    try:
        all_course_subjects = Subject.query.join(Subject.courses).filter(Course.id == course.id).all()

        core_subjects_by_session = {}
        for subj in all_course_subjects:
            if subj.is_core:
                for offering in subj.offerings:
                    core_subjects_by_session.setdefault(offering.session, []).append(subj)

        major_core_subjects = Subject.query.join(Subject.majors).filter(Major.id == major.id).all()

        elective_subjects = [subj for subj in all_course_subjects if subj not in core_subjects_by_session.get('Autumn',
                                                                                                              []) and subj not in core_subjects_by_session.get(
            'Spring', []) and subj not in major_core_subjects]

        if subject in core_subjects_by_session.get('Autumn', []) or subject in core_subjects_by_session.get('Spring',
                                                                                                            []):
            return 'core'
        elif subject in major_core_subjects:
            return 'major-core'
        elif subject in elective_subjects:
            return 'elective'
        else:
            return None  # or 'unknown'

    except Exception as e:
        print(f"Error determining subject type: {e}")
        return None  # or 'unknown'


@views.route('/reset_subject', methods=['POST'])
@login_required
def reset_subject():
    data = request.get_json()
    subject_code = data.get('subject_code')
    subject = Subject.query.filter_by(code=subject_code).first()

    if not subject:
        return jsonify(success=False, error="Subject not found")

    sessions = [offering.session for offering in subject.offerings]

    # Use the helper function to determine the subject type
    profile = current_user.profile
    course = profile.course
    major = profile.major
    subject_type = get_subject_type(subject, course, major)

    return jsonify(success=True, sessions=sessions, type=subject_type)


@views.route('/update-profile', methods=['POST'])
@login_required
def update_profile():
    course_id = request.form.get('course')
    major_id = request.form.get('major')
    year = request.form.get('year')
    session = request.form.get('session')

    current_user.profile.course_id = course_id
    current_user.profile.major_id = major_id
    current_user.profile.year_of_commencement = year
    current_user.profile.session = session

    db.session.commit()

    flash('Profile updated successfully!', 'success')
    return redirect(url_for('views.dashboard'))