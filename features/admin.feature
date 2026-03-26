Feature: Admin tool
  A protected admin interface for managing puzzles, blocked words,
  and viewing statistics. Only accessible with authentication.

  # Authentication is defined in auth.feature

  Background:
    Given the admin is authenticated

  # --- Puzzle CRUD ---

  Scenario: Create a new puzzle
    When the admin submits a new puzzle with letters "a,e,k,l,n,s,ö" and center "k"
    Then a new puzzle slot should be created
    And the response should include the slot number and next play date

  Scenario: Puzzle requires exactly 7 distinct letters
    When the admin submits a puzzle with 6 letters
    Then the server should respond with 400
    When the admin submits a puzzle with duplicate letters
    Then the server should respond with 400

  Scenario: Puzzle letters must be valid Finnish characters
    When the admin submits a puzzle with letter "ñ"
    Then the server should respond with 400

  Scenario: Center letter must be one of the 7 puzzle letters
    When the admin submits letters "a,e,k,l,n,s,ö" with center "b"
    Then the server should respond with 400

  Scenario: Update an existing puzzle
    Given puzzle slot 5 exists with letters "a,e,k,l,n,s,ö"
    When the admin updates slot 5 with new letters "a,d,e,h,l,r,s"
    Then slot 5 should contain the new letters
    And the puzzle cache should be invalidated

  Scenario: Delete a puzzle
    Given puzzle slot 5 exists
    When the admin deletes slot 5
    Then slot 5 should no longer exist
    And the total puzzle count should decrease by 1

  Scenario: Swap two puzzle slots
    Given slot 3 has letters "a,e,k,l,n,s,ö" and slot 7 has letters "a,d,e,h,l,r,s"
    When the admin swaps slots 3 and 7
    Then slot 3 should have letters "a,d,e,h,l,r,s"
    And slot 7 should have letters "a,e,k,l,n,s,ö"
    And both centers should be swapped as well

  Scenario: Cannot swap a slot with itself
    When the admin attempts to swap slot 3 with slot 3
    Then the server should respond with 400

  # --- Today's puzzle protection ---

  Scenario: Modifying today's live puzzle requires force confirmation
    Given slot 5 is today's live puzzle
    When the admin attempts to update slot 5 without force flag
    Then the server should respond with 409
    And the message should warn about modifying the live puzzle

  Scenario: Force flag allows modifying today's puzzle
    Given slot 5 is today's live puzzle
    When the admin updates slot 5 with force=true
    Then the update should succeed

  Scenario: Deleting today's puzzle requires force confirmation
    Given slot 5 is today's live puzzle
    When the admin attempts to delete slot 5 without force flag
    Then the server should respond with 409

  Scenario: Swapping involving today's puzzle requires force confirmation
    Given slot 5 is today's live puzzle
    When the admin attempts to swap slot 5 with slot 10 without force flag
    Then the server should respond with 409

  # --- Center letter selection ---

  Scenario: Change center letter for a puzzle
    Given puzzle slot 5 has center "a"
    When the admin changes the center to "k"
    Then slot 5 should have center "k"
    And the puzzle cache for slot 5 should be invalidated

  Scenario: View all 7 center variations for a puzzle
    Given puzzle slot 5 has letters "a,e,k,l,n,s,ö"
    When the admin requests variations for slot 5
    Then the response should contain 7 variations (one per letter)
    And each variation should include word_count, max_score, pangram_count
    And the active center should be marked with is_active=true

  # --- Preview ---

  Scenario: Preview a letter combination without saving
    When the admin previews letters "a,e,k,l,n,s,ö"
    Then the response should include variations for all 7 possible centers
    And no database changes should occur

  Scenario: Preview with a center shows the word list
    When the admin previews letters "a,e,k,l,n,s,ö" with center "k"
    Then the response should include the full word list for that center
    And the response should include variations for all 7 centers

  Scenario: Preview is rate-limited
    When more than 20 preview requests are made in one minute
    Then the server should respond with 429

  # --- Word blocking ---

  Scenario: Block a word
    When the admin blocks the word "example"
    Then the word should be added to the blocked list
    And the puzzle cache should be cleared for all puzzles

  Scenario: Blocking a word removes it from puzzle results
    Given the word "testi" is valid for puzzle slot 5
    When the admin blocks "testi"
    Then "testi" should no longer appear in slot 5's word list or hashes

  Scenario: Unblock a word
    Given the word "testi" is blocked
    When the admin unblocks "testi"
    Then the word should be removed from the blocked list
    And the puzzle cache should be cleared

  Scenario: List blocked words
    When the admin requests the blocked words list
    Then the response should include all blocked words
    And words should be ordered most recently blocked first
    And each entry should include id, word, and blocked_at timestamp

  Scenario: Blocking an already-blocked word is idempotent
    Given "testi" is already blocked
    When the admin blocks "testi" again
    Then the server should respond with 200
    And no duplicate entry should be created

  # --- Combinations browser ---

  Scenario: Browse letter combinations with pagination
    When the admin requests combinations page 1 with 25 per page
    Then the response should include up to 25 combinations
    And the response should include total count and page info

  Scenario: Filter combinations by required letters
    When the admin filters combinations requiring "a,ö"
    Then every returned combination should contain both "a" and "ö"

  Scenario: Filter combinations by excluded letters
    When the admin filters combinations excluding "b,c,d"
    Then no returned combination should contain "b", "c", or "d"

  Scenario: Filter combinations by pangram count range
    When the admin filters combinations with min_pangrams=3 and max_pangrams=10
    Then every returned combination should have between 3 and 10 total pangrams

  Scenario: Filter combinations by word count
    When the admin filters by min best-case word count of 50
    Then every returned combination's max_word_count should be at least 50

  Scenario: Filter by rotation membership
    When the admin filters for in_rotation=true
    Then only combinations currently in the puzzle rotation should be returned

  Scenario: Sort combinations
    When the admin sorts by pangrams descending
    Then the combinations should be ordered by total_pangrams descending

  Scenario: Each combination includes all 7 center variations
    When the admin fetches a combination
    Then the variations array should contain 7 entries
    And each variation should include center, word_count, max_score, pangram_count

  # --- Schedule ---

  Scenario: View upcoming puzzle schedule
    When the admin requests the schedule for the next 14 days
    Then the response should include 14 entries
    And each entry should include date, slot, display_number
    And today's entry should have is_today=true

  Scenario: Display numbers are 1-indexed
    Given the schedule includes slot 0
    Then its display_number should be 1

  Scenario: Schedule respects puzzle rotation
    Given there are 41 puzzles in rotation
    Then the schedule should cycle through all 41 before repeating

  # --- Achievement stats ---

  Scenario: View daily achievement counts
    When the admin requests achievement stats for the last 7 days
    Then the response should include 7 daily entries
    And each entry should include counts per rank and a total
    And a totals summary should be included

  Scenario: Achievement stats grouped by Helsinki timezone
    Given an achievement was recorded at 01:00 UTC on 2026-03-25
    Then it should appear under date 2026-03-25 in the stats
    And not under 2026-03-24

  Scenario: Empty days show zero counts
    Given no achievements were recorded on 2026-03-20
    When the admin requests stats covering that date
    Then 2026-03-20 should appear with all rank counts as 0

  # --- Cache invalidation ---

  Scenario: Admin writes invalidate the puzzle engine cache
    Given puzzle slot 5 is cached in memory
    When the admin changes the center letter for slot 5
    Then the next request for slot 5 should recompute from the database

  Scenario: Blocking a word invalidates all cached puzzles
    Given puzzles 1, 2, and 3 are cached
    When the admin blocks a word
    Then the next request for any puzzle should recompute from the database
