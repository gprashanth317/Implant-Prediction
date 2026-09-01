import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  int _total = 0;
  double _avgScore = 0.0;
  int _low = 0, _med = 0, _high = 0;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  void _loadAnalytics() async {
    try {
      final res = await ApiService.get('/get_history');
      final arr = res['data_array'] as List?;
      if (arr != null) {
        int total = arr.length;
        double sum = 0;
        int low = 0, med = 0, high = 0;
        for (var item in arr) {
          double s = (item['score'] as num?)?.toDouble() ?? 50.0;
          sum += s;
          if (s >= 90.0) low++;
          else if (s >= 80.0) med++;
          else high++;
        }
        setState(() {
          _total = total;
          _avgScore = total > 0 ? sum / total : 0.0;
          _low = low;
          _med = med;
          _high = high;
          _isLoading = false;
        });
      }
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('📊 Clinical Analytics Dashboard'),
        backgroundColor: const Color(0xFF1E2D3C),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: _buildStatCard('Total Patients', '\$_total', Colors.green)),
                      const SizedBox(width: 10),
                      Expanded(child: _buildStatCard('Avg Survival Rate', '\${_avgScore.toStringAsFixed(1)}%', const Color(0xFF1E2D3C))),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Card(
                    elevation: 3,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('📈 Prognosis Tier Breakdown', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 10),
                          Text('🟢 Low Risk (>=90%): \$_low patients', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14)),
                          const SizedBox(height: 6),
                          Text('🟠 Medium Risk (80-89%): \$_med patients', style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 14)),
                          const SizedBox(height: 6),
                          Text('🔴 High Risk (<80%): \$_high patients', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildStatCard(String title, String val, Color color) {
    return Container(
      height: 90,
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(val, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
          Text(title, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ],
      ),
    );
  }
}
