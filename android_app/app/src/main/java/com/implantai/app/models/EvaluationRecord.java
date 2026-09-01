package com.implantai.app.models;

import org.json.JSONObject;

public class EvaluationRecord {
    private int id;
    private String patientName;
    private String patientId;
    private double score;
    private String date;
    private int age;
    private String gender;
    private String boneQuality;
    private String jawLocation;
    private String smokingStatus;
    private String diabetes;
    private String periodontitis;
    private String bruxism;
    private String oralHygiene;
    private double implantLength;
    private double implantDiameter;
    private String implantSurface;
    private JSONObject rawJson;

    public EvaluationRecord(JSONObject obj) {
        this.rawJson = obj;
        this.id = obj.optInt("id", 0);
        this.patientName = obj.optString("patient_name", "Unknown Patient");
        this.patientId = obj.optString("patient_id", "PID-UNKNOWN");
        this.score = obj.optDouble("score", 50.0);
        this.date = obj.optString("date", "Today");
        this.age = obj.optInt("age", 45);
        this.gender = obj.optString("gender", "Male");
        this.boneQuality = obj.optString("bone_quality", "Type 2");
        this.jawLocation = obj.optString("jaw_location", "Mandible");
        this.smokingStatus = obj.optString("smoking_status", "Non-smoker");
        this.diabetes = obj.optString("diabetes", "no");
        this.periodontitis = obj.optString("history_periodontitis", "no");
        this.bruxism = obj.optString("bruxism", "no");
        this.oralHygiene = obj.optString("oral_hygiene", "Good");
        this.implantLength = obj.optDouble("implant_length_mm", 10.0);
        this.implantDiameter = obj.optDouble("implant_diameter_mm", 4.0);
        this.implantSurface = obj.optString("implant_surface", "Roughened");
    }

    public int getId() { return id; }
    public String getPatientName() { return patientName; }
    public String getPatientId() { return patientId; }
    public double getScore() { return score; }
    public String getDate() { return date; }
    public int getAge() { return age; }
    public String getGender() { return gender; }
    public String getBoneQuality() { return boneQuality; }
    public String getJawLocation() { return jawLocation; }
    public String getSmokingStatus() { return smokingStatus; }
    public String getDiabetes() { return diabetes; }
    public String getPeriodontitis() { return periodontitis; }
    public String getBruxism() { return bruxism; }
    public String getOralHygiene() { return oralHygiene; }
    public double getImplantLength() { return implantLength; }
    public double getImplantDiameter() { return implantDiameter; }
    public String getImplantSurface() { return implantSurface; }
    public JSONObject getRawJson() { return rawJson; }

    public String getRiskCategory() {
        if (score >= 90.0) return "Low Risk (Excellent Prognosis)";
        if (score >= 80.0) return "Medium Risk (Moderate Prognosis)";
        return "High Risk Profile";
    }

    public int getRiskColor() {
        if (score >= 90.0) return 0xFF27AE60;
        if (score >= 80.0) return 0xFFE67E22;
        return 0xFFC0392B;
    }
}
