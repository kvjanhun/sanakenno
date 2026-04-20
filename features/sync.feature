Feature: Cross-device progress sync
  Registered players' stats and puzzle progress are stored on the server.
  Local state is always the source of truth for active play.
  Sync is offline-safe: fire-and-forget pushes, pull on login.

  Background:
    Given a registered player identity and a valid Bearer token

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
    When a POST is made to /api/player/sync/stats with a stats record for puzzle index 42
    Then the response status should be 200
    And the server should have a stats record for puzzle index 42

  Scenario: Pushing a stats record with a higher rank upgrades the server record
    Given the server has a stats record for puzzle index 10 with rank "Onnistuja"
    When a POST is made to /api/player/sync/stats with rank "Sanavalmis" for puzzle index 10
    Then the server stats for puzzle index 10 should have rank "Sanavalmis"

  Scenario: Pushing a stats record with a lower rank does not downgrade
    Given the server has a stats record for puzzle index 10 with rank "Sanavalmis"
    When a POST is made to /api/player/sync/stats with rank "Onnistuja" for puzzle index 10
    Then the server stats for puzzle index 10 should still have rank "Sanavalmis"

  Scenario: Pushing a stats record with a higher score upgrades the server record
    Given the server has a stats record for puzzle index 10 with best_score 50
    When a POST is made to /api/player/sync/stats with best_score 80 for puzzle index 10
    Then the server stats for puzzle index 10 should have best_score 80

  Scenario: Pushing a stats record with a lower score does not downgrade
    Given the server has a stats record for puzzle index 10 with best_score 80
    When a POST is made to /api/player/sync/stats with best_score 50 for puzzle index 10
    Then the server stats for puzzle index 10 should still have best_score 80

  Scenario: Pushing a stats record with longest_word stores it
    When a POST is made to /api/player/sync/stats with longest_word "sanake" for puzzle index 42
    Then the response status should be 200
    And the server stats for puzzle index 42 should have longest_word "sanake"

  Scenario: Pushing with a longer word upgrades longest_word
    Given the server has a stats record for puzzle index 10 with longest_word "kala"
    When a POST is made to /api/player/sync/stats with longest_word "lakana" for puzzle index 10
    Then the server stats for puzzle index 10 should have longest_word "lakana"

  Scenario: Pushing with a shorter word does not downgrade longest_word
    Given the server has a stats record for puzzle index 10 with longest_word "lakana"
    When a POST is made to /api/player/sync/stats with longest_word "kala" for puzzle index 10
    Then the server stats for puzzle index 10 should still have longest_word "lakana"

  Scenario: Pushing a stats record with pangrams_found stores it
    When a POST is made to /api/player/sync/stats with pangrams_found 2 for puzzle index 42
    Then the response status should be 200
    And the server stats for puzzle index 42 should have pangrams_found 2

  Scenario: Pushing with higher pangrams_found upgrades the server record
    Given the server has a stats record for puzzle index 10 with pangrams_found 1
    When a POST is made to /api/player/sync/stats with pangrams_found 3 for puzzle index 10
    Then the server stats for puzzle index 10 should have pangrams_found 3

  Scenario: Pushing with lower pangrams_found does not downgrade
    Given the server has a stats record for puzzle index 10 with pangrams_found 3
    When a POST is made to /api/player/sync/stats with pangrams_found 1 for puzzle index 10
    Then the server stats for puzzle index 10 should still have pangrams_found 3

  Scenario: Push stats requires authentication
    When a POST is made to /api/player/sync/stats without a token
    Then the response status should be 401

  Scenario: Push stats with invalid body returns 400
    When a POST is made to /api/player/sync/stats with an invalid body
    Then the response status should be 400

  # --- Push puzzle state ---

  Scenario: Pushing a puzzle state stores it on the server
    When a POST is made to /api/player/sync/state with a state for puzzle index 42
    Then the response status should be 200
    And the server should have a puzzle state for puzzle index 42

  Scenario: Pushing a puzzle state replaces the previous state
    Given the server has a puzzle state for puzzle index 42 with 3 found words
    When a POST is made to /api/player/sync/state with 5 found words for puzzle index 42
    Then the server should have 5 found words for puzzle index 42

  Scenario: Push state requires authentication
    When a POST is made to /api/player/sync/state without a token
    Then the response status should be 401

  Scenario: Push state with invalid body returns 400
    When a POST is made to /api/player/sync/state with an invalid body
    Then the response status should be 400

  # --- First-time pair upload ---

  Scenario: Pairing with the pairing code uploads local stats to the server
    Given a new player identity with a known pairing code
    And the player has 5 local stats records
    When the player pairs this device with the pairing code and the local stats included
    Then the server should have 5 stats records for that player
