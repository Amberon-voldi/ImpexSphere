import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../pricing/presentation/pricing_widgets.dart';
import '../domain/listing.dart';

class ListingCard extends StatelessWidget {
  const ListingCard({super.key, required this.listing, this.compact = false});

  final Listing listing;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final l = listing;
    return SurfaceCard(
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/listing/${l.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CategoryArt(categoryIndex: l.category.index, icon: categoryIcon(l.category), size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, height: 1.3),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            l.supplierName,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600),
                          ),
                        ),
                        if (l.supplierVerified) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified_rounded, color: AppColors.gold, size: 14),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: formatMoney(l.price, l.currency),
                            style: const TextStyle(color: AppColors.goldLight, fontWeight: FontWeight.w800, fontSize: 18, fontFeatures: AppTheme.tabular),
                          ),
                          TextSpan(text: ' /${l.unit}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'MOQ ${formatNumber(l.moq)} ${l.unit} · ${l.incoterms.join(' / ')}',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, color: AppColors.gold, size: 15),
                      Text(
                        l.supplierRating.toStringAsFixed(1),
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(Icons.place_outlined, color: AppColors.textMuted, size: 13),
                      const SizedBox(width: 2),
                      Text(l.origin, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
