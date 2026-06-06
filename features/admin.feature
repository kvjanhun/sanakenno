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

  Scenario: New puzzle is appended to the end of the rotation
    Given there are 41 puzzles in rotation
    When the admin creates a new puzzle with letters "a,d,e,h,l,r,s" and center "a"
    Then the new puzzle slot number should be 41
    And the total puzzles count should be 42

  Scenario: Create puzzle from a previewed combination
    When the admin previews letters "a,e,k,l,n,s,ö" with center "k"
    And the admin submits a new puzzle with letters "a,e,k,l,n,s,ö" and center "k"
    Then a new puzzle slot should be created

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
    Then slot 5 should be inactive
    And the total puzzle count should be returned

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

  @e2e
  Scenario: Select a puzzle by number in the editor
    Given the admin editor has 10 puzzles in rotation
    When the admin enters puzzle number 4 and submits the puzzle selector
    Then the editor should load puzzle 4 without using a dropdown

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

  Scenario: Filter combinations by word count lower bound
    When the admin filters by min best-case word count of 50
    Then every returned combination's max_word_count should be at least 50

  Scenario: Filter combinations by word count upper bound
    When the admin filters by max best-case word count of 55
    Then every returned combination's max_word_count should be at most 55

  Scenario: Filter combinations by worst-case word count range
    When the admin filters by min worst-case word count of 25 and max worst-case word count of 29
    Then every returned combination's min_word_count should be between 25 and 29

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

  # --- Game suggestions ---

  Scenario: Suggest an appendable game without spoilers
    Given candidate combinations exist for game suggestions
    When the admin requests a game suggestion
    Then the suggestion response should include letters, center, word_count, pangram_count, and quality label
    And the suggestion response should not include solution words

  Scenario: Suggestion reveals pangrams only on explicit spoiler request
    Given candidate combinations exist for game suggestions
    When the admin requests a game suggestion with pangram spoilers
    Then the suggestion response should include pangram words
    And the suggestion response should not include solution words

  @e2e
  Scenario: Inspect suggested pangrams and continue after accepting
    Given the admin has opened a game suggestion
    When the admin reveals its pangrams and accepts it
    Then the editor should show the next suggestion without another manual request

  Scenario: Suggestion excludes combinations already in rotation
    Given candidate combinations include one already in the puzzle rotation
    When the admin requests a game suggestion
    Then the suggested letters should not be already in the puzzle rotation

  Scenario: Suggestion skips declined candidates
    Given candidate combinations exist for game suggestions
    When the admin declines the first suggested game and asks again
    Then the next suggested game should be different

  Scenario: Persistently rejected suggestions are skipped
    Given candidate combinations exist for game suggestions
    When the admin rejects the first suggested game permanently
    And the admin requests a game suggestion
    Then the next suggested game should be different

  Scenario: List rejected game suggestions
    Given candidate combinations exist for game suggestions
    When the admin rejects the first suggested game permanently
    Then the suggestion rejection list should include the rejected game suggestion

  @e2e
  Scenario: Rejected game suggestions are managed away from the active suggestion panel
    Given the admin has opened a game suggestion
    When the admin rejects the suggested game permanently
    Then the active suggestion panel should show the next suggestion
    And the rejected suggestion should be listed on the rejected suggestions tab
    And the active suggestion panel should not include the rejected suggestions list

  Scenario: Restore a rejected game suggestion
    Given candidate combinations exist for game suggestions
    And the admin has rejected a game suggestion
    When the admin restores the rejected game suggestion
    And the admin requests a game suggestion
    Then the restored game suggestion should be eligible again

  Scenario: All rejected suggestions return a clear empty response
    Given all candidate game suggestions have been rejected
    When the admin requests a game suggestion
    Then the suggestion response should say all suitable suggestions are used or rejected

  Scenario: Suggestion varies word-count bands across retries
    Given suggestion candidates cover multiple word-count bands
    When the admin declines the first suggested game and asks again
    Then the next suggested game should use a different word-count band

  Scenario: Suggestion can leave the reviewed low-thirties word-count band
    Given reviewed suggestion candidates are low-thirties and open-count
    When the admin requests a game suggestion after two previous declined suggestions
    Then the suggested game should use the open word-count band with reviewed quality

  Scenario: Suggestion avoids unreviewed quality while reviewed alternatives remain
    Given reviewed suggestion candidates are low-thirties and unreviewed candidates are open-count
    When the admin requests a game suggestion after two previous declined suggestions
    Then the suggestion should use reviewed pangram quality

  Scenario: Generated preclassification does not replace reviewed quality
    Given generated suggestion screening exists for an otherwise unreviewed candidate
    When the admin requests a game suggestion
    Then the suggestion should remain unreviewed

  Scenario: Suggestion avoids generated-risky candidates when alternatives exist
    Given generated suggestion screening marks one candidate risky and another ok
    When the admin requests a game suggestion
    Then the generated-risky candidate should not be suggested

  Scenario: Suggestion can choose multiple pangrams within the same word-count band
    Given reviewed long suggestion candidates have one and two pangrams
    When the admin requests a game suggestion
    Then the suggested game should have more than one pangram

  Scenario: Suggestion varies pangram counts across retries
    Given reviewed suggestion candidates cover multiple pangram counts
    When the admin declines the first suggested game and asks again
    Then the two suggestions should use different pangram counts

  Scenario: Suggestion prefers less repeated short words near append position
    Given two suggestion candidates differ by neighbor short-word overlap
    When the admin requests a game suggestion
    Then the suggestion should choose the candidate with less short-word overlap

  Scenario: Pangram quality grades affect suggestions without exposing pangrams
    Given one suggestion candidate has a rejected pangram quality grade
    When the admin requests a game suggestion
    Then the rejected-quality candidate should not be suggested
    And the suggestion response should not include pangram words

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

  Scenario: Schedule can start from a selected date
    When the admin requests the schedule starting 7 days from today for 3 days
    Then the response should include 3 entries
    And the first schedule entry should be 7 days from today
    And no schedule entry should be marked as today

  @e2e
  Scenario: Select a schedule date range in the admin schedule
    Given the admin views the puzzle schedule
    When the admin selects a schedule start and end date
    Then the schedule should request the selected date range
    And the schedule should show the selected entries

  # --- Achievement stats ---

  Scenario: View daily achievement counts
    When the admin requests achievement stats for the last 7 days
    Then the response should include 7 daily entries
    And each entry should include counts per rank and a total
    And a totals summary should be included

  Scenario: Player achievement stats count each stable user once per day
    Given one identified player reached ranks "Hyvä alku|Onnistuja|Sanavalmis" today
    And another identified player reached rank "Onnistuja" today
    And one achievement without a stable user identity was recorded today
    When the admin requests player achievement stats for the last 7 days
    Then today's player stats total should be 2
    And today's player stats should count "Sanavalmis" as 1
    And today's player stats should count "Onnistuja" as 1

  Scenario: Player achievement stats count each stable user once across the entire period in overall totals
    Given player "player-x" reached rank "Hyvä alku" 2 days ago
    And player "player-x" reached rank "Sanavalmis" today
    When the admin requests player achievement stats for the last 7 days
    Then today's player stats total should be 1
    And today's player stats should count "Sanavalmis" as 1
    And the overall totals should count "Sanavalmis" as 1
    And the overall totals should count "Hyvä alku" as 0

  Scenario: Player achievement stats count one player once per day and once per period
    Given player "player-weekly" reached rank "Onnistuja" on every day in the last 7 days
    When the admin requests player achievement stats for the last 7 days
    Then player stats day offsets 0 through 6 should each total 1
    And the overall player stats total should be 1
    And the overall totals should count "Onnistuja" as 1

  Scenario: Achievement stats grouped by Helsinki timezone
    Given an achievement was recorded 2 days ago at 23:30 UTC
    Then it should appear under yesterday in Helsinki timezone stats
    And not under 2 days ago in Helsinki timezone stats

  Scenario: Empty days show zero counts
    Given no achievements were recorded 5 days ago
    When the admin requests stats covering that date
    Then the date 5 days ago should appear with all rank counts as 0

  @e2e
  Scenario: Word data is managed away from usage statistics
    Given the admin views usage statistics
    When the admin opens the word data admin page
    Then failed-guess and word-find analytics should be available there
    And the usage statistics page should not include word data panels

  # --- Failed guesses stats ---

  Scenario: View daily failed guess counts and words
    Given failed guesses include word "vieras" with count 3 for day offset 0
    And failed guesses include word "outu" with count 1 for day offset 0
    And failed guesses include word "kumma" with count 2 for day offset 1
    When the admin requests failed guess stats for the last 7 days
    Then the failed guess response should include 7 daily entries
    And failed guess day offset 0 should have total_count 4
    And failed guess day offset 0 should include word "vieras" with count 3
    And failed guess day offset 0 should include word "outu" with count 1
    And failed guess day offset 1 should have total_count 2

  Scenario: Failed-guess stats keep the same word separate by day
    Given failed guesses include word "anna" with count 3 for day offset 0
    And failed guesses include word "anna" with count 3 for day offset 1
    When the admin requests failed guess stats for the last 7 days
    Then failed guess day offset 0 should include word "anna" with count 3
    And failed guess day offset 1 should include word "anna" with count 3

  # --- Word-find stats ---

  Scenario: View word-find counts for a puzzle
    Given word finds include word "kala" with count 5 for puzzle 4
    And word finds include word "kana" with count 2 for puzzle 4
    When the admin requests word-find stats for puzzle 4
    Then the word-find response should include puzzle number 4
    And the word-find response should include current puzzle words
    And word-find word "kala" should have count 5
    And word-find word "kana" should have count 2
    And word-find word "kana" should be harder than word "kala"

  Scenario: Word-find stats reject soft-deleted puzzles
    Given puzzle 4 is soft-deleted
    When the admin requests word-find stats for puzzle 4
    Then the server should respond with 404

  # --- Cache invalidation ---

  Scenario: Admin writes invalidate the puzzle engine cache
    Given puzzle slot 5 is cached in memory
    When the admin changes the center letter for slot 5
    Then the next request for slot 5 should recompute from the database

  Scenario: Blocking a word invalidates all cached puzzles
    Given puzzles 1, 2, and 3 are cached
    When the admin blocks a word
    Then the next request for any puzzle should recompute from the database
