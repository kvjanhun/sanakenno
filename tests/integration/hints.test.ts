/**
 * Hint unlock mechanics and pre-hint score tracking through the real web
 * store.
 *
 * Replaces the former hints.feature BDD scenarios not already covered
 * elsewhere: hint panel content is covered by tests/hint-data.test.ts,
 * share text by tests/share-text.test.ts, and the hint panel UI by
 * tests/e2e/hints.spec.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../../packages/web/src/store/useGameStore';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
  );
  useGameStore.setState({
    puzzle: {
      center: 'a',
      letters: ['e', 'k', 'l', 'n', 's', 't'],
      word_hashes: [],
      hint_data: {} as never,
      max_score: 100,
      puzzle_number: 1,
      display_number: 1,
      total_puzzles: 1,
    },
    foundWords: new Set<string>(),
    score: 0,
    hintsUnlocked: new Set<string>(),
    scoreBeforeHints: null,
  });
});

describe('hint unlock mechanics', () => {
  it('starts with no hints unlocked', () => {
    expect(useGameStore.getState().hintsUnlocked.size).toBe(0);
  });

  it('unlocks each hint independently', () => {
    useGameStore.getState().unlockHint('summary');
    const unlocked = useGameStore.getState().hintsUnlocked;
    expect(unlocked.has('summary')).toBe(true);
    expect(unlocked.has('distribution')).toBe(false);
    expect(unlocked.has('pairs')).toBe(false);
  });

  it('ignores legacy hidden and unknown hint IDs', () => {
    useGameStore.getState().unlockHint('letters');
    useGameStore.getState().unlockHint('unknown');
    expect(useGameStore.getState().hintsUnlocked.size).toBe(0);
  });
});

describe('pre-hint score tracking', () => {
  it('captures the score when the first hint is unlocked', () => {
    useGameStore.setState({ score: 15 });
    useGameStore.getState().unlockHint('summary');
    expect(useGameStore.getState().scoreBeforeHints).toBe(15);
  });

  it('does not update the pre-hint score on subsequent unlocks', () => {
    useGameStore.setState({ score: 15 });
    useGameStore.getState().unlockHint('summary');
    useGameStore.setState({ score: 20 });
    useGameStore.getState().unlockHint('pairs');
    expect(useGameStore.getState().scoreBeforeHints).toBe(15);
  });

  it('records 0 when the first hint is unlocked before scoring', () => {
    useGameStore.getState().unlockHint('summary');
    expect(useGameStore.getState().scoreBeforeHints).toBe(0);
  });
});
