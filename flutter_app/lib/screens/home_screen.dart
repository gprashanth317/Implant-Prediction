import 'package:flutter/material.dart';
import '../services/session_service.dart';

class HomeScreen extends StatefulWidget {
  final Function(int) onNavigate;
  const HomeScreen({super.key, required this.onNavigate});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _userName = 'User';

  @override
  void initState() {
    super.initState();
    SessionService.getUserName().then((val) => setState(() => _userName = val));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🦷 ImplantAI Dashboard'),
        backgroundColor: const Color(0xFF1E2D3C),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('👋 Welcome, $_userName!', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E2D3C))),
            const Text('Unified Cross-Platform Medical Prognosis Engine', style: TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 16),
            Card(
              color: const Color(0xFF1E2D3C),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: const Padding(
                padding: EdgeInsets.all(18.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('⚙️ ML Survival Prognosis Engine', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(height: 6),
                    Text('Predict 10-year dental implant survival probability based on clinical systemic parameters & anatomical specs.', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text('⚡ Quick Feature Actions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E2D3C))),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.3,
              children: [
                _buildActionTile('⚙️', 'New Prediction', () => widget.onNavigate(1)),
                _buildActionTile('📋', 'View History', () => widget.onNavigate(2)),
                _buildActionTile('🏥', 'Dental Hospitals', () => widget.onNavigate(4)),
                _buildActionTile('👤', 'My Profile', () => widget.onNavigate(5)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile(String emoji, String title, VoidCallback onTap) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 28)),
            const SizedBox(height: 6),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E2D3C))),
          ],
        ),
      ),
    );
  }
}
