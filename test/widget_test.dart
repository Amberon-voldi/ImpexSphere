import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:impex_sphere/core/theme/app_colors.dart';
import 'package:impex_sphere/core/widgets/brand_mark.dart';

void main() {
  testWidgets('brand logo renders legibly on the navy theme', (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 200));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.runAsync(() async {
      await tester.pumpWidget(
        const MaterialApp(
          debugShowCheckedModeBanner: false,
          home: ColoredBox(
            color: AppColors.navy900,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  BrandLogo(height: 60),
                  SizedBox(height: 20),
                  ColoredBox(color: Colors.white, child: BrandLogo(height: 40, onDark: false)),
                ],
              ),
            ),
          ),
        ),
      );
      for (final element in find.byType(Image).evaluate()) {
        await precacheImage((element.widget as Image).image, element);
      }
    });
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('ImpexSphere'), findsNWidgets(2));
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/brand_logo.png'));
  });
}
