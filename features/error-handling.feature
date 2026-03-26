@e2e
Feature: Error handling
  The game handles network failures, corrupt data, and storage limits
  gracefully without breaking the play experience.

  # --- Network errors ---

  Scenario: Puzzle load fails due to network error
    When the player loads the app and the API is unreachable
    Then a Finnish error message should appear explaining the connection failed
    And a retry button should be available

  Scenario: Puzzle load retries on tap
    Given the initial puzzle load failed
    When the player taps the retry button
    Then the app should attempt to fetch the puzzle again

  Scenario: Achievement POST failure is silent
    Given the player reaches a new rank
    When the achievement POST fails due to network error
    Then the game should continue normally
    And no error should be shown to the player

  # --- Corrupt or missing data ---

  Scenario: Malformed puzzle response is handled
    When the API returns invalid JSON
    Then the app should show an error state
    And not crash or show a blank screen

  Scenario: Corrupt localStorage state is discarded
    Given localStorage contains unparseable JSON for the current puzzle
    When the player loads the puzzle
    Then the corrupt state should be discarded
    And the game should start fresh

  # --- Storage limits ---

  Scenario: localStorage quota exceeded
    Given localStorage is full
    When the player finds a new word
    Then the game should continue normally
    And a non-blocking warning may appear
    But the word should still count for the current session
