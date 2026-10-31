import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../marketplace/data/listing_repository.dart';
import '../../marketplace/domain/listing.dart';
import '../../pricing/domain/commodity.dart';
import '../../pricing/domain/market_snapshot.dart';
import '../../pricing/presentation/pricing_providers.dart';
import '../data/rfq_repository.dart';
import '../domain/rfq.dart';

class CreateRfqScreen extends ConsumerStatefulWidget {
  const CreateRfqScreen({super.key, this.listingId, this.commodityId});

  final String? listingId;
  final String? commodityId;

  @override
  ConsumerState<CreateRfqScreen> createState() => _CreateRfqScreenState();
}

class _CreateRfqScreenState extends ConsumerState<CreateRfqScreen> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _quantity = TextEditingController();
  final _target = TextEditingController();
  final _destination = TextEditingController();
  final _notes = TextEditingController();

  late String _commodityId;
  Listing? _listing;
  bool _export = true;
  String _incoterm = 'CIF';
  DateTime _deliveryBy = DateTime.now().add(const Duration(days: 30));
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    _listing = widget.listingId == null ? null : ref.read(listingsProvider.notifier).byId(widget.listingId!);
    _commodityId = _listing?.commodityId ?? widget.commodityId ?? commodityCatalog.first.id;
    if (_listing case final l?) {
      _export = l.currency == 'USD';
      _incoterm = l.incoterms.first;
      _title.text = l.title;
      _quantity.text = l.moq.toStringAsFixed(0);
    } else {
      _title.text = commodityById[_commodityId]!.name;
    }
    if (user != null) _destination.text = user.location;
  }

  @override
  void dispose() {
    for (final c in [_title, _quantity, _target, _destination, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    final user = ref.read(currentUserProvider)!;
    setState(() => _saving = true);
    await Future<void>.delayed(const Duration(milliseconds: 350));
    final rfq = Rfq(
      id: 'r_${DateTime.now().microsecondsSinceEpoch}',
      buyerId: user.id,
      buyerName: user.name,
      buyerCompany: user.company,
      buyerCountry: user.country,
      commodityId: _commodityId,
      listingId: _listing?.id,
      targetSupplierId: _listing?.supplierId,
      title: _title.text.trim(),
      quantity: double.parse(_quantity.text.replaceAll(',', '')),
      unit: _export ? 'MT' : 'kg',
      targetPrice: double.tryParse(_target.text.replaceAll(',', '')),
      currency: _export ? 'USD' : 'INR',
      incoterm: _incoterm,
      destination: _destination.text.trim(),
      deliveryBy: _deliveryBy,
      notes: _notes.text.trim(),
      createdAt: DateTime.now(),
    );
    ref.read(rfqControllerProvider.notifier).create(rfq);
    if (_listing != null) ref.read(listingsProvider.notifier).recordEnquiry(_listing!.id);
    if (!mounted) return;
    context.pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(_listing == null ? 'RFQ posted to verified suppliers' : 'Quote request sent to ${_listing!.supplierName}')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(marketSnapshotProvider).value;
    final quote = snapshot?.quote(_commodityId, _export ? MarketScope.international : MarketScope.domestic);
    final currency = _export ? DisplayCurrency.usd : DisplayCurrency.inr;
    final market = quote == null ? null : snapshot!.convert(quote.price, quote.currency, currency);
    final unit = _export ? 'MT' : 'kg';

    return Scaffold(
      appBar: AppBar(title: Text(_listing == null ? 'New RFQ' : 'Request a quote')),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: GoldButton(label: _listing == null ? 'Post RFQ' : 'Send request', icon: Icons.send_rounded, loading: _saving, onPressed: _submit),
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            if (_listing case final l?)
              SurfaceCard(
                highlighted: true,
                child: Row(
                  children: [
                    const Icon(Icons.storefront_outlined, color: AppColors.gold),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Sent privately to ${l.supplierName}. Asking ${formatMoney(l.price, l.currency)}/${l.unit}, MOQ ${formatNumber(l.moq)} ${l.unit}.',
                        style: const TextStyle(color: AppColors.textSecondary, height: 1.4),
                      ),
                    ),
                  ],
                ),
              )
            else
              DropdownButtonFormField<String>(
                initialValue: _commodityId,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Commodity'),
                items: [for (final c in commodityCatalog) DropdownMenuItem(value: c.id, child: Text(c.name))],
                onChanged: (v) => setState(() {
                  _commodityId = v!;
                  _title.text = commodityById[v]!.name;
                }),
              ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'What do you need?', hintText: 'Product, grade and use'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            if (_listing == null) ...[
              SegmentedButton<bool>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: true, label: Text(r'Import · $/MT')),
                  ButtonSegment(value: false, label: Text('Domestic · ₹/kg')),
                ],
                selected: {_export},
                onSelectionChanged: (s) => setState(() {
                  _export = s.first;
                  _incoterm = _export ? 'CIF' : 'EXW';
                }),
              ),
              const SizedBox(height: 12),
            ],
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _quantity,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                    decoration: InputDecoration(labelText: 'Quantity', suffixText: unit),
                    validator: (v) {
                      final n = double.tryParse((v ?? '').replaceAll(',', ''));
                      if (n == null || n <= 0) return 'Enter quantity';
                      if (_listing != null && n < _listing!.moq) return 'MOQ is ${formatNumber(_listing!.moq)}';
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _target,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                    decoration: InputDecoration(
                      labelText: 'Target price (optional)',
                      prefixText: _export ? r'$ ' : '₹ ',
                      suffixText: '/$unit',
                    ),
                  ),
                ),
              ],
            ),
            if (market != null) ...[
              const SizedBox(height: 8),
              Text(
                'Market now: ${formatMoney(market, currency.code)}/${currency.unit} (${quote!.origin.label.toLowerCase()})',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5),
              ),
            ],
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _incoterm,
              decoration: const InputDecoration(labelText: 'Incoterm'),
              items: [for (final t in incotermOptions) DropdownMenuItem(value: t, child: Text(t))],
              onChanged: (v) => setState(() => _incoterm = v!),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _destination,
              decoration: const InputDecoration(labelText: 'Destination port / city', prefixIcon: Icon(Icons.place_outlined)),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _deliveryBy,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (picked != null) setState(() => _deliveryBy = picked);
              },
              child: InputDecorator(
                decoration: const InputDecoration(labelText: 'Deliver by', prefixIcon: Icon(Icons.event_outlined)),
                child: Text(formatDate(_deliveryBy)),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Specifications & notes',
                hintText: 'Moisture, packaging, certifications, payment terms…',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Suppliers see your company name and country. Contact details are shared only when you accept a quote.',
              style: AppTheme.display(13, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
