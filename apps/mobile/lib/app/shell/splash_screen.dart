import 'package:flutter/material.dart';

import '../../core/widgets/brand_loader.dart';

/// Shown while the stored session is restored from secure storage.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) => const Scaffold(body: BrandLoader());
}
