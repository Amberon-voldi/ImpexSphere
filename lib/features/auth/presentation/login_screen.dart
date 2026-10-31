import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/brand_mark.dart';
import '../../../core/widgets/common.dart';
import '../data/auth_repository.dart';
import 'auth_controller.dart';

/// Shared layout for the login and sign-up screens.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.title, required this.subtitle, required this.children, this.showBack = false});

  final String title;
  final String subtitle;
  final List<Widget> children;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: showBack ? AppBar() : null,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                children: [
                  if (!showBack) const SizedBox(height: 24),
                  const Align(alignment: Alignment.centerLeft, child: BrandLogo(height: 26)),
                  const SizedBox(height: 36),
                  Text(title, style: AppTheme.display(28)),
                  const SizedBox(height: 8),
                  Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 15, height: 1.45)),
                  const SizedBox(height: 28),
                  ...children,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn([String? email, String? password]) async {
    if (email == null && !_form.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).signIn(email ?? _email.text, password ?? _password.text);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Welcome back',
      subtitle: 'Sign in to trade with verified buyers and suppliers.',
      children: [
        Form(
          key: _form,
          child: Column(
            children: [
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Work email', prefixIcon: Icon(Icons.alternate_email_rounded)),
                validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _password,
                obscureText: _obscure,
                autofillHints: const [AutofillHints.password],
                onFieldSubmitted: (_) => _signIn(),
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline_rounded),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.negative, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: 22),
        GoldButton(label: 'Sign in', loading: _loading, onPressed: () => _signIn()),
        const SizedBox(height: 14),
        OutlinedButton(onPressed: () => context.push('/signup'), child: const Text('Create a business account')),
        const SizedBox(height: 28),
        const Row(
          children: [
            Expanded(child: Divider()),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text('EXPLORE THE DEMO', style: TextStyle(color: AppColors.textMuted, fontSize: 11, letterSpacing: 1.6, fontWeight: FontWeight.w700)),
            ),
            Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _DemoButton(
                icon: Icons.shopping_bag_outlined,
                label: 'As buyer',
                onTap: _loading ? null : () => _signIn(LocalAuthRepository.demoBuyerEmail, LocalAuthRepository.demoPassword),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _DemoButton(
                icon: Icons.inventory_2_outlined,
                label: 'As supplier',
                onTap: _loading ? null : () => _signIn(LocalAuthRepository.demoSupplierEmail, LocalAuthRepository.demoPassword),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _DemoButton extends StatelessWidget {
  const _DemoButton({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Column(
        children: [
          Icon(icon, color: AppColors.gold),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
