# UOW-Course-Planner
The source code for the Course Planner website created for UOW.

# Course recommendation and Planning System

## Overview

This is a Flask-based web application that serves as a student dashboard. It provides functionalities such as email verification, course planning, and subject selection.

### Python Files

- `__init__.py`: Initializes the Flask application and brings together other components.
- `auth.py`: Contains routes and logic for authentication including login, sign-up, and email verification.
- `models.py`: Defines the SQLAlchemy database models.
- `views.py`: Contains the core logic of the application, including course planning and subject selection.

### CSS Files

- `dashboard.css`: Contains the styles specific to the Dashboard page.
- `email.css`: Contains the styles for the email templates.
- `landing.css`: Contains the styles for the Landing page.
- `setup.css`: Contains the styles for the Initial Setup page.
- `style.css`: General styling applicable to multiple pages.

### JavaScript Files

- `dragdrop.js`: Implements the drag-and-drop functionality for the subject selection.
- `major.js`: Contains JavaScript logic for major selection.

### HTML Templates

- `base.html`: The base template from which other HTML files inherit.
- `dashboard.html`: The template for the Dashboard page.
- `initial_setup.html`: The template for the Initial Setup page.
- `landing.html`: The template for the Landing page.
- `login.html`: The template for the Login page.
- `sign_up.html`: The template for the Sign-up page.
- `verify_email_instruction.html`: The template for the email verification instruction.

## Setup

1. Clone the repository: `git clone <repository_url>`
2. Navigate to the project folder: `cd <project_folder>`
3. Install the required packages: `pip install -r requirements.txt`
4. Run the application: `python3 main.py`

For more details, refer to the comments in individual files.

## How to Use (For End Users)
1. Navigate to the landing page (`http://127.0.0.1:5000/` by default).
2. If you are a new user, click on 'Sign Up' to register. If you are an existing user, click 'Login'.
3. After login, you will be redirected to the dashboard.
4. On the dashboard, you can:
   - Select your course and major from the dropdown menus.
   - Drag and drop subjects into different sessions (Autumn/Spring).
   - Get recommendations for subjects based on your major.
   - Check prerequisites for subjects.
5. **Profile Settings**: Located at the bottom of the dashboard, allows you to change your course, major, starting year, and session.
5. Your changes will be saved automatically.
