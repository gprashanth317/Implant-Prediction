import 'dart:convert';
import 'package:http/http.dart' as http;
import 'session_service.dart';

class ApiService {
  static Future<Map<String, String>> _getHeaders() async {
    final cookie = await SessionService.getSessionCookie();
    return {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json',
      if (cookie.isNotEmpty) 'Cookie': cookie,
    };
  }

  static Future<Map<String, dynamic>> post(String endpoint, Map<String, dynamic> body) async {
    final baseUrl = await SessionService.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders();

    final response = await http.post(url, headers: headers, body: jsonEncode(body));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      String msg = 'Request failed with status code ${response.statusCode}';
      try {
        final errJson = jsonDecode(response.body);
        if (errJson['message'] != null) msg = errJson['message'];
      } catch (_) {}
      throw Exception(msg);
    }
  }

  static Future<dynamic> get(String endpoint) async {
    final baseUrl = await SessionService.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders();

    final response = await http.get(url, headers: headers);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load data (${response.statusCode})');
    }
  }

  static Future<Map<String, dynamic>> delete(String endpoint) async {
    final baseUrl = await SessionService.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders();

    final response = await http.delete(url, headers: headers);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to delete item (${response.statusCode})');
    }
  }
}
