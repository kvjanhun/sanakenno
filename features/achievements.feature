Feature: Achievement tracking
  When a player reaches a new rank, the achievement is reported to the
  server. Achievements are session-deduplicated so the same rank on the
  same puzzle is only recorded once per browser session.

  # --- Recording ---

  Scenario: Achievement is posted on rank transition
    Given the player is at rank "Hyvä alku"
    When the player's score crosses into "Nyt mennään!" territory
    Then a POST to /api/achievement should fire
    And it should include puzzle_number, rank, score, max_score, words_found, elapsed_ms

  Scenario: Achievement is fire-and-forget
    When the achievement POST fails due to network error
    Then the game should continue normally
    And no error should be shown to the player

  # --- Deduplication ---

  Scenario: Same rank on same puzzle is only recorded once per session
    When the player reaches "Onnistuja" rank
    And somehow triggers "Onnistuja" again on the same puzzle
    Then only one achievement should be recorded

  Scenario: Same rank on a different puzzle is recorded separately
    Given the player reached "Onnistuja" on puzzle 5
    When the player reaches "Onnistuja" on puzzle 6
    Then a new achievement should be recorded

  # --- Rate limiting ---

  Scenario: Achievement endpoint is rate-limited
    When more than 10 achievements are posted in one minute
    Then the server should respond with 429
