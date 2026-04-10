Feature: Cross-device progress sync
  Registered players' stats and puzzle progress are stored on the server.
  Local state is always the source of truth for active play.
  Sync is offline-safe: fire-and-forget pushes, pull on login.

  Background:
    Given a registered player with email "sync@example.com" and a valid Bearer token

  # --- Full pull ---

  Scenario: GET /api/player/sync returns all server-side data
    Given the player has 3 stats records on the server
    When a GET request is made to /api/player/sync with the Bearer token
    Then the response status should be 200
    And the response stats should contain 3 records
    And the response should include a "puzzle_states" array

  Scenario: GET /api/player/sync returns empty arrays for a new player
    When a GET request is made to /api/player/sync with the Bearer token
    Then the response status should be 200
    And the response stats should contain 0 records
    And the response puzzle_states should contain 0 entries

  Scenario: Sync endpoint requires authentication
    When a GET request is made to /api/player/sync without a token
    Then the response status should be 401

  # --- Push stats ---

  Scenario: Pushing a new stats record is stored on the server
    When a POST is made to /api/player/sync/stats with a stats record for puzzle 42
    Then the response status should be 200
    And the server should have a stats record for puzzle 42

  Scenario: Pushing a stats record with a higher rank upgrades the server record
    Given the server has a stats record for puzzle 10 with rank "Onnistuja"
    When a POST is made to /api/player/sync/stats with rank "Sanavalmis" for puzzle 10
    Then the server stats for puzzle 10 should have rank "Sanavalmis"

  Scenario: Pushing a stats record with a lower rank does not downgrade
    Given the server has a stats record for puzzle 10 with rank "Sanavalmis"
    When a POST is made to /api/player/sync/stats with rank "Onnistuja" for puzzle 10
    Then the server stats for puzzle 10 should still have rank "Sanavalmis"

  Scenario: Pushing a stats record with a higher score upgrades the server record
    Given the server has a stats record for puzzle 10 with best_score 50
    When a POST is made to /api/player/sync/stats with best_score 80 for puzzle 10
    Then the server stats for puzzle 10 should have best_score 80

  Scenario: Pushing a stats record with a lower score does not downgrade
    Given the server has a stats record for puzzle 10 with best_score 80
    When a POST is made to /api/player/sync/stats with best_score 50 for puzzle 10
    Then the server stats for puzzle 10 should still have best_score 80

  Scenario: Push stats requires authentication
    When a POST is made to /api/player/sync/stats without a token
    Then the response status should be 401

  Scenario: Push stats with invalid body returns 400
    When a POST is made to /api/player/sync/stats with an invalid body
    Then the response status should be 400

  # --- Push puzzle state ---

  Scenario: Pushing a puzzle state stores it on the server
    When a POST is made to /api/player/sync/state with a state for puzzle 42
    Then the response status should be 200
    And the server should have a puzzle state for puzzle 42

  Scenario: Pushing a puzzle state replaces the previous state
    Given the server has a puzzle state for puzzle 42 with 3 found words
    When a POST is made to /api/player/sync/state with 5 found words for puzzle 42
    Then the server should have 5 found words for puzzle 42

  Scenario: Push state requires authentication
    When a POST is made to /api/player/sync/state without a token
    Then the response status should be 401

  Scenario: Push state with invalid body returns 400
    When a POST is made to /api/player/sync/state with an invalid body
    Then the response status should be 400

  # --- First-time registration upload ---

  Scenario: Verifying a magic link with local stats uploads them to the server
    Given a new player "upload@example.com" who has not yet verified any token
    And the player has 5 local stats records
    When the player verifies their magic link with the local stats included
    Then the server should have 5 stats records for that player
