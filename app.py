from flask import Flask, render_template, request, jsonify, session, send_from_directory
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

# --- 2. DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    joined_date = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(255), nullable=False, default='password')
    specialty = db.Column(db.String(150), nullable=True, default='Maxillofacial Surgeon')
    clinic_name = db.Column(db.String(150), nullable=True, default='City Dental & Surgical Center')
    license_number = db.Column(db.String(100), nullable=True, default='REG-8849201')
    avatar_filename = db.Column(db.String(255), nullable=True, default='default_avatar.png')

class PatientHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.String(50), nullable=False)
    patient_name = db.Column(db.String(150), nullable=False)
    date = db.Column(db.String(50), nullable=False)
    age = db.Column(db.Integer, nullable=False)
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
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    user = User.query.filter((User.email == username) | (User.name == username)).first()
    
    # Fallback default admin user initialization
    if not user and (username == 'admin' or username == 'admin@clinicalportal.com'):
        user = User.query.filter_by(email='admin@clinicalportal.com').first()
        if not user:
            user = User(
                email='admin@clinicalportal.com',
                name='System Administrator',
                password='password',
                joined_date=datetime.now().strftime("%Y-%m-%d"),
                specialty='Maxillofacial Surgeon',
                clinic_name='City Dental & Surgical Center',
                license_number='REG-8849201'
            )
            db.session.add(user)
            db.session.commit()

    if user and (user.password == password or (password == 'password' and username == 'admin')):
        session['user_id'] = user.id
        session['user_name'] = user.name
        session['user_email'] = user.email
        session['joined_date'] = user.joined_date

        return jsonify({"status": "success", "message": "Authenticated successfully."})

    return jsonify({"status": "error", "message": "Invalid username or password."}), 401

@app.route('/auth/google', methods=['POST'])
def google_auth():
    data = request.json or {}
    email = data.get('email', '').strip()
    name = data.get('name', '').strip()

    if not email or not name:
        return jsonify({"status": "error", "message": "Email and name are required."}), 400

    user = User.query.filter_by(email=email).first()
    
    if not user:
        user = User(
            email=email, 
            name=name, 
            password='google_authenticated',
            joined_date=datetime.now().strftime("%Y-%m-%d"),
            specialty='Dental Practitioner',
            clinic_name='Medical Center',
            license_number='REG-PENDING'
        )
        db.session.add(user)
        db.session.commit()

    session['user_id'] = user.id
    session['user_name'] = user.name
    session['user_email'] = user.email
    session['joined_date'] = user.joined_date

    return jsonify({"status": "success", "message": "Google authentication verified."})

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

        # Check if request contains json or multipart form data
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
        gender = 0 if data.get('gender') == 'Male' else 1
        
        smoke_map = {'Non-smoker': 0, 'Former': 1, 'Active': 2}
        smoking = smoke_map.get(data.get('smoking_status'), 0)
        
        diabetes = 1 if data.get('diabetes') == 'yes' else 0
        perio = 1 if data.get('history_periodontitis') == 'yes' else 0
        bruxism = 1 if data.get('bruxism') == 'yes' else 0
        
        hygiene_map = {'Good': 0, 'Fair': 1, 'Poor': 2}
        hygiene = hygiene_map.get(data.get('oral_hygiene'), 0)
        
        bone_map = {'Type 1': 1, 'Type 2': 2, 'Type 3': 3, 'Type 4': 4}
        bone = bone_map.get(data.get('bone_quality'), 2)
        
        jaw = 0 if data.get('jaw_location') == 'Maxilla' else 1
        length = float(data.get('implant_length_mm', 10.0))
        diameter = float(data.get('implant_diameter_mm', 4.0))
        surface = 0 if data.get('implant_surface') == 'Machined' else 1

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

        # 4. Save to Database
        new_record = PatientHistory(
            patient_id=patient_id,
            patient_name=patient_name,
            date=datetime.now().strftime("%Y-%m-%d %H:%M"),
            age=age,
            score=final_score
        )
        db.session.add(new_record)
        db.session.commit()

        return jsonify({'status': 'success', 'survival_probability': final_score, 'explanations': explanations})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 400

@app.route('/get_history', methods=['GET'])
@login_required
def get_history():
    records = PatientHistory.query.all()
    history_data = []
    for record in records:
        history_data.append({
            "id": record.id,
            "patient_name": record.patient_name,
            "date": record.date,
            "age": record.age,
            "score": record.score
        })
    return jsonify(history_data)

@app.route('/delete_history/<int:record_id>', methods=['DELETE'])
@login_required
def delete_history(record_id):
    try:
        record = db.session.get(PatientHistory, record_id)
        if record:
            db.session.delete(record)
            db.session.commit() 
            return jsonify({'status': 'success', 'message': 'Record successfully deleted.'})
        return jsonify({'status': 'error', 'message': 'Record not found.'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Failed to delete record.'}), 400

if __name__ == '__main__':
    app.run(debug=True)