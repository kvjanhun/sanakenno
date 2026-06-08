import { describe, expect, it } from 'vitest';
import {
  filterVisibleHintIds,
  isVisibleHintId,
  VISIBLE_HINT_IDS,
} from '../packages/web/src/utils/hints';

describe('web hint ID filtering', () => {
  it('keeps only the three visible hint IDs in visible order', () => {
    expect(
      filterVisibleHintIds([
        'letters',
        'pairs',
        'unknown',
        'summary',
        'pairs',
        'distribution',
      ]),
    ).toEqual(['summary', 'distribution', 'pairs']);
  });

  it('rejects legacy hidden and unknown hint IDs', () => {
    expect(isVisibleHintId('letters')).toBe(false);
    expect(isVisibleHintId('unknown')).toBe(false);
    for (const id of VISIBLE_HINT_IDS) {
      expect(isVisibleHintId(id)).toBe(true);
    }
  });
});
