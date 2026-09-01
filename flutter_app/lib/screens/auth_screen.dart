import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/session_service.dart';
import 'main_navigation_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _baseUrlController = TextEditingController(text: SessionService.defaultBaseUrl);

  String _selectedRole = 'doctor';
  bool _isLoading = false;
  String? _errorMessage;

  void _performLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();
    final baseUrl = _baseUrlController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter username and password');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await ApiService.post('/auth/login', {
        'username': username,
        'password': password,
        'role': _selectedRole,
      });

      final role = res['role'] ?? _selectedRole;
      final name = res['name'] ?? username;
      final email = res['email'] ?? username;

      await SessionService.saveSession(
        role: role,
        email: email,
        name: name,
        sessionCookie: 'session=authenticated',
        baseUrl: baseUrl,
      );

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E2D3C),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('🦷 ImplantAI', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                const Text('Cross-Platform Dental Implant Survival Predictor', style: TextStyle(color: Colors.white70, fontSize: 14), textAlign: TextAlign.center),
                const SizedBox(height: 28),
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 8,
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                icon: const Text('🩺'),
                                label: const Text('Doctor'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _selectedRole == 'doctor' ? const Color(0xFF1E2D3C) : Colors.grey.shade300,
                                  foregroundColor: _selectedRole == 'doctor' ? Colors.white : Colors.black87,
                                ),
                                onPressed: () => setState(() => _selectedRole = 'doctor'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton.icon(
                                icon: const Text('👤'),
                                label: const Text('Patient'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _selectedRole == 'patient' ? const Color(0xFF27AE60) : Colors.grey.shade300,
                                  foregroundColor: _selectedRole == 'patient' ? Colors.white : Colors.black87,
                                ),
                                onPressed: () => setState(() => _selectedRole = 'patient'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _usernameController,
                          decoration: const InputDecoration(labelText: 'Username or Email (admin / patient)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.person)),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _passwordController,
                          obscureText: true,
                          decoration: const InputDecoration(labelText: 'Password (password)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.lock)),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _baseUrlController,
                          decoration: const InputDecoration(labelText: 'Server URL', border: OutlineInputBorder(), prefixIcon: Icon(Icons.dns)),
                        ),
                        const SizedBox(height: 20),
                        if (_errorMessage != null) ...[
                          Text('❌ $_errorMessage', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                          const SizedBox(height: 12),
                        ],
                        ElevatedButton(
                          onPressed: _isLoading ? null : _performLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF27AE60),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.vertical(14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('🔑 Sign In to Unified App', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
