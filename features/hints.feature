Feature: Hint panels
  Three visible hint tabs (Yleiskuva, Pituudet, Alkuparit) help players find
  remaining words without revealing them. A fourth panel (Alkukirjaimet) exists
  in code but is not shown in the tab row. Unlock state persists across sessions;
  active tab state is session-only.

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
  Scenario: Active tab state does not persist across sessions
    When the player opens the "summary" tab
    And the player reloads the page
    Then no tab should be active

  # --- Pre-hint score tracking ---

  Scenario: Pre-hint score is captured when the first hint is unlocked
    Given the player has scored 15 points before any hints
    When the player unlocks the "summary" hint
    Then the pre-hint score should be 15

  Scenario: Pre-hint score is not updated by subsequent hint unlocks
    Given the player has scored 15 points before any hints
    When the player unlocks the "summary" hint
    And the player scores 5 more points
    And the player unlocks the "letters" hint
    Then the pre-hint score should still be 15

  Scenario: Pre-hint score is 0 when the first hint is unlocked before scoring
    When the player loads a fresh puzzle
    And the player unlocks "summary"
    Then the pre-hint score should be 0

  Scenario: Display score before hints mirrors current score before any hints are used
    Given the player has scored 10 points before any hints
    Then the display score before hints should be 10

  Scenario: Display score before hints shows 0 for old saves where hints were used without tracking
    Given hints are already unlocked but no pre-hint score was recorded
    Then the display score before hints should be 0

  # --- Share integration ---

  @e2e
  Scenario: Unlocked hints appear as icons in the share text
    When the player unlocks "summary" and "pairs"
    And the player shares their result
    Then the share text should include hint icons for the unlocked hints

  @e2e
  Scenario: Share text includes pre-hint score in parentheses when hints are used
    Given the player has scored 20 points before any hints
    When the player unlocks the "summary" hint
    And the player shares their result
    Then the share score line should include "(20)"

  @e2e
  Scenario: Rank panel always shows score achieved without hints
    Given the player has scored 20 points before any hints
    When the player unlocks the "summary" hint
    Then the rank panel should show "Ilman apuja: 20 pistettä"

  @e2e
  Scenario: Rank panel shows current score before any hints are unlocked
    Given the player has scored 7 points before any hints
    Then the rank panel should show "Ilman apuja: 7 pistettä"
