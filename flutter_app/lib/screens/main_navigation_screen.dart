import 'package:flutter/material.dart';
import '../services/session_service.dart';
import 'home_screen.dart';
import 'predict_screen.dart';
import 'history_screen.dart';
import 'analytics_screen.dart';
import 'hospitals_screen.dart';
import 'profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  bool _isDoctor = true;

  @override
  void initState() {
    super.initState();
    _checkRole();
  }

  void _checkRole() async {
    final role = await SessionService.getUserRole();
    setState(() => _isDoctor = role.toLowerCase() == 'doctor');
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(onNavigate: (idx) => setState(() => _currentIndex = idx)),
      const PredictScreen(),
      const HistoryScreen(),
      if (_isDoctor) const AnalyticsScreen(),
      const HospitalsScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex >= screens.length ? 0 : _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        selectedItemColor: const Color(0xFF27AE60),
        unselectedItemColor: Colors.grey.shade600,
        type: BottomNavigationBarType.fixed,
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          const BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Predict'),
          const BottomNavigationBarItem(icon: Icon(Icons.history), label: 'History'),
          if (_isDoctor) const BottomNavigationBarItem(icon: Icon(Icons.analytics), label: 'Analytics'),
          const BottomNavigationBarItem(icon: Icon(Icons.local_hospital), label: 'Hospitals'),
          const BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
