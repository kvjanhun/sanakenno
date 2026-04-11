Feature: Player authentication
  Players can create accounts and log in using magic links sent to their email.
  No passwords are stored. Anonymous play works without any account.
  Player auth is entirely separate from admin access.

  Background:
    Given the player auth rate limits are reset

  # --- Magic link request ---

  Scenario: Requesting a magic link always returns 200
    When a POST is made to /api/player/auth/request with email "test@example.com"
    Then the response status should be 200
    And the response should contain status "sent"

  Scenario: Requesting a magic link for an unknown email still returns 200
    When a POST is made to /api/player/auth/request with email "new@example.com"
    Then the response status should be 200
    And the response should contain status "sent"

  Scenario: Requesting a magic link auto-creates a player account
    Given no player account exists for "autoregister@example.com"
    When a POST is made to /api/player/auth/request with email "autoregister@example.com"
    Then a player account should exist for "autoregister@example.com"

  Scenario: Requesting a magic link with an invalid email returns 400
    When a POST is made to /api/player/auth/request with email "notanemail"
    Then the response status should be 400

  Scenario: Requesting a magic link with a missing @ returns 400
    When a POST is made to /api/player/auth/request with email "nodotatall"
    Then the response status should be 400

  Scenario: Magic link request is rate-limited
    When 3 POST requests are made to /api/player/auth/request from the same IP
    Then the 4th request should return 429

  # --- Token verification ---

  Scenario: A valid magic link token can be exchanged for a Bearer token
    Given a magic link token was requested for "verify@example.com"
    When a POST is made to /api/player/auth/verify with the token
    Then the response status should be 200
    And the response should contain a "token" field
    And the response should contain "player_id"
    And the response should contain "email" equal to "verify@example.com"

  Scenario: Token verification returns player stats and puzzle states
    Given a magic link token was requested for "syncdata@example.com"
    When a POST is made to /api/player/auth/verify with the token and local stats
    Then the response status should be 200
    And the response should contain "stats"
    And the response should contain "puzzle_states"

  Scenario: An already-used token is rejected
    Given a magic link token was requested for "usedtoken@example.com"
    And the token has already been used
    When a POST is made to /api/player/auth/verify with the token
    Then the response status should be 400

  Scenario: An expired token is rejected
    Given an expired magic link token exists for "expired@example.com"
    When a POST is made to /api/player/auth/verify with the expired token
    Then the response status should be 400

  Scenario: A completely invalid token is rejected
    When a POST is made to /api/player/auth/verify with token "totally-fake-token"
    Then the response status should be 400

  Scenario: A missing token body returns 400
    When a POST is made to /api/player/auth/verify with an empty body
    Then the response status should be 400

  # --- Authenticated endpoints ---

  Scenario: A valid Bearer token is accepted on /api/player/me
    Given a player has verified their magic link token
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
    Given a player has verified their magic link token
    When a POST is made to /api/player/auth/logout with the Bearer token
    Then the response status should be 200
    And the token should no longer be valid on /api/player/me

  # --- Security ---

  Scenario: Magic link tokens are stored as SHA-256 hashes, not plaintext
    Given a magic link token was requested for "security@example.com"
    Then the player_magic_tokens table should not contain the raw token
    And the player_magic_tokens table should contain the SHA-256 hash of the token
