import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../pricing/presentation/pricing_widgets.dart';
import '../data/rfq_repository.dart';
import '../domain/rfq.dart';

Color rfqStatusColor(RfqStatus s) => switch (s) {
  RfqStatus.open => AppColors.info,
  RfqStatus.quoted => AppColors.gold,
  RfqStatus.awarded => AppColors.positive,
  RfqStatus.closed => AppColors.textMuted,
};

/// The buyer's own requests, embedded in their Trade tab.
class BuyerRequestsView extends ConsumerWidget {
  const BuyerRequestsView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _RfqList(
      rfqs: ref.watch(myRfqsProvider),
      empty: const EmptyState(
        icon: Icons.request_quote_outlined,
        title: 'No requests yet',
        message: 'Tell suppliers what you need and compare their quotes side by side.',
      ),
    );
  }
}

/// Open buyer requests and the supplier's sent quotes, in their Trade tab.
class SupplierRequestsView extends ConsumerStatefulWidget {
  const SupplierRequestsView({super.key});

  @override
  ConsumerState<SupplierRequestsView> createState() => _SupplierRequestsViewState();
}

class _SupplierRequestsViewState extends ConsumerState<SupplierRequestsView> {
  bool _showQuoted = false;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider)!;
    final rfqs = ref.watch(myRfqsProvider);
    final open = rfqs.where((r) => r.acceptsQuotes && r.quoteFrom(user.id) == null).toList();
    final quoted = rfqs.where((r) => r.quoteFrom(user.id) != null).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: SegmentedButton<bool>(
            showSelectedIcon: false,
            segments: [
              ButtonSegment(value: false, label: Text('Open · ${open.length}')),
              ButtonSegment(value: true, label: Text('Quoted · ${quoted.length}')),
            ],
            selected: {_showQuoted},
            onSelectionChanged: (s) => setState(() => _showQuoted = s.first),
          ),
        ),
        Expanded(
          child: _RfqList(
            rfqs: _showQuoted ? quoted : open,
            empty: _showQuoted
                ? const EmptyState(icon: Icons.send_outlined, title: 'No quotes sent', message: 'Quote on open requests to win new buyers.')
                : const EmptyState(icon: Icons.inbox_outlined, title: 'You\'re all caught up', message: 'New buyer requests will appear here.'),
          ),
        ),
      ],
    );
  }
}

class _RfqList extends StatelessWidget {
  const _RfqList({required this.rfqs, required this.empty});

  final List<Rfq> rfqs;
  final Widget empty;

  @override
  Widget build(BuildContext context) {
    if (rfqs.isEmpty) return empty;
    final sorted = [...rfqs]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 96),
      itemCount: sorted.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => RfqCard(rfq: sorted[i]),
    );
  }
}

class RfqCard extends StatelessWidget {
  const RfqCard({super.key, required this.rfq});

  final Rfq rfq;

  @override
  Widget build(BuildContext context) {
    final c = rfq.commodity;
    final status = rfq.status;
    return SurfaceCard(
      onTap: () => context.push('/rfqs/${rfq.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (c != null) CategoryArt(categoryIndex: c.category.index, icon: categoryIcon(c.category), size: 40, radius: 12),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(rfq.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, height: 1.3)),
                    const SizedBox(height: 3),
                    Text(
                      '${rfq.buyerCompany} · ${rfq.buyerCountry}',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _fact(Icons.scale_outlined, '${formatNumber(rfq.quantity)} ${rfq.unit}'),
              _fact(Icons.sailing_outlined, '${rfq.incoterm} ${rfq.destination.split(',').first}'),
              const Spacer(),
              Pill(label: status.label, color: rfqStatusColor(status)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                rfq.targetPrice == null ? 'Open to offers' : 'Target ${formatMoney(rfq.targetPrice!, rfq.currency)}/${rfq.unit}',
                style: const TextStyle(color: AppColors.goldLight, fontWeight: FontWeight.w700, fontSize: 13),
              ),
              const Spacer(),
              Text(
                '${rfq.quotes.length} quote${rfq.quotes.length == 1 ? '' : 's'} · ${timeAgo(rfq.createdAt)}',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _fact(IconData icon, String text) => Padding(
    padding: const EdgeInsets.only(right: 14),
    child: Row(
      children: [
        Icon(icon, size: 15, color: AppColors.textMuted),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5, fontWeight: FontWeight.w600)),
      ],
    ),
  );
}
