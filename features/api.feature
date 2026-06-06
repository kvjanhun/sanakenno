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

  Scenario: Out-of-range puzzle number is rejected
    When a GET request is made to /api/puzzle/42
    Then the server should respond with 404

  Scenario: Soft-deleted puzzle number is rejected
    Given puzzle number 5 is soft-deleted
    When a GET request is made to /api/puzzle/5
    Then the server should respond with 404

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

  # --- POST /api/failed-guess ---

  Scenario: Valid failed guess is recorded
    When a POST is made to /api/failed-guess with word "xyzxyz" and date "2025-01-01"
    Then the server should respond with 200

  Scenario: Duplicate failed guess increments the count
    Given a failed guess for word "xyzxyz" on date "2025-01-01" already exists
    When a POST is made to /api/failed-guess with word "xyzxyz" and date "2025-01-01"
    Then the server should respond with 200

  Scenario: Failed guess with word exceeding 20 characters is rejected
    When a POST is made to /api/failed-guess with word "aaaaabbbbbcccccddddde" and date "2025-01-01"
    Then the server should respond with 400

  Scenario: Failed guess missing required fields is rejected
    When a POST is made to /api/failed-guess without a word
    Then the server should respond with 400

  Scenario: Failed-guess endpoint is rate-limited to 30/minute
    When 31 POST requests are made to /api/failed-guess within one minute
    Then the 31st should receive a 429 response

  # --- POST /api/word-find ---

  Scenario: Valid word find is recorded
    When a POST is made to /api/word-find with word "Kala" and puzzle number 5
    Then the server should respond with 200
    And the word find for word "kala" on puzzle 5 should have count 1

  Scenario: Duplicate word find increments the count
    Given a word find for word "kala" on puzzle 5 already exists
    When a POST is made to /api/word-find with word "kala" and puzzle number 5
    Then the server should respond with 200
    And the word find for word "kala" on puzzle 5 should have count 2

  Scenario: Word find with invalid puzzle number is rejected
    When a POST is made to /api/word-find with word "kala" and puzzle number -1
    Then the server should respond with 400

  Scenario: Word-find endpoint is rate-limited to 60/minute
    When 61 POST requests are made to /api/word-find within one minute
    Then the 61st should receive a 429 response
