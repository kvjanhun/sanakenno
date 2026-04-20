import { describe, expect, it, vi } from 'vitest';
import { webShare } from '../packages/web/src/platform/web';

describe('webShare.copyToClipboard', () => {
  it('falls back to execCommand when navigator.clipboard.writeText fails', async () => {
    const writeText = vi
      .fn<(_: string) => Promise<void>>()
      .mockRejectedValue(new Error('clipboard blocked'));
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    await expect(webShare.copyToClipboard('player-key')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('player-key');
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false when both clipboard paths fail', async () => {
    const writeText = vi
      .fn<(_: string) => Promise<void>>()
      .mockRejectedValue(new Error('clipboard blocked'));
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const execCommand = vi.fn(() => false);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    await expect(webShare.copyToClipboard('player-key')).resolves.toBe(false);
  });
});
