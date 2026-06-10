import { describe, expect, it } from 'vitest';
import { buildShareText } from '@sanakenno/shared';

describe('buildShareText', () => {
  it('includes no-hint achievement progress instead of unlocked hint icons', () => {
    const text = buildShareText({
      puzzleNumber: 107,
      score: 136,
      maxScore: 188,
      hintsUnlocked: new Set(['summary', 'pairs']),
      scoreBeforeHints: 102,
    });

    expect(text).toBe(`Sanakenno — Kenno #108
🏆 Ällistyttävä · 136/188 p.
🟧🟧🟧🟧🟧🟧🟧⬛⬛⬛
⭐️⭐️⚫️  54% ilman apuja
sanakenno.fi`);
    expect(text).not.toContain('Avut:');
  });

  it('uses 0% no-hint progress for hinted saves without a recorded pre-hint score', () => {
    const text = buildShareText({
      puzzleNumber: 107,
      score: 136,
      maxScore: 188,
      hintsUnlocked: ['summary'],
      scoreBeforeHints: null,
    });

    expect(text).toContain('⚫️⚫️⚫️  0% ilman apuja');
  });

  it('shows a celebration mark only when every no-hint star is reached', () => {
    const partial = buildShareText({
      puzzleNumber: 107,
      score: 136,
      maxScore: 188,
      hintsUnlocked: ['summary'],
      scoreBeforeHints: 102,
    });
    const allStars = buildShareText({
      puzzleNumber: 107,
      score: 188,
      maxScore: 188,
      hintsUnlocked: ['summary'],
      scoreBeforeHints: 136,
    });

    expect(partial).toContain('⭐️⭐️⚫️  54% ilman apuja\n');
    expect(allStars).toContain('⭐️⭐️⭐️  72% ilman apuja!');
  });

  it('lets no-hint percentage reach 100% while keeping three stars', () => {
    const text = buildShareText({
      puzzleNumber: 107,
      score: 188,
      maxScore: 188,
      hintsUnlocked: [],
      scoreBeforeHints: null,
    });

    expect(text).toContain('⭐️⭐️⭐️  100% ilman apuja!');
  });
});
