Feature: Puzzle archive
  Players can access past puzzles from the archive.
  Web shows the last 7 days; iOS shows all past puzzles with ?all=true.
  Each past puzzle preserves independent progress.
  The word list for each past puzzle is available via a dedicated endpoint.

  # --- Archive API ---

  Scenario: Archive endpoint returns 7 entries
    When a GET request is made to /api/archive
    Then the response status should be 200
    And the response should contain 7 entries
    And each entry should include date, puzzle_number, letters, center, and max_score

  Scenario: Archive entries are ordered newest-first
    When a GET request is made to /api/archive
    Then the first entry should have is_today true
    And the last entry should be 6 days before the first

  Scenario: Today's entry is flagged
    When a GET request is made to /api/archive
    Then exactly one entry should have is_today true

  # --- All-puzzles param ---

  Scenario: Archive with all=true returns more entries than without it
    When a GET request is made to /api/archive?all=true
    Then the response status should be 200
    And the response should contain more than 7 entries

  Scenario: Archive with all=true always ends at puzzle index 0
    When a GET request is made to /api/archive?all=true
    Then the first entry should have is_today true
    And the last entry should be for puzzle index 0

  # --- Word list endpoint ---

  Scenario: Word list is available for a past puzzle
    When a GET request is made to /api/puzzle/0/words
    Then the response status should be 200
    And the response should contain a "words" array

  Scenario: Word list is blocked for today's puzzle
    When a GET request is made to /api/puzzle/today/words
    Then the response status should be 403

  Scenario: Word list returns 400 for invalid puzzle number
    When a GET request is made to /api/puzzle/abc/words
    Then the response status should be 400

  # --- Archive modal ---

  @e2e
  Scenario: Archive button is visible in the header
    When the player loads the game
    Then a button with aria-label "Arkisto" should be visible in the header

  @e2e
  Scenario: Archive modal opens on button click
    When the player clicks the archive button
    Then the archive modal should open
    And it should show 7 day entries

  @e2e
  Scenario: Today's puzzle is highlighted in the archive
    When the player opens the archive modal
    Then today's entry should be visually highlighted

  @e2e
  Scenario: Clicking a past date loads that puzzle
    When the player opens the archive modal
    And clicks on a past day's entry
    Then the modal should close
    And a different puzzle should load

  @e2e
  Scenario: Header shows date when viewing an archive puzzle
    Given the player has loaded a past puzzle from the archive
    Then the header should show the archive puzzle's date

  @e2e
  Scenario: Back arrow returns to today's puzzle
    Given the player is viewing an archive puzzle
    When the player clicks the back arrow
    Then today's puzzle should load

  @e2e
  Scenario: Archive modal closes on background click
    Given the archive modal is open
    When the player clicks outside the modal
    Then the archive modal should close

  @e2e
  Scenario: Archive modal closes on Escape
    Given the archive modal is open
    When the player presses Escape
    Then the archive modal should close
