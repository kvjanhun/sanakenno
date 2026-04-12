# Sanakenno development:

This update is planned to make small distinctions between web and the iOS app. Plan the updates to be implemented so that both the feature files and tests are updated accordingly. Typecheck, lint, and tests should pass before anything is commited. Changes should be commited but not merged until the features are fully implemented, tested locally and approved by the user.

- Shared / backend (minor bump):
  1. Keep track of the single longest word a player has guessed.
  2. Track the count of words guessed correctly between all puzzles by the player.
  3. Track the count of pangrams found between all puzzles by the player.

- iOS (minor bump):
  1. Archive should show all past puzzles. Display today on the top always, even when browsing archive.
  2. Show the longest word a player has guessed, the count of words guessed and the count of pangrams found in the stats section.
  3. Create a new feature that allows players to view the list of correct words for past puzzles in the archive. There should be an option to give the player the ability to either play an old puzzle or to view the list of correct words. Maybe separate tabs/sections for each of these features in the archive: even after revealing the answer, the player should still be able to play the puzzle if they wish to do so. However, after a puzzle's answer has been revealed, the player's stats for that specific puzzle should not be updated anymore. The player can still play the puzzle, but it will not affect their rank gained, words guessed, pangrams found etc. achievements or stats.
  4. Small update to existing feature: On mobile, the hints are always shown. It should be hideable by tapping the active hint tab like on web. Remember to reserve the hint area space even when the hints are hidden, so that the layout does not change when the hints are shown or hidden.

- Web:
  - Do not change archive, only past week available.
  - Do not change stats section.
  - Do not implement the feature to view the list of correct words for past puzzles in the archive.

Save this plan as 'PLAN_v1.2.md'.
