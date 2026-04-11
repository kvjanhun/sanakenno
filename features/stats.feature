Feature: Player stats and history
  Personal play statistics are tracked in localStorage and displayed
  in a stats modal. When the player is logged in, stats are also
  backed up to the server and synced across devices.

  # --- Data recording ---

  Scenario: Stats record is created on first word found
    Given the player has no stats yet
    When the player finds their first word on puzzle 5 dated "2026-04-01"
    Then a stats record should exist for puzzle 5

  Scenario: Best rank only upgrades
    Given a stats record for puzzle 5 with best_rank "Onnistuja"
    When the stats record is updated with rank "Sanavalmis" on puzzle 5
    Then the stats record best_rank should be "Sanavalmis"

  Scenario: Best rank never downgrades
    Given a stats record for puzzle 5 with best_rank "Sanavalmis"
    When the stats record is updated with rank "Onnistuja" on puzzle 5
    Then the stats record best_rank should still be "Sanavalmis"

  # --- Streak computation ---

  Scenario: Consecutive days form a streak
    Given stats records for dates "2026-04-01|2026-03-31|2026-03-30"
    Then the current streak should be 3

  Scenario: Streak resets on a gap
    Given stats records for dates "2026-04-01|2026-03-30"
    Then the current streak should be 1

  Scenario: Best streak is the longest consecutive run
    Given stats records for dates "2026-04-01|2026-03-25|2026-03-24|2026-03-23|2026-03-22|2026-03-21"
    Then the best streak should be 5

  # --- Rank distribution ---

  Scenario: Rank distribution counts best ranks
    Given stats records with best ranks "Onnistuja|Sanavalmis|Onnistuja"
    Then the rank distribution should show Onnistuja: 2 and Sanavalmis: 1

  # --- Average completion ---

  Scenario: Average completion percentage
    Given a stats record with score 50 and max_score 100
    And a stats record with score 75 and max_score 100
    Then the average completion should be 62.5%

  # --- Stats modal ---

  @e2e
  Scenario: Stats button is visible in the header
    When the player loads the game
    Then a button with aria-label "Tilastot" should be visible in the header

  @e2e
  Scenario: Stats modal opens on button click
    When the player clicks the stats button
    Then the stats modal should open
    And it should display summary statistics

  @e2e
  Scenario: Stats modal closes on Escape
    Given the stats modal is open
    When the player presses Escape
    Then the stats modal should close

  @e2e
  Scenario: Stats modal closes on background click
    Given the stats modal is open
    When the player clicks outside the modal
    Then the stats modal should close

  @e2e
  Scenario: Stats modal shows sync status when logged in
    Given the player is logged in with email "testi@esimerkki.fi"
    When the player opens the stats modal
    Then the stats modal should show a sync status line containing "testi@esimerkki.fi"

  # --- Server-backed stats ---

  Scenario: Server stats are merged into local after login on a new device
    Given the server has a stats record for puzzle 5 with best_rank "Ällistyttävä"
    And the local device has a stats record for puzzle 5 with best_rank "Onnistuja"
    When pullAndMerge is called with the server record
    Then the local stats record for puzzle 5 should have best_rank "Ällistyttävä"

  Scenario: Local stats are not overwritten by weaker server stats
    Given the server has a stats record for puzzle 5 with best_rank "Hyvä alku"
    And the local device has a stats record for puzzle 5 with best_rank "Täysi kenno"
    When pullAndMerge is called with the server record
    Then the local stats record for puzzle 5 should have best_rank "Täysi kenno"
