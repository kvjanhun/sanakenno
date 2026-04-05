/**
 * Grid of 7 center letter buttons showing variation stats.
 *
 * Each button displays the center letter, word count, max score,
 * and pangram count. The active center is highlighted.
 *
 * @module src/components/admin/VariationsGrid
 */

import type { VariationData } from '../../store/useAdminStore.js';

interface VariationsGridProps {
  variations: VariationData[];
  activeCenter: string;
  onSelect: (center: string) => void;
}

export function VariationsGrid({
  variations,
  activeCenter,
  onSelect,
}: VariationsGridProps) {
  if (variations.length === 0) return null;

  return (
    <div className="grid grid-cols-7 gap-1">
      {variations.map((v) => {
        const isActive = v.center === activeCenter;
        return (
          <button
            key={v.center}
            type="button"
            onClick={() => onSelect(v.center)}
            className="p-2 rounded text-center cursor-pointer"
            style={{
              backgroundColor: isActive
                ? 'var(--color-accent)'
                : 'var(--color-bg-secondary)',
              color: isActive ? '#fff' : 'var(--color-text-primary)',
              border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
              fontSize: '0.75rem',
              lineHeight: 1.3,
            }}
          >
            <div className="text-lg font-bold uppercase">{v.center}</div>
            <div>{v.word_count} sanaa</div>
            <div>{v.max_score} p</div>
            <div>{v.pangram_count} pg</div>
          </button>
        );
      })}
    </div>
  );
}
