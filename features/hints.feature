Feature: Hint panels
  Four individually unlockable hint panels help players find remaining
  words without revealing the words themselves. Unlock state persists
  across sessions; collapse state is session-only.

  Background:
    Given a puzzle with 50 total words and 3 pangrams

  # --- Hint types ---

  Scenario: Summary hint shows word count and pangram count
    When the player unlocks the "summary" hint
    Then it should show the total word count
    And it should show how many words remain unfound
    And it should show the pangram count and how many are found

  Scenario: Letters hint shows remaining words by starting letter
    When the player unlocks the "letters" hint
    Then it should show each starting letter with remaining count
    And letters should be sorted alphabetically
    And found words should reduce the remaining count

  Scenario: Distribution hint shows remaining words by length
    When the player unlocks the "distribution" hint
    Then it should show word counts grouped by length
    And found words should reduce counts for their length

  Scenario: Pairs hint shows remaining words by two-letter prefix
    When the player unlocks the "pairs" hint
    Then it should show each two-letter prefix with remaining count
    And found words should reduce the remaining count for their prefix

  # --- Unlock mechanics ---

  Scenario: Hints start locked
    When the player loads a fresh puzzle
    Then no hints should be unlocked

  Scenario: Each hint is unlocked independently
    When the player unlocks "summary"
    Then only the "summary" hint should be visible
    And "letters", "distribution", and "pairs" should still be locked

  # --- Persistence ---

  @e2e
  Scenario: Unlock state persists in localStorage
    When the player unlocks "summary" and "letters"
    And the player reloads the page
    Then "summary" and "letters" should still be unlocked

  @e2e
  Scenario: Collapse state does not persist
    When the player collapses the "summary" panel
    And the player reloads the page
    Then the "summary" panel should be expanded

  # --- Share integration ---

  @e2e
  Scenario: Unlocked hints appear as icons in the share text
    When the player unlocks "summary" and "pairs"
    And the player shares their result
    Then the share text should include hint icons for the unlocked hints
