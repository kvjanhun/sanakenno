Feature: Word definitions via Kotus dictionary
  Found words in both collapsed and expanded lists are clickable links that open the
  Kielitoimiston sanakirja entry in a new browser tab.

  # --- URL construction ---

  Scenario: Kotus URL is constructed for a simple word
    Given the found word is "kissa"
    Then the Kotus URL should be "https://www.kielitoimistonsanakirja.fi/#/kissa"

  Scenario: Kotus URL preserves hyphens for compound words
    Given the found word is "palo-ovi"
    Then the Kotus URL should be "https://www.kielitoimistonsanakirja.fi/#/palo-ovi"

  Scenario: Kotus URL works for unhyphenated compound forms
    Given the found word is "paloovi"
    Then the Kotus URL should be "https://www.kielitoimistonsanakirja.fi/#/paloovi"

  # --- Link rendering ---

  @e2e
  Scenario: Found word in expanded list is a link
    Given the player has found the word "kissa"
    When the player expands the found words list
    Then "kissa" should be rendered as a link
    And the link href should point to kielitoimistonsanakirja.fi
    And the link should have target "_blank" and rel "noopener"

  @e2e
  Scenario: Found word link has accessible title
    Given the player has found the word "kissa"
    When the player expands the found words list
    Then the "kissa" link should have a descriptive title attribute

  # --- Visual affordance ---

  @e2e
  Scenario: Found word shows underline on hover
    Given the player has found words and expanded the list
    When the player hovers over a found word
    Then the word should show an underline
    And the cursor should be a pointer

  # --- Collapsed view ---

  @e2e
  Scenario: Collapsed chip view words are clickable links
    Given the player has found words
    And the found words list is collapsed
    Then the word chips should be rendered as Kotus links
    And clicking a word chip should preserve gameplay

  @e2e
  Scenario: Pangram found words are visually bolded
    Given the player has found a pangram
    Then the pangram should be bolded in the found-word pills
    When the player expands the found words list
    Then the pangram should be bolded in the expanded list
