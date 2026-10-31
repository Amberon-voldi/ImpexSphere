import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/common.dart';
import '../../pricing/domain/commodity.dart';
import '../data/listing_repository.dart';
import '../domain/listing.dart';
import 'listing_card.dart';

/// Searchable product catalogue, embedded in the buyer's Trade tab.
class ProductBrowser extends ConsumerStatefulWidget {
  const ProductBrowser({super.key, this.commodityId});

  final String? commodityId;

  @override
  ConsumerState<ProductBrowser> createState() => _ProductBrowserState();
}

class _ProductBrowserState extends ConsumerState<ProductBrowser> {
  CommodityCategory? _category;
  String? _commodityId;
  String _query = '';
  bool _verifiedOnly = false;

  @override
  void initState() {
    super.initState();
    _commodityId = widget.commodityId;
  }

  @override
  void didUpdateWidget(ProductBrowser old) {
    super.didUpdateWidget(old);
    if (widget.commodityId != old.commodityId) _commodityId = widget.commodityId;
  }

  @override
  Widget build(BuildContext context) {
    final listings = ref.watch(listingsProvider).where(_matches).toList()
      ..sort((a, b) => b.enquiries.compareTo(a.enquiries));

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: TextField(
              onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
              decoration: const InputDecoration(
                hintText: 'Search products, suppliers, origins',
                prefixIcon: Icon(Icons.search_rounded),
                isDense: true,
              ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 4),
              children: [
                if (_commodityId != null)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InputChip(
                      label: Text(commodityById[_commodityId]?.name ?? _commodityId!),
                      selected: true,
                      showCheckmark: false,
                      onDeleted: () => setState(() => _commodityId = null),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    avatar: const Icon(Icons.verified_rounded, size: 16),
                    label: const Text('Verified'),
                    selected: _verifiedOnly,
                    showCheckmark: false,
                    onSelected: (v) => setState(() => _verifiedOnly = v),
                  ),
                ),
                for (final c in CommodityCategory.values)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(c.label),
                      selected: _category == c,
                      showCheckmark: false,
                      onSelected: (s) => setState(() => _category = s ? c : null),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (listings.isEmpty)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: EmptyState(
              icon: Icons.inventory_2_outlined,
              title: 'No products found',
              message: 'Try other filters, or post a request and let suppliers come to you.',
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
            sliver: SliverLayoutBuilder(
              builder: (context, constraints) {
                final columns = (constraints.crossAxisExtent / 420).floor().clamp(1, 3);
                if (columns == 1) {
                  return SliverList.separated(
                    itemCount: listings.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (_, i) => ListingCard(listing: listings[i]),
                  );
                }
                return SliverGrid.builder(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: columns,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    mainAxisExtent: 168,
                  ),
                  itemCount: listings.length,
                  itemBuilder: (_, i) => ListingCard(listing: listings[i]),
                );
              },
            ),
          ),
      ],
    );
  }

  bool _matches(Listing l) {
    if (!l.active) return false;
    if (_commodityId != null && l.commodityId != _commodityId) return false;
    if (_category != null && l.category != _category) return false;
    if (_verifiedOnly && !l.supplierVerified) return false;
    if (_query.isEmpty) return true;
    return [l.title, l.supplierName, l.origin, l.commodity?.name ?? ''].any((s) => s.toLowerCase().contains(_query));
  }
}
