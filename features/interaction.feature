@e2e
Feature: Game interaction
  The honeycomb UI, keyboard input, letter shuffling, and found word
  display that make up the core play experience.

  # --- Input methods ---

  Scenario: Player types letters via physical keyboard
    Given the puzzle is loaded
    When the player presses "k", "a", "l", "a"
    Then the current word display should show "kala"

  Scenario: Player taps hexagons to input letters
    Given the puzzle is loaded
    When the player taps the hexagon for "k"
    And taps the hexagon for "a"
    Then the current word display should show "ka"

  Scenario: Backspace removes the last letter
    Given the current word is "kal"
    When the player presses Backspace
    Then the current word should be "ka"

  Scenario: "Poista" button removes the last letter
    Given the current word is "kal"
    When the player taps the "Poista" button
    Then the current word should be "ka"

  Scenario: Enter submits the current word
    Given the current word is "kala" and it is valid
    When the player presses Enter
    Then the word should be submitted for validation

  Scenario: "OK" button submits the current word
    Given the current word is "kala" and it is valid
    When the player taps the "OK" button
    Then the word should be submitted for validation

  Scenario: Keyboard is ignored when rules modal is open
    Given the rules modal is open
    When the player presses any letter key
    Then the current word should not change

  # --- Feedback and Validation ---

  Scenario: Rejected word is cleared automatically after a delay
    Given the player submits an invalid word
    Then the word should shake and show an error message
    And the word should remain visible for 2 seconds before clearing

  Scenario: Next input clears a rejected word immediately
    Given a rejected word is currently visible
    When the player presses a letter or Backspace
    Then the rejected word should be cleared
    And the new input should be processed normally

  # --- Honeycomb ---

  Scenario: Honeycomb displays 7 hexagons in a flower pattern
    When the puzzle loads
    Then 7 hexagons should be rendered
    And the center hexagon should be visually distinct
    And the center hexagon should show the center letter

  Scenario: Shuffle randomises outer letter positions
    Given the outer letters are in position [e, k, l, n, s, t]
    When the player presses the shuffle button
    Then the outer letters should be in a different order
    And the center letter should remain unchanged

  # --- Found words display ---

  Scenario: Last 6 found words are visible
    Given the player has found 10 words
    Then the 6 most recently found should be visible
    And an expand button should be available

  Scenario: Expanding shows all found words alphabetically
    Given the player has found 10 words
    When the player expands the found words list
    Then all words should be shown sorted alphabetically
    And the words should be grouped by length
    And the shortest words of each first letter should be first

  Scenario: Re-submitted word flashes in the found list
    Given the player already found "kala"
    When the player submits "kala" again
    Then "kala" should briefly flash orange in the found list

  # --- Word display colouring ---

  Scenario: Center letter is shown in accent colour
    Given the center letter is "a"
    When the player types "kala"
    Then the "a" characters should be in accent colour
    And the "k" and "l" should be in primary colour

  # --- Share ---

  Scenario: Share copies result to clipboard
    Given the player has score 42 on puzzle 5 with rank "Sanavalmis"
    When the player taps the share button
    Then the clipboard should contain the puzzle number, rank, score, and hints activated
    And a "Kopioitu!" popup should appear below the share button without shifting layout

  Scenario: Share text format
    Given the player has score 42 of max 120 on puzzle 5
    And the rank is "Sanavalmis" with 28 words found
    And hints "summary" and "pairs" are unlocked
    When the player taps the share button
    Then the clipboard text should match this format:
      """
      Sanakenno — Kenno #5
      Sanavalmis · 28 sanaa
      42/120 pistettä
      Avut: 📊🔠
      sanakenno.fi
      """
    And each unlocked hint should map to its icon: summary=📊, letters=🔤, distribution=📏, pairs=🔠

  Scenario: Share text with no hints unlocked omits the hint line
    Given no hints are unlocked
    When the player shares their result
    Then the share text should not include a hint icon line
