Feature: Server error handling
  The API returns structured error responses and logs errors
  for monitoring and alerting.

  Scenario: Puzzle endpoint returns 404 when no puzzles exist
    Given the puzzle database is empty
    When the puzzle endpoint is called with slot 0
    Then the server-error response status should be 404
    And the response should include an error message

  Scenario: Invalid puzzle number returns 400
    When the puzzle endpoint is called with slot -1
    Then the server-error response status should be 400

  Scenario: Achievement with invalid JSON returns 400
    When the achievement endpoint receives invalid JSON
    Then the server-error response status should be 400

  Scenario: Achievement with missing fields returns 400
    When the achievement endpoint receives a body with missing fields
    Then the server-error response status should be 400

  Scenario: Health check returns 200 when database is available
    When the health endpoint is called
    Then the server-error response status should be 200
    And the response should include status "ok"
