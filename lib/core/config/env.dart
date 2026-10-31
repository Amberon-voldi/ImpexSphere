/// Build-time configuration, supplied with `--dart-define` (or
/// `--dart-define-from-file=env.json`). Nothing secret is committed.
abstract final class Env {
  /// data.gov.in API key for live Agmarknet mandi prices (domestic).
  static const agmarknetApiKey = String.fromEnvironment('AGMARKNET_API_KEY');

  /// Base URL of an SP International price API serving domestic and
  /// international quotes. See `CustomApiPriceSource` for the contract.
  static const priceApiUrl = String.fromEnvironment('PRICE_API_URL');

  /// Live USD/INR from open.er-api.com (no key needed).
  static const liveFx = bool.fromEnvironment('LIVE_FX', defaultValue: true);

  static bool get hasLivePriceSource => agmarknetApiKey.isNotEmpty || priceApiUrl.isNotEmpty;
}

abstract final class Company {
  static const name = 'SP International Private Limited';
  static const shortName = 'SP International';
  static const website = 'https://spinternationalpvtltd.com';
  static const websiteLabel = 'spinternationalpvtltd.com';
}
