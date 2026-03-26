Feature: Game timer
  An elapsed-time tracker that pauses when the player leaves the tab
  and resumes when they return. Tracks active play time only.

  # --- Basic timing ---

  @e2e
  Scenario: Timer starts when the puzzle loads
    When the player loads a puzzle
    Then the timer should start automatically

  Scenario: Timer tracks elapsed time
    Given the timer has been running for 60 seconds
    Then getElapsedMs should return approximately 60000

  # --- Pause and resume ---

  @e2e
  Scenario: Timer pauses when the tab is hidden
    Given the timer is running
    When the player switches to another tab
    Then the timer should pause
    And elapsed time should stop increasing

  @e2e
  Scenario: Timer resumes when the tab becomes visible
    Given the timer is paused because the tab was hidden
    When the player returns to the tab
    Then the timer should resume
    And the hidden duration should not count toward elapsed time

  @e2e
  Scenario: Timer pauses when window loses focus
    Given the timer is running
    When the browser window loses focus
    And the document is hidden
    Then the timer should pause

  @e2e
  Scenario: Timer pauses on pagehide
    Given the timer is running
    When a pagehide event fires
    Then the timer should pause
    And if the tab was already paused, pagehide should not double-record

  # --- Multiple pause cycles ---

  Scenario: Multiple pause/resume cycles accumulate correctly
    Given the timer is running
    When the player hides the tab for 10 seconds
    And returns and plays for 30 seconds
    And hides the tab for 5 seconds
    And returns and plays for 20 seconds
    Then the total elapsed time should be 50 seconds
    And the total paused time should be 15 seconds

  # --- Persistence ---

  @e2e
  Scenario: Timer state is saved with game state
    Given the timer started at a specific timestamp
    When the player reloads the page
    Then the timer should resume from the saved start time
    And accumulated pause time should be restored
