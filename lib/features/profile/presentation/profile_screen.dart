import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../alerts/presentation/alerts_controller.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../pricing/presentation/pricing_providers.dart';
import '../../pricing/presentation/pricing_widgets.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    if (user == null) return const SizedBox.shrink();
    final activeAlerts = ref.watch(alertsControllerProvider.select((s) => s.activeCount));
    final snapshot = ref.watch(marketSnapshotProvider).value;

    void editProfile() => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _EditProfileSheet(user: user),
    );

    return Scaffold(
      appBar: AppBar(title: Text('Account', style: AppTheme.display(22))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          SurfaceCard(
            onTap: editProfile,
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(shape: BoxShape.circle, gradient: AppColors.goldGradient),
                  child: Text(user.initials, style: const TextStyle(color: AppColors.navy950, fontWeight: FontWeight.w800, fontSize: 18)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.name, style: AppTheme.display(17)),
                      const SizedBox(height: 2),
                      Text(user.company, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textSecondary)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Pill(label: user.role.label, color: AppColors.goldLight),
                          const SizedBox(width: 6),
                          if (user.verified)
                            const VerifiedBadge()
                          else
                            const Pill(label: 'Unverified', color: AppColors.warning),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _Section(
            children: [
              _tile(Icons.notifications_none_rounded, 'Price alerts', () => context.push('/alerts'),
                  trailing: activeAlerts == 0 ? null : '$activeAlerts active'),
              ListTile(
                leading: const Icon(Icons.currency_exchange_rounded),
                title: const Text('Show prices in', style: TextStyle(fontWeight: FontWeight.w600)),
                trailing: const CurrencyToggle(),
              ),
              if (snapshot != null)
                _tile(
                  Icons.sensors_rounded,
                  'Live price data',
                  () => showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => FeedDiagnosticsSheet(snapshot: snapshot),
                  ),
                  trailing: snapshot.status.label,
                ),
            ],
          ),
          const SizedBox(height: 16),
          _Section(
            children: [
              _tile(Icons.business_outlined, 'Company details', editProfile),
              _tile(Icons.info_outline_rounded, 'About ImpexSphere', () => context.push('/about')),
              ListTile(
                leading: const Icon(Icons.logout_rounded, color: AppColors.negative),
                title: const Text('Sign out', style: TextStyle(color: AppColors.negative, fontWeight: FontWeight.w700)),
                onTap: () => ref.read(authControllerProvider.notifier).signOut(),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              'Member since ${formatDate(user.createdAt)}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tile(IconData icon, String title, VoidCallback onTap, {String? trailing}) => ListTile(
    leading: Icon(icon),
    title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
    trailing: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (trailing != null) Text(trailing, style: const TextStyle(color: AppColors.textMuted)),
        const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
      ],
    ),
    onTap: onTap,
  );
}

class _Section extends StatelessWidget {
  const _Section({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => SurfaceCard(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Column(
      children: [
        for (var i = 0; i < children.length; i++) ...[
          children[i],
          if (i < children.length - 1) const Divider(indent: 56),
        ],
      ],
    ),
  );
}

class _EditProfileSheet extends ConsumerStatefulWidget {
  const _EditProfileSheet({required this.user});

  final AppUser user;

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  late final _name = TextEditingController(text: widget.user.name);
  late final _company = TextEditingController(text: widget.user.company);
  late final _city = TextEditingController(text: widget.user.city ?? '');
  late final _country = TextEditingController(text: widget.user.country);
  late final _phone = TextEditingController(text: widget.user.phone ?? '');
  late final _businessId = TextEditingController(text: widget.user.businessId ?? '');

  @override
  void dispose() {
    for (final c in [_name, _company, _city, _country, _phone, _businessId]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty || _company.text.trim().isEmpty) return;
    await ref.read(authControllerProvider.notifier).updateProfile(
      widget.user.copyWith(
        name: _name.text.trim(),
        company: _company.text.trim(),
        city: _city.text.trim(),
        country: _country.text.trim(),
        phone: _phone.text.trim(),
        businessId: _businessId.text.trim().isEmpty ? null : _businessId.text.trim(),
      ),
    );
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Edit profile', style: AppTheme.display(24)),
            const SizedBox(height: 16),
            TextField(controller: _name, decoration: const InputDecoration(labelText: 'Full name')),
            const SizedBox(height: 12),
            TextField(controller: _company, decoration: const InputDecoration(labelText: 'Company')),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: TextField(controller: _city, decoration: const InputDecoration(labelText: 'City'))),
                const SizedBox(width: 12),
                Expanded(child: TextField(controller: _country, decoration: const InputDecoration(labelText: 'Country'))),
              ],
            ),
            const SizedBox(height: 12),
            TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone')),
            const SizedBox(height: 12),
            TextField(controller: _businessId, decoration: const InputDecoration(labelText: 'IEC / GSTIN / VAT no.')),
            const SizedBox(height: 18),
            GoldButton(label: 'Save', onPressed: _save),
          ],
        ),
      ),
    );
  }
}
