enum CommodityCategory {
  spices('Spices'),
  vegetables('Vegetables'),
  fruits('Fruits'),
  grains('Grains & Rice'),
  pulses('Pulses'),
  oilseeds('Oilseeds'),
  plantation('Tea, Coffee & Nuts');

  const CommodityCategory(this.label);
  final String label;
}

enum MarketScope {
  domestic('Domestic', 'Indian wholesale mandis'),
  international('International', 'Export · FOB India');

  const MarketScope(this.label, this.description);
  final String label;
  final String description;
}

class Commodity {
  const Commodity({
    required this.id,
    required this.name,
    required this.category,
    required this.hsCode,
    required this.domesticRef,
    required this.internationalRef,
    this.agmarknetName,
    this.grade,
  });

  final String id;
  final String name;
  final CommodityCategory category;
  final String hsCode;

  /// Approximate wholesale level in INR/kg. Never displayed: used only as a
  /// sanity bound to reject unit or parsing mistakes in live data.
  final double domesticRef;

  /// Approximate export level in USD/MT, FOB India. Sanity bound only.
  final double internationalRef;

  /// Commodity name as spelled in the Agmarknet dataset, if covered.
  final String? agmarknetName;

  final String? grade;

  double referenceFor(MarketScope scope) =>
      scope == MarketScope.domestic ? domesticRef : internationalRef;
}

