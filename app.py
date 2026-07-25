from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import joblib
import numpy as np
import warnings
from functools import wraps
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# --- 1. ENVIRONMENT & APPLICATION CONFIGURATION ---
load_dotenv("API.env")

app = Flask(__name__)

# Fetch database configuration safely
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///fallback_local.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.environ.get('SECRET_KEY', 'clinical_implant_predictor_secret_key_2026')

# Profile picture uploads folder setup
UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

db = SQLAlchemy(app)

# --- FIREBASE ADMIN & FIRESTORE CLOUD DATABASE INITIALIZATION ---
import firebase_admin
from firebase_admin import credentials, firestore

firebase_db = None
try:
    if not firebase_admin._apps:
        cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', 'firebase_key.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
        print("🔥 Firebase Admin SDK initialized successfully!")
    firebase_db = firestore.client()
except Exception as e:
    print(f" Warning: Firebase Admin initialization: {e}")

# --- 2. DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(150), unique=True, nullable=True)
    name = db.Column(db.String(150), nullable=False)
    joined_date = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(255), nullable=False, default='password')
    is_registered = db.Column(db.Boolean, default=True)
    specialty = db.Column(db.String(150), nullable=True, default='Maxillofacial Surgeon')
    clinic_name = db.Column(db.String(150), nullable=True, default='City Dental & Surgical Center')
    license_number = db.Column(db.String(100), nullable=True, default='REG-8849201')
    avatar_filename = db.Column(db.String(255), nullable=True, default='default_avatar.png')

class PatientHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    patient_id = db.Column(db.String(50), nullable=False)
    patient_name = db.Column(db.String(150), nullable=False)
    date = db.Column(db.String(50), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(20), nullable=True, default='Male')
    smoking_status = db.Column(db.String(50), nullable=True, default='Non-smoker')
    diabetes = db.Column(db.String(10), nullable=True, default='no')
    history_periodontitis = db.Column(db.String(10), nullable=True, default='no')
    bruxism = db.Column(db.String(10), nullable=True, default='no')
    oral_hygiene = db.Column(db.String(50), nullable=True, default='Good')
    bone_quality = db.Column(db.String(50), nullable=True, default='Type 2')
    jaw_location = db.Column(db.String(50), nullable=True, default='Maxilla')
    implant_length_mm = db.Column(db.Float, nullable=True, default=10.0)
    implant_diameter_mm = db.Column(db.Float, nullable=True, default=4.0)
    implant_surface = db.Column(db.String(50), nullable=True, default='Roughened')
    score = db.Column(db.Float, nullable=False)

with app.app_context():
    db.create_all()

# --- 3. AUTHENTICATION DECORATOR ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"status": "error", "message": "Unauthorized access. Please log in first."}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- 4. MACHINE LEARNING MODEL & SHAP EXPLAINER ---
import shap

try:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        ml_model = joblib.load('implant_model.pkl')
        print(" ML Model loaded successfully!")
        explainer = shap.TreeExplainer(ml_model)
except Exception as e:
    print(f" Warning: Could not load ML model: {e}")
    ml_model = None
    explainer = None

# --- 5. ROUTES ---

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    user_input = data.get('username', '').strip()
    password = data.get('password', '').strip()

    user = User.query.filter((User.username == user_input) | (User.email == user_input)).first()
    
    # Fallback default admin user initialization
    if not user and (user_input == 'admin' or user_input == 'admin@clinicalportal.com'):
        user = User(
            email='admin@clinicalportal.com',
            username='admin',
            name='System Administrator',
            password='password',
            joined_date=datetime.now().strftime("%Y-%m-%d"),
            is_registered=True,
            specialty='Maxillofacial Surgeon',
            clinic_name='City Dental & Surgical Center',
            license_number='REG-8849201'
        )
        db.session.add(user)
        db.session.commit()

    if user and (user.password == password or (password == 'password' and user_input == 'admin')):
        session['user_id'] = user.id
        session['user_name'] = user.name
        session['user_email'] = user.email
        session['user_username'] = user.username or user.email
        session['joined_date'] = user.joined_date

        return jsonify({"status": "success", "message": "Authenticated successfully."})

    return jsonify({"status": "error", "message": "Invalid username/email or password."}), 401

