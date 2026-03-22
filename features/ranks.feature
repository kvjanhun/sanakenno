Feature: Rank progression
  Players progress through 7 ranks based on their percentage of the
  puzzle's maximum possible score. Rank names are in Finnish.

  Background:
    Given a puzzle with a max score of 100

  # --- Rank thresholds ---

  Scenario Outline: Rank is determined by percentage of max score
    When the player's score is <score>
    Then the player's rank should be "<rank>"

    Examples:
      | score | rank            |
      |     0 | Etsi sanoja!    |
      |     1 | Etsi sanoja!    |
      |     2 | Hyva alku       |
      |     9 | Hyva alku       |
      |    10 | Nyt mennaan!    |
      |    19 | Nyt mennaan!    |
      |    20 | Onnistuja       |
      |    39 | Onnistuja       |
      |    40 | Sanavalmis      |
      |    69 | Sanavalmis      |
      |    70 | Allistyttava    |
      |    99 | Allistyttava    |
      |   100 | Taysi kenno     |

  # --- Progress bar ---

  Scenario: Progress shows percentage toward next rank
    When the player's score is 5
    Then the rank should be "Hyva alku"
    And the progress toward "Nyt mennaan!" should be 37%

  Scenario: Progress is 100% at max rank
    When the player's score is 100
    Then the progress should be 100%

  # --- Rank threshold visibility ---

  Scenario: Taysi kenno rank is hidden until achieved
    When the player's rank is "Allistyttava"
    Then the rank list should not show "Taysi kenno"

  Scenario: Taysi kenno is visible once achieved
    When the player's rank is "Taysi kenno"
    Then the rank list should show "Taysi kenno"

  # --- Celebrations ---

  Scenario: Reaching Allistyttava triggers a glow celebration
    When the player reaches "Allistyttava" rank
    Then a celebration banner should appear for 5 seconds

  Scenario: Reaching Taysi kenno triggers a golden celebration
    When the player reaches "Taysi kenno" rank
    Then a golden celebration should appear for 8 seconds

  Scenario: Other rank transitions show a brief message
    When the player reaches "Onnistuja" rank
    Then the message "Uusi taso: Onnistuja!" should appear for 3 seconds
