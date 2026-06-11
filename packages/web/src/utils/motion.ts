import type { SpringConfig } from '@react-spring/web';

/** Subtle spring used for modal and popover presence. */
export const PRESENCE_SPRING: SpringConfig = {
  tension: 300,
  friction: 34,
  mass: 0.85,
  clamp: true,
};

/** Slightly snappier spring for icon hover and press affordances. */
export const ICON_SPRING: SpringConfig = {
  tension: 420,
  friction: 30,
  mass: 0.75,
};

/** Measured-height panels need a little damping to avoid layout bounce. */
export const COLLAPSE_SPRING: SpringConfig = {
  tension: 260,
  friction: 32,
  mass: 0.9,
  clamp: true,
};

/** Small dropdown panels should feel attached to their trigger. */
export const DROPDOWN_SPRING: SpringConfig = {
  tension: 320,
  friction: 34,
  mass: 0.85,
  clamp: true,
};
