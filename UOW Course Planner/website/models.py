from datetime import datetime
from . import db
from sqlalchemy import Table, Column, Integer, ForeignKey, String, Boolean
from sqlalchemy.orm import relationship
import uuid
from flask_login import UserMixin

# Association Tables
student_subject_association = db.Table(
    'student_subject_association',
    db.Column('student_profile_id', db.Integer, db.ForeignKey('student_profile.id')),
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id'))
)

major_subject_association = db.Table(
    'major_subject_association',
    db.Column('major_id', db.Integer, db.ForeignKey('major.id')),
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id'))
)

group_subject_association = db.Table(
    'group_subject_association',
    db.Column('group_id', db.Integer, db.ForeignKey('group.id')),
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id'))
)

course_subject_association = db.Table(
    'course_subject_association',
    db.Column('course_id', db.Integer, db.ForeignKey('course.id')),
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id'))
)

subject_offering_association = db.Table(
    'subject_offering_association',
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id')),
    db.Column('offering_id', db.Integer, db.ForeignKey('offering.id'))
)


# Models
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))
    firstName = db.Column(db.String(150))
    is_email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(200), unique=True)
    profile = relationship("StudentProfile", uselist=False, back_populates="user")

    def generate_verification_token(self):
        self.email_verification_token = str(uuid.uuid4())


class StudentProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, ForeignKey('user.id'))
    course_id = db.Column(db.Integer, ForeignKey('course.id'))
    major_id = db.Column(db.Integer, ForeignKey('major.id'))
    year_of_commencement = db.Column(db.Integer)
    session = db.Column(db.String(50))
    initial_setup_complete = db.Column(db.Boolean, default=False)
    user = relationship("User", back_populates="profile")
    course = relationship("Course", back_populates="profiles")
    major = relationship("Major", back_populates="profiles")
    subjects = db.relationship("Subject", secondary=student_subject_association, overlaps="students")


class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True)
    profiles = relationship("StudentProfile", back_populates="course")
    majors = relationship("Major", back_populates="course")
    subjects = db.relationship("Subject", secondary=course_subject_association, back_populates="courses")


class Major(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150))
    course_id = db.Column(db.Integer, ForeignKey('course.id'))
    profiles = relationship("StudentProfile", back_populates="major")
    course = relationship("Course", back_populates="majors")
    major_subjects = db.relationship("Subject", secondary=major_subject_association, overlaps="majors")


class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True)
    name = db.Column(db.String(150))
    is_core = db.Column(db.Boolean)
    is_core_for_major = db.Column(db.Boolean)
    credit = db.Column(db.Integer)
    level = db.Column(db.String(20))  # "Graduate" or "Advanced Graduate"
    prerequisite_group_id = db.Column(db.Integer, ForeignKey('prerequisite_group.id'))
    students = db.relationship("StudentProfile", secondary=student_subject_association, overlaps="subjects")
    majors = db.relationship("Major", secondary=major_subject_association, overlaps="major_subjects")
    courses = db.relationship("Course", secondary=course_subject_association, back_populates="subjects")
    prerequisite_group = relationship("PrerequisiteGroup", back_populates="subject")
    groups = db.relationship("Group", secondary=group_subject_association, back_populates="subjects")
    offerings = db.relationship("Offering", secondary=subject_offering_association, back_populates="subjects")

class Offering(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session = db.Column(db.String(20))  # 'Autumn', 'Spring', etc.
    subjects = db.relationship("Subject", secondary=subject_offering_association, back_populates="offerings")


class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150))
    subjects = db.relationship("Subject", secondary=group_subject_association, back_populates="groups")


class PrerequisiteGroup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prerequisites = relationship("Subject", secondary="prerequisite_association")
    subject = relationship("Subject", uselist=False, back_populates="prerequisite_group")
    prerequisite_type = db.Column(db.String(20))


prerequisite_association = db.Table(
    'prerequisite_association',
    db.Column('prerequisite_group_id', db.Integer, db.ForeignKey('prerequisite_group.id')),
    db.Column('subject_id', db.Integer, db.ForeignKey('subject.id'))
)

