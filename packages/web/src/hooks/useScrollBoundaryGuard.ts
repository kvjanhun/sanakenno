/**
 * Touch-scroll guard for bounded app surfaces.
 *
 * @module src/hooks/useScrollBoundaryGuard
 */

import { useEffect, type RefObject } from 'react';

function isScrollable(element: HTMLElement): boolean {
  const overflowY = window.getComputedStyle(element).overflowY;
  return (
    /(auto|scroll|overlay)/.test(overflowY) &&
    element.scrollHeight > element.clientHeight + 1
  );
}

function findScrollTarget(
  target: EventTarget | null,
  root: HTMLElement,
): HTMLElement {
  if (!(target instanceof Element)) return root;

  let element: Element | null = target;
  while (element && element !== root) {
    if (element instanceof HTMLElement && isScrollable(element)) {
      return element;
    }
    element = element.parentElement;
  }

  return root;
}

/**
 * Prevent iOS elastic overscroll on a bounded scroll surface.
 *
 * Normal scrolling is allowed whenever the active scroll target has room in the
 * gesture direction. Gestures that would pull past the top/bottom, or gestures
 * on content that fits without scrolling, are cancelled before WebKit chains
 * them to the root viewport.
 */
export function useScrollBoundaryGuard(
  ref: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const rootElement = ref.current;
    if (!rootElement) return;
    const scrollRoot: HTMLElement = rootElement;

    let lastTouchY: number | null = null;

    function getTouch(event: TouchEvent): Touch | null {
      return event.touches.length === 1 ? event.touches.item(0) : null;
    }

    function handleTouchStart(event: TouchEvent): void {
      const touch = getTouch(event);
      lastTouchY = touch ? touch.clientY : null;
    }

    function handleTouchMove(event: TouchEvent): void {
      const touch = getTouch(event);
      if (!touch) return;

      if (lastTouchY === null) {
        lastTouchY = touch.clientY;
        return;
      }

      const deltaY = touch.clientY - lastTouchY;
      lastTouchY = touch.clientY;

      const scrollTarget = findScrollTarget(event.target, scrollRoot);
      const maxScrollTop =
        scrollTarget.scrollHeight - scrollTarget.clientHeight;
      if (maxScrollTop <= 1) {
        event.preventDefault();
        return;
      }

      const atTop = scrollTarget.scrollTop <= 0;
      const atBottom = scrollTarget.scrollTop >= maxScrollTop - 1;
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    }

    function handleTouchEnd(): void {
      lastTouchY = null;
    }

    scrollRoot.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    scrollRoot.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    scrollRoot.addEventListener('touchend', handleTouchEnd, { passive: true });
    scrollRoot.addEventListener('touchcancel', handleTouchEnd, {
      passive: true,
    });

    return () => {
      scrollRoot.removeEventListener('touchstart', handleTouchStart);
      scrollRoot.removeEventListener('touchmove', handleTouchMove);
      scrollRoot.removeEventListener('touchend', handleTouchEnd);
      scrollRoot.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [ref]);
}
