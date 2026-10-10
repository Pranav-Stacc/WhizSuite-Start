import '../../../core/contracts/contracts.g.dart';

/// Platform-specific feed grid layout (columns + tile aspect ratio).
class PlannerPlatformLayout {
  const PlannerPlatformLayout({required this.columns, required this.aspectRatio});

  final int columns;
  final double aspectRatio;

  static PlannerPlatformLayout forPlatform(String? platform) {
    switch (platform) {
      case Platforms.facebook:
        return const PlannerPlatformLayout(columns: 2, aspectRatio: 1);
      case Platforms.linkedin:
        return const PlannerPlatformLayout(columns: 2, aspectRatio: 4 / 3);
      case Platforms.x:
        return const PlannerPlatformLayout(columns: 1, aspectRatio: 16 / 9);
      case Platforms.tiktok:
        return const PlannerPlatformLayout(columns: 3, aspectRatio: 9 / 16);
      case Platforms.youtube:
        return const PlannerPlatformLayout(columns: 2, aspectRatio: 16 / 9);
      default:
        return const PlannerPlatformLayout(columns: 3, aspectRatio: 4 / 5);
    }
  }
}
