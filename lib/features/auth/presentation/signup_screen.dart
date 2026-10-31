import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/common.dart';
import '../data/auth_repository.dart';
import '../domain/app_user.dart';
import 'auth_controller.dart';
import 'login_screen.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _company = TextEditingController();
  final _country = TextEditingController(text: 'India');
  final _city = TextEditingController();
  final _businessId = TextEditingController();
  UserRole _role = UserRole.buyer;
  bool _agreed = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_name, _email, _password, _company, _country, _city, _businessId]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    if (!_agreed) {
      setState(() => _error = 'Please accept the terms to continue.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).signUp(
        name: _name.text,
        email: _email.text,
        password: _password.text,
        role: _role,
        company: _company.text,
        country: _country.text,
        city: _city.text,
        businessId: _businessId.text.isEmpty ? null : _businessId.text,
      );
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _required(String? v) => (v == null || v.trim().isEmpty) ? 'Required' : null;

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      showBack: true,
      title: 'Join ImpexSphere',
      subtitle: 'Tell us how you trade. You can add verification documents later.',
      children: [
        Row(
          children: [
            for (final role in UserRole.values) ...[
              Expanded(
                child: SurfaceCard(
                  highlighted: _role == role,
                  onTap: () => setState(() => _role = role),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        role == UserRole.buyer ? Icons.shopping_bag_outlined : Icons.inventory_2_outlined,
                        color: _role == role ? AppColors.gold : AppColors.textMuted,
                      ),
                      const SizedBox(height: 10),
                      Text('I\'m a ${role.label.toLowerCase()}', style: const TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text(role.tagline, style: const TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.35)),
                    ],
                  ),
                ),
              ),
              if (role != UserRole.values.last) const SizedBox(width: 12),
            ],
          ],
        ),
        const SizedBox(height: 20),
        Form(
          key: _form,
          child: Column(
            children: [
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Full name', prefixIcon: Icon(Icons.person_outline_rounded)),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _company,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Company name', prefixIcon: Icon(Icons.business_outlined)),
                validator: _required,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Work email', prefixIcon: Icon(Icons.alternate_email_rounded)),
                validator: (v) => (v == null || !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim())) ? 'Enter a valid email' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline_rounded), helperText: 'At least 8 characters'),
                validator: (v) => (v == null || v.length < 8) ? 'Use at least 8 characters' : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(controller: _country, decoration: const InputDecoration(labelText: 'Country'), validator: _required),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: TextFormField(controller: _city, decoration: const InputDecoration(labelText: 'City'))),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _businessId,
                decoration: InputDecoration(
                  labelText: _role == UserRole.supplier ? 'IEC / GSTIN (optional)' : 'Trade licence / VAT no. (optional)',
                  prefixIcon: const Icon(Icons.badge_outlined),
                  helperText: 'Speeds up your verified badge',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        CheckboxListTile(
          value: _agreed,
          onChanged: (v) => setState(() => _agreed = v ?? false),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          activeColor: AppColors.gold,
          checkColor: AppColors.navy950,
          title: const Text(
            'I agree to the Terms of Use and Privacy Policy, and confirm I represent a registered business.',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 6),
          Text(_error!, style: const TextStyle(color: AppColors.negative, fontWeight: FontWeight.w600)),
        ],
        const SizedBox(height: 16),
        GoldButton(label: 'Create account', loading: _loading, onPressed: _submit),
      ],
    );
  }
}
