import 'package:flutter_test/flutter_test.dart';
import 'package:impex_sphere/features/pricing/data/agmarknet_source.dart';
import 'package:impex_sphere/features/pricing/domain/commodity.dart';

void main() {
  final turmeric = commodityById['turmeric']!;
  final fetchedAt = DateTime(2026, 10, 31, 11);

  Map<String, dynamic> record(String date, Object modal, {Object min = '', Object max = '', String market = 'Erode'}) => {
    'state': 'Tamil Nadu',
    'district': 'Erode',
    'market': market,
    'commodity': 'Turmeric',
    'arrival_date': date,
    'min_price': min,
    'max_price': max,
    'modal_price': modal,
  };

  test('uses the median modal price of the latest arrival date, in ₹/kg', () {
    final q = AgmarknetPriceSource.parseRecords(turmeric, [
      record('30/10/2026', '20000'), // older date is ignored
      record('31/10/2026', '13800', min: '13000', max: '14500'),
      record('31/10/2026', '14200', min: '13900', max: '15000'),
      record('31/10/2026', 14600, min: '14000', max: '15200'),
    ], fetchedAt: fetchedAt)!;

    expect(q.price, 142);
    expect(q.low, 130);
    expect(q.high, 152);
    expect(q.currency, 'INR');
    expect(q.unit, 'kg');
    expect(q.note, contains('Median of 3 mandis'));
  });

  test('drops malformed and implausible records', () {
    final q = AgmarknetPriceSource.parseRecords(turmeric, [
      record('31/10/2026', 'n/a'),
      record('not-a-date', '14000'),
      record('31/10/2026', '9'), // ₹0.09/kg: a data-entry error
      record('31/10/2026', '14000', market: 'Salem'),
    ], fetchedAt: fetchedAt)!;

    expect(q.price, 140);
    expect(q.note, startsWith('Salem'));
  });

  test('ignores records for other commodities even if the API returns them', () {
    final q = AgmarknetPriceSource.parseRecords(turmeric, [
      record('31/10/2026', '14000'),
      {...record('31/10/2026', '8450'), 'commodity': 'Coriander(Leaves)'},
      {...record('31/10/2026', '8450'), 'commodity': 'Onion'},
    ], fetchedAt: fetchedAt)!;
    expect(q.price, 140);
    expect(q.note, startsWith('Erode'));
  });

  test('returns null when nothing usable is reported', () {
    expect(AgmarknetPriceSource.parseRecords(turmeric, [], fetchedAt: fetchedAt), isNull);
    expect(AgmarknetPriceSource.parseRecords(turmeric, [record('31/10/2026', '')], fetchedAt: fetchedAt), isNull);
  });
}
