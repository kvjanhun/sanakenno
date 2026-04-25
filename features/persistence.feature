@e2e
Feature: Game state persistence
  Game progress is saved to localStorage per puzzle so that players
  can close the browser and resume later. Each puzzle has its own
  save slot.

  # --- Per-puzzle storage ---

  Scenario: State is saved under a puzzle-specific key
    Given the player is on puzzle number 5
    When the player finds a word
    Then localStorage key "sanakenno_state_5" should be updated

  Scenario: Different puzzles have independent state
    Given the player found 10 words on puzzle 5
    When the player loads puzzle 6
    Then the found words list should be empty
    And the score should be 0

  # --- What is persisted ---

  Scenario: Found words, score, hints, and timer are saved
    When the player finds words and unlocks hints
    And the player reloads the page
    Then the found words should be restored
    And the score should be restored
    And the unlocked hints should be restored
    And the timer start time should be restored

  # --- Validation on load ---

  Scenario: Saved words are validated against current puzzle hashes
    Given the player has saved words for puzzle 5
    When a word is removed from the dictionary (blocked)
    And the player reloads
    Then the blocked word should be removed from found words
    And the score should be recalculated

  # --- Legacy migration ---
  # Note: This applies only if the standalone app is served on the same origin
  # as the original erez.ac/sanakenno, allowing access to old localStorage keys.
  # If deployed on a different origin, these scenarios are not applicable.

  Scenario: Single-key legacy format is migrated
    Given localStorage has a "sanakenno_state" key with puzzle number 5
    When the player loads puzzle 5
    Then the legacy data should be migrated to "sanakenno_state_5"
    And the legacy key should be removed

  Scenario: Legacy migration is skipped when no legacy key exists
    Given localStorage does not have a "sanakenno_state" key
    When the player loads a puzzle
    Then migration should not run
    And the game should load normally

  # --- Server sync ---

  Scenario: Progress is synced to server after finding a word when logged in
    Given the player is logged in
    And the player is on puzzle number 3
    When the player finds a word
    Then a POST request should have been made to "/api/player/sync/progress"

  Scenario: No sync requests are made when the player is anonymous
    Given the player is not logged in
    When the player finds a word
    Then no POST request should have been made to "/api/player/sync/progress"
