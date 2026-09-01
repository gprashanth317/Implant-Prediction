import 'package:flutter/material.dart';
import '../services/api_service.dart';

class PredictScreen extends StatefulWidget {
  const PredictScreen({super.key});

  @override
  State<PredictScreen> createState() => _PredictScreenState();
}

class _PredictScreenState extends State<PredictScreen> {
  final _nameController = TextEditingController();
  final _idController = TextEditingController();
  final _ageController = TextEditingController();
  final _lengthController = TextEditingController();
  final _diameterController = TextEditingController();

  String _smoking = 'Non-smoker';
  String _diabetes = 'no';
  String _periodontitis = 'no';
  String _bruxism = 'no';
  String _hygiene = 'Good';
  String _bone = 'Type 2';
  String _jaw = 'Mandible (Lower Jaw)';
  String _surface = 'Roughened (SLA/Anodized)';

  bool _isLoading = false;
  double? _score;
  String? _riskCategory;

  void _submitPrediction() async {
    final name = _nameController.text.trim();
    final id = _idController.text.trim();
    final ageStr = _ageController.text.trim();

    if (name.isEmpty || id.isEmpty || ageStr.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter patient name, ID, and age.')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final res = await ApiService.post('/predict', {
        'patient_name': name,
        'patient_id': id,
        'age': int.parse(ageStr),
        'gender': 'Male',
        'smoking_status': _smoking,
        'diabetes': _diabetes,
        'history_periodontitis': _periodontitis,
        'bruxism': _bruxism,
        'oral_hygiene': _hygiene,
        'bone_quality': _bone,
        'jaw_location': _jaw,
        'implant_length_mm': double.tryParse(_lengthController.text) ?? 10.0,
        'implant_diameter_mm': double.tryParse(_diameterController.text) ?? 4.0,
        'implant_surface': _surface,
      });

      final score = (res['survival_probability'] as num?)?.toDouble() ?? 50.0;
      String cat = 'Low Risk (Excellent Prognosis)';
      if (score < 80.0) {
        cat = 'High Risk Profile';
      } else if (score < 90.0) {
        cat = 'Medium Risk (Moderate Prognosis)';
      }

      setState(() {
        _isLoading = false;
        _score = score;
        _riskCategory = cat;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Prediction failed: \${e.toString().replaceAll("Exception: ", "")}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('⚙️ Implant Survival Prediction'),
        backgroundColor: const Color(0xFF1E2D3C),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('👤 Patient Demographics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E2D3C))),
                    const SizedBox(height: 10),
                    TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Patient Name', border: OutlineInputBorder())),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: _idController, decoration: const InputDecoration(labelText: 'Patient ID', border: OutlineInputBorder()))),
                        const SizedBox(width: 10),
                        Expanded(child: TextField(controller: _ageController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Age (years)', border: OutlineInputBorder()))),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('🩺 Systemic Risk Factors', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E2D3C))),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: _smoking,
                      decoration: const InputDecoration(labelText: 'Smoking Status', border: OutlineInputBorder()),
                      items: ['Non-smoker', 'Light Smoker (<10/day)', 'Heavy Smoker (>=10/day)'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                      onChanged: (v) => setState(() => _smoking = v!),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Text('Diabetes Mellitus: '),
                        ChoiceChip(label: const Text('No'), selected: _diabetes == 'no', onSelected: (s) => setState(() => _diabetes = 'no')),
                        const SizedBox(width: 8),
                        ChoiceChip(label: const Text('Yes'), selected: _diabetes == 'yes', onSelected: (s) => setState(() => _diabetes = 'yes')),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Text('Periodontitis: '),
                        ChoiceChip(label: const Text('No'), selected: _periodontitis == 'no', onSelected: (s) => setState(() => _periodontitis = 'no')),
                        const SizedBox(width: 8),
                        ChoiceChip(label: const Text('Yes'), selected: _periodontitis == 'yes', onSelected: (s) => setState(() => _periodontitis = 'yes')),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('🦴 Anatomical & Implant Specs', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E2D3C))),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: _bone,
                      decoration: const InputDecoration(labelText: 'Bone Quality', border: OutlineInputBorder()),
                      items: ['Type 1', 'Type 2', 'Type 3', 'Type 4'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                      onChanged: (v) => setState(() => _bone = v!),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: TextField(controller: _lengthController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Length mm (10.0)', border: OutlineInputBorder()))),
                        const SizedBox(width: 10),
                        Expanded(child: TextField(controller: _diameterController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Diameter mm (4.0)', border: OutlineInputBorder()))),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _submitPrediction,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E2D3C),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.vertical(14),
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('🔮 Calculate Survival Prognosis', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            ),
            if (_score != null) ...[
              const SizedBox(height: 16),
              Card(
                color: const Color(0xFF1E2D3C),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 6,
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    children: [
                      const Text('CALCULATED 10-YEAR SURVIVAL PROBABILITY', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text('\${_score!.toStringAsFixed(1)}%', style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: _score! >= 90.0 ? Colors.green : (_score! >= 80.0 ? Colors.orange : Colors.red),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(_riskCategory!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
