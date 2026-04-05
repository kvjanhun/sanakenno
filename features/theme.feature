@e2e
Feature: Theme Toggle
  The application supports light, dark, and system-following modes.
  Theme selection persists across sessions via a three-way toggle.

  Scenario: Default theme follows system preference
    When the player first loads the app
    Then the theme should match their system preference (light or dark)

  Scenario: Player switches to dark theme
    Given the current theme is light
    When the player selects dark theme
    Then the theme should change to dark
    And the theme preference should be saved

  Scenario: Player switches to light theme
    Given the current theme is dark
    When the player selects light theme
    Then the theme should change to light
    And the theme preference should be saved

  Scenario: Player chooses system theme
    Given the player has set the theme to dark
    When the player selects system theme
    Then the theme should match their system preference (light or dark)
    And the theme preference should be saved

  Scenario: Theme preference persists after reload
    Given the player has set the theme to dark
    When the player reloads the page
    Then the theme should remain dark
