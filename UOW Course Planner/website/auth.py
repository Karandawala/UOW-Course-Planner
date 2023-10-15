from flask import Blueprint, render_template, request, flash, redirect, url_for
from .models import User, StudentProfile, Course, Major
from werkzeug.security import generate_password_hash, check_password_hash
from . import db
from flask_login import login_user, login_required, logout_user, current_user
from datetime import datetime
from flask_mail import Message
from . import mail

auth = Blueprint('auth', __name__)


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        if not email:
            flash('Email is required', category='error')
        elif not password:
            flash('Password is required', category='error')
        else:
            user = User.query.filter_by(email=email).first()
            if user:
                if check_password_hash(user.password, password):
                    if not user.is_email_verified:  # check if email is verified
                        flash('Please verify your email first!', category='error')
                        return redirect(url_for('auth.verify_email_instruction'))
                    login_user(user, remember=True)
                    if not current_user.profile.initial_setup_complete:
                        return redirect(url_for('auth.initial_setup'))
                    return redirect(url_for('views.dashboard'))
                else:
                    flash('Password is incorrect', category='error')
            else:
                flash('Account does not exist', category='error')
    return render_template("login.html", user=current_user)


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out successfully!', category='success')
    return redirect(url_for('views.landing'))


@auth.route('/sign-up', methods=['GET', 'POST'])
def sign_up():
    if request.method == 'POST':
        email = request.form.get('email')
        firstName = request.form.get('firstName')
        password1 = request.form.get('password1')
        password2 = request.form.get('password2')

        user = User.query.filter_by(email=email).first()

        if user:
            flash('Email exist', category='error')
        elif not email.endswith('@uowmail.edu.au'):
            flash('Please enter a valid UOW email address.', category='error')
        elif len(firstName) < 2:
            flash('First name cannot be empty.', category='error')
        elif len(password1) < 8:
            flash('Password must be at least 8 characters long.', category='error')
        elif password1 != password2:
            flash('Passwords don\'t match.', category='error')
        elif not any(char.isupper() for char in password1):
            flash('Password must contain at least one uppercase letter.', category='error')
        else:
            new_user = User(email=email, firstName=firstName,
                            password=generate_password_hash(password1, method='scrypt'))

            # generate verification token for the new user
            new_user.generate_verification_token()

            db.session.add(new_user)
            db.session.flush()  # create new user ID

            # Create a new StudentProfile linked to the new User
            new_profile = StudentProfile(user_id=new_user.id)
            db.session.add(new_profile)
            db.session.commit()

            # Construct the verification link
            verification_link = url_for('auth.verify_email', token=new_user.email_verification_token, _external=True)

            # Send the verification email
            msg = Message('Verify your email', sender='noreply@example.com', recipients=[new_user.email])
            msg.body = f'Click the link to verify your email: {verification_link}'
            mail.send(msg)

            login_user(new_user, remember=True)
            flash('Account created. Please verify your email.', category='success')
            return redirect(url_for('auth.verify_email_instruction'))

    return render_template("sign_up.html", user=current_user)


@auth.route('/initial-setup', methods=['GET', 'POST'])
@login_required  # Make sure the user is logged in
def initial_setup():
    current_year = datetime.now().year
    years = [current_year - 1, current_year, current_year + 1]
    courses = Course.query.all()
    majors = Major.query.all()

    if request.method == 'POST':
        selected_course_id = request.form.get('course')
        selected_major_id = request.form.get('major')
        selected_year = request.form.get('year')
        selected_session = request.form.get('session')

        # Fetch the StudentProfile using the current_user
        profile = StudentProfile.query.filter_by(user_id=current_user.id).first()

        # Update the StudentProfile
        profile.course_id = selected_course_id
        profile.major_id = selected_major_id if selected_major_id else None  # Major is optional
        profile.year_of_commencement = selected_year
        profile.session = selected_session
        profile.initial_setup_complete = True  # Mark the initial setup as complete

        # Commit changes to the database
        db.session.commit()

        flash('Your profile has been set up successfully!', category='success')
        return redirect(url_for('views.dashboard'))

    return render_template('initial_setup.html', user=current_user, courses=courses, majors=majors, years=years)


@auth.route('/update-setup', methods=['GET', 'POST'])
@login_required
def update_setup():
    current_year = datetime.now().year
    years = [current_year - 1, current_year, current_year + 1]
    courses = Course.query.all()
    majors = Major.query.all()

    if request.method == 'POST':
        course_id = request.form.get('course_id')
        major_id = request.form.get('major_id')
        year_of_commencement = request.form.get('year_of_commencement')
        session = request.form.get('session')

        profile = current_user.profile  # Access the existing StudentProfile

        # Update the profile details
        profile.course_id = course_id
        profile.major_id = major_id
        profile.year_of_commencement = year_of_commencement
        profile.session = session

        # Commit changes to database
        db.session.commit()

        flash('Profile updated successfully.', category='success')
        return redirect(url_for('views.dashboard'))

    return render_template('update_setup.html', courses=courses, majors=majors, user=current_user, years=years)


@auth.route('/verify_email_instruction', methods=['GET'])
@login_required
def verify_email_instruction():
    if current_user.is_email_verified:
        if not current_user.profile.initial_setup_complete:
            return redirect(url_for('auth.initial_setup'))
        return redirect(url_for('views.dashboard'))
    return render_template('verify_email_instruction.html', user=current_user)


@auth.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    user = User.query.filter_by(email_verification_token=token).first()
    if user:
        user.is_email_verified = True
        db.session.commit()
        flash('Email verified successfully', category='success')
        return redirect(url_for('views.dashboard'))
    else:
        flash('Invalid verification link', category='error')
        return redirect(url_for('auth.sign_up'))

