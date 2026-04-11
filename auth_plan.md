
## Privacy-First Device Sync (replaces magic-link auth)

### Background

The original magic-link auth stored a hashed email in the database. Even with HMAC-SHA256
and a server secret this is pseudonymous data under GDPR, not anonymous. For a small Finnish
user base the hash is practically reversible. Decision: store zero personal data. Email is
used only as a delivery channel (in-memory + Resend), never written to the database.

### Architecture

Every player is assigned a random 256-bit identity key on first launch — silently, no UI.
The key is stored locally (localStorage / MMKV). The server stores only SHA-256(key).

Cross-device transfer is always initiated from an **authenticated** device. Four delivery
options for the one-time transfer token (15-min TTL):

| UI label | Mechanism |
|---|---|
| Kopioi linkki | Copies `https://sanakenno.fi/connect?connect=<token>` to clipboard |
| Kopioi koodi | Copies the raw token string (user types it on new device) |
| Näytä QR-koodi | Renders the URL as a QR code inside the modal |
| Lähetä sähköpostiin | Emails the URL; inline disclaimer "Sähköpostiosoitettasi ei tallenneta" |

If a player loses all devices and has no backup of their key, the account is unrecoverable.
This is an accepted trade-off for a word game.

### Database changes

```sql
-- Rename column (migration in connection.ts)
ALTER TABLE players RENAME COLUMN email_hash TO player_key_hash;

-- Replace player_magic_tokens with player_transfer_tokens
DROP TABLE IF EXISTS player_magic_tokens;
CREATE TABLE IF NOT EXISTS player_transfer_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TEXT NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Server endpoints

Remove: `POST /api/player/auth/request`, `POST /api/player/auth/verify`

Add:

**`POST /api/player/auth/init`** — no auth  
Creates new player with a random key. Called silently on first app launch.  
Response: `{ player_key: string, token: string, player_id: number }`

**`POST /api/player/auth/transfer/create`** — requires Bearer  
Creates a transfer token. If `email` in body, sends it there (not stored).  
Body: `{ email?: string }`  
Response: `{ transfer_token: string }`

**`POST /api/player/auth/transfer/use`** — no auth  
Exchanges token for a session. Merges uploaded local data into player account.  
Body: `{ token: string, stats?: PlayerStats, puzzle_states?: SyncPuzzleState[] }`  
Response: `{ token: string, player_id: number, stats: PlayerStats, puzzle_states: SyncPuzzleState[] }`

Keep unchanged: `GET /api/player/me`, `POST /api/player/auth/logout`, all sync routes.

### Shared types

Remove `email` from `AuthToken`:
```ts
export interface AuthToken {
  token: string;
  playerId: number;
  expiresAt: string;
}
```

### Auth store (web + mobile)

Remove: `requestLink`, `verifyToken`, `pendingEmail`

Add:
```ts
transferToken: string | null;            // set after createTransfer(), cleared on close
initPlayer(): Promise<void>;             // silent first-launch, no-op if already authed
createTransfer(email?: string): Promise<void>;  // creates token, optionally emails it
useTransfer(token: string): Promise<void>;       // called from URL / QR scan / code entry
```

`initialize()`, `pullAndMerge`, `syncStatsRecord`, `syncPuzzleState` — unchanged.

First-launch logic: on app mount, if no stored auth token → call `initPlayer()`.

### Web — App.tsx

```ts
// Replace ?token= with ?connect= for transfer use
const connectToken = params.get('connect');
if (connectToken) {
  window.history.replaceState({}, '', '/');
  void useTransfer(connectToken);
}
```

### Web — SyncModal (replaces AuthModal)

Three views:
1. **Transfer options** (default) — four buttons + "Syötä koodi" input at bottom
2. **Email input** — appears after tapping "Lähetä sähköpostiin"
3. **Sent confirmation** — "Tarkista sähköpostisi"

Layout:
```
┌──────────────────────────────────┐
│  Lisää laite               [×]   │
│                                  │
│  Avaa Sanakenno toisella         │
│  laitteella ja käytä alla        │
│  olevaa linkkiä tai koodia.      │
│                                  │
│  [Kopioi linkki]                 │
│  [Kopioi koodi]                  │
│  [Näytä QR-koodi]                │
│  [Lähetä sähköpostiin →]         │
│                                  │
│  ────────────────────────────    │
│  Sinulla on koodi?               │
│  [________________] [Yhdistä]    │
└──────────────────────────────────┘
```

QR rendering: `qrcode` npm package, inline `<canvas>` inside modal.

### Mobile — AuthSection rewrite

Same four buttons. QR display: `react-native-qrcode-svg`.
Code entry: text input below the buttons.
QR scanning (optional, Phase 4+): `expo-camera` with barcode scanner.

### Email template

`server/email/send-magic-link.ts` → `server/email/send-transfer-link.ts`

Body copy:
> Joku (sinä?) haluaa yhdistää Sanakenno-tilisi uudelle laitteelle.
> [Yhdistä laite]
> Linkki vanhenee 15 minuutissa.
> **Sähköpostiosoitettasi ei tallenneta Sanakennolle.**

### Feature files

`features/player-auth.feature` — full rewrite:
- New player created silently on first launch
- Transfer token created while authenticated
- Transfer token used on new device → session + data merge
- Expired/used token rejected
- Email path: token sent, email not stored
- Rate limiting on `transfer/create`

`features/sync.feature` — unchanged (sync logic is the same).

### Implementation phases

**Phase 1 — Server**
Schema migration, new endpoints, updated email template, remove old auth routes, BDD tests.

**Phase 2 — Shared**
Remove `email` from `AuthToken`.

**Phase 3 — Auth stores**
Both platforms: `initPlayer`, `createTransfer`, `useTransfer`. Silent first-launch init.
`App.tsx` URL interception update (`?token=` → `?connect=`).

**Phase 4 — UI**
Web `SyncModal`. Mobile `AuthSection` rewrite. QR libraries added to both.
