Feature: Word validation
  Words are validated client-side by comparing SHA-256 hashes against
  the puzzle's word_hashes set. Several rules must pass before the
  hash check.

  Background:
    Given a puzzle with letters "a,e,k,l,n,s,t" and center "a"

  # --- Rejection rules ---

  Scenario: Word shorter than 4 letters is rejected
    When the player submits "ala"
    Then the word should be rejected with "Liian lyhyt!"

  Scenario: Word missing the center letter is rejected
    When the player submits "kone"
    Then the word should be rejected with center letter missing message

  Scenario: Word using letters not in the puzzle is rejected
    When the player submits "kalvo"
    Then the word should be rejected with "Kayta vain annettuja kirjaimia!"

  Scenario: Word not in the dictionary is rejected
    When the player submits "aaaaaa"
    Then the word should be rejected with "Ei sanakirjassa"

  # --- Hash-based validation ---

  Scenario: Valid word matches a SHA-256 hash in the puzzle data
    Given the puzzle has a word hash for "kala"
    When the player submits "kala"
    Then the word should be accepted

  Scenario: Hashes are the only way words are transmitted
    Then the API response should contain "word_hashes" but not plaintext words

  # --- Input normalisation ---

  Scenario: Hyphenated compound words are normalised
    Given the dictionary contains "lahi-ita"
    When the player types "lahi-ita"
    Then it should be normalised to "lahiita" for validation

  # --- Center letter requirement ---

  Scenario: Every valid word must contain the center letter
    Given the puzzle center is "a"
    Then every word in the puzzle's word list contains "a"
