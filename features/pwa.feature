Feature: Progressive Web App
  Sanakenno works as an installable PWA with offline support and
  standalone display mode.

  # --- Configuration ---

  Scenario: App declares an installable web manifest
    When the PWA configuration is inspected
    Then it should declare a valid web manifest
    And it should declare standalone display mode
    And it should include icons at 192x192 and 512x512

  Scenario: Workbox runtime strategies match the app contract
    When the PWA configuration is inspected
    Then API requests should use NetworkOnly caching
    And JavaScript and CSS assets should use StaleWhileRevalidate caching
    And image assets should use CacheFirst caching

  # --- Production runtime ---

  @build @pwa
  Scenario: Built app keeps the shell available offline without caching API responses
    When the production build is loaded in a browser
    Then the web manifest should load
    And the service worker should register after reload
    And static assets should enter CacheStorage
    And API responses should not enter CacheStorage
    And the app shell should survive an offline reload

  # --- iOS standalone quirks ---
  # TODO: Requires a real iOS device or Xcode Simulator — cannot be automated
  # in standard Playwright CI. Validate manually on iOS Safari in standalone mode.

  @e2e
  Scenario: Double-tap zoom is prevented in standalone mode
    Given the app is running in iOS standalone mode
    When the player double-taps quickly
    Then the page should not zoom
    And letter input should still work normally
