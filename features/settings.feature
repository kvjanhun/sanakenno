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
