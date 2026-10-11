import 'package:flutter/material.dart';

import '../../core/brand/app_brand.dart';
import '../../core/widgets/brand_loader.dart';

/// Shown while the stored session is restored from secure storage.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) => const Scaffold(
        backgroundColor: AppBrand.splashBackground,
        body: BrandLoader(),
      );
}
