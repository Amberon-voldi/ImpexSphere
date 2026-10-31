import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/format.dart';
import '../../../core/widgets/common.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../pricing/domain/commodity.dart';
import '../../pricing/domain/market_snapshot.dart';
import '../../pricing/presentation/pricing_providers.dart';
import '../data/listing_repository.dart';
import '../domain/listing.dart';

/// Create or edit a supplier listing.
class ListingFormScreen extends ConsumerStatefulWidget {
  const ListingFormScreen({super.key, this.listingId, this.commodityId});

  final String? listingId;

  /// Preselected commodity when listing from a market page.
  final String? commodityId;

  @override
  ConsumerState<ListingFormScreen> createState() => _ListingFormScreenState();
}

class _ListingFormScreenState extends ConsumerState<ListingFormScreen> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _moq = TextEditingController();
  final _origin = TextEditingController();
  final _grade = TextEditingController();
  final _packaging = TextEditingController();
  final _leadTime = TextEditingController(text: '14');
  final _capacity = TextEditingController();

  String _commodityId = commodityCatalog.first.id;
  bool _export = true;
  final Set<String> _incoterms = {'FOB'};
  final Set<String> _certs = {};
  Listing? _editing;

  @override
  void initState() {
    super.initState();
    if (commodityById.containsKey(widget.commodityId)) _commodityId = widget.commodityId!;
    final id = widget.listingId;
    if (id == null) return;
    final l = ref.read(listingsProvider.notifier).byId(id);
    if (l == null) return;
    _editing = l;
    _title.text = l.title;
    _description.text = l.description;
    _price.text = l.price.toStringAsFixed(l.price < 100 ? 2 : 0);
    _moq.text = l.moq.toStringAsFixed(0);
    _origin.text = l.origin;
    _grade.text = l.grade ?? '';
    _packaging.text = l.packaging ?? '';
    _leadTime.text = '${l.leadTimeDays}';
    _capacity.text = l.monthlyCapacity ?? '';
    _commodityId = l.commodityId;
    _export = l.currency == 'USD';
    _incoterms
      ..clear()
      ..addAll(l.incoterms);
    _certs.addAll(l.certifications);
  }

  @override
  void dispose() {
    for (final c in [_title, _description, _price, _moq, _origin, _grade, _packaging, _leadTime, _capacity]) {
      c.dispose();
    }
    super.dispose();
  }

  String? _required(String? v) => (v == null || v.trim().isEmpty) ? 'Required' : null;

  String? _positive(String? v) {
    final n = double.tryParse((v ?? '').replaceAll(',', ''));
    return n == null || n <= 0 ? 'Enter a number above 0' : null;
  }

  void _save() {
    if (!_form.currentState!.validate()) return;
    if (_incoterms.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select at least one Incoterm')));
      return;
    }
    final user = ref.read(currentUserProvider)!;
    String? opt(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
    final listing = Listing(
      id: _editing?.id ?? 'l_${DateTime.now().microsecondsSinceEpoch}',
      supplierId: user.id,
      supplierName: user.company,
      supplierLocation: user.location,
      supplierVerified: user.verified,
      supplierRating: _editing?.supplierRating ?? 0,
      title: _title.text.trim(),
      commodityId: _commodityId,
      description: _description.text.trim(),
      price: double.parse(_price.text.replaceAll(',', '')),
      currency: _export ? 'USD' : 'INR',
      unit: _export ? 'MT' : 'kg',
      moq: double.parse(_moq.text.replaceAll(',', '')),
      origin: _origin.text.trim(),
      grade: opt(_grade),
      packaging: opt(_packaging),
      leadTimeDays: int.tryParse(_leadTime.text) ?? 14,
      monthlyCapacity: opt(_capacity),
      incoterms: incotermOptions.where(_incoterms.contains).toList(),
      certifications: certificationOptions.where(_certs.contains).toList(),
      createdAt: _editing?.createdAt ?? DateTime.now(),
      active: _editing?.active ?? true,
      views: _editing?.views ?? 0,
      enquiries: _editing?.enquiries ?? 0,
    );
    ref.read(listingsProvider.notifier).upsert(listing);
    context.pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(_editing == null ? 'Listing published' : 'Listing updated')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final commodity = commodityById[_commodityId]!;
    final snapshot = ref.watch(marketSnapshotProvider).value;
    final quote = snapshot?.quote(_commodityId, _export ? MarketScope.international : MarketScope.domestic);
    final currency = _export ? DisplayCurrency.usd : DisplayCurrency.inr;
    final marketPrice = quote == null ? null : snapshot!.convert(quote.price, quote.currency, currency);

    return Scaffold(
      appBar: AppBar(title: Text(_editing == null ? 'New listing' : 'Edit listing')),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: GoldButton(label: _editing == null ? 'Publish listing' : 'Save changes', onPressed: _save),
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            _label('Product'),
            DropdownButtonFormField<String>(
              initialValue: _commodityId,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Commodity'),
              items: [
                for (final c in commodityCatalog) DropdownMenuItem(value: c.id, child: Text('${c.name}  ·  ${c.category.label}')),
              ],
              onChanged: (v) => setState(() => _commodityId = v!),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _title,
              decoration: InputDecoration(labelText: 'Listing title', hintText: 'e.g. ${commodity.name} — Export Quality'),
              validator: _required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Description', hintText: 'Quality, processing, lab reports…', alignLabelWithHint: true),
              validator: _required,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: TextFormField(controller: _grade, decoration: const InputDecoration(labelText: 'Grade / spec'))),
                const SizedBox(width: 12),
                Expanded(child: TextFormField(controller: _origin, decoration: const InputDecoration(labelText: 'Origin'), validator: _required)),
              ],
            ),
            _label('Pricing'),
            SegmentedButton<bool>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(value: true, label: Text(r'Export · $/MT')),
                ButtonSegment(value: false, label: Text('Domestic · ₹/kg')),
              ],
              selected: {_export},
              onSelectionChanged: (s) => setState(() => _export = s.first),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _price,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                    decoration: InputDecoration(labelText: 'Price', prefixText: _export ? r'$ ' : '₹ ', suffixText: _export ? '/MT' : '/kg'),
                    validator: _positive,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _moq,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                    decoration: InputDecoration(labelText: 'Minimum order', suffixText: _export ? 'MT' : 'kg'),
                    validator: _positive,
                  ),
                ),
              ],
            ),
            if (marketPrice != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.insights_rounded, size: 16, color: AppColors.gold),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Market reference: ${formatMoney(marketPrice, currency.code)}/${currency.unit} (${quote!.origin.label.toLowerCase()})',
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _price.text = marketPrice.toStringAsFixed(marketPrice < 100 ? 2 : 0),
                    child: const Text('Use'),
                  ),
                ],
              ),
            ],
            _label('Logistics'),
            Row(
              children: [
                Expanded(child: TextFormField(controller: _packaging, decoration: const InputDecoration(labelText: 'Packaging'))),
                const SizedBox(width: 12),
                SizedBox(
                  width: 120,
                  child: TextFormField(
                    controller: _leadTime,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(labelText: 'Lead time', suffixText: 'days'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(controller: _capacity, decoration: const InputDecoration(labelText: 'Supply capacity', hintText: 'e.g. 50 MT / month')),
            const SizedBox(height: 14),
            const Text('Incoterms', style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final t in incotermOptions)
                  FilterChip(
                    label: Text(t),
                    selected: _incoterms.contains(t),
                    onSelected: (s) => setState(() => s ? _incoterms.add(t) : _incoterms.remove(t)),
                  ),
              ],
            ),
            _label('Certifications'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in certificationOptions)
                  FilterChip(
                    label: Text(c),
                    selected: _certs.contains(c),
                    onSelected: (s) => setState(() => s ? _certs.add(c) : _certs.remove(c)),
                  ),
              ],
            ),
            if (_editing != null) ...[
              const SizedBox(height: 28),
              TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: AppColors.negative),
                onPressed: _confirmDelete,
                icon: const Icon(Icons.delete_outline_rounded),
                label: const Text('Delete listing'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete listing?'),
        content: const Text('Buyers will no longer see it. This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.negative),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    ref.read(listingsProvider.notifier).delete(_editing!.id);
    context.go('/trade');
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(top: 24, bottom: 12),
    child: Text(text, style: AppTheme.display(20)),
  );
}
