# Mobile Rules (`packages/mobile/`)

## Structure
```
app/
  _layout.tsx         root Stack navigator — declares all screens
  (tabs)/             tab bar screens (index, archive, stats, rules, settings)
  auth.tsx            player auth/transfer modal
  puzzle-words.tsx    word list screen for past puzzles (modal presentation)
  licenses.tsx        open-source licences modal
src/
  components/         shared React Native components
  store/              Zustand stores (useGameStore, useAuthStore, useSettingsStore)
  platform/           native service adapters (storage, auth, config, crypto, share)
  theme.ts            useTheme() hook — returns typed colour tokens
```

## expo-router Conventions
- Tab screens live in `app/(tabs)/`; modals (non-tab screens) are declared at the `app/` root level with `presentation: 'modal'` in `_layout.tsx`.
- When adding a new screen, also add it to `app/_layout.tsx` and update `.expo/types/router.d.ts` (gitignored, but needs a manual edit so TypeScript knows the route exists until the next dev-server start).
- Use `useRouter()` for navigation and `useLocalSearchParams<{}>()` for typed query params.

## State Management
- Global game state lives in `useGameStore`; auth state in `useAuthStore`; display preferences in `useSettingsStore`.
- Subscribe selectively: `useGameStore((s) => s.specificField)`, never `useGameStore((s) => s)`.
- Destructure actions outside the render function to get stable refs.

## Storage (MMKV via `src/platform/storage`)
- `storage.save(key, object)` / `storage.load<T>(key)` for JSON-serialised objects.
- `storage.setRaw(key, string)` / `storage.getRaw(key)` for plain string flags.
- Revealed flag pattern: `revealed_N` (where N = puzzle_number) is set to `'true'` via `setRaw` when a player views the word list for puzzle N. `submitWord` checks this flag and skips stats/sync updates when set.

## Styling
- All styles via `StyleSheet.create` + inline `style={{ color: theme.X }}` for theme-dependent values.
- Never hardcode colours — always use tokens from `useTheme()` (`theme.bgPrimary`, `theme.accent`, `theme.textSecondary`, etc.).
- No CSS Modules or Tailwind.

## Safe Areas
- Tab screens must wrap their root in `<SafeAreaView edges={['top']}>` from `react-native-safe-area-context`. The tab bar handles bottom insets automatically.
- Modal screens use `edges={['top', 'bottom']}` or rely on their parent navigator's header safe area.

## Language
- All user-facing strings: **Finnish**.
- All code, comments, variable names: **English**.
