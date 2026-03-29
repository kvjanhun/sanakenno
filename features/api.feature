Feature: Puzzle API
  The Hono backend serves daily puzzles from pre-computed JSON data
  and records player achievements.

  # --- GET /api/puzzle ---

  Scenario: Returns today's puzzle
    When a GET request is made to /api/puzzle
    Then the response should include center, letters, word_hashes, hint_data, max_score
    And the response should include puzzle_number and total_puzzles
    And the response should not include plaintext words

  Scenario: Puzzle data is pre-computed
    When the API serves a puzzle
    Then word_hashes should be an array of SHA-256 hex strings
    And hint_data should contain word_count, pangram_count, by_letter, by_length, by_pair

  # --- GET /api/puzzle/:number ---

  Scenario: Specific puzzle can be fetched by number
    When a GET request is made to /api/puzzle/5
    Then the response should be puzzle number 5

  Scenario: Out-of-range puzzle number wraps around
    Given there are 41 puzzles
    When a GET request is made to /api/puzzle/42
    Then the response should be puzzle number 1

  # --- POST /api/achievement ---

  Scenario: Valid achievement is recorded
    When a POST is made with puzzle_number, rank, score, max_score, words_found
    Then the server should respond with 201
    And the achievement should be appended to storage

  Scenario: Invalid rank is rejected
    When a POST is made with rank "InvalidRank"
    Then the server should respond with 400

  Scenario: Missing required fields are rejected
    When a POST is made without score
    Then the server should respond with 400

  # --- Rate limiting ---

  Scenario: Achievement endpoint is rate-limited to 10/minute
    When 11 POST requests are made to /api/achievement within one minute
    Then the 11th should receive a 429 response
