Feature: Accessibility
  The game is playable with keyboard only and respects platform conventions
  for touch and assistive input.

  # --- Keyboard behaviour ---

  Scenario: Modifier keys do not trigger letter input
    Given the puzzle is loaded
    When the player presses Ctrl+A, Alt+K, or Cmd+S
    Then no letters should be added to the current word

  Scenario: Tab key does not add a letter
    Given the puzzle is loaded
    When the player presses Tab
    Then no letter should be added
    And default browser focus behaviour should not be prevented

  Scenario: Only Finnish-relevant keys produce input
    Given the puzzle is loaded
    When the player presses a letter key (a-z, ä, ö, or hyphen)
    Then the letter should be appended to the current word
    When the player presses any other key (numbers, symbols)
    Then no letter should be added

  # --- Touch behaviour ---

  Scenario: Double-tap zoom is prevented on iOS
    Given the app is running in standalone mode on iOS
    When the player taps twice quickly on a hexagon
    Then the page should not zoom
    And both taps should register as letter input

  Scenario: touch-action is set to manipulation globally
    When the page loads
    Then all interactive elements should have touch-action: manipulation
    And pinch-to-zoom should be the only allowed gesture besides taps

  # --- Safe areas ---

  Scenario: Content respects device safe areas
    Given the app is running on a device with a notch or home indicator
    Then the UI should not be obscured by the notch
    And the bottom controls should clear the home indicator area
