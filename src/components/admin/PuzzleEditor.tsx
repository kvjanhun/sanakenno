/**
 * Puzzle editor: toolbar, letter tiles, variations grid, and word list.
 *
 * Provides slot navigation, save/restore, swap, delete, and new puzzle
 * controls. Mirrors the Vue AdminKennoPuzzleTool functionality.
 *
 * @module src/components/admin/PuzzleEditor
 */

import { useEffect, useState, useCallback } from 'react';
import { useAdminStore } from '../../store/useAdminStore.js';
import { VariationsGrid } from './VariationsGrid.js';
import { WordList } from './WordList.js';

export function PuzzleEditor() {
  const currentSlot = useAdminStore((s) => s.currentSlot);
  const totalPuzzles = useAdminStore((s) => s.totalPuzzles);
  const savedLetters = useAdminStore((s) => s.savedLetters);
  const savedCenter = useAdminStore((s) => s.savedCenter);
  const activeLetters = useAdminStore((s) => s.activeLetters);
  const activeCenter = useAdminStore((s) => s.activeCenter);
  const variations = useAdminStore((s) => s.variations);
  const words = useAdminStore((s) => s.words);
  const wordsLoading = useAdminStore((s) => s.wordsLoading);
  const puzzleLoading = useAdminStore((s) => s.puzzleLoading);
  const saving = useAdminStore((s) => s.saving);
  const statusMessage = useAdminStore((s) => s.statusMessage);
  const statusType = useAdminStore((s) => s.statusType);

  const loadSlot = useAdminStore((s) => s.loadSlot);
  const saveSlot = useAdminStore((s) => s.saveSlot);
  const changeCenter = useAdminStore((s) => s.changeCenter);
  const swapSlots = useAdminStore((s) => s.swapSlots);
  const deleteSlot = useAdminStore((s) => s.deleteSlot);
  const blockWord = useAdminStore((s) => s.blockWord);
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);
  const setActiveCenter = useAdminStore((s) => s.setActiveCenter);

  const [swapTarget, setSwapTarget] = useState('');

  const isDirty =
    activeLetters !== savedLetters || activeCenter !== savedCenter;

  // Load initial slot
  useEffect(() => {
    if (totalPuzzles > 0) {
      loadSlot(currentSlot);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMessage, setStatusMessage]);

  const handlePrev = useCallback(() => {
    if (currentSlot > 0) loadSlot(currentSlot - 1);
  }, [currentSlot, loadSlot]);

  const handleNext = useCallback(() => {
    if (currentSlot < totalPuzzles - 1) loadSlot(currentSlot + 1);
  }, [currentSlot, totalPuzzles, loadSlot]);

  const handleCenterSelect = useCallback(
    (center: string) => {
      if (center === savedCenter && activeLetters === savedLetters) {
        // Same combo, just change center on server
        changeCenter(center);
      } else {
        // Different combo or previewing — just update local state
        setActiveCenter(center);
      }
    },
    [savedCenter, savedLetters, activeLetters, changeCenter, setActiveCenter],
  );

  const handleSwap = useCallback(() => {
    const target = parseInt(swapTarget, 10) - 1;
    if (
      isNaN(target) ||
      target < 0 ||
      target >= totalPuzzles ||
      target === currentSlot
    ) {
      return;
    }
    swapSlots(target);
  }, [swapTarget, totalPuzzles, currentSlot, swapSlots]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Poistetaanko peli #${currentSlot + 1}?`)) {
      deleteSlot();
    }
  }, [currentSlot, deleteSlot]);

  const handleRestore = useCallback(() => {
    useAdminStore.setState({
      activeLetters: savedLetters,
      activeCenter: savedCenter,
    });
  }, [savedLetters, savedCenter]);

  const handleBlock = useCallback(
    (word: string) => {
      if (window.confirm(`Estä sana "${word}" pysyvästi?`)) {
        blockWord(word);
      }
    },
    [blockWord],
  );

  const lettersArray = activeLetters.split('');

  return (
    <div className="space-y-4">
      {/* Status message */}
      {statusMessage && (
        <div
          className="p-2 rounded text-sm text-center"
          style={{
            backgroundColor:
              statusType === 'error'
                ? 'rgba(220, 38, 38, 0.1)'
                : statusType === 'warning'
                  ? 'rgba(234, 179, 8, 0.1)'
                  : 'rgba(22, 163, 74, 0.1)',
            color:
              statusType === 'error'
                ? '#dc2626'
                : statusType === 'warning'
                  ? '#ca8a04'
                  : '#16a34a',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Toolbar */}
      <div
        className="flex items-center justify-between gap-2 p-3 rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlot <= 0 || puzzleLoading}
            className="px-2 py-1 rounded text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              opacity: currentSlot <= 0 ? 0.3 : 1,
            }}
          >
            &lt;
          </button>
          <span
            className="text-sm font-mono font-semibold min-w-12 text-center"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {puzzleLoading ? '...' : `${currentSlot + 1} / ${totalPuzzles}`}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlot >= totalPuzzles - 1 || puzzleLoading}
            className="px-2 py-1 rounded text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              opacity: currentSlot >= totalPuzzles - 1 ? 0.3 : 1,
            }}
          >
            &gt;
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Swap */}
          <input
            type="number"
            value={swapTarget}
            onChange={(e) => setSwapTarget(e.target.value)}
            placeholder="#"
            min={1}
            max={totalPuzzles}
            className="w-14 px-1 py-1 rounded text-sm text-center"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            type="button"
            onClick={handleSwap}
            disabled={saving}
            className="px-2 py-1 rounded text-xs cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Vaihda
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || totalPuzzles <= 0}
            className="px-2 py-1 rounded text-xs cursor-pointer"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid #dc2626',
              color: '#dc2626',
            }}
          >
            Poista
          </button>
        </div>
      </div>

      {/* Letter tiles */}
      {activeLetters && (
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5">
            {lettersArray.map((letter, i) => (
              <div
                key={`${letter}-${i}`}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold uppercase"
                style={{
                  backgroundColor:
                    letter === activeCenter
                      ? 'var(--color-accent)'
                      : 'var(--color-bg-secondary)',
                  color:
                    letter === activeCenter
                      ? '#fff'
                      : 'var(--color-text-primary)',
                  border: `2px solid ${letter === activeCenter ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                {letter}
              </div>
            ))}
            {isDirty && (
              <span
                className="text-xs px-2 py-0.5 rounded-full ml-2"
                style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  color: '#ca8a04',
                }}
              >
                muokattu
              </span>
            )}
          </div>
        </div>
      )}

      {/* Save / Restore */}
      {isDirty && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => saveSlot()}
            disabled={saving}
            className="px-4 py-1.5 rounded text-sm font-semibold cursor-pointer"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Tallennetaan...' : 'Tallenna'}
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={saving}
            className="px-4 py-1.5 rounded text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          >
            Palauta
          </button>
        </div>
      )}

      {/* Variations grid */}
      {variations.length > 0 && (
        <VariationsGrid
          variations={variations}
          activeCenter={activeCenter}
          onSelect={handleCenterSelect}
        />
      )}

      {/* Word list */}
      <WordList
        words={words}
        letters={activeLetters}
        loading={wordsLoading}
        onBlock={handleBlock}
      />
    </div>
  );
}
