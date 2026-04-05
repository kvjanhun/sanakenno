@e2e
Feature: Mobile Navigation
  The mobile app uses a full-screen stack navigator.
  Each secondary screen pushes onto the stack and can be
  dismissed with the native back gesture or header back button.

  Scenario: Archive screen accessible from game header
    Given the player is on the game screen
    When the player taps the archive icon
    Then the Archive screen should be displayed
    And a back button should be visible

  Scenario: Stats screen accessible from game header
    Given the player is on the game screen
    When the player taps the stats icon
    Then the Stats screen should be displayed

  Scenario: Rules screen accessible from game header
    Given the player is on the game screen
    When the player taps the help icon
    Then the Rules screen should be displayed

  Scenario: Settings screen accessible from game header
    Given the player is on the game screen
    When the player taps the settings icon
    Then the Settings screen should be displayed

  Scenario: Rank thresholds accessible from rank pill
    Given the player is on the game screen
    When the player taps the rank pill
    Then the Rank Thresholds sheet should appear as a form sheet

  Scenario: Swipe back returns to game screen
    Given the player is on the Archive screen
    When the player swipes back
    Then the game screen should be displayed
