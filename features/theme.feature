Feature: Theme Toggle
  The application supports light and dark modes to suit user preferences.
  Theme selection persists across sessions.

  Scenario: Default theme is based on system preference
    When the player first loads the app
    Then the theme should match their system preference (light or dark)

  Scenario: Player toggles theme manually
    Given the current theme is light
    When the player taps the theme toggle button
    Then the theme should change to dark
    And the theme preference should be saved in localStorage

  Scenario: Theme preference persists after reload
    Given the player has set the theme to dark
    When the player reloads the page
    Then the theme should remain dark
