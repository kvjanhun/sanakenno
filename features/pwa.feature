Feature: Progressive Web App
  Sanakenno works as an installable PWA with offline support and
  standalone display mode.

  # --- Installation ---

  @build
  Scenario: App is installable via web manifest
    When the browser loads the page
    Then a valid web manifest should be served
    And it should declare standalone display mode
    And it should include icons at 192x192 and 512x512

  # --- Service worker ---

  @e2e
  Scenario: Navigation uses network-first strategy
    When the player navigates to the app
    Then the service worker should try the network first
    And fall back to cache if offline

  @e2e
  Scenario: Static assets use stale-while-revalidate
    When the browser requests a JS or CSS file
    Then the service worker should serve from cache immediately
    And update the cache in the background

  @e2e
  Scenario: API requests pass through without caching
    When the app fetches /api/puzzle
    Then the service worker should not intercept or cache the request

  # --- iOS standalone quirks ---

  @e2e
  Scenario: Double-tap zoom is prevented in standalone mode
    Given the app is running in iOS standalone mode
    When the player double-taps quickly
    Then the page should not zoom
    And letter input should still work normally
