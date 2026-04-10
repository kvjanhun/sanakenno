# Sanakenno development:

This update is planned to make small distinctions between web and iOS. Plan the updates to be implemented so that both the feature files and tests are updated accordingly. Typecheck, lint, and test the code to ensure that it works as expected. Changes should be commited but not merged until the features are fully implemented and tested locally.

- Shared / backend (minor bump):
  1. Keep track of the single longest word a player has guessed.
  2. Track the count of words guessed correctly between all puzzles by the player.
  3. Track the count of pangrams found between all puzzles by the player.

- iOS (minor bump):
  1. Archive should show all past puzzles. Display today on the top always when browsing archive.
  2. Show the longest word a player has guessed, the count of words guessed and the count of pangrams found in the stats section.
  3. Create a new feature that allows players to view the list of correct words for past puzzles in the archive. Make a decision to give the player ability to either play an old puzzle or to view the list of correct words. Maybe separate tabs/sections for each of these features in the archive: even after revealing the answer, the player should still be able to play the puzzle if they wish to do so. However, after a puzzle's answer has been revealed, the player's stats for that specific puzzle should not be updated anymore. The player can still play the puzzle, but it will not affect their rank gained, words guessed, pangrams found etc. achievements or stats.

- Web:
  - Do not change archive, only past week available.
  - Do not change stats section.
  - Do not implement the feature to view the list of correct words for past puzzles in the archive.
