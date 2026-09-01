import 'package:shared_preferences/shared_preferences.dart';

class SessionService {
  static const String defaultBaseUrl = "https://implant-prediction.onrender.com";

  static Future<void> saveSession({
    required String role,
    required String email,
    required String name,
    required String sessionCookie,
    String? baseUrl,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_logged_in', true);
    await prefs.setString('user_role', role);
    await prefs.setString('user_email', email);
    await prefs.setString('user_name', name);
    await prefs.setString('session_cookie', sessionCookie);
    if (baseUrl != null && baseUrl.isNotEmpty) {
      await prefs.setString('base_url', baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl);
    }
  }

  static Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('is_logged_in') ?? false;
  }

  static Future<String> getUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_role') ?? 'doctor';
  }

  static Future<String> getUserName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_name') ?? 'User';
  }

  static Future<String> getSessionCookie() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('session_cookie') ?? '';
  }

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('base_url') ?? defaultBaseUrl;
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
