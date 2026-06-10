Feature: Hint panels
  Three visible hint tabs (Yleiskuva, Pituudet, Alkuparit) help players find
  remaining words without revealing them. Unlock state persists across sessions;
  active tab state is session-only. Legacy hidden or unknown hint IDs are ignored.

  Background:
    Given a puzzle with 50 total words and 3 pangrams

  # --- Hint types ---

  Scenario: Summary hint shows word count and pangram count
    When the player unlocks the "summary" hint
    Then it should show the total word count
    And it should show how many words remain unfound
    And it should show the pangram count and how many are found

  Scenario: Distribution hint shows remaining words by length
    When the player unlocks the "distribution" hint
    Then it should show word counts grouped by length
    And found words should reduce counts for their length

  Scenario: Pairs hint shows remaining words by two-letter prefix
    When the player unlocks the "pairs" hint
    Then it should show each two-letter prefix with remaining count
    And prefixes should be sorted in Finnish alphabetical order
    And prefixes should fill top-to-bottom within each column before continuing rightward
    And found words should reduce the remaining count for their prefix

  # --- Unlock mechanics ---

  Scenario: Hints start locked
    When the player loads a fresh puzzle
    Then no hints should be unlocked

  Scenario: Each hint is unlocked independently
    When the player unlocks "summary"
    Then only the "summary" hint should be visible
    And "distribution" and "pairs" should still be locked

  Scenario: Legacy hidden hint IDs are ignored
    Given legacy saved hints include "letters" and "unknown"
    Then no hints should be unlocked

  # --- Persistence ---

  @e2e
  Scenario: Unlock state persists in localStorage
    When the player unlocks "summary" and "pairs"
    And the player reloads the page
    Then "summary" and "pairs" should still be unlocked

  @e2e
  Scenario: Active tab state does not persist across sessions
    When the player opens the "summary" tab
    And the player reloads the page
    Then no tab should be active

  @e2e
  Scenario: Every visible hint tab preserves the play area position
    When the player opens the "summary" tab
    Then the honeycomb position should not change

  @e2e
  Scenario: Hint tab state is shown inside each tab
    When the player loads a fresh puzzle
    Then each visible hint tab should show a locked state indicator
    When the player unlocks the "summary" hint
    Then the "summary" tab should show an unlocked state indicator
    And no separate hint status column should be shown

  # --- Pre-hint score tracking ---

  Scenario: Pre-hint score is captured when the first hint is unlocked
    Given the player has scored 15 points before any hints
    When the player unlocks the "summary" hint
    Then the pre-hint score should be 15

  Scenario: Pre-hint score is not updated by subsequent hint unlocks
    Given the player has scored 15 points before any hints
    When the player unlocks the "summary" hint
    And the player scores 5 more points
    And the player unlocks the "pairs" hint
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

  Scenario: Share text reports no-hint achievement progress after hints are used
    Given the share result has score 136 of max 188 on puzzle 107
    And the share score before hints is 102
    When the share text is generated
    Then the generated share text should match this format:
      """
      Sanakenno — Kenno #108
      🏆 Ällistyttävä · 136/188 p.
      🟧🟧🟧🟧🟧🟧🟧⬛⬛⬛
      ⭐️⭐️⚫️  54% ilman apuja
      sanakenno.fi
      """

  Scenario: Share text reports zero no-hint progress for old hinted saves
    Given the share result has score 136 of max 188 on puzzle 107
    And the share result has unlocked hints but no recorded score before hints
    When the share text is generated
    Then the generated share text should match this format:
      """
      Sanakenno — Kenno #108
      🏆 Ällistyttävä · 136/188 p.
      🟧🟧🟧🟧🟧🟧🟧⬛⬛⬛
      ⚫️⚫️⚫️  0% ilman apuja
      sanakenno.fi
      """

  Scenario: Share text celebrates all no-hint achievement stars
    Given the share result has score 188 of max 188 on puzzle 107
    And the share score before hints is 136
    When the share text is generated
    Then the generated share text should match this format:
      """
      Sanakenno — Kenno #108
      🏆 Täysi kenno · 188/188 p.
      🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
      ⭐️⭐️⭐️  72% ilman apuja!
      sanakenno.fi
      """

  @e2e
  Scenario: Rank panel always shows score achieved without hints
    Given the player has scored 20 points before any hints
    When the player unlocks the "summary" hint
    Then the rank panel should show "Ilman apuja: 20 pistettä"

  @e2e
  Scenario: Rank panel shows current score before any hints are unlocked
    Given the player has scored 7 points before any hints
    Then the rank panel should show "Ilman apuja: 7 pistettä"
