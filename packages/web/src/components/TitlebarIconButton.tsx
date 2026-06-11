/**
 * Shared animated affordance for fixed-size titlebar icon buttons.
 *
 * @module src/components/TitlebarIconButton
 */

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { animated, useReducedMotion, useSpring } from '@react-spring/web';
import { ICON_SPRING } from '../utils/motion';

/** Props for {@link TitlebarIconButton}. */
export interface TitlebarIconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** Accessible label for the icon-only button. */
  label: string;
  /** Icon element rendered inside the animated wrapper. */
  children: ReactNode;
  /** Fixed square touch target size in CSS pixels. */
  size?: number;
  /** Whether the controlled surface is currently open/active. */
  opened?: boolean;
  /** Extra style for the animated icon wrapper. */
  iconStyle?: CSSProperties;
}

function hiddenIconChild(child: ReactNode): ReactNode {
  if (!isValidElement(child)) return child;

  const props = child.props as { 'aria-hidden'?: string | boolean };
  if (props['aria-hidden'] !== undefined) return child;

  return cloneElement(child as ReactElement<{ 'aria-hidden'?: boolean }>, {
    'aria-hidden': true,
  });
}

/**
 * Render a titlebar icon button with subtle hover, press, and opening motion.
 */
export function TitlebarIconButton({
  label,
  children,
  size = 40,
  opened = false,
  className = '',
  style,
  iconStyle,
  disabled,
  onBlur,
  onFocus,
  onPointerCancel,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerUp,
  ...buttonProps
}: TitlebarIconButtonProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const previousOpenedRef = useRef(false);
  const visualActive = opened || hovered || focused;
  const targetScale = disabled ? 1 : pressed ? 0.96 : visualActive ? 1.045 : 1;
  const targetY = disabled ? 0 : pressed ? 1 : visualActive ? -1 : 0;

  const [spring, api] = useSpring(() => ({
    rotate: 0,
    scale: 1,
    y: 0,
    config: ICON_SPRING,
  }));

  useEffect(() => {
    if (prefersReducedMotion) {
      void api.start({
        rotate: 0,
        scale: 1,
        y: 0,
        immediate: true,
      });
      previousOpenedRef.current = opened;
      return;
    }

    const openedNow = opened && !previousOpenedRef.current && !disabled;
    previousOpenedRef.current = opened;

    if (openedNow) {
      void api.start({
        to: [
          { rotate: 4, scale: 1.08, y: -1, config: ICON_SPRING },
          { rotate: 0, scale: targetScale, y: targetY, config: ICON_SPRING },
        ],
      });
      return;
    }

    void api.start({
      rotate: 0,
      scale: targetScale,
      y: targetY,
      config: ICON_SPRING,
    });
  }, [api, disabled, opened, prefersReducedMotion, targetScale, targetY]);

  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? 'button'}
      aria-label={label}
      disabled={disabled}
      className={`rounded-lg bg-transparent border-none cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-default disabled:opacity-50 ${className}`}
      style={{
        color: 'var(--color-text-primary)',
        height: `${size}px`,
        minHeight: `${size}px`,
        minWidth: `${size}px`,
        padding: 0,
        width: `${size}px`,
        ...style,
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onPointerCancel={(event) => {
        setPressed(false);
        onPointerCancel?.(event);
      }}
      onPointerDown={(event) => {
        setPressed(true);
        onPointerDown?.(event);
      }}
      onPointerEnter={(event) => {
        setHovered(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setHovered(false);
        setPressed(false);
        onPointerLeave?.(event);
      }}
      onPointerUp={(event) => {
        setPressed(false);
        onPointerUp?.(event);
      }}
    >
      <animated.span
        className="inline-flex items-center justify-center"
        style={{
          rotate: spring.rotate.to((value) => `${value}deg`),
          scale: spring.scale,
          transformOrigin: '50% 50%',
          y: spring.y,
          ...iconStyle,
        }}
      >
        {Children.map(children, hiddenIconChild)}
      </animated.span>
    </button>
  );
}
