import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/evaluation_record.dart';
import '../services/api_service.dart';
import '../services/session_service.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final List<EvaluationRecord> _all = [];
  final List<EvaluationRecord> _displayed = [];
  final _searchController = TextEditingController();
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  void _fetchHistory() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('/get_history');
      _all.clear();
      if (res['data_array'] != null) {
        for (var item in res['data_array']) {
          _all.add(EvaluationRecord.fromJson(item));
        }
      }
      _filter(_searchController.text);
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _filter(String query) {
    _displayed.clear();
    final q = query.toLowerCase().trim();
    for (var item in _all) {
      if (q.isEmpty || item.patientName.toLowerCase().contains(q) || item.patientId.toLowerCase().contains(q)) {
        _displayed.add(item);
      }
    }
    setState(() => _isLoading = false);
  }

  void _downloadPdf(EvaluationRecord record) async {
    final baseUrl = await SessionService.getBaseUrl();
    final pdfUrl = '\$baseUrl/generate_pdf';
    final uri = Uri.parse(pdfUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Downloading PDF report...')),
      );
    }
  }

  void _deleteRecord(EvaluationRecord record) async {
    try {
      await ApiService.delete('/delete_history/\${record.id}');
      _fetchHistory();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Delete failed: \$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('📋 Evaluation History'),
        backgroundColor: const Color(0xFF1E2D3C),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            TextField(
              controller: _searchController,
              onChanged: _filter,
              decoration: const InputDecoration(
                hintText: '🔍 Search history by patient name or ID...',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.search),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _displayed.isEmpty
                      ? const Center(child: Text('No evaluation records found.'))
                      : RefreshIndicator(
                          onRefresh: () async => _fetchHistory(),
                          child: ListView.builder(
                            itemCount: _displayed.length,
                            itemBuilder: (ctx, idx) {
                              final item = _displayed[idx];
                              return Card(
                                margin: const EdgeInsets.symmetric(vertical: 6),
                                elevation: 3,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                child: Padding(
                                  padding: const EdgeInsets.all(14.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(item.patientName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                                          Text('\${item.score.toStringAsFixed(1)}%', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                      Text('ID: \${item.patientId} | Date: \${item.date}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                      const SizedBox(height: 4),
                                      Text(item.riskCategory, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 13)),
                                      const SizedBox(height: 10),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              icon: const Icon(Icons.picture_as_pdf, size: 16),
                                              label: const Text('📄 PDF Report'),
                                              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF27AE60), foregroundColor: Colors.white),
                                              onPressed: () => _downloadPdf(item),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              icon: const Icon(Icons.delete, size: 16),
                                              label: const Text('🗑️ Delete'),
                                              style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                                              onPressed: () => _deleteRecord(item),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
