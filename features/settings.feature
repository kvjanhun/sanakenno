Feature: Settings
  The mobile app provides a Settings screen where the player can
  configure their preferences.  Choices persist across app restarts.

  Scenario: Default theme preference is "system"
    Given no theme preference has been saved
    When the player opens the settings
    Then the active theme preference should be "system"

  Scenario: Player changes theme preference
    Given the active theme preference is "system"
    When the player selects theme "dark"
    Then the active theme preference should be "dark"
    And the theme preference "dark" should be persisted

  Scenario: Persisted theme preference is restored
    Given the theme preference "light" has been persisted
    When the settings store is initialised
    Then the active theme preference should be "light"

  @e2e
  Scenario: Theme changes take effect immediately
    Given the current theme is light
    When the player selects theme "dark" in settings
    Then the app should render with the dark colour scheme

  # --- Haptics intensity ---

  Scenario: Default haptics intensity is "off"
    Given no haptics preference has been saved
    When the settings store is initialised
    Then the active haptics intensity should be "off"

  Scenario: Player changes haptics intensity
    Given the active haptics intensity is "off"
    When the player selects haptics intensity "medium"
    Then the active haptics intensity should be "medium"
    And the haptics intensity "medium" should be persisted

  Scenario: Persisted haptics intensity is restored
    Given the haptics intensity "heavy" has been persisted
    When the settings store is initialised
    Then the active haptics intensity should be "heavy"

  Scenario: Legacy haptics enabled boolean migrates to "medium"
    Given haptics was previously saved as enabled boolean true
    When the settings store is initialised
    Then the active haptics intensity should be "medium"

  Scenario: Legacy haptics disabled boolean migrates to "off"
    Given haptics was previously saved as enabled boolean false
    When the settings store is initialised
    Then the active haptics intensity should be "off"
