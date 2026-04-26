Feature: Puzzle archive
  Players can access past puzzles from the archive.
  Web and iOS show all current-cycle puzzles with ?all=true.
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

  Scenario: Archive with all=true ends at puzzle index 0 when today is later in the cycle
    When a GET request is made to /api/archive?all=true
    Then the first entry should have is_today true
    And the last entry should be for puzzle index 0

  Scenario: Archive with all=true returns a full cycle when today is puzzle index 0
    Given today is puzzle index 0 for archive rotation
    When a GET request is made to /api/archive?all=true
    Then the first entry should have is_today true
    And the response should contain one full puzzle cycle
    And the last entry should be for puzzle index 1

  # --- Word list endpoint ---

  Scenario: Word list is available for a past puzzle
    When a GET request is made to /api/puzzle/0/words
    Then the response status should be 200
    And the response should contain a "words" array

  Scenario: Word list is blocked for today's puzzle
    When a GET request is made to /api/puzzle/today/words
    Then the response status should be 403

  Scenario: Word list is blocked for wrapped aliases of today's puzzle
    When a GET request is made to /api/puzzle/today-alias/words
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
    And it should show today plus one page of past entries

  @e2e
  Scenario: Archive pagination controls navigate pages
    When the player opens the archive modal
    And clicks the archive next page button
    Then the next page of archive entries should be shown
    And the archive previous page button should become active

  @e2e
  Scenario: Today's puzzle is highlighted in the archive
    When the player opens the archive modal
    Then today's entry should be visually highlighted

  @e2e
  Scenario: Clicking a past date opens an action sheet
    When the player opens the archive modal
    And clicks on a past day's entry
    Then the puzzle action sheet should be shown
    And it should offer "Pelaa" and "Näytä vastaukset" options

  @e2e
  Scenario: Choosing "Pelaa" loads the past puzzle
    When the player opens the archive modal
    And clicks on a past day's entry
    And clicks the "Pelaa" option
    Then the modal should close
    And a different puzzle should load

  @e2e
  Scenario: Choosing "Näytä vastaukset" opens the word list
    When the player opens the archive modal
    And clicks on a past day's entry
    And clicks the "Näytä vastaukset" option
    Then the word list for that puzzle should be shown
    And the list should display each word from that puzzle's solution

  @e2e
  Scenario: A revealed past puzzle is marked with an eye indicator
    Given the player has revealed answers for a past puzzle
    When the player opens the archive modal
    Then the revealed past puzzle row should display a reveal indicator

  @e2e
  Scenario: Re-opening a revealed puzzle's action sheet shows a stats notice
    Given the player has revealed answers for a past puzzle
    When the player opens the archive modal
    And clicks on the revealed past puzzle entry
    Then the action sheet should show a notice that stats are frozen for that puzzle

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

  # --- iOS past puzzles pagination ---

  @ios
  Scenario: Past puzzles are shown one page at a time
    Given the archive has more than 8 past puzzles
    Then the past puzzles list should show at most 8 entries at once

  @ios
  Scenario: Pagination controls navigate between pages
    Given the archive has more than 8 past puzzles
    When the player taps the next page button
    Then the next page of past puzzles should be shown
    And the previous page button should become active

  @ios
  Scenario: Returning from an archived puzzle preserves the current page indicator
    Given the archive has more than 8 past puzzles
    And the player is on the second page of past puzzles
    When the player opens a past puzzle from the archive and returns to the archive
    Then the second page of past puzzles should still be shown
    And the page indicator should still show page 2

  @ios
  Scenario: Pagination controls are hidden when all puzzles fit on one page
    Given the archive has 8 or fewer past puzzles
    Then no pagination controls should be visible

  @ios
  Scenario: Past puzzle pages form a continuous horizontal plane
    Given the archive has more than 8 past puzzles
    When the player drags the past puzzles list horizontally
    Then the adjacent page should peek in from the edge as the finger moves
    And releasing past the halfway point should snap to the adjacent page
    And releasing before the halfway point should snap back to the current page

  @ios
  Scenario: Swiping left advances to the next page of past puzzles
    Given the archive has more than 8 past puzzles
    And the player is on the first page of past puzzles
    When the player swipes left on the past puzzles list
    Then the next page of past puzzles should be shown

  @ios
  Scenario: Swiping right returns to the previous page of past puzzles
    Given the archive has more than 8 past puzzles
    And the player is on the second page of past puzzles
    When the player swipes right on the past puzzles list
    Then the first page of past puzzles should be shown

  @ios
  Scenario: Swiping left on the last page does nothing
    Given the archive has more than 8 past puzzles
    And the player is on the last page of past puzzles
    When the player swipes left on the past puzzles list
    Then the last page of past puzzles should still be shown

  @ios
  Scenario: Swiping right on the first page does nothing
    Given the archive has more than 8 past puzzles
    And the player is on the first page of past puzzles
    When the player swipes right on the past puzzles list
    Then the first page of past puzzles should still be shown

  @ios
  Scenario: Vertical scroll is preserved on the past puzzles list
    Given the archive has more than 8 past puzzles
    When the player scrolls the past puzzles list vertically
    Then the page should not change
