import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/json_store.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/presentation/auth_controller.dart';
import '../domain/rfq.dart';

class RfqController extends Notifier<List<Rfq>> {
  static const _key = 'rfqs.v1';

  JsonStore get _store => ref.read(jsonStoreProvider);

  @override
  List<Rfq> build() {
    final stored = _store.readList(_key).map(Rfq.tryParse).whereType<Rfq>().toList();
    if (stored.isNotEmpty) return stored;
    final seeded = _seed(DateTime.now());
    _persist(seeded);
    return seeded;
  }

  Rfq? byId(String id) => state.where((r) => r.id == id).firstOrNull;

  void create(Rfq rfq) => _set([rfq, ...state]);

  void submitQuote(String rfqId, SupplierQuote quote) => _update(rfqId, (r) {
    final others = r.quotes.where((q) => q.supplierId != quote.supplierId);
    return r.copyWith(quotes: [...others, quote]);
  });

  void award(String rfqId, String quoteId) => _update(rfqId, (r) => r.copyWith(awardedQuoteId: quoteId));

  void close(String rfqId) => _update(rfqId, (r) => r.copyWith(closed: true));

  void _update(String id, Rfq Function(Rfq) change) => _set([for (final r in state) r.id == id ? change(r) : r]);

  void _set(List<Rfq> next) {
    state = next;
    _persist(next);
  }

  void _persist(List<Rfq> rfqs) => _store.write(_key, rfqs.map((r) => r.toJson()).toList());

  static List<Rfq> _seed(DateTime now) {
    DateTime ago(int h) => now.subtract(Duration(hours: h));
    return [
      Rfq(
        id: 'r_cardamom_dubai',
        buyerId: LocalAuthRepository.demoBuyerId,
        buyerName: 'Aisha Rahman',
        buyerCompany: 'Gulf Fresh Trading LLC',
        buyerCountry: 'United Arab Emirates',
        commodityId: 'cardamom',
        title: 'Green cardamom 7–8 mm for Ramadan retail packs',
        quantity: 4,
        unit: 'MT',
        targetPrice: 27000,
        currency: 'USD',
        incoterm: 'CIF',
        destination: 'Jebel Ali, UAE',
        deliveryBy: now.add(const Duration(days: 40)),
        notes: 'Need uniform colour, moisture < 10%. Lab report mandatory. Partial shipments acceptable.',
        createdAt: ago(30),
        quotes: [
          SupplierQuote(
            id: 'q_1',
            supplierId: 's_idukki',
            supplierName: 'Idukki Highland Spices',
            price: 27650,
            currency: 'USD',
            unit: 'MT',
            leadTimeDays: 14,
            validUntil: now.add(const Duration(days: 7)),
            message: '7.5 mm average, can share pre-shipment sample by courier.',
            createdAt: ago(20),
          ),
        ],
      ),
      Rfq(
        id: 'r_onion_colombo',
        buyerId: 'u_lanka',
        buyerName: 'Dilan Perera',
        buyerCompany: 'Lanka Produce Importers',
        buyerCountry: 'Sri Lanka',
        commodityId: 'onion',
        title: 'Red onion 45–55 mm, 4 × 40ft reefer containers',
        quantity: 116,
        unit: 'MT',
        targetPrice: 380,
        currency: 'USD',
        incoterm: 'CFR',
        destination: 'Colombo, Sri Lanka',
        deliveryBy: now.add(const Duration(days: 21)),
        notes: 'Fortnightly shipments. Phytosanitary certificate required.',
        createdAt: ago(9),
      ),
      Rfq(
        id: 'r_cumin_rotterdam',
        buyerId: 'u_nl',
        buyerName: 'Pieter de Vries',
        buyerCompany: 'Holland Spice Imports B.V.',
        buyerCountry: 'Netherlands',
        commodityId: 'cumin',
        title: 'Cumin seed EU MRL compliant — annual contract',
        quantity: 120,
        unit: 'MT',
        currency: 'USD',
        incoterm: 'CIF',
        destination: 'Rotterdam, Netherlands',
        deliveryBy: now.add(const Duration(days: 60)),
        notes: 'Must meet EU pesticide MRLs, steam sterilised. Monthly 10 MT call-offs.',
        createdAt: ago(52),
        quotes: [
          SupplierQuote(
            id: 'q_2',
            supplierId: 's_unjha',
            supplierName: 'Unjha Seed & Spice Co.',
            supplierVerified: true,
            price: 3180,
            currency: 'USD',
            unit: 'MT',
            leadTimeDays: 10,
            validUntil: now.add(const Duration(days: 10)),
            message: 'EU-grade lot, steam sterilisation included. Eurofins report on request.',
            createdAt: ago(40),
          ),
        ],
      ),
      Rfq(
        id: 'r_turmeric_domestic',
        buyerId: 'u_masala',
        buyerName: 'Kavita Shah',
        buyerCompany: 'Shah Masala Works',
        buyerCountry: 'India',
        commodityId: 'turmeric',
        title: 'Turmeric fingers for grinding, Erode / Salem origin',
        quantity: 15000,
        unit: 'kg',
        targetPrice: 138,
        currency: 'INR',
        incoterm: 'EXW',
        destination: 'Ahmedabad, Gujarat',
        deliveryBy: now.add(const Duration(days: 12)),
        createdAt: ago(5),
      ),
    ];
  }
}

final rfqControllerProvider = NotifierProvider<RfqController, List<Rfq>>(RfqController.new);

/// RFQs relevant to the signed-in user: their own (buyer) or the open board
/// plus anything sent directly to them (supplier).
final myRfqsProvider = Provider<List<Rfq>>((ref) {
  final user = ref.watch(currentUserProvider);
  final rfqs = ref.watch(rfqControllerProvider);
  if (user == null) return const [];
  if (user.isBuyer) return rfqs.where((r) => r.buyerId == user.id).toList();
  return rfqs.where((r) => r.visibleToSupplier(user.id)).toList();
});
