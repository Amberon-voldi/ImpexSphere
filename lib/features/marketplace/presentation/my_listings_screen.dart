import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/listing_repository.dart';
import 'listing_card.dart';

/// The supplier's own listings, embedded in their Trade tab.
class MyListingsView extends ConsumerWidget {
  const MyListingsView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final mine = ref.watch(listingsProvider).where((l) => l.supplierId == user?.id).toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    if (mine.isEmpty) {
      return const EmptyState(
        icon: Icons.storefront_outlined,
        title: 'No listings yet',
        message: 'List your first product to reach verified importers.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 96),
      itemCount: mine.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => Opacity(opacity: mine[i].active ? 1 : 0.5, child: ListingCard(listing: mine[i])),
    );
  }
}
