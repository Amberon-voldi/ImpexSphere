import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/rfq_repository.dart';
import '../domain/rfq.dart';
import 'rfq_screen.dart';

class RfqDetailScreen extends ConsumerWidget {
  const RfqDetailScreen({super.key, required this.rfqId});

  final String rfqId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rfq = ref.watch(rfqControllerProvider.select((rs) => rs.where((r) => r.id == rfqId).firstOrNull));
    final user = ref.watch(currentUserProvider);
    if (rfq == null || user == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const EmptyState(icon: Icons.request_quote_outlined, title: 'RFQ not found', message: 'It may have been closed.'),
      );
    }
    final isBuyer = rfq.buyerId == user.id;
    final myQuote = rfq.quoteFrom(user.id);
    final status = rfq.status;

    Widget? action;
    if (isBuyer && rfq.acceptsQuotes) {
      action = OutlinedButton(
        onPressed: () => ref.read(rfqControllerProvider.notifier).close(rfq.id),
        child: const Text('Close RFQ'),
      );
    } else if (user.isSupplier && rfq.acceptsQuotes) {
      action = GoldButton(
        label: myQuote == null ? 'Submit quote' : 'Revise quote',
        icon: Icons.send_rounded,
        onPressed: () => showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          builder: (_) => _QuoteSheet(rfq: rfq, supplier: user, existing: myQuote),
        ),
      );
    }

    final quotes = [...rfq.quotes]..sort((a, b) => a.price.compareTo(b.price));
    return Scaffold(
      appBar: AppBar(),
      bottomNavigationBar: action == null ? null : SafeArea(minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12), child: action),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          Pill(label: status.label.toUpperCase(), color: rfqStatusColor(status)),
          const SizedBox(height: 10),
          Text(rfq.title, style: AppTheme.display(22)),
          const SizedBox(height: 6),
          Text(
            '${rfq.buyerCompany} · ${rfq.buyerCountry} · posted ${timeAgo(rfq.createdAt)}',
            style: const TextStyle(color: AppColors.textMuted),
          ),
          const SizedBox(height: 18),
          SurfaceCard(
            child: Column(
              children: [
                _row('Commodity', rfq.commodity?.name ?? rfq.commodityId),
                _row('Quantity', '${formatNumber(rfq.quantity)} ${rfq.unit}'),
                _row('Target price', rfq.targetPrice == null ? 'Open to offers' : '${formatMoney(rfq.targetPrice!, rfq.currency)}/${rfq.unit}'),
                _row('Incoterm', rfq.incoterm),
                _row('Destination', rfq.destination),
                _row('Deliver by', formatDate(rfq.deliveryBy), last: true),
              ],
            ),
          ),
          if (rfq.notes.isNotEmpty) ...[
            const SizedBox(height: 18),
            const Text('Specifications', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 6),
            Text(rfq.notes, style: const TextStyle(color: AppColors.textSecondary, height: 1.5)),
          ],
          const SizedBox(height: 24),
          if (isBuyer) ...[
            SectionHeader(title: 'Quotes', subtitle: quotes.isEmpty ? 'Suppliers are reviewing your request' : 'Sorted by price, lowest first'),
            if (quotes.isEmpty)
              const SurfaceCard(
                child: Row(
                  children: [
                    Icon(Icons.hourglass_top_rounded, color: AppColors.gold),
                    SizedBox(width: 12),
                    Expanded(child: Text('No quotes yet. Most RFQs receive their first offer within 24 hours.', style: TextStyle(color: AppColors.textSecondary))),
                  ],
                ),
              ),
            for (final q in quotes) ...[
              _QuoteCard(
                quote: q,
                rfq: rfq,
                best: q.id == rfq.bestQuote?.id && quotes.length > 1,
                onAccept: rfq.acceptsQuotes ? () => _confirmAward(context, ref, rfq, q) : null,
              ),
              const SizedBox(height: 12),
            ],
          ] else if (myQuote != null) ...[
            const SectionHeader(title: 'Your quote'),
            _QuoteCard(quote: myQuote, rfq: rfq, awarded: rfq.awardedQuoteId == myQuote.id),
            const SizedBox(height: 8),
            Text(
              '${rfq.quotes.length} supplier${rfq.quotes.length == 1 ? ' has' : 's have'} quoted on this RFQ.',
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _confirmAward(BuildContext context, WidgetRef ref, Rfq rfq, SupplierQuote q) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Accept this quote?'),
        content: Text(
          'Award ${q.supplierName} at ${formatMoney(q.price, q.currency)}/${q.unit}. Other suppliers will be notified that the RFQ is closed.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Accept')),
        ],
      ),
    );
    if (ok != true) return;
    HapticFeedback.mediumImpact();
    ref.read(rfqControllerProvider.notifier).award(rfq.id, q.id);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Quote accepted. ${q.supplierName} will contact you to finalise.')));
    }
  }

  Widget _row(String label, String value, {bool last = false}) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10),
    decoration: BoxDecoration(border: last ? null : const Border(bottom: BorderSide(color: AppColors.line))),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 110, child: Text(label, style: const TextStyle(color: AppColors.textSecondary))),
        Expanded(child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w700))),
      ],
    ),
  );
}

