class EvaluationRecord {
  final int id;
  final String patientName;
  final String patientId;
  final double score;
  final String date;
  final int age;
  final String gender;
  final String boneQuality;
  final String jawLocation;
  final String smokingStatus;
  final String diabetes;
  final String periodontitis;
  final String bruxism;
  final String oralHygiene;
  final double implantLength;
  final double implantDiameter;
  final String implantSurface;
  final Map<String, dynamic> rawJson;

  EvaluationRecord({
    required this.id,
    required this.patientName,
    required this.patientId,
    required this.score,
    required this.date,
    required this.age,
    required this.gender,
    required this.boneQuality,
    required this.jawLocation,
    required this.smokingStatus,
    required this.diabetes,
    required this.periodontitis,
    required this.bruxism,
    required this.oralHygiene,
    required this.implantLength,
    required this.implantDiameter,
    required this.implantSurface,
    required this.rawJson,
  });

  factory EvaluationRecord.fromJson(Map<String, dynamic> json) {
    return EvaluationRecord(
      id: json['id'] ?? 0,
      patientName: json['patient_name'] ?? 'Unknown Patient',
      patientId: json['patient_id'] ?? 'PID-UNKNOWN',
      score: (json['score'] as num?)?.toDouble() ?? 50.0,
      date: json['date'] ?? 'Today',
      age: json['age'] ?? 45,
      gender: json['gender'] ?? 'Male',
      boneQuality: json['bone_quality'] ?? 'Type 2',
      jawLocation: json['jaw_location'] ?? 'Mandible',
      smokingStatus: json['smoking_status'] ?? 'Non-smoker',
      diabetes: json['diabetes'] ?? 'no',
      periodontitis: json['history_periodontitis'] ?? 'no',
      bruxism: json['bruxism'] ?? 'no',
      oralHygiene: json['oral_hygiene'] ?? 'Good',
      implantLength: (json['implant_length_mm'] as num?)?.toDouble() ?? 10.0,
      implantDiameter: (json['implant_diameter_mm'] as num?)?.toDouble() ?? 4.0,
      implantSurface: json['implant_surface'] ?? 'Roughened',
      rawJson: json,
    );
  }

  String get riskCategory {
    if (score >= 90.0) return 'Low Risk (Excellent Prognosis)';
    if (score >= 80.0) return 'Medium Risk (Moderate Prognosis)';
    return 'High Risk Profile';
  }
}
