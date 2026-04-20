Feature: Player authentication
  Every player has a stable pairing code (player_key) minted silently on first launch.
  The server only stores a SHA-256 hash; the raw key lives on each paired device and
  is the pairing code shown in the UI. Devices are paired by pasting the code,
  optionally delivered by email. Rotation mints a new code and drops other devices.

  Background:
    Given the player auth rate limits are reset

  # --- Silent init ---

  Scenario: New player identity is created silently
    When a POST is made to /api/player/auth/init
    Then the response status should be 200
    And the response should contain a "token" field
    And the response should contain "player_id"
    And the response should contain "player_key"
    And the players table should store only the player key hash

  # --- Email delivery of the pairing code ---

  Scenario: Email delivery sends the pairing code without storing the email
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/transfer/create with email "test@example.com" and the Bearer token
    Then the response status should be 200
    And the response should contain "status"
    And the players table should not contain the email "test@example.com"

  Scenario: Email delivery is rate-limited per IP
    Given a player has initialized their identity
    When 3 POST requests are made to /api/player/auth/transfer/create from the same IP with the Bearer token
    Then the 4th transfer create request should return 429

  Scenario: Sending a pairing email to the same address twice within 10 minutes is blocked
    Given a player has initialized their identity
    And a transfer email has just been sent to "cooldown@example.com"
    When a POST is made to /api/player/auth/transfer/create with email "cooldown@example.com" and the Bearer token
    Then the response status should be 429

  Scenario: Sending more than 10 pairing emails to the same address in one day is blocked
    Given a player has initialized their identity
    And 10 transfer emails have already been sent to "daily@example.com" today
    When a POST is made to /api/player/auth/transfer/create with email "daily@example.com" and the Bearer token
    Then the response status should be 429

  Scenario: Email delivery without a player_key is rejected
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/transfer/create with email "missing-key@example.com" and no player_key and the Bearer token
    Then the response status should be 400

  Scenario: Email delivery with a mismatched player_key is rejected
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/transfer/create with email "mismatch@example.com" and a wrong player_key and the Bearer token
    Then the response status should be 400

  # --- Pairing (transfer/use) ---

  Scenario: A valid pairing code can be exchanged for a Bearer token
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/transfer/use with the player key
    Then the response status should be 200
    And the response should contain a "token" field
    And the response should contain "player_id"
    And the response should contain "stats"
    And the response should contain "puzzle_states"

  Scenario: Pairing merges local stats and puzzle states into the player account
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/transfer/use with the player key and local stats
    Then the response status should be 200
    And the response should contain "stats"
    And the response should contain "puzzle_states"

  Scenario: The pairing code can be reused across multiple pairings
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/transfer/use with the player key
    Then the response status should be 200
    When a POST is made to /api/player/auth/transfer/use with the player key
    Then the response status should be 200

  Scenario: A completely invalid pairing code is rejected
    When a POST is made to /api/player/auth/transfer/use with token "totally-fake-token"
    Then the response status should be 400

  Scenario: A missing pairing code returns 400
    When a POST is made to /api/player/auth/transfer/use with an empty body
    Then the response status should be 400

  # --- Rotation ---

  Scenario: Rotating the pairing code mints a new key and keeps the current session
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/rotate with the Bearer token
    Then the response status should be 200
    And the response should contain "player_key"
    And the new player_key should differ from the old one
    And the current Bearer token should still be valid on /api/player/me

  Scenario: Rotating invalidates sessions on other paired devices
    Given a player has initialized their identity
    And a second device has paired using the pairing code
    When a POST is made to /api/player/auth/rotate with the Bearer token
    Then the second device's Bearer token should no longer be valid

  Scenario: Rotating invalidates the previous pairing code
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/rotate with the Bearer token
    And a POST is made to /api/player/auth/transfer/use with the previous player key
    Then the response status should be 400

  Scenario: Rotation requires authentication
    When a POST is made to /api/player/auth/rotate without a Bearer token
    Then the response status should be 401

  # --- Authenticated endpoints ---

  Scenario: A valid Bearer token is accepted on /api/player/me
    Given a player has initialized their identity
    When a GET request is made to /api/player/me with the Bearer token
    Then the response status should be 200
    And the response should contain "player_id"

  Scenario: A missing Bearer token returns 401
    When a GET request is made to /api/player/me without a token
    Then the response status should be 401

  Scenario: An invalid Bearer token returns 401
    When a GET request is made to /api/player/me with token "invalid-bearer"
    Then the response status should be 401

  # --- Logout ---

  Scenario: A player can log out and the token becomes invalid
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/logout with the Bearer token
    Then the response status should be 200
    And the token should no longer be valid on /api/player/me

  # --- Device-link UI ---

  @web
  Scenario: Linked web player can copy the pairing code
    Given the web player is linked and has a pairing code
    When the player taps "Kopioi koodi"
    Then the pairing code should be copied to the clipboard

  @web @mobile
  Scenario: Device sharing stays enabled after restart
    Given the device has already enabled sharing to other devices
    When the app is restarted
    Then the device should still show sharing controls

  @ios
  Scenario: QR code toggles off when the show button is tapped again
    Given the player is on the settings screen with a pairing code
    When the player taps "Näytä QR-koodi"
    Then the QR code should be visible
    And the button label should change to "Piilota QR-koodi"
    When the player taps "Piilota QR-koodi"
    Then the QR code should be hidden
    And the button label should change back to "Näytä QR-koodi"
