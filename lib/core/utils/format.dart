import 'package:intl/intl.dart';

String currencySymbol(String currency) => switch (currency) {
  'INR' => '₹',
  'USD' => r'$',
  'EUR' => '€',
  'AED' => 'AED ',
  _ => '$currency ',
};

String formatMoney(double value, String currency, {int? decimals}) {
  final digits = decimals ?? (value.abs() < 100 ? 2 : 0);
  final format = NumberFormat.currency(
    locale: currency == 'INR' ? 'en_IN' : 'en_US',
    symbol: currencySymbol(currency),
    decimalDigits: digits,
  );
  return format.format(value);
}

String formatNumber(num value, {int decimals = 0}) =>
    NumberFormat.decimalPatternDigits(locale: 'en_IN', decimalDigits: decimals).format(value);

String formatPct(double pct) => '${pct >= 0 ? '+' : ''}${pct.toStringAsFixed(2)}%';

String formatSigned(double value, String currency) {
  final sign = value > 0 ? '+' : (value < 0 ? '−' : '');
  return '$sign${formatMoney(value.abs(), currency)}';
}

String timeAgo(DateTime time, {DateTime? now}) {
  final diff = (now ?? DateTime.now()).difference(time);
  if (diff.inSeconds < 10) return 'just now';
  if (diff.inMinutes < 1) return '${diff.inSeconds}s ago';
  if (diff.inHours < 1) return '${diff.inMinutes}m ago';
  if (diff.inDays < 1) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return DateFormat('d MMM y').format(time);
}

String formatDate(DateTime date) => DateFormat('d MMM y').format(date);

String formatTime(DateTime date) => DateFormat('HH:mm:ss').format(date);
