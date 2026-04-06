import { requireNativeModule } from 'expo-modules-core';
import * as Haptics from 'expo-haptics';

let PreparedHaptics: { trigger: () => void } | null = null;
try {
  PreparedHaptics = requireNativeModule('PreparedHaptics');
} catch {
  // Not available until native rebuild
}

export function trigger(): void {
  if (PreparedHaptics) {
    PreparedHaptics.trigger();
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}
