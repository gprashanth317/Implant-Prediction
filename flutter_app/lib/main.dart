import 'package:flutter/material.dart';
import 'services/session_service.dart';
import 'screens/auth_screen.dart';
import 'screens/main_navigation_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final loggedIn = await SessionService.isLoggedIn();

  runApp(ImplantAIApp(isLoggedIn: loggedIn));
}

class ImplantAIApp extends StatelessWidget {
  final bool isLoggedIn;
  const ImplantAIApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ImplantAI - Unified Cross-Platform App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E2D3C),
          primary: const Color(0xFF1E2D3C),
          secondary: const Color(0xFF27AE60),
        ),
      ),
      home: isLoggedIn ? const MainNavigationScreen() : const AuthScreen(),
    );
  }
}
