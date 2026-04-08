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

type ImpactStyle = 'light' | 'medium' | 'heavy';

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

/**
 * Scale an impact style using the user's intensity preference.
 *
 * - light: downgrades stronger requests
 * - medium: uses requested style as-is
 * - heavy: upgrades lighter requests
 */
function scaledImpact(requested: ImpactStyle): ImpactStyle | null {
  if (intensity === 'off') return null;
  const order: ImpactStyle[] = ['light', 'medium', 'heavy'];
  const reqIdx = order.indexOf(requested);
  const adjustment = intensity === 'light' ? -1 : intensity === 'heavy' ? 1 : 0;
  const scaledIdx = Math.min(2, Math.max(0, reqIdx + adjustment));
  return order[scaledIdx];
}

export function trigger(): void {
  if (!enabled) return;
  // Use medium as the baseline so light/medium/heavy settings feel distinct.
  const scaled = scaledImpact('medium');
  if (scaled === null) return;
  if (native) {
    native.triggerImpact(scaled);
  } else {
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(map[scaled]);
  }
}

export function triggerImpact(
  style: 'light' | 'medium' | 'heavy' = 'light',
): void {
  const scaled = scaledImpact(style);
  if (scaled === null) return;
  if (native) {
    native.triggerImpact(scaled);
  } else {
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(map[scaled]);
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
