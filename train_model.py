import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score

print("Loading clinical data from CSV...")

# 1. Load the dataset 
df = pd.read_csv('train.csv.csv')

# 2. Clean and Format Data
print("Formatting clinical categories...")

mapping_dict = {
    'gender': {'Male': 0, 'Female': 1, 'M': 0, 'F': 1},
    'smoking_status': {'Non-smoker': 0, 'Former': 1, 'Active': 2, 'Heavy': 2, 'Light': 1, 'Moderate': 1},
    'diabetes': {'No': 0, 'Yes': 1, 'no': 0, 'yes': 1},
    'history_periodontitis': {'No': 0, 'Yes': 1, 'no': 0, 'yes': 1},
    'bruxism': {'No': 0, 'Yes': 1, 'no': 0, 'yes': 1, 'Heavy': 1, 'Moderate': 1, 'Mild': 1},
    'oral_hygiene': {'Good': 0, 'Fair': 1, 'Poor': 2, 'Excellent': 0},
    'bone_quality': {
        'Type 1': 1, 'Type 2': 2, 'Type 3': 3, 'Type 4': 4,
        'Type_1': 1, 'Type_2': 2, 'Type_3': 3, 'Type_4': 4,
        'D1': 1, 'D2': 2, 'D3': 3, 'D4': 4
    },
    'jaw_location': {'Maxilla': 0, 'Mandible': 1, 'Upper': 0, 'Lower': 1},
    'implant_surface': {
        'Machined': 0, 'Smooth': 0, 
        'Roughened': 1, 'SLA': 1, 'TiUnite': 1, 'RBM': 1, 'HA': 1
    }
}

# Apply mappings
df.replace(mapping_dict, inplace=True)

# Target label cleaning
if df['implant_survival_10y'].dtype == object:
    df['implant_survival_10y'] = df['implant_survival_10y'].map({'Yes': 1, 'No': 0, 'yes': 1, 'no': 0, '1': 1, '0': 0})

# Force remaining values to numeric
df = df.apply(pd.to_numeric, errors='coerce') 
df.fillna(0, inplace=True)

# 3. Features (X) and Target (y)
feature_cols = ['age', 'gender', 'smoking_status', 'diabetes', 'history_periodontitis', 
                'bruxism', 'oral_hygiene', 'bone_quality', 'jaw_location', 
                'implant_length_mm', 'implant_diameter_mm', 'implant_surface']

X = df[feature_cols]
y = df['implant_survival_10y'] 

# 4. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# 5. Train Random Forest Model
print("Training Random Forest model on clinical data...")
model = RandomForestClassifier(n_estimators=100, max_depth=7, random_state=42)
model.fit(X_train, y_train)

# 6. Evaluation
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

print("\n--- Model Performance Metrics ---")
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print(f"ROC-AUC Score: {roc_auc_score(y_test, y_proba):.4f}")
print("\n--- Classification Report ---")
print(classification_report(y_test, y_pred))

# 7. Save trained artifact
joblib.dump(model, 'implant_model.pkl')
print("\n Model successfully trained and saved as 'implant_model.pkl'!")