class _QuoteCard extends StatelessWidget {
  const _QuoteCard({required this.quote, required this.rfq, this.best = false, this.awarded = false, this.onAccept});

  final SupplierQuote quote;
  final Rfq rfq;
  final bool best;
  final bool awarded;
  final VoidCallback? onAccept;

  @override
  Widget build(BuildContext context) {
    final isAwarded = awarded || rfq.awardedQuoteId == quote.id;
    final vsTarget = rfq.targetPrice == null ? null : (quote.price - rfq.targetPrice!) / rfq.targetPrice! * 100;
    return SurfaceCard(
      highlighted: best || isAwarded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Flexible(child: Text(quote.supplierName, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800))),
                    if (quote.supplierVerified) ...[
                      const SizedBox(width: 4),
                      const Icon(Icons.verified_rounded, color: AppColors.gold, size: 15),
                    ],
                  ],
                ),
              ),
              if (isAwarded)
                const Pill(label: 'ACCEPTED', color: AppColors.positive)
              else if (best)
                const Pill(label: 'BEST PRICE', color: AppColors.gold),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatMoney(quote.price, quote.currency),
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, fontFeatures: AppTheme.tabular),
              ),
              Text(' /${quote.unit}', style: const TextStyle(color: AppColors.textMuted)),
              const Spacer(),
              if (vsTarget != null)
                Text(
                  '${formatPct(vsTarget)} vs target',
                  style: TextStyle(color: vsTarget <= 0 ? AppColors.positive : AppColors.warning, fontWeight: FontWeight.w700, fontSize: 12.5),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Lead time ${quote.leadTimeDays} days · valid until ${formatDate(quote.validUntil)}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
          ),
          if (quote.message.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('"${quote.message}"', style: const TextStyle(color: AppColors.textSecondary, fontStyle: FontStyle.italic, height: 1.4)),
          ],
          if (onAccept != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 44,
              width: double.infinity,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
                onPressed: onAccept,
                child: const Text('Accept quote'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _QuoteSheet extends ConsumerStatefulWidget {
  const _QuoteSheet({required this.rfq, required this.supplier, this.existing});

  final Rfq rfq;
  final AppUser supplier;
  final SupplierQuote? existing;

  @override
  ConsumerState<_QuoteSheet> createState() => _QuoteSheetState();
}

class _QuoteSheetState extends ConsumerState<_QuoteSheet> {
  final _form = GlobalKey<FormState>();
  late final _price = TextEditingController(text: widget.existing?.price.toStringAsFixed(0) ?? widget.rfq.targetPrice?.toStringAsFixed(0) ?? '');
  late final _lead = TextEditingController(text: '${widget.existing?.leadTimeDays ?? 14}');
  late final _message = TextEditingController(text: widget.existing?.message ?? '');
  int _validDays = 7;

  @override
  void dispose() {
    _price.dispose();
    _lead.dispose();
    _message.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_form.currentState!.validate()) return;
    final now = DateTime.now();
    ref.read(rfqControllerProvider.notifier).submitQuote(
      widget.rfq.id,
      SupplierQuote(
        id: widget.existing?.id ?? 'q_${now.microsecondsSinceEpoch}',
        supplierId: widget.supplier.id,
        supplierName: widget.supplier.company,
        supplierVerified: widget.supplier.verified,
        price: double.parse(_price.text.replaceAll(',', '')),
        currency: widget.rfq.currency,
        unit: widget.rfq.unit,
        leadTimeDays: int.tryParse(_lead.text) ?? 14,
        validUntil: now.add(Duration(days: _validDays)),
        message: _message.text.trim(),
        createdAt: now,
      ),
    );
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Quote sent to ${widget.rfq.buyerCompany}')));
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.rfq;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.existing == null ? 'Submit quote' : 'Revise quote', style: AppTheme.display(24)),
            const SizedBox(height: 4),
            Text('${formatNumber(r.quantity)} ${r.unit} · ${r.incoterm} ${r.destination}', style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _price,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                    decoration: InputDecoration(labelText: 'Your price', prefixText: currencySymbol(r.currency), suffixText: '/${r.unit}'),
                    validator: (v) => (double.tryParse((v ?? '').replaceAll(',', '')) ?? 0) <= 0 ? 'Enter a price' : null,
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 120,
                  child: TextFormField(
                    controller: _lead,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(labelText: 'Lead time', suffixText: 'days'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              initialValue: _validDays,
              decoration: const InputDecoration(labelText: 'Offer valid for'),
              items: const [
                DropdownMenuItem(value: 3, child: Text('3 days')),
                DropdownMenuItem(value: 7, child: Text('7 days')),
                DropdownMenuItem(value: 14, child: Text('14 days')),
                DropdownMenuItem(value: 30, child: Text('30 days')),
              ],
              onChanged: (v) => setState(() => _validDays = v!),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _message,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Message to buyer', hintText: 'Quality, samples, payment terms…', alignLabelWithHint: true),
            ),
            const SizedBox(height: 18),
            GoldButton(label: 'Send quote', icon: Icons.send_rounded, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}
