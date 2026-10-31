import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/brand_mark.dart';
import '../../../core/widgets/common.dart';

/// Shown while the session is restored; the router redirects away.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              const Spacer(),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 900),
                curve: Curves.easeOutCubic,
                builder: (context, t, child) => Opacity(
                  opacity: t,
                  child: Transform.translate(offset: Offset(0, 12 * (1 - t)), child: child),
                ),
                child: const Column(
                  children: [
                    Padding(padding: EdgeInsets.symmetric(horizontal: 48), child: BrandLogo(height: 40)),
                    SizedBox(height: 14),
                    Text(
                      'GLOBAL AGRI-COMMODITY TRADE',
                      style: TextStyle(color: AppColors.textMuted, letterSpacing: 3, fontSize: 11, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2)),
              const SizedBox(height: 28),
              const PoweredBy(),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
