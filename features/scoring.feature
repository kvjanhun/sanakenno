Feature: Word scoring
  Sanakenno awards points based on word length, with a bonus for pangrams
  (words that use all 7 puzzle letters).

  Background:
    Given a puzzle with letters "a,e,k,l,n,s,t" and center "a"

  # --- Base scoring ---

  Scenario: Four-letter word scores 1 point
    When the player submits "kala"
    Then the score should increase by 1

  Scenario: Five-letter word scores its length
    When the player submits "lasku"
    Then the score should increase by 5

  Scenario: Six-letter word scores its length
    When the player submits "kansat"
    Then the score should increase by 6

  # --- Pangram bonus ---

  Scenario: Pangram scores length plus 7 bonus points
    When the player submits "alkusanat"
    Then the word should be marked as a pangram
    And the score should increase by 16

  # --- Cumulative scoring ---

  Scenario: Score accumulates across multiple words
    When the player submits "kala"
    And the player submits "lasku"
    Then the total score should be 6

  Scenario: Duplicate word does not change the score
    When the player submits "kala"
    And the player submits "kala" again
    Then the total score should be 1
    And the message "Loysit jo taman!" should appear