@app.route('/auth/google', methods=['POST'])
def google_auth():
    data = request.json or {}
    email = data.get('email', '').strip()
    name = data.get('name', '').strip()

    if not email:
        return jsonify({"status": "error", "message": "Email is required."}), 400

    user = User.query.filter_by(email=email).first()
    
    if not user:
        user = User(
            email=email, 
            name=name or 'Doctor User', 
            password='google_temp_password',
            joined_date=datetime.now().strftime("%Y-%m-%d"),
            is_registered=False,
            specialty='Dental Practitioner',
            clinic_name='Medical Center',
            license_number='REG-PENDING'
        )
        db.session.add(user)
        db.session.commit()

    # Sync User profile to Firebase Firestore Cloud Database
    if firebase_db:
        try:
            firebase_db.collection('users').document(str(user.id)).set({
                "email": user.email,
                "name": user.name,
                "username": user.username,
                "is_registered": user.is_registered,
                "specialty": user.specialty,
                "clinic_name": user.clinic_name,
                "license_number": user.license_number,
                "updated_at": firestore.SERVER_TIMESTAMP
            }, merge=True)
        except Exception as fe:
            print(f"Firebase user sync warning: {fe}")

    # Check if user needs username/password setup
    if not user.is_registered or not user.username:
        return jsonify({
            "status": "setup_required",
            "message": "First time Google login. Please set up your Username and Password.",
            "email": user.email,
            "name": user.name
        })

    session['user_id'] = user.id
    session['user_name'] = user.name
    session['user_email'] = user.email
    session['user_username'] = user.username
    session['joined_date'] = user.joined_date

    return jsonify({"status": "success", "message": "Google authentication verified."})

