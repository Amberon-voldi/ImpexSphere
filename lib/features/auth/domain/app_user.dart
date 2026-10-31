enum UserRole {
  buyer('Buyer', 'Source verified goods and request quotes'),
  supplier('Supplier', 'List products and respond to buyer RFQs');

  const UserRole(this.label, this.tagline);
  final String label;
  final String tagline;
}

class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.company,
    required this.country,
    required this.createdAt,
    this.city,
    this.phone,
    this.businessId,
    this.verified = false,
  });

  final String id;
  final String name;
  final String email;
  final UserRole role;
  final String company;
  final String country;
  final String? city;
  final String? phone;

  /// IEC / GSTIN / company registration number.
  final String? businessId;
  final bool verified;
  final DateTime createdAt;

  bool get isSupplier => role == UserRole.supplier;
  bool get isBuyer => role == UserRole.buyer;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    return (parts.first[0] + (parts.length > 1 ? parts.last[0] : '')).toUpperCase();
  }

  String get location => [city, country].whereType<String>().where((s) => s.isNotEmpty).join(', ');

  AppUser copyWith({
    String? name,
    String? company,
    String? country,
    String? city,
    String? phone,
    String? businessId,
    bool? verified,
  }) => AppUser(
    id: id,
    name: name ?? this.name,
    email: email,
    role: role,
    company: company ?? this.company,
    country: country ?? this.country,
    city: city ?? this.city,
    phone: phone ?? this.phone,
    businessId: businessId ?? this.businessId,
    verified: verified ?? this.verified,
    createdAt: createdAt,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'role': role.name,
    'company': company,
    'country': country,
    'city': city,
    'phone': phone,
    'businessId': businessId,
    'verified': verified,
    'createdAt': createdAt.toIso8601String(),
  };

  static AppUser? tryParse(Object? json) {
    if (json is! Map<String, dynamic>) return null;
    try {
      return AppUser(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        role: UserRole.values.byName(json['role'] as String),
        company: json['company'] as String,
        country: json['country'] as String,
        city: json['city'] as String?,
        phone: json['phone'] as String?,
        businessId: json['businessId'] as String?,
        verified: json['verified'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
    } catch (_) {
      return null;
    }
  }
}
