Feature: Player authentication
  Players get a private device identity key on first launch.
  Cross-device access uses one-time transfer tokens, optionally delivered by email.
  No personal data is stored for player authentication.

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

  # --- Transfer token creation ---

  Scenario: Creating a transfer token while authenticated succeeds
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/transfer/create with the Bearer token
    Then the response status should be 200
    And the response should contain "transfer_token"

  Scenario: Transfer token create is rate-limited
    Given a player has initialized their identity
    When 3 POST requests are made to /api/player/auth/transfer/create from the same IP with the Bearer token
    Then the 4th transfer create request should return 429

  Scenario: Transfer email sends token without storing email
    Given a player has initialized their identity
    When a POST is made to /api/player/auth/transfer/create with email "test@example.com" and the Bearer token
    Then the response status should be 200
    And the response should contain "transfer_token"
    And the players table should not contain the email "test@example.com"

  # --- Transfer token use ---

  Scenario: A valid transfer token can be exchanged for a Bearer token
    Given a transfer token exists for the current authenticated player
    When a POST is made to /api/player/auth/transfer/use with the transfer token
    Then the response status should be 200
    And the response should contain a "token" field
    And the response should contain "player_id"
    And the response should contain "stats"
    And the response should contain "puzzle_states"

  Scenario: Transfer token use returns merged stats and puzzle states
    Given a transfer token exists for the current authenticated player
    When a POST is made to /api/player/auth/transfer/use with the transfer token and local stats
    Then the response status should be 200
    And the response should contain "stats"
    And the response should contain "puzzle_states"

  Scenario: An already-used transfer token is rejected
    Given a transfer token exists for the current authenticated player
    And the transfer token has already been used
    When a POST is made to /api/player/auth/transfer/use with the transfer token
    Then the response status should be 400

  Scenario: An expired transfer token is rejected
    Given an expired transfer token exists for the current authenticated player
    When a POST is made to /api/player/auth/transfer/use with the transfer token
    Then the response status should be 400

  Scenario: A completely invalid transfer token is rejected
    When a POST is made to /api/player/auth/transfer/use with token "totally-fake-token"
    Then the response status should be 400

  Scenario: A missing transfer token body returns 400
    When a POST is made to /api/player/auth/transfer/use with an empty body
    Then the response status should be 400

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

  # --- Security ---

  Scenario: Transfer tokens are stored as SHA-256 hashes, not plaintext
    Given a transfer token exists for the current authenticated player
    Then the player_transfer_tokens table should not contain the raw token
    And the player_transfer_tokens table should contain the SHA-256 hash of the token
