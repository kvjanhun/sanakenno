import { requireNativeModule } from 'expo-modules-core';
import * as Haptics from 'expo-haptics';

interface PreparedHapticsNative {
  trigger: () => void;
  triggerImpact: (style: string) => void;
  triggerNotification: (type: string) => void;
}

let native: PreparedHapticsNative | null = null;
try {
  native = requireNativeModule('PreparedHaptics');
} catch {
  // Not available until native rebuild
}

let enabled = true;

export function setEnabled(value: boolean): void {
  enabled = value;
}

export function trigger(): void {
  if (!enabled) return;
  if (native) {
    native.trigger();
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function triggerImpact(
  style: 'light' | 'medium' | 'heavy' = 'light',
): void {
  if (!enabled) return;
  if (native) {
    native.triggerImpact(style);
  } else {
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(map[style]);
  }
}

export function triggerNotification(
  type: 'success' | 'error' | 'warning' = 'success',
): void {
  if (!enabled) return;
  if (native) {
    native.triggerNotification(type);
  } else {
    const map = {
      success: Haptics.NotificationFeedbackType.Success,
      error: Haptics.NotificationFeedbackType.Error,
      warning: Haptics.NotificationFeedbackType.Warning,
    };
    Haptics.notificationAsync(map[type]);
  }
}
