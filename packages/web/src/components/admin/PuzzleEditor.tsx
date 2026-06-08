/**
 * Combined puzzle editor and combinations browser.
 *
 * Layout from top to bottom:
 *   1. Toolbar: slot nav, swap, delete, save/restore, new-puzzle button
 *   2. New-puzzle form (collapsible): letter input + center input + create button
 *   3. Center letter selector (VariationsGrid)
 *   4. Combinations search with filters (scrollable, 10 rows visible)
 *      - When a combo row is selected and a center is active, shows
 *        "Lisää uutena pelinä" button to append it to the rotation
 *   5. Word list for active combo + center
 *
 * @module src/components/admin/PuzzleEditor
 */

import { useEffect, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import { AdminWordListPanel } from './AdminWordListPanel';
import { CombinationSearchPanel } from './CombinationSearchPanel';
import { PuzzleSlotControls } from './PuzzleSlotControls';
import { SuggestionPanel } from './SuggestionPanel';
import { useAdminCombinations } from './useAdminCombinations';
import { useAdminSuggestion } from './useAdminSuggestion';

export function PuzzleEditor() {
  const currentSlot = useAdminStore((s) => s.currentSlot);
  const totalPuzzles = useAdminStore((s) => s.totalPuzzles);
  const savedLetters = useAdminStore((s) => s.savedLetters);
  const savedCenter = useAdminStore((s) => s.savedCenter);
  const activeLetters = useAdminStore((s) => s.activeLetters);
  const activeCenter = useAdminStore((s) => s.activeCenter);
  const variations = useAdminStore((s) => s.variations);
  const isActive = useAdminStore((s) => s.isActive);
  const words = useAdminStore((s) => s.words);
  const wordsLoading = useAdminStore((s) => s.wordsLoading);
  const puzzleLoading = useAdminStore((s) => s.puzzleLoading);
  const saving = useAdminStore((s) => s.saving);
  const statusMessage = useAdminStore((s) => s.statusMessage);
  const statusType = useAdminStore((s) => s.statusType);
  const csrfToken = useAdminStore((s) => s.csrfToken);

  const loadSlot = useAdminStore((s) => s.loadSlot);
  const saveSlot = useAdminStore((s) => s.saveSlot);
  const swapSlots = useAdminStore((s) => s.swapSlots);
  const deleteSlot = useAdminStore((s) => s.deleteSlot);
  const reactivateSlot = useAdminStore((s) => s.reactivateSlot);
  const createPuzzle = useAdminStore((s) => s.createPuzzle);
  const blockWord = useAdminStore((s) => s.blockWord);
  const previewCombo = useAdminStore((s) => s.previewCombo);
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);
  const setActiveCenter = useAdminStore((s) => s.setActiveCenter);

  const [swapTarget, setSwapTarget] = useState('');
  const [jumpTarget, setJumpTarget] = useState('');
  const [initialLoaded, setInitialLoaded] = useState(false);

  // New-puzzle creation form state
  const [createMode, setCreateMode] = useState(false);
  const [newLetters, setNewLetters] = useState('');
  const [newCenter, setNewCenter] = useState('');

  const {
    filters,
    updateFilter,
    sortIndicator,
    handleSort,
    comboResults,
    comboTotal,
    comboLoading,
    selectedCombo,
    selectedVariations,
    clearSelection,
    handleSelectCombo,
  } = useAdminCombinations({ csrfToken, savedLetters });

  const {
    suggestion,
    suggestionLoading,
    suggestionError,
    pangramSpoilersVisible,
    fetchSuggestion,
    handleRejectSuggestion,
    handleTogglePangrams,
    handleAcceptSuggestion,
  } = useAdminSuggestion({ csrfToken, createPuzzle, setStatusMessage });

  const isDirty =
    activeLetters !== savedLetters || activeCenter !== savedCenter;

  // Which variations to show: from selected combo, or from current puzzle
  const displayVariations = selectedCombo ? selectedVariations : variations;

  // Load initial slot when totalPuzzles becomes available
  useEffect(() => {
    if (totalPuzzles > 0 && !initialLoaded) {
      setInitialLoaded(true);
      loadSlot(currentSlot);
    }
  }, [totalPuzzles, initialLoaded, currentSlot, loadSlot]);

  useEffect(() => {
    setJumpTarget(totalPuzzles > 0 ? String(currentSlot + 1) : '');
  }, [currentSlot, totalPuzzles]);

  // Clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMessage, setStatusMessage]);

  /** Handle center selection from the VariationsGrid. */
  const handleCenterSelect = useCallback(
    (center: string) => {
      if (selectedCombo) {
        // Browsing a combo from search — preview it
        const letters = selectedCombo.split('');
        useAdminStore.setState({
          activeLetters: selectedCombo,
          activeCenter: center,
        });
        previewCombo(letters, center);
      } else {
        // Just update local state which handles highlights, stats and calculates isDirty
        setActiveCenter(center);
      }
    },
    [selectedCombo, previewCombo, setActiveCenter],
  );

  // --- Slot navigation ---

  const handlePrev = useCallback(() => {
    if (currentSlot > 0) {
      clearSelection();
      loadSlot(currentSlot - 1);
    }
  }, [clearSelection, currentSlot, loadSlot]);

  const handleNext = useCallback(() => {
    if (currentSlot < totalPuzzles - 1) {
      clearSelection();
      loadSlot(currentSlot + 1);
    }
  }, [clearSelection, currentSlot, totalPuzzles, loadSlot]);

  const handleJump = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const displayNumber = Number.parseInt(jumpTarget, 10);
      if (
        !Number.isInteger(displayNumber) ||
        displayNumber < 1 ||
        displayNumber > totalPuzzles
      ) {
        setStatusMessage(`Anna pelinumero 1-${totalPuzzles}`, 'warning');
        return;
      }

      const targetSlot = displayNumber - 1;
      if (targetSlot === currentSlot) return;

      clearSelection();
      loadSlot(targetSlot);
    },
    [
      clearSelection,
      currentSlot,
      jumpTarget,
      loadSlot,
      setStatusMessage,
      totalPuzzles,
    ],
  );

  const handleSwap = useCallback(async () => {
    const target = parseInt(swapTarget, 10) - 1;
    if (
      isNaN(target) ||
      target < 0 ||
      target >= totalPuzzles ||
      target === currentSlot
    ) {
      return;
    }
    const result = await swapSlots(target);
    if (result === 'needs_force') {
      if (
        window.confirm(
          `Peli #${target + 1} tai #${currentSlot + 1} on tämän päivän julkaistu peli. Vaihdetaanko silti?`,
        )
      ) {
        await swapSlots(target, true);
      }
    }
  }, [swapTarget, totalPuzzles, currentSlot, swapSlots]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Poistetaanko peli #${currentSlot + 1}?`)) {
      deleteSlot();
    }
  }, [currentSlot, deleteSlot]);

  const handleReactivate = useCallback(() => {
    if (
      window.confirm(
        `Palautetaanko peli #${currentSlot + 1} takaisin kiertoon?`,
      )
    ) {
      reactivateSlot();
    }
  }, [currentSlot, reactivateSlot]);

  const handleRestore = useCallback(() => {
    clearSelection();
    useAdminStore.setState({
      activeLetters: savedLetters,
      activeCenter: savedCenter,
    });
  }, [clearSelection, savedLetters, savedCenter]);

  const handleBlock = useCallback(
    (word: string) => {
      if (window.confirm(`Estä sana "${word}" pysyvästi?`)) {
        blockWord(word);
      }
    },
    [blockWord],
  );

  /**
   * Create a new puzzle from the manual letter-entry form.
   * Parses the comma-separated letters and calls the store action.
   */
  const handleCreateFromForm = useCallback(async () => {
    const letters = newLetters
      .toLowerCase()
      .split(/[,\s]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const center = newCenter.toLowerCase().trim();
    await createPuzzle(letters, center);
    setCreateMode(false);
    setNewLetters('');
    setNewCenter('');
  }, [newLetters, newCenter, createPuzzle]);

  /**
   * Create a new puzzle from the currently-selected combination and center.
   * Called from the combinations browser when a combo + center are active.
   */
  const handleCreateFromCombo = useCallback(async () => {
    if (!selectedCombo || !activeCenter) return;
    const letters = activeLetters.split('');
    await createPuzzle(letters, activeCenter);
    clearSelection();
  }, [
    clearSelection,
    selectedCombo,
    activeLetters,
    activeCenter,
    createPuzzle,
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 py-4 sm:px-4">
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:items-stretch">
        {/* LEFT COLUMN: Active Puzzle Controls & AI Suggestions */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-start">
          <PuzzleSlotControls
            currentSlot={currentSlot}
            totalPuzzles={totalPuzzles}
            selectedCombo={selectedCombo}
            displayVariations={displayVariations}
            activeCenter={activeCenter}
            isActive={isActive}
            isDirty={isDirty}
            saving={saving}
            puzzleLoading={puzzleLoading}
            statusMessage={statusMessage}
            statusType={statusType}
            jumpTarget={jumpTarget}
            swapTarget={swapTarget}
            createMode={createMode}
            newLetters={newLetters}
            newCenter={newCenter}
            onJumpTargetChange={setJumpTarget}
            onSwapTargetChange={setSwapTarget}
            onPrev={handlePrev}
            onNext={handleNext}
            onJump={handleJump}
            onClearSelection={clearSelection}
            onCenterSelect={handleCenterSelect}
            onSave={saveSlot}
            onRestore={handleRestore}
            onSwap={handleSwap}
            onDelete={handleDelete}
            onReactivate={handleReactivate}
            onToggleCreateMode={() => {
              setCreateMode((value) => !value);
              setNewLetters('');
              setNewCenter('');
            }}
            onNewLettersChange={setNewLetters}
            onNewCenterChange={setNewCenter}
            onCreateFromForm={handleCreateFromForm}
            onCreateFromCombo={handleCreateFromCombo}
          />

          <SuggestionPanel
            suggestion={suggestion}
            suggestionError={suggestionError}
            suggestionLoading={suggestionLoading}
            saving={saving}
            pangramSpoilersVisible={pangramSpoilersVisible}
            onFetchSuggestion={() => void fetchSuggestion()}
            onTogglePangrams={() => void handleTogglePangrams()}
            onRejectSuggestion={() => void handleRejectSuggestion()}
            onAcceptSuggestion={() => void handleAcceptSuggestion()}
          />
        </div>

        {/* RIGHT COLUMN: Word List Card (replaces Search on desktop) */}
        <div className="lg:col-span-5 flex flex-col lg:h-full">
          <AdminWordListPanel
            words={words}
            letters={activeLetters}
            loading={wordsLoading}
            onBlock={handleBlock}
          />
        </div>

        <div className="lg:col-span-12">
          <CombinationSearchPanel
            filters={filters}
            comboTotal={comboTotal}
            comboLoading={comboLoading}
            comboResults={comboResults}
            selectedCombo={selectedCombo}
            savedLetters={savedLetters}
            onFilterChange={updateFilter}
            onSelectCombo={handleSelectCombo}
            onSort={handleSort}
            sortIndicator={sortIndicator}
          />
        </div>
      </div>
    </div>
  );
}