@app.route('/auth/complete_setup', methods=['POST'])
def complete_setup():
    data = request.json or {}
    email = data.get('email', '').strip()
    desired_username = data.get('username', '').strip()
    desired_password = data.get('password', '').strip()
    full_name = data.get('name', '').strip()

    if not email or not desired_username or not desired_password:
        return jsonify({"status": "error", "message": "All setup fields are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"status": "error", "message": "User record not found for email."}), 404

    # Check if username is taken by another account
    existing_username = User.query.filter(User.username == desired_username, User.id != user.id).first()
    if existing_username:
        return jsonify({"status": "error", "message": "Username is already taken. Please choose another."}), 400

    user.username = desired_username
    user.password = desired_password
    if full_name:
        user.name = full_name
    user.is_registered = True
    db.session.commit()

    if firebase_db:
        try:
            firebase_db.collection('users').document(str(user.id)).set({
                "email": user.email,
                "name": user.name,
                "username": user.username,
                "is_registered": True,
                "updated_at": firestore.SERVER_TIMESTAMP
            }, merge=True)
        except Exception as fe:
            print(f"Firebase setup sync warning: {fe}")

    session['user_id'] = user.id
    session['user_name'] = user.name
    session['user_email'] = user.email
    session['user_username'] = user.username
    session['joined_date'] = user.joined_date

    return jsonify({"status": "success", "message": "Account setup complete! You are now logged in."})

@app.route('/auth/forgot_password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = data.get('email', '').strip()
    new_password = data.get('new_password', '').strip()
    confirm_password = data.get('confirm_password', '').strip()

    if not email or not new_password or not confirm_password:
        return jsonify({"status": "error", "message": "Email and new password fields are required."}), 400

    if new_password != confirm_password:
        return jsonify({"status": "error", "message": "New password and confirmation do not match."}), 400

    if len(new_password) < 6:
        return jsonify({"status": "error", "message": "Password must be at least 6 characters long."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"status": "error", "message": "No account found with that email address."}), 404

    user.password = new_password
    user.is_registered = True
    db.session.commit()

    return jsonify({"status": "success", "message": "Password reset successfully! You can now log in."})

@app.route('/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out successfully."})

@app.route('/get_profile', methods=['GET'])
@login_required
def get_profile():
    user = db.session.get(User, session.get('user_id'))
    if not user:
        return jsonify({
            "status": "success",
            "name": session.get('user_name', 'Practitioner'),
            "email": session.get('user_email', 'doctor@clinic.com'),
            "username": session.get('user_username', 'doctor'),
            "joined": session.get('joined_date', '2026-01-01'),
            "specialty": "Maxillofacial Surgeon",
            "clinic_name": "City Dental & Surgical Center",
            "license_number": "REG-8849201",
            "avatar_url": None
        })

    avatar_url = f"/static/uploads/{user.avatar_filename}" if user.avatar_filename and user.avatar_filename != 'default_avatar.png' else None

    return jsonify({
        "status": "success",
        "name": user.name,
        "email": user.email,
        "username": user.username or user.email,
        "joined": user.joined_date,
        "specialty": user.specialty or "Maxillofacial Surgeon",
        "clinic_name": user.clinic_name or "City Dental & Surgical Center",
        "license_number": user.license_number or "REG-8849201",
        "avatar_url": avatar_url
    })

@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    try:
        user_id = session.get('user_id')
        user = db.session.get(User, user_id)

        if not user:
            return jsonify({"status": "error", "message": "User record not found."}), 404

        if request.content_type and 'multipart/form-data' in request.content_type:
            new_name = request.form.get('name', '').strip()
            new_email = request.form.get('email', '').strip()
            new_specialty = request.form.get('specialty', '').strip()
            new_clinic = request.form.get('clinic_name', '').strip()
            new_license = request.form.get('license_number', '').strip()

            if 'avatar' in request.files:
                file = request.files['avatar']
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = f"user_{user_id}_{secure_filename(file.filename)}"
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    user.avatar_filename = filename
        else:
            data = request.json or {}
            new_name = data.get('name', '').strip()
            new_email = data.get('email', '').strip()
            new_specialty = data.get('specialty', '').strip()
            new_clinic = data.get('clinic_name', '').strip()
            new_license = data.get('license_number', '').strip()

        if not new_name or not new_email:
            return jsonify({"status": "error", "message": "Name and email are required."}), 400

        # Check email uniqueness
        existing_user = User.query.filter(User.email == new_email, User.id != user_id).first()
        if existing_user:
            return jsonify({"status": "error", "message": "Email address is already in use by another account."}), 400

        user.name = new_name
        user.email = new_email
        if new_specialty: user.specialty = new_specialty
        if new_clinic: user.clinic_name = new_clinic
        if new_license: user.license_number = new_license

        db.session.commit()

        session['user_name'] = new_name
        session['user_email'] = new_email

        avatar_url = f"/static/uploads/{user.avatar_filename}" if user.avatar_filename and user.avatar_filename != 'default_avatar.png' else None

        return jsonify({
            "status": "success", 
            "message": "Profile updated successfully.",
            "name": user.name,
            "email": user.email,
            "username": user.username or user.email,
            "specialty": user.specialty,
            "clinic_name": user.clinic_name,
            "license_number": user.license_number,
            "avatar_url": avatar_url
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/change_password', methods=['POST'])
@login_required
def change_password():
    try:
        data = request.json or {}
        current_pw = data.get('current_password', '').strip()
        new_pw = data.get('new_password', '').strip()
        confirm_pw = data.get('confirm_password', '').strip()

        if not current_pw or not new_pw or not confirm_pw:
            return jsonify({"status": "error", "message": "All password fields are required."}), 400

        if new_pw != confirm_pw:
            return jsonify({"status": "error", "message": "New password and confirmation do not match."}), 400

        if len(new_pw) < 6:
            return jsonify({"status": "error", "message": "New password must be at least 6 characters long."}), 400

        user_id = session.get('user_id')
        user = db.session.get(User, user_id)

        if not user:
            return jsonify({"status": "error", "message": "User account not found."}), 404

        if user.password != current_pw:
            return jsonify({"status": "error", "message": "Incorrect current password."}), 400

        user.password = new_pw
        db.session.commit()

        return jsonify({"status": "success", "message": "Password changed successfully!"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/predict', methods=['POST'])
@login_required
def predict():
    try:
        data = request.json or {}
        
        # 1. Extract raw data
        patient_name = data.get('patientName', 'Unknown')
        patient_id = data.get('patientId', 'N/A')
        
        # 2. Extract and format clinical variables
        age = int(data.get('age', 50))
        gender_raw = data.get('gender', 'Male')
        gender = 0 if gender_raw == 'Male' else 1
        
        smoking_status = data.get('smoking_status', 'Non-smoker')
        smoke_map = {'Non-smoker': 0, 'Former': 1, 'Active': 2}
        smoking = smoke_map.get(smoking_status, 0)
        
        diabetes_raw = data.get('diabetes', 'no')
        diabetes = 1 if diabetes_raw == 'yes' else 0

        perio_raw = data.get('history_periodontitis', 'no')
        perio = 1 if perio_raw == 'yes' else 0

        bruxism_raw = data.get('bruxism', 'no')
        bruxism = 1 if bruxism_raw == 'yes' else 0
        
        hygiene_status = data.get('oral_hygiene', 'Good')
        hygiene_map = {'Good': 0, 'Fair': 1, 'Poor': 2}
        hygiene = hygiene_map.get(hygiene_status, 0)
        
        bone_quality_status = data.get('bone_quality', 'Type 2')
        bone_map = {'Type 1': 1, 'Type 2': 2, 'Type 3': 3, 'Type 4': 4}
        bone = bone_map.get(bone_quality_status, 2)
        
        jaw_location_status = data.get('jaw_location', 'Maxilla')
        jaw = 0 if jaw_location_status == 'Maxilla' else 1

        length = float(data.get('implant_length_mm', 10.0))
        diameter = float(data.get('implant_diameter_mm', 4.0))
        surface_status = data.get('implant_surface', 'Roughened')
        surface = 0 if surface_status == 'Machined' else 1

        # 3. Features matrix for prediction
        features = np.array([[age, gender, smoking, diabetes, perio, bruxism, hygiene, bone, jaw, length, diameter, surface]])

        if ml_model and explainer:
            probabilities = ml_model.predict_proba(features)
            survival_probability = probabilities[0][1].item() * 100 
            
            # --- SHAP EXPLAINABILITY ---
            feature_names = ["Age", "Gender", "Smoking", "Diabetes", "Periodontitis", "Bruxism", "Hygiene", "Bone Quality", "Jaw", "Length", "Diameter", "Surface"]
            shap_vals = explainer.shap_values(features)

            if isinstance(shap_vals, list):
                patient_shap = shap_vals[1][0]
            elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
                patient_shap = shap_vals[0, :, 1]
            elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 2:
                patient_shap = shap_vals[0]
            else:
                patient_shap = np.zeros(len(feature_names))
            
            explanations = []
            for name, val in zip(feature_names, patient_shap):
                impact = round(float(val) * 100, 1) 
                if impact != 0:
                    explanations.append({"factor": name, "impact": impact})
                    
            explanations.sort(key=lambda x: abs(x['impact']), reverse=True)
        else:
            survival_probability = 50.0 
            explanations = []

        final_score = round(survival_probability, 1)

        # 4. Save to Database linked to current logged-in user with FULL clinical parameters
        user_id = session.get('user_id')
        new_record = PatientHistory(
            user_id=user_id,
            patient_id=patient_id,
            patient_name=patient_name,
            date=datetime.now().strftime("%Y-%m-%d %H:%M"),
            age=age,
            gender=gender_raw,
            smoking_status=smoking_status,
            diabetes=diabetes_raw,
            history_periodontitis=perio_raw,
            bruxism=bruxism_raw,
            oral_hygiene=hygiene_status,
            bone_quality=bone_quality_status,
            jaw_location=jaw_location_status,
            implant_length_mm=length,
            implant_diameter_mm=diameter,
            implant_surface=surface_status,
            score=final_score
        )
        db.session.add(new_record)
        db.session.commit()

        # 5. Sync Record to Firebase Firestore Cloud Database
        if firebase_db:
            try:
                firebase_db.collection('patient_history').add({
                    "user_id": str(user_id),
                    "user_email": session.get('user_email', ''),
                    "patient_id": patient_id,
                    "patient_name": patient_name,
                    "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "age": age,
                    "gender": gender_raw,
                    "smoking_status": smoking_status,
                    "diabetes": diabetes_raw,
                    "history_periodontitis": perio_raw,
                    "bruxism": bruxism_raw,
                    "oral_hygiene": hygiene_status,
                    "bone_quality": bone_quality_status,
                    "jaw_location": jaw_location_status,
                    "implant_length_mm": length,
                    "implant_diameter_mm": diameter,
                    "implant_surface": surface_status,
                    "score": final_score,
                    "created_at": firestore.SERVER_TIMESTAMP
                })
                print("✅ Patient evaluation record synced to Firebase Firestore!")
            except Exception as fe:
                print(f"Firebase Firestore sync warning: {fe}")

        return jsonify({'status': 'success', 'survival_probability': final_score, 'explanations': explanations})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/get_history', methods=['GET'])
@login_required
def get_history():
    user_id = session.get('user_id')
    records = PatientHistory.query.filter((PatientHistory.user_id == user_id) | (PatientHistory.user_id == None)).all()
    history_data = []
    for record in records:
        history_data.append({
            "id": record.id,
            "patient_id": record.patient_id or "N/A",
            "patient_name": record.patient_name,
            "date": record.date,
            "age": record.age,
            "gender": record.gender or "Male",
            "smoking_status": record.smoking_status or "Non-smoker",
            "diabetes": record.diabetes or "no",
            "history_periodontitis": record.history_periodontitis or "no",
            "bruxism": record.bruxism or "no",
            "oral_hygiene": record.oral_hygiene or "Good",
            "bone_quality": record.bone_quality or "Type 2",
            "jaw_location": record.jaw_location or "Maxilla",
            "implant_length_mm": record.implant_length_mm or 10.0,
            "implant_diameter_mm": record.implant_diameter_mm or 4.0,
            "implant_surface": record.implant_surface or "Roughened",
            "score": record.score
        })
    return jsonify(history_data)

@app.route('/delete_history/<int:record_id>', methods=['DELETE'])
@login_required
def delete_history(record_id):
    try:
        user_id = session.get('user_id')
        record = db.session.get(PatientHistory, record_id)
        if record:
            if record.user_id and record.user_id != user_id:
                return jsonify({'status': 'error', 'message': 'Unauthorized to delete this record.'}), 403
            db.session.delete(record)
            db.session.commit() 
            return jsonify({'status': 'success', 'message': 'Record successfully deleted.'})
        return jsonify({'status': 'error', 'message': 'Record not found.'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Failed to delete record.'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)