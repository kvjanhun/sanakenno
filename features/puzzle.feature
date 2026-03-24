Feature: Daily puzzle
  Each day a different puzzle is served. Puzzles rotate through a fixed
  pool deterministically so that every player sees the same puzzle on
  the same day.

  # --- Puzzle structure ---

  Scenario: Puzzle has exactly 7 unique letters
    When the player loads today's puzzle
    Then it should have 1 center letter and 6 outer letters
    And all 7 letters should be distinct
    And all letters should be from the Finnish alphabet (a-z, a, o)

  Scenario: Puzzle includes pre-computed hint data
    When the player loads today's puzzle
    Then the response should include word_count, pangram_count
    And the response should include by_letter, by_length, and by_pair distributions

  Scenario: Puzzle includes the max possible score
    When the player loads today's puzzle
    Then the response should include max_score > 0

  # --- Daily rotation ---

  Scenario: Same puzzle is served to all players on the same day
    Given it is 2026-03-01 in Helsinki timezone
    When player A fetches the puzzle
    And player B fetches the puzzle
    Then both should receive the same puzzle number

  Scenario: Different puzzle is served on different days
    Given it is 2026-03-01 in Helsinki timezone
    When the player fetches the puzzle
    And the next day the player fetches the puzzle again
    Then the puzzle numbers should be different

  Scenario: Puzzles cycle through the entire pool
    Given there are N puzzles in rotation
    Then after N days the rotation should return to the first puzzle

  # --- Puzzle number display ---

  Scenario: Puzzle number is 1-indexed for display
    Given the API returns puzzle_number 0
    Then the UI should display "Sanakenno — #1"

  # --- Midnight rollover ---

  Scenario: Puzzle changes at midnight Helsinki time
    Given it is 23:59 on 2026-03-01 in Helsinki
    When the clock crosses midnight
    Then the puzzle should change to the next day's puzzle
