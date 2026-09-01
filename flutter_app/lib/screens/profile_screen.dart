import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/session_service.dart';
import 'auth_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _field4Controller = TextEditingController();
  final _field5Controller = TextEditingController();

  bool _isDoctor = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  void _loadProfile() async {
    final role = await SessionService.getUserRole();
    _isDoctor = role.toLowerCase() == 'doctor';

    try {
      final res = await ApiService.get('/get_profile');
      _nameController.text = res['name'] ?? '';
      _phoneController.text = res['phone'] ?? '';
      _emailController.text = res['email'] ?? '';

      if (_isDoctor) {
        _field4Controller.text = res['clinic_name'] ?? '';
        _field5Controller.text = res['license_number'] ?? '';
      } else {
        _field4Controller.text = res['guardian_name'] ?? '';
        _field5Controller.text = res['guardian_phone'] ?? '';
      }
      setState(() => _isLoading = false);
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  void _saveProfile() async {
    try {
      final body = {
        'name': _nameController.text.trim(),
        'phone': _phoneController.text.trim(),
        if (_isDoctor) 'clinic_name': _field4Controller.text.trim(),
        if (_isDoctor) 'license_number': _field5Controller.text.trim(),
        if (!_isDoctor) 'guardian_name': _field4Controller.text.trim(),
        if (!_isDoctor) 'guardian_phone': _field5Controller.text.trim(),
      };

      await ApiService.post('/update_profile', body);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Profile updated successfully!')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('❌ \$e')));
    }
  }

  void _logout() async {
    await SessionService.clearSession();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const AuthScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isDoctor ? '🩺 Doctor Profile' : '👤 Patient Profile'),
        backgroundColor: const Color(0xFF1E2D3C),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder())),
                      const SizedBox(height: 10),
                      TextField(controller: _phoneController, decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder())),
                      const SizedBox(height: 10),
                      TextField(controller: _emailController, enabled: false, decoration: const InputDecoration(labelText: 'Email ID', border: OutlineInputBorder())),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _field4Controller,
                        decoration: InputDecoration(
                          labelText: _isDoctor ? 'Clinic / Hospital Name' : 'Father / Husband Name',
                          border: const OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _field5Controller,
                        decoration: InputDecoration(
                          labelText: _isDoctor ? 'Medical License Number' : 'Father / Husband Phone',
                          border: const OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _saveProfile,
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E2D3C), foregroundColor: Colors.white),
                        child: const Text('💾 Save Profile Updates'),
                      ),
                      const SizedBox(height: 10),
                      ElevatedButton(
                        onPressed: _logout,
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                        child: const Text('🚪 Logout from App'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}
