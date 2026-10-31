import '../../pricing/domain/commodity.dart';

enum RfqStatus {
  open('Open'),
  quoted('Quotes received'),
  awarded('Awarded'),
  closed('Closed');

  const RfqStatus(this.label);
  final String label;
}

class SupplierQuote {
  const SupplierQuote({
    required this.id,
    required this.supplierId,
    required this.supplierName,
    required this.price,
    required this.currency,
    required this.unit,
    required this.leadTimeDays,
    required this.validUntil,
    required this.createdAt,
    this.supplierVerified = false,
    this.message = '',
  });

  final String id;
  final String supplierId;
  final String supplierName;
  final bool supplierVerified;
  final double price;
  final String currency;
  final String unit;
  final int leadTimeDays;
  final DateTime validUntil;
  final String message;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'supplierId': supplierId,
    'supplierName': supplierName,
    'supplierVerified': supplierVerified,
    'price': price,
    'currency': currency,
    'unit': unit,
    'leadTimeDays': leadTimeDays,
    'validUntil': validUntil.toIso8601String(),
    'message': message,
    'createdAt': createdAt.toIso8601String(),
  };

  static SupplierQuote fromJson(Map<String, dynamic> j) => SupplierQuote(
    id: j['id'] as String,
    supplierId: j['supplierId'] as String,
    supplierName: j['supplierName'] as String,
    supplierVerified: j['supplierVerified'] as bool? ?? false,
    price: (j['price'] as num).toDouble(),
    currency: j['currency'] as String,
    unit: j['unit'] as String,
    leadTimeDays: j['leadTimeDays'] as int,
    validUntil: DateTime.parse(j['validUntil'] as String),
    message: j['message'] as String? ?? '',
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
}

class Rfq {
  const Rfq({
    required this.id,
    required this.buyerId,
    required this.buyerName,
    required this.buyerCompany,
    required this.buyerCountry,
    required this.commodityId,
    required this.title,
    required this.quantity,
    required this.unit,
    required this.currency,
    required this.incoterm,
    required this.destination,
    required this.deliveryBy,
    required this.createdAt,
    this.listingId,
    this.targetSupplierId,
    this.targetPrice,
    this.notes = '',
    this.quotes = const [],
    this.awardedQuoteId,
    this.closed = false,
  });

  final String id;
  final String buyerId;
  final String buyerName;
  final String buyerCompany;
  final String buyerCountry;
  final String commodityId;
  final String? listingId;

  /// Set when the RFQ was sent from a listing: only that supplier sees it.
  final String? targetSupplierId;
  final String title;
  final double quantity;
  final String unit;
  final double? targetPrice;
  final String currency;
  final String incoterm;
  final String destination;
  final DateTime deliveryBy;
  final String notes;
  final DateTime createdAt;
  final List<SupplierQuote> quotes;
  final String? awardedQuoteId;
  final bool closed;

  Commodity? get commodity => commodityById[commodityId];

  RfqStatus get status {
    if (awardedQuoteId != null) return RfqStatus.awarded;
    if (closed) return RfqStatus.closed;
    if (quotes.isNotEmpty) return RfqStatus.quoted;
    return RfqStatus.open;
  }

  bool get acceptsQuotes => status == RfqStatus.open || status == RfqStatus.quoted;

  bool visibleToSupplier(String supplierId) => targetSupplierId == null || targetSupplierId == supplierId;

  SupplierQuote? quoteFrom(String supplierId) => quotes.where((q) => q.supplierId == supplierId).firstOrNull;

  SupplierQuote? get bestQuote {
    if (quotes.isEmpty) return null;
    return quotes.reduce((a, b) => a.price <= b.price ? a : b);
  }

  Rfq copyWith({List<SupplierQuote>? quotes, String? awardedQuoteId, bool? closed}) => Rfq(
    id: id,
    buyerId: buyerId,
    buyerName: buyerName,
    buyerCompany: buyerCompany,
    buyerCountry: buyerCountry,
    commodityId: commodityId,
    listingId: listingId,
    targetSupplierId: targetSupplierId,
    title: title,
    quantity: quantity,
    unit: unit,
    targetPrice: targetPrice,
    currency: currency,
    incoterm: incoterm,
    destination: destination,
    deliveryBy: deliveryBy,
    notes: notes,
    createdAt: createdAt,
    quotes: quotes ?? this.quotes,
    awardedQuoteId: awardedQuoteId ?? this.awardedQuoteId,
    closed: closed ?? this.closed,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'buyerId': buyerId,
    'buyerName': buyerName,
    'buyerCompany': buyerCompany,
    'buyerCountry': buyerCountry,
    'commodityId': commodityId,
    'listingId': listingId,
    'targetSupplierId': targetSupplierId,
    'title': title,
    'quantity': quantity,
    'unit': unit,
    'targetPrice': targetPrice,
    'currency': currency,
    'incoterm': incoterm,
    'destination': destination,
    'deliveryBy': deliveryBy.toIso8601String(),
    'notes': notes,
    'createdAt': createdAt.toIso8601String(),
    'quotes': quotes.map((q) => q.toJson()).toList(),
    'awardedQuoteId': awardedQuoteId,
    'closed': closed,
  };

  static Rfq? tryParse(Map<String, dynamic> j) {
    try {
      return Rfq(
        id: j['id'] as String,
        buyerId: j['buyerId'] as String,
        buyerName: j['buyerName'] as String,
        buyerCompany: j['buyerCompany'] as String,
        buyerCountry: j['buyerCountry'] as String,
        commodityId: j['commodityId'] as String,
        listingId: j['listingId'] as String?,
        targetSupplierId: j['targetSupplierId'] as String?,
        title: j['title'] as String,
        quantity: (j['quantity'] as num).toDouble(),
        unit: j['unit'] as String,
        targetPrice: (j['targetPrice'] as num?)?.toDouble(),
        currency: j['currency'] as String,
        incoterm: j['incoterm'] as String,
        destination: j['destination'] as String,
        deliveryBy: DateTime.parse(j['deliveryBy'] as String),
        notes: j['notes'] as String? ?? '',
        createdAt: DateTime.parse(j['createdAt'] as String),
        quotes: (j['quotes'] as List? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(SupplierQuote.fromJson)
            .toList(),
        awardedQuoteId: j['awardedQuoteId'] as String?,
        closed: j['closed'] as bool? ?? false,
      );
    } catch (_) {
      return null;
    }
  }
}
