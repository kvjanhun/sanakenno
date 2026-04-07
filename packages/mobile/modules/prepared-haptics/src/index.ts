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
let intensity: 'off' | 'light' | 'medium' | 'heavy' = 'heavy';

export function setEnabled(value: boolean): void {
  enabled = value;
  intensity = value ? 'heavy' : 'off';
}

export function setIntensity(
  value: 'off' | 'light' | 'medium' | 'heavy',
): void {
  intensity = value;
  enabled = value !== 'off';
}

/** Cap an impact style to the user's intensity preference. */
function cappedImpact(
  requested: 'light' | 'medium' | 'heavy',
): 'light' | 'medium' | 'heavy' | null {
  if (intensity === 'off') return null;
  const order: Array<'light' | 'medium' | 'heavy'> = [
    'light',
    'medium',
    'heavy',
  ];
  const cap =
    intensity === 'heavy'
      ? 'heavy'
      : intensity === 'medium'
        ? 'medium'
        : 'light';
  const reqIdx = order.indexOf(requested);
  const capIdx = order.indexOf(cap);
  return order[Math.min(reqIdx, capIdx)];
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
  const capped = cappedImpact(style);
  if (capped === null) return;
  if (native) {
    native.triggerImpact(capped);
  } else {
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(map[capped]);
  }
}

export function triggerNotification(
  type: 'success' | 'error' | 'warning' = 'success',
): void {
  if (!enabled) return;
  // For light intensity, downgrade notifications to a light impact
  if (intensity === 'light') {
    if (native) {
      native.triggerImpact('light');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    return;
  }
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
