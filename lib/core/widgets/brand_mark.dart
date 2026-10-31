import 'package:flutter/material.dart';

/// The ImpexSphere wordmark from `assets/images/logo.png`.
///
/// The source artwork is navy lettering with a gold dot on an off-white
/// background. On dark surfaces [onDark] applies a colour matrix that makes
/// the background transparent, turns the navy lettering ivory and keeps the
/// gold dot gold, so the original file works on the navy theme.
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.height = 28, this.onDark = true});

  static const asset = 'assets/images/logo.png';

  /// Source aspect ratio (2746 × 456).
  static const aspectRatio = 2746 / 456;

  final double height;
  final bool onDark;

  // Solved so that, per channel (0–255 offsets):
  //   off-white bg (0.98, 0.98, 0.97) → alpha 0
  //   navy  (0.04, 0.12, 0.29)        → ivory (0.96, 0.94, 0.90), alpha 1
  //   gold  (0.78, 0.65, 0.35)        → gold  (0.83, 0.65, 0.29), alpha 1
  static const _darkMatrix = ColorFilter.matrix([
    -0.1757, 0, 0, 0, 246.6, //
    -0.3920, 0, 0, 0, 243.8, //
    -0.8240, 0, 0, 0, 237.9, //
    0.134, 0, -1.656, 0, 376.1, //
  ]);

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      asset,
      height: height,
      width: height * aspectRatio,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      semanticLabel: 'ImpexSphere',
    );
    if (!onDark) return image;
    // The matrix has non-zero offsets, so it would also paint the fully
    // transparent pixels around the logo; clip it to the image's own box.
    return ClipRect(child: ColorFiltered(colorFilter: _darkMatrix, child: image));
  }
}
