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
  const currentDisplayNumber = useAdminStore((s) => s.currentDisplayNumber);
  const prevSlot = useAdminStore((s) => s.prevSlot);
  const nextSlot = useAdminStore((s) => s.nextSlot);
  const activeSlots = useAdminStore((s) => s.activeSlots);
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
  const loadDisplayNumber = useAdminStore((s) => s.loadDisplayNumber);
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
    setJumpTarget(
      currentDisplayNumber !== null ? String(currentDisplayNumber) : '',
    );
  }, [currentDisplayNumber]);

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

  // Navigation walks stored slots, not display numbers, so soft-deleted
  // puzzles stay reachable for restoring.
  const handlePrev = useCallback(() => {
    if (prevSlot === null) return;
    clearSelection();
    loadSlot(prevSlot);
  }, [clearSelection, prevSlot, loadSlot]);

  const handleNext = useCallback(() => {
    if (nextSlot === null) return;
    clearSelection();
    loadSlot(nextSlot);
  }, [clearSelection, nextSlot, loadSlot]);

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

      if (displayNumber === currentDisplayNumber) return;

      clearSelection();
      loadDisplayNumber(displayNumber);
    },
    [
      clearSelection,
      currentDisplayNumber,
      jumpTarget,
      loadDisplayNumber,
      setStatusMessage,
      totalPuzzles,
    ],
  );

  /** Confirm a refused write using the server's own explanation. */
  const confirmForce = useCallback((fallback: string) => {
    const prompt = useAdminStore.getState().forcePrompt;
    return window.confirm(prompt ? `${prompt}` : fallback);
  }, []);

  const handleSwap = useCallback(async () => {
    const targetDisplay = parseInt(swapTarget, 10);
    if (
      isNaN(targetDisplay) ||
      targetDisplay < 1 ||
      targetDisplay > totalPuzzles ||
      targetDisplay === currentDisplayNumber
    ) {
      return;
    }
    const targetSlot = activeSlots[targetDisplay - 1];
    if (targetSlot === undefined || targetSlot === currentSlot) return;

    const result = await swapSlots(targetSlot);
    if (result === 'needs_force') {
      if (confirmForce('Vaihdetaanko silti?')) {
        await swapSlots(targetSlot, true);
      }
    }
  }, [
    activeSlots,
    confirmForce,
    swapTarget,
    totalPuzzles,
    currentDisplayNumber,
    currentSlot,
    swapSlots,
  ]);

  const handleSave = useCallback(async () => {
    const result = await saveSlot();
    if (result === 'needs_force') {
      if (confirmForce('Tallennetaanko silti?')) {
        await saveSlot(true);
      }
    }
  }, [confirmForce, saveSlot]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Poistetaanko peli #${currentDisplayNumber}?`)) {
      deleteSlot();
    }
  }, [currentDisplayNumber, deleteSlot]);

  const handleReactivate = useCallback(() => {
    if (window.confirm('Palautetaanko peli takaisin kiertoon?')) {
      reactivateSlot();
    }
  }, [reactivateSlot]);

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

    let result = await createPuzzle(letters, center);
    // Same letters with a different center: creatable, but only after the
    // admin has seen which puzzle already uses them and how recently.
    if (result === 'needs_force' && confirmForce('Luodaanko silti?')) {
      result = await createPuzzle(letters, center, { force: true });
    }
    if (result !== 'ok') return;

    setCreateMode(false);
    setNewLetters('');
    setNewCenter('');
  }, [confirmForce, newLetters, newCenter, createPuzzle]);

  /**
   * Create a new puzzle from the currently-selected combination and center.
   * Called from the combinations browser when a combo + center are active.
   */
  const handleCreateFromCombo = useCallback(async () => {
    if (!selectedCombo || !activeCenter) return;
    const letters = activeLetters.split('');

    let result = await createPuzzle(letters, activeCenter);
    if (result === 'needs_force' && confirmForce('Luodaanko silti?')) {
      result = await createPuzzle(letters, activeCenter, { force: true });
    }
    if (result !== 'ok') return;

    clearSelection();
  }, [
    clearSelection,
    confirmForce,
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
            currentDisplayNumber={currentDisplayNumber}
            canGoPrev={prevSlot !== null}
            canGoNext={nextSlot !== null}
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
            onSave={handleSave}
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