/// Traded goods tracked in the Markets section. Only commodities a live
/// source has priced are shown.
const commodityCatalog = <Commodity>[
  // Spices
  Commodity(id: 'cardamom', name: 'Green Cardamom', category: CommodityCategory.spices, hsCode: '0908.31', domesticRef: 2450, internationalRef: 27500, agmarknetName: 'Cardamoms', grade: '7–8 mm bold'),
  Commodity(id: 'black-pepper', name: 'Black Pepper', category: CommodityCategory.spices, hsCode: '0904.11', domesticRef: 660, internationalRef: 7300, agmarknetName: 'Black pepper', grade: 'MG-1 550 GL'),
  Commodity(id: 'turmeric', name: 'Turmeric Finger', category: CommodityCategory.spices, hsCode: '0910.30', domesticRef: 142, internationalRef: 2050, agmarknetName: 'Turmeric', grade: 'Salem / Erode'),
  Commodity(id: 'cumin', name: 'Cumin Seed', category: CommodityCategory.spices, hsCode: '0909.31', domesticRef: 238, internationalRef: 3050, agmarknetName: 'Cummin Seed(Jeera)', grade: 'Europe 99%'),
  Commodity(id: 'red-chilli', name: 'Dry Red Chilli', category: CommodityCategory.spices, hsCode: '0904.21', domesticRef: 158, internationalRef: 2300, agmarknetName: 'Dry Chillies', grade: 'Teja S17'),
  Commodity(id: 'coriander', name: 'Coriander Seed', category: CommodityCategory.spices, hsCode: '0909.21', domesticRef: 82, internationalRef: 1150, agmarknetName: 'Corriander seed', grade: 'Eagle'),
  Commodity(id: 'cloves', name: 'Cloves', category: CommodityCategory.spices, hsCode: '0907.10', domesticRef: 905, internationalRef: 10400, agmarknetName: 'Cloves'),
  Commodity(id: 'fenugreek', name: 'Fenugreek Seed', category: CommodityCategory.spices, hsCode: '0910.99', domesticRef: 62, internationalRef: 920, agmarknetName: 'Methi Seeds'),
  Commodity(id: 'dry-ginger', name: 'Dry Ginger', category: CommodityCategory.spices, hsCode: '0910.12', domesticRef: 225, internationalRef: 2850, agmarknetName: 'Ginger(Dry)'),
  // Vegetables
  Commodity(id: 'onion', name: 'Red Onion', category: CommodityCategory.vegetables, hsCode: '0703.10', domesticRef: 24, internationalRef: 390, agmarknetName: 'Onion', grade: 'Nashik 55 mm+'),
  Commodity(id: 'potato', name: 'Potato', category: CommodityCategory.vegetables, hsCode: '0701.90', domesticRef: 16, internationalRef: 285, agmarknetName: 'Potato'),
  Commodity(id: 'tomato', name: 'Tomato', category: CommodityCategory.vegetables, hsCode: '0702.00', domesticRef: 21, internationalRef: 460, agmarknetName: 'Tomato'),
  Commodity(id: 'garlic', name: 'Garlic', category: CommodityCategory.vegetables, hsCode: '0703.20', domesticRef: 112, internationalRef: 1420, agmarknetName: 'Garlic'),
  Commodity(id: 'green-chilli', name: 'Green Chilli', category: CommodityCategory.vegetables, hsCode: '0709.60', domesticRef: 36, internationalRef: 720, agmarknetName: 'Green Chilli'),
  // Fruits
  Commodity(id: 'mango', name: 'Mango', category: CommodityCategory.fruits, hsCode: '0804.50', domesticRef: 68, internationalRef: 1550, agmarknetName: 'Mango'),
  Commodity(id: 'banana', name: 'Banana', category: CommodityCategory.fruits, hsCode: '0803.90', domesticRef: 22, internationalRef: 410, agmarknetName: 'Banana'),
  Commodity(id: 'pomegranate', name: 'Pomegranate', category: CommodityCategory.fruits, hsCode: '0810.90', domesticRef: 95, internationalRef: 1350, agmarknetName: 'Pomegranate', grade: 'Bhagwa'),
  // Grains
  Commodity(id: 'basmati', name: 'Basmati Rice', category: CommodityCategory.grains, hsCode: '1006.30', domesticRef: 86, internationalRef: 1060, grade: '1121 Sella'),
  Commodity(id: 'non-basmati', name: 'Non-Basmati Rice', category: CommodityCategory.grains, hsCode: '1006.30', domesticRef: 34, internationalRef: 430, agmarknetName: 'Rice', grade: 'Common (mandi)'),
  Commodity(id: 'wheat', name: 'Wheat', category: CommodityCategory.grains, hsCode: '1001.99', domesticRef: 25.5, internationalRef: 295, agmarknetName: 'Wheat'),
  Commodity(id: 'maize', name: 'Maize', category: CommodityCategory.grains, hsCode: '1005.90', domesticRef: 22, internationalRef: 265, agmarknetName: 'Maize'),
  // Pulses
  Commodity(id: 'chickpea', name: 'Chickpea (Chana)', category: CommodityCategory.pulses, hsCode: '0713.20', domesticRef: 61, internationalRef: 810, agmarknetName: 'Bengal Gram(Gram)(Whole)'),
  Commodity(id: 'tur', name: 'Pigeon Pea (Tur)', category: CommodityCategory.pulses, hsCode: '0713.60', domesticRef: 98, internationalRef: 1080, agmarknetName: 'Arhar (Tur/Red Gram)(Whole)'),
  // Oilseeds
  Commodity(id: 'groundnut', name: 'Groundnut Kernels', category: CommodityCategory.oilseeds, hsCode: '1202.42', domesticRef: 64, internationalRef: 1260, agmarknetName: 'Groundnut', grade: 'Java 50/60'),
  Commodity(id: 'sesame', name: 'Sesame Seed', category: CommodityCategory.oilseeds, hsCode: '1207.40', domesticRef: 128, internationalRef: 1650, agmarknetName: 'Sesamum(Sesame,Gingelly,Til)', grade: 'Hulled 99.95%'),
  Commodity(id: 'mustard', name: 'Mustard Seed', category: CommodityCategory.oilseeds, hsCode: '1207.50', domesticRef: 58, internationalRef: 720, agmarknetName: 'Mustard'),
  // Plantation
  Commodity(id: 'cashew', name: 'Cashew Kernels', category: CommodityCategory.plantation, hsCode: '0801.32', domesticRef: 790, internationalRef: 7100, grade: 'W320'),
  Commodity(id: 'coffee', name: 'Coffee Robusta', category: CommodityCategory.plantation, hsCode: '0901.11', domesticRef: 365, internationalRef: 4850, grade: 'Cherry AB'),
  Commodity(id: 'tea', name: 'Tea (CTC)', category: CommodityCategory.plantation, hsCode: '0902.40', domesticRef: 248, internationalRef: 2950, grade: 'Assam BOP'),
];

final commodityById = {for (final c in commodityCatalog) c.id: c};
