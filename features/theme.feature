@e2e
Feature: Theme Toggle
  The application supports light, dark, and system-following modes.
  Theme selection persists across sessions via a three-way toggle.

  The app additionally offers a color palette ("Väriteema") selector with
  six palettes — hehku (default orange), meri (teal), metsä (forest green),
  yö (indigo), aamu (amber), mustavalko (monochrome) — each with hand-tuned
  light and dark variants.

  On the web app, the palette picker is surfaced inside the "Lisää laite"
  (user) dialog and is only usable once the player has linked an account,
  while on mobile it lives on the settings screen.

  The active palette and the light/dark preference sync between devices via
  the player account (last-write-wins by timestamp).

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

  @mobile
  Scenario: Default color palette is hehku
    When the player first loads the mobile app
    Then the active color palette should be "hehku"
    And the accent color should be the hehku orange

  @mobile
  Scenario Outline: Player selects a color palette
    Given the mobile app is open on the settings screen
    When the player selects the "<palette>" color palette
    Then the accent color should update to reflect "<palette>"
    And the active palette should be saved

    Examples:
      | palette    |
      | hehku      |
      | meri       |
      | metsä      |
      | yö         |
      | aamu       |
      | mustavalko |

  @mobile
  Scenario: Color palette is independent of light/dark mode
    Given the active color palette is "meri"
    When the player switches between light and dark mode
    Then the palette remains "meri"
    And the accent color uses the palette's variant for the active mode

  Scenario: Accent surfaces use a readable foreground for the active palette
    Given the active color palette is "mustavalko"
    And the current theme is dark
    Then accent-colored controls should use the palette's on-accent text color

  @mobile
  Scenario: Completed honeycomb keeps the active palette on the center hex
    Given the active color palette is "aamu"
    And the current theme is dark
    And the player has found all words in the puzzle
    Then the completed honeycomb center hex should keep the active palette accent

  @mobile
  Scenario: Color palette persists across app restarts
    Given the player has selected the "metsä" color palette
    When the app is restarted
    Then the active color palette should still be "metsä"

  @web
  Scenario: Palette picker is hidden when not linked
    Given the web player is not linked to an account
    When the player opens the user dialog
    Then the color palette picker should not be offered

  @web
  Scenario: Palette picker is available to linked players
    Given the web player is linked to an account
    When the player opens the user dialog
    Then the color palette picker should be shown
    And the currently active palette should be marked as selected

  Scenario: Preference changes on one device sync to another
    Given the player is linked on two devices
    And the first device has selected the "meri" color palette
    When the second device pulls preferences from the server
    Then the second device's active palette should be "meri"

  Scenario: Newer local preference wins over older server value
    Given the server has a "hehku" preference from yesterday
    And the local device has a "yö" preference from today
    When the client syncs preferences
    Then the active palette should remain "yö"
    And the server should be updated to "yö"
