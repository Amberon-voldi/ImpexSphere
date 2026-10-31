import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/json_store.dart';
import '../domain/listing.dart';
import 'seed_listings.dart';

/// Local listing store for the mock phase. The notifier API is what screens
/// use, so a remote implementation can replace it without UI changes.
class ListingsController extends Notifier<List<Listing>> {
  static const _key = 'listings.v1';

  JsonStore get _store => ref.read(jsonStoreProvider);

  @override
  List<Listing> build() {
    final stored = _store.readList(_key).map(Listing.tryParse).whereType<Listing>().toList();
    if (stored.isNotEmpty) return stored;
    final seeded = seedListings(DateTime.now());
    _persist(seeded);
    return seeded;
  }

  Listing? byId(String id) => state.where((l) => l.id == id).firstOrNull;

  void upsert(Listing listing) {
    final exists = state.any((l) => l.id == listing.id);
    _set(exists ? [for (final l in state) l.id == listing.id ? listing : l] : [listing, ...state]);
  }

  void setActive(String id, bool active) => _set([for (final l in state) l.id == id ? l.copyWith(active: active) : l]);

  void delete(String id) => _set(state.where((l) => l.id != id).toList());

  void recordView(String id) => _set([for (final l in state) l.id == id ? l.copyWith(views: l.views + 1) : l]);

  void recordEnquiry(String id) => _set([for (final l in state) l.id == id ? l.copyWith(enquiries: l.enquiries + 1) : l]);

  void _set(List<Listing> next) {
    state = next;
    _persist(next);
  }

  void _persist(List<Listing> listings) => _store.write(_key, listings.map((l) => l.toJson()).toList());
}

final listingsProvider = NotifierProvider<ListingsController, List<Listing>>(ListingsController.new);
