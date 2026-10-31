import '../../pricing/domain/commodity.dart';

const incotermOptions = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'];
const certificationOptions = ['FSSAI', 'APEDA', 'Spices Board', 'ISO 22000', 'HACCP', 'Organic (NPOP)', 'USDA Organic', 'Halal', 'Kosher', 'GlobalG.A.P.'];

class Listing {
  const Listing({
    required this.id,
    required this.supplierId,
    required this.supplierName,
    required this.supplierLocation,
    required this.title,
    required this.commodityId,
    required this.description,
    required this.price,
    required this.currency,
    required this.unit,
    required this.moq,
    required this.origin,
    required this.createdAt,
    this.supplierVerified = false,
    this.supplierRating = 0,
    this.grade,
    this.packaging,
    this.leadTimeDays = 14,
    this.monthlyCapacity,
    this.incoterms = const ['FOB'],
    this.certifications = const [],
    this.active = true,
    this.views = 0,
    this.enquiries = 0,
  });

  final String id;
  final String supplierId;
  final String supplierName;
  final String supplierLocation;
  final bool supplierVerified;
  final double supplierRating;
  final String title;
  final String commodityId;
  final String description;

  /// Price per [unit] in [currency]: ₹/kg (domestic) or $/MT (export).
  final double price;
  final String currency;
  final String unit;
  final double moq;
  final String origin;
  final String? grade;
  final String? packaging;
  final int leadTimeDays;
  final String? monthlyCapacity;
  final List<String> incoterms;
  final List<String> certifications;
  final DateTime createdAt;
  final bool active;
  final int views;
  final int enquiries;

  Commodity? get commodity => commodityById[commodityId];
  CommodityCategory get category => commodity?.category ?? CommodityCategory.spices;
  MarketScope get scope => currency == 'INR' ? MarketScope.domestic : MarketScope.international;

  Listing copyWith({bool? active, int? views, int? enquiries}) => Listing(
    id: id,
    supplierId: supplierId,
    supplierName: supplierName,
    supplierLocation: supplierLocation,
    supplierVerified: supplierVerified,
    supplierRating: supplierRating,
    title: title,
    commodityId: commodityId,
    description: description,
    price: price,
    currency: currency,
    unit: unit,
    moq: moq,
    origin: origin,
    grade: grade,
    packaging: packaging,
    leadTimeDays: leadTimeDays,
    monthlyCapacity: monthlyCapacity,
    incoterms: incoterms,
    certifications: certifications,
    createdAt: createdAt,
    active: active ?? this.active,
    views: views ?? this.views,
    enquiries: enquiries ?? this.enquiries,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'supplierId': supplierId,
    'supplierName': supplierName,
    'supplierLocation': supplierLocation,
    'supplierVerified': supplierVerified,
    'supplierRating': supplierRating,
    'title': title,
    'commodityId': commodityId,
    'description': description,
    'price': price,
    'currency': currency,
    'unit': unit,
    'moq': moq,
    'origin': origin,
    'grade': grade,
    'packaging': packaging,
    'leadTimeDays': leadTimeDays,
    'monthlyCapacity': monthlyCapacity,
    'incoterms': incoterms,
    'certifications': certifications,
    'createdAt': createdAt.toIso8601String(),
    'active': active,
    'views': views,
    'enquiries': enquiries,
  };

  static Listing? tryParse(Map<String, dynamic> j) {
    try {
      return Listing(
        id: j['id'] as String,
        supplierId: j['supplierId'] as String,
        supplierName: j['supplierName'] as String,
        supplierLocation: j['supplierLocation'] as String,
        supplierVerified: j['supplierVerified'] as bool? ?? false,
        supplierRating: (j['supplierRating'] as num?)?.toDouble() ?? 0,
        title: j['title'] as String,
        commodityId: j['commodityId'] as String,
        description: j['description'] as String,
        price: (j['price'] as num).toDouble(),
        currency: j['currency'] as String,
        unit: j['unit'] as String,
        moq: (j['moq'] as num).toDouble(),
        origin: j['origin'] as String,
        grade: j['grade'] as String?,
        packaging: j['packaging'] as String?,
        leadTimeDays: j['leadTimeDays'] as int? ?? 14,
        monthlyCapacity: j['monthlyCapacity'] as String?,
        incoterms: (j['incoterms'] as List?)?.cast<String>() ?? const ['FOB'],
        certifications: (j['certifications'] as List?)?.cast<String>() ?? const [],
        createdAt: DateTime.parse(j['createdAt'] as String),
        active: j['active'] as bool? ?? true,
        views: j['views'] as int? ?? 0,
        enquiries: j['enquiries'] as int? ?? 0,
      );
    } catch (_) {
      return null;
    }
  }
}
