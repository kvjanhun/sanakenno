/**
 * Measured-height spring wrapper for expand/collapse panels.
 *
 * @module src/components/SpringCollapse
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { animated, useReducedMotion, useSpring } from '@react-spring/web';
import { COLLAPSE_SPRING } from '../utils/motion';

/** Props for {@link SpringCollapse}. */
export interface SpringCollapseProps {
  /** Whether the content should be expanded. */
  open: boolean;
  /** Collapsible panel content. */
  children: ReactNode;
  /** Optional class name for the animated outer element. */
  className?: string;
  /** Optional style for the animated outer element. */
  style?: CSSProperties;
  /** Optional class name for the measured inner element. */
  innerClassName?: string;
  /** Optional style for the measured inner element. */
  innerStyle?: CSSProperties;
}

/**
 * Animate between measured content height and zero without relying on `auto`.
 */
export function SpringCollapse({
  open,
  children,
  className = '',
  style,
  innerClassName = '',
  innerStyle,
}: SpringCollapseProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) setRendered(true);
    else if (prefersReducedMotion === true) setRendered(false);
  }, [open, prefersReducedMotion]);

  useEffect(() => {
    if (!rendered) return;
    const element = contentRef.current;
    if (!element) return;

    const updateHeight = () => setHeight(element.scrollHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children, rendered]);

  const spring = useSpring({
    height: open ? height : 0,
    opacity: open ? 1 : 0,
    y: open ? 0 : -4,
    config: COLLAPSE_SPRING,
    immediate: prefersReducedMotion === true,
    onRest: () => {
      if (!open) setRendered(false);
    },
  });

  return (
    <animated.div
      aria-hidden={!open || !rendered}
      className={className}
      style={{
        height: spring.height,
        opacity: spring.opacity,
        overflow: 'hidden',
        pointerEvents: open ? 'auto' : 'none',
        ...style,
      }}
    >
      {rendered && (
        <animated.div
          ref={contentRef}
          className={innerClassName}
          style={{
            y: spring.y,
            ...innerStyle,
          }}
        >
          {children}
        </animated.div>
      )}
    </animated.div>
  );
}
