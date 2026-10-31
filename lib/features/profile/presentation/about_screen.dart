import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/env.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/brand_mark.dart';
import '../../../core/widgets/common.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        children: [
          const Center(child: BrandLogo(height: 34)),
          const SizedBox(height: 28),
          Text('Where Indian produce meets the world.', textAlign: TextAlign.center, style: AppTheme.display(22)),
          const SizedBox(height: 14),
          const Text(
            'ImpexSphere is a B2B import–export marketplace for agricultural commodities. Buyers discover verified '
            'suppliers and request quotes; suppliers list products and win international orders — all anchored to '
            'transparent, live market pricing.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary, height: 1.6),
          ),
          const SizedBox(height: 28),
          SurfaceCard(
            highlighted: true,
            onTap: () => launchUrl(Uri.parse(Company.website), mode: LaunchMode.externalApplication),
            child: Row(
              children: [
                const Icon(Icons.apartment_rounded, color: AppColors.gold, size: 30),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('A product of', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      const SizedBox(height: 2),
                      Text(Company.name, style: AppTheme.display(18, color: AppColors.goldLight)),
                      const SizedBox(height: 2),
                      const Text(Company.websiteLabel, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                ),
                const Icon(Icons.open_in_new_rounded, color: AppColors.textMuted, size: 18),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Market data', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 8),
          const Text(
            'Domestic prices: Agmarknet, Government of India (data.gov.in), median across reporting mandis.\n'
            'Export prices: SP International price service (FOB India).\n'
            'Exchange rates: open.er-api.com.\n\n'
            'Only live market data is shown, never estimates. Prices are for reference only and do not constitute an '
            'offer to buy or sell.',
            style: TextStyle(color: AppColors.textSecondary, height: 1.55, fontSize: 13.5),
          ),
          const SizedBox(height: 32),
          const Center(child: Text('Version 1.0.0', style: TextStyle(color: AppColors.textMuted, fontSize: 12))),
          const SizedBox(height: 12),
          const PoweredBy(),
        ],
      ),
    );
  }
}